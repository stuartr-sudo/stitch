/**
 * POST /api/ads/variations/:id/regenerate
 * Regenerate copy and/or image for a single variation.
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
  const { regenerate_copy, regenerate_image } = req.body || {};

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

    const userMessage = [
      `Product/Service: ${campaign.product_description || campaign.name}`,
      campaign.landing_url ? `Landing URL: ${campaign.landing_url}` : null,
      campaign.target_audience ? `Target Audience: ${campaign.target_audience}` : null,
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

  // Regenerate image
  if (regenerate_image && keys.falKey) {
    const aspectMap = { linkedin: { width: 1200, height: 627 }, google: { width: 1200, height: 628 }, meta: { width: 1080, height: 1080 } };
    const aspect = aspectMap[variation.platform] || { width: 1080, height: 1080 };
    const prompt = `${campaign.product_description || campaign.name}. Professional, high quality. No text, no logos.`;

    try {
      const falRes = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
        method: 'POST',
        headers: { Authorization: `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image_size: aspect.width === aspect.height ? 'square_hd' : aspect, num_images: 1 }),
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
