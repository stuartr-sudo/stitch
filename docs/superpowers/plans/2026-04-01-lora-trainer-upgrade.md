# LoRA Trainer Major Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the LoRA training system from a single-model, minimal-config trainer to a multi-model, full-featured training studio with AI auto-captioning, advanced settings, and support for 10+ FAL training endpoints (Flux, Wan, Qwen, Z-Image, Hunyuan).

**Architecture:** The training backend gets a model registry pattern (like `mediaGenerator.js`) — a declarative `trainingModelRegistry.js` maps model IDs to FAL endpoints, input schemas, and pricing. The single `train.js` endpoint becomes model-agnostic, dispatching to the correct endpoint based on the selected model. The `result.js` poller already handles multiple response schemas. The frontend `BrandAssetsModal.jsx` gains a new "Model & Settings" step with model selector, training type toggle (Subject/Style), and collapsible advanced settings.

**Tech Stack:** Express API, FAL.ai queue API, Supabase (Postgres + Storage), React + Tailwind + Radix UI, GPT-4.1 mini (vision) for auto-captioning.

---

## File Structure

### New Files
- `api/lib/trainingModelRegistry.js` — Declarative registry of all training models (endpoints, params, pricing, defaults)
- `api/lora/caption.js` — AI auto-captioning endpoint (GPT-4.1 mini vision per image)

### Modified Files
- `api/lora/train.js` — Model-agnostic dispatch via registry, pass all FAL params (`is_style`, `create_masks`, etc.)
- `api/lora/result.js` — Support new model endpoint patterns for status polling
- `src/components/modals/BrandAssetsModal.jsx` — Add model selector, training type, advanced settings, auto-caption toggle
- `server.js` — Register new `/api/lora/caption` route

### Unchanged Files (for reference)
- `api/lora/library.js` — No changes needed
- `api/lora/seed-library.js` — No changes needed (CLI script)
- `api/brand/train-avatar.js` — Will be updated to use registry but lower priority
- `api/lib/resolveLoraConfigs.js` — No changes needed (already handles custom + prebuilt)
- `src/components/LoRAPicker.jsx` — No changes needed (already shows custom LoRAs)

---

## Task 1: Create Training Model Registry

**Files:**
- Create: `api/lib/trainingModelRegistry.js`

- [ ] **Step 1: Create the registry file with all 10 training models**

