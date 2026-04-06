/**
 * POST /api/jumpstart/generate-multishot
 *
 * Multi-shot video generation for JumpStart.
 * Accepts JSON body with per-shot prompts and durations.
 *
 * Native multi-shot: Kling V3/O3 (model handles shot composition)
 * R2V multi-shot: Kling O3 R2V (elements + multi_prompt)
 * Fallback: Any other model — individual clips assembled via FFmpeg
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { animateMultiShot, animateMultiShotR2V, assembleMultiShotFallback } from '../lib/mediaGenerator.js';
import { isMultiShotCapable, isMultiShotR2VCapable } from '../lib/modelRegistry.js';
import { logCost } from '../lib/costLogger.js';

// Map frontend model IDs to registry keys
const MODEL_MAP = {
  'kling-v3': 'fal_kling_v3',
  'kling-o3': 'fal_kling_o3',
  'kling-r2v-pro': 'fal_kling_o3',
  'kling-r2v-standard': 'fal_kling_o3',
  'veo3-fast': 'fal_veo3',
  'veo3-lite': 'fal_veo3_lite',
  'grok-imagine': 'fal_grok_video',
  'wavespeed-wan': 'wavespeed_wan',
  'kling-video': 'fal_kling',
};

// R2V model IDs — use R2V multi-shot when elements are provided
const R2V_MODELS = new Set(['kling-r2v-pro', 'kling-r2v-standard']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const {
    startImageUrl,
    model = 'kling-v3',
    shots,      // [{ prompt, duration }]
    aspectRatio = '16:9',
    enableAudio = false,
    r2vElements,     // [{ frontal_image_url, reference_image_urls }]
    referenceImages, // [url, ...]
  } = req.body;

  // ── Validation ────────────────────────────────────────────────
  if (!shots || !Array.isArray(shots)) {
    return res.status(400).json({ error: 'shots array is required' });
  }
  if (shots.length < 2) {
    return res.status(400).json({ error: 'Multi-shot requires at least 2 shots' });
  }
  if (shots.length > 6) {
    return res.status(400).json({ error: 'Multi-shot supports a maximum of 6 shots' });
  }
  if (shots.some(s => !s.prompt?.trim())) {
    return res.status(400).json({ error: 'All shots require a prompt' });
  }

  const totalDuration = shots.reduce((sum, s) => sum + (Number(s.duration) || 3), 0);
  if (totalDuration > 15) {
    return res.status(400).json({ error: `Total duration (${totalDuration}s) exceeds 15s maximum` });
  }

  const registryKey = MODEL_MAP[model];
  if (!registryKey) {
    return res.status(400).json({ error: `Unknown model: ${model}` });
  }

  // ── Setup ─────────────────────────────────────────────────────
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const keys = await getUserKeys(req.user.id, req.user.email, supabase);

  const multiPrompt = shots.map(s => ({
    prompt: s.prompt.trim(),
    duration: String(Math.max(1, Math.min(15, Math.round(Number(s.duration) || 3)))),
  }));

  try {
    let videoUrl;
    const isR2V = R2V_MODELS.has(model) && r2vElements?.length;

    if (isR2V && isMultiShotR2VCapable(registryKey)) {
      // Native R2V multi-shot (O3 R2V endpoint with elements + multi_prompt)
      console.log(`[jumpstart-multishot] R2V native: ${model} (${shots.length} shots, ${totalDuration}s)`);
      videoUrl = await animateMultiShotR2V(
        registryKey, startImageUrl || null, multiPrompt, totalDuration,
        aspectRatio, keys, supabase,
        {
          generate_audio: enableAudio,
          elements: r2vElements,
          image_urls: referenceImages,
        },
      );
    } else if (isMultiShotCapable(registryKey)) {
      // Native I2V multi-shot (Kling V3/O3)
      console.log(`[jumpstart-multishot] I2V native: ${model} (${shots.length} shots, ${totalDuration}s)`);
      videoUrl = await animateMultiShot(
        registryKey, startImageUrl || null, multiPrompt, totalDuration,
        aspectRatio, keys, supabase,
        { generate_audio: enableAudio },
      );
    } else {
      // Fallback: generate individual clips + FFmpeg concat
      console.log(`[jumpstart-multishot] Fallback: ${model} (${shots.length} shots, ${totalDuration}s)`);
      videoUrl = await assembleMultiShotFallback(
        registryKey, startImageUrl, multiPrompt, aspectRatio, keys, supabase,
        { generate_audio: enableAudio },
      );
    }

    logCost({
      username: req.user.email,
      category: 'fal',
      operation: 'jumpstart_multishot',
      model,
      metadata: { scene_count: shots.length, total_duration: totalDuration, native: isR2V || isMultiShotCapable(registryKey) },
    });

    return res.json({
      status: 'completed',
      videoUrl,
      totalDuration,
      sceneCount: shots.length,
    });
  } catch (err) {
    console.error(`[jumpstart-multishot] Error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
