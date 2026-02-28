/**
 * POST /api/brand/avatars/:id/train
 *
 * Triggers LoRA training for a visual subject.
 * Uses the subject's reference images to train a custom model.
 *
 * Body: {
 *   image_urls?: string[],       // Additional training images (optional)
 *   trigger_word?: string,       // Override trigger word (defaults to subject name)
 *   training_type?: string,      // 'product' | 'style' | 'character' (default: 'product')
 *   rank?: number,               // 4|8|16|32|64
 *   steps?: number,              // 500-2000
 *   learning_rate?: number,      // 0.0001-0.001
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';

const TRAINING_DEFAULTS = {
  product:   { rank: 16, steps: 1000, learning_rate: 0.0004, caption: (tw) => `a photo of ${tw}` },
  style:     { rank: 32, steps: 1500, learning_rate: 0.0002, caption: (tw) => `an image in ${tw} style` },
  character: { rank: 16, steps: 1200, learning_rate: 0.0003, caption: (tw) => `a portrait of ${tw}, face visible` },
};

const VALID_RANKS = [4, 8, 16, 32, 64];
const VALID_TYPES = ['product', 'style', 'character'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const subjectId = req.params?.id;
  if (!subjectId) return res.status(400).json({ error: 'Visual subject ID required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  // Fetch the visual subject
  const { data: subject, error: subjectErr } = await supabase
    .from('visual_subjects')
    .select('*')
    .eq('id', subjectId)
    .eq('user_id', userId)
    .single();

  if (subjectErr || !subject) {
    return res.status(404).json({ error: 'Visual subject not found' });
  }

  // Gather training images
  const {
    image_urls: extraImages = [],
    trigger_word = subject.name.toLowerCase().replace(/\s+/g, '_'),
    training_type = 'product',
    rank: rankOverride,
    steps: stepsOverride,
    learning_rate: lrOverride,
  } = req.body;

  // Build image list: reference image + any extra images
  const allImages = [];
  if (subject.reference_image_url) allImages.push(subject.reference_image_url);
  if (extraImages?.length) allImages.push(...extraImages);

  if (allImages.length < 1) {
    return res.status(400).json({ error: 'At least one training image is required. Upload a reference image or provide image_urls.' });
  }

  if (!VALID_TYPES.includes(training_type)) {
    return res.status(400).json({ error: `Invalid training_type. Must be one of: ${VALID_TYPES.join(', ')}` });
  }

  const defaults = TRAINING_DEFAULTS[training_type];
  const rank = rankOverride && VALID_RANKS.includes(rankOverride) ? rankOverride : defaults.rank;
  const steps = stepsOverride ? Math.max(500, Math.min(2000, stepsOverride)) : defaults.steps;
  const learning_rate = lrOverride ? Math.max(0.0001, Math.min(0.001, lrOverride)) : defaults.learning_rate;

  const { falKey } = await getUserKeys(userId, req.user.email);
  if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  // Submit training to fal.ai
  const response = await fetch('https://queue.fal.run/fal-ai/flux-lora-fast-training', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images_data_url: allImages.map(url => ({ url, caption: defaults.caption(trigger_word) })),
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

  // Create brand_loras record linked to this visual subject
  const { data: lora, error: loraErr } = await supabase
    .from('brand_loras')
    .insert({
      user_id: userId,
      name: `${subject.name} LoRA`,
      trigger_word,
      fal_request_id: requestId,
      status: 'training',
      training_images_count: allImages.length,
      training_type,
      rank,
      steps,
      learning_rate,
      brand_username: subject.brand_username || null,
      visual_subject_id: subjectId,
      lora_type: 'custom',
    })
    .select()
    .single();

  if (loraErr) console.error('[train-avatar] DB insert error:', loraErr.message);

  // Update visual subject training status
  await supabase
    .from('visual_subjects')
    .update({
      training_status: 'training',
      lora_trigger_word: trigger_word,
      brand_lora_id: lora?.id || null,
    })
    .eq('id', subjectId);

  return res.json({
    success: true,
    requestId,
    loraId: lora?.id || null,
    subjectId,
    status: 'training',
    statusUrl: data.status_url || null,
    responseUrl: data.response_url || null,
  });
}
