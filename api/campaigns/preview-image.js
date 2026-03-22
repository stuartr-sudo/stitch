/**
 * POST /api/campaigns/preview-image
 *
 * Generate a preview image for scene 1 of a short (1080x1920 for YouTube Shorts).
 * Returns the image URL so the user can approve before running the full pipeline.
 * Uses Wavespeed with short timeout, falls back to FAL.
 */

import { createClient } from '@supabase/supabase-js';
import { getVisualStyleSuffix } from '../lib/visualStyles.js';
import { getVideoStylePrompt } from '../lib/videoStylePresets.js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';

const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';
const FAL_BASE = 'https://queue.fal.run';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function generatePreviewWavespeed(prompt, wavespeedKey) {
  const res = await fetch(`${WAVESPEED_BASE}/wavespeed-ai/flux-dev/text-to-image`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${wavespeedKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, size: '1080*1920', num_images: 1 }),
  });
  if (!res.ok) throw new Error(`Wavespeed failed: ${await res.text()}`);
  const data = await res.json();

  let imageUrl = data.outputs?.[0] || data.data?.outputs?.[0];
  if (imageUrl) return imageUrl;

  const requestId = data.id || data.data?.id;
  if (!requestId) throw new Error('No request ID from Wavespeed');

  // Poll with 45s max (stay under Fly.io 60s timeout)
  for (let i = 0; i < 15; i++) {
    await sleep(3000);
    const pollRes = await fetch(`${WAVESPEED_BASE}/predictions/${requestId}`, {
      headers: { 'Authorization': `Bearer ${wavespeedKey}` },
    });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    const status = pollData.status || pollData.data?.status;
    const outputs = pollData.outputs || pollData.data?.outputs;
    if (status === 'completed' && outputs?.[0]) return outputs[0];
    if (status === 'failed') throw new Error('Wavespeed generation failed');
  }
  throw new Error('Wavespeed timeout');
}

async function generatePreviewFal(prompt, falKey) {
  const res = await fetch(`${FAL_BASE}/fal-ai/flux/schnell`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: { width: 1080, height: 1920 }, num_images: 1 }),
  });
  if (!res.ok) throw new Error(`FAL failed: ${await res.text()}`);
  const queueData = await res.json();

  // If direct result
  if (queueData.images?.[0]?.url) return queueData.images[0].url;

  // Poll
  const requestId = queueData.request_id;
  for (let i = 0; i < 20; i++) {
    await sleep(2000);
    const pollRes = await fetch(`${FAL_BASE}/fal-ai/flux/schnell/requests/${requestId}`, {
      headers: { 'Authorization': `Key ${falKey}` },
    });
    if (!pollRes.ok) continue;
    const pollData = await pollRes.json();
    if (pollData.images?.[0]?.url) return pollData.images[0].url;
    if (pollData.status === 'FAILED') throw new Error('FAL generation failed');
  }
  throw new Error('FAL timeout');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { visual_prompt, visual_style, video_style, lora_config, brand_username } = req.body;
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

  const falKey = userKeys?.fal_key || process.env.FAL_KEY;
  const wavespeedKey = userKeys?.wavespeed_key || process.env.WAVESPEED_KEY || process.env.WAVESPEED_API_KEY;

  if (!falKey && !wavespeedKey) {
    return res.status(400).json({ error: 'Image generation API key required' });
  }

  const visualSuffix = getVisualStyleSuffix(visual_style) || '';
  const videoStylePrompt = getVideoStylePrompt(video_style) || '';
  const loraConfigs = lora_config || [];
  const triggerPrefix = loraConfigs.map(c => c.triggerWord).filter(Boolean).join(', ');
  const basePrompt = [triggerPrefix, visual_prompt].filter(Boolean).join(', ');
  const styleParts = [visualSuffix, videoStylePrompt].filter(Boolean).join(', ');
  const fullPrompt = basePrompt + (styleParts ? `, ${styleParts}` : '') + '. Vertical 9:16 format for YouTube Shorts, 1080x1920, no text or words in image.';

  console.log(`[preview-image] Generating 1080x1920 preview — prompt: ${fullPrompt.slice(0, 200)}...`);

  // Try Wavespeed first (fast), fall back to FAL
  try {
    if (wavespeedKey) {
      const url = await generatePreviewWavespeed(fullPrompt, wavespeedKey);
      console.log(`[preview-image] Wavespeed success`);
      return res.json({ image_url: url });
    }
  } catch (err) {
    console.warn(`[preview-image] Wavespeed failed: ${err.message}, trying FAL`);
  }

  try {
    if (falKey) {
      const url = await generatePreviewFal(fullPrompt, falKey);
      console.log(`[preview-image] FAL success`);
      return res.json({ image_url: url });
    }
  } catch (err) {
    console.error(`[preview-image] FAL also failed: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }

  return res.status(500).json({ error: 'All image generation providers failed' });
}
