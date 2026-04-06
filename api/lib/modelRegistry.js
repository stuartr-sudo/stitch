/**
 * Model Registry — declarative configs for all image and video generation models.
 * Each entry fully describes how to call and parse one model.
 *
 * Verified against FAL.ai API schemas on 2026-03-29.
 */

const DEFAULT_NEGATIVE_PROMPT = 'blurry, distorted, low quality, watermark, text artifacts, extra limbs, deformed, duplicate, cropped';

// Duration format converters per model family
export function veoDuration(seconds) {
  // Veo 3.1 accepts ONLY '4s', '6s', '8s'
  const n = Number(seconds) || 5;
  if (n <= 4) return '4s';
  if (n <= 6) return '6s';
  return '8s';
}

function veo2Duration(seconds) {
  // Veo 2 accepts ONLY '5s', '6s', '7s', '8s' — NO '4s'
  const n = Number(seconds) || 5;
  if (n <= 5) return '5s';
  if (n <= 6) return '6s';
  if (n <= 7) return '7s';
  return '8s';
}

function klingDuration(seconds) {
  // Kling v2 accepts "5" or "10"; v3/O3 accept "3"-"15" (string numbers)
  const n = Number(seconds) || 5;
  return String(n <= 7 ? 5 : 10);
}

function klingV3Duration(seconds) {
  // Kling v3/O3 accept "3" through "15" (string numbers)
  const n = Math.max(3, Math.min(15, Math.round(Number(seconds) || 5)));
  return String(n);
}

function pixverseDuration(seconds) {
  // PixVerse accepts "5" or "8" (string numbers)
  const n = Number(seconds) || 5;
  return String(n <= 6 ? 5 : 8);
}

function wanDuration(seconds) {
  // Wan 2.5 accepts "5" or "10" (string numbers)
  const n = Number(seconds) || 5;
  return String(n <= 7 ? 5 : 10);
}

// ── IMAGE MODELS ──────────────────────────────────────────────────────────────

