import { IMAGE_MODELS, VIDEO_MODELS, veoDuration } from './modelRegistry.js';
import { pollFalQueue, pollWavespeedRequest, uploadUrlToSupabase } from './pipelineHelpers.js';

export class MediaGenerationError extends Error {
  constructor(model, type, detail) {
    super(`${type} generation failed [${model}]: ${detail}`);
    this.model = model;
    this.type = type;
    this.detail = detail;
  }
}

const PROVIDER_CONFIG = {
  fal: {
    baseUrl: 'https://queue.fal.run',
    buildHeaders: (keys) => ({
      'Authorization': `Key ${keys.falKey}`,
      'Content-Type': 'application/json',
    }),
    async poll(queueData, model, keys, pollConfig) {
      const pollTarget = queueData.response_url || queueData.request_id;
      return pollFalQueue(pollTarget, model.endpoint, keys.falKey, pollConfig.maxRetries, pollConfig.delayMs);
    },
  },
  wavespeed: {
    baseUrl: 'https://api.wavespeed.ai/api/v3',
    buildHeaders: (keys) => ({
      'Authorization': `Bearer ${keys.wavespeedKey}`,
      'Content-Type': 'application/json',
    }),
    async poll(queueData, model, keys, pollConfig) {
      const requestId = model.parseRequestId?.(queueData) || queueData.id || queueData.data?.id;
      if (!requestId) throw new Error('No request ID from Wavespeed');
      // pollWavespeedRequest returns a raw URL string — wrap it so parseResult() works
      const rawUrl = await pollWavespeedRequest(requestId, keys.wavespeedKey, pollConfig.maxRetries, pollConfig.delayMs);
      return { outputs: [rawUrl], data: { outputs: [rawUrl] } };
    },
  },
};

export async function generateImageV2(modelKey, prompt, aspectRatio, keys, supabase, opts = {}) {
  const model = IMAGE_MODELS[modelKey];
  if (!model) throw new MediaGenerationError(modelKey, 'image', `Unknown model: ${modelKey}`);

  const provider = PROVIDER_CONFIG[model.provider];
  if (!provider) throw new MediaGenerationError(modelKey, 'image', `Unknown provider: ${model.provider}`);

  const size = model.sizeMap?.[aspectRatio] || aspectRatio;
  const body = model.buildBody(prompt, size, { ...opts, originalAspectRatio: aspectRatio });

  const res = await fetch(`${provider.baseUrl}/${model.endpoint}`, {
    method: 'POST',
    headers: provider.buildHeaders(keys),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new MediaGenerationError(modelKey, 'image', errText);
  }

  const queueData = await res.json();

  // Some models return results directly (no polling needed)
  const directResult = model.parseResult(queueData);
  if (directResult) return uploadUrlToSupabase(directResult, supabase, 'pipeline/images');

  // Poll for result
  const output = await provider.poll(queueData, model, keys, model.pollConfig);
  const url = model.parseResult(output);
  if (!url) throw new MediaGenerationError(modelKey, 'image', 'No URL in response');
  return uploadUrlToSupabase(url, supabase, 'pipeline/images');
}

export async function animateImageV2(modelKey, imageUrl, motionPrompt, aspectRatio, durationSeconds, keys, supabase, opts = {}) {
  const model = VIDEO_MODELS[modelKey];
  if (!model) throw new MediaGenerationError(modelKey, 'video', `Unknown model: ${modelKey}`);

  const provider = PROVIDER_CONFIG[model.provider];
  if (!provider) throw new MediaGenerationError(modelKey, 'video', `Unknown provider: ${model.provider}`);

  const body = model.buildBody(imageUrl, motionPrompt, durationSeconds, aspectRatio, opts);

  const res = await fetch(`${provider.baseUrl}/${model.endpoint}`, {
    method: 'POST',
    headers: provider.buildHeaders(keys),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new MediaGenerationError(modelKey, 'video', errText);
  }

  const queueData = await res.json();

  const directResult = model.parseResult(queueData);
  if (directResult) return uploadUrlToSupabase(directResult, supabase, 'pipeline/videos');

  const output = await provider.poll(queueData, model, keys, model.pollConfig);
  const url = model.parseResult(output);
  if (!url) throw new MediaGenerationError(modelKey, 'video', 'No URL in response');
  return uploadUrlToSupabase(url, supabase, 'pipeline/videos');
}

/**
 * Generate video from reference image via R2V endpoint.
 * Three providers with different body shapes.
 */
export async function animateImageR2V(r2vEndpoint, referenceImageUrl, prompt, aspectRatio, duration, keys, supabase) {
  let body;

  if (r2vEndpoint.includes('veo3')) {
    body = {
      image_url: referenceImageUrl,
      prompt,
      duration: veoDuration(duration),
      aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
      generate_audio: false,
    };
  } else if (r2vEndpoint.includes('grok-imagine')) {
    body = {
      reference_image_urls: [referenceImageUrl],
      prompt,
      duration: Math.max(1, Math.min(10, Math.round(duration))),
      aspect_ratio: aspectRatio,
      generate_audio: false,
    };
  } else if (r2vEndpoint.includes('kling-video')) {
    body = {
      prompt: `@Element1 ${prompt}`,
      elements: [{
        frontal_image_url: referenceImageUrl,
        reference_image_urls: [referenceImageUrl],
      }],
      duration: String(Math.max(3, Math.min(15, Math.round(duration)))),
      aspect_ratio: aspectRatio,
    };
  } else {
    throw new MediaGenerationError(r2vEndpoint, 'video', `Unknown R2V endpoint: ${r2vEndpoint}`);
  }

  const res = await fetch(`https://queue.fal.run/${r2vEndpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${keys.falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new MediaGenerationError(r2vEndpoint, 'video', errText);
  }

  const queueData = await res.json();

  // Check for direct result
  const videoUrl = queueData.video?.url;
  if (videoUrl) return uploadUrlToSupabase(videoUrl, supabase, 'pipeline/finals');

  // Poll for result
  const output = await pollFalQueue(
    queueData.response_url || queueData.request_id,
    r2vEndpoint,
    keys.falKey,
    150,
    4000,
  );
  const resultUrl = output?.video?.url || output?.output?.url;
  if (!resultUrl) throw new MediaGenerationError(r2vEndpoint, 'video', 'No URL in R2V response');

  return uploadUrlToSupabase(resultUrl, supabase, 'pipeline/finals');
}
