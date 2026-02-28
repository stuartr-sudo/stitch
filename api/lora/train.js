import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';

// Smart defaults per training type
const TRAINING_DEFAULTS = {
  product:   { rank: 16, steps: 1000, learning_rate: 0.0004, caption: (tw) => `a photo of ${tw}` },
  style:     { rank: 32, steps: 1500, learning_rate: 0.0002, caption: (tw) => `an image in ${tw} style` },
  character: { rank: 16, steps: 1200, learning_rate: 0.0003, caption: (tw) => `a portrait of ${tw}, face visible` },
};

const VALID_RANKS = [4, 8, 16, 32, 64];
const VALID_TYPES = ['product', 'style', 'character'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, trigger_word, image_urls,
    training_type = 'product',
    rank: rankOverride,
    steps: stepsOverride,
    learning_rate: lrOverride,
    brand_username,
    visual_subject_id,
  } = req.body;

  if (!name || !trigger_word || !image_urls?.length) {
    return res.status(400).json({ error: 'Missing name, trigger_word, or image_urls' });
  }

  if (!VALID_TYPES.includes(training_type)) {
    return res.status(400).json({ error: `Invalid training_type. Must be one of: ${VALID_TYPES.join(', ')}` });
  }

  const defaults = TRAINING_DEFAULTS[training_type];
  const rank = rankOverride && VALID_RANKS.includes(rankOverride) ? rankOverride : defaults.rank;
  const steps = stepsOverride ? Math.max(500, Math.min(2000, stepsOverride)) : defaults.steps;
  const learning_rate = lrOverride ? Math.max(0.0001, Math.min(0.001, lrOverride)) : defaults.learning_rate;

  const { falKey } = await getUserKeys(req.user.id, req.user.email);
  if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const response = await fetch('https://queue.fal.run/fal-ai/flux-lora-fast-training', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images_data_url: image_urls.map(url => ({ url, caption: defaults.caption(trigger_word) })),
      trigger_word,
      steps,
      rank,
      learning_rate,
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
      training_type,
      rank,
      steps,
      learning_rate,
      brand_username: brand_username || null,
      visual_subject_id: visual_subject_id || null,
      lora_type: 'custom',
    })
    .select()
    .single();

  if (error) console.error('[LoRA Train] DB insert error:', error.message);

  // Mark visual subject as training if linked
  if (visual_subject_id) {
    await supabase
      .from('visual_subjects')
      .update({ training_status: 'training' })
      .eq('id', visual_subject_id);
  }

  return res.json({
    success: true,
    requestId,
    loraId: lora?.id || null,
    status: 'training',
    statusUrl: data.status_url || null,
    responseUrl: data.response_url || null,
  });
}
