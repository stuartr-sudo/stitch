/**
 * Server-side generation helpers for the autonomous article-to-video pipeline.
 * These call external AI APIs directly and handle all polling internally.
 */

import { generateImageV2, animateImageV2 } from './mediaGenerator.js';

const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';
const FAL_BASE = 'https://queue.fal.run';

// Default negative prompt for image generation (models that support it)
const DEFAULT_NEGATIVE_PROMPT = 'blurry, distorted, low quality, watermark, text artifacts, extra limbs, deformed, duplicate, cropped';

// FAL video APIs accept '4s', '6s', or '8s' — clamp and format
function falDuration(seconds) {
  const n = Number(seconds) || 5;
  if (n <= 5) return '4s';
  if (n <= 7) return '6s';
  return '8s';
}

// ---------------------------------------------------------------------------
// Internal polling utilities
// ---------------------------------------------------------------------------

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function pollWavespeedRequest(requestId, apiKey, maxRetries = 60, delayMs = 3000) {
  const deadline = Date.now() + 300_000; // 5 minute absolute timeout
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`${WAVESPEED_BASE}/predictions/${requestId}/result`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      if (Date.now() > deadline) throw new Error(`Wavespeed poll timeout after 5 minutes [${requestId}]`);
      await sleep(delayMs);
      continue;
    }

    const data = await res.json();
    const status = data.status || data.data?.status;
    const outputs = data.outputs || data.data?.outputs;

    if (status === 'completed' && outputs?.[0]) return outputs[0];
    if (status === 'failed') throw new Error(`Wavespeed job failed: ${data.error || 'unknown'}`);

    if (Date.now() > deadline) throw new Error(`Wavespeed poll timeout after 5 minutes [${requestId}]`);
    await sleep(delayMs);
  }
  throw new Error('Wavespeed polling timeout');
}

export async function pollFalQueue(requestIdOrUrl, model, falKey, maxRetries = 120, delayMs = 2000) {
  // Use response_url if a full URL is passed, otherwise construct from full model path.
  // IMPORTANT: use the complete model path — truncating breaks multi-segment endpoints
  // like fal-ai/ffmpeg-api/compose, fal-ai/ffmpeg-api/extract-frame, etc.
  const pollUrl = requestIdOrUrl.startsWith('http')
    ? requestIdOrUrl
    : `${FAL_BASE}/${model}/requests/${requestIdOrUrl}`;

  // Absolute timeout: derived from poll params, min 5 min, max 10 min
  const computedMs = Math.min(maxRetries * delayMs, 600_000);
  const deadline = Date.now() + Math.max(computedMs, 300_000);
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(pollUrl, {
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (Date.now() > deadline) throw new Error(`FAL poll timeout after 5 minutes [${model}]`);
      await sleep(delayMs);
      continue;
    }

    const data = await res.json();
    const status = data.status;

    if (status === 'COMPLETED') return data.output;
    // response_url returns the result directly when done (no status field).
    // Detect completion by checking for any known FAL result key.
    if (!status && !data.queue_position && (
      data.images || data.audio || data.video || data.output ||
      data.image_url || data.video_url || data.output_url
    )) return data;
    if (status === 'FAILED') throw new Error(`FAL job failed: ${data.error || 'unknown'}`);

    if (Date.now() > deadline) throw new Error(`FAL poll timeout after 5 minutes [${model}]`);
    await sleep(delayMs);
  }
  throw new Error('FAL queue polling timeout');
}

// ---------------------------------------------------------------------------
// Upload a URL's content to Supabase storage
// ---------------------------------------------------------------------------

/**
 * Lightweight image buffer validation (no external dependencies).
 * Throws if the buffer is likely a blank, corrupt, or error image.
 */
