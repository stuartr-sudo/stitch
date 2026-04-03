import { getUserKeys } from '../lib/getUserKeys.js';
import { MOTION_TRANSFER_MODELS } from '../lib/motionTransferRegistry.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
    if (!FAL_KEY) return res.status(400).json({ error: 'FAL API key not configured.' });

    const { predictionId, model = 'wan_motion' } = req.query;
    if (!predictionId) return res.status(400).json({ error: 'Missing predictionId' });

    const modelConfig = MOTION_TRANSFER_MODELS[model];
    if (!modelConfig) return res.status(400).json({ error: `Unknown model: ${model}` });

    const headers = { 'Authorization': `Key ${FAL_KEY}` };
    // Use full endpoint path from registry (fixes pre-existing truncated path bug)
    const queuePath = modelConfig.endpoint;

    const statusCheckUrl = `https://queue.fal.run/${queuePath}/requests/${predictionId}/status`;
    const statusRes = await fetch(statusCheckUrl, { headers });

    if (!statusRes.ok) return res.json({ status: 'processing', predictionId });

    const statusData = await statusRes.json();

    if (statusData.status === 'COMPLETED') {
      const resultRes = await fetch(`https://queue.fal.run/${queuePath}/requests/${predictionId}`, { headers });
      const resultData = await resultRes.json();
      const videoUrl = modelConfig.parseResult(resultData);

      if (videoUrl) return res.json({ status: 'completed', outputUrl: videoUrl });
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
