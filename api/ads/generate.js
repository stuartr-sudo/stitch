/**
 * POST /api/ads/campaigns/:id/generate
 * Generate ad variations for selected platforms using AI.
 * Currently supports: linkedin, google, meta.
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';
import { resolveExaKey } from '../lib/newsjackScorer.js';

const LINKEDIN_SYSTEM = `You are an expert LinkedIn Ads copywriter. Generate 3 ad variations for LinkedIn Sponsored Content.

For each variation, produce:
- introText: The main post body (max 600 characters). Professional, compelling, with a clear value proposition.
- headline: Appears below the image (max 200 characters). Punchy and benefit-focused.
- description: Supporting text below headline (max 300 characters). Reinforces the value prop.
- cta: One of: "Apply Now", "Download", "Get Quote", "Learn More", "Sign Up", "Subscribe", "Register", "Request Demo", "Contact Us"
- image_brief: A 1-sentence visual description of what the ad image should depict to match THIS specific variation's copy. Include the subject (who/what is shown), setting, and mood. If the copy mentions a specific person name, age, gender, or scenario, the image_brief MUST reflect that exactly.

RULES:
- NO emojis, NO hashtags
- NEVER use em dashes or en dashes. Use hyphens (-) instead of any dash character.
- NO filler phrases: "In today's world", "Let's dive in", "Here's the thing"
- NO AI clichés: "landscape", "navigate", "leverage", "robust", "delve"
- Be specific with real benefits and outcomes
- Each variation should take a different angle (professional/authoritative, conversational/relatable, data-driven/specific)
- Write for B2B decision-makers unless told otherwise

CRITICAL — NO FABRICATION:
- NEVER invent customer names, testimonials, case studies, or success stories
- NEVER fabricate statistics, percentages, or data points
- If RESEARCH CONTEXT is provided, you may ONLY reference details that appear in the research
- If no research is provided, write about the product's value proposition and benefits in general terms — do NOT create fictional characters or scenarios
- The copy must be truthful and based ONLY on the product description and any research provided

Return valid JSON: { "variations": [{ "introText": "...", "headline": "...", "description": "...", "cta": "...", "image_brief": "..." }] }`;

const GOOGLE_RSA_SYSTEM = `You are an expert Google Ads copywriter. Generate assets for a Responsive Search Ad.

Produce:
- 15 headlines (max 30 characters EACH — this is a hard limit, count carefully)
- 4 descriptions (max 90 characters EACH)
- image_brief: A 1-sentence visual description of what the ad image should depict. Include the subject, setting, and mood that best represents the product/service.

RULES:
- No exclamation marks (Google policy)
- No ALL CAPS words
- NEVER use em dashes or en dashes. Use hyphens (-) instead of any dash character.
- Headlines must be diverse: include brand name, benefits, features, CTAs, numbers
- Descriptions should expand on different value propositions
- Be specific with real benefits
- Include at least 2 headlines with numbers/stats
- Include at least 1 headline as a question

CRITICAL — NO FABRICATION:
- NEVER invent statistics, percentages, or data points you cannot verify
- NEVER fabricate customer counts, time savings, or ROI figures
- If RESEARCH CONTEXT is provided, you may reference real facts from it
- If no research is provided, use general benefit-focused language — do NOT make up numbers
- All claims must be based on the product description and any research provided

Return valid JSON: { "headlines": ["..."], "descriptions": ["..."], "image_brief": "..." }`;

const META_SYSTEM = `You are an expert Meta/Facebook Ads copywriter. Generate 3 ad variations for Facebook/Instagram feed ads.

For each variation, produce:
- primaryText: Main text above image (max 125 characters for above-fold). Conversational, scroll-stopping.
- headline: Bold text below image (max 40 characters). Action-oriented.
- description: Below headline (max 30 characters). Supporting info.
- cta: One of: "Book Now", "Contact Us", "Download", "Get Offer", "Get Quote", "Learn More", "Shop Now", "Sign Up", "Watch More"
- image_brief: A 1-sentence visual description of what the ad image should depict to match THIS specific variation's copy. Include the subject (who/what is shown), setting, and mood. If the copy mentions a specific person, scenario, or emotion, the image_brief MUST reflect that exactly.

RULES:
- Conversational, not corporate
- NO AI clichés
- NEVER use em dashes or en dashes. Use hyphens (-) instead of any dash character.
- Each variation should take a different angle (emotional, practical, social-proof)
- Write to stop the scroll - first 5 words matter most

CRITICAL — NO FABRICATION:
- NEVER invent customer names, testimonials, or success stories
- NEVER fabricate statistics or data points
- If RESEARCH CONTEXT is provided, you may ONLY reference details that appear in the research
- If no research is provided, write about the product's value proposition — do NOT create fictional characters or scenarios
- The copy must be truthful and based ONLY on the product description and any research provided

Return valid JSON: { "variations": [{ "primaryText": "...", "headline": "...", "description": "...", "cta": "...", "image_brief": "..." }] }`;

// Strip em dashes and en dashes from all string values in an object
function stripDashes(obj) {
  if (typeof obj === 'string') return obj.replace(/[\u2013\u2014]/g, ' - ');
  if (Array.isArray(obj)) return obj.map(stripDashes);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, stripDashes(v)]));
  }
  return obj;
}

const PLATFORM_CONFIGS = {
  linkedin: {
    system: LINKEDIN_SYSTEM,
    imageAspect: { width: 1200, height: 627 },
    platformContext: 'Professional LinkedIn ad — business context, polished, trustworthy',
  },
  google: {
    system: GOOGLE_RSA_SYSTEM,
    imageAspect: { width: 1200, height: 628 },
    platformContext: 'Google display ad — clean, commercial quality, attention-grabbing',
  },
  meta: {
    system: META_SYSTEM,
    imageAspect: { width: 1080, height: 1080 },
    platformContext: 'Meta/Instagram feed ad — eye-catching, vibrant, scroll-stopping',
  },
};

// ---------------------------------------------------------------------------
// Writing style modifiers — injected into the user message for each platform
// ---------------------------------------------------------------------------

const STYLE_MODIFIERS = {
  default: null, // no modifier — use base system prompt as-is

  storytelling: `WRITING STYLE — STORYTELLING:
Structure the copy as a narrative arc:
1. Open with a relatable pain point or aspirational moment (1-2 sentences)
2. Introduce the product/service as the turning point
3. Paint a "after" picture — the transformation or outcome
4. End with a clear, specific CTA
Use vivid, concrete language. Each variation should take a different angle.
IMPORTANT: If RESEARCH CONTEXT is provided, base the narrative ONLY on real details from the research. Use real names, companies, and outcomes found in the research — NEVER invent fictional characters or fabricate stories. If no research is available, write about the product benefits in general terms without creating fake testimonials or personas.`,

  data_driven: `WRITING STYLE — DATA-DRIVEN:
Lead with a specific, surprising number or stat when possible (or a strong implied metric).
Use proof points, percentages, time-to-value, and ROI framing.
Structure: bold stat/claim → why it matters → how the product delivers → CTA.
Be specific: "3x" beats "significantly", "in 14 days" beats "fast".
If you don't have hard numbers, use verifiable-sounding specifics (team sizes, process steps, typical timelines).`,

  conversational: `WRITING STYLE — CONVERSATIONAL:
Write as if a knowledgeable friend is recommending this, not a brand selling.
Use contractions, short sentences, and everyday vocabulary.
Avoid corporate-speak entirely.
It's OK to start sentences with "And", "But", "So".
Ask a question, share a quick take, or use a light observation to hook the reader.
The CTA should feel like a friendly nudge, not a hard sell.`,

  professional: `WRITING STYLE — PROFESSIONAL:
Write with authority and precision. This is B2B — speak to outcomes and business impact.
Use confident, active-voice statements. No hedging ("might", "could possibly").
Highlight credibility signals: scale, specificity, expertise.
Structure: establish authority → articulate the business problem → position the solution → direct CTA.
Tone: boardroom-ready. Polished, not stiff.`,
};

// ---------------------------------------------------------------------------
// Exa research helper for Storytelling style
// ---------------------------------------------------------------------------

async function fetchAdResearch(topic, exaKey, writingStyle) {
  if (!exaKey) return null;

  // Tailor the search query based on writing style
  const queryMap = {
    storytelling: `${topic} customer success story transformation results case study`,
    data_driven: `${topic} statistics data results ROI benchmark study report`,
    default: `${topic} benefits features reviews use case`,
    conversational: `${topic} review experience opinion recommendation`,
    professional: `${topic} enterprise solution business results ROI case study`,
  };
  const query = queryMap[writingStyle] || queryMap.default;

  try {
    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'x-api-key': exaKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        num_results: 5,
        use_autoprompt: true,
        type: 'neural',
        contents: { text: { max_characters: 600 } },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const snippets = (data.results || [])
      .filter(r => r.text?.trim())
      .map(r => `- ${r.title} (${r.url}): ${r.text.trim().slice(0, 400)}`)
      .join('\n');

    return snippets || null;
  } catch {
    return null;
  }
}

/**
 * Build a rich image prompt using GPT (same pattern as Cohesive Prompt Builder).
 */
