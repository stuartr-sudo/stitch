/**
 * Storyboard Lipsync Processor
 *
 * Applies audio-driven lip synchronization to generated video scenes.
 * This is a POST-PRODUCTION step — it runs AFTER video generation and
 * voiceover generation are both complete.
 *
 * Pipeline position:
 *   Video generation → Voiceover TTS → Lipsync (this) → Assembly
 *
 * Supported providers via FAL.ai:
 *
 *   Kling LipSync   — Best for cartoon/animated characters (Movin Martin)
 *                     $0.014/5s, supports stylized characters, animals, illustrations
 *                     Endpoint: fal-ai/kling-video/lipsync/audio-to-video
 *
 *   Sync Lipsync 2.0 — Best for realistic/live-action faces
 *                      $3/min, preserves speaking style, zero-shot
 *                      Endpoint: fal-ai/sync-lipsync/v2
 *
 *   Sync Lipsync 2.0 Pro — Premium tier for close-up shots
 *                          $5/min, enhanced facial detail
 *                          Endpoint: fal-ai/sync-lipsync/v2/pro
 *
 *   LatentSync      — Budget fallback, works with anime/cartoon
 *                     $0.20/40s, ByteDance, open source
 *                     Endpoint: fal-ai/latentsync
 *
 *   Kling AI Avatar Pro — Full avatar animation from image + audio
 *                         Supports humans, animals, cartoons
 *                         Endpoint: fal-ai/kling-video/avatar/pro
 *
 * Selection guide:
 *   - Animated character (2D/3D cartoon) → Kling LipSync or Kling Avatar Pro
 *   - Realistic human face → Sync Lipsync 2.0
 *   - Close-up talking head → Sync Lipsync 2.0 Pro
 *   - Budget/draft → LatentSync
 *   - No face visible → Skip lipsync, just mix audio in assembly
 */

import { pollFalQueue, uploadUrlToSupabase } from './pipelineHelpers.js';

const FAL_BASE = 'https://queue.fal.run';

// ── Lipsync Model Registry ──────────────────────────────────────────────────

export const LIPSYNC_MODELS = {
  'kling-lipsync': {
    label: 'Kling LipSync',
    description: 'Best for cartoon & animated characters — supports stylized art',
    endpoint: 'fal-ai/kling-video/lipsync/audio-to-video',
    costDescription: '$0.014 per 5-second increment',
    bestFor: ['cartoon', 'animated', '3D', 'stylized', 'animal_character'],
    inputType: 'video+audio',
    maxDuration: 60,      // seconds of audio
    minVideoDuration: 2,  // seconds
    maxVideoDuration: 10, // seconds
    processingTime: '~12 minutes',
  },
  'sync-lipsync-2': {
    label: 'Sync Lipsync 2.0',
    description: 'Best for realistic faces — preserves speaking style',
    endpoint: 'fal-ai/sync-lipsync/v2',
    costDescription: '$3 per minute of video',
    bestFor: ['realistic', 'live_action', 'photorealistic', 'AI_generated_human'],
    inputType: 'video+audio',
    maxDuration: null,    // no stated limit
    processingTime: '1-3 minutes',
  },
  'sync-lipsync-2-pro': {
    label: 'Sync Lipsync 2.0 Pro',
    description: 'Premium tier for close-up shots — enhanced facial detail',
    endpoint: 'fal-ai/sync-lipsync/v2/pro',
    costDescription: '$5 per minute of video',
    bestFor: ['close_up', 'commercial', 'high_stakes'],
    inputType: 'video+audio',
    maxDuration: null,
    processingTime: '2-5 minutes',
  },
  'latentsync': {
    label: 'LatentSync (ByteDance)',
    description: 'Budget option — works with anime & cartoon, open source',
    endpoint: 'fal-ai/latentsync',
    costDescription: '$0.20 per 40 seconds',
    bestFor: ['budget', 'anime', 'draft', 'batch'],
    inputType: 'video+audio',
    maxDuration: 40,
    processingTime: '2-5 minutes',
  },
  'kling-avatar': {
    label: 'Kling AI Avatar Pro',
    description: 'Full avatar animation from single image + audio',
    endpoint: 'fal-ai/kling-video/avatar/pro',
    costDescription: '$0.014 per 5-second increment',
    bestFor: ['avatar', 'talking_head', 'image_to_talking_video', 'character_animation'],
    inputType: 'image+audio', // Different — takes IMAGE, not video
    maxDuration: 60,
    processingTime: '~12 minutes',
  },
};

