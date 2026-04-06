/**
 * POST /api/ads/enhance-prompt
 * Use GPT-4.1-mini to rewrite a user's raw text into a rich, cohesive
 * image generation prompt for an ad variation — without generating an image.
 * Returns { enhanced_prompt } so the user can review and edit before regenerating.
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { variation_id, custom_prompt } = req.body || {};
  if (!variation_id) return res.status(400).json({ error: 'variation_id required' });
  if (!custom_prompt?.trim()) return res.status(400).json({ error: 'custom_prompt required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const keys = await getUserKeys(req.user.id, req.user.email);

  if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });

  const { data: variation, error: varErr } = await supabase
    .from('ad_variations')
    .select('*, ad_campaigns(*)')
    .eq('id', variation_id)
    .eq('user_id', req.user.id)
    .single();

  if (varErr || !variation) return res.status(404).json({ error: 'Variation not found' });

  const campaign = variation.ad_campaigns;
  const platformContextMap = {
    linkedin: 'Professional LinkedIn ad — business context, polished, trustworthy',
    google: 'Google display ad — clean, commercial quality, attention-grabbing',
    meta: 'Meta/Instagram feed ad — eye-catching, vibrant, scroll-stopping',
  };

  // Fetch brand kit
  let brandKit = null;
  try {
    const { data: bk } = await supabase
      .from('brand_kit')
      .select('brand_name, industry, visual_style_notes, mood_atmosphere, lighting_prefs, composition_style, ai_prompt_rules, preferred_elements, prohibited_elements, colors')
      .eq('user_id', req.user.id)
      .maybeSingle();
    brandKit = bk;
  } catch {}

  const sections = [];
  sections.push('PURPOSE: Generate an improved advertising image for a paid ad campaign.');
  sections.push(`PLATFORM: ${variation.platform} — ${platformContextMap[variation.platform] || 'advertising'}`);
  sections.push(`PRODUCT/SERVICE: ${campaign.product_description || campaign.name}`);
  if (campaign.objective) sections.push(`CAMPAIGN OBJECTIVE: ${campaign.objective}`);
  if (campaign.target_audience) sections.push(`TARGET AUDIENCE: ${campaign.target_audience}`);

  // Include ad copy for visual alignment
  const copyLines = [];
  const c = variation.copy_data || {};
  if (c.headline) copyLines.push(`Headline: ${c.headline}`);
  if (c.introText) copyLines.push(`Intro: ${c.introText.slice(0, 200)}`);
  if (c.primaryText) copyLines.push(`Primary Text: ${c.primaryText}`);
  if (c.headlines?.length > 0) copyLines.push(`Headlines: ${c.headlines.slice(0, 3).join(' | ')}`);
  if (copyLines.length > 0) sections.push(`AD COPY (image must visually reinforce this message):\n${copyLines.join('\n')}`);

  sections.push(`USER DIRECTION (build on this creative idea — make it vivid and specific):\n${custom_prompt.trim()}`);

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

  const client = new OpenAI({ apiKey: keys.openaiKey });

  const systemPrompt = `You are an expert AI advertising image prompt engineer. Your job is to produce a single, detailed, visually rich prompt for an AI image generator (Nano Banana 2).

Rules:
- Output ONLY the prompt text — no preamble, no explanation, no quotes
- Create a scene that visually represents the product/service and appeals to the target audience
- Be extremely specific with visual details: setting, lighting, colors, composition, materials, mood
- If a brand style guide is provided, align the visual style with it
- Interpret the USER DIRECTION's creative intent and build on it — make it vivid, specific, and compelling
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

  const enhanced_prompt = (response.choices[0]?.message?.content || '').trim();

  logCost({
    username: req.user.email,
    category: 'openai',
    operation: `ads_enhance_prompt_${variation.platform}`,
    model: 'gpt-4.1-mini',
    input_tokens: response.usage?.prompt_tokens || 0,
    output_tokens: response.usage?.completion_tokens || 0,
  }).catch(() => {});

  return res.json({ enhanced_prompt });
}
