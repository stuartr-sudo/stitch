/**
 * Server-side generation helpers for the autonomous article-to-video pipeline.
 * These call external AI APIs directly and handle all polling internally.
 */

const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3';
const FAL_BASE = 'https://queue.fal.run';
const FAL_DIRECT = 'https://fal.run';

// ---------------------------------------------------------------------------
// Internal polling utilities
// ---------------------------------------------------------------------------

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollWavespeedRequest(requestId, apiKey, maxRetries = 60, delayMs = 3000) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`${WAVESPEED_BASE}/predictions/${requestId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      await sleep(delayMs);
      continue;
    }

    const data = await res.json();
    const status = data.status || data.data?.status;
    const outputs = data.outputs || data.data?.outputs;

    if (status === 'completed' && outputs?.[0]) return outputs[0];
    if (status === 'failed') throw new Error(`Wavespeed job failed: ${data.error || 'unknown'}`);

    await sleep(delayMs);
  }
  throw new Error('Wavespeed polling timeout');
}

async function pollFalQueue(requestId, model, falKey, maxRetries = 120, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`${FAL_BASE}/${model}/requests/${requestId}`, {
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      await sleep(delayMs);
      continue;
    }

    const data = await res.json();
    const status = data.status;

    if (status === 'COMPLETED') return data.output;
    if (status === 'FAILED') throw new Error(`FAL job failed: ${data.error || 'unknown'}`);

    await sleep(delayMs);
  }
  throw new Error('FAL queue polling timeout');
}

// ---------------------------------------------------------------------------
// Upload a URL's content to Supabase storage
// ---------------------------------------------------------------------------

async function uploadUrlToSupabase(url, supabase, folder = 'pipeline') {
  try {
    const response = await fetch(url);
    if (!response.ok) return url; // fall back to original URL

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const ext = contentType.includes('mp4') ? 'mp4'
      : contentType.includes('webm') ? 'webm'
      : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
      : contentType.includes('png') ? 'png'
      : contentType.includes('wav') ? 'wav'
      : contentType.includes('flac') ? 'flac'
      : 'mp3';

    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const bucket = ext === 'mp4' || ext === 'webm' ? 'videos' : 'media';

    const { error } = await supabase.storage.from(bucket).upload(fileName, buffer, { contentType, upsert: false });
    if (error) return url;

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrl;
  } catch {
    return url; // non-fatal — return original URL
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
 * @param {string} [model] - 'wavespeed' | 'fal_seedream' | 'fal_flux' — override default model selection
 * @param {object} [loraConfig] - { triggerWord, loraUrl } — injects a trained LoRA (visual subject)
 * @returns {Promise<string>} public image URL
 */
export async function generateImage(prompt, aspectRatio, keys, supabase, model, loraConfig = null) {
  // Prepend the LoRA trigger word so the trained visual subject appears in every generated image.
  // The trigger word is a short unique token (e.g. "sks person", "ohwx product") baked into the LoRA
  // during training. Without it, the LoRA has no effect even if the weights are loaded.
  const finalPrompt = loraConfig?.triggerWord
    ? `${loraConfig.triggerWord}, ${prompt}`
    : prompt;
  const sizeMap = { '9:16': 'portrait_16_9', '1:1': 'square_hd', '16:9': 'landscape_16_9', '2:3': 'portrait_4_3' };

  // Route to specific model if requested.
  // When a LoRA URL is present and the model supports it, route to fal-ai/flux-lora
  // (which accepts a `loras` array) instead of the standard fal-ai/flux/dev.
  if (model === 'fal_flux' && keys.falKey) {
    const falModel = loraConfig?.loraUrl ? 'fal-ai/flux-lora' : 'fal-ai/flux/dev';
    const body = {
      prompt: finalPrompt,
      image_size: sizeMap[aspectRatio] || 'portrait_16_9',
      num_inference_steps: 28,
      ...(loraConfig?.loraUrl && { loras: [{ path: loraConfig.loraUrl, scale: 1.0 }] }),
    };
    const res = await fetch(`${FAL_BASE}/${falModel}`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`FAL FLUX image gen failed: ${await res.text()}`);
    const queueData = await res.json();
    const output = await pollFalQueue(queueData.request_id, falModel, keys.falKey);
    const imageUrl = output?.images?.[0]?.url;
    if (!imageUrl) throw new Error('No image URL from FAL FLUX');
    return await uploadUrlToSupabase(imageUrl, supabase, 'pipeline/images');
  }

  if (model === 'fal_seedream' && keys.falKey) {
    const res = await fetch(`${FAL_BASE}/fal-ai/bytedance/seedream/v4.5/text-to-image`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: finalPrompt, image_size: sizeMap[aspectRatio] || 'portrait_16_9', num_images: 1, enable_safety_checker: true }),
    });
    if (!res.ok) throw new Error(`FAL SeedDream image gen failed: ${await res.text()}`);
    const queueData = await res.json();
    if (queueData.images?.[0]?.url) return queueData.images[0].url;
    const output = await pollFalQueue(queueData.request_id, 'fal-ai/bytedance/seedream/v4.5/text-to-image', keys.falKey);
    const imageUrl = output?.images?.[0]?.url;
    if (!imageUrl) throw new Error('No image URL from FAL SeedDream');
    return await uploadUrlToSupabase(imageUrl, supabase, 'pipeline/images');
  }

  // Default: Wavespeed first (fastest), FAL SeedDream fallback.
  // Wavespeed doesn't support LoRA weights — if a LoRA is configured, skip to FAL FLUX instead.
  if (keys.wavespeedKey && model !== 'fal_seedream' && model !== 'fal_flux' && !loraConfig?.loraUrl) {
    const res = await fetch(`${WAVESPEED_BASE}/google/nano-banana-pro/text-to-image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${keys.wavespeedKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: finalPrompt, aspect_ratio: aspectRatio, num_images: 1 }),
    });

    if (!res.ok) throw new Error(`Wavespeed image gen failed: ${await res.text()}`);
    const data = await res.json();

    let imageUrl = data.outputs?.[0] || data.data?.outputs?.[0];
    if (!imageUrl) {
      const requestId = data.id || data.data?.id;
      if (!requestId) throw new Error('No request ID from Wavespeed image gen');
      imageUrl = await pollWavespeedRequest(requestId, keys.wavespeedKey);
    }

    return await uploadUrlToSupabase(imageUrl, supabase, 'pipeline/images');
  }

  if (keys.falKey) {
    // Use fal-ai/flux-lora when a LoRA is configured, otherwise fall back to SeedDream
    if (loraConfig?.loraUrl) {
      const body = {
        prompt: finalPrompt,
        image_size: sizeMap[aspectRatio] || 'portrait_16_9',
        num_inference_steps: 28,
        loras: [{ path: loraConfig.loraUrl, scale: 1.0 }],
      };
      const res = await fetch(`${FAL_BASE}/fal-ai/flux-lora`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`FAL FLUX-LoRA image gen failed: ${await res.text()}`);
      const queueData = await res.json();
      const output = await pollFalQueue(queueData.request_id, 'fal-ai/flux-lora', keys.falKey);
      const imageUrl = output?.images?.[0]?.url;
      if (!imageUrl) throw new Error('No image URL from FAL FLUX-LoRA');
      return await uploadUrlToSupabase(imageUrl, supabase, 'pipeline/images');
    }

    const res = await fetch(`${FAL_BASE}/fal-ai/bytedance/seedream/v4.5/text-to-image`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: finalPrompt, image_size: sizeMap[aspectRatio] || 'portrait_16_9', num_images: 1, enable_safety_checker: true }),
    });

    if (!res.ok) throw new Error(`FAL image gen failed: ${await res.text()}`);
    const queueData = await res.json();

    if (queueData.images?.[0]?.url) return queueData.images[0].url;

    const output = await pollFalQueue(queueData.request_id, 'fal-ai/bytedance/seedream/v4.5/text-to-image', keys.falKey);
    const imageUrl = output?.images?.[0]?.url;
    if (!imageUrl) throw new Error('No image URL from FAL SeedDream');

    return await uploadUrlToSupabase(imageUrl, supabase, 'pipeline/images');
  }

  throw new Error('No image generation API key configured (need wavespeedKey or falKey)');
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
 * @param {string} [model] - 'wavespeed_wan' | 'fal_kling' | 'fal_hailuo'
 * @returns {Promise<string>} public video URL
 */
