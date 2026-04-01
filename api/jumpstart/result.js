/**
 * JumpStart - Check Video Generation Result
 * Supports polling for both Wavespeed and Grok (FAL.ai) models
 */
import { getUserKeys } from '../lib/getUserKeys.js';

/**
 * Truncate a FAL model path to its first 2 segments for queue polling URLs.
 * e.g. "fal-ai/kling-video/v2.5-turbo/pro/image-to-video" -> "fal-ai/kling-video"
 *      "xai/grok-imagine-video/image-to-video" -> "xai/grok-imagine-video"
 */
function falQueuePath(endpoint) {
  const parts = endpoint.split('/');
  return parts.slice(0, 2).join('/');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId, model = 'wavespeed-wan', statusUrl, responseUrl } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    console.log('[JumpStart/Result] Checking:', { requestId, model });

    const { falKey: FAL_KEY, wavespeedKey: WAVESPEED_API_KEY } = await getUserKeys(req.user.id, req.user.email);

    if (model === 'bria-erase') {
      return await checkFalResult(req, res, requestId, FAL_KEY, 'bria/video/erase/prompt', model);
    } else if (model === 'kling-r2v-pro' || model === 'kling-r2v-standard') {
      const tier = model === 'kling-r2v-pro' ? 'pro' : 'standard';
      return await checkFalResult(req, res, requestId, FAL_KEY, `fal-ai/kling-video/o3/${tier}/reference-to-video`, model);
    } else if (model === 'kling-o3-v2v-pro' || model === 'kling-o3-v2v-standard') {
      const tier = model === 'kling-o3-v2v-pro' ? 'pro' : 'standard';
      return await checkFalResult(req, res, requestId, FAL_KEY, `fal-ai/kling-video/o3/${tier}/video-to-video`, model);
    } else if (model === 'ltx-iclora') {
      // Try distilled image-to-video first (most common path)
      return await checkFalResult(req, res, requestId, FAL_KEY, 'fal-ai/ltx-2-19b/distilled/image-to-video/lora', model);
    } else if (model === 'veo3') {
      return await checkVeo3Result(req, res, requestId, FAL_KEY, statusUrl, responseUrl);
    } else if (model === 'veo3-fast') {
      return await checkVeo3FastResult(req, res, requestId, FAL_KEY);
    } else if (model === 'veo3-first-last') {
      return await checkVeo3FirstLastResult(req, res, requestId, FAL_KEY);
    } else if (model === 'veo3-lite') {
      return await checkVeo3LiteResult(req, res, requestId, FAL_KEY);
    } else if (model === 'veo3-lite-first-last') {
      return await checkVeo3LiteFirstLastResult(req, res, requestId, FAL_KEY);
    } else if (model === 'pixverse-v6') {
      return await checkFalResult(req, res, requestId, FAL_KEY, 'fal-ai/pixverse/v6/image-to-video', model);
    } else if (model === 'veo3-fast-extend') {
      return await checkVeo3FastExtendResult(req, res, requestId, FAL_KEY);
    } else if (model === 'ltx-audio-video') {
      return await checkLtxResult(req, res, requestId, FAL_KEY);
    } else if (model === 'kling-video') {
      return await checkKlingResult(req, res, requestId, FAL_KEY);
    } else if (model === 'seedance-pro') {
      return await checkSeedanceResult(req, res, requestId, FAL_KEY);
    } else if (model === 'grok-imagine') {
      return await checkGrokResult(req, res, requestId, FAL_KEY);
    } else if (model === 'grok-r2v') {
      return await checkGrokR2VResult(req, res, requestId, FAL_KEY);
    } else if (model === 'grok-imagine-extend') {
      return await checkGrokExtendResult(req, res, requestId, FAL_KEY);
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
    `https://queue.fal.run/xai/grok-imagine-video/requests/${requestId}/status`,
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
    `https://queue.fal.run/xai/grok-imagine-video/requests/${requestId}`,
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
 * Check Grok R2V (Reference-to-Video) result
 */
async function checkGrokR2VResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured.' });
  }

  const pollResponse = await fetch(
    `https://queue.fal.run/xai/grok-imagine-video/reference-to-video/requests/${requestId}/status`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );

  if (!pollResponse.ok) {
    if (pollResponse.status === 404) {
      return await getGrokR2VResult(req, res, requestId, FAL_KEY);
    }
    const errorText = await pollResponse.text();
    console.error('[JumpStart/GrokR2V] Poll error:', errorText);
    return res.status(pollResponse.status).json({ error: 'Failed to check status', details: errorText });
  }

  const data = await pollResponse.json();
  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getGrokR2VResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'grok-r2v',
    queuePosition: data.queue_position,
  });
}

