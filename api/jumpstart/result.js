/**
 * JumpStart - Check Video Generation Result
 * Supports polling for both Wavespeed and Grok (FAL.ai) models
 */
import { getUserKeys } from '../lib/getUserKeys.js';

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

    const { falKey: FAL_KEY, wavespeedKey: WAVESPEED_API_KEY } = await getUserKeys(req.user.id, req.user.email);

    if (model === 'veo3') {
      return await checkVeo3Result(req, res, requestId, FAL_KEY);
    } else if (model === 'veo3-fast') {
      return await checkVeo3FastResult(req, res, requestId, FAL_KEY);
    } else if (model === 'veo3-first-last') {
      return await checkVeo3FirstLastResult(req, res, requestId, FAL_KEY);
    } else if (model === 'veo3-fast-extend') {
      return await checkVeo3FastExtendResult(req, res, requestId, FAL_KEY);
    } else if (model === 'kling-video') {
      return await checkKlingResult(req, res, requestId, FAL_KEY);
    } else if (model === 'seedance-pro') {
      return await checkSeedanceResult(req, res, requestId, FAL_KEY);
    } else if (model === 'grok-imagine') {
      return await checkGrokResult(req, res, requestId, FAL_KEY);
    } else if (model === 'grok-edit') {
      return await checkGrokEditResult(req, res, requestId, FAL_KEY);
    } else {
      return await checkWavespeedResult(req, res, requestId, WAVESPEED_API_KEY);
    }

  } catch (error) {
    console.error('[JumpStart/Result] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Check Wavespeed result
 */
async function checkWavespeedResult(req, res, requestId, WAVESPEED_API_KEY) {
  if (!WAVESPEED_API_KEY) {
    return res.status(400).json({ error: 'Wavespeed API key not configured. Please add it in API Keys settings.' });
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
async function checkGrokResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
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

/**
 * Check Seedance/FAL result
 */
async function checkSeedanceResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  // FAL uses a status endpoint for queued requests
  const pollResponse = await fetch(
    `https://queue.fal.run/fal-ai/bytedance/seedance/v1.5/pro/image-to-video/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Seedance] Poll error:', errorText);
    
    // FAL returns 404 when request is complete, try getting result directly
    if (pollResponse.status === 404) {
      return await getSeedanceResult(req, res, requestId, FAL_KEY);
    }
    
    return res.status(pollResponse.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const data = await pollResponse.json();
  console.log('[JumpStart/Seedance] Status response:', JSON.stringify(data).substring(0, 300));

  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getSeedanceResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'seedance-pro',
    queuePosition: data.queue_position,
  });
}

/**
 * Get completed Seedance result
 */
async function getSeedanceResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/bytedance/seedance/v1.5/pro/image-to-video/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Seedance] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log('[JumpStart/Seedance] Result:', JSON.stringify(data).substring(0, 300));

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl: data.video.url,
      model: 'seedance-pro',
      seed: data.seed,
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    model: 'seedance-pro',
  });
}

/**
 * Check Veo 3.1/FAL result
 */
async function checkVeo3Result(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  // FAL uses a status endpoint for queued requests
  const pollResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/reference-to-video/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Veo3] Poll error:', errorText);
    
    // FAL returns 404 when request is complete, try getting result directly
    if (pollResponse.status === 404) {
      return await getVeo3Result(req, res, requestId, FAL_KEY);
    }
    
    return res.status(pollResponse.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const data = await pollResponse.json();
  console.log('[JumpStart/Veo3] Status response:', JSON.stringify(data).substring(0, 300));

  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getVeo3Result(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'veo3',
    queuePosition: data.queue_position,
  });
}

/**
 * Get completed Veo 3.1 result
 */
async function getVeo3Result(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/reference-to-video/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Veo3] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log('[JumpStart/Veo3] Result:', JSON.stringify(data).substring(0, 300));

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl: data.video.url,
      model: 'veo3',
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    model: 'veo3',
  });
}

/**
 * Check Veo 3.1 Fast/FAL result
 */
async function checkVeo3FastResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  const pollResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/fast/image-to-video/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Veo3Fast] Poll error:', errorText);
    
    if (pollResponse.status === 404) {
      return await getVeo3FastResult(req, res, requestId, FAL_KEY);
    }
    
    return res.status(pollResponse.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const data = await pollResponse.json();
  console.log('[JumpStart/Veo3Fast] Status response:', JSON.stringify(data).substring(0, 300));

  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getVeo3FastResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'veo3-fast',
    queuePosition: data.queue_position,
  });
}

/**
 * Get completed Veo 3.1 Fast result
 */
async function getVeo3FastResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/fast/image-to-video/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Veo3Fast] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log('[JumpStart/Veo3Fast] Result:', JSON.stringify(data).substring(0, 300));

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl: data.video.url,
      model: 'veo3-fast',
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    model: 'veo3-fast',
  });
}

/**
 * Check Veo 3.1 First-Last-Frame/FAL result
 */
async function checkVeo3FirstLastResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  const pollResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/fast/first-last-frame-to-video/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Veo3FirstLast] Poll error:', errorText);
    
    if (pollResponse.status === 404) {
      return await getVeo3FirstLastResult(req, res, requestId, FAL_KEY);
    }
    
    return res.status(pollResponse.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const data = await pollResponse.json();
  console.log('[JumpStart/Veo3FirstLast] Status response:', JSON.stringify(data).substring(0, 300));

  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getVeo3FirstLastResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'veo3-first-last',
    queuePosition: data.queue_position,
  });
}

/**
 * Get completed Veo 3.1 First-Last-Frame result
 */
async function getVeo3FirstLastResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/fast/first-last-frame-to-video/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Veo3FirstLast] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log('[JumpStart/Veo3FirstLast] Result:', JSON.stringify(data).substring(0, 300));

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl: data.video.url,
      model: 'veo3-first-last',
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    model: 'veo3-first-last',
  });
}

/**
 * Check Veo 3.1 Fast Extend/FAL result
 */
async function checkVeo3FastExtendResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  const pollResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/fast/extend-video/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Veo3 Extend] Poll error:', errorText);
    
    if (pollResponse.status === 404) {
      return await getVeo3FastExtendResult(req, res, requestId, FAL_KEY);
    }
    
    return res.status(pollResponse.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const data = await pollResponse.json();
  console.log('[JumpStart/Veo3 Extend] Status response:', JSON.stringify(data).substring(0, 300));

  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getVeo3FastExtendResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'veo3-fast-extend',
    queuePosition: data.queue_position,
  });
}

/**
 * Get completed Veo 3.1 Fast Extend result
 */
async function getVeo3FastExtendResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/fast/extend-video/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Veo3 Extend] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log('[JumpStart/Veo3 Extend] Result:', JSON.stringify(data).substring(0, 300));

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl: data.video.url,
      model: 'veo3-fast-extend',
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    model: 'veo3-fast-extend',
  });
}

/**
 * Check Kling Video/FAL result
 */
async function checkKlingResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  const pollResponse = await fetch(
    `https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Kling] Poll error:', errorText);
    
    if (pollResponse.status === 404) {
      return await getKlingResult(req, res, requestId, FAL_KEY);
    }
    
    return res.status(pollResponse.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const data = await pollResponse.json();
  console.log('[JumpStart/Kling] Status response:', JSON.stringify(data).substring(0, 300));

  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getKlingResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'kling-video',
    queuePosition: data.queue_position,
  });
}

/**
 * Get completed Kling Video result
 */
async function getKlingResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Kling] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log('[JumpStart/Kling] Result:', JSON.stringify(data).substring(0, 300));

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl: data.video.url,
      model: 'kling-video',
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    model: 'kling-video',
  });
}

/**
 * Check Grok Edit/FAL result
 */
async function checkGrokEditResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  // FAL uses a status endpoint for queued requests
  const pollResponse = await fetch(
    `https://queue.fal.run/xai/grok-imagine-video/edit-video/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Grok Edit] Poll error:', errorText);
    
    // FAL returns 404 when request is complete, try getting result directly
    if (pollResponse.status === 404) {
      return await getGrokEditResult(req, res, requestId, FAL_KEY);
    }
    
    return res.status(pollResponse.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const data = await pollResponse.json();
  console.log('[JumpStart/Grok Edit] Status response:', JSON.stringify(data).substring(0, 300));

  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getGrokEditResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'grok-edit',
    queuePosition: data.queue_position,
  });
}

/**
 * Get completed Grok Edit result
 */
async function getGrokEditResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/xai/grok-imagine-video/edit-video/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Grok Edit] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log('[JumpStart/Grok Edit] Result:', JSON.stringify(data).substring(0, 300));

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
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

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    model: 'grok-edit',
  });
}