// ── Smart Model Selection ───────────────────────────────────────────────────

/**
 * Recommend the best lipsync model based on content type and budget.
 *
 * @param {object} options
 * @param {string} options.contentType - 'cartoon'|'realistic'|'anime'|'3d'|'mixed'
 * @param {boolean} options.isCloseUp - Whether scene is a close-up shot
 * @param {boolean} options.budgetMode - Prefer cheapest option
 * @param {boolean} options.hasVideoAlready - Whether video exists (vs generating from image)
 * @returns {string} Recommended model key from LIPSYNC_MODELS
 */
export function recommendLipsyncModel(options = {}) {
  const { contentType = 'realistic', isCloseUp = false, budgetMode = false, hasVideoAlready = true } = options;

  // If we only have an image (no video yet), use avatar mode
  if (!hasVideoAlready) {
    return 'kling-avatar';
  }

  // Budget mode — cheapest option that works
  if (budgetMode) {
    return contentType === 'realistic' ? 'latentsync' : 'kling-lipsync';
  }

  // Cartoon / animated / 3D / animal characters → Kling
  if (['cartoon', 'animated', '3d', 'stylized', 'anime'].includes(contentType)) {
    return 'kling-lipsync';
  }

  // Realistic close-up → Pro tier
  if (contentType === 'realistic' && isCloseUp) {
    return 'sync-lipsync-2-pro';
  }

  // Realistic standard → Sync 2.0
  if (contentType === 'realistic') {
    return 'sync-lipsync-2';
  }

  // Default
  return 'kling-lipsync';
}

// ── Core Lipsync Application ────────────────────────────────────────────────

/**
 * Apply lipsync to a video scene using the specified model.
 *
 * @param {object} params
 * @param {string} params.videoUrl - URL of the generated video clip
 * @param {string} params.audioUrl - URL of the voiceover audio for this scene
 * @param {string} params.imageUrl - URL of the source image (for avatar mode only)
 * @param {string} params.model - Lipsync model key
 * @param {string} params.falKey - FAL API key
 * @param {object} params.supabase - Supabase client for upload
 * @param {object} params.syncOptions - Model-specific options
 * @returns {Promise<{ videoUrl, model, processingTime }>}
 */
