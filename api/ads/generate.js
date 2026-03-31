/**
 * POST /api/ads/campaigns/:id/generate
 * Generate ad variations for selected platforms using AI.
 * Currently supports: linkedin (google + meta coming soon).
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
    imagePromptSuffix: 'Professional, modern, business context. No text, no logos, no words.',
  },
  google: {
    system: GOOGLE_RSA_SYSTEM,
    imageAspect: { width: 1200, height: 628 },
    imagePromptSuffix: 'Clean, professional, commercial quality. No text, no logos.',
  },
  meta: {
    system: META_SYSTEM,
    imageAspect: { width: 1080, height: 1080 },
    imagePromptSuffix: 'Eye-catching, vibrant, scroll-stopping. No text, no logos.',
  },
};

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

  // Fetch brand context
  const { data: brand } = await supabase
    .from('brand_kit')
    .select('brand_name, tagline, industry, target_audience')
    .eq('user_id', req.user.id)
    .maybeSingle();

  const brandContext = [
    brand?.brand_name ? `Brand: ${brand.brand_name}` : null,
    brand?.tagline ? `Tagline: ${brand.tagline}` : null,
    brand?.industry ? `Industry: ${brand.industry}` : null,
    brand?.target_audience ? `Audience: ${brand.target_audience}` : null,
  ].filter(Boolean).join('\n');

  const targetPlatforms = platforms || campaign.platforms || ['linkedin'];
  const userMessage = [
    `Product/Service: ${campaign.product_description || campaign.name}`,
    campaign.landing_url ? `Landing URL: ${campaign.landing_url}` : null,
    campaign.target_audience ? `Target Audience: ${campaign.target_audience}` : null,
    campaign.objective ? `Campaign Objective: ${campaign.objective}` : null,
    brandContext || null,
  ].filter(Boolean).join('\n');

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
          parsed = JSON.parse(raw);
        } catch {
          console.error(`[ads/generate] Failed to parse ${platform} response:`, raw.slice(0, 200));
          return { platform, variations: [] };
        }

        // Generate image for this platform
        const imagePrompt = `${campaign.product_description || campaign.name}. ${config.imagePromptSuffix}`;
        let imageUrl = null;
        if (keys.falKey) {
          imageUrl = await generateImage(imagePrompt, keys.falKey, supabase, config.imageAspect);
          if (imageUrl) {
            logCost({
              username: req.user.email,
              category: 'fal',
              operation: `ads_image_${platform}`,
              model: 'nano-banana-2',
            }).catch(() => {});
          }
        }

        // Structure varies by platform
        if (platform === 'google') {
          // Google RSA: single variation with multiple headlines/descriptions
          return {
            platform,
            variations: [{
              ad_format: 'responsive_search',
              copy_data: {
                headlines: parsed.headlines || [],
                descriptions: parsed.descriptions || [],
                pinned: {},
              },
              image_urls: imageUrl ? [imageUrl] : [],
            }],
          };
        }

        // LinkedIn and Meta: multiple variations
        const variations = (parsed.variations || []).map(v => ({
          ad_format: 'single_image',
          copy_data: v,
          image_urls: imageUrl ? [imageUrl] : [],
        }));

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