```javascript
// api/lib/trainingModelRegistry.js

/**
 * Declarative registry of all FAL.ai LoRA training models.
 * Each entry defines the endpoint, supported parameters, defaults, and pricing.
 */

const TRAINING_MODELS = {
  // ── Flux Image Models ──────────────────────────────
  'flux-lora-fast': {
    id: 'flux-lora-fast',
    name: 'Flux LoRA Fast',
    endpoint: 'fal-ai/flux-lora-fast-training',
    baseModel: 'FLUX.1 [dev]',
    category: 'image',
    pricing: '$2 flat per run',
    pricingNote: 'Scales linearly with steps',
    supportsStyle: true,
    supportsMasks: true,
    defaults: {
      steps: 1000,
      learning_rate: null, // not accepted by this endpoint
      create_masks: true,
    },
    stepRange: [1, 10000],
    buildBody: (params) => ({
      images_data_url: params.zipUrl,
      trigger_word: params.trigger_word || undefined,
      steps: params.steps,
      create_masks: params.create_masks ?? true,
      is_style: params.is_style ?? false,
      is_input_format_already_preprocessed: params.is_preprocessed ?? false,
    }),
    parseResult: (data) => ({
      modelUrl: data.diffusers_lora_file?.url || null,
      configUrl: data.config_file?.url || null,
    }),
  },

  'flux-portrait': {
    id: 'flux-portrait',
    name: 'Flux Portrait Trainer',
    endpoint: 'fal-ai/flux-lora-portrait-trainer',
    baseModel: 'FLUX.1 [dev]',
    category: 'image',
    pricing: '$0.0024/step (~$2.40/1000 steps)',
    supportsStyle: false,
    supportsMasks: false,
    defaults: {
      steps: 2500,
      learning_rate: 0.00009,
    },
    stepRange: [1, 10000],
    buildBody: (params) => ({
      images_data_url: params.zipUrl,
      trigger_phrase: params.trigger_word || undefined,
      steps: params.steps,
      learning_rate: params.learning_rate,
      multiresolution_training: true,
      subject_crop: true,
    }),
    parseResult: (data) => ({
      modelUrl: data.diffusers_lora_file?.url || null,
      configUrl: data.config_file?.url || null,
    }),
  },

  'flux-kontext': {
    id: 'flux-kontext',
    name: 'Flux Kontext Trainer',
    endpoint: 'fal-ai/flux-kontext-trainer',
    baseModel: 'FLUX.1 Kontext [dev]',
    category: 'image',
    pricing: '$2.50/1000 steps',
    supportsStyle: false,
    supportsMasks: false,
    defaults: {
      steps: 1000,
      learning_rate: 0.0001,
    },
    stepRange: [500, 10000],
    buildBody: (params) => ({
      image_data_url: params.zipUrl, // note: image_data_url not images_data_url
      steps: params.steps,
      learning_rate: params.learning_rate,
      default_caption: params.default_caption || undefined,
    }),
    parseResult: (data) => ({
      modelUrl: data.diffusers_lora_file?.url || null,
      configUrl: data.config_file?.url || null,
    }),
  },

  // ── Wan Video/Image Models ─────────────────────────
  'wan-21-i2v': {
    id: 'wan-21-i2v',
    name: 'Wan 2.1 I2V Trainer',
    endpoint: 'fal-ai/wan-trainer/i2v-480p',
    baseModel: 'Wan 2.1 I2V 14B',
    category: 'video',
    pricing: '5 credits per run',
    supportsStyle: false,
    supportsMasks: false,
    defaults: {
      steps: 400,
      learning_rate: 0.0002,
    },
    stepRange: [100, 20000],
    inputField: 'training_data_url', // different field name
    buildBody: (params) => ({
      training_data_url: params.zipUrl,
      trigger_phrase: params.trigger_word || undefined,
      number_of_steps: params.steps,
      learning_rate: params.learning_rate,
      auto_scale_input: true,
    }),
    parseResult: (data) => ({
      modelUrl: data.lora_file?.url || null,
      configUrl: data.config_file?.url || null,
    }),
  },

  'wan-22-i2v': {
    id: 'wan-22-i2v',
    name: 'Wan 2.2 I2V Trainer',
    endpoint: 'fal-ai/wan-22-trainer/i2v-a14b',
    baseModel: 'Wan 2.2 I2V-A14B',
    category: 'video',
    pricing: '$0.005/step ($5/1000 steps)',
    supportsStyle: false,
    supportsMasks: false,
    defaults: {
      steps: 400,
      learning_rate: 0.0002,
    },
    stepRange: [100, 20000],
    buildBody: (params) => ({
      training_data_url: params.zipUrl,
      trigger_phrase: params.trigger_word || undefined,
      number_of_steps: params.steps,
      learning_rate: params.learning_rate,
      auto_scale_input: true,
    }),
    parseResult: (data) => ({
      modelUrl: data.lora_file?.url || null,
      configUrl: data.config_file?.url || null,
    }),
  },

  'wan-22-image': {
    id: 'wan-22-image',
    name: 'Wan 2.2 Image Trainer',
    endpoint: 'fal-ai/wan-22-image-trainer',
    baseModel: 'Wan 2.2 T2I',
    category: 'image',
    pricing: '$0.0045/step ($4.50/1000 steps)',
    supportsStyle: true,
    supportsMasks: true,
    defaults: {
      steps: 1000,
      learning_rate: 0.0007,
    },
    stepRange: [10, 6000],
    buildBody: (params) => ({
      training_data_url: params.zipUrl,
      trigger_phrase: params.trigger_word || undefined,
      steps: params.steps,
      learning_rate: params.learning_rate,
      is_style: params.is_style ?? false,
      use_face_detection: params.create_masks ?? true,
      use_masks: params.create_masks ?? true,
      use_face_cropping: false,
    }),
    parseResult: (data) => ({
      modelUrl: data.diffusers_lora_file?.url || data.high_noise_lora?.url || null,
      configUrl: data.config_file?.url || null,
      highNoiseLora: data.high_noise_lora?.url || null,
    }),
  },

  // ── Qwen Models ────────────────────────────────────
  'qwen-image': {
    id: 'qwen-image',
    name: 'Qwen Image Trainer',
    endpoint: 'fal-ai/qwen-image-trainer',
    baseModel: 'Qwen Image',
    category: 'image',
    pricing: '$0.002/step ($2/1000 steps)',
    pricingNote: 'Most affordable option',
    supportsStyle: false,
    supportsMasks: false,
    defaults: {
      steps: 1000,
      learning_rate: 0.0005,
    },
    stepRange: [1, 8000],
    buildBody: (params) => ({
      image_data_url: params.zipUrl,
      steps: params.steps,
      learning_rate: params.learning_rate,
      trigger_phrase: params.trigger_word || undefined,
    }),
    parseResult: (data) => ({
      modelUrl: data.lora_file?.url || null,
      configUrl: data.config_file?.url || null,
    }),
  },

  'qwen-edit-2511': {
    id: 'qwen-edit-2511',
    name: 'Qwen Edit 2511 Trainer',
    endpoint: 'fal-ai/qwen-image-edit-2511-trainer',
    baseModel: 'Qwen Image Edit 2511',
    category: 'image',
    pricing: '$0.004/step ($4/1000 steps)',
    pricingNote: 'Uses image pairs (before/after)',
    supportsStyle: false,
    supportsMasks: false,
    defaults: {
      steps: 1000,
      learning_rate: 0.0001,
    },
    stepRange: [100, 30000],
    buildBody: (params) => ({
      image_data_url: params.zipUrl,
      steps: params.steps,
      learning_rate: params.learning_rate,
      default_caption: params.default_caption || undefined,
    }),
    parseResult: (data) => ({
      modelUrl: data.diffusers_lora_file?.url || null,
      configUrl: data.config_file?.url || null,
    }),
  },

  // ── Other Models ───────────────────────────────────
  'z-image': {
    id: 'z-image',
    name: 'Z-Image Trainer',
    endpoint: 'fal-ai/z-image-trainer',
    baseModel: 'Z-Image Turbo (6B)',
    category: 'image',
    pricing: '$0.00226/step ($2.26/1000 steps)',
    supportsStyle: true,
    supportsMasks: false,
    defaults: {
      steps: 1000,
      learning_rate: 0.0001,
    },
    stepRange: [100, 10000],
    buildBody: (params) => ({
      image_data_url: params.zipUrl,
      steps: params.steps,
      learning_rate: params.learning_rate,
      default_caption: params.default_caption || undefined,
      training_type: params.is_style ? 'style' : 'content',
    }),
    parseResult: (data) => ({
      modelUrl: data.diffusers_lora_file?.url || null,
      configUrl: data.config_file?.url || null,
    }),
  },

  'hunyuan-video': {
    id: 'hunyuan-video',
    name: 'Hunyuan Video Trainer',
    endpoint: 'fal-ai/hunyuan-video-lora-training',
    baseModel: 'Hunyuan Video',
    category: 'video',
    pricing: '$5 flat per run',
    supportsStyle: false,
    supportsMasks: false,
    defaults: {
      steps: 1000,
      learning_rate: 0.0001,
    },
    stepRange: [1, 5000],
    buildBody: (params) => ({
      images_data_url: params.zipUrl,
      steps: params.steps,
      trigger_word: params.trigger_word || undefined,
      learning_rate: params.learning_rate,
      do_caption: params.auto_caption ?? true,
    }),
    parseResult: (data) => ({
      modelUrl: data.diffusers_lora_file?.url || null,
      configUrl: data.config_file?.url || null,
    }),
  },
};

/**
 * Get a training model config by ID.
 */
export function getTrainingModel(modelId) {
  return TRAINING_MODELS[modelId] || null;
}

/**
 * List all available training models, optionally filtered by category.
 */
export function listTrainingModels(category = null) {
  const models = Object.values(TRAINING_MODELS);
  if (category) return models.filter(m => m.category === category);
  return models;
}

/**
 * Get the default training model ID.
 */
export function getDefaultTrainingModel() {
  return 'flux-lora-fast';
}

export { TRAINING_MODELS };
```

