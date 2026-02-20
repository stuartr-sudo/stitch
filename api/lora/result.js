import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';

const LORA_ENDPOINT = 'fal-ai/flux-lora-fast-training';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { requestId, loraId, statusUrl, responseUrl } = req.body;
  if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

  const { falKey } = await getUserKeys(req.user.id, req.user.email);
  if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const headers = { 'Authorization': `Key ${falKey}` };

  const checkUrl = statusUrl
    ? `${statusUrl}?logs=1`
    : `https://queue.fal.run/${LORA_ENDPOINT}/requests/${requestId}/status?logs=1`;

  const statusResponse = await fetch(checkUrl, { headers });
  if (!statusResponse.ok) {
    return res.status(statusResponse.status).json({ error: 'Failed to check training status' });
  }

  const statusData = await statusResponse.json();

  if (statusData.status === 'COMPLETED') {
    const resultUrl = responseUrl || `https://queue.fal.run/${LORA_ENDPOINT}/requests/${requestId}`;
    const resultResponse = await fetch(resultUrl, { headers });
    const resultData = await resultResponse.json();

    const modelUrl = resultData.diffusers_lora_file?.url || null;

    if (loraId && modelUrl) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await supabase
        .from('brand_loras')
        .update({ fal_model_url: modelUrl, status: 'ready' })
        .eq('id', loraId);
    }

    return res.json({ success: true, status: 'completed', modelUrl, requestId });
  }

  return res.json({
    success: true,
    status: 'training',
    requestId,
    queuePosition: statusData.queue_position ?? null,
  });
}