function validateImageBuffer(buffer) {
  // Check 1: Minimum size — blank/error images are typically < 5KB
  if (buffer.length < 5120) {
    throw new Error(`Image too small (${buffer.length} bytes) — likely blank or error placeholder`);
  }

  // Check 2: Entropy — sample the second half of the buffer (past headers)
  // and reject if >90% of sampled bytes are the same value (solid color)
  const sampleStart = Math.floor(buffer.length * 0.5);
  const sampleEnd = Math.min(sampleStart + 2048, buffer.length);
  const sample = buffer.slice(sampleStart, sampleEnd);

  if (sample.length >= 256) {
    const freq = new Map();
    for (let i = 0; i < sample.length; i++) {
      freq.set(sample[i], (freq.get(sample[i]) || 0) + 1);
    }
    const maxFreq = Math.max(...freq.values());
    const uniformity = maxFreq / sample.length;
    if (uniformity > 0.90) {
      throw new Error(`Image appears blank — ${(uniformity * 100).toFixed(0)}% uniform pixel data`);
    }
  }
}

export async function uploadUrlToSupabase(url, supabase, folder = 'pipeline') {
  try {
    const response = await fetch(url);
    if (!response.ok) return url; // fall back to original URL

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    // Detect extension from content-type first, then fall back to URL extension
    const urlExt = url.split('?')[0].split('.').pop()?.toLowerCase();
    const ext = contentType.includes('mp4') ? 'mp4'
      : contentType.includes('webm') ? 'webm'
      : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
      : contentType.includes('png') ? 'png'
      : contentType.includes('wav') ? 'wav'
      : contentType.includes('flac') ? 'flac'
      : contentType.includes('mpeg') && !contentType.includes('video') ? 'mp3'
      : contentType.includes('video') ? 'mp4'
      : ['mp4', 'webm', 'mov'].includes(urlExt) ? urlExt
      : folder.includes('final') || folder.includes('video') ? 'mp4'
      : 'mp3';

    // Validate image quality before uploading (skip video/audio)
    const isImage = ext === 'jpg' || ext === 'png';
    if (isImage) {
      validateImageBuffer(buffer);
    }

    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bucket = ext === 'mp4' || ext === 'webm' ? 'videos' : 'media';

    const { error } = await supabase.storage.from(bucket).upload(fileName, buffer, { contentType, upsert: false });
    if (error) return url;

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    // Re-throw validation errors so withRetry() can catch and retry generation
    if (err.message?.includes('Image too small') || err.message?.includes('Image appears blank')) {
      throw err;
    }
    return url; // non-fatal for other errors — return original URL
  }
}

// ---------------------------------------------------------------------------
// Prompt enhancement for pipeline image generation
// ---------------------------------------------------------------------------

/**
 * Append quality tokens to a pipeline image prompt based on context.
 * Keeps suffix short to avoid diluting the main prompt. Deduplicates.
 *
 * @param {string} prompt - the base visual prompt
 * @param {string} [sceneRole] - 'hook', 'cta', 'solution', 'proof', etc.
 * @param {string} [model] - image model identifier
 * @returns {string} enhanced prompt
 */
export function enhancePromptForPipeline(prompt, sceneRole, model) {
  const lowerPrompt = prompt.toLowerCase();
  const tokens = [];

  if (!lowerPrompt.includes('high quality')) tokens.push('high quality');
  if (!lowerPrompt.includes('detailed')) tokens.push('detailed');

  // Photorealistic models get sharpness tokens
  const photoModels = ['fal_seedream', 'fal_kling_img', 'fal_imagen4'];
  if (photoModels.includes(model)) {
    if (!lowerPrompt.includes('sharp focus')) tokens.push('sharp focus');
    if (!lowerPrompt.includes('professional')) tokens.push('professional photograph');
  }

  // Product showcase scenes get studio tokens
  if (sceneRole === 'solution' || sceneRole === 'proof') {
    if (!lowerPrompt.includes('studio lighting')) tokens.push('studio lighting');
  }

  if (tokens.length === 0) return prompt;
  return `${prompt}, ${tokens.join(', ')}`;
}

