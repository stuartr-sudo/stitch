/**
 * Imagineer - Check Image Generation Result
 * Polls Wavespeed or SeedDream (fal.ai) for async image results
 */

import { getUserKeys } from '../lib/getUserKeys.js';

const SEEDDREAM_ENDPOINT = 'fal-ai/bytedance/seedream/v4.5/text-to-image';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId, model = 'wavespeed' } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Missing requestId' });
    }

    console.log('[Imagineer/Result] Checking:', requestId, '| Model:', model);

    if (model === 'seeddream') {
      return pollSeedDream(req, res, requestId);
    }
    return pollWavespeed(req, res, requestId);
  } catch (error) {
    console.error('[Imagineer/Result] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function pollWavespeed(req, res, requestId) {
  const { wavespeedKey: WAVESPEED_API_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!WAVESPEED_API_KEY) {
    return res.status(400).json({ error: 'Wavespeed API key not configured.' });
  }

  const pollResponse = await fetch(
    `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
    { headers: { 'Authorization': `Bearer ${WAVESPEED_API_KEY}` } }
  );

  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    console.error('[Imagineer/Result] Wavespeed poll error:', errorText);
    return res.status(pollResponse.status).json({ error: 'Failed to check status', details: errorText });
  }

  const pollDataRaw = await pollResponse.json();
  const data = pollDataRaw?.data ?? pollDataRaw;
  const statusRaw = data?.status ?? pollDataRaw?.status ?? null;
  const status = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : statusRaw;

  const outputs = data?.outputs ?? pollDataRaw?.outputs ?? [];
  let imageUrl = null;

  if (status === 'completed') {
    const first = Array.isArray(outputs) ? outputs[0] : null;
    imageUrl = typeof first === 'string' ? first : (first?.url ?? null);
  }

  console.log('[Imagineer/Result] Wavespeed status:', status, '| URL:', imageUrl ? 'found' : 'none');

  return res.status(200).json({ success: true, status, requestId, imageUrl, error: data?.error || null });
}

async function pollSeedDream(req, res, requestId) {
  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'Fal.ai API key not configured.' });
  }

  const headers = { 'Authorization': `Key ${FAL_KEY}` };

  const statusResponse = await fetch(
    `https://queue.fal.run/${SEEDDREAM_ENDPOINT}/requests/${requestId}/status?logs=1`,
    { headers }
  );

  if (!statusResponse.ok) {
    const errorText = await statusResponse.text();
    console.error('[Imagineer/Result] SeedDream status error:', errorText);
    return res.status(statusResponse.status).json({ error: 'Failed to check SeedDream status', details: errorText });
  }

  const statusData = await statusResponse.json();
  const queueStatus = statusData.status;
  console.log('[Imagineer/Result] SeedDream queue status:', queueStatus);

  if (queueStatus === 'COMPLETED') {
    const resultResponse = await fetch(
      `https://queue.fal.run/${SEEDDREAM_ENDPOINT}/requests/${requestId}`,
      { headers }
    );

    if (!resultResponse.ok) {
      return res.status(resultResponse.status).json({ error: 'Failed to fetch SeedDream result' });
    }

    const resultData = await resultResponse.json();
    const imageUrl = resultData.images?.[0]?.url || null;

    console.log('[Imagineer/Result] SeedDream completed, URL:', imageUrl ? 'found' : 'none');

    return res.status(200).json({
      success: true,
      status: 'completed',
      requestId,
      imageUrl,
    });
  }

  const normalizedStatus = queueStatus === 'IN_QUEUE' ? 'processing' : queueStatus === 'IN_PROGRESS' ? 'processing' : 'processing';

  return res.status(200).json({
    success: true,
    status: normalizedStatus,
    requestId,
    imageUrl: null,
    queuePosition: statusData.queue_position ?? null,
  });
}
