/**
 * Turnaround Sheet Generator
 * Generates a SINGLE image containing a 4×6 character turnaround grid.
 * The model renders all 24 poses in one image, maintaining character consistency.
 *
 * Supported models:
 *   - nano-banana-2       (text-to-image)
 *   - nano-banana-2-edit  (image-to-image via /edit endpoint, uses image_urls[])
 *   - nano-banana-pro     (image-to-image via /edit endpoint, uses image_urls[])
 *   - seedream            (ByteDance Seedream v4.5 /edit, uses image_urls[])
 *   - fal-flux            (Flux 2 + LoRA, text-to-image or image_url edit)
 */

import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

function buildTurnaroundPrompt(characterDescription, style, hasReference) {
  const stylePrompt = (style && style.trim()) ? `${style.trim()} style, high quality rendering` : 'professional concept art, clean detailed rendering, animation studio quality';

  const refNote = hasReference
    ? 'Use the reference image as the character design. Recreate this exact character in every cell of the grid'
    : 'Same character in every cell with consistent design, proportions, colors, and outfit throughout the entire sheet';

  return [
    `Professional character turnaround model sheet, organized grid layout with 4 columns and 6 rows (24 poses total), clean white background`,
    `Character: ${characterDescription}`,
    `Row 1: front view standing, three-quarter front view, side profile view, back view — all in neutral standing pose`,
    `Row 2: three-quarter back view, neutral expression close-up, determined expression, joyful laughing expression`,
    `Row 3: side view walk cycle pose A (left foot forward), walk cycle pose B (right foot forward), walking toward viewer, walking away`,
    `Row 4: running side view, jumping with arms raised, dynamic landing pose, fighting/action stance`,
    `Row 5: sitting cross-legged, reaching hand outward, carrying an object, leaning against wall casually`,
    `Row 6: face close-up head and shoulders, hand and accessory detail, bird's-eye view from above, dramatic low angle from below`,
    refNote,
    stylePrompt,
    `character reference sheet, model sheet, turnaround sheet, multiple poses and angles, animation reference, white background grid layout`,
  ].join('. ');
}

// Model ID → fal.ai endpoint mapping
const MODEL_ENDPOINTS = {
  'nano-banana-2':      { generate: 'fal-ai/nano-banana-2',            edit: 'fal-ai/nano-banana-2/edit' },
  'nano-banana-pro':    { generate: null,                               edit: 'fal-ai/nano-banana-pro/edit' },
  'seedream':           { generate: null,                               edit: 'fal-ai/bytedance/seedream/v4.5/edit' },
  'fal-flux':           { generate: 'fal-ai/flux-2/lora',             edit: 'fal-ai/flux-2/lora/edit' },
};