// ---------------------------------------------------------------------------
// Smart model routing by scene role (opt-in via model_preferences.smart_routing)
// ---------------------------------------------------------------------------

/**
 * Select the optimal image generation model for a scene based on its role.
 * Only activates when template.model_preferences.smart_routing is truthy.
 *
 * @param {string} sceneRole - 'hook', 'cta', 'point', 'step', 'solution', 'proof', etc.
 * @param {object} modelPrefs - template.model_preferences
 * @param {Array} loraConfigs - resolved LoRA configs
 * @returns {string|undefined} model identifier
 */
export function selectModelForScene(sceneRole, modelPrefs, loraConfigs) {
  if (!modelPrefs?.smart_routing) return modelPrefs?.image_model;

  const hasLoras = loraConfigs?.length > 0;
  const preferred = modelPrefs?.image_model;

  // LoRAs constrain us to FLUX 2 (only fal model supporting LoRA weights)
  if (hasLoras) return 'fal_flux';

  switch (sceneRole) {
    case 'hook':
      return preferred || 'fal_seedream';
    case 'cta':
      return 'fal_ideogram';
    case 'solution':
    case 'proof':
      return preferred || 'fal_seedream';
    case 'point':
    case 'step':
    case 'comparison':
      return preferred || 'fal_flux';
    default:
      return preferred;
  }
}

// ---------------------------------------------------------------------------
// Generate a single image from a text prompt
// ---------------------------------------------------------------------------

/**
 * @param {string} prompt
 * @param {string} aspectRatio - '9:16' | '1:1' | '16:9'
 * @param {object} keys - { wavespeedKey, falKey }
 * @param {object} supabase - Supabase client
 * @param {string} [model] - 'wavespeed' | 'fal_seedream' | 'fal_flux' | 'fal_imagen4' | 'fal_kling_img' | 'fal_grok' | 'fal_ideogram'
 * @param {object|object[]} [loraConfig] - Single { triggerWord, loraUrl, scale } or array of them for stacking
 * @returns {Promise<string>} public image URL
 */
export async function generateImage(prompt, aspectRatio, keys, supabase, model, loraConfig = null) {
  const loraConfigs = !loraConfig ? [] : Array.isArray(loraConfig) ? loraConfig : [loraConfig];
  const hasLoras = loraConfigs.length > 0;
  const lorasPayload = loraConfigs.filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 }));

  // Prepend trigger words
  const triggerPrefix = loraConfigs.map(c => c.triggerWord).filter(Boolean).join(', ');
  const finalPrompt = triggerPrefix ? `${triggerPrefix}, ${prompt}` : prompt;

  // Resolve model key (matches original routing logic)
  let modelKey = model;
  if (!modelKey) {
    if (hasLoras) {
      modelKey = 'fal_flux';
    } else if (keys.wavespeedKey) {
      modelKey = 'wavespeed';
    } else {
      modelKey = 'fal_seedream';
    }
  }

  return generateImageV2(modelKey, finalPrompt, aspectRatio, keys, supabase, {
    loras: lorasPayload,
    originalAspectRatio: aspectRatio,
  });
}

// ---------------------------------------------------------------------------
// Animate an image into a short video clip
// ---------------------------------------------------------------------------

/**
 * @param {string} imageUrl - public URL of the source image
 * @param {string} motionPrompt - description of desired motion
 * @param {string} aspectRatio - '9:16' | '1:1' | '16:9'
 * @param {number} durationSeconds - 3-5
 * @param {object} keys - { wavespeedKey, falKey }
 * @param {object} supabase
 * @param {string} [model] - 'wavespeed_wan' | 'fal_kling' | 'fal_hailuo' | 'fal_veo3' | 'fal_veo2' | 'fal_kling_v3' | 'fal_kling_o3' | 'fal_wan25' | 'fal_wan_pro' | 'fal_pixverse'
 * @returns {Promise<string>} public video URL
 */
