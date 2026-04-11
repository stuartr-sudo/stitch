import { pollFalQueue, uploadUrlToSupabase } from './pipelineHelpers.js';
import { logCost } from './costLogger.js';

export const MOTION_TRANSFER_MODELS = {
  wan_motion: {
    provider: 'fal',
    label: 'WAN 2.2 Motion Transfer',
    description: 'Budget motion transfer, good for simple animations',
    endpoint: 'fal-ai/wan/v2.2-14b/animate/move',
    maxDuration: null,
    supportsOrientation: false,
    supportsElements: false,
    supportsKeepAudio: false,
    buildBody: (imageUrl, videoUrl, opts = {}) => ({
      image_url: imageUrl,
      video_url: videoUrl,
      prompt: opts.prompt || '',
      negative_prompt: opts.negative_prompt || '',
      resolution: '1K',
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 3000 },
  },
  kling_motion_control: {
    provider: 'fal',
    label: 'Kling V3 Pro Motion Control',
    description: 'Premium motion transfer with orientation control and facial binding',
    endpoint: 'fal-ai/kling-video/v3/pro/motion-control',
    maxDuration: { image: 10, video: 30 },
    supportsOrientation: true,
    supportsElements: true,
    supportsKeepAudio: true,
    buildBody: (imageUrl, videoUrl, opts = {}) => ({
      image_url: imageUrl,
      video_url: videoUrl,
      character_orientation: opts.character_orientation || 'image',
      prompt: opts.prompt || undefined,
      keep_original_sound: opts.keep_original_sound ?? true,
      ...(opts.elements?.length ? { elements: opts.elements } : {}),
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
};

export function getMotionTransferModel(key) {
  return MOTION_TRANSFER_MODELS[key] || null;
}

export function listMotionTransferModels() {
  return Object.entries(MOTION_TRANSFER_MODELS).map(([key, m]) => ({
    id: key, label: m.label, description: m.description,
    supportsOrientation: m.supportsOrientation,
    supportsElements: m.supportsElements,
    supportsKeepAudio: m.supportsKeepAudio,
    maxDuration: m.maxDuration,
  }));
}

/**
 * Submit a motion transfer job, poll until complete, upload to Supabase.
 * Returns { videoUrl } with a permanent Supabase URL.
 */
export async function generateMotionTransfer(modelKey, imageUrl, videoUrl, opts, falKey, supabase) {
  const model = MOTION_TRANSFER_MODELS[modelKey];
  if (!model) throw new Error(`Unknown motion transfer model: ${modelKey}`);

  const body = model.buildBody(imageUrl, videoUrl, opts);

  // Submit to FAL queue
  const submitRes = await fetch(`https://queue.fal.run/${model.endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    console.error(`[MotionTransfer] Submit error (${modelKey}):`, errText.substring(0, 300));
    throw new Error(`Motion transfer submit failed: ${submitRes.status}`);
  }

  const { request_id } = await submitRes.json();

  // Poll for completion using full endpoint path
  const result = await pollFalQueue(
    request_id,
    model.endpoint,
    falKey,
    model.pollConfig.maxRetries,
    model.pollConfig.delayMs,
  );

  const rawUrl = model.parseResult(result);
  if (!rawUrl) throw new Error('Motion transfer produced no video');

  // Upload to Supabase to avoid FAL CDN expiry
  const permanentUrl = await uploadUrlToSupabase(rawUrl, supabase, 'pipeline/motion-transfer');

  return { videoUrl: permanentUrl };
}
