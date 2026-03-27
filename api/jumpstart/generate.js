import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import sharp from 'sharp';
import { getUserKeys } from '../lib/getUserKeys.js';
import { writeMediaMetadata } from '../lib/mediaMetadata.js';

const VEO_MAX_IMAGE_BYTES = 7 * 1024 * 1024; // 7MB (FAL limit is 8MB, leave margin)

/**
 * Ensure an image URL is under the Veo size limit.
 * If over, download → resize with sharp → re-upload to Supabase → return new URL.
 */
async function ensureImageUnderLimit(imageUrl, supabase) {
  try {
    const headRes = await fetch(imageUrl, { method: 'HEAD' });
    const size = parseInt(headRes.headers.get('content-length') || '0', 10);
    if (size <= VEO_MAX_IMAGE_BYTES) return imageUrl;

    console.log(`[JumpStart/Veo3] Image ${size} bytes exceeds limit, resizing...`);
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // Resize to max 1920px on longest side, convert to JPEG for smaller size
    const resized = await sharp(buffer)
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    console.log(`[JumpStart/Veo3] Resized: ${size} → ${resized.length} bytes`);

    if (!supabase) return imageUrl; // can't upload, return original and hope

    const filename = `temp/veo-resized-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(filename, resized, { contentType: 'image/jpeg', upsert: true });

    if (uploadErr) {
      console.error('[JumpStart/Veo3] Upload failed:', uploadErr.message);
      return imageUrl;
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filename);
    console.log(`[JumpStart/Veo3] Resized image uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (err) {
    console.error('[JumpStart/Veo3] Image resize error:', err.message);
    return imageUrl; // fallback to original
  }
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * JumpStart - Image to Video Generation API
 * Supports multiple AI providers:
 * - Wavespeed WAN 2.2 Spicy
 * - Grok Imagine Video (FAL.ai / xAI)
 * - Bytedance Seedance 1.5 Pro (FAL.ai)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { falKey: FAL_KEY, wavespeedKey: WAVESPEED_API_KEY } = await getUserKeys(req.user.id, req.user.email);

    const form = formidable({ maxFileSize: 50 * 1024 * 1024 });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const imageFile = files.image?.[0];
    const prompt = fields.prompt?.[0];
    const model = fields.model?.[0] || 'wavespeed-wan';
    const username = fields.username?.[0] || 'default';
    const resolution = fields.resolution?.[0] || '720p';
    const duration = parseInt(fields.duration?.[0] || '5', 10);
    const aspectRatio = fields.aspectRatio?.[0] || '16:9';
    const width = parseInt(fields.width?.[0] || '854', 10);
    const height = parseInt(fields.height?.[0] || '480', 10);
    
    // Audio settings
    const enableAudio = fields.enableAudio?.[0] === 'true';
    const audioTranscript = fields.audioTranscript?.[0] || '';
    
    // Seedance-specific settings
    const cameraFixed = fields.cameraFixed?.[0] === 'true';
    const endImageUrl = fields.endImageUrl?.[0] || null;
    
    // Veo Fast / Kling specific
    const negativePrompt = fields.negativePrompt?.[0] || '';
    const cfgScale = parseFloat(fields.cfgScale?.[0] || '0.5');
    const frontalImageUrl = fields.frontalImageUrl?.[0] || null;
    
    // Multi-image support for Veo 3.1
    let additionalImages = [];
    try {
      if (fields.additionalImages?.[0]) {
        additionalImages = JSON.parse(fields.additionalImages[0]);
      }
    } catch (e) {
      console.warn('[JumpStart] Failed to parse additionalImages:', e);
    }

    if (!imageFile || !prompt) {
      return res.status(400).json({ error: 'Missing required fields (image, prompt)' });
    }

    console.log('[JumpStart] Model:', model);
    console.log('[JumpStart] Settings:', { aspectRatio, resolution, duration, enableAudio, cameraFixed });

    // Read and prepare image — resize if over 9MB to prevent provider 422 errors
    let imageBuffer = fs.readFileSync(imageFile.filepath);
    let mimeType = imageFile.mimetype || 'image/png';
    if (mimeType === 'text/html' && imageFile.originalFilename?.endsWith('.jpg')) {
      mimeType = 'image/jpeg';
    }

    const MAX_BYTES = 9 * 1024 * 1024; // 9MB (providers reject at 10MB)
    const MIN_DIMENSION = 1280; // Minimum longest-side for quality video generation

    const metadata = await sharp(imageBuffer).metadata();
    const longestSide = Math.max(metadata.width || 0, metadata.height || 0);

    if (imageBuffer.length > MAX_BYTES) {
      console.log(`[JumpStart] Image ${imageBuffer.length} bytes / ${metadata.width}×${metadata.height} exceeds limit, downscaling...`);
      imageBuffer = await sharp(imageBuffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      mimeType = 'image/jpeg';
      console.log(`[JumpStart] Downscaled to ${imageBuffer.length} bytes`);
    } else if (longestSide > 0 && longestSide < MIN_DIMENSION) {
      console.log(`[JumpStart] Image ${metadata.width}×${metadata.height} too small, upscaling to ${MIN_DIMENSION}px...`);
      imageBuffer = await sharp(imageBuffer)
        .resize(MIN_DIMENSION, MIN_DIMENSION, { fit: 'inside', withoutEnlargement: false })
        .png()
        .toBuffer();
      mimeType = 'image/png';
      console.log(`[JumpStart] Upscaled to ${imageBuffer.length} bytes`);
    }

    // Get image URL (Supabase upload or base64)
    const supabase = getSupabaseClient();
    let imageUrl;
    let tempFileName = null;

    if (supabase) {
      try {
        const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
        tempFileName = `jumpstart-temp-${Date.now()}.${extension}`;
        
        const bucketName = 'media';
        const uploadResult = await supabase.storage
          .from(bucketName)
          .upload(`temp/${tempFileName}`, imageBuffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!uploadResult.error) {
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(`temp/${tempFileName}`);
          imageUrl = publicUrl;
          console.log('[JumpStart] Using Supabase URL:', imageUrl?.substring(0, 80));
        } else {
          console.warn('[JumpStart] Supabase upload failed:', uploadResult.error.message);
        }
      } catch (uploadError) {
        console.warn('[JumpStart] Supabase error:', uploadError.message);
      }
    }

    if (!imageUrl) {
      // For models that require HTTPS URLs (Veo 3.1 R2V), upload to FAL storage
      if (model === 'veo3' && FAL_KEY) {
        try {
          const uploadResp = await fetch('https://fal.ai/api/storage/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Key ${FAL_KEY}`,
              'Content-Type': mimeType,
              'X-Fal-File-Name': `jumpstart-${Date.now()}.${mimeType === 'image/jpeg' ? 'jpg' : 'png'}`,
            },
            body: imageBuffer,
          });
          if (uploadResp.ok) {
            const uploadData = await uploadResp.json();
            imageUrl = uploadData.url || uploadData.file_url;
            console.log('[JumpStart] Using FAL storage URL:', imageUrl?.substring(0, 80));
          } else {
            const errText = await uploadResp.text();
            console.warn('[JumpStart] FAL storage upload failed:', uploadResp.status, errText.substring(0, 200));
          }
        } catch (falUploadErr) {
          console.warn('[JumpStart] FAL upload error:', falUploadErr.message);
        }
      }

      if (!imageUrl) {
        const base64Image = imageBuffer.toString('base64');
        imageUrl = `data:${mimeType};base64,${base64Image}`;
        console.log('[JumpStart] Using base64 data URL');
      }
    }

    // Route to appropriate provider
    if (model === 'veo3') {
      return await handleVeo3(req, res, {
        imageUrl, prompt, aspectRatio, resolution, enableAudio, additionalImages, FAL_KEY
      });
    } else if (model === 'veo3-fast') {
      return await handleVeo3Fast(req, res, {
        imageUrl, prompt, duration, aspectRatio, resolution, enableAudio, negativePrompt, FAL_KEY
      });
    } else if (model === 'veo3-first-last') {
      return await handleVeo3FirstLast(req, res, {
        firstFrameUrl: imageUrl, 
        lastFrameUrl: endImageUrl, 
        prompt, 
        duration, 
        aspectRatio, 
        resolution, 
        enableAudio, 
        negativePrompt,
        FAL_KEY
      });
    } else if (model === 'ltx-audio-video') {
      return await handleLtxAudioVideo(req, res, {
        imageUrl, prompt, audioUrl: fields.audioUrl?.[0], FAL_KEY
      });
    } else if (model === 'kling-r2v-pro' || model === 'kling-r2v-standard') {
      // Kling O3 Reference-to-Video — character-consistent video from reference images
      let referenceImages = [];
      let r2vElements = [];
      let r2vElementsPreUpscaled = null;
      try {
        if (fields.referenceImages?.[0]) {
          referenceImages = JSON.parse(fields.referenceImages[0]);
        }
      } catch (e) {
        console.warn('[JumpStart] Failed to parse referenceImages:', e);
      }
      try {
        if (fields.r2vElements?.[0]) {
          r2vElements = JSON.parse(fields.r2vElements[0]);
        }
      } catch (e) {
        console.warn('[JumpStart] Failed to parse r2vElements:', e);
      }
      try {
        if (fields.r2vElementsPreUpscaled?.[0]) {
          r2vElementsPreUpscaled = JSON.parse(fields.r2vElementsPreUpscaled[0]);
          console.log('[JumpStart] Using pre-upscaled R2V elements (cached from previous scene)');
        }
      } catch (e) {
        console.warn('[JumpStart] Failed to parse r2vElementsPreUpscaled:', e);
      }
      return await handleKlingR2V(req, res, {
        imageUrl, prompt, duration, aspectRatio, negativePrompt, cfgScale, endImageUrl,
        referenceImages, r2vElements, r2vElementsPreUpscaled, enableAudio, model, frontalImageUrl, FAL_KEY
      });
    } else if (model === 'kling-o3-v2v-pro' || model === 'kling-o3-v2v-standard') {
      const videoUrl = fields.videoUrl?.[0] || null;
      return await handleKlingO3V2V(req, res, {
        imageUrl, videoUrl, prompt, duration, aspectRatio, negativePrompt,
        cfgScale, enableAudio, model, FAL_KEY
      });
    } else if (model === 'ltx-iclora') {
      // LTX-Video ICLoRA — in-context LoRA for subject-consistent video
      const icLoraType = fields.icLoraType?.[0] || 'pose';
      const icLoraScale = parseFloat(fields.icLoraScale?.[0] || '1.0');
      const videoUrl = fields.videoUrl?.[0] || null;
      return await handleLtxICLoRA(req, res, {
        imageUrl, prompt, duration, aspectRatio, videoUrl, icLoraType, icLoraScale, FAL_KEY
      });
    } else if (model === 'kling-video') {
      return await handleKlingVideo(req, res, {
        imageUrl, prompt, duration, negativePrompt, cfgScale, endImageUrl, FAL_KEY
      });
    } else if (model === 'seedance-pro') {
      return await handleSeedance(req, res, {
        imageUrl, prompt, duration, aspectRatio, resolution, enableAudio, audioTranscript, cameraFixed, endImageUrl, FAL_KEY
      });
    } else if (model === 'grok-imagine') {
      return await handleGrokImagine(req, res, {
        imageUrl, prompt, duration, aspectRatio, resolution, enableAudio, audioTranscript, FAL_KEY
      });
    } else if (model === 'grok-r2v') {
      let referenceImageUrls = [];
      try {
        if (fields.referenceImageUrls?.[0]) {
          referenceImageUrls = JSON.parse(fields.referenceImageUrls[0]);
        }
      } catch (e) {
        console.warn('[JumpStart] Failed to parse referenceImageUrls:', e);
      }
      return await handleGrokR2V(req, res, {
        imageUrl, prompt, duration, aspectRatio, resolution, referenceImageUrls, enableAudio, FAL_KEY
      });
    } else {
      return await handleWavespeed(req, res, {
        imageUrl, prompt, duration, aspectRatio, resolution, width, height, WAVESPEED_API_KEY
      });
    }

  } catch (error) {
    console.error('[JumpStart] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Handle Wavespeed WAN 2.2 Spicy
 */
async function handleWavespeed(req, res, params) {
  const { imageUrl, prompt, duration, aspectRatio, resolution, width, height, supabase, tempFileName, WAVESPEED_API_KEY } = params;
  
  if (!WAVESPEED_API_KEY) {
    return res.status(400).json({ error: 'Wavespeed API key not configured. Please add it in API Keys settings.' });
  }

  console.log('[JumpStart/Wavespeed] Submitting...');
  
  const requestBody = {
    image: imageUrl,
    prompt: prompt,
    resolution: resolution,
    duration: duration,
    aspect_ratio: aspectRatio,
    width: width,
    height: height,
    seed: -1,
  };
  
  const submitResponse = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2-spicy/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/Wavespeed] Error:', errorText);
    return res.status(500).json({ error: 'Wavespeed API error: ' + errorText.substring(0, 200) });
  }

  const submitData = await submitResponse.json();
  console.log('[JumpStart/Wavespeed] Response:', JSON.stringify(submitData).substring(0, 300));

  const status = submitData.status || submitData.data?.status;
  const resultUrl = submitData.outputs?.[0] || submitData.data?.outputs?.[0];
  
  if (status === 'completed' && resultUrl) {
    if (supabase && tempFileName) {
      await supabase.storage.from('videos').remove([`temp/${tempFileName}`]).catch(() => {});
    }
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, resultUrl, { model_name: 'wavespeed-wan' });
    return res.status(200).json({ success: true, videoUrl: resultUrl, status: 'completed' });
  }
    
  const requestId = submitData.id || submitData.request_id || submitData.data?.id;
  if (!requestId) {
    return res.status(500).json({ error: 'No request ID returned' });
  }

  return res.status(200).json({
    success: true,
    requestId: requestId,
    model: 'wavespeed-wan',
    status: status || 'processing',
  });
}

