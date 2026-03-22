/**
 * Model Registry — declarative configs for all image and video generation models.
 * Each entry fully describes how to call and parse one model.
 */

const DEFAULT_NEGATIVE_PROMPT = 'blurry, distorted, low quality, watermark, text artifacts, extra limbs, deformed, duplicate, cropped';

// FAL video APIs accept '4s', '6s', or '8s'
function falDuration(seconds) {
  const n = Number(seconds) || 5;
  if (n <= 5) return '4s';
  if (n <= 7) return '6s';
  return '8s';
}

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
  fal_seedream: {
    provider: 'fal',
    label: 'SeedDream v4.5',
    endpoint: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size) => ({
      prompt, image_size: size, num_images: 1, enable_safety_checker: true,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_imagen4: {
    provider: 'fal',
    label: 'Imagen 4',
    endpoint: 'fal-ai/imagen4/preview/fast',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size) => ({
      prompt, image_size: size, num_images: 1,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_kling_img: {
    provider: 'fal',
    label: 'Kling Image v3',
    endpoint: 'fal-ai/kling-image/v3/text-to-image',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size) => ({
      prompt, image_size: size, num_images: 1, negative_prompt: DEFAULT_NEGATIVE_PROMPT,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_grok: {
    provider: 'fal',
    label: 'Grok Imagine',
    endpoint: 'xai/grok-imagine-image',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size) => ({
      prompt, image_size: size, num_images: 1,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  fal_ideogram: {
    provider: 'fal',
    label: 'Ideogram v2',
    endpoint: 'fal-ai/ideogram/v2',
    sizeMap: { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9' },
    buildBody: (prompt, size) => ({
      prompt, image_size: size, num_images: 1, negative_prompt: DEFAULT_NEGATIVE_PROMPT,
    }),
    parseResult: (output) => output?.images?.[0]?.url,
    pollConfig: { maxRetries: 120, delayMs: 2000 },
  },
  wavespeed: {
    provider: 'wavespeed',
    label: 'Wavespeed',
    endpoint: 'google/nano-banana-pro/text-to-image',
    buildBody: (prompt, _size, opts) => ({
      prompt, aspect_ratio: opts.originalAspectRatio || '9:16', num_images: 1,
    }),
    parseResult: (output) => output?.outputs?.[0] || output?.data?.outputs?.[0],
    parseRequestId: (data) => data.id || data.data?.id,
    pollConfig: { maxRetries: 60, delayMs: 3000 },
  },
};

export const VIDEO_MODELS = {
  fal_kling: {
    provider: 'fal',
    label: 'Kling 2.0 Master',
    endpoint: 'fal-ai/kling-video/v2/master/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_kling_v3: {
    provider: 'fal',
    label: 'Kling V3 Pro',
    endpoint: 'fal-ai/kling-video/v3/pro/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_kling_o3: {
    provider: 'fal',
    label: 'Kling O3 Pro',
    endpoint: 'fal-ai/kling-video/o3/pro/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_veo2: {
    provider: 'fal',
    label: 'Veo 2 (Google)',
    endpoint: 'fal-ai/veo2/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 150, delayMs: 4000 },
  },
  fal_veo3: {
    provider: 'fal',
    label: 'Veo 3 (Google)',
    endpoint: 'fal-ai/veo3/fast',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 150, delayMs: 4000 },
  },
  fal_wan25: {
    provider: 'fal',
    label: 'Wan 2.5 Preview',
    endpoint: 'fal-ai/wan-25-preview/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_wan_pro: {
    provider: 'fal',
    label: 'Wan Pro',
    endpoint: 'fal-ai/wan-pro/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_pixverse: {
    provider: 'fal',
    label: 'PixVerse v4.5',
    endpoint: 'fal-ai/pixverse/v4.5/image-to-video',
    durationFormat: 'fal_string',
    buildBody: (imageUrl, prompt, duration, aspectRatio) => ({
      image_url: imageUrl, prompt, duration: falDuration(duration), aspect_ratio: aspectRatio,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  fal_hailuo: {
    provider: 'fal',
    label: 'Hailuo (MiniMax)',
    endpoint: 'fal-ai/minimax/video-01/image-to-video',
    durationFormat: 'none',
    buildBody: (imageUrl, prompt) => ({
      image_url: imageUrl, prompt,
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
  wavespeed_wan: {
    provider: 'wavespeed',
    label: 'Wavespeed WAN',
    endpoint: 'wavespeed-ai/wan-2.2-spicy/image-to-video',
    durationFormat: 'numeric',
    buildBody: (imageUrl, prompt, duration, aspectRatio, opts) => ({
      image: imageUrl,
      prompt,
      aspect_ratio: aspectRatio,
      duration,
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
