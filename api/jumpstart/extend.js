/**
 * JumpStart Extend - Video Extension API
 * Supports:
 * - Bytedance Seedance 1.5 Pro (via Wavespeed)
 * - Google Veo 3.1 Fast Extend (via FAL.ai)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      videoUrl, 
      prompt, 
      model = 'seedance',
      duration = 5, 
      resolution = '720p',
      generate_audio = true,
      camera_fixed = false,
      seed = -1
    } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl' });
    }

    console.log('[JumpStart Extend] Model:', model);
    console.log('[JumpStart Extend] Video URL:', videoUrl.substring(0, 50) + '...');

    // Route to appropriate handler
    if (model === 'veo3-fast-extend') {
      return await handleVeo3FastExtend(req, res, { videoUrl, prompt, resolution, generate_audio });
    } else {
      return await handleSeedanceExtend(req, res, { videoUrl, prompt, duration, resolution, generate_audio, camera_fixed, seed });
    }

  } catch (error) {
    console.error('[JumpStart Extend] Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Handle Seedance 1.5 Pro extend (Wavespeed)
 */
async function handleSeedanceExtend(req, res, params) {
  const { videoUrl, prompt, duration, resolution, generate_audio, camera_fixed, seed } = params;
  
  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  if (!WAVESPEED_API_KEY) {
    return res.status(500).json({ error: 'Missing Wavespeed API key' });
  }

  console.log('[JumpStart/Seedance Extend] Requesting extension...');

  const response = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedance-v1.5-pro/video-extend-fast', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt || "",
      video: videoUrl,
      duration: parseInt(duration),
      resolution,
      generate_audio,
      camera_fixed,
      seed
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[JumpStart/Seedance Extend] API Error:', errorText);
    return res.status(response.status).json({ error: 'Wavespeed API error', details: errorText });
  }

  const submitData = await response.json();
  console.log('[JumpStart/Seedance Extend] Job submitted:', submitData.id || submitData.data?.id);

  const resultUrl = submitData.outputs?.[0] || submitData.data?.outputs?.[0];
  if (submitData.status === 'completed' && resultUrl) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      videoUrl: resultUrl,
      model: 'seedance',
    });
  }

  return res.status(200).json({
    success: true,
    status: submitData.status || 'processing',
    requestId: submitData.id || submitData.data?.id,
    model: 'seedance',
  });
}

/**
 * Handle Veo 3.1 Fast Extend (FAL.ai)
 */
async function handleVeo3FastExtend(req, res, params) {
  const { videoUrl, prompt, resolution, generate_audio } = params;
  
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: 'Missing FAL API key' });
  }

  console.log('[JumpStart/Veo3 Extend] Requesting extension...');

  const requestBody = {
    prompt: prompt || "Continue the scene naturally, maintaining the same style and motion.",
    video_url: videoUrl,
    aspect_ratio: 'auto',
    duration: '7s', // Veo 3.1 Fast Extend is fixed at 7 seconds
    resolution: resolution || '720p',
    generate_audio: generate_audio !== false,
    auto_fix: false,
  };

  console.log('[JumpStart/Veo3 Extend] Request:', {
    ...requestBody,
    video_url: '[video]',
    prompt: requestBody.prompt.substring(0, 50) + '...'
  });

  const response = await fetch('https://fal.run/fal-ai/veo3.1/fast/extend-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[JumpStart/Veo3 Extend] API Error:', errorText);
    return res.status(response.status).json({ error: 'Veo 3.1 Fast Extend API error', details: errorText });
  }

  const data = await response.json();
  console.log('[JumpStart/Veo3 Extend] Response:', JSON.stringify(data).substring(0, 300));

  // Check for immediate result
  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      videoUrl: data.video.url,
      model: 'veo3-fast-extend',
    });
  }

  // If queued, return request ID for polling
  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      status: 'processing',
      requestId: requestId,
      model: 'veo3-fast-extend',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Veo 3.1 Fast Extend API' });
}