/**
 * Handle Grok Imagine Video (FAL.ai / xAI)
 */
async function handleGrokImagine(req, res, params) {
  const { imageUrl, prompt, duration, aspectRatio, resolution, enableAudio, audioTranscript, FAL_KEY } = params;
  
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  console.log('[JumpStart/Grok] Submitting to xAI Grok Imagine Video...');
  console.log('[JumpStart/Grok] Settings:', { duration, aspectRatio, resolution, enableAudio });
  
  // Build enhanced prompt with audio instructions
  let enhancedPrompt = prompt;
  if (enableAudio && audioTranscript) {
    // Add transcript/dialogue instruction to the prompt
    enhancedPrompt = `${prompt}. Audio/Speech: "${audioTranscript}"`;
  } else if (enableAudio) {
    // Request ambient/contextual audio
    enhancedPrompt = `${prompt}. Generate natural ambient sounds and audio appropriate for the scene.`;
  } else {
    // Explicitly request NO audio when disabled
    enhancedPrompt = `${prompt}. Silent video, no audio, no sound, muted.`;
  }
  
  const requestBody = {
    prompt: enhancedPrompt,
    image_url: imageUrl,
    duration: Math.min(duration, 15), // Max 15 seconds for Grok
    aspect_ratio: aspectRatio === 'auto' ? 'auto' : aspectRatio,
    resolution: resolution,
  };

  console.log('[JumpStart/Grok] Request:', { 
    ...requestBody, 
    image_url: requestBody.image_url.substring(0, 50) + '...',
    prompt: requestBody.prompt.substring(0, 100) + '...',
    enableAudio,
    audioTranscript: audioTranscript?.substring(0, 50)
  });
  
  const submitResponse = await fetch('https://fal.run/xai/grok-imagine-video/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/Grok] Error:', errorText);
    return res.status(500).json({ error: 'Grok API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/Grok] Response:', JSON.stringify(data).substring(0, 500));

  // FAL returns video directly or a request_id for queuing
  if (data.video?.url) {
    console.log('[JumpStart/Grok] Video ready:', data.video.url);
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, data.video.url, { model_name: 'grok-imagine' });
    return res.status(200).json({
      success: true,
      videoUrl: data.video.url,
      status: 'completed',
      videoInfo: {
        width: data.video.width,
        height: data.video.height,
        duration: data.video.duration,
        fps: data.video.fps,
      }
    });
  }

  // If queued, return request ID for polling
  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId: requestId,
      model: 'grok-imagine',
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Grok API' });
}