- [ ] **Step 2: Commit**

```bash
git add api/lib/trainingModelRegistry.js
git commit -m "feat: add training model registry with 10 FAL training endpoints"
```

---

## Task 2: Create AI Auto-Captioning Endpoint

**Files:**
- Create: `api/lora/caption.js`
- Modify: `server.js:381-394` (add route)

- [ ] **Step 1: Create the caption endpoint**

```javascript
// api/lora/caption.js
import { getUserKeys } from '../lib/getUserKeys.js';

/**
 * Auto-caption training images using GPT-4.1 mini vision.
 * Accepts an array of image URLs, returns per-image captions.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image_urls, trigger_word } = req.body;
  if (!image_urls?.length) return res.status(400).json({ error: 'Missing image_urls' });

  const { openaiKey } = await getUserKeys(req.user.id, req.user.email);
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured.' });

  const captions = [];

  // Process in batches of 3 to avoid rate limits
  const BATCH_SIZE = 3;
  for (let i = 0; i < image_urls.length; i += BATCH_SIZE) {
    const batch = image_urls.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (url) => {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a LoRA training caption writer. Describe this image in one concise sentence for AI model training. Focus on the subject, pose, angle, lighting, and setting. ${trigger_word ? `Start every caption with the trigger word "${trigger_word}".` : ''} Do NOT mention image quality, resolution, or that it's a photo. Just describe what you see.`,
              },
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url, detail: 'low' } },
                  { type: 'text', text: 'Caption this image for LoRA training.' },
                ],
              },
            ],
            max_tokens: 100,
            temperature: 0.3,
          }),
        });

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || null;
      } catch (err) {
        console.warn(`[LoRA Caption] Failed to caption image: ${err.message}`);
        return null;
      }
    });

    const results = await Promise.all(promises);
    captions.push(...results);
  }

  return res.json({
    success: true,
    captions,
    captioned: captions.filter(Boolean).length,
    total: image_urls.length,
  });
}
```

- [ ] **Step 2: Register the route in server.js**

Add after the `/api/lora/result` route block (~line 392):

```javascript
app.post('/api/lora/caption', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('lora/caption.js');
  handler(req, res);
});
```

- [ ] **Step 3: Commit**

```bash
git add api/lora/caption.js server.js
git commit -m "feat: add AI auto-captioning endpoint for LoRA training images"
```

---

## Task 3: Upgrade train.js to Multi-Model Support

**Files:**
- Modify: `api/lora/train.js`

- [ ] **Step 1: Refactor train.js to use the registry**

Replace the entire file with the upgraded version that:
1. Imports `getTrainingModel` and `getDefaultTrainingModel` from the registry
2. Accepts a `model` parameter (defaults to `'flux-lora-fast'`)
3. Accepts `is_style`, `create_masks`, `auto_caption`, `captions[]` from the frontend
4. Uses `model.buildBody()` to construct the FAL request
5. Keeps the zip creation logic but uses AI captions when provided
6. Stores `training_model` in the DB record

Key changes to `api/lora/train.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { getTrainingModel, getDefaultTrainingModel } from '../lib/trainingModelRegistry.js';
import archiver from 'archiver';
import { PassThrough } from 'stream';