export async function animateImage(imageUrl, motionPrompt, aspectRatio, durationSeconds = 5, keys, supabase, model, loraConfigs = []) {
  let modelKey = model;
  if (!modelKey) {
    modelKey = keys.wavespeedKey ? 'wavespeed_wan' : 'fal_kling';
  }

  const lorasPayload = (loraConfigs || []).filter(c => c.loraUrl).map(c => ({
    loraUrl: c.loraUrl,
    scale: Math.min(c.scale ?? 0.7, 0.8),
  }));

  return animateImageV2(modelKey, imageUrl, motionPrompt, aspectRatio, durationSeconds, keys, supabase, {
    loras: lorasPayload,
  });
}

// ---------------------------------------------------------------------------
// Assemble a faceless short: video clips + voiceover + background music
// ---------------------------------------------------------------------------

/**
 * Assembles a faceless short video from scene clips, voiceover, and music.
 * Unlike concatVideos() which mixes video-embedded audio with music, this
 * function discards scene clip audio and mixes voiceover (100%) + music (15%).
 *
 * @param {string[]} videoUrls - Ordered list of scene clip URLs
 * @param {string} voiceoverUrl - Voiceover narration audio URL
 * @param {string|null} musicUrl - Optional background music URL
 * @param {string} falKey
 * @param {object} supabase
 * @param {number[]} [clipDurations] - Actual duration of each clip in seconds
 * @returns {Promise<string>} Public URL of the assembled video
 */
export async function assembleShort(videoUrls, voiceoverUrl, musicUrl, falKey, supabase, clipDurations = [], musicVolume = 0.15) {
  if (!falKey) throw new Error('falKey required for short assembly');
  if (!videoUrls?.length) throw new Error('No video clips to assemble');
  if (!voiceoverUrl) throw new Error('Voiceover URL required for short assembly');

  // Build tracks for fal-ai/ffmpeg-api/compose using actual clip durations
  let runningTimestamp = 0;
  const videoKeyframes = videoUrls.map((url, i) => {
    const durationMs = (clipDurations[i] || 8) * 1000; // default 8s if unknown
    const kf = { url, timestamp: runningTimestamp, duration: durationMs };
    runningTimestamp += durationMs;
    return kf;
  });
  const totalDurationMs = runningTimestamp;

  const tracks = [
    { id: 'video', type: 'video', keyframes: videoKeyframes },
    { id: 'voiceover', type: 'audio', keyframes: [{ url: voiceoverUrl, timestamp: 0 }] },
  ];

  if (musicUrl) {
    tracks.push({ id: 'music', type: 'audio', keyframes: [{ url: musicUrl, timestamp: 0, duration: totalDurationMs, volume: musicVolume }] });
  }

  const totalDurationSec = totalDurationMs / 1000;
  console.log(`[assembleShort] Assembling ${videoUrls.length} clips (total ${totalDurationSec}s) + voiceover${musicUrl ? ` + music (vol=${musicVolume})` : ''}`);

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/compose`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracks, duration: totalDurationSec }),
  });

  if (!res.ok) throw new Error(`FAL ffmpeg short assembly failed: ${await res.text()}`);
  const queueData = await res.json();

  const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/ffmpeg-api/compose', falKey, 120, 3000);
  const videoUrl = output?.video_url || output?.video?.url || output?.output_url;
  if (!videoUrl) throw new Error('No video URL from FFmpeg short assembly');

  return await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/finals');
}

// ---------------------------------------------------------------------------
// Extract the first frame from a video clip
// ---------------------------------------------------------------------------

/**
 * Extracts the first frame of a video clip via the fal.ai FFMPEG API.
 * Returns a publicly accessible image URL.
 *
 * @param {string} videoUrl - public URL of the source video
 * @param {string} falKey
 * @returns {Promise<string>} image URL of the extracted frame
 */
export async function extractFirstFrame(videoUrl, falKey) {
  if (!falKey) throw new Error('falKey required for frame extraction');

  console.log('[extractFirstFrame] Extracting first frame...');
  const body = { video_url: videoUrl, frame_type: 'first' };
  const submitRes = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/extract-frame`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) throw new Error(`extractFirstFrame submit failed: ${submitRes.status}`);
  const queueData = await submitRes.json();

  // Some FAL endpoints return the result directly; others require polling
  if (queueData.images?.[0]?.url) return queueData.images[0].url;

  const result = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/ffmpeg-api/extract-frame', falKey, 30, 2000);
  const imageUrl = result?.images?.[0]?.url || result?.image?.url;
  if (!imageUrl) throw new Error('extractFirstFrame returned no image URL');
  console.log('[extractFirstFrame] Done:', imageUrl);
  return imageUrl;
}

