/**
 * JumpStart Edit - Video Editing API
 * Supports:
 * - Wavespeed WAN 2.2 Video Edit
 * - xAI Grok Imagine Video Edit (via FAL.ai)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      videoUrl, 
      prompt, 
      model = 'wavespeed',
      resolution = '480p',
      seed = -1
    } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    console.log('[JumpStart Edit] Model:', model);
    console.log('[JumpStart Edit] Requesting edit for:', videoUrl.substring(0, 50) + '...');

    // Route to appropriate handler
    if (model === 'grok-edit') {
      return await handleGrokEdit(req, res, { videoUrl, prompt, resolution });
    } else {
      return await handleWavespeedEdit(req, res, { videoUrl, prompt, resolution, seed });
    }

  } catch (error) {
    console.error('[JumpStart Edit] Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Handle Wavespeed WAN 2.2 Video Edit
 */
async function handleWavespeedEdit(req, res, params) {
  const { videoUrl, prompt, resolution, seed } = params;
  
  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  if (!WAVESPEED_API_KEY) {
    return res.status(500).json({ error: 'Missing Wavespeed API key' });
  }

  console.log('[JumpStart/Wavespeed Edit] Submitting...');

  const response = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2/video-edit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      video: videoUrl,
      resolution,
      seed
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[JumpStart/Wavespeed Edit] API Error:', errorText);
    return res.status(response.status).json({ 
      error: 'Wavespeed API error', 
      details: errorText 
    });
  }

  const submitData = await response.json();
  console.log('[JumpStart/Wavespeed Edit] Job submitted:', submitData.id || submitData.data?.id);

  const resultUrl = submitData.outputs?.[0] || submitData.data?.outputs?.[0];
  if (submitData.status === 'completed' && resultUrl) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      videoUrl: resultUrl,
      model: 'wavespeed',
    });
  }

  return res.status(200).json({
    success: true,
    status: submitData.status || 'processing',
    requestId: submitData.id || submitData.data?.id,
    model: 'wavespeed',
  });
}

/**
 * Handle xAI Grok Imagine Video Edit (via FAL.ai)
 * Max resolution: 854x480, max duration: 8 seconds
 */
async function handleGrokEdit(req, res, params) {
  const { videoUrl, prompt, resolution } = params;
  
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: 'Missing FAL API key' });
  }

  console.log('[JumpStart/Grok Edit] Submitting to xAI Grok Imagine Video Edit...');
  console.log('[JumpStart/Grok Edit] Resolution:', resolution);

  const requestBody = {
    prompt: prompt,
    video_url: videoUrl,
    resolution: resolution === '480p' || resolution === '720p' ? resolution : 'auto',
  };

  console.log('[JumpStart/Grok Edit] Request:', {
    ...requestBody,
    video_url: '[video]',
    prompt: requestBody.prompt.substring(0, 100) + '...'
  });

  const response = await fetch('https://fal.run/xai/grok-imagine-video/edit-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[JumpStart/Grok Edit] API Error:', errorText);
    return res.status(response.status).json({ 
      error: 'Grok Edit API error: ' + errorText.substring(0, 200),
      details: errorText 
    });
  }

  const data = await response.json();
  console.log('[JumpStart/Grok Edit] Response:', JSON.stringify(data).substring(0, 500));

  // Check for immediate result
  if (data.video?.url) {
    console.log('[JumpStart/Grok Edit] Video ready:', data.video.url);
    return res.status(200).json({
      success: true,
      status: 'completed',
      videoUrl: data.video.url,
      model: 'grok-edit',
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
      status: 'processing',
      requestId: requestId,
      model: 'grok-edit',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Grok Edit API' });
}
