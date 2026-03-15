/**
 * Imagineer - Check Image Generation Result
 * Polls Nano Banana 2 or Flux 2 (fal.ai) for async image results
 */

import { getUserKeys } from '../lib/getUserKeys.js';

const NANO_BANANA_2_ENDPOINT = 'fal-ai/nano-banana-2';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId, model = 'nano-banana-2' } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    console.log('[Imagineer/Result] Checking:', requestId, '| Model:', model);

    // Map model IDs to fal.ai queue endpoints
    const endpointMap = {
      'fal-flux':           'fal-ai/flux-2/lora',
      'fal-flux-edit':      'fal-ai/flux-2/lora/edit',
      'nano-banana-pro':    'fal-ai/nano-banana-pro/edit',
      'seedream':           'fal-ai/bytedance/seedream/v4.5/edit',
    };

    if (endpointMap[model]) {
      return pollFalFlux(req, res, requestId, endpointMap[model]);
    }
    // Default: nano-banana-2 (both generate and edit share the same queue namespace)
    return pollNanoBanana2(req, res, requestId);
  } catch (error) {
    console.error('[Imagineer/Result] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function pollNanoBanana2(req, res, requestId) {
  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'Fal.ai API key not configured.' });
  }

  const headers = { 'Authorization': `Key ${FAL_KEY}` };

  const statusUrlFromClient = req.body.statusUrl;
  const responseUrlFromClient = req.body.responseUrl;

  const checkUrl = statusUrlFromClient
    ? `${statusUrlFromClient}?logs=1`
    : `https://queue.fal.run/${NANO_BANANA_2_ENDPOINT}/requests/${requestId}/status?logs=1`;

  console.log('[Imagineer/Result] Nano Banana 2 polling:', checkUrl);

  const statusResponse = await fetch(checkUrl, { headers });

  if (!statusResponse.ok) {
    const errorText = await statusResponse.text();
    console.error('[Imagineer/Result] Nano Banana 2 status error:', statusResponse.status, errorText);
    return res.status(statusResponse.status).json({ error: 'Failed to check Nano Banana 2 status', details: errorText });
  }

  const statusData = await statusResponse.json();
  const queueStatus = statusData.status;
  console.log('[Imagineer/Result] Nano Banana 2 queue status:', queueStatus);

  if (queueStatus === 'COMPLETED') {
    const resultUrl = responseUrlFromClient
      || `https://queue.fal.run/${NANO_BANANA_2_ENDPOINT}/requests/${requestId}`;

    const resultResponse = await fetch(resultUrl, { headers });

    if (!resultResponse.ok) {
      return res.status(resultResponse.status).json({ error: 'Failed to fetch Nano Banana 2 result' });
    }

    const resultData = await resultResponse.json();
    const imageUrl = resultData.images?.[0]?.url || null;

    console.log('[Imagineer/Result] Nano Banana 2 completed, URL:', imageUrl ? 'found' : 'none');

    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      imageUrl,
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    imageUrl: null,
    queuePosition: statusData.queue_position ?? null,
  });
}

async function pollFalFlux(req, res, requestId, endpoint = 'fal-ai/flux-2/lora') {
  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const headers = { 'Authorization': `Key ${FAL_KEY}` };
  const checkUrl = `https://queue.fal.run/${endpoint}/requests/${requestId}/status?logs=1`;

  const statusResponse = await fetch(checkUrl, { headers });
  if (!statusResponse.ok) {
    const errorText = await statusResponse.text();
    return res.status(statusResponse.status).json({ error: 'Status check failed', details: errorText });
  }

  const statusData = await statusResponse.json();

  if (statusData.status === 'COMPLETED') {
    const resultUrl = `https://queue.fal.run/${endpoint}/requests/${requestId}`;
    const resultResponse = await fetch(resultUrl, { headers });
    
    if (!resultResponse.ok) {
      return res.status(resultResponse.status).json({ error: 'Failed to fetch Flux result' });
    }

    const resultData = await resultResponse.json();
    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      imageUrl: resultData.images?.[0]?.url || null,
    });
  }

  return res.status(200).json({
    success: true,
    status: 'processing',
    requestId,
    imageUrl: null,
  });
}