/**
 * Download images, zip them with caption files, upload zip to Supabase storage.
 * Now accepts per-image captions array (from AI auto-captioning) or falls back to template.
 */
async function createTrainingZip(imageUrls, captions, fallbackCaption, supabase) {
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

        archive.append(imageBuffer, { name: `${baseName}.${ext}` });
        // Use per-image AI caption if available, otherwise fall back to template
        const caption = captions?.[i] || fallbackCaption;
        archive.append(caption, { name: `${baseName}.txt` });
      }

      archive.finalize();
    } catch (err) {
      reject(err);
    }
  });
}

// Caption templates per training type (fallback when no AI captions provided)
const CAPTION_TEMPLATES = {
  subject: (tw) => `a photo of ${tw}`,
  style: (tw) => `an image in ${tw} style`,
  character: (tw) => `a portrait of ${tw}, face visible`,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name, trigger_word, image_urls,
    model: modelId = getDefaultTrainingModel(),
    training_type = 'subject', // 'subject' or 'style'
    is_style = false,
    create_masks = true,
    steps: stepsOverride,
    learning_rate: lrOverride,
    captions, // per-image AI captions array (optional)
    brand_username,
    visual_subject_id,
  } = req.body;

  if (!name || !trigger_word || !image_urls?.length) {
    return res.status(400).json({ error: 'Missing name, trigger_word, or image_urls' });
  }

  // Look up the training model
  const model = getTrainingModel(modelId);
  if (!model) {
    return res.status(400).json({ error: `Unknown training model: ${modelId}` });
  }

  // Resolve parameters with model defaults
  const steps = stepsOverride
    ? Math.max(model.stepRange[0], Math.min(model.stepRange[1], stepsOverride))
    : model.defaults.steps;
  const learning_rate = lrOverride || model.defaults.learning_rate;

  const { falKey } = await getUserKeys(req.user.id, req.user.email);
  if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Create zip archive
  let zipUrl;
  try {
    const fallbackCaption = is_style
      ? CAPTION_TEMPLATES.style(trigger_word)
      : training_type === 'character'
        ? CAPTION_TEMPLATES.character(trigger_word)
        : CAPTION_TEMPLATES.subject(trigger_word);

    zipUrl = await createTrainingZip(image_urls, captions, fallbackCaption, supabase);
  } catch (err) {
    console.error('[LoRA Train] Failed to create training zip:', err);
    return res.status(500).json({ error: 'Failed to prepare training images', details: err.message });
  }

  // Build FAL request body using registry
  const body = model.buildBody({
    zipUrl,
    trigger_word,
    steps,
    learning_rate,
    is_style: is_style || training_type === 'style',
    create_masks,
    auto_caption: !captions?.length, // let FAL auto-caption if we didn't provide any
  });

  console.log(`[LoRA Train] Submitting to ${model.endpoint} with zip: ${zipUrl}`);

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
      training_type: is_style ? 'style' : training_type,
      steps,
      learning_rate,
      brand_username: brand_username || null,
      visual_subject_id: visual_subject_id || null,
      lora_type: 'custom',
      training_model: modelId, // NEW: store which model was used
    })
    .select()
    .single();

  if (error) console.error('[LoRA Train] DB insert error:', error.message);

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
```

- [ ] **Step 2: Commit**

```bash
git add api/lora/train.js
git commit -m "feat: upgrade train.js to multi-model dispatch via training registry"
```

---

## Task 4: Upgrade result.js for Multi-Model Polling

**Files:**
- Modify: `api/lora/result.js`

- [ ] **Step 1: Update result.js to handle multiple model endpoints**

Key changes:
1. Accept `endpoint` parameter from the frontend (stored during training)
2. Fall back to the original flux-lora-fast-training endpoint
3. Use the model registry's `parseResult()` for extracting the model URL

```javascript
import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { getTrainingModel } from '../lib/trainingModelRegistry.js';

