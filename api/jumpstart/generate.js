import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';
import { getUserKeys } from '../lib/getUserKeys.js';

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

    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });

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

    // Read and prepare image
    const imageBuffer = fs.readFileSync(imageFile.filepath);
    let mimeType = imageFile.mimetype || 'image/png';
    if (mimeType === 'text/html' && imageFile.originalFilename?.endsWith('.jpg')) {
      mimeType = 'image/jpeg';
    }

    // Get image URL (Supabase upload or base64)
    const supabase = getSupabaseClient();
    let imageUrl;
    let tempFileName = null;

    if (supabase) {
      try {
        const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
        tempFileName = `jumpstart-temp-${Date.now()}.${extension}`;
        
        const bucketName = 'videos';
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
          console.log('[JumpStart] Using Supabase URL');
        }
      } catch (uploadError) {
        console.warn('[JumpStart] Supabase error:', uploadError.message);
      }
    }

    if (!imageUrl) {
      const base64Image = imageBuffer.toString('base64');
      imageUrl = `data:${mimeType};base64,${base64Image}`;
      console.log('[JumpStart] Using base64 data URL');
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
 * Handle Google Veo 3.1 (FAL.ai)
 */
async function handleVeo3(req, res, params) {
  const { imageUrl, prompt, aspectRatio, resolution, enableAudio, additionalImages = [], FAL_KEY } = params;
  
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  console.log('[JumpStart/Veo3] Submitting to Google Veo 3.1...');
  console.log('[JumpStart/Veo3] Settings:', { aspectRatio, resolution, enableAudio, additionalImagesCount: additionalImages.length });
  
  // Veo 3.1 uses image_urls array - supports multiple reference images
  const allImages = [imageUrl, ...additionalImages];
  
  const requestBody = {
    prompt: prompt,
    image_urls: allImages,
    aspect_ratio: aspectRatio,
    duration: '8s', // Veo 3.1 only supports 8 seconds
    resolution: resolution,
    generate_audio: enableAudio !== false, // Default true
    auto_fix: false,
  };

  console.log('[JumpStart/Veo3] Request:', { 
    ...requestBody, 
    image_urls: `[${allImages.length} images]`,
    prompt: requestBody.prompt.substring(0, 100) + '...'
  });
  
  const submitResponse = await fetch('https://fal.run/fal-ai/veo3.1/reference-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/Veo3] Error:', errorText);
    return res.status(500).json({ error: 'Veo 3.1 API error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();
  console.log('[JumpStart/Veo3] Response:', JSON.stringify(data).substring(0, 500));

  // FAL returns video directly or a request_id for queuing
  if (data.video?.url) {
    console.log('[JumpStart/Veo3] Video ready:', data.video.url);
    return res.status(200).json({
      success: true,
      videoUrl: data.video.url,
      status: 'completed',
    });
  }

  // If queued, return request ID for polling
  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId: requestId,
      model: 'veo3',
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Veo 3.1 API' });
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
  
  // Veo 3.1 Fast uses single image_url and supports duration options
  const requestBody = {
    prompt: prompt,
    image_url: imageUrl,
    aspect_ratio: aspectRatio,
    duration: `${duration}s`, // Veo Fast uses string format: "4s", "6s", "8s"
    resolution: resolution,
    generate_audio: enableAudio !== false,
    auto_fix: false,
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
  
  const requestBody = {
    prompt: prompt,
    first_frame_url: firstFrameUrl,
    last_frame_url: lastFrameUrl,
    aspect_ratio: aspectRatio === 'auto' ? 'auto' : aspectRatio,
    duration: `${duration}s`, // "4s", "6s", "8s"
    resolution: resolution,
    generate_audio: enableAudio !== false,
    auto_fix: false,
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

export const config = {
  api: {
    bodyParser: false,
  },
};