// For polling — map back to the queue endpoint format
const MODEL_POLL_IDS = {
  'nano-banana-2':      'nano-banana-2',
  'nano-banana-pro':    'nano-banana-pro',  // will use nano-banana-2 poll format
  'seedream':           'seedream',
  'fal-flux':           'fal-flux',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    referenceImageUrl,
    characterDescription,
    style = 'concept-art',
    model = 'nano-banana-2',
    loraUrl,
    loras,
  } = req.body;

  if (!characterDescription) {
    return res.status(400).json({ error: 'characterDescription is required' });
  }

  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const hasRef = !!referenceImageUrl;
  const prompt = buildTurnaroundPrompt(characterDescription, style, hasRef);

  console.log(`[Turnaround] Model: ${model} | Style: ${style} | Reference: ${hasRef}`);
  console.log(`[Turnaround] Character: ${characterDescription.substring(0, 100)}...`);

  try {
    let result;

    if (model === 'fal-flux') {
      // Flux path — supports LoRAs
      const loraList = loras || (loraUrl ? [{ url: loraUrl, scale: 1 }] : null);
      if (hasRef) {
        result = await generateFluxEdit(FAL_KEY, prompt, referenceImageUrl, loraList);
      } else {
        result = await generateFlux(FAL_KEY, prompt, loraList);
      }
    } else if (hasRef) {
      // All other models with a reference image → use their /edit endpoint
      result = await generateWithEdit(FAL_KEY, model, prompt, referenceImageUrl);
    } else if (MODEL_ENDPOINTS[model]?.generate) {
      // Text-to-image (only nano-banana-2 supports this without a reference)
      result = await generateNanoBanana2(FAL_KEY, prompt);
    } else {
      // Models that only have edit endpoints (nano-banana-pro, seedream) require a reference
      return res.status(400).json({
        error: `${model} requires a reference image. Please upload one or switch to Nano Banana 2.`,
      });
    }

    await logCost({
      username: req.user.email || req.user.id,
      category: 'fal',
      operation: 'turnaround_sheet',
      model,
      metadata: { style, has_reference: hasRef },
    });

    return res.json({
      success: true,
      ...result,
      pollEndpoint: '/api/imagineer/result',
    });

  } catch (err) {
    console.error('[Turnaround] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Nano Banana 2 text-to-image (no reference) ────────────────────────────

async function generateNanoBanana2(falKey, prompt) {
  const response = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: '2:3',
      resolution: '1K',
      num_images: 1,
      output_format: 'png',
      safety_tolerance: '4',
      limit_generations: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nano Banana 2 error: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (data.images?.[0]?.url) return { imageUrl: data.images[0].url, status: 'completed' };
  if (data.request_id) return { requestId: data.request_id, model: 'nano-banana-2', status: 'processing' };
  throw new Error('Unexpected response format');
}

// ─── Generic edit endpoint (Nano Banana 2/Pro, Seedream) ────────────────────
// All use image_urls[] array format

async function generateWithEdit(falKey, model, prompt, referenceImageUrl) {
  const endpoint = MODEL_ENDPOINTS[model]?.edit;
  if (!endpoint) throw new Error(`No edit endpoint for model: ${model}`);

  const payload = {
    prompt,
    image_urls: [referenceImageUrl],
    num_images: 1,
    output_format: 'png',
  };

  // Model-specific options
  if (model === 'seedream') {
    payload.width = 1440;
    payload.height = 2560;
    delete payload.output_format; // seedream doesn't accept this
  } else {
    // nano-banana-2/edit and nano-banana-pro/edit
    payload.aspect_ratio = '2:3';
    payload.resolution = '1K';
    payload.safety_tolerance = '4';
    payload.limit_generations = true;
  }

  console.log(`[Turnaround] Using edit endpoint (sync): ${endpoint}`);

  // Use synchronous fal.run (not queue.fal.run) — edit endpoints don't support queue polling
  const response = await fetch(`https://fal.run/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${model} edit error: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (data.images?.[0]?.url) return { imageUrl: data.images[0].url, status: 'completed' };
  throw new Error(`Unexpected ${model} response — no image returned`);
}

// ─── Flux 2 + LoRA (text-to-image) ─────────────────────────────────────────

async function generateFlux(falKey, prompt, loras) {
  const payload = {
    prompt,
    image_size: { width: 1024, height: 1536 },
    num_images: 1,
  };
  if (loras?.length) {
    payload.loras = loras.map(l => ({ path: l.url, scale: l.scale ?? 1.0 }));
  }

  const response = await fetch('https://queue.fal.run/fal-ai/flux-2/lora', {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flux error: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (data.images?.[0]?.url) return { imageUrl: data.images[0].url, status: 'completed' };
  if (data.request_id) return { requestId: data.request_id, model: 'fal-flux', status: 'processing' };
  throw new Error('Unexpected Flux response');
}

// ─── Flux 2 + LoRA edit (image-to-image) ────────────────────────────────────

async function generateFluxEdit(falKey, prompt, imageUrl, loras) {
  const payload = {
    image_url: imageUrl,
    prompt,
    image_size: { width: 1024, height: 1536 },
    strength: 0.85,
    num_images: 1,
  };
  if (loras?.length) {
    payload.loras = loras.map(l => ({ path: l.url, scale: l.scale ?? 1.0 }));
  }

  const response = await fetch('https://queue.fal.run/fal-ai/flux-2/lora/edit', {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flux edit error: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (data.images?.[0]?.url) return { imageUrl: data.images[0].url, status: 'completed' };
  if (data.request_id) return { requestId: data.request_id, model: 'fal-flux-edit', status: 'processing' };
  throw new Error('Unexpected Flux edit response');
}