/**
 * Handle xAI Grok Imagine Reference-to-Video (FAL.ai)
 * Uses @Image1, @Image2 syntax in prompts with up to 7 reference images
 */
async function handleGrokR2V(req, res, params) {
  const { imageUrl, prompt, duration, aspectRatio, resolution, referenceImageUrls = [], enableAudio, FAL_KEY } = params;

  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  console.log('[JumpStart/GrokR2V] Submitting to xAI Grok Imagine Reference-to-Video...');

  // Build reference_image_urls — primary image + any additional references (max 7 total)
  const allRefs = [imageUrl, ...referenceImageUrls].slice(0, 7);

  // Do NOT auto-inject @Image tags — the cohesive prompt builder creates natural-language prompts.
  // Grok R2V uses reference_image_urls array directly; @Image syntax is NOT required.

  const requestBody = {
    prompt,
    reference_image_urls: allRefs,
    duration: Math.min(Math.max(duration, 1), 10),
    aspect_ratio: aspectRatio === 'auto' ? '16:9' : aspectRatio,
    resolution: resolution || '720p',
    generate_audio: enableAudio === true,
  };

  console.log('[JumpStart/GrokR2V] Request:', {
    ...requestBody,
    reference_image_urls: `[${allRefs.length} images]`,
    prompt: requestBody.prompt.substring(0, 100) + '...'
  });

  const submitResponse = await fetch('https://fal.run/xai/grok-imagine-video/reference-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/GrokR2V] Error:', errorText);
    return res.status(500).json({ error: 'Grok R2V API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/GrokR2V] Response:', JSON.stringify(data).substring(0, 500));

  // FAL returns video directly or a request_id for queuing
  if (data.video?.url) {
    console.log('[JumpStart/GrokR2V] Video ready:', data.video.url);
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, data.video.url, { model_name: 'grok-r2v' });
    return res.status(200).json({
      success: true,
      videoUrl: data.video.url,
      status: 'completed',
      videoInfo: {
        width: data.video.width,
        height: data.video.height,
        duration: data.video.duration,
        fps: data.video.fps,
      }
    });
  }

  // If queued, return request ID for polling
  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId: requestId,
      model: 'grok-r2v',
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Grok R2V API' });
}

