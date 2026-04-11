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
 * Download images, zip them with caption files, upload zip to FAL storage,
 * and return a URL that fal.ai can access directly.
 * Uses FAL storage instead of Supabase to bypass the 50MB upload limit.
 *
 * @param {string[]} imageUrls
 * @param {string} defaultCaption - used when no per-image caption is provided
 * @param {string} falKey - FAL API key for storage upload
 * @param {string[]} [captions] - optional per-image captions (indexed by position)
 */
async function createTrainingZip(imageUrls, defaultCaption, falKey, captions) {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks = [];
      const passthrough = new PassThrough();
      passthrough.on('data', (chunk) => chunks.push(chunk));
      passthrough.on('end', async () => {
        try {
          const zipBuffer = Buffer.concat(chunks);
          const sizeMB = (zipBuffer.length / 1024 / 1024).toFixed(1);
          console.log(`[LoRA Train] Zip created: ${zipBuffer.length} bytes (${sizeMB} MB)`);

          // Upload to FAL storage via two-step initiate + PUT flow
          const fileName = `lora-training-${Date.now()}.zip`;

          // Step 1: Initiate — register the upload, get pre-signed URL + final CDN URL
          const initiateRes = await fetch('https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3', {
            method: 'POST',
            headers: {
              'Authorization': `Key ${falKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content_type: 'application/zip',
              file_name: fileName,
            }),
          });

          if (!initiateRes.ok) {
            const errText = await initiateRes.text();
            reject(new Error(`FAL upload initiate failed (${initiateRes.status}): ${errText.substring(0, 200)}`));
            return;
          }

          const { upload_url: uploadUrl, file_url: fileUrl } = await initiateRes.json();

          // Step 2: PUT the zip bytes to the pre-signed upload URL
          const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/zip' },
            body: zipBuffer,
          });

          if (!putRes.ok) {
            const errText = await putRes.text();
            reject(new Error(`FAL upload PUT failed (${putRes.status}): ${errText.substring(0, 200)}`));
            return;
          }

          console.log(`[LoRA Train] Zip uploaded to FAL storage: ${fileUrl}`);
          resolve(fileUrl);
        } catch (err) {
          reject(err);
        }
      });

      const archive = archiver('zip', { zlib: { level: 5 } });
      archive.on('error', (err) => reject(err));
      archive.pipe(passthrough);

      let downloadedCount = 0;
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        console.log(`[LoRA Train] Downloading image ${i + 1}/${imageUrls.length}: ${url.substring(0, 80)}...`);

        try {
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
          downloadedCount++;
        } catch (dlErr) {
          console.warn(`[LoRA Train] Error downloading image ${i + 1}:`, dlErr.message);
        }
      }

      if (downloadedCount === 0) {
        reject(new Error(`No images could be downloaded (0/${imageUrls.length} succeeded)`));
        return;
      }
      console.log(`[LoRA Train] ${downloadedCount}/${imageUrls.length} images included in zip`);
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

  const MAX_TRAINING_IMAGES = 25;

  if (!name || !trigger_word || !image_urls?.length) {
    return res.status(400).json({ error: 'Missing name, trigger_word, or image_urls' });
  }

  if (image_urls.length > MAX_TRAINING_IMAGES) {
    return res.status(400).json({ error: `Maximum ${MAX_TRAINING_IMAGES} training images allowed. You uploaded ${image_urls.length}.` });
  }

  // Resolve training model from registry
  const model = getTrainingModel(modelId);
  if (!model) {
    return res.status(400).json({ error: `Unknown training model: ${modelId}` });
  }

  // Validate: video training models (I2V) require video files, not images
  if (model.category === 'video' && model.id !== 'hunyuan-video') {
    const hasVideoFiles = image_urls.some(url => /\.(mp4|mov|webm|avi)(\?|$)/i.test(url));
    if (!hasVideoFiles) {
      return res.status(400).json({
        error: `${model.name} requires video clips as training data, not still images. Use an Image Model (e.g. FLUX LoRA Fast) for image-only datasets.`,
      });
    }
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

  // Create zip archive of training images with captions (uploaded to FAL storage)
  let zipUrl;
  try {
    zipUrl = await createTrainingZip(image_urls, defaultCaption, falKey, captions);
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

  console.log(`[LoRA Train] Model: ${modelId}, Steps: ${steps}, LR: ${learning_rate}, Body keys: ${Object.keys(body).join(', ')}`);

  let response;
  try {
    response = await fetch(`https://queue.fal.run/${model.endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (fetchErr) {
    console.error('[LoRA Train] FAL request network error:', fetchErr.message);
    return res.status(502).json({ error: `Failed to reach training API: ${fetchErr.message}` });
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = 'LoRA training submission failed';
    try {
      const parsed = JSON.parse(errorText);
      errorMsg = parsed.detail || parsed.message || parsed.error || errorMsg;
    } catch {}
    console.error(`[LoRA Train] FAL error ${response.status}:`, errorText.substring(0, 500));
    return res.status(response.status).json({ error: errorMsg, details: errorText });
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
