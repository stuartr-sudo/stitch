import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import archiver from 'archiver';
import { PassThrough } from 'stream';

// Smart defaults per training type
const TRAINING_DEFAULTS = {
  product:   { rank: 16, steps: 1000, learning_rate: 0.0004, caption: (tw) => `a photo of ${tw}` },
  style:     { rank: 32, steps: 1500, learning_rate: 0.0002, caption: (tw) => `an image in ${tw} style` },
  character: { rank: 16, steps: 1200, learning_rate: 0.0003, caption: (tw) => `a portrait of ${tw}, face visible` },
};

const VALID_RANKS = [4, 8, 16, 32, 64];
const VALID_TYPES = ['product', 'style', 'character'];

/**
 * Download images, zip them with caption files, upload zip to Supabase storage,
 * and return a public URL that fal.ai can access.
 */
async function createTrainingZip(imageUrls, caption, supabase) {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks = [];
      const passthrough = new PassThrough();
      passthrough.on('data', (chunk) => chunks.push(chunk));
      passthrough.on('end', async () => {
        try {
          const zipBuffer = Buffer.concat(chunks);
          console.log(`[LoRA Train] Zip created: ${zipBuffer.length} bytes`);

          const fileName = `lora-training-${Date.now()}-${Math.random().toString(36).substring(7)}.zip`;
          const filePath = `training/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(filePath, zipBuffer, {
              contentType: 'application/zip',
              upsert: false,
            });

          if (uploadError) {
            reject(new Error(`Failed to upload zip: ${uploadError.message}`));
            return;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

          console.log(`[LoRA Train] Zip uploaded: ${publicUrl}`);
          resolve(publicUrl);
        } catch (err) {
          reject(err);
        }
      });

      const archive = archiver('zip', { zlib: { level: 5 } });
      archive.on('error', (err) => reject(err));
      archive.pipe(passthrough);

      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        console.log(`[LoRA Train] Downloading image ${i + 1}/${imageUrls.length}: ${url.substring(0, 80)}...`);

        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`[LoRA Train] Failed to download image ${i + 1}: ${response.status}`);
          continue;
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
          : contentType.includes('webp') ? 'webp'
          : 'png';

        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const baseName = `image_${String(i).padStart(3, '0')}`;

        // Add image file
        archive.append(imageBuffer, { name: `${baseName}.${ext}` });
        // Add caption file (same name, .txt extension)
        archive.append(caption, { name: `${baseName}.txt` });
      }

      archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
}

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

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Create zip archive of training images with captions
  let zipUrl;
  try {
    const caption = defaults.caption(trigger_word);
    zipUrl = await createTrainingZip(image_urls, caption, supabase);
  } catch (err) {
    console.error('[LoRA Train] Failed to create training zip:', err);
    return res.status(500).json({ error: 'Failed to prepare training images', details: err.message });
  }

  console.log(`[LoRA Train] Submitting to fal.ai with zip: ${zipUrl}`);

  const response = await fetch('https://queue.fal.run/fal-ai/flux-lora-fast-training', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images_data_url: zipUrl,
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
