import { IMAGE_MODELS, VIDEO_MODELS } from './modelRegistry.js';
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