export async function applyLipsync(params) {
  const {
    videoUrl,
    audioUrl,
    imageUrl,
    model = 'kling-lipsync',
    falKey,
    supabase,
    syncOptions = {},
  } = params;

  if (!falKey) throw new Error('FAL key required for lipsync');
  if (!audioUrl) throw new Error('Audio URL required for lipsync');

  const modelConfig = LIPSYNC_MODELS[model];
  if (!modelConfig) throw new Error(`Unknown lipsync model: ${model}`);

  // Validate inputs based on model type
  if (modelConfig.inputType === 'image+audio' && !imageUrl) {
    throw new Error(`${model} requires an image URL (avatar mode)`);
  }
  if (modelConfig.inputType === 'video+audio' && !videoUrl) {
    throw new Error(`${model} requires a video URL`);
  }

  console.log(`[Lipsync] Applying ${modelConfig.label} to video...`);
  const startTime = Date.now();

  // Build request body based on model
  let body;
  let endpoint = modelConfig.endpoint;

  switch (model) {
    case 'kling-lipsync':
      body = {
        video_url: videoUrl,
        audio_url: audioUrl,
      };
      break;

    case 'sync-lipsync-2':
    case 'sync-lipsync-2-pro':
      body = {
        video_url: videoUrl,
        audio_url: audioUrl,
        // Sync 2.0 options
        ...(syncOptions.syncMode && { sync_mode: syncOptions.syncMode }), // 'cut_off'|'loop'|'bounce'|'silence'|'remap'
      };
      break;

    case 'latentsync':
      body = {
        video_url: videoUrl,
        audio_url: audioUrl,
      };
      break;

    case 'kling-avatar':
      body = {
        image_url: imageUrl,
        audio_url: audioUrl,
      };
      break;

    default:
      body = { video_url: videoUrl, audio_url: audioUrl };
  }

  const res = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lipsync failed (${model}): ${errText.substring(0, 200)}`);
  }

  const queueData = await res.json();

  // Check for direct result
  let outputUrl = queueData?.video?.url;

  if (!outputUrl) {
    // Poll for result — lipsync can take 2-12 minutes
    const maxRetries = model === 'kling-lipsync' || model === 'kling-avatar' ? 200 : 120;
    const delayMs = model === 'kling-lipsync' || model === 'kling-avatar' ? 5000 : 3000;

    const output = await pollFalQueue(
      queueData.response_url || queueData.request_id,
      endpoint,
      falKey,
      maxRetries,
      delayMs
    );

    outputUrl = output?.video?.url || output?.output?.url;
  }

  if (!outputUrl) throw new Error('Lipsync returned no video URL');

  const processingTime = Math.round((Date.now() - startTime) / 1000);
  console.log(`[Lipsync] Complete: ${processingTime}s processing, ${outputUrl.substring(0, 80)}`);

  // Upload to Supabase
  if (supabase) {
    try {
      outputUrl = await uploadUrlToSupabase(outputUrl, supabase, 'pipeline/lipsync');
    } catch (err) {
      console.warn('[Lipsync] Upload failed, using original URL:', err.message);
    }
  }

  return {
    videoUrl: outputUrl,
    model,
    processingTime,
  };
}

// ── Batch Lipsync (Full Storyboard) ─────────────────────────────────────────

/**
 * Apply lipsync to all scenes that have both video and voiceover audio.
 * Processes sequentially (lipsync is compute-heavy, parallel overloads the queue).
 *
 * @param {object[]} scenes - Array of { sceneNumber, videoUrl, audioUrl, ... }
 * @param {object} options - { model, falKey, supabase, contentType }
 * @returns {Promise<object>} Results with per-scene lipsync URLs
 */
export async function applyStoryboardLipsync(scenes, options = {}) {
  const {
    model: modelOverride,
    contentType = 'cartoon',
    isCloseUp = false,
    budgetMode = false,
    falKey,
    supabase,
  } = options;

  const model = modelOverride || recommendLipsyncModel({ contentType, isCloseUp, budgetMode });
  const results = [];
  let totalProcessingTime = 0;

  console.log(`[Lipsync] Batch: ${scenes.length} scenes, model: ${model}`);

  for (const scene of scenes) {
    // Skip scenes without video or audio
    if (!scene.videoUrl) {
      results.push({ sceneNumber: scene.sceneNumber, skipped: true, reason: 'No video' });
      continue;
    }
    if (!scene.audioUrl) {
      results.push({ sceneNumber: scene.sceneNumber, skipped: true, reason: 'No audio — scene has no dialogue' });
      continue;
    }

    try {
      const result = await applyLipsync({
        videoUrl: scene.videoUrl,
        audioUrl: scene.audioUrl,
        imageUrl: scene.startFrameUrl || null,
        model,
        falKey,
        supabase,
      });

      totalProcessingTime += result.processingTime;
      results.push({
        sceneNumber: scene.sceneNumber,
        lipsyncVideoUrl: result.videoUrl,
        originalVideoUrl: scene.videoUrl,
        model: result.model,
        processingTime: result.processingTime,
        skipped: false,
      });
    } catch (err) {
      console.error(`[Lipsync] Scene ${scene.sceneNumber} failed:`, err.message);
      results.push({
        sceneNumber: scene.sceneNumber,
        lipsyncVideoUrl: null,
        originalVideoUrl: scene.videoUrl,
        error: err.message,
        skipped: false,
      });
    }
  }

  const processed = results.filter(r => r.lipsyncVideoUrl);
  const failed = results.filter(r => r.error);
  const skipped = results.filter(r => r.skipped);

  console.log(`[Lipsync] Batch complete: ${processed.length} processed, ${failed.length} failed, ${skipped.length} skipped, ${totalProcessingTime}s total`);

  return {
    results,
    model,
    stats: {
      processed: processed.length,
      failed: failed.length,
      skipped: skipped.length,
      totalProcessingTime,
    },
  };
}