export const IMAGE_MODELS = {
  fal_flux: {
    provider: 'fal',
    label: 'FLUX 2 (LoRA)',
    endpoint: 'fal-ai/flux-2/lora',
    supportsLora: true,
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9', '2:3': 'portrait_4_3' },
    buildBody: (prompt, size, opts) => ({
      prompt,
      image_size: size,
      num_inference_steps: 28,
      ...(opts.loras?.length && { loras: opts.loras }),
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_klein_4b: {
    provider: 'fal',
    label: 'FLUX.2 Klein 4B (LoRA)',
    endpoint: 'fal-ai/flux-2/klein/4b/base/lora',
    supportsLora: true,
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9', '2:3': 'portrait_4_3' },
    buildBody: (prompt, size, opts) => ({
      prompt,
      image_size: size,
      num_inference_steps: 28,
      guidance_scale: 5,
      ...(opts.loras?.length && { loras: opts.loras }),
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_klein_9b: {
    provider: 'fal',
    label: 'FLUX.2 Klein 9B (LoRA)',
    endpoint: 'fal-ai/flux-2/klein/9b/base/lora',
    supportsLora: true,
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9', '2:3': 'portrait_4_3' },
    buildBody: (prompt, size, opts) => ({
      prompt,
      image_size: size,
      num_inference_steps: 28,
      guidance_scale: 5,
      ...(opts.loras?.length && { loras: opts.loras }),
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_wan22_t2i: {
    provider: 'fal',
    label: 'Wan 2.2 T2I (LoRA)',
    endpoint: 'fal-ai/wan/v2.2-a14b/text-to-image/lora',
    supportsLora: true,
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9', '2:3': 'portrait_4_3' },
    buildBody: (prompt, size, opts) => ({
      prompt,
      image_size: size,
      num_inference_steps: 27,
      guidance_scale: 3.5,
      guidance_scale_2: 4.0,
      ...(opts.loras?.length && { loras: opts.loras }),
    }),
    parseResult: (output) => output?.image?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_seedream: {
    provider: 'fal',
    label: 'SeedDream v4.5',
    endpoint: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size, opts) => ({
      prompt, image_size: size, num_images: 1, enable_safety_checker: true,
      ...(opts.negativePrompt && { negative_prompt: opts.negativePrompt }),
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  // FIX: Imagen 4 uses aspect_ratio, NOT image_size
  fal_imagen4: {
    provider: 'fal',
    label: 'Imagen 4',
    endpoint: 'fal-ai/imagen4/preview/fast',
    buildBody: (prompt, _size, opts) => ({
      prompt, aspect_ratio: opts.originalAspectRatio || '9:16', num_images: 1,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  // FIX: Kling Image uses aspect_ratio, NOT image_size
  fal_kling_img: {
    provider: 'fal',
    label: 'Kling Image v3',
    endpoint: 'fal-ai/kling-image/v3/text-to-image',
    buildBody: (prompt, _size, opts) => ({
      prompt, aspect_ratio: opts.originalAspectRatio || '9:16', negative_prompt: opts.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  // FIX: Grok Imagine uses aspect_ratio, NOT image_size
  fal_grok: {
    provider: 'fal',
    label: 'Grok Imagine',
    endpoint: 'xai/grok-imagine-image',
    buildBody: (prompt, _size, opts) => ({
      prompt, aspect_ratio: opts.originalAspectRatio || '9:16',
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_ideogram: {
    provider: 'fal',
    label: 'Ideogram v2',
    endpoint: 'fal-ai/ideogram/v2',
    buildBody: (prompt, _size, opts) => ({
      prompt, aspect_ratio: opts.originalAspectRatio || '9:16', num_images: 1, negative_prompt: opts.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_nano_banana: {
    provider: 'fal',
    label: 'Nano Banana 2',
    endpoint: 'fal-ai/nano-banana-2',
    buildBody: (prompt, _size, opts) => ({
      prompt, aspect_ratio: opts.originalAspectRatio || '9:16', num_images: 1,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  // FIX: Wavespeed doesn't support num_images on standard endpoint
  wavespeed: {
    provider: 'wavespeed',
    label: 'Wavespeed',
    endpoint: 'google/nano-banana-pro/text-to-image',
    buildBody: (prompt, _size, opts) => ({
      prompt, aspect_ratio: opts.originalAspectRatio || '9:16',
    }),
    parseResult: (output) => output?.outputs?.[0] || output?.data?.outputs?.[0],
    parseRequestId: (data) => data.id || data.data?.id,
    pollConfig: { maxRetries: 60, delayMs: 3000 },
  },
};

// ── VIDEO MODELS ──────────────────────────────────────────────────────────────

export const VIDEO_MODELS = {
  // FIX: Kling v2 uses string number duration "5"/"10", not '4s'/'6s'/'8s'
  fal_kling: {
    provider: 'fal',
    label: 'Kling 2.0 Master',
    endpoint: 'fal-ai/kling-video/v2/master/image-to-video',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: klingDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  // FIX: Kling v3 uses start_image_url (not image_url), string number duration "3"-"15"
  fal_kling_v3: {
    provider: 'fal',
    label: 'Kling V3 Pro',
    endpoint: 'fal-ai/kling-video/v3/pro/image-to-video',
    supportsMultiShot: true,
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts = {}) => ({
      start_image_url: imageUrl, prompt, duration: klingV3Duration(duration), aspect_ratio: aspectRatio,
      generate_audio: opts.generate_audio === true,
    }),
    buildMultiShotBody: (imageUrl, multiPrompt, totalDuration, aspectRatio, opts = {}) => ({
      start_image_url: imageUrl,
      multi_prompt: multiPrompt, // [{ prompt, duration }]
      shot_type: opts.shot_type || 'customize',
      duration: klingV3Duration(totalDuration),
      aspect_ratio: aspectRatio,
      generate_audio: opts.generate_audio === true,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  // FIX: Kling O3 uses string number duration "3"-"15"
  fal_kling_o3: {
    provider: 'fal',
    label: 'Kling O3 Pro',
    endpoint: 'fal-ai/kling-video/o3/pro/image-to-video',
    r2vEndpoint: 'fal-ai/kling-video/o3/pro/reference-to-video',
    supportsMultiShot: true,
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts = {}) => ({
      image_url: imageUrl, prompt, duration: klingV3Duration(duration), aspect_ratio: aspectRatio,
      generate_audio: opts.generate_audio === true,
    }),
    buildMultiShotBody: (imageUrl, multiPrompt, totalDuration, aspectRatio, opts = {}) => ({
      image_url: imageUrl,
      multi_prompt: multiPrompt, // [{ prompt, duration }]
      shot_type: opts.shot_type || 'customize',
      duration: klingV3Duration(totalDuration),
      aspect_ratio: aspectRatio,
      generate_audio: opts.generate_audio === true,
    }),
    // R2V multi-shot: elements + image_urls + multi_prompt on the R2V endpoint
    supportsMultiShotR2V: true,
    buildMultiShotR2VBody: (startImageUrl, multiPrompt, totalDuration, aspectRatio, opts = {}) => ({
      ...(startImageUrl && { start_image_url: startImageUrl }),
      multi_prompt: multiPrompt,
      shot_type: opts.shot_type || 'customize',
      duration: klingV3Duration(totalDuration),
      aspect_ratio: aspectRatio,
      generate_audio: opts.generate_audio === true,
      ...(opts.elements?.length && {
        elements: opts.elements.map(el => ({
          frontal_image_url: el.frontalImageUrl || el.frontal_image_url,
          reference_image_urls: (el.referenceImageUrls || el.reference_image_urls || []).slice(0, 3),
        })),
      }),
      ...(opts.image_urls?.length && { image_urls: opts.image_urls.slice(0, 4) }),
      ...(opts.end_image_url && { end_image_url: opts.end_image_url }),
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  // Veo 2 accepts '5s'-'8s' ONLY — NO '4s'. No generate_audio param.
  fal_veo2: {
    provider: 'fal',
    label: 'Veo 2 (Google)',
    endpoint: 'fal-ai/veo2/image-to-video',
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts = {}) => ({
      image_url: imageUrl, prompt, duration: veo2Duration(duration),
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 150, delayMs: 4000 },
  },
  fal_veo3: {
    provider: 'fal',
    label: 'Veo 3.1 (Google)',
    endpoint: 'fal-ai/veo3.1/fast/image-to-video',
    r2vEndpoint: 'fal-ai/veo3.1/reference-to-video',
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts = {}) => ({
      image_url: imageUrl, prompt, duration: veoDuration(duration),
      aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
      generate_audio: opts.generate_audio === true,
      resolution: '720p',
      safety_tolerance: '6',
      auto_fix: true,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 150, delayMs: 4000 },
  },
  // Veo 3.1 Lite — same as Fast but cheaper (~60% less), adds 'auto' aspect_ratio
  fal_veo3_lite: {
    provider: 'fal',
    label: 'Veo 3.1 Lite (Google)',
    endpoint: 'fal-ai/veo3.1/lite/image-to-video',
    r2vEndpoint: 'fal-ai/veo3.1/reference-to-video',
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts = {}) => ({
      image_url: imageUrl, prompt, duration: veoDuration(duration),
      aspect_ratio: aspectRatio === '9:16' ? '9:16' : aspectRatio === 'auto' ? 'auto' : '16:9',
      generate_audio: opts.generate_audio === true,
      resolution: '720p',
      safety_tolerance: '6',
      auto_fix: true,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 150, delayMs: 4000 },
  },
  // PixVerse V6: duration "5"/"8", has generate_audio_switch (NOT generate_audio), has style param
  fal_pixverse_v6: {
    provider: 'fal',
    label: 'PixVerse V6',
    endpoint: 'fal-ai/pixverse/v6/image-to-video',
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts = {}) => ({
      image_url: imageUrl, prompt, duration: pixverseDuration(duration),
      ...(opts.generate_audio === true && { generate_audio_switch: true }),
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  // Wan 2.5: duration "5"/"10", no generate_audio, has resolution/negative_prompt
  fal_wan25: {
    provider: 'fal',
    label: 'Wan 2.5 Preview',
    endpoint: 'fal-ai/wan-25-preview/image-to-video',
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts = {}) => ({
      image_url: imageUrl, prompt, duration: wanDuration(duration),
      resolution: '720p',
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  // Wan Pro: NO duration, NO aspect_ratio, NO generate_audio
  fal_wan_pro: {
    provider: 'fal',
    label: 'Wan Pro',
    endpoint: 'fal-ai/wan-pro/image-to-video',
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts = {}) => ({
      image_url: imageUrl, prompt,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  // PixVerse: duration "5"/"8", NO generate_audio, has negative_prompt/style/camera_movement
  fal_pixverse: {
    provider: 'fal',
    label: 'PixVerse v4.5',
    endpoint: 'fal-ai/pixverse/v4.5/image-to-video',
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts = {}) => ({
      image_url: imageUrl, prompt, duration: pixverseDuration(duration),
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  // Hailuo/MiniMax — no duration, no aspect_ratio, NO generate_audio, has prompt_optimizer
  fal_hailuo: {
    provider: 'fal',
    label: 'Hailuo (MiniMax)',
    endpoint: 'fal-ai/minimax/video-01/image-to-video',
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts = {}) => ({
      image_url: imageUrl, prompt,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  // Grok Imagine I2V — duration 1-15 (int), NO generate_audio, has resolution/aspect_ratio
  fal_grok_video: {
    provider: 'fal',
    label: 'Grok Imagine I2V',
    endpoint: 'xai/grok-imagine-video/image-to-video',
    r2vEndpoint: 'xai/grok-imagine-video/reference-to-video',
    buildBody: (imageUrl, prompt, duration, _aspectRatio, opts = {}) => ({
      image_url: imageUrl, prompt,
      duration: Math.max(1, Math.min(15, Number(duration) || 6)),
      resolution: '720p',
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  // Wavespeed WAN — uses `image` (not `image_url`), numeric duration (correct as-is)
  wavespeed_wan: {
    provider: 'wavespeed',
    label: 'Wavespeed WAN',
    endpoint: 'wavespeed-ai/wan-2.2-spicy/image-to-video',
    buildBody: (imageUrl, prompt, duration, _aspectRatio, opts) => ({
      image: imageUrl,
      prompt,
      duration: Math.max(5, Math.min(8, Number(duration) || 5)),
      resolution: '720p',
      seed: -1,
      ...(opts?.loras?.length && {
        loras: opts.loras.map(c => ({ url: c.loraUrl, scale: Math.min(c.scale ?? 0.7, 0.8) })),
      }),
    }),
    parseResult: (output) => output?.outputs?.[0] || output?.data?.outputs?.[0],
    parseRequestId: (data) => data.id || data.data?.id,
    pollConfig: { maxRetries: 90, delayMs: 4000 },
  },
};

export function isR2VCapable(modelKey) {
  const model = VIDEO_MODELS[modelKey];
  return model && !!model.r2vEndpoint;
}

export function getR2VEndpoint(modelKey) {
  const model = VIDEO_MODELS[modelKey];
  return model?.r2vEndpoint || null;
}

export function isMultiShotCapable(modelKey) {
  const model = VIDEO_MODELS[modelKey];
  return model && !!model.supportsMultiShot;
}

export function isMultiShotR2VCapable(modelKey) {
  const model = VIDEO_MODELS[modelKey];
  return model && !!model.supportsMultiShotR2V && !!model.r2vEndpoint;
}
