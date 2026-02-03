/**
 * JumpStart - Check Video Generation Result
 * Supports polling for both Wavespeed and Grok (FAL.ai) models
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId, model = 'wavespeed-wan' } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    console.log('[JumpStart/Result] Checking:', { requestId, model });

    if (model === 'grok-imagine') {
      return await checkGrokResult(req, res, requestId);
    } else {
      return await checkWavespeedResult(req, res, requestId);
    }

  } catch (error) {
    console.error('[JumpStart/Result] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Check Wavespeed result
 */
async function checkWavespeedResult(req, res, requestId) {
  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  
  if (!WAVESPEED_API_KEY) {
    return res.status(500).json({ error: 'Missing Wavespeed API key' });
  }

  const pollResponse = await fetch(
    `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
    {
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
      },
    }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Wavespeed] Poll error:', errorText);
    return res.status(pollResponse.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const pollDataRaw = await pollResponse.json();
  const data = pollDataRaw?.data ?? pollDataRaw?.result?.data ?? pollDataRaw;
  const statusRaw = data?.status ?? pollDataRaw?.status ?? null;
  const status = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : statusRaw;

  const outputs = data?.outputs ?? pollDataRaw?.outputs ?? [];
  let videoUrl = null;
  if (status === 'completed') {
    const first = Array.isArray(outputs) ? outputs[0] : null;
    videoUrl = typeof first === 'string' ? first : (first?.url ?? null);
  }

  console.log('[JumpStart/Wavespeed] Status:', status);

  return res.status(200).json({
    success: true,
    status,
    requestId,
    videoUrl,
    model: 'wavespeed-wan',
    error: data?.error || pollDataRaw?.error || null,
  });
}

/**
 * Check Grok/FAL result
 */
async function checkGrokResult(req, res, requestId) {
  const FAL_KEY = process.env.FAL_KEY;
  
  if (!FAL_KEY) {
    return res.status(500).json({ error: 'Missing FAL API key' });
  }

  // FAL uses a status endpoint for queued requests
  const pollResponse = await fetch(
    `https://queue.fal.run/xai/grok-imagine-video/image-to-video/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Grok] Poll error:', errorText);
    
    // FAL returns 404 when request is complete, try getting result directly
    if (pollResponse.status === 404) {
      return await getGrokResult(req, res, requestId, FAL_KEY);
    }
    
    return res.status(pollResponse.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const data = await pollResponse.json();
  console.log('[JumpStart/Grok] Status response:', JSON.stringify(data).substring(0, 300));

  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getGrokResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'grok-imagine',
    queuePosition: data.queue_position,
  });
}

/**
 * Get completed Grok result
 */
async function getGrokResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/xai/grok-imagine-video/image-to-video/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Grok] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log('[JumpStart/Grok] Result:', JSON.stringify(data).substring(0, 300));

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl: data.video.url,
      model: 'grok-imagine',
      videoInfo: {
        width: data.video.width,
        height: data.video.height,
        duration: data.video.duration,
        fps: data.video.fps,
      }
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    model: 'grok-imagine',
  });
}
