import sharp from 'sharp';
import { IMAGE_MODELS, VIDEO_MODELS, veoDuration } from './modelRegistry.js';
import { pollFalQueue, pollWavespeedRequest, uploadUrlToSupabase, extractLastFrame } from './pipelineHelpers.js';

// FAL/Wavespeed reject files > 10MB (10485760 bytes). Use 9MB threshold for safety margin.
const MAX_IMAGE_BYTES = 9 * 1024 * 1024;
// Images under 1MB are likely too small for quality video generation
const MIN_IMAGE_BYTES = 1 * 1024 * 1024;
// Minimum longest-side dimension for video model input
const MIN_DIMENSION = 1280;

/**
 * Standardize image dimensions for video generation.
 * - Too large (>9MB): downscale to 1920px max, JPEG 85%
 * - Too small (<1MB or longest side <1280px): upscale to 1280px min
 * Called automatically before ALL video generation.
 */
async function standardizeImageForVideo(imageUrl, supabase) {
  try {
    const headRes = await fetch(imageUrl, { method: 'HEAD' });
    const size = parseInt(headRes.headers.get('content-length') || '0', 10);

    const needsDownscale = size > MAX_IMAGE_BYTES;
    const mightNeedUpscale = size > 0 && size < MIN_IMAGE_BYTES;

    // If file size is in the acceptable range, check dimensions to be sure
    if (!needsDownscale && !mightNeedUpscale) return imageUrl;
    if (size === 0) return imageUrl; // can't determine size, pass through

    // Download image to inspect and potentially resize
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const metadata = await sharp(buffer).metadata();
    const longestSide = Math.max(metadata.width || 0, metadata.height || 0);

    if (needsDownscale) {
      console.log(`[mediaGenerator] Image ${size} bytes / ${metadata.width}×${metadata.height} exceeds limit, downscaling...`);
      const resized = await sharp(buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      console.log(`[mediaGenerator] Downscaled: ${size} → ${resized.length} bytes`);
      return await uploadResized(resized, supabase, imageUrl);
    }

    if (longestSide < MIN_DIMENSION) {
      console.log(`[mediaGenerator] Image ${metadata.width}×${metadata.height} (${size} bytes) too small, upscaling to ${MIN_DIMENSION}px...`);
      const resized = await sharp(buffer)
        .resize(MIN_DIMENSION, MIN_DIMENSION, { fit: 'inside', withoutEnlargement: false })
        .png()
        .toBuffer();
      console.log(`[mediaGenerator] Upscaled: ${metadata.width}×${metadata.height} → ${MIN_DIMENSION}px, ${resized.length} bytes`);
      return await uploadResized(resized, supabase, imageUrl, 'image/png', 'png');
    }

    // File was small but dimensions are fine — pass through
    return imageUrl;
  } catch (err) {
    console.error('[mediaGenerator] Image standardize error:', err.message);
    return imageUrl; // fallback to original
  }
}

async function uploadResized(buffer, supabase, fallbackUrl, contentType = 'image/jpeg', ext = 'jpg') {
  if (!supabase) return fallbackUrl;

  const filename = `temp/resized-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('media')
    .upload(filename, buffer, { contentType, upsert: true });

  if (uploadErr) {
    console.error('[mediaGenerator] Resized upload failed:', uploadErr.message);
    return fallbackUrl;
  }

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filename);
  console.log(`[mediaGenerator] Standardized image uploaded: ${publicUrl}`);
  return publicUrl;
}

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

  // Ensure image is under provider size limit before sending
  const safeImageUrl = await standardizeImageForVideo(imageUrl, supabase);

  const body = model.buildBody(safeImageUrl, motionPrompt, durationSeconds, aspectRatio, opts);

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
 * Multi-shot video generation via Kling V3/O3.
 * Sends an array of scene prompts with individual durations as a single API call.
 * Returns a single video with all shots composited by the model.
 *
 * @param {string} modelKey - Registry key (fal_kling_v3 or fal_kling_o3)
 * @param {string|null} imageUrl - Optional start frame image
 * @param {Array<{prompt: string, duration: string}>} multiPrompt - Per-shot prompts + durations
 * @param {number} totalDuration - Total video duration in seconds
 * @param {string} aspectRatio - e.g. '9:16'
 * @param {object} keys - API keys
 * @param {object} supabase - Supabase client
 * @param {object} opts - Extra options (generate_audio, shot_type)
 */
export async function animateMultiShot(modelKey, imageUrl, multiPrompt, totalDuration, aspectRatio, keys, supabase, opts = {}) {
  const model = VIDEO_MODELS[modelKey];
  if (!model) throw new MediaGenerationError(modelKey, 'video', `Unknown model: ${modelKey}`);
  if (!model.buildMultiShotBody) throw new MediaGenerationError(modelKey, 'video', `Model ${modelKey} does not support multi-shot`);

  const provider = PROVIDER_CONFIG[model.provider];
  if (!provider) throw new MediaGenerationError(modelKey, 'video', `Unknown provider: ${model.provider}`);

  const safeImageUrl = imageUrl ? await standardizeImageForVideo(imageUrl, supabase) : undefined;

  const body = model.buildMultiShotBody(safeImageUrl, multiPrompt, totalDuration, aspectRatio, opts);

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
  // Ensure reference image is under provider size limit before sending
  const safeRefUrl = await standardizeImageForVideo(referenceImageUrl, supabase);
  let body;

  if (r2vEndpoint.includes('veo3')) {
    body = {
      image_url: safeRefUrl,
      prompt,
      duration: veoDuration(duration),
      aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
      generate_audio: false,
    };
  } else if (r2vEndpoint.includes('grok-imagine')) {
    body = {
      reference_image_urls: [safeRefUrl],
      prompt,
      duration: Math.max(1, Math.min(10, Math.round(duration))),
      aspect_ratio: aspectRatio,
      generate_audio: false,
    };
  } else if (r2vEndpoint.includes('kling-video')) {
    body = {
      prompt: `@Element1 ${prompt}`,
      elements: [{
        frontal_image_url: safeRefUrl,
        reference_image_urls: [safeRefUrl],
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

/**
 * Multi-shot R2V: elements + image_urls + multi_prompt on the R2V endpoint.
 * Only O3 supports this (via buildMultiShotR2VBody + r2vEndpoint).
 * Auto-injects @Element refs into per-shot prompts when elements are present.
 */
export async function animateMultiShotR2V(modelKey, startImageUrl, multiPrompt, totalDuration, aspectRatio, keys, supabase, opts = {}) {
  const model = VIDEO_MODELS[modelKey];
  if (!model) throw new MediaGenerationError(modelKey, 'video', `Unknown model: ${modelKey}`);
  if (!model.buildMultiShotR2VBody) throw new MediaGenerationError(modelKey, 'video', `Model ${modelKey} does not support multi-shot R2V`);
  if (!model.r2vEndpoint) throw new MediaGenerationError(modelKey, 'video', `Model ${modelKey} has no R2V endpoint`);

  const provider = PROVIDER_CONFIG[model.provider];
  if (!provider) throw new MediaGenerationError(modelKey, 'video', `Unknown provider: ${model.provider}`);

  const safeStartImage = startImageUrl ? await standardizeImageForVideo(startImageUrl, supabase) : undefined;

  // Inject @Element references into per-shot prompts if elements provided but not already referenced
  const finalMultiPrompt = multiPrompt.map(shot => {
    let prompt = shot.prompt;
    if (opts.elements?.length && !prompt.includes('@Element')) {
      const elementRefs = opts.elements.map((_, idx) => `@Element${idx + 1}`).join(' ');
      prompt = `${elementRefs} ${prompt}`;
    }
    return { prompt, duration: shot.duration };
  });

  const body = model.buildMultiShotR2VBody(safeStartImage, finalMultiPrompt, totalDuration, aspectRatio, opts);

  const res = await fetch(`${provider.baseUrl}/${model.r2vEndpoint}`, {
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
  if (!url) throw new MediaGenerationError(modelKey, 'video', 'No URL in R2V multi-shot response');
  return uploadUrlToSupabase(url, supabase, 'pipeline/videos');
}

/**
 * Fallback multi-shot for models that don't support native multi_prompt.
 * Generates individual clips per shot via animateImageV2, chains last frames,
 * then concatenates sequentially via FAL FFmpeg compose.
 */
export async function assembleMultiShotFallback(modelKey, imageUrl, multiPrompt, aspectRatio, keys, supabase, opts = {}) {
  const clips = [];
  let currentImage = imageUrl;

  for (let i = 0; i < multiPrompt.length; i++) {
    const shot = multiPrompt[i];
    const duration = Number(shot.duration) || 3;

    console.log(`[multishot-fallback] Generating shot ${i + 1}/${multiPrompt.length} (${duration}s)`);
    const clipUrl = await animateImageV2(
      modelKey, currentImage, shot.prompt, aspectRatio, duration, keys, supabase,
      { generate_audio: opts.generate_audio || false },
    );
    clips.push({ url: clipUrl, duration });

    // Extract last frame for next shot's start image (continuity)
    if (i < multiPrompt.length - 1) {
      try {
        const lastFrame = await extractLastFrame(clipUrl, duration, keys.falKey);
        if (lastFrame) currentImage = await uploadUrlToSupabase(lastFrame, supabase, 'pipeline/storyboard');
      } catch (err) {
        console.warn(`[multishot-fallback] Last frame extraction failed for shot ${i + 1}, reusing previous image`);
      }
    }
  }

  if (clips.length === 1) return clips[0].url;

  // Concatenate clips sequentially via FAL FFmpeg compose
  const keyframes = [];
  let timestamp = 0;
  for (const clip of clips) {
    keyframes.push({ url: clip.url, timestamp: Math.round(timestamp), duration: Math.round(clip.duration * 1000) });
    timestamp += clip.duration * 1000;
  }

  const composeBody = {
    tracks: [{ id: 'video', type: 'video', keyframes }],
    duration: Math.round(timestamp),
  };

  const composeRes = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/compose', {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(composeBody),
  });

  if (!composeRes.ok) throw new MediaGenerationError(modelKey, 'video', `FFmpeg compose failed: ${await composeRes.text()}`);
  const composeQueue = await composeRes.json();
  const output = await pollFalQueue(composeQueue.response_url, 'fal-ai/ffmpeg-api/compose', keys.falKey, 120, 3000);
  const finalUrl = output?.video_url || output?.video?.url || output?.output_url;
  if (!finalUrl) throw new MediaGenerationError(modelKey, 'video', 'No URL from FFmpeg compose');
  return uploadUrlToSupabase(finalUrl, supabase, 'pipeline/finals');
}
