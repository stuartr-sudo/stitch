import { getUserKeys } from '../lib/getUserKeys.js';

const ANIMATE_ENDPOINTS = {
  move: 'fal-ai/wan/v2.2-14b/animate/move',
  replace: 'fal-ai/wan/v2.2-14b/animate/replace',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { requestId, mode = 'move' } = req.body;

    if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

    const endpoint = ANIMATE_ENDPOINTS[mode];
    if (!endpoint) return res.status(400).json({ error: 'Invalid mode' });

    const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
    if (!FAL_KEY) {
      return res.status(400).json({ error: 'Fal.ai API key not configured.' });
    }

    const headers = { 'Authorization': `Key ${FAL_KEY}` };

    const statusResponse = await fetch(
      `https://queue.fal.run/${endpoint}/requests/${requestId}/status?logs=1`,
      { headers }
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('[Animate/Result] Status error:', errorText);
      return res.status(statusResponse.status).json({ error: 'Failed to check status', details: errorText });
    }

    const statusData = await statusResponse.json();
    const queueStatus = statusData.status;
    console.log('[Animate/Result] Queue status:', queueStatus);

    if (queueStatus === 'COMPLETED') {
      const resultResponse = await fetch(
        `https://queue.fal.run/${endpoint}/requests/${requestId}`,
        { headers }
      );

      if (!resultResponse.ok) {
        return res.status(resultResponse.status).json({ error: 'Failed to fetch result' });
      }

      const resultData = await resultResponse.json();
      const videoUrl = resultData.video?.url || null;

      console.log('[Animate/Result] Completed, URL:', videoUrl ? 'found' : 'none');

      return res.status(200).json({
        success: true,
        status: 'completed',
        requestId,
        videoUrl,
      });
    }

    return res.status(200).json({
      success: true,
      status: 'processing',
      requestId,
      videoUrl: null,
      queuePosition: statusData.queue_position ?? null,
    });
  } catch (error) {
    console.error('[Animate/Result] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