export async function animateImage(imageUrl, motionPrompt, aspectRatio, durationSeconds = 5, keys, supabase, model) {
  if (model === 'fal_hailuo' && keys.falKey) {
    const res = await fetch(`${FAL_BASE}/fal-ai/minimax/video-01/image-to-video`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, prompt: motionPrompt }),
    });
    if (!res.ok) throw new Error(`FAL Hailuo video gen failed: ${await res.text()}`);
    const queueData = await res.json();
    const output = await pollFalQueue(queueData.request_id, 'fal-ai/minimax/video-01/image-to-video', keys.falKey, 120, 4000);
    const videoUrl = output?.video?.url;
    if (!videoUrl) throw new Error('No video URL from FAL Hailuo');
    return await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/videos');
  }

  if (model === 'fal_kling' && keys.falKey) {
    const res = await fetch(`${FAL_BASE}/fal-ai/kling-video/v2/master/image-to-video`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, prompt: motionPrompt, duration: String(durationSeconds), aspect_ratio: aspectRatio }),
    });
    if (!res.ok) throw new Error(`FAL Kling video gen failed: ${await res.text()}`);
    const queueData = await res.json();
    const output = await pollFalQueue(queueData.request_id, 'fal-ai/kling-video/v2/master/image-to-video', keys.falKey, 120, 4000);
    const videoUrl = output?.video?.url;
    if (!videoUrl) throw new Error('No video URL from FAL Kling');
    return await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/videos');
  }

  // Default: Wavespeed WAN first, FAL Kling fallback
  if (keys.wavespeedKey && model !== 'fal_kling' && model !== 'fal_hailuo') {
    const res = await fetch(`${WAVESPEED_BASE}/wavespeed-ai/wan-2.2-spicy/image-to-video`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${keys.wavespeedKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageUrl,
        prompt: motionPrompt,
        aspect_ratio: aspectRatio,
        duration: durationSeconds,
        resolution: '720p',
        seed: -1,
      }),
    });

    if (!res.ok) throw new Error(`Wavespeed video gen failed: ${await res.text()}`);
    const data = await res.json();

    let videoUrl = data.outputs?.[0] || data.data?.outputs?.[0];
    if (!videoUrl) {
      const requestId = data.id || data.data?.id;
      if (!requestId) throw new Error('No request ID from Wavespeed video gen');
      videoUrl = await pollWavespeedRequest(requestId, keys.wavespeedKey, 90, 4000);
    }

    return await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/videos');
  }

  if (keys.falKey) {
    const res = await fetch(`${FAL_BASE}/fal-ai/kling-video/v2/master/image-to-video`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, prompt: motionPrompt, duration: String(durationSeconds), aspect_ratio: aspectRatio }),
    });

    if (!res.ok) throw new Error(`FAL Kling video gen failed: ${await res.text()}`);
    const queueData = await res.json();

    const output = await pollFalQueue(queueData.request_id, 'fal-ai/kling-video/v2/master/image-to-video', keys.falKey, 120, 4000);
    const videoUrl = output?.video?.url;
    if (!videoUrl) throw new Error('No video URL from FAL Kling');

    return await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/videos');
  }

  throw new Error('No video generation API key configured');
}