async function buildAdImagePrompt(openai, { productDescription, platform, platformContext, brandKit, objective, targetAudience, adCopy, imageBrief }) {
  const sections = [];
  sections.push('PURPOSE: Generate a compelling advertising image for a paid ad campaign.');
  sections.push(`PLATFORM: ${platform} — ${platformContext}`);
  sections.push(`PRODUCT/SERVICE: ${productDescription}`);
  if (objective) sections.push(`CAMPAIGN OBJECTIVE: ${objective}`);
  if (targetAudience) sections.push(`TARGET AUDIENCE: ${targetAudience}`);
  if (imageBrief) sections.push(`IMAGE DIRECTION (follow this closely — it describes exactly what the image should show):\n${imageBrief}`);
  if (adCopy) sections.push(`AD COPY (image must visually match this message — if the copy mentions a specific person, gender, scenario, or setting, the image MUST reflect that):\n${adCopy}`);

  // Brand style guide context
  if (brandKit) {
    const bsg = [];
    if (brandKit.brand_name) bsg.push(`Brand: ${brandKit.brand_name}`);
    if (brandKit.industry) bsg.push(`Industry: ${brandKit.industry}`);
    if (brandKit.visual_style_notes) bsg.push(`Visual Style: ${brandKit.visual_style_notes}`);
    if (brandKit.mood_atmosphere) bsg.push(`Mood/Atmosphere: ${brandKit.mood_atmosphere}`);
    if (brandKit.lighting_prefs) bsg.push(`Lighting: ${brandKit.lighting_prefs}`);
    if (brandKit.composition_style) bsg.push(`Composition: ${brandKit.composition_style}`);
    if (brandKit.preferred_elements) bsg.push(`Preferred Elements: ${brandKit.preferred_elements}`);
    if (brandKit.prohibited_elements) bsg.push(`Prohibited Elements: ${brandKit.prohibited_elements}`);
    if (brandKit.ai_prompt_rules) bsg.push(`AI Prompt Rules: ${brandKit.ai_prompt_rules}`);
    if (brandKit.colors?.length > 0) bsg.push(`Brand Colors: ${JSON.stringify(brandKit.colors)}`);
    if (bsg.length > 0) sections.push(`BRAND STYLE GUIDE:\n${bsg.join('\n')}`);
  }

  const systemPrompt = `You are an expert AI advertising image prompt engineer. Your job is to take campaign details and produce a single, detailed, visually rich prompt for an AI image generator (Nano Banana 2).

Rules:
- Output ONLY the prompt text — no preamble, no explanation, no quotes
- CRITICAL: If an IMAGE DIRECTION is provided, follow it faithfully — it specifies exactly who/what should be shown
- CRITICAL: If the AD COPY mentions a specific person (name, gender, age), the image MUST depict a person matching that description. "Mark" = male. "Sarah" = female. Do NOT show a different gender or demographic than what the copy describes.
- Create a scene that visually represents the product/service and appeals to the target audience
- Be extremely specific with visual details: setting, lighting, colors, composition, materials, mood
- If a brand style guide is provided, align the visual style with it
- The image must work as an ad — it should be eye-catching and convey the value proposition visually
- Adapt the visual style to the platform (LinkedIn = professional/polished, Meta = vibrant/scroll-stopping, Google = clean/commercial)
- NEVER include text, words, logos, watermarks, or UI elements in the image
- NEVER use copyrighted brand names — describe visual characteristics instead
- Keep the prompt under 150 words — concise but vivid
- End with "AVOID: text, words, logos, watermarks, letters, typography" as the final line`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: sections.join('\n\n') },
    ],
    max_tokens: 400,
  });

  return (response.choices[0]?.message?.content || '').trim();
}

