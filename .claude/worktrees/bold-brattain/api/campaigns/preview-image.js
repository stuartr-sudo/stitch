/**
 * POST /api/campaigns/preview-image
 *
 * Generate a preview image for scene 1 of a short (9:16 for YouTube Shorts).
 * Returns the image URL so the user can approve before running the full pipeline.
 * Uses the same generateImage() from pipelineHelpers that the storyboard/pipeline uses.
 */

import { createClient } from '@supabase/supabase-js';
import { getVisualStyleSuffix } from '../lib/visualStyles.js';
import { getVideoStylePrompt } from '../lib/videoStylePresets.js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';
import { generateImage } from '../lib/pipelineHelpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { visual_prompt, visual_style, visual_style_prompt, video_style, lora_config, image_model, brand_username } = req.body;
  if (!visual_prompt) return res.status(400).json({ error: 'visual_prompt is required' });

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
    wavespeedKey: userKeys?.wavespeed_key || process.env.WAVESPEED_API_KEY,
  };

  if (!keys.falKey && !keys.wavespeedKey) {
    return res.status(400).json({ error: 'Image generation API key required' });
  }

  // Build prompt — same logic as shortsPipeline
  const visualSuffix = getVisualStyleSuffix(visual_style) || (visual_style_prompt ? `, ${visual_style_prompt}` : '');
  const videoStylePrompt = getVideoStylePrompt(video_style) || '';
  const loraConfigs = lora_config || [];
  const triggerPrefix = loraConfigs.map(c => c.triggerWord).filter(Boolean).join(', ');
  const basePrompt = [triggerPrefix, visual_prompt].filter(Boolean).join(', ');
  const styleParts = [visualSuffix, videoStylePrompt].filter(Boolean).join(', ');
  const fullPrompt = basePrompt + (styleParts ? `, ${styleParts}` : '') + '. Vertical 9:16 format for YouTube Shorts, 1080x1920, no text or words in image.';

  console.log(`[preview-image] model=${image_model || 'default'} prompt: ${fullPrompt.slice(0, 200)}...`);

  try {
    const imageUrl = await generateImage(
      fullPrompt,
      '9:16',
      keys,
      supabase,
      image_model || undefined,
      loraConfigs.length > 0 ? loraConfigs : undefined,
    );
    console.log(`[preview-image] OK: ${imageUrl.slice(0, 100)}`);
    return res.json({ image_url: imageUrl });
  } catch (err) {
    console.error(`[preview-image] Failed: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
}