// ---------------------------------------------------------------------------
// Generate background music
// ---------------------------------------------------------------------------

/**
 * Build a rich music prompt from a framework's music config or mood label.
 * Beatoven handles detailed descriptions well — give it genre, instruments, feel.
 *
 * @param {object|string} musicConfig - framework.music object or a mood string
 * @param {string} [category] - framework category ('story' | 'fast_paced')
 * @returns {string} Rich music prompt
 */
export function buildMusicPrompt(musicConfig, category = 'story') {
  // If it's a full music config object (from expanded framework)
  if (musicConfig && typeof musicConfig === 'object' && musicConfig.moodProgression) {
    return `${musicConfig.moodProgression}. Instrumental only, no vocals.`;
  }

  // String mood label — expand it
  const mood = typeof musicConfig === 'string' ? musicConfig : '';
  if (!mood) return 'Cinematic background music with soft dynamics, instrumental only';

  const paceHint = category === 'fast_paced'
    ? 'driving rhythm, energetic pace, punchy transitions'
    : 'flowing dynamics, natural builds and releases, smooth transitions';

  return `${mood}. Instrumental only, no vocals. ${paceHint}. Suitable as background music under narration.`;
}

/**
 * @param {string} moodPrompt - e.g. 'upbeat energetic background music'
 * @param {number} durationSeconds
 * @param {object} keys - { falKey }
 * @param {object} supabase
 * @param {string} [model] - 'beatoven' | 'minimax' | 'fal_elevenlabs' | 'fal_lyria2'
 * @returns {Promise<string>} public audio URL
 */