const DEFAULT_ENDPOINT = 'fal-ai/flux-lora-fast-training';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { requestId, loraId, statusUrl, responseUrl, endpoint, model: modelId } = req.body;
  if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

  const { falKey } = await getUserKeys(req.user.id, req.user.email);
  if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const headers = { 'Authorization': `Key ${falKey}` };
  const resolvedEndpoint = endpoint || DEFAULT_ENDPOINT;

  const checkUrl = statusUrl
    ? `${statusUrl}?logs=1`
    : `https://queue.fal.run/${resolvedEndpoint}/requests/${requestId}/status?logs=1`;

  const statusResponse = await fetch(checkUrl, { headers });
  if (!statusResponse.ok) {
    return res.status(statusResponse.status).json({ error: 'Failed to check training status' });
  }

  const statusData = await statusResponse.json();

  if (statusData.status === 'COMPLETED') {
    const resultUrl = responseUrl || `https://queue.fal.run/${resolvedEndpoint}/requests/${requestId}`;
    const resultResponse = await fetch(resultUrl, { headers });
    const resultData = await resultResponse.json();

    console.log('[LoRA Result] Full fal.ai response keys:', Object.keys(resultData));
    console.log('[LoRA Result] Full fal.ai response:', JSON.stringify(resultData).substring(0, 1000));

    // Use registry parser if available, otherwise generic extraction
    let modelUrl = null;
    const model = modelId ? getTrainingModel(modelId) : null;
    if (model) {
      const parsed = model.parseResult(resultData);
      modelUrl = parsed.modelUrl;
    } else {
      modelUrl = resultData.diffusers_lora_file?.url
        || resultData.lora_file?.url
        || resultData.config_file?.url
        || resultData.output?.url
        || null;
    }

    if (loraId) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      if (modelUrl) {
        await supabase
          .from('brand_loras')
          .update({ fal_model_url: modelUrl, status: 'ready' })
          .eq('id', loraId);

        const { data: loraRecord } = await supabase
          .from('brand_loras')
          .select('visual_subject_id, trigger_word')
          .eq('id', loraId)
          .single();

        if (loraRecord?.visual_subject_id) {
          await supabase
            .from('visual_subjects')
            .update({
              lora_url: modelUrl,
              lora_trigger_word: loraRecord.trigger_word,
              brand_lora_id: loraId,
              training_status: 'ready',
            })
            .eq('id', loraRecord.visual_subject_id);
        }
      } else {
        await supabase
          .from('brand_loras')
          .update({ status: 'failed' })
          .eq('id', loraId);

        const { data: loraRecord } = await supabase
          .from('brand_loras')
          .select('visual_subject_id')
          .eq('id', loraId)
          .single();

        if (loraRecord?.visual_subject_id) {
          await supabase
            .from('visual_subjects')
            .update({ training_status: 'failed' })
            .eq('id', loraRecord.visual_subject_id);
        }
      }
    }

    return res.json({ success: true, status: 'completed', modelUrl, requestId });
  }

  if (statusData.status === 'FAILED') {
    if (loraId) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('brand_loras').update({ status: 'failed' }).eq('id', loraId);

      const { data: loraRecord } = await supabase
        .from('brand_loras')
        .select('visual_subject_id')
        .eq('id', loraId)
        .single();

      if (loraRecord?.visual_subject_id) {
        await supabase
          .from('visual_subjects')
          .update({ training_status: 'failed' })
          .eq('id', loraRecord.visual_subject_id);
      }
    }

    return res.json({ success: false, status: 'failed', requestId });
  }

  return res.json({
    success: true,
    status: 'training',
    requestId,
    queuePosition: statusData.queue_position ?? null,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add api/lora/result.js
git commit -m "feat: upgrade result.js to support multi-model endpoint polling"
```

---

## Task 5: Add `training_model` Column to Database

**Files:**
- Create: `supabase/migrations/20260401_lora_training_model.sql`

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/20260401_lora_training_model.sql
-- Add training_model column to brand_loras to track which FAL model was used

ALTER TABLE brand_loras
ADD COLUMN IF NOT EXISTS training_model text DEFAULT 'flux-lora-fast';

-- Update existing records
UPDATE brand_loras SET training_model = 'flux-lora-fast' WHERE training_model IS NULL;

-- Remove the rank column constraint (different models have different valid ranks)
-- Keep the column but don't enforce specific values
COMMENT ON COLUMN brand_loras.training_model IS 'ID from trainingModelRegistry.js — determines FAL endpoint for training and polling';
```

- [ ] **Step 2: Run the migration**

```bash
# Run via Supabase dashboard SQL editor or:
# psql $DATABASE_URL -f supabase/migrations/20260401_lora_training_model.sql
```

**IMPORTANT:** This migration MUST be run BEFORE deploying the updated train.js, or the DB INSERT will fail on the `training_model` column.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260401_lora_training_model.sql
git commit -m "feat: add training_model column to brand_loras table"
```

---

## Task 6: Add Training Models List Endpoint

**Files:**
- Create: `api/lora/models.js`
- Modify: `server.js` (add route)

- [ ] **Step 1: Create the models list endpoint**

```javascript
// api/lora/models.js
import { listTrainingModels } from '../lib/trainingModelRegistry.js';

/**
 * List available training models for the frontend model selector.
 * Returns model ID, name, base model, category, pricing, and feature flags.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const category = req.query.category || null; // 'image' or 'video'
  const models = listTrainingModels(category);

  const clientModels = models.map(m => ({
    id: m.id,
    name: m.name,
    baseModel: m.baseModel,
    category: m.category,
    pricing: m.pricing,
    pricingNote: m.pricingNote || null,
    supportsStyle: m.supportsStyle,
    supportsMasks: m.supportsMasks,
    defaultSteps: m.defaults.steps,
    stepRange: m.stepRange,
    defaultLearningRate: m.defaults.learning_rate,
  }));

  return res.json({ success: true, models: clientModels });
}
```

- [ ] **Step 2: Register route in server.js**

Add after the `/api/lora/caption` route (registered in Task 2):

```javascript
app.get('/api/lora/models', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('lora/models.js');
  handler(req, res);
});
```

- [ ] **Step 3: Commit**

```bash
git add api/lora/models.js server.js
git commit -m "feat: add /api/lora/models endpoint for training model selector"
```

---

## Task 7: Upgrade BrandAssetsModal Frontend

**Files:**
- Modify: `src/components/modals/BrandAssetsModal.jsx`

This is the biggest UI change. The configure step expands to include:
1. **Training type toggle** (Subject vs Style)
2. **Model selector** (fetched from `/api/lora/models`)
3. **Auto-caption toggle** (calls `/api/lora/caption` before training)
4. **Advanced settings** (collapsible: steps, learning rate, create masks)

- [ ] **Step 1: Add new state variables and model fetching**

After the existing config state (line ~72), add:

```javascript
// Model & advanced config state
const [trainingModels, setTrainingModels] = useState([]);
const [selectedModel, setSelectedModel] = useState('flux-lora-fast');
const [trainingType, setTrainingType] = useState('subject'); // 'subject' or 'style'
const [createMasks, setCreateMasks] = useState(true);
const [autoCaption, setAutoCaption] = useState(true);
const [showAdvanced, setShowAdvanced] = useState(false);
const [steps, setSteps] = useState(1000);
const [learningRate, setLearningRate] = useState(null); // null = use model default
const [generatedCaptions, setGeneratedCaptions] = useState([]); // per-image AI captions
const [isCaptioning, setIsCaptioning] = useState(false);
```

Add model fetching on mount:

```javascript
useEffect(() => {
  if (isOpen) {
    apiFetch('/api/lora/models')
      .then(r => r.json())
      .then(data => {
        if (data.models) {
          setTrainingModels(data.models);
          // Set defaults from selected model
          const defaultModel = data.models.find(m => m.id === 'flux-lora-fast');
          if (defaultModel) setSteps(defaultModel.defaultSteps);
        }
      })
      .catch(() => {});
  }
}, [isOpen]);
```

- [ ] **Step 2: Add model change handler**

```javascript
const handleModelChange = (modelId) => {
  setSelectedModel(modelId);
  const model = trainingModels.find(m => m.id === modelId);
  if (model) {
    setSteps(model.defaultSteps);
    setLearningRate(model.defaultLearningRate);
    setCreateMasks(model.supportsMasks);
  }
};

const selectedModelInfo = trainingModels.find(m => m.id === selectedModel);
```

- [ ] **Step 3: Update the configure step UI**

Replace the configure step section (lines ~596-688) with expanded version that adds:
- Training type toggle (Subject / Style) as two cards
- Model selector dropdown grouped by category (Image Models / Video Models)
- Auto-caption toggle with description
- Collapsible "Advanced Settings" with steps slider, learning rate, create masks toggle
- Updated training summary showing selected model name and pricing

The model selector should render as a grid of cards (similar to how niche selection works in Shorts Workbench), grouped by category:

```jsx
{/* Training Type */}
<div className="space-y-2">
  <Label className="text-sm font-medium text-gray-700">What are you training?</Label>
  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={() => setTrainingType('subject')}
      className={`p-3 rounded-lg border-2 text-left transition-all ${
        trainingType === 'subject'
          ? 'border-[#2C666E] bg-[#2C666E]/5'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <p className="text-sm font-semibold text-gray-900">Subject / Character</p>
      <p className="text-xs text-gray-500 mt-0.5">Product, person, mascot, or object</p>
    </button>
    <button
      type="button"
      onClick={() => setTrainingType('style')}
      className={`p-3 rounded-lg border-2 text-left transition-all ${
        trainingType === 'style'
          ? 'border-[#2C666E] bg-[#2C666E]/5'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <p className="text-sm font-semibold text-gray-900">Visual Style</p>
      <p className="text-xs text-gray-500 mt-0.5">Art style, aesthetic, or brand look</p>
    </button>
  </div>
</div>

{/* Model Selector */}
<div className="space-y-2">
  <Label className="text-sm font-medium text-gray-700">Training Model</Label>
  <select
    value={selectedModel}
    onChange={(e) => handleModelChange(e.target.value)}
    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
  >
    <optgroup label="Image Models">
      {trainingModels.filter(m => m.category === 'image').map(m => (
        <option key={m.id} value={m.id}>
          {m.name} — {m.baseModel} ({m.pricing})
        </option>
      ))}
    </optgroup>
    <optgroup label="Video Models">
      {trainingModels.filter(m => m.category === 'video').map(m => (
        <option key={m.id} value={m.id}>
          {m.name} — {m.baseModel} ({m.pricing})
        </option>
      ))}
    </optgroup>
  </select>
  {selectedModelInfo?.pricingNote && (
    <p className="text-xs text-gray-500">{selectedModelInfo.pricingNote}</p>
  )}
</div>

{/* Auto-Caption Toggle */}
<div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
  <div>
    <p className="text-sm font-medium text-gray-900">AI Auto-Captioning</p>
    <p className="text-xs text-gray-500">
      Uses GPT-4.1 to describe each image — produces better LoRAs than generic captions
    </p>
  </div>
  <button
    type="button"
    onClick={() => setAutoCaption(!autoCaption)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      autoCaption ? 'bg-[#2C666E]' : 'bg-gray-200'
    }`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
      autoCaption ? 'translate-x-6' : 'translate-x-1'
    }`} />
  </button>
</div>

{/* Advanced Settings */}
<button
  type="button"
  onClick={() => setShowAdvanced(!showAdvanced)}
  className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
>
  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
  Advanced Settings
</button>

{showAdvanced && (
  <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
    {/* Steps slider */}
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-gray-700">Training Steps</Label>
        <span className="text-xs font-mono text-gray-500">{steps.toLocaleString()}</span>
      </div>
      <input
        type="range"
        min={selectedModelInfo?.stepRange?.[0] || 100}
        max={Math.min(selectedModelInfo?.stepRange?.[1] || 10000, 5000)}
        step={100}
        value={steps}
        onChange={(e) => setSteps(parseInt(e.target.value))}
        className="w-full accent-[#2C666E]"
      />
      <p className="text-[10px] text-gray-400">
        More steps = more accurate but longer training. Default: {selectedModelInfo?.defaultSteps || 1000}
      </p>
    </div>

    {/* Learning Rate */}
    {selectedModelInfo?.defaultLearningRate && (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-gray-700">Learning Rate</Label>
          <span className="text-xs font-mono text-gray-500">
            {(learningRate || selectedModelInfo.defaultLearningRate).toFixed(6)}
          </span>
        </div>
        <input
          type="range"
          min={0.00001}
          max={0.001}
          step={0.00001}
          value={learningRate || selectedModelInfo.defaultLearningRate}
          onChange={(e) => setLearningRate(parseFloat(e.target.value))}
          className="w-full accent-[#2C666E]"
        />
      </div>
    )}

    {/* Create Masks toggle */}
    {selectedModelInfo?.supportsMasks && (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-700">Face/Subject Masks</p>
          <p className="text-[10px] text-gray-500">
            Uses segmentation to focus training on the subject. Best for people.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateMasks(!createMasks)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            createMasks ? 'bg-[#2C666E]' : 'bg-gray-200'
          }`}
        >
          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            createMasks ? 'translate-x-5' : 'translate-x-1'
          }`} />
        </button>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Update handleStartTraining to send all new params**

Replace the training submission (lines ~320-328) with:

```javascript
// Stage 1.5: Auto-caption if enabled
let captions = null;
if (autoCaption && publicUrls.length > 0) {
  setTrainingStage('captioning');
  try {
    const captionRes = await apiFetch('/api/lora/caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_urls: publicUrls,
        trigger_word: triggerWord.trim(),
      }),
    });
    const captionData = await captionRes.json();
    if (captionData.success && captionData.captions?.length) {
      captions = captionData.captions;
    }
  } catch (err) {
    console.warn('Auto-captioning failed, using template captions:', err);
  }
}

// Stage 2: Start training
setTrainingStage('queued');
setTrainingProgress(null);

const response = await apiFetch('/api/lora/train', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: loraName.trim(),
    trigger_word: triggerWord.trim(),
    image_urls: publicUrls,
    model: selectedModel,
    training_type: trainingType,
    is_style: trainingType === 'style',
    create_masks: createMasks,
    steps,
    learning_rate: learningRate,
    captions,
  }),
});
```

- [ ] **Step 5: Update pollLoraTraining to pass endpoint and model**

```javascript
// In handleStartTraining, after getting response data:
await pollLoraTraining(
  data.requestId, data.loraId,
  data.statusUrl, data.responseUrl,
  data.endpoint, data.model
);

// Update pollLoraTraining signature and polling call:
const pollLoraTraining = async (requestId, loraId, statusUrl, responseUrl, endpoint, modelId) => {
  // ... existing loop ...
  body: JSON.stringify({ requestId, loraId, statusUrl, responseUrl, endpoint, model: modelId }),
  // ...
};
```

- [ ] **Step 6: Add 'captioning' stage to the training step UI**

Add after the 'uploading' stage block (~line 696):

```jsx
{/* Stage: Captioning */}
{trainingStage === 'captioning' && (
  <>
    <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
      <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
    </div>
    <div>
      <h3 className="text-lg font-semibold text-gray-900">Captioning Images...</h3>
      <p className="text-sm text-gray-500 mt-1">
        AI is describing each image for better training quality
      </p>
    </div>
  </>
)}
```

- [ ] **Step 7: Add ChevronDown import**

Add `ChevronDown` to the lucide-react imports at line 8.

- [ ] **Step 8: Commit**

```bash
git add src/components/modals/BrandAssetsModal.jsx
git commit -m "feat: upgrade LoRA trainer UI with model selector, training type, auto-caption, and advanced settings"
```

---

## Task 8: Update Training Summary Display

**Files:**
- Modify: `src/components/modals/BrandAssetsModal.jsx`

- [ ] **Step 1: Update the training summary in the configure step**

Replace the static training summary (lines ~632-654) with dynamic version:

```jsx
<div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
  <h4 className="text-xs font-semibold text-gray-700 mb-2">Training Summary</h4>
  <div className="grid grid-cols-2 gap-3 text-xs">
    <div>
      <span className="text-gray-500">Images:</span>{' '}
      <span className="font-medium text-gray-900">{uploadedImages.length} photos</span>
      {processedCount > 0 && (
        <span className="text-green-600 ml-1">({processedCount} BG removed)</span>
      )}
    </div>
    <div>
      <span className="text-gray-500">Model:</span>{' '}
      <span className="font-medium text-gray-900">
        {selectedModelInfo?.name || 'Flux LoRA Fast'}
      </span>
    </div>
    <div>
      <span className="text-gray-500">Steps:</span>{' '}
      <span className="font-medium text-gray-900">{steps.toLocaleString()}</span>
    </div>
    <div>
      <span className="text-gray-500">Type:</span>{' '}
      <span className="font-medium text-gray-900">
        {trainingType === 'style' ? 'Style' : 'Subject'}
      </span>
    </div>
    <div>
      <span className="text-gray-500">Pricing:</span>{' '}
      <span className="font-medium text-gray-900">
        {selectedModelInfo?.pricing || '$2 flat'}
      </span>
    </div>
    <div>
      <span className="text-gray-500">Captions:</span>{' '}
      <span className="font-medium text-gray-900">
        {autoCaption ? 'AI (GPT-4.1)' : 'Template'}
      </span>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modals/BrandAssetsModal.jsx
git commit -m "feat: update training summary to show selected model, type, and pricing"
```

---

## Task 9: Reset State on Modal Close

**Files:**
- Modify: `src/components/modals/BrandAssetsModal.jsx`

- [ ] **Step 1: Add new state variables to the reset effect**

In the `useEffect` cleanup (~lines 81-103), add resets for all new state:

```javascript
setTrainingModels([]);
setSelectedModel('flux-lora-fast');
setTrainingType('subject');
setCreateMasks(true);
setAutoCaption(true);
setShowAdvanced(false);
setSteps(1000);
setLearningRate(null);
setGeneratedCaptions([]);
setIsCaptioning(false);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modals/BrandAssetsModal.jsx
git commit -m "fix: reset all new LoRA trainer state on modal close"
```

---

## Task 10: Integration Test — Full Training Flow

- [ ] **Step 1: Start dev server and verify the model list endpoint**

```bash
npm run server
# In another terminal:
curl -s http://localhost:3003/api/lora/models -H "Authorization: Bearer <token>" | jq '.models | length'
# Expected: 10
```

- [ ] **Step 2: Open the LoRA trainer modal in the browser**

Navigate to the brand assets section and open the trainer. Verify:
- Model selector shows 10 models grouped by Image/Video
- Training type toggle works (Subject / Style)
- Advanced settings collapse/expand works
- Steps slider updates based on selected model
- Auto-caption toggle is on by default

- [ ] **Step 3: Test a training run with the default model (Flux LoRA Fast)**

Upload 4+ images, configure name/trigger word, and start training. Verify:
- Auto-captioning stage appears and completes
- Training submits successfully
- Polling shows progress
- Completion stores model URL in DB

- [ ] **Step 4: Commit final integration fixes**

```bash
git add -A
git commit -m "fix: integration fixes for LoRA trainer upgrade"
```

---

## Task 11: Deploy

- [ ] **Step 1: Run the database migration**

Execute `supabase/migrations/20260401_lora_training_model.sql` against the production database via the Supabase SQL editor.

- [ ] **Step 2: Push and deploy**

```bash
git push origin main
fly deploy
```

- [ ] **Step 3: Verify in production**

Open the LoRA trainer on the live site and confirm the model selector loads and training works.