async function generateImage(prompt, falKey, supabase, aspect) {
  try {
    const falRes = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: aspect.width === aspect.height ? 'square_hd' : { width: aspect.width, height: aspect.height },
        num_images: 1,
      }),
    });

    if (!falRes.ok) return null;

    const falData = await falRes.json();
    const requestId = falData.request_id;
    let imageUrl = falData.images?.[0]?.url || null;

    if (requestId && !imageUrl) {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(`https://queue.fal.run/fal-ai/nano-banana-2/requests/${requestId}/status`, {
          headers: { Authorization: `Key ${falKey}` },
        });
        const statusData = await statusRes.json();
        if (statusData.status === 'COMPLETED') {
          const resultRes = await fetch(`https://queue.fal.run/fal-ai/nano-banana-2/requests/${requestId}`, {
            headers: { Authorization: `Key ${falKey}` },
          });
          const resultData = await resultRes.json();
          imageUrl = resultData.images?.[0]?.url;
          break;
        }
        if (statusData.status === 'FAILED') break;
      }
    }

    if (imageUrl) {
      try {
        return await uploadUrlToSupabase(imageUrl, supabase, 'ads');
      } catch {
        return imageUrl;
      }
    }
    return null;
  } catch (err) {
    console.warn('[ads/generate] Image generation failed:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.params;
  const { platforms } = req.body || {};

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Fetch campaign + verify ownership
  const { data: campaign, error: campErr } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (campErr || !campaign) return res.status(404).json({ error: 'Campaign not found' });

  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });

  const client = new OpenAI({ apiKey: keys.openaiKey });

  // Fetch brand kit (full visual fields for image prompt + basic fields for copy)
  const { data: brand } = await supabase
    .from('brand_kit')
    .select('brand_name, brand_username, tagline, industry, target_audience, visual_style_notes, mood_atmosphere, lighting_prefs, composition_style, ai_prompt_rules, preferred_elements, prohibited_elements, colors')
    .eq('user_id', req.user.id)
    .maybeSingle();

  const brandContext = [
    brand?.brand_name ? `Brand: ${brand.brand_name}` : null,
    brand?.tagline ? `Tagline: ${brand.tagline}` : null,
    brand?.industry ? `Industry: ${brand.industry}` : null,
    brand?.target_audience ? `Audience: ${brand.target_audience}` : null,
  ].filter(Boolean).join('\n');

  // ---------------------------------------------------------------------------
  // RAG: Fetch brand guidelines + knowledge base from Doubleclicker shared tables
  // ---------------------------------------------------------------------------
  const brandUsername = brand?.brand_username;
  let brandGuidelineContext = '';
  let ragContext = '';

  if (brandUsername) {
    // 1. Brand guidelines — voice, tone, target market, personality, preferred/prohibited phrases
    try {
      const { data: bg } = await supabase
        .from('brand_guidelines')
        .select('voice_and_tone, target_market, brand_personality, content_style_rules, prohibited_elements, preferred_elements')
        .eq('user_name', brandUsername)
        .maybeSingle();

      if (bg) {
        const parts = [];
        if (bg.brand_personality) parts.push(`Brand Personality: ${bg.brand_personality}`);
        if (bg.voice_and_tone) parts.push(`Voice & Tone: ${bg.voice_and_tone}`);
        if (bg.target_market) parts.push(`Target Market: ${bg.target_market}`);
        if (bg.preferred_elements) parts.push(`Preferred Elements: ${bg.preferred_elements}`);
        if (bg.prohibited_elements) parts.push(`Prohibited Elements: ${bg.prohibited_elements}`);
        if (bg.content_style_rules) parts.push(`Content Style Rules: ${bg.content_style_rules}`);
        if (parts.length > 0) {
          brandGuidelineContext = parts.join('\n\n');
          console.log(`[ads/generate] Brand guidelines loaded for ${brandUsername} (${brandGuidelineContext.length} chars)`);
        }
      }
    } catch (err) {
      console.warn('[ads/generate] Failed to fetch brand guidelines:', err.message);
    }

    // 2. RAG knowledge base — search for real product/industry data
    try {
      const searchQuery = campaign.product_description || campaign.name;
      const { data: chunks } = await supabase
        .from('knowledge_chunks')
        .select('content, url, domain')
        .eq('user_name', brandUsername)
        .textSearch('content_tsv', searchQuery, { type: 'websearch' })
        .limit(8);

      if (chunks?.length > 0) {
        ragContext = chunks
          .map(c => `- [${c.domain}${c.url ? ` — ${c.url}` : ''}]: ${c.content.slice(0, 400)}`)
          .join('\n');
        console.log(`[ads/generate] RAG: ${chunks.length} knowledge chunks found for "${searchQuery.slice(0, 50)}"`);
      }
    } catch (err) {
      console.warn('[ads/generate] RAG search failed:', err.message);
    }
  }

  // Resolve writing style and fetch web research for grounding (all styles)
  const writingStyle = campaign.writing_style || 'default';
  const exaKey = await resolveExaKey(req.user.id);
  const webResearch = await fetchAdResearch(
    campaign.product_description || campaign.name,
    exaKey,
    writingStyle
  );
  if (webResearch) {
    console.log(`[ads/generate] Web research fetched for ${writingStyle} (${webResearch.length} chars)`);
  }

  const targetPlatforms = platforms || campaign.platforms || ['linkedin'];
  const userMessageParts = [
    `Product/Service: ${campaign.product_description || campaign.name}`,
    campaign.landing_url ? `Landing URL: ${campaign.landing_url}` : null,
    campaign.target_audience ? `Target Audience: ${campaign.target_audience}` : null,
    campaign.objective ? `Campaign Objective: ${campaign.objective}` : null,
    brandContext || null,
    brandGuidelineContext ? `\nBRAND VOICE GUIDELINES — Follow these rules for tone, vocabulary, and style. This is how the brand speaks:\n${brandGuidelineContext}` : null,
    ragContext ? `\nKNOWLEDGE BASE — REAL facts, data, and information about this product/industry from researched sources. Use these details to write truthful, grounded ad copy:\n${ragContext}` : null,
    webResearch ? `\nWEB RESEARCH — Additional real information from the web. You may reference facts found here:\n${webResearch}` : null,
    STYLE_MODIFIERS[writingStyle] ? `\n${STYLE_MODIFIERS[writingStyle]}` : null,
  ].filter(Boolean);
  const userMessage = userMessageParts.join('\n');

  // Update status
  await supabase.from('ad_campaigns').update({ status: 'generating' }).eq('id', id);

  try {
    const allVariations = [];

    // Generate for each platform in parallel
    const platformResults = await Promise.allSettled(
      targetPlatforms.map(async (platform) => {
        const config = PLATFORM_CONFIGS[platform];
        if (!config) return { platform, variations: [] };

        // Generate copy
        const completion = await client.chat.completions.create({
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: config.system },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.8,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        });

        logCost({
          username: req.user.email,
          category: 'openai',
          operation: `ads_generate_${platform}`,
          model: 'gpt-4.1',
          input_tokens: completion.usage?.prompt_tokens || 0,
          output_tokens: completion.usage?.completion_tokens || 0,
        }).catch(() => {});

        const raw = completion.choices[0]?.message?.content || '{}';
        let parsed;
        try {
          parsed = stripDashes(JSON.parse(raw));
        } catch {
          console.error(`[ads/generate] Failed to parse ${platform} response:`, raw.slice(0, 200));
          return { platform, variations: [] };
        }

        // Structure varies by platform — generate per-variation images
        if (platform === 'google') {
          // Google RSA: single variation — one image
          let imageUrl = null;
          let imagePrompt = '';
          if (keys.falKey) {
            const adCopy = [parsed.headlines?.[0], parsed.descriptions?.[0]].filter(Boolean).join('. ');
            const imageBrief = parsed.image_brief || '';
            try {
              imagePrompt = await buildAdImagePrompt(client, {
                productDescription: campaign.product_description || campaign.name,
                platform,
                platformContext: config.platformContext,
                brandKit: brand,
                objective: campaign.objective,
                targetAudience: campaign.target_audience,
                adCopy: adCopy || undefined,
                imageBrief: imageBrief || undefined,
              });
              logCost({ username: req.user.email, category: 'openai', operation: `ads_image_prompt_${platform}`, model: 'gpt-4.1-mini' }).catch(() => {});
            } catch (err) {
              console.warn(`[ads/generate] Prompt build failed for ${platform}:`, err.message);
              imagePrompt = `${campaign.product_description || campaign.name}. Professional advertising image. No text, no logos.`;
            }
            imageUrl = await generateImage(imagePrompt, keys.falKey, supabase, config.imageAspect);
            if (imageUrl) logCost({ username: req.user.email, category: 'fal', operation: `ads_image_${platform}`, model: 'nano-banana-2' }).catch(() => {});
          }
          return {
            platform,
            variations: [{
              ad_format: 'responsive_search',
              copy_data: { headlines: parsed.headlines || [], descriptions: parsed.descriptions || [], pinned: {} },
              image_urls: imageUrl ? [imageUrl] : [],
              image_prompt: imagePrompt || null,
            }],
          };
        }

        // LinkedIn and Meta: generate a SEPARATE image per variation
        const variations = [];
        // Generate images in parallel (max 3 variations)
        const imageResults = await Promise.allSettled(
          (parsed.variations || []).map(async (v) => {
            if (!keys.falKey) return { imageUrl: null, imagePrompt: '' };

            const adCopy = [v.headline, v.introText || v.primaryText].filter(Boolean).join('. ').slice(0, 400);
            const imageBrief = v.image_brief || '';
            let imagePrompt = '';
            try {
              imagePrompt = await buildAdImagePrompt(client, {
                productDescription: campaign.product_description || campaign.name,
                platform,
                platformContext: config.platformContext,
                brandKit: brand,
                objective: campaign.objective,
                targetAudience: campaign.target_audience,
                adCopy: adCopy || undefined,
                imageBrief: imageBrief || undefined,
              });
              logCost({ username: req.user.email, category: 'openai', operation: `ads_image_prompt_${platform}`, model: 'gpt-4.1-mini' }).catch(() => {});
              console.log(`[ads/generate] ${platform} variation image: ${imagePrompt.slice(0, 120)}...`);
            } catch (err) {
              console.warn(`[ads/generate] Prompt build failed for ${platform} variation:`, err.message);
              imagePrompt = `${campaign.product_description || campaign.name}. Professional advertising image. No text, no logos.`;
            }
            const imageUrl = await generateImage(imagePrompt, keys.falKey, supabase, config.imageAspect);
            if (imageUrl) logCost({ username: req.user.email, category: 'fal', operation: `ads_image_${platform}`, model: 'nano-banana-2' }).catch(() => {});
            return { imageUrl, imagePrompt };
          })
        );

        (parsed.variations || []).forEach((v, i) => {
          const imgResult = imageResults[i]?.status === 'fulfilled' ? imageResults[i].value : { imageUrl: null, imagePrompt: '' };
          // Strip image_brief from copy_data before saving (it's internal, not ad copy)
          const { image_brief, ...copyData } = v;
          variations.push({
            ad_format: 'single_image',
            copy_data: copyData,
            image_urls: imgResult.imageUrl ? [imgResult.imageUrl] : [],
            image_prompt: imgResult.imagePrompt || null,
          });
        });

        return { platform, variations };
      })
    );

    // Insert all variations into DB
    for (const result of platformResults) {
      if (result.status !== 'fulfilled') continue;
      const { platform, variations } = result.value;

      for (const v of variations) {
        const { data, error } = await supabase
          .from('ad_variations')
          .insert({
            campaign_id: id,
            user_id: req.user.id,
            platform,
            ad_format: v.ad_format,
            copy_data: v.copy_data,
            image_urls: v.image_urls,
            image_prompt: v.image_prompt || null,
          })
          .select()
          .single();

        if (!error && data) allVariations.push(data);
      }
    }

    await supabase.from('ad_campaigns').update({ status: 'review' }).eq('id', id);

    return res.json({ success: true, variations: allVariations });
  } catch (err) {
    console.error('[ads/generate] Error:', err);
    await supabase.from('ad_campaigns').update({ status: 'draft' }).eq('id', id);
    return res.status(500).json({ error: err.message });
  }
}