export async function generateMusic(moodPrompt, durationSeconds = 30, keys, supabase, model = 'beatoven') {
  if (!keys.falKey) return null; // music is optional — don't block pipeline

  const clampedDuration = Math.max(5, Math.min(150, durationSeconds));

  try {
    // --- Beatoven (duration-aware, higher quality) ---
    if (model === 'beatoven') {
      const res = await fetch(`${FAL_BASE}/beatoven/music-generation`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: moodPrompt.slice(0, 300),
          negative_prompt: 'vocals, singing, speech, noise, distortion',
          duration: clampedDuration,
          refinement: 100,
          creativity: 16,
        }),
      });
      if (!res.ok) {
        console.warn('[pipelineHelpers] Beatoven music gen failed, falling back to Lyria 2:', await res.text());
        return generateMusic(moodPrompt, durationSeconds, keys, supabase, 'fal_lyria2');
      }
      const queueData = await res.json();
      if (!queueData.request_id) return null;
      const output = await pollFalQueue(
        'beatoven/music-generation',
        queueData.request_id,
        keys.falKey,
        180,
        4000
      );
      const audioUrl = output?.audio?.url || output?.audio_file?.url;
      if (!audioUrl) return null;
      return await uploadUrlToSupabase(audioUrl, supabase, 'pipeline/audio');
    }

    // --- MiniMax Music V2 ---
    if (model === 'minimax') {
      const res = await fetch(`${FAL_BASE}/fal-ai/minimax-music/v2`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: moodPrompt.slice(0, 300),
          lyrics_prompt: '[Instrumental]',
        }),
      });
      if (!res.ok) { console.warn('[pipelineHelpers] MiniMax Music gen failed, skipping:', await res.text()); return null; }
      const queueData = await res.json();
      if (!queueData.request_id) return null;
      const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/minimax-music/v2', keys.falKey, 120, 3000);
      const audioUrl = output?.audio?.url;
      if (!audioUrl) return null;
      return await uploadUrlToSupabase(audioUrl, supabase, 'pipeline/audio');
    }

    // --- ElevenLabs Music via FAL ---
    if (model === 'fal_elevenlabs') {
      const res = await fetch(`${FAL_BASE}/fal-ai/elevenlabs/music`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: moodPrompt, duration_seconds: clampedDuration }),
      });
      if (!res.ok) { console.warn('[pipelineHelpers] ElevenLabs Music gen failed, skipping:', await res.text()); return null; }
      const queueData = await res.json();
      if (!queueData.request_id) return null;
      const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/elevenlabs/music', keys.falKey, 120, 3000);
      const audioUrl = output?.audio?.url;
      if (!audioUrl) return null;
      return await uploadUrlToSupabase(audioUrl, supabase, 'pipeline/audio');
    }

    // --- Lyria 2 (Google) via FAL (default) ---
    if (model === 'fal_lyria2') {
      const res = await fetch(`${FAL_BASE}/fal-ai/lyria2`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `[Instrumental] ${moodPrompt.slice(0, 280)}`, duration: clampedDuration }),
      });
      if (!res.ok) { console.warn('[pipelineHelpers] Lyria 2 Music gen failed, skipping:', await res.text()); return null; }
      const queueData = await res.json();
      if (!queueData.request_id) return null;
      const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/lyria2', keys.falKey, 120, 3000);
      const audioUrl = output?.audio?.url;
      if (!audioUrl) return null;
      return await uploadUrlToSupabase(audioUrl, supabase, 'pipeline/audio');
    }

    // No other music models — Lyria 2, MiniMax, and ElevenLabs are supported
    console.warn('[pipelineHelpers] Unknown music model, skipping');
    return null;
  } catch (err) {
    console.warn('[pipelineHelpers] Music poll failed, skipping:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Extract the last frame from a video clip (for scene-to-scene continuity)
// ---------------------------------------------------------------------------

/**
 * Extracts the last frame of a video clip via the fal.ai FFMPEG API.
 * Returns a publicly accessible image URL used as the seed image for the next scene.
 *
 * @param {string} videoUrl - public URL of the source video
 * @param {number} durationSeconds - known clip duration (used to target last frame)
 * @param {string} falKey
 * @returns {Promise<string>} image URL of the extracted frame
 */
export async function extractLastFrame(videoUrl, durationSeconds, falKey) {
  if (!falKey) throw new Error('falKey required for frame extraction');

  console.log(`[extractLastFrame] Extracting last frame via fal-ai/ffmpeg-api/extract-frame`);

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/extract-frame`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: videoUrl, frame_type: 'last' }),
  });

  if (!res.ok) throw new Error(`FAL extract-frame failed: ${await res.text()}`);
  const queueData = await res.json();

  // Some FAL endpoints return the result directly; others require polling
  if (queueData.images?.[0]?.url) return queueData.images[0].url;

  const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/ffmpeg-api/extract-frame', falKey, 30, 2000);
  const imageUrl = output?.images?.[0]?.url;
  if (!imageUrl) throw new Error('No image URL from frame extraction');
  return imageUrl;
}

// ---------------------------------------------------------------------------
// Analyze a frame for visual continuity (lighting, color, composition)
// ---------------------------------------------------------------------------

/**
 * Sends a frame image to GPT-4o-mini vision and returns a dense visual description
 * covering lighting, color temperature, subject position, background, camera angle.
 * This description is appended to the next scene's motion prompt so the animator
 * knows which visual elements to preserve.
 *
 * @param {string} imageUrl - publicly accessible image URL
 * @param {object} openai - OpenAI client instance
 * @returns {Promise<string>} visual description (≤120 words)
 */
export async function analyzeFrameContinuity(imageUrl, openai) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        {
          type: 'text',
          text: 'Describe this image frame for AI video continuity. In under 80 words, cover: lighting direction and quality, color temperature and palette, subject position and appearance, background environment, camera angle and depth of field. Use specific visual terms suitable for AI image and video generation prompts.',
        },
      ],
    }],
    max_tokens: 150,
  });
  return response.choices[0].message.content.trim();
}

// ---------------------------------------------------------------------------
// Concatenate video clips into a single final video (with optional audio mix)
// ---------------------------------------------------------------------------

/**
 * Concatenates multiple video clips into one MP4 using the fal-ai/ffmpeg-api.
 * Optionally mixes in a background audio track (music) at reduced volume.
 *
 * The resulting video is uploaded to Supabase and its public URL is returned.
 * If fewer than 2 clips are provided, the single clip URL is returned as-is
 * (nothing to concatenate).
 *
 * @param {string[]} videoUrls   - ordered list of public video clip URLs
 * @param {string|null} audioUrl - optional background music URL to mix in
 * @param {string} falKey
 * @param {object} supabase
 * @returns {Promise<string>} public URL of the final concatenated video
 */
export async function concatVideos(videoUrls, audioUrl, falKey, supabase) {
  if (!falKey) throw new Error('falKey required for video concatenation');
  if (!videoUrls?.length) throw new Error('No video clips to concatenate');

  // Single clip — no concat needed
  if (videoUrls.length === 1 && !audioUrl) return videoUrls[0];

  // Build tracks for fal-ai/ffmpeg-api/compose
  const CLIP_DURATION_MS = 10_000;
  const videoKeyframes = videoUrls.map((url, i) => ({
    url,
    timestamp: i * CLIP_DURATION_MS,
    duration: CLIP_DURATION_MS,
  }));
  const totalDurationMs = videoUrls.length * CLIP_DURATION_MS;

  const tracks = [
    { id: 'video', type: 'video', keyframes: videoKeyframes },
  ];

  if (audioUrl) {
    tracks.push({ id: 'audio', type: 'audio', keyframes: [{ url: audioUrl, timestamp: 0, duration: totalDurationMs }] });
  }

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/compose`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracks }),
  });

  if (!res.ok) throw new Error(`FAL ffmpeg concat failed: ${await res.text()}`);
  const queueData = await res.json();

  const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/ffmpeg-api/compose', falKey, 120, 3000);
  const videoUrl = output?.video_url || output?.video?.url || output?.output_url;
  if (!videoUrl) throw new Error('No video URL from FFmpeg concat');

  return await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/finals');
}

// ---------------------------------------------------------------------------
// Scrape article content
// ---------------------------------------------------------------------------

/**
 * @param {string} url
 * @param {string} firecrawlKey
 * @returns {Promise<string>} markdown content
 */
export async function scrapeArticle(url, firecrawlKey) {
  if (!firecrawlKey) {
    // Simple fallback: fetch raw HTML, strip tags
    const res = await fetch(url, { headers: { 'User-Agent': 'Stitch-Bot/1.0' } });
    if (!res.ok) throw new Error(`Failed to fetch article: ${res.status}`);
    const html = await res.text();
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 6000);
  }

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, formats: ['markdown'] }),
  });

  if (!res.ok) throw new Error(`Firecrawl failed: ${await res.text()}`);
  const data = await res.json();
  return data.data?.markdown || data.markdown || '';
}
