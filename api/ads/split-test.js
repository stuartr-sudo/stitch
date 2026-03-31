/**
 * POST /api/ads/variations/:id/split-test
 * Create a split-test variation from an existing one.
 * Two modes:
 *   - duplicate: exact copy for manual editing
 *   - ai: AI generates a different angle based on the original
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const SPLIT_PROMPTS = {
  linkedin: `You are an expert LinkedIn Ads copywriter. You're creating an A/B split test variation.
Given an existing ad, create a DIFFERENT version that tests a new angle. Keep the same product/offer but change:
- The hook/opening approach
- The emotional angle (e.g. if original is aspirational, try fear-of-missing-out; if data-driven, try story-led)
- The CTA framing

Return valid JSON: { "introText": "...", "headline": "...", "description": "...", "cta": "..." }
Max lengths: introText 600 chars, headline 200 chars, description 300 chars.
CTA must be one of: "Apply Now", "Download", "Get Quote", "Learn More", "Sign Up", "Subscribe", "Register", "Request Demo", "Contact Us"`,

  google: `You are an expert Google Ads copywriter. You're creating an A/B split test for a Responsive Search Ad.
Given existing headlines and descriptions, create a DIFFERENT set that tests new angles.
- Use different value propositions and hooks
- Test different CTAs and benefit framings
- Ensure variety from the original

Return valid JSON: { "headlines": ["..."], "descriptions": ["..."] }
Exactly 15 headlines (max 30 chars each, no exclamation marks) and 4 descriptions (max 90 chars each).`,

  meta: `You are an expert Meta/Facebook Ads copywriter. You're creating an A/B split test variation.
Given an existing ad, create a DIFFERENT version that tests a new angle. Change:
- The scroll-stopping hook
- The emotional tone (e.g. if original is urgent, try curiosity; if practical, try emotional)
- The CTA approach

Return valid JSON: { "primaryText": "...", "headline": "...", "description": "...", "cta": "..." }
Max lengths: primaryText 125 chars, headline 40 chars, description 30 chars.
CTA must be one of: "Book Now", "Contact Us", "Download", "Get Offer", "Get Quote", "Learn More", "Shop Now", "Sign Up", "Watch More"`,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.params;
  const { mode } = req.body || {}; // 'duplicate' or 'ai'

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Fetch source variation + campaign
  const { data: source, error: srcErr } = await supabase
    .from('ad_variations')
    .select('*, ad_campaigns(*)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (srcErr || !source) return res.status(404).json({ error: 'Variation not found' });

  const campaign = source.ad_campaigns;
  let newCopyData = { ...source.copy_data };

  // AI mode: generate a different angle
  if (mode === 'ai') {
    const keys = await getUserKeys(req.user.id, req.user.email);
    if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });

    const client = new OpenAI({ apiKey: keys.openaiKey });
    const systemPrompt = SPLIT_PROMPTS[source.platform];
    if (!systemPrompt) return res.status(400).json({ error: `Unsupported platform: ${source.platform}` });

    const originalCopy = JSON.stringify(source.copy_data, null, 2);
    const userMessage = [
      `Product/Service: ${campaign.product_description || campaign.name}`,
      campaign.landing_url ? `Landing URL: ${campaign.landing_url}` : null,
      campaign.target_audience ? `Target Audience: ${campaign.target_audience}` : null,
      `\nORIGINAL AD (create something DIFFERENT from this):\n${originalCopy}`,
    ].filter(Boolean).join('\n');

    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.95,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      logCost({
        username: req.user.email,
        category: 'openai',
        operation: `ads_split_test_${source.platform}`,
        model: 'gpt-4.1',
        input_tokens: completion.usage?.prompt_tokens || 0,
        output_tokens: completion.usage?.completion_tokens || 0,
      }).catch(() => {});

      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');

      if (source.platform === 'google') {
        newCopyData = {
          headlines: parsed.headlines || source.copy_data.headlines || [],
          descriptions: parsed.descriptions || source.copy_data.descriptions || [],
          pinned: {},
        };
      } else {
        newCopyData = parsed;
      }
    } catch (err) {
      console.error('[ads/split-test] AI generation failed:', err);
      return res.status(500).json({ error: 'AI generation failed: ' + err.message });
    }
  }

  // Preserve UTM params from source but update utm_content for split tracking
  if (newCopyData.utm_params) {
    newCopyData.utm_params = {
      ...newCopyData.utm_params,
      utm_content: `${newCopyData.utm_params.utm_content || 'variation'}_split`,
    };
  } else if (source.copy_data?.utm_params) {
    newCopyData.utm_params = {
      ...source.copy_data.utm_params,
      utm_content: `${source.copy_data.utm_params.utm_content || 'variation'}_split`,
    };
  }

  // Insert new variation
  const { data: newVariation, error: insertErr } = await supabase
    .from('ad_variations')
    .insert({
      campaign_id: source.campaign_id,
      user_id: req.user.id,
      platform: source.platform,
      ad_format: source.ad_format,
      copy_data: newCopyData,
      image_urls: source.image_urls, // reuse same images
      status: 'draft',
    })
    .select()
    .single();

  if (insertErr) return res.status(500).json({ error: insertErr.message });

  return res.json({ variation: newVariation });
}