/**
 * Handle Bytedance Seedance 1.5 Pro (FAL.ai)
 */
async function handleSeedance(req, res, params) {
  const { imageUrl, prompt, duration, aspectRatio, resolution, enableAudio, audioTranscript, cameraFixed, endImageUrl, FAL_KEY } = params;
  
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  console.log('[JumpStart/Seedance] Submitting to Bytedance Seedance 1.5 Pro...');
  console.log('[JumpStart/Seedance] Settings:', { duration, aspectRatio, resolution, enableAudio, cameraFixed, hasEndFrame: !!endImageUrl });
  
  // Build enhanced prompt with audio/speech if provided
  let enhancedPrompt = prompt;
  if (enableAudio && audioTranscript) {
    // Seedance supports dialogue in prompt - format it properly
    enhancedPrompt = `${prompt}. The person says: "${audioTranscript}"`;
  }
  
  const requestBody = {
    prompt: enhancedPrompt,
    image_url: imageUrl,
    duration: String(Math.min(Math.max(duration, 4), 12)), // Seedance uses string duration, 4-12 seconds
    aspect_ratio: aspectRatio,
    resolution: resolution,
    generate_audio: enableAudio,
    camera_fixed: cameraFixed,
    enable_safety_checker: true,
    seed: -1,
  };
  
  // Add end frame if provided
  if (endImageUrl) {
    requestBody.end_image_url = endImageUrl;
  }

  console.log('[JumpStart/Seedance] Request:', { 
    ...requestBody, 
    image_url: requestBody.image_url.substring(0, 50) + '...',
    prompt: requestBody.prompt.substring(0, 100) + '...'
  });
  
  const submitResponse = await fetch('https://fal.run/fal-ai/bytedance/seedance/v1.5/pro/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/Seedance] Error:', errorText);
    return res.status(500).json({ error: 'Seedance API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/Seedance] Response:', JSON.stringify(data).substring(0, 500));

  // FAL returns video directly or a request_id for queuing
  if (data.video?.url) {
    console.log('[JumpStart/Seedance] Video ready:', data.video.url);
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, data.video.url, { model_name: 'seedance-pro' });
    return res.status(200).json({
      success: true,
      videoUrl: data.video.url,
      status: 'completed',
      seed: data.seed,
    });
  }

  // If queued, return request ID for polling
  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId: requestId,
      model: 'seedance-pro',
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Seedance API' });
}

/**
 * Handle Google Veo 3.1 Reference-to-Video (FAL.ai queue)
 */
