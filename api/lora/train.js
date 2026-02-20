import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, trigger_word, image_urls } = req.body;
  if (!name || !trigger_word || !image_urls?.length) {
    return res.status(400).json({ error: 'Missing name, trigger_word, or image_urls' });
  }

  const { falKey } = await getUserKeys(req.user.id, req.user.email);
  if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const response = await fetch('https://queue.fal.run/fal-ai/flux-lora-fast-training', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images_data_url: image_urls.map(url => ({ url, caption: `a photo of ${trigger_word}` })),
      trigger_word,
      steps: 1000,
      rank: 16,
      learning_rate: 0.0004,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return res.status(response.status).json({ error: 'LoRA training submission failed', details: errorText });
  }

  const data = await response.json();
  const requestId = data.request_id;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: lora, error } = await supabase
    .from('brand_loras')
    .insert({
      user_id: req.user.id,
      name,
      trigger_word,
      fal_request_id: requestId,
      status: 'training',
      training_images_count: image_urls.length,
    })
    .select()
    .single();

  if (error) console.error('[LoRA Train] DB insert error:', error.message);

  return res.json({
    success: true,
    requestId,
    loraId: lora?.id || null,
    status: 'training',
    statusUrl: data.status_url || null,
    responseUrl: data.response_url || null,
  });
}
