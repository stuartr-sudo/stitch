/**
 * POST /api/intelligence/generate-campaign
 * Create a campaign with research-enriched ad variations.
 * Replicates api/ads/generate.js but injects competitive intelligence context.
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';

const LINKEDIN_SYSTEM = `You are an expert LinkedIn Ads copywriter. Generate 3 ad variations for LinkedIn Sponsored Content.

For each variation, produce:
- introText: The main post body (max 600 characters). Professional, compelling, with a clear value proposition.
- headline: Appears below the image (max 200 characters). Punchy and benefit-focused.
- description: Supporting text below headline (max 300 characters). Reinforces the value prop.
- cta: One of: "Apply Now", "Download", "Get Quote", "Learn More", "Sign Up", "Subscribe", "Register", "Request Demo", "Contact Us"

RULES:
- NO emojis, NO hashtags
- NO filler phrases: "In today's world", "Let's dive in", "Here's the thing"
- NO AI clichés: "landscape", "navigate", "leverage", "robust", "delve"
- Be specific with real benefits and outcomes
- Each variation should take a different angle (professional/authoritative, conversational/relatable, data-driven/specific)
- Write for B2B decision-makers unless told otherwise

Return valid JSON: { "variations": [{ "introText": "...", "headline": "...", "description": "...", "cta": "..." }] }`;

const GOOGLE_RSA_SYSTEM = `You are an expert Google Ads copywriter. Generate assets for a Responsive Search Ad.

Produce:
- 15 headlines (max 30 characters EACH — this is a hard limit, count carefully)
- 4 descriptions (max 90 characters EACH)

RULES:
- No exclamation marks (Google policy)
- No ALL CAPS words
- Headlines must be diverse: include brand name, benefits, features, CTAs, numbers
- Descriptions should expand on different value propositions
- Be specific with real benefits
- Include at least 2 headlines with numbers/stats
- Include at least 1 headline as a question

Return valid JSON: { "headlines": ["..."], "descriptions": ["..."] }`;

const META_SYSTEM = `You are an expert Meta/Facebook Ads copywriter. Generate 3 ad variations for Facebook/Instagram feed ads.

For each variation, produce:
- primaryText: Main text above image (max 125 characters for above-fold). Conversational, scroll-stopping.
- headline: Bold text below image (max 40 characters). Action-oriented.
- description: Below headline (max 30 characters). Supporting info.
- cta: One of: "Book Now", "Contact Us", "Download", "Get Offer", "Get Quote", "Learn More", "Shop Now", "Sign Up", "Watch More"

RULES:
- Conversational, not corporate
- NO AI clichés
- Each variation should take a different angle (emotional, practical, social-proof)
- Write to stop the scroll — first 5 words matter most

Return valid JSON: { "variations": [{ "primaryText": "...", "headline": "...", "description": "...", "cta": "..." }] }`;

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

const STRATEGY_DIRECTIVES = {
  beat_weaknesses: 'Your PRIMARY goal is to exploit the competitor\'s weaknesses. For every weakness identified, create copy that directly addresses what the competitor fails to do. If they lack social proof, lead with testimonials. If they have a generic CTA, use a specific, urgent one. If they miss risk reversal, add a guarantee.',
  match_improve: 'Study what works in the competitor\'s ads and do it BETTER. Keep the same effective approaches (hooks, emotional triggers) but execute them with stronger copy, more specificity, and better CTAs. Elevate their formula without copying it.',
  differentiate: 'Take a deliberately DIFFERENT approach from the competitor. If they lead with features, you lead with emotion. If they target individuals, you target teams. Find the gap in their positioning and own it. Be contrarian where they are conventional.',
};

/**
 * Build a rich image prompt using GPT (same pattern as api/ads/generate.js).
 */
