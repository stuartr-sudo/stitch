import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
    if (!FAL_KEY) return res.status(400).json({ error: 'FAL API key not configured.' });

    const predictionId = req.query.predictionId;
    const statusUrlParam = req.query.statusUrl;
    const responseUrlParam = req.query.responseUrl;
    if (!predictionId) {
      return res.status(400).json({ error: 'Missing predictionId' });
    }

    const headers = { 'Authorization': `Key ${FAL_KEY}` };
    const queuePath = 'fal-ai/wan';

    // Prefer client-provided URLs, fall back to constructed
    const statusCheckUrl = statusUrlParam || `https://queue.fal.run/${queuePath}/requests/${predictionId}/status`;
    const resultFetchUrl = responseUrlParam || `https://queue.fal.run/${queuePath}/requests/${predictionId}`;

    const statusRes = await fetch(statusCheckUrl, { headers });

    if (!statusRes.ok) {
      return res.json({ status: 'processing', predictionId });
    }

    const statusData = await statusRes.json();

    if (statusData.status === 'COMPLETED') {
      const resultRes = await fetch(resultFetchUrl, { headers });
      const resultData = await resultRes.json();
      const videoUrl = resultData.video?.url;

      if (videoUrl) {
        return res.json({ status: 'completed', outputUrl: videoUrl });
      }
      return res.json({ status: 'failed', error: 'No video in result' });
    }

    if (statusData.status === 'FAILED') {
      return res.json({ status: 'failed', error: statusData.error || 'Generation failed' });
    }

    return res.json({ status: 'processing', predictionId });
  } catch (error) {
    console.error('[MotionTransfer] Result error:', error);
    return res.status(500).json({ error: error.message });
  }
}
