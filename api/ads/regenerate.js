/**
 * POST /api/ads/variations/:id/regenerate
 * Regenerate copy and/or image for a single variation.
 * Image regeneration uses GPT to build a rich prompt informed by brand kit,
 * and aims to IMPROVE on the previous prompt if one exists.
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';

const REGEN_PROMPTS = {
  linkedin: `You are an expert LinkedIn Ads copywriter. Generate a single LinkedIn Sponsored Content ad variation.

Produce:
- introText: Main post body (max 600 characters). Professional, compelling.
- headline: Below image (max 200 characters). Punchy, benefit-focused.
- description: Supporting text (max 300 characters).
- cta: One of: "Apply Now", "Download", "Get Quote", "Learn More", "Sign Up", "Subscribe", "Register", "Request Demo", "Contact Us"

NO emojis, NO hashtags, NO AI clichés. Return valid JSON: { "introText": "...", "headline": "...", "description": "...", "cta": "..." }`,

  google: `You are an expert Google Ads copywriter. Regenerate assets for a Responsive Search Ad.

Produce 15 headlines (max 30 chars each, no exclamation marks) and 4 descriptions (max 90 chars each).
Return valid JSON: { "headlines": ["..."], "descriptions": ["..."] }`,

  meta: `You are an expert Meta/Facebook Ads copywriter. Generate a single Facebook/Instagram feed ad variation.

Produce:
- primaryText: Above image (max 125 characters). Conversational, scroll-stopping.
- headline: Bold below image (max 40 characters).
- description: Below headline (max 30 characters).
- cta: One of: "Book Now", "Contact Us", "Download", "Get Offer", "Get Quote", "Learn More", "Shop Now", "Sign Up", "Watch More"

Return valid JSON: { "primaryText": "...", "headline": "...", "description": "...", "cta": "..." }`,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.params;
  const { regenerate_copy, regenerate_image, style_preset, custom_prompt } = req.body || {};

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Fetch variation + campaign
  const { data: variation, error: varErr } = await supabase
    .from('ad_variations')
    .select('*, ad_campaigns(*)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (varErr || !variation) return res.status(404).json({ error: 'Variation not found' });

  const campaign = variation.ad_campaigns;
  const keys = await getUserKeys(req.user.id, req.user.email);
  const updates = {};

  // Regenerate copy
  if (regenerate_copy !== false) {
    if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });

    const client = new OpenAI({ apiKey: keys.openaiKey });
    const systemPrompt = REGEN_PROMPTS[variation.platform];
    if (!systemPrompt) return res.status(400).json({ error: `Unsupported platform: ${variation.platform}` });

    // Fetch brand kit for context
    let brandContext = '';
    try {
      const { data: brandKit } = await supabase
        .from('brand_kit')
        .select('brand_name, tagline, industry, target_audience')
        .eq('user_id', req.user.id)
        .single();
      if (brandKit) {
        const parts = [];
        if (brandKit.brand_name) parts.push(`Brand: ${brandKit.brand_name}`);
        if (brandKit.tagline) parts.push(`Tagline: ${brandKit.tagline}`);
        if (brandKit.industry) parts.push(`Industry: ${brandKit.industry}`);
        if (brandKit.target_audience) parts.push(`Brand Audience: ${brandKit.target_audience}`);
        brandContext = parts.join('\n');
      }
    } catch {}

    const userMessage = [
      `Product/Service: ${campaign.product_description || campaign.name}`,
      campaign.landing_url ? `Landing URL: ${campaign.landing_url}` : null,
      campaign.target_audience ? `Target Audience: ${campaign.target_audience}` : null,
      brandContext || null,
    ].filter(Boolean).join('\n');

    const completion = await client.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.9,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    logCost({
      username: req.user.email,
      category: 'openai',
      operation: `ads_regenerate_${variation.platform}`,
      model: 'gpt-4.1',
      input_tokens: completion.usage?.prompt_tokens || 0,
      output_tokens: completion.usage?.completion_tokens || 0,
    }).catch(() => {});

    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      if (variation.platform === 'google') {
        updates.copy_data = { headlines: parsed.headlines || [], descriptions: parsed.descriptions || [], pinned: variation.copy_data?.pinned || {} };
      } else {
        updates.copy_data = parsed;
      }
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
  }

  // Regenerate image with smart prompt building
  if (regenerate_image && keys.falKey) {
    const aspectMap = { linkedin: { width: 1200, height: 627 }, google: { width: 1200, height: 628 }, meta: { width: 1080, height: 1080 } };
    const aspect = aspectMap[variation.platform] || { width: 1080, height: 1080 };
    const platformContextMap = {
      linkedin: 'Professional LinkedIn ad — business context, polished, trustworthy',
      google: 'Google display ad — clean, commercial quality, attention-grabbing',
      meta: 'Meta/Instagram feed ad — eye-catching, vibrant, scroll-stopping',
    };

    // Fetch brand kit for image prompt (richer fields than copy needs)
    let brandKit = null;
    try {
      const { data: bk } = await supabase
        .from('brand_kit')
        .select('brand_name, industry, visual_style_notes, mood_atmosphere, lighting_prefs, composition_style, ai_prompt_rules, preferred_elements, prohibited_elements, colors')
        .eq('user_id', req.user.id)
        .maybeSingle();
      brandKit = bk;
    } catch {}

    // Always build a rich prompt via GPT so that style_preset is always applied.
    // When custom_prompt is provided, treat it as creative direction (not verbatim output).
    let imagePrompt = '';
    try {
      const sections = [];
      sections.push('PURPOSE: Generate an improved advertising image for a paid ad campaign.');
      sections.push(`PLATFORM: ${variation.platform} — ${platformContextMap[variation.platform] || 'advertising'}`);
      sections.push(`PRODUCT/SERVICE: ${campaign.product_description || campaign.name}`);
      if (campaign.objective) sections.push(`CAMPAIGN OBJECTIVE: ${campaign.objective}`);
      if (campaign.target_audience) sections.push(`TARGET AUDIENCE: ${campaign.target_audience}`);
      if (style_preset) sections.push(`REQUESTED VISUAL STYLE: ${style_preset}`);

      // User's custom direction — use as creative guidance, not verbatim output
      if (custom_prompt && custom_prompt.trim()) {
        sections.push(`USER DIRECTION (incorporate this concept and intent, but improve and vary it — do not copy verbatim):\n${custom_prompt.trim()}`);
      } else if (variation.image_prompt) {
        // Previous prompt context — tell GPT to improve on it
        sections.push(`PREVIOUS IMAGE PROMPT (improve on this — make it more specific, vivid, and on-brand):\n${variation.image_prompt}`);
      }

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

      if (!keys.openaiKey) throw new Error('No OpenAI key');
      const client = new OpenAI({ apiKey: keys.openaiKey });

      const systemPrompt = `You are an expert AI advertising image prompt engineer. Your job is to produce a single, detailed, visually rich prompt for an AI image generator (Nano Banana 2).

Rules:
- Output ONLY the prompt text — no preamble, no explanation, no quotes
- Create a scene that visually represents the product/service and appeals to the target audience
- Be extremely specific with visual details: setting, lighting, colors, composition, materials, mood
- If a brand style guide is provided, align the visual style with it
- If a visual style is requested, apply that aesthetic throughout — this takes priority over any previous prompt style
- If USER DIRECTION is provided, interpret the creative intent and build on it — do not copy it verbatim; improve and vary it
- If a previous prompt is provided, IMPROVE on it — make the scene more compelling, more specific, more on-brand. Take a different creative angle while keeping the core concept.
- Each regeneration should produce a noticeably different composition or creative angle for variety
- The image must work as an ad — eye-catching and conveying value visually
- NEVER include text, words, logos, watermarks, or UI elements in the image
- NEVER use copyrighted brand names — describe visual characteristics instead
- Keep the prompt under 150 words
- End with "AVOID: text, words, logos, watermarks, letters, typography" as the final line`;

      const response = await client.chat.completions.create({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: sections.join('\n\n') },
        ],
        max_tokens: 400,
      });

      imagePrompt = (response.choices[0]?.message?.content || '').trim();
      logCost({ username: req.user.email, category: 'openai', operation: `ads_regen_prompt_${variation.platform}`, model: 'gpt-4.1-mini' }).catch(() => {});
      console.log(`[ads/regenerate] ${variation.platform} image prompt: ${imagePrompt.slice(0, 120)}...`);
    } catch (err) {
      console.warn('[ads/regenerate] Prompt build failed, using fallback:', err.message);
      const styleText = style_preset ? ` Visual style: ${style_preset}.` : '';
      imagePrompt = `${campaign.product_description || campaign.name}. Professional, high quality advertising image.${styleText} No text, no logos.`;
    }

    try {
      const falRes = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
        method: 'POST',
        headers: { Authorization: `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, image_size: aspect.width === aspect.height ? 'square_hd' : aspect, num_images: 1 }),
      });

      if (falRes.ok) {
        const falData = await falRes.json();
        const requestId = falData.request_id;
        let imageUrl = falData.images?.[0]?.url || null;

        if (requestId && !imageUrl) {
          for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 2000));
            const sr = await fetch(`https://queue.fal.run/fal-ai/nano-banana-2/requests/${requestId}/status`, { headers: { Authorization: `Key ${keys.falKey}` } });
            const sd = await sr.json();
            if (sd.status === 'COMPLETED') {
              const rr = await fetch(`https://queue.fal.run/fal-ai/nano-banana-2/requests/${requestId}`, { headers: { Authorization: `Key ${keys.falKey}` } });
              const rd = await rr.json();
              imageUrl = rd.images?.[0]?.url;
              break;
            }
            if (sd.status === 'FAILED') break;
          }
        }

        if (imageUrl) {
          const stored = await uploadUrlToSupabase(imageUrl, supabase, 'ads').catch(() => imageUrl);
          updates.image_urls = [stored];
          updates.image_prompt = imagePrompt;
          logCost({ username: req.user.email, category: 'fal', operation: `ads_regen_image_${variation.platform}`, model: 'nano-banana-2' }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[ads/regenerate] Image regen failed:', err.message);
    }
  }

  if (Object.keys(updates).length === 0) return res.json({ variation });

  const { data, error } = await supabase
    .from('ad_variations')
    .update(updates)
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ variation: data });
}