async function buildAdImagePrompt(openai, { productDescription, platform, platformContext, brandKit, objective, targetAudience }) {
  const sections = [];
  sections.push('PURPOSE: Generate a compelling advertising image for a paid ad campaign.');
  sections.push(`PLATFORM: ${platform} — ${platformContext}`);
  sections.push(`PRODUCT/SERVICE: ${productDescription}`);
  if (objective) sections.push(`CAMPAIGN OBJECTIVE: ${objective}`);
  if (targetAudience) sections.push(`TARGET AUDIENCE: ${targetAudience}`);

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

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: `You are an expert AI advertising image prompt engineer. Your job is to take campaign details and produce a single, detailed, visually rich prompt for an AI image generator (Nano Banana 2).

Rules:
- Output ONLY the prompt text — no preamble, no explanation, no quotes
- Create a scene that visually represents the product/service and appeals to the target audience
- Be extremely specific with visual details: setting, lighting, colors, composition, materials, mood
- If a brand style guide is provided, align the visual style with it
- The image must work as an ad — it should be eye-catching and convey the value proposition visually
- Adapt the visual style to the platform (LinkedIn = professional/polished, Meta = vibrant/scroll-stopping, Google = clean/commercial)
- NEVER include text, words, logos, watermarks, or UI elements in the image
- NEVER use copyrighted brand names — describe visual characteristics instead
- Keep the prompt under 150 words — concise but vivid
- End with "AVOID: text, words, logos, watermarks, letters, typography" as the final line` },
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
      try { return await uploadUrlToSupabase(imageUrl, supabase, 'ads'); } catch { return imageUrl; }
    }
    return null;
  } catch (err) {
    console.warn('[intelligence/generate-campaign] Image generation failed:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, product_description, landing_url, target_audience,
    platforms, objective, brand_kit_id,
    strategy, insights, source_ad_ids, competitor_id,
  } = req.body;

  if (!name || !platforms?.length) {
    return res.status(400).json({ error: 'name and platforms[] required' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    const keys = await getUserKeys(userId, req.user.email);
    if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });
    const openai = new OpenAI({ apiKey: keys.openaiKey });

    // 1. Create campaign
    const { data: campaign, error: campErr } = await supabase
      .from('ad_campaigns')
      .insert({
        user_id: userId,
        name,
        platforms,
        objective: objective || 'conversions',
        landing_url: landing_url || null,
        product_description: product_description || null,
        target_audience: target_audience || null,
        brand_kit_id: brand_kit_id || null,
        status: 'generating',
      })
      .select()
      .single();

    if (campErr) throw campErr;

    // 2. Create research session
    const { data: session, error: sessErr } = await supabase
      .from('research_sessions')
      .insert({
        user_id: userId,
        campaign_id: campaign.id,
        competitor_id: competitor_id || null,
        strategy: strategy || 'beat_weaknesses',
        applied_insights: insights || [],
        source_ads: source_ad_ids || [],
      })
      .select()
      .single();

    if (sessErr) throw sessErr;

    // 3. Link research session to campaign
    await supabase.from('ad_campaigns').update({ research_session_id: session.id }).eq('id', campaign.id);

    // 4. Fetch source ad analyses for competitor context
    let competitorContext = '';
    if (source_ad_ids?.length) {
      const { data: sourceAds } = await supabase
        .from('ad_library')
        .select('analysis, landing_page_analysis, ad_copy, platform')
        .in('id', source_ad_ids)
        .eq('user_id', userId);

      if (sourceAds?.length) {
        const analyses = sourceAds.map((ad, i) => {
          let ctx = `Ad ${i + 1} (${ad.platform || 'unknown'}): `;
          if (ad.analysis) {
            ctx += `Strengths: ${ad.analysis.strengths?.join(', ') || 'N/A'}. `;
            ctx += `Weaknesses: ${ad.analysis.weaknesses?.join(', ') || 'N/A'}. `;
          }
          return ctx;
        }).join('\n');
        competitorContext = analyses;
      }
    }

    // Build research enrichment block
    const strategyDirective = STRATEGY_DIRECTIVES[strategy] || STRATEGY_DIRECTIVES.beat_weaknesses;
    const insightsText = insights?.length
      ? insights.map(i => `- ${typeof i === 'string' ? i : i.text}`).join('\n')
      : '';

    const researchBlock = `

COMPETITIVE INTELLIGENCE:
Strategy: ${strategy || 'beat_weaknesses'}
${strategyDirective}

${competitorContext ? `Competitor Analysis:\n${competitorContext}` : ''}

${insightsText ? `Apply These Insights:\n${insightsText}` : ''}

Use this intelligence to create ads that specifically outperform the competitor.`;

    // Fetch brand kit
    let brand = null;
    if (brand_kit_id) {
      const { data } = await supabase
        .from('brand_kit')
        .select('brand_name, tagline, industry, target_audience, visual_style_notes, mood_atmosphere, lighting_prefs, composition_style, ai_prompt_rules, preferred_elements, prohibited_elements, colors')
        .eq('id', brand_kit_id)
        .eq('user_id', userId)
        .maybeSingle();
      brand = data;
    }

    const brandContext = [
      brand?.brand_name ? `Brand: ${brand.brand_name}` : null,
      brand?.tagline ? `Tagline: ${brand.tagline}` : null,
      brand?.industry ? `Industry: ${brand.industry}` : null,
    ].filter(Boolean).join('\n');

    const userMessage = [
      `Product/Service: ${product_description || name}`,
      landing_url ? `Landing URL: ${landing_url}` : null,
      target_audience ? `Target Audience: ${target_audience}` : null,
      objective ? `Campaign Objective: ${objective}` : null,
      brandContext || null,
    ].filter(Boolean).join('\n');

    // 5. Generate for each platform
    const allVariations = [];

    const platformResults = await Promise.allSettled(
      platforms.map(async (platform) => {
        const config = PLATFORM_CONFIGS[platform];
        if (!config) return { platform, variations: [] };

        // Enriched system prompt = base + research block
        const enrichedSystem = config.system + researchBlock;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: enrichedSystem },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.8,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        });

        logCost({
          username: req.user.email,
          category: 'openai',
          operation: `intelligence_generate_${platform}`,
          model: 'gpt-4.1',
          input_tokens: completion.usage?.prompt_tokens || 0,
          output_tokens: completion.usage?.completion_tokens || 0,
        }).catch(() => {});

        const raw = completion.choices[0]?.message?.content || '{}';
        let parsed;
        try { parsed = JSON.parse(raw); } catch {
          console.error(`[intelligence/generate-campaign] Failed to parse ${platform}:`, raw.slice(0, 200));
          return { platform, variations: [] };
        }

        // Generate image
        let imageUrl = null;
        let imagePrompt = '';
        if (keys.falKey) {
          try {
            imagePrompt = await buildAdImagePrompt(openai, {
              productDescription: product_description || name,
              platform,
              platformContext: config.platformContext,
              brandKit: brand,
              objective,
              targetAudience: target_audience,
            });
            logCost({
              username: req.user.email,
              category: 'openai',
              operation: `intelligence_image_prompt_${platform}`,
              model: 'gpt-4.1-mini',
            }).catch(() => {});
          } catch (err) {
            console.warn(`[intelligence/generate-campaign] Prompt build failed for ${platform}, using fallback:`, err.message);
            imagePrompt = `${product_description || name}. Professional, high quality advertising image. No text, no logos.`;
          }

          imageUrl = await generateImage(imagePrompt, keys.falKey, supabase, config.imageAspect);
          if (imageUrl) {
            logCost({ username: req.user.email, category: 'fal', operation: `intelligence_image_${platform}`, model: 'nano-banana-2' }).catch(() => {});
          }
        }

        // Structure varies by platform
        if (platform === 'google') {
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

        return {
          platform,
          variations: (parsed.variations || []).map(v => ({
            ad_format: 'single_image',
            copy_data: v,
            image_urls: imageUrl ? [imageUrl] : [],
            image_prompt: imagePrompt || null,
          })),
        };
      })
    );

    // Insert all variations
    for (const result of platformResults) {
      if (result.status !== 'fulfilled') continue;
      const { platform, variations } = result.value;
      for (const v of variations) {
        const { data, error } = await supabase
          .from('ad_variations')
          .insert({
            campaign_id: campaign.id,
            user_id: userId,
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

    await supabase.from('ad_campaigns').update({ status: 'review' }).eq('id', campaign.id);

    return res.json({ success: true, campaign_id: campaign.id, research_session_id: session.id, variations: allVariations });
  } catch (err) {
    console.error('[intelligence/generate-campaign] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
