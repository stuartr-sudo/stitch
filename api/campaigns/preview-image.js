/**
 * POST /api/campaigns/preview-image
 *
 * Generate a preview image for scene 1 of a short.
 * Returns the image URL so the user can approve before running the full pipeline.
 *
 * Body: {
 *   visual_prompt: string,    // scene 1 visual prompt
 *   visual_style?: string,    // visual style key
 *   lora_config?: array,
 *   image_model?: string,
 *   brand_username?: string,
 * }
 *
 * Response: { image_url: string }
 */

import { createClient } from '@supabase/supabase-js';
import { generateImage } from '../lib/pipelineHelpers.js';
import { getVisualStyleSuffix } from '../lib/visualStyles.js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { visual_prompt, visual_style, lora_config, image_model, brand_username } = req.body;

  if (!visual_prompt) {
    return res.status(400).json({ error: 'visual_prompt is required' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const userId = brand_username
    ? await resolveUserIdFromBrand(brand_username, supabase, req.user?.id)
    : req.user?.id;
  if (!userId) return res.status(404).json({ error: 'User not found' });

  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('fal_key, wavespeed_key')
    .eq('user_id', userId)
    .maybeSingle();

  const keys = {
    falKey: userKeys?.fal_key || process.env.FAL_KEY,
    wavespeedKey: userKeys?.wavespeed_key || process.env.WAVESPEED_KEY || process.env.WAVESPEED_API_KEY,
  };

  if (!keys.falKey && !keys.wavespeedKey) {
    return res.status(400).json({ error: 'Image generation API key required' });
  }

  try {
    const visualSuffix = getVisualStyleSuffix(visual_style) || '';
    const loraConfigs = lora_config || [];
    const triggerPrefix = loraConfigs.map(c => c.triggerWord).filter(Boolean).join(', ');

    const basePrompt = [triggerPrefix, visual_prompt].filter(Boolean).join(', ');
    const fullPrompt = basePrompt + visualSuffix + '. Vertical 9:16 format, cinematic, no text or words in image.';

    const resolvedModel = image_model || (loraConfigs.length > 0 ? 'fal_flux' : undefined);

    console.log(`[preview-image] Generating preview image (model: ${resolvedModel || 'default'})`);
    const imageUrl = await generateImage(fullPrompt, '9:16', keys, supabase, resolvedModel, loraConfigs);

    return res.json({ image_url: imageUrl });
  } catch (err) {
    console.error('[preview-image] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
