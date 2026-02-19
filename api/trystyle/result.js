import { getUserKeys } from '../lib/getUserKeys.js';

/**
 * Try Style Result API - Check async job status
 * 
 * Supports:
 * - FASHN AI
 * - Flux 2 Lora Gallery
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
  }

  try {
    const { requestId, model = 'fashn' } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    // Route to appropriate status checker
    if (model === 'flux2-lora') {
      return await checkFlux2LoraStatus(req, res, FAL_KEY, requestId);
    } else {
      return await checkFashnStatus(req, res, FAL_KEY, requestId);
    }

  } catch (error) {
    console.error('[Try Style] Result check error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Check FASHN job status
 */
async function checkFashnStatus(req, res, FAL_KEY, requestId) {
  const response = await fetch(`https://fal.run/fal-ai/fashn/tryon/v1.6/status/${requestId}`, {
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Try Style/FASHN] Status check error:', errorText);
    return res.status(response.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const data = await response.json();

  if (data.status === 'COMPLETED' && data.images) {
    const imageUrls = data.images.map(img => img.url || img);
    return res.status(200).json({
      success: true,
      status: 'completed',
      images: imageUrls,
      model: 'fashn',
    });
  }

  if (data.status === 'FAILED') {
    return res.status(200).json({
      success: false,
      status: 'failed',
      error: data.error || 'Generation failed',
      model: 'fashn',
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    model: 'fashn',
  });
}

/**
 * Check Flux 2 Lora Gallery job status
 */
async function checkFlux2LoraStatus(req, res, FAL_KEY, requestId) {
  // Check status endpoint
  const statusResponse = await fetch(
    `https://queue.fal.run/fal-ai/flux-2-lora-gallery/virtual-tryon/requests/${requestId}/status`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!statusResponse.ok) {
    // If 404, try getting the result directly (might be complete)
    if (statusResponse.status === 404) {
      return await getFlux2LoraResult(req, res, FAL_KEY, requestId);
    }
    
    const errorText = await statusResponse.text();
    console.error('[Try Style/Flux2] Status check error:', errorText);
    return res.status(statusResponse.status).json({ 
      error: 'Failed to check status',
      details: errorText 
    });
  }

  const data = await statusResponse.json();
  console.log('[Try Style/Flux2] Status:', data.status);

  const status = data.status?.toLowerCase() || 'processing';

  if (status === 'completed') {
    return await getFlux2LoraResult(req, res, FAL_KEY, requestId);
  }

  if (status === 'failed') {
    return res.status(200).json({
      success: false,
      status: 'failed',
      error: data.error || 'Generation failed',
      model: 'flux2-lora',
    });
  }

  return res.status(200).json({
    success: true,
    status: status === 'in_queue' ? 'queued' : 'processing',
    requestId,
    model: 'flux2-lora',
    queuePosition: data.queue_position,
  });
}

/**
 * Get completed Flux 2 Lora result
 */
async function getFlux2LoraResult(req, res, FAL_KEY, requestId) {
  const resultResponse = await fetch(
    `https://queue.fal.run/fal-ai/flux-2-lora-gallery/virtual-tryon/requests/${requestId}`,
    {
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
      },
    }
  );

  if (!resultResponse.ok) {
    const errorText = await resultResponse.text();
    console.error('[Try Style/Flux2] Result fetch error:', errorText);
    return res.status(500).json({ error: 'Failed to get result' });
  }

  const data = await resultResponse.json();
  console.log('[Try Style/Flux2] Result received');

  if (data.images && Array.isArray(data.images)) {
    const imageUrls = data.images.map(img => img.url || img);
    return res.status(200).json({
      success: true,
      status: 'completed',
      images: imageUrls,
      model: 'flux2-lora',
      seed: data.seed,
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    model: 'flux2-lora',
  });
}