async function handleVeo3(req, res, params) {
  const { imageUrl, prompt, aspectRatio, resolution, enableAudio, additionalImages = [], FAL_KEY } = params;

  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  console.log('[JumpStart/Veo3] Submitting to Google Veo 3.1 R2V queue...');
  console.log('[JumpStart/Veo3] Settings:', { aspectRatio, resolution, enableAudio, additionalImagesCount: additionalImages.length });

  // Veo 3.1 R2V uses image_urls array - supports multiple reference images
  // FAL limit: images must be under 8MB each. Resize any that exceed.
  const supabase = getSupabaseClient();
  const rawImages = [imageUrl, ...additionalImages];
  const allImages = await Promise.all(rawImages.map(url => ensureImageUnderLimit(url, supabase)));
  console.log(`[JumpStart/Veo3] ${rawImages.length} images checked, ${allImages.filter((u, i) => u !== rawImages[i]).length} resized`);

  // Strip copyrighted brand names that trigger Veo content policy
  let cleanPrompt = prompt
    .replace(/\b(Pixar|Cocomelon|DreamWorks|Disney|Illumination|Laika|Blue Sky|Aardman|Sarah and Duck|Bluey|Peppa Pig|Paw Patrol|Sesame Street|Nickelodeon|Cartoon Network|Studio Ghibli|Ghibli|Nintendo|Pokémon|Pokemon|Marvel|DC Comics|Warner Bros|Paramount|Sony Pictures|Universal|Netflix|Hulu|HBO|Nick Jr|PBS Kids)\b/gi, '')
    // Clean up orphaned grammar from stripping: "inspired by and ," → "inspired by"
    .replace(/\b(inspired by|style of|like|similar to|reminiscent of)\s+(and\s*,?\s*|,\s*and\s*,?\s*)/gi, '$1 ')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Veo 3.1 R2V has no negative_prompt field — strip any "AVOID:" section
  // the cohesive prompt builder appends. Embedding it in the main prompt
  // confuses the model and contributes to no_media_generated rejections.
  cleanPrompt = cleanPrompt.replace(/\s*AVOID:\s*.*/i, '').trim();

  // Strip @Element references — these are Kling R2V-only syntax.
  // Veo uses image_urls for references and doesn't understand @Element placeholders.
  cleanPrompt = cleanPrompt.replace(/@Element\d+/g, '').replace(/\s{2,}/g, ' ').trim();

  // Veo 3.1 R2V only accepts '16:9' or '9:16' — coerce anything else
  const veoAspect = aspectRatio === '9:16' ? '9:16' : '16:9';

  const requestBody = {
    prompt: cleanPrompt,
    image_urls: allImages,
    aspect_ratio: veoAspect,
    duration: '8s',
    resolution: resolution || '720p',
    generate_audio: enableAudio === true,
    auto_fix: true,
    safety_tolerance: '6',
  };

  console.log('[JumpStart/Veo3] Request:', {
    ...requestBody,
    image_urls: `[${allImages.length} images]`,
    prompt: requestBody.prompt.substring(0, 100) + '...'
  });

  // Use queue endpoint — Veo 3.1 R2V is slow, synchronous fal.run times out
  const submitResponse = await fetch('https://queue.fal.run/fal-ai/veo3.1/reference-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/Veo3] Queue submit error:', errorText);
    return res.status(500).json({ error: 'Veo 3.1 API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/Veo3] Queue response:', JSON.stringify(data).substring(0, 500));

  const requestId = data.request_id;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId: requestId,
      model: 'veo3',
      statusUrl: data.status_url,
      responseUrl: data.response_url,
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Veo 3.1 queue API' });
}

/**
 * Handle Google Veo 3.1 Fast (FAL.ai)
 */
async function handleVeo3Fast(req, res, params) {
  const { imageUrl, prompt, duration, aspectRatio, resolution, enableAudio, negativePrompt, FAL_KEY } = params;
  
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  console.log('[JumpStart/Veo3Fast] Submitting to Google Veo 3.1 Fast...');
  console.log('[JumpStart/Veo3Fast] Settings:', { duration, aspectRatio, resolution, enableAudio });
  
  // Veo 3.1 Fast only accepts '16:9', '9:16', or 'auto' — coerce anything else
  const veoAspect = aspectRatio === '9:16' ? '9:16' : aspectRatio === 'auto' ? 'auto' : '16:9';

  const requestBody = {
    prompt: prompt,
    image_url: imageUrl,
    aspect_ratio: veoAspect,
    duration: `${duration}s`, // Veo Fast uses string format: "4s", "6s", "8s"
    resolution: resolution,
    generate_audio: enableAudio === true,
    auto_fix: true,
    safety_tolerance: '6',
  };

  // Add negative prompt if provided
  if (negativePrompt) {
    requestBody.negative_prompt = negativePrompt;
  }

  console.log('[JumpStart/Veo3Fast] Request:', {
    ...requestBody,
    image_url: '[image]',
    prompt: requestBody.prompt.substring(0, 100) + '...'
  });
  
  const submitResponse = await fetch('https://fal.run/fal-ai/veo3.1/fast/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/Veo3Fast] Error:', errorText);
    return res.status(500).json({ error: 'Veo 3.1 Fast API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/Veo3Fast] Response:', JSON.stringify(data).substring(0, 500));

  if (data.video?.url) {
    console.log('[JumpStart/Veo3Fast] Video ready:', data.video.url);
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, data.video.url, { model_name: 'veo3-fast' });
    return res.status(200).json({
      success: true,
      videoUrl: data.video.url,
      status: 'completed',
    });
  }

  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId: requestId,
      model: 'veo3-fast',
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Veo 3.1 Fast API' });
}

/**
 * Handle Google Veo 3.1 Fast First-Last-Frame-to-Video (FAL.ai)
 * Generates video transition between first and last frame
 */
async function handleVeo3FirstLast(req, res, params) {
  const { firstFrameUrl, lastFrameUrl, prompt, duration, aspectRatio, resolution, enableAudio, negativePrompt, FAL_KEY } = params;
  
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  if (!firstFrameUrl || !lastFrameUrl) {
    return res.status(400).json({ error: 'Both first and last frame images are required' });
  }

  console.log('[JumpStart/Veo3FirstLast] Submitting to Veo 3.1 First-Last-Frame...');
  console.log('[JumpStart/Veo3FirstLast] Settings:', { duration, aspectRatio, resolution, enableAudio });
  
  // Veo 3.1 First-Last-Frame only accepts '16:9', '9:16', or 'auto'
  const veoAspect = aspectRatio === '9:16' ? '9:16' : aspectRatio === 'auto' ? 'auto' : '16:9';

  const requestBody = {
    prompt: prompt,
    first_frame_url: firstFrameUrl,
    last_frame_url: lastFrameUrl,
    aspect_ratio: veoAspect,
    duration: `${duration}s`, // "4s", "6s", "8s"
    resolution: resolution,
    generate_audio: enableAudio === true,
    auto_fix: true,
    safety_tolerance: '6',
  };

  // Add negative prompt if provided
  if (negativePrompt) {
    requestBody.negative_prompt = negativePrompt;
  }

  console.log('[JumpStart/Veo3FirstLast] Request:', { 
    ...requestBody, 
    first_frame_url: '[first frame]',
    last_frame_url: '[last frame]',
    prompt: requestBody.prompt.substring(0, 100) + '...'
  });
  
  const submitResponse = await fetch('https://fal.run/fal-ai/veo3.1/fast/first-last-frame-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/Veo3FirstLast] Error:', errorText);
    return res.status(500).json({ error: 'Veo 3.1 First-Last API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/Veo3FirstLast] Response:', JSON.stringify(data).substring(0, 500));

  if (data.video?.url) {
    console.log('[JumpStart/Veo3FirstLast] Video ready:', data.video.url);
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, data.video.url, { model_name: 'veo3-first-last' });
    return res.status(200).json({
      success: true,
      videoUrl: data.video.url,
      status: 'completed',
    });
  }

  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId: requestId,
      model: 'veo3-first-last',
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Veo 3.1 First-Last API' });
}

/**
 * Handle Kling Video 2.5 Turbo Pro (FAL.ai)
 */
async function handleKlingVideo(req, res, params) {
  const { imageUrl, prompt, duration, negativePrompt, cfgScale, endImageUrl, FAL_KEY } = params;
  
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  console.log('[JumpStart/Kling] Submitting to Kling 2.5 Turbo Pro...');
  console.log('[JumpStart/Kling] Settings:', { duration, cfgScale, hasEndFrame: !!endImageUrl });
  
  const requestBody = {
    prompt: prompt,
    image_url: imageUrl,
    duration: String(duration), // Kling uses string: "5" or "10"
    cfg_scale: cfgScale,
    negative_prompt: negativePrompt || 'blur, distort, and low quality',
  };
  
  // Add tail image (end frame) if provided
  if (endImageUrl) {
    requestBody.tail_image_url = endImageUrl;
  }

  console.log('[JumpStart/Kling] Request:', { 
    ...requestBody, 
    image_url: '[image]',
    prompt: requestBody.prompt.substring(0, 100) + '...'
  });
  
  const submitResponse = await fetch('https://fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/Kling] Error:', errorText);
    return res.status(500).json({ error: 'Kling API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/Kling] Response:', JSON.stringify(data).substring(0, 500));

  if (data.video?.url) {
    console.log('[JumpStart/Kling] Video ready:', data.video.url);
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, data.video.url, { model_name: 'kling-video' });
    return res.status(200).json({
      success: true,
      videoUrl: data.video.url,
      status: 'completed',
    });
  }

  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId: requestId,
      model: 'kling-video',
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Kling API' });
}

async function handleLtxAudioVideo(req, res, params) {
  const { imageUrl, prompt, audioUrl, FAL_KEY } = params;

  if (!FAL_KEY) return res.status(400).json({ error: 'FAL API key not configured.' });
  if (!audioUrl) return res.status(400).json({ error: 'Audio URL is required for this model.' });

  const requestBody = {
    audio_url: audioUrl,
    image_url: imageUrl,
    prompt: prompt || "",
  };

  const submitResponse = await fetch('https://queue.fal.run/fal-ai/ltx-2-19b/distilled/audio-to-video/lora', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    return res.status(500).json({ error: 'LTX API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();

  if (data.video?.url) {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, data.video.url, { model_name: 'ltx-audio-video' });
    return res.status(200).json({ success: true, videoUrl: data.video.url, status: 'completed' });
  }

  if (data.request_id || data.requestId) {
    return res.status(200).json({
      success: true,
      requestId: data.request_id || data.requestId,
      model: 'ltx-audio-video',
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from LTX API' });
}

/**
 * Handle Kling O3 Reference-to-Video (Pro & Standard)
 * Uses elements array for character-consistent video generation
 */
/**
 * Upscale an image using Topaz via FAL — ensures reference images meet the 300x300 minimum.
 * Returns the upscaled image URL, or the original on error.
 */
const TOPAZ_ENDPOINT = 'fal-ai/topaz/upscale/image';

async function upscaleImage(imageUrl, FAL_KEY) {
  try {
    console.log(`[Upscale] Upscaling (Topaz): ${imageUrl.substring(0, 80)}...`);
    const submitRes = await fetch(`https://queue.fal.run/${TOPAZ_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        model: 'Standard V2',
        upscale_factor: 2,
        output_format: 'jpeg',
        subject_detection: 'All',
        face_enhancement: false,
      }),
    });

    const data = await submitRes.json();

    // Synchronous result
    if (data.image?.url) {
      console.log(`[Upscale] Done (sync): ${data.image.url.substring(0, 80)}`);
      return data.image.url;
    }

    // Queued — poll
    if (data.request_id) {
      const statusUrl = data.status_url || `https://queue.fal.run/${TOPAZ_ENDPOINT}/requests/${data.request_id}/status`;
      const responseUrl = data.response_url || `https://queue.fal.run/${TOPAZ_ENDPOINT}/requests/${data.request_id}`;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(statusUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
        const status = await statusRes.json();
        if (status.status === 'COMPLETED') {
          const resultRes = await fetch(responseUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
          const result = await resultRes.json();
          if (result.image?.url) {
            console.log(`[Upscale] Done (queued): ${result.image.url.substring(0, 80)}`);
            return result.image.url;
          }
        }
        if (status.status !== 'IN_QUEUE' && status.status !== 'IN_PROGRESS') break;
      }
    }

    console.warn('[Upscale] Timed out, using original');
    return imageUrl;
  } catch (err) {
    console.warn('[Upscale] Error, using original:', err.message);
    return imageUrl;
  }
}

async function handleKlingR2V(req, res, params) {
  const { imageUrl, prompt, duration, aspectRatio, negativePrompt, cfgScale, endImageUrl, referenceImages, r2vElements, r2vElementsPreUpscaled, enableAudio, model, frontalImageUrl, FAL_KEY } = params;

  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  const tier = model === 'kling-r2v-pro' ? 'pro' : 'standard';
  console.log(`[JumpStart/KlingR2V] Submitting to Kling O3 ${tier} R2V...`);
  console.log(`[JumpStart/KlingR2V] Settings:`, { duration, aspectRatio, enableAudio, r2vElements: r2vElements?.length || 0, refImages: referenceImages?.length || 0, hasEndFrame: !!endImageUrl });

  const requestBody = {
    prompt,
    duration: String(Math.min(Math.max(duration, 3), 15)),
    aspect_ratio: aspectRatio || '16:9',
    generate_audio: enableAudio,
    start_image_url: imageUrl,
  };

  // Build elements array — supports up to 4 elements (@Element1, @Element2, etc.)
  // Each element has a frontal_image_url and up to 3 reference_image_urls
  // All reference images are auto-upscaled via Topaz to meet FAL's 300x300 minimum

  if (r2vElementsPreUpscaled && r2vElementsPreUpscaled.length > 0) {
    // Use pre-upscaled elements from a previous scene — no redundant upscaling
    console.log('[JumpStart/KlingR2V] Using pre-upscaled elements from previous scene (skipping upscale)');
    requestBody.elements = r2vElementsPreUpscaled;
  } else if (r2vElements && r2vElements.length > 0) {
    // New multi-element format from Storyboard — upscale for the first time
    console.log('[JumpStart/KlingR2V] Upscaling reference images to meet minimum dimensions...');
    const upscaledElements = [];
    for (const el of r2vElements.slice(0, 4)) {
      const refs = (el.referenceImageUrls || []).slice(0, 3);
      const frontal = el.frontalImageUrl || refs[0];
      // Upscale all refs and frontal in parallel
      const allUrls = [frontal, ...refs];
      const upscaled = await Promise.all(allUrls.map(url => upscaleImage(url, FAL_KEY)));
      upscaledElements.push({
        frontal_image_url: upscaled[0],
        reference_image_urls: upscaled.slice(1),
      });
    }
    requestBody.elements = upscaledElements;
  } else {
    // Legacy single-element format (JumpStart, etc.)
    console.log('[JumpStart/KlingR2V] Upscaling reference images to meet minimum dimensions...');
    const frontalUrl = frontalImageUrl || (referenceImages?.length > 0 ? referenceImages[0] : imageUrl);
    const refs = referenceImages?.length > 0 ? referenceImages.slice(0, 3) : [imageUrl];
    const allUrls = [frontalUrl, ...refs];
    const upscaled = await Promise.all(allUrls.map(url => upscaleImage(url, FAL_KEY)));
    requestBody.elements = [{
      frontal_image_url: upscaled[0],
      reference_image_urls: upscaled.slice(1),
    }];
  }

  // End frame
  if (endImageUrl) {
    requestBody.end_image_url = endImageUrl;
  }

  console.log('[JumpStart/KlingR2V] Request:', {
    prompt: requestBody.prompt.substring(0, 100) + '...',
    start_image_url: requestBody.start_image_url?.substring(0, 80),
    elements: requestBody.elements.map((el, i) => ({
      index: i + 1,
      frontal: el.frontal_image_url?.substring(0, 80),
      refs: el.reference_image_urls?.map(u => u.substring(0, 80)),
    })),
  });

  const submitResponse = await fetch(`https://fal.run/fal-ai/kling-video/o3/${tier}/reference-to-video`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/KlingR2V] Error:', errorText);
    // Parse FAL validation errors for user-friendly messages
    let userError = `Kling R2V ${tier} API error: ` + errorText.substring(0, 200);
    try {
      const errData = JSON.parse(errorText);
      if (errData.detail) {
        const details = Array.isArray(errData.detail) ? errData.detail : [errData.detail];
        const msgs = details.map(d => {
          if (d.msg?.includes('too small')) return `Reference image too small (min 300x300px). Check your element reference images are high resolution.`;
          if (d.msg?.includes('Maximum')) return d.msg;
          return d.msg || String(d);
        });
        userError = msgs.join('. ');
      }
    } catch (e) { /* use raw error */ }
    return res.status(500).json({ error: userError });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/KlingR2V] Response:', JSON.stringify(data).substring(0, 500));

  // Include upscaled element URLs so the client can reuse them for subsequent scenes
  const upscaledElements = requestBody.elements;

  if (data.video?.url) {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, data.video.url, { model_name: model });
    return res.status(200).json({ success: true, videoUrl: data.video.url, status: 'completed', upscaledElements });
  }

  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({ success: true, requestId, model, status: 'processing', upscaledElements });
  }

  return res.status(500).json({ error: 'Unexpected response from Kling R2V API' });
}

/**
 * Handle LTX-Video ICLoRA — In-Context LoRA for subject-consistent video
 * Conditions video generation on reference images using IC-LoRA adapters
 */
async function handleLtxICLoRA(req, res, params) {
  const { imageUrl, prompt, duration, aspectRatio, videoUrl, icLoraType, icLoraScale, FAL_KEY } = params;

  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  console.log('[JumpStart/LTX-ICLoRA] Submitting...');
  console.log('[JumpStart/LTX-ICLoRA] Settings:', { icLoraType, icLoraScale, hasVideo: !!videoUrl, duration, aspectRatio });

  // Use the distilled endpoint for faster inference
  const endpoint = videoUrl
    ? 'fal-ai/ltx-2-19b/distilled/video-to-video/lora'
    : 'fal-ai/ltx-2-19b/distilled/image-to-video/lora';

  const requestBody = {
    prompt,
    ic_lora: icLoraType, // 'pose', 'depth', 'canny', 'detailer', 'match_preprocessor'
    ic_lora_scale: icLoraScale,
  };

  if (videoUrl) {
    requestBody.video_url = videoUrl;
  }

  if (imageUrl) {
    requestBody.image_url = imageUrl;
  }

  // Map aspect ratio to width/height for LTX
  const dims = { '16:9': [768, 432], '9:16': [432, 768], '1:1': [576, 576], '4:3': [640, 480] };
  const [w, h] = dims[aspectRatio] || dims['16:9'];
  requestBody.width = w;
  requestBody.height = h;
  requestBody.num_frames = Math.min(Math.max(Math.round(duration * 24), 49), 257);

  console.log('[JumpStart/LTX-ICLoRA] Request:', {
    ...requestBody,
    image_url: requestBody.image_url ? '[image]' : undefined,
    video_url: requestBody.video_url ? '[video]' : undefined,
    prompt: requestBody.prompt.substring(0, 100) + '...',
  });

  const submitResponse = await fetch(`https://fal.run/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/LTX-ICLoRA] Error:', errorText);
    return res.status(500).json({ error: 'LTX ICLoRA API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/LTX-ICLoRA] Response:', JSON.stringify(data).substring(0, 500));

  if (data.video?.url) {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, data.video.url, { model_name: 'ltx-iclora' });
    return res.status(200).json({ success: true, videoUrl: data.video.url, status: 'completed' });
  }

  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({ success: true, requestId, model: 'ltx-iclora', status: 'processing' });
  }

  return res.status(500).json({ error: 'Unexpected response from LTX ICLoRA API' });
}

/**
 * Handle Kling O3 Video-to-Video (FAL.ai)
 * Used for: restyling source video, refining generated scenes
 * Endpoints: fal-ai/kling-video/o3/pro/video-to-video, fal-ai/kling-video/o3/standard/video-to-video
 */
async function handleKlingO3V2V(req, res, params) {
  const { imageUrl, videoUrl, prompt, duration, aspectRatio, negativePrompt, cfgScale, enableAudio, model, FAL_KEY } = params;

  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured.' });
  }

  if (!videoUrl) {
    return res.status(400).json({ error: 'Video URL required for video-to-video generation' });
  }

  const tier = model === 'kling-o3-v2v-pro' ? 'pro' : 'standard';
  const endpoint = `fal-ai/kling-video/o3/${tier}/video-to-video`;

  console.log(`[JumpStart/KlingO3V2V] Submitting to ${endpoint}...`);
  console.log('[JumpStart/KlingO3V2V] Settings:', { duration, aspectRatio, enableAudio });

  const requestBody = {
    prompt,
    video_url: videoUrl,
    duration: String(duration),
    aspect_ratio: aspectRatio,
  };

  if (negativePrompt) requestBody.negative_prompt = negativePrompt;
  if (cfgScale && cfgScale !== 0.5) requestBody.cfg_scale = cfgScale;
  if (enableAudio) requestBody.generate_audio = true;

  const submitResponse = await fetch(`https://fal.run/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/KlingO3V2V] Error:', errorText);
    return res.status(500).json({ error: 'Kling O3 V2V error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/KlingO3V2V] Response:', JSON.stringify(data).substring(0, 500));

  if (data.video?.url) {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    writeMediaMetadata(sb, req.user?.id, data.video.url, { model_name: model });
    return res.status(200).json({
      success: true,
      videoUrl: data.video.url,
      status: 'completed',
    });
  }

  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId,
      model,
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Kling O3 V2V' });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