// ---------------------------------------------------------------------------
// Generate background music
// ---------------------------------------------------------------------------

/**
 * @param {string} moodPrompt - e.g. 'upbeat energetic background music'
 * @param {number} durationSeconds
 * @param {object} keys - { falKey }
 * @param {object} supabase
 * @returns {Promise<string>} public audio URL
 */
export async function generateMusic(moodPrompt, durationSeconds = 30, keys, supabase) {
  if (!keys.falKey) return null; // music is optional — don't block pipeline

  const clampedDuration = Math.max(5, Math.min(150, durationSeconds));

  const res = await fetch(`${FAL_BASE}/beatoven/music-generation`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: moodPrompt,
      duration: clampedDuration,
      refinement: 80,
      creativity: 14,
    }),
  });

  if (!res.ok) {
    console.warn('[pipelineHelpers] Music gen failed, skipping:', await res.text());
    return null;
  }

  const queueData = await res.json();
  if (!queueData.request_id) return null;

  try {
    const output = await pollFalQueue(queueData.request_id, 'beatoven/music-generation', keys.falKey, 120, 2000);
    const audioUrl = output?.audio?.url;
    if (!audioUrl) return null;
    return await uploadUrlToSupabase(audioUrl, supabase, 'pipeline/audio');
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

  // Target 0.1s before end to ensure we get the last visible frame
  const frameTime = Math.max(0, (durationSeconds || 5) - 0.1);

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/extract-frame`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: videoUrl, frame_time: frameTime }),
  });

  if (!res.ok) throw new Error(`FAL extract-frame failed: ${await res.text()}`);
  const queueData = await res.json();

  // Some FAL endpoints return the result directly; others require polling
  if (queueData.image_url) return queueData.image_url;

  const output = await pollFalQueue(queueData.request_id, 'fal-ai/ffmpeg-api/extract-frame', falKey, 30, 2000);
  const imageUrl = output?.image_url;
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
    model: 'gpt-5-mini',
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

  // Build FFmpeg filter_complex for concatenation.
  // Each input video is labelled [0:v][0:a], [1:v][1:a] etc. and fed to concat.
  const inputs = videoUrls.map(url => ({ url }));
  const n = videoUrls.length;

  // filter_complex: concat N video segments, then optionally mix audio
  let filterComplex = `${Array.from({ length: n }, (_, i) => `[${i}:v][${i}:a]`).join('')}concat=n=${n}:v=1:a=1[outv][outa]`;
  let outputMap = ['-map', '[outv]', '-map', '[outa]'];

  if (audioUrl) {
    // Add music as an extra input, mix it under the concated audio at 20% volume
    inputs.push({ url: audioUrl });
    const musicIdx = n;
    filterComplex = [
      `${Array.from({ length: n }, (_, i) => `[${i}:v][${i}:a]`).join('')}concat=n=${n}:v=1:a=1[outv][concata]`,
      `[${musicIdx}:a]volume=0.20[musica]`,
      `[concata][musica]amix=inputs=2:duration=first[outa]`,
    ].join(';');
    outputMap = ['-map', '[outv]', '-map', '[outa]'];
  }

  const body = {
    inputs,
    filter_complex: filterComplex,
    output_options: [...outputMap, '-c:v', 'libx264', '-c:a', 'aac', '-shortest'],
    output_filename: `concat_${Date.now()}.mp4`,
  };

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`FAL ffmpeg concat failed: ${await res.text()}`);
  const queueData = await res.json();

  const output = await pollFalQueue(queueData.request_id, 'fal-ai/ffmpeg-api', falKey, 120, 3000);
  const videoUrl = output?.video?.url || output?.output_url;
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