async function getGrokR2VResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/xai/grok-imagine-video/reference-to-video/requests/${requestId}`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/GrokR2V] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl: data.video.url,
      model: 'grok-r2v',
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
    model: 'grok-r2v',
  });
}

/**
 * Check Grok Imagine Extend/FAL result
 */
async function checkGrokExtendResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  const pollResponse = await fetch(
    `https://queue.fal.run/xai/grok-imagine-video/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Grok Extend] Poll error:', errorText);

    if (pollResponse.status === 404) {
      return await getGrokExtendResult(req, res, requestId, FAL_KEY);
    }

    return res.status(pollResponse.status).json({
      error: 'Failed to check status',
      details: errorText
    });
  }

  const data = await pollResponse.json();
  console.log('[JumpStart/Grok Extend] Status response:', JSON.stringify(data).substring(0, 300));

  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getGrokExtendResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'grok-imagine-extend',
    queuePosition: data.queue_position,
  });
}

/**
 * Get completed Grok Imagine Extend result
 */
async function getGrokExtendResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/xai/grok-imagine-video/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Grok Extend] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log('[JumpStart/Grok Extend] Result:', JSON.stringify(data).substring(0, 300));

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl: data.video.url,
      model: 'grok-imagine-extend',
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
    model: 'grok-imagine-extend',
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
    `https://queue.fal.run/fal-ai/bytedance/requests/${requestId}/status`,
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
    `https://queue.fal.run/fal-ai/bytedance/requests/${requestId}`,
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
async function checkVeo3Result(req, res, requestId, FAL_KEY, statusUrl, responseUrl) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  // Use the status URL returned by FAL's queue — don't construct URLs manually
  const actualStatusUrl = statusUrl || `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}/status`;
  console.log('[JumpStart/Veo3] Polling:', actualStatusUrl);

  const pollResponse = await fetch(
    actualStatusUrl,
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
      const fallbackResultUrl = responseUrl || `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}`;
      return await getVeo3Result(req, res, requestId, FAL_KEY, fallbackResultUrl);
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
    // Use response_url from status response or the one passed from frontend
    const actualResponseUrl = data.response_url || responseUrl || `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}`;
    return await getVeo3Result(req, res, requestId, FAL_KEY, actualResponseUrl);
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
async function getVeo3Result(req, res, requestId, FAL_KEY, resultUrl) {
  console.log('[JumpStart/Veo3] Fetching result from:', resultUrl);
  const resultResponse = await fetch(
    resultUrl,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Veo3] Result fetch error:', errorText);
    return res.status(200).json({ status: 'failed', error: 'Result expired or not found. The generation may have failed on FAL side.' });
  }

  const data = await resultResponse.json();
  console.log('[JumpStart/Veo3] Full result keys:', Object.keys(data));
  console.log('[JumpStart/Veo3] Result:', JSON.stringify(data).substring(0, 500));

  // Try multiple response formats — R2V may differ from standard Veo
  const videoUrl = data.video?.url || data.output?.video?.url || data.videos?.[0]?.url || data.url;

  if (videoUrl) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl,
      model: 'veo3',
    });
  }

  // If no video URL found, return failed status so frontend stops polling
  console.error('[JumpStart/Veo3] No video URL in completed result:', JSON.stringify(data).substring(0, 500));
  return res.status(200).json({
    status: 'failed',
    error: 'Generation completed but no video URL in response',
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
    `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}/status`,
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
    `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}`,
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
    `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}/status`,
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
    `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}`,
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
 * Check Veo 3.1 Lite I2V result — same queue base as Fast (fal-ai/veo3.1)
 */
async function checkVeo3LiteResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  const pollResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}/status`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Veo3Lite] Poll error:', errorText);
    if (pollResponse.status === 404) {
      return await getVeo3LiteResult(req, res, requestId, FAL_KEY);
    }
    return res.status(pollResponse.status).json({ error: 'Failed to check status', details: errorText });
  }

  const data = await pollResponse.json();
  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getVeo3LiteResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'veo3-lite',
    queuePosition: data.queue_position,
  });
}

async function getVeo3LiteResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Veo3Lite] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  if (data.video?.url) {
    return res.status(200).json({
      success: true, status: 'completed', requestId, videoUrl: data.video.url, model: 'veo3-lite',
    });
  }

  return res.status(200).json({ success: true, status: 'processing', requestId, model: 'veo3-lite' });
}

/**
 * Check Veo 3.1 Lite First-Last-Frame result
 */
async function checkVeo3LiteFirstLastResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  const pollResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}/status`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[JumpStart/Veo3LiteFLF] Poll error:', errorText);
    if (pollResponse.status === 404) {
      return await getVeo3LiteFirstLastResult(req, res, requestId, FAL_KEY);
    }
    return res.status(pollResponse.status).json({ error: 'Failed to check status', details: errorText });
  }

  const data = await pollResponse.json();
  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getVeo3LiteFirstLastResult(req, res, requestId, FAL_KEY);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'veo3-lite-first-last',
    queuePosition: data.queue_position,
  });
}

