import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { getTrainingModel } from '../lib/trainingModelRegistry.js';
import archiver from 'archiver';
import { PassThrough, Readable } from 'stream';

// Caption templates per training type
const CAPTION_TEMPLATES = {
  subject:   (tw) => `a photo of ${tw}`,
  style:     (tw) => `an image in ${tw} style`,
  character: (tw) => `a portrait of ${tw}, face visible`,
};

/**
 * Download images, zip them with caption files, upload zip to Supabase storage,
 * and return a public URL that fal.ai can access.
 *
 * @param {string[]} imageUrls
 * @param {string} defaultCaption - used when no per-image caption is provided
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} [captions] - optional per-image captions (indexed by position)
 */
async function createTrainingZip(imageUrls, defaultCaption, supabase, captions) {
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

        const baseName = `image_${String(i).padStart(3, '0')}`;

        // Use per-image caption if provided, otherwise fall back to template caption
        const caption = (captions && captions[i]) ? captions[i] : defaultCaption;

        // Stream image body directly into archiver to avoid holding all images in memory
        const bodyStream = Readable.fromWeb(response.body);
        archive.append(bodyStream, { name: `${baseName}.${ext}` });
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
    name,
    trigger_word,
    image_urls,
    model: modelId = 'flux-lora-fast',
    training_type = 'subject',
    is_style = false,
    create_masks = true,
    captions,
    steps: stepsOverride,
    learning_rate: lrOverride,
    brand_username,
    visual_subject_id,
  } = req.body;

  if (!name || !trigger_word || !image_urls?.length) {
    return res.status(400).json({ error: 'Missing name, trigger_word, or image_urls' });
  }

  // Resolve training model from registry
  const model = getTrainingModel(modelId);
  if (!model) {
    return res.status(400).json({ error: `Unknown training model: ${modelId}` });
  }

  // Clamp steps and learning_rate using model's range and defaults
  const steps = stepsOverride
    ? Math.max(model.stepRange[0], Math.min(model.stepRange[1], stepsOverride))
    : model.defaults.steps;
  const learning_rate = lrOverride || model.defaults.learning_rate;

  const { falKey } = await getUserKeys(req.user.id, req.user.email);
  if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Determine caption template for this training type
  const captionTemplate = CAPTION_TEMPLATES[training_type] || CAPTION_TEMPLATES.subject;
  const defaultCaption = captionTemplate(trigger_word);

  // Create zip archive of training images with captions
  let zipUrl;
  try {
    zipUrl = await createTrainingZip(image_urls, defaultCaption, supabase, captions);
  } catch (err) {
    console.error('[LoRA Train] Failed to create training zip:', err);
    return res.status(500).json({ error: 'Failed to prepare training images', details: err.message });
  }

  console.log(`[LoRA Train] Submitting to ${model.endpoint} with zip: ${zipUrl}`);

  // Build request body via model registry
  const body = model.buildBody({
    zipUrl,
    trigger_word,
    steps,
    learning_rate,
    is_style,
    create_masks,
    default_caption: defaultCaption,
    auto_caption: !captions?.length, // use auto-caption only if no manual captions provided
  });

  const response = await fetch(`https://queue.fal.run/${model.endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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
      rank: null,
      steps,
      learning_rate,
      brand_username: brand_username || null,
      visual_subject_id: visual_subject_id || null,
      lora_type: 'custom',
      training_model: modelId,
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
    model: modelId,
    endpoint: model.endpoint,
  });
}