async function getVeo3LiteFirstLastResult(req, res, requestId, FAL_KEY) {
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[JumpStart/Veo3LiteFLF] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  if (data.video?.url) {
    return res.status(200).json({
      success: true, status: 'completed', requestId, videoUrl: data.video.url, model: 'veo3-lite-first-last',
    });
  }

  return res.status(200).json({ success: true, status: 'processing', requestId, model: 'veo3-lite-first-last' });
}

/**
 * Check Veo 3.1 Fast Extend/FAL result
 */
async function checkVeo3FastExtendResult(req, res, requestId, FAL_KEY) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  const pollResponse = await fetch(
    `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}/status`,
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
    `https://queue.fal.run/fal-ai/veo3.1/requests/${requestId}`,
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
    `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}/status`,
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
    `https://queue.fal.run/fal-ai/kling-video/requests/${requestId}`,
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
    `https://queue.fal.run/xai/grok-imagine-video/requests/${requestId}/status`,
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
    `https://queue.fal.run/xai/grok-imagine-video/requests/${requestId}`,
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

/**
 * Check LTX Audio-to-Video result
 */
async function checkLtxResult(req, res, requestId, FAL_KEY) {
  const pollResponse = await fetch(
    `https://queue.fal.run/fal-ai/ltx-2-19b/requests/${requestId}/status`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );

  if (!pollResponse.ok) {
    if (pollResponse.status === 404) {
      const resultResponse = await fetch(
        `https://queue.fal.run/fal-ai/ltx-2-19b/requests/${requestId}`,
        { headers: { 'Authorization': `Key ${FAL_KEY}` } }
      );
      const data = await resultResponse.json();
      if (data.video?.url) {
        return res.status(200).json({ success: true, status: 'completed', requestId, videoUrl: data.video.url, model: 'ltx-audio-video' });
      }
    }
    return res.status(pollResponse.status).json({ error: 'Failed to check status' });
  }

  const data = await pollResponse.json();
  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    const resultResponse = await fetch(
      `https://queue.fal.run/fal-ai/ltx-2-19b/requests/${requestId}`,
      { headers: { 'Authorization': `Key ${FAL_KEY}` } }
    );
    const resultData = await resultResponse.json();
    return res.status(200).json({ success: true, status: 'completed', requestId, videoUrl: resultData.video?.url, model: 'ltx-audio-video' });
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model: 'ltx-audio-video',
    queuePosition: data.queue_position,
  });
}

/**
 * Generic FAL.ai queue result checker — works for any fal.ai model
 * Reusable for Kling R2V, LTX ICLoRA, Bria, etc.
 */
async function checkFalResult(req, res, requestId, FAL_KEY, endpoint, model) {
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured.' });
  }

  const queueEndpoint = falQueuePath(endpoint);
  const pollResponse = await fetch(
    `https://queue.fal.run/${queueEndpoint}/requests/${requestId}/status`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );

  if (!pollResponse.ok) {
    if (pollResponse.status === 404) {
      // FAL returns 404 when request is complete — fetch result directly
      return await getFalResult(req, res, requestId, FAL_KEY, endpoint, model);
    }
    const errorText = await pollResponse.text();
    console.error(`[JumpStart/${model}] Poll error:`, errorText);
    return res.status(pollResponse.status).json({ error: 'Failed to check status', details: errorText });
  }

  const data = await pollResponse.json();
  console.log(`[JumpStart/${model}] Status:`, JSON.stringify(data).substring(0, 300));
  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getFalResult(req, res, requestId, FAL_KEY, endpoint, model);
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : status,
    requestId,
    model,
    queuePosition: data.queue_position,
  });
}

async function getFalResult(req, res, requestId, FAL_KEY, endpoint, model) {
  const queueEndpoint = falQueuePath(endpoint);
  const resultResponse = await fetch(
    `https://queue.fal.run/${queueEndpoint}/requests/${requestId}`,
    { headers: { 'Authorization': `Key ${FAL_KEY}` } }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error(`[JumpStart/${model}] Result fetch error:`, errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log(`[JumpStart/${model}] Result:`, JSON.stringify(data).substring(0, 300));

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      videoUrl: data.video.url,
      model,
    });
  }

  return res.status(200).json({ success: true, status: 'processing', requestId, model });
}
