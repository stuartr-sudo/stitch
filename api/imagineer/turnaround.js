/**
 * Turnaround Sheet Generator
 * Generates a SINGLE image containing a 4×6 character turnaround grid.
 *
 * Edit models (nano-banana-2/edit, nano-banana-pro/edit, seedream/edit):
 *   → Use synchronous fal.run — returns image directly. These are fast and
 *     queue.fal.run is unreliable for edit endpoints.
 *
 * Generate models (nano-banana-2, fal-flux):
 *   → Use queue.fal.run — returns requestId for frontend polling.
 *
 * The 3-minute timeout on this route (set in server.js) covers sync calls.
 */

import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

/**
 * Builds a single cohesive prompt from all structured inputs.
 * This is the ONLY place prompt text is assembled — the frontend sends raw data.
 */
function buildTurnaroundPrompt({ characterDescription, style, hasReference, props, negativePrompt, brandStyleGuide }) {
  // Style rendering instructions
  const stylePrompt = (style && style.trim())
    ? `Rendered in ${style.trim()} style with high quality, detailed ${style.trim()} aesthetic throughout every cell`
    : 'Professional concept art style, clean detailed rendering, animation studio quality';

  // Reference handling
  const refNote = hasReference
    ? 'Use the reference image as the character design. Recreate this exact character in every cell of the grid'
    : 'Same character in every cell with consistent design, proportions, colors, and outfit throughout the entire sheet';

  // Props — woven into the pose descriptions
  const propsNote = (props && props.length > 0)
    ? `The character has the following props/accessories which should appear naturally throughout the poses: ${props.join(', ')}. Incorporate these items into relevant poses — for example, holding, wearing, using, or interacting with them`
    : 'No additional props or accessories — focus purely on the character';

  // Negative prompt — appended as avoidance instructions
  const avoidNote = negativePrompt
    ? `AVOID the following in all cells: ${negativePrompt}`
    : '';

  const parts = [
    `${stylePrompt}`,
    `Professional character turnaround model sheet, organized grid layout with 4 columns and 6 rows (24 poses total), clean white background with clear cell separation`,
    `Character: ${characterDescription}`,
    propsNote,
    `Row 1 — Turnaround (Neutral Standing): front view, three-quarter front view, side profile view, back view`,
    `Row 2 — Expressions & Alternative Back: three-quarter back view, neutral expression close-up, determined expression, joyful laughing expression`,
    `Row 3 — Walk Cycles: walk cycle pose A (left foot forward), walk cycle pose B (right foot forward), walking toward viewer, walking away`,
    `Row 4 — Dynamic & Action: running side view, jumping with arms raised, dynamic hero landing pose, fighting/action stance`,
    `Row 5 — Still Poses & Interaction: sitting cross-legged, reaching hand outward, carrying an object, leaning against wall casually`,
    `Row 6 — Special Views & Details: face close-up head and shoulders, hand and accessory detail close-up, bird's-eye view from above, dramatic low angle from below`,
    refNote,
    `character reference sheet, model sheet, turnaround sheet, multiple poses and angles, animation reference`,
  ];

  if (avoidNote) parts.push(avoidNote);

  // Brand style guide context
  if (brandStyleGuide) {
    const bsg = [];
    if (brandStyleGuide.visual_style_notes) bsg.push(`Visual style: ${brandStyleGuide.visual_style_notes}`);
    if (brandStyleGuide.mood_atmosphere) bsg.push(`Mood: ${brandStyleGuide.mood_atmosphere}`);
    if (brandStyleGuide.lighting_prefs) bsg.push(`Lighting: ${brandStyleGuide.lighting_prefs}`);
    if (brandStyleGuide.composition_style) bsg.push(`Composition: ${brandStyleGuide.composition_style}`);
    if (brandStyleGuide.ai_prompt_rules) bsg.push(`Rules: ${brandStyleGuide.ai_prompt_rules}`);
    if (brandStyleGuide.preferred_elements) bsg.push(`Include: ${brandStyleGuide.preferred_elements}`);
    if (brandStyleGuide.prohibited_elements) bsg.push(`Exclude: ${brandStyleGuide.prohibited_elements}`);
    if (bsg.length > 0) parts.push(`Brand style guide (${brandStyleGuide.brand_name || 'unnamed'}): ${bsg.join('. ')}`);
  }

  return parts.join('. ');
}

// ─── Model Definitions ────────────────────────────────────────────────────────
// type: 'edit' = requires reference image, uses sync fal.run
// type: 'generate' = text-to-image, uses queue.fal.run
// type: 'both' = can do either (like fal-flux)

const MODELS = {
  'nano-banana-2-edit': {
    endpoint: 'fal-ai/nano-banana-2/edit',
    type: 'edit',
    buildPayload: (prompt, refUrl, extras) => ({
      prompt,
      image_urls: [refUrl],
      num_images: 1,
      output_format: 'png',
      aspect_ratio: '2:3',
      resolution: '1K',
      safety_tolerance: '4',
      ...(extras?.negativePrompt ? { negative_prompt: extras.negativePrompt } : {}),
    }),
  },
  'nano-banana-pro': {
    endpoint: 'fal-ai/nano-banana-pro/edit',
    type: 'edit',
    buildPayload: (prompt, refUrl, extras) => ({
      prompt,
      image_urls: [refUrl],
      num_images: 1,
      output_format: 'png',
      aspect_ratio: '2:3',
      resolution: '1K',
      safety_tolerance: '4',
      ...(extras?.negativePrompt ? { negative_prompt: extras.negativePrompt } : {}),
    }),
  },
  'seedream': {
    endpoint: 'fal-ai/bytedance/seedream/v4.5/edit',
    type: 'edit',
    buildPayload: (prompt, refUrl, extras) => ({
      prompt,
      image_urls: [refUrl],
      num_images: 1,
      width: 1440,
      height: 2560,
      ...(extras?.negativePrompt ? { negative_prompt: extras.negativePrompt } : {}),
    }),
  },
  'nano-banana-2': {
    endpoint: 'fal-ai/nano-banana-2',
    type: 'generate',
    buildPayload: (prompt, _refUrl, extras) => ({
      prompt,
      num_images: 1,
      output_format: 'png',
      aspect_ratio: '2:3',
      resolution: '1K',
      safety_tolerance: '4',
      ...(extras?.negativePrompt ? { negative_prompt: extras.negativePrompt } : {}),
    }),
  },
  'seedream-generate': {
    endpoint: 'fal-ai/bytedance/seedream/v4/text-to-image',
    type: 'generate',
    buildPayload: (prompt, _refUrl, extras) => ({
      prompt,
      num_images: 1,
      width: 1024,
      height: 1536,
      ...(extras?.negativePrompt ? { negative_prompt: extras.negativePrompt } : {}),
    }),
  },
  'fal-flux': {
    endpoint: 'fal-ai/flux-2/lora',
    editEndpoint: 'fal-ai/flux-2/lora/edit',
    type: 'both',
    buildPayload: (prompt, refUrl, extras) => {
      const loraList = extras?.loras;
      const negPrompt = extras?.negativePrompt;
      if (refUrl) {
        return {
          prompt,
          image_urls: [refUrl],
          image_size: { width: 1024, height: 1536 },
          strength: 0.85,
          num_images: 1,
          ...(loraList?.length ? { loras: loraList.map(l => ({ path: l.url, scale: l.scale ?? 1.0 })) } : {}),
          ...(negPrompt ? { negative_prompt: negPrompt } : {}),
        };
      }
      return {
        prompt,
        image_size: { width: 1024, height: 1536 },
        num_images: 1,
        ...(loraList?.length ? { loras: loraList.map(l => ({ path: l.url, scale: l.scale ?? 1.0 })) } : {}),
        ...(negPrompt ? { negative_prompt: negPrompt } : {}),
      };
    },
  },
};

// Fallback order for edit models: if the selected model is down, try the next one
const EDIT_FALLBACK_ORDER = ['nano-banana-2-edit', 'nano-banana-pro', 'seedream'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    referenceImageUrl,
    characterDescription,
    style = 'concept-art',
    model = 'nano-banana-2-edit',
    loraUrl,
    loras,
    negativePrompt,
    props,
    brandStyleGuide,
  } = req.body;

  if (!characterDescription) {
    return res.status(400).json({ error: 'characterDescription is required' });
  }

  const modelDef = MODELS[model];
  if (!modelDef) {
    return res.status(400).json({ error: `Unknown model: ${model}` });
  }

  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const hasRef = !!referenceImageUrl;
  const negPrompt = negativePrompt?.trim() || undefined;
  const prompt = buildTurnaroundPrompt({
    characterDescription,
    style,
    hasReference: hasRef,
    props: Array.isArray(props) ? props : undefined,
    negativePrompt: negPrompt,
    brandStyleGuide: brandStyleGuide || undefined,
  });

  // Validate: edit models REQUIRE a reference image
  if (modelDef.type === 'edit' && !hasRef) {
    return res.status(400).json({
      error: `${model} requires a reference image. Please upload one or switch to a generate model (Nano Banana 2 or Flux 2).`,
    });
  }

  console.log(`[Turnaround] Model: ${model} | Type: ${modelDef.type} | Style: ${style} | Reference: ${hasRef}`);
  console.log(`[Turnaround] Character: ${characterDescription.substring(0, 100)}...`);

  try {
    let result;
    const extras = { loras: loras || (loraUrl ? [{ url: loraUrl, scale: 1 }] : null), negativePrompt: negPrompt };

    if (modelDef.type === 'edit' || (modelDef.type === 'both' && hasRef)) {
      // Edit path — try with automatic fallback through available models
      result = await tryEditWithFallback(FAL_KEY, model, modelDef, prompt, referenceImageUrl, extras);

    } else if (modelDef.type === 'both' && !hasRef) {
      // Flux without reference → generate endpoint, queue
      const payload = modelDef.buildPayload(prompt, null, extras);
      result = await submitToQueue(FAL_KEY, modelDef.endpoint, model, payload);

    } else {
      // Pure generate → queue
      const payload = modelDef.buildPayload(prompt, null, extras);
      result = await submitToQueue(FAL_KEY, modelDef.endpoint, model, payload);
    }

    await logCost({
      username: req.user.email || req.user.id,
      category: 'fal',
      operation: 'turnaround_sheet',
      model: result.usedModel || model,
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

// ─── Try edit with automatic fallback ─────────────────────────────────────────
// If the selected edit model returns a service error (502/503/504), automatically
// try the next available edit model. This ensures the turnaround works even when
// one fal.ai model endpoint is temporarily down.

async function tryEditWithFallback(falKey, requestedModel, requestedModelDef, prompt, refUrl, extras) {
  // Build the ordered list: requested model first, then fallbacks
  const modelsToTry = [requestedModel];
  for (const fallback of EDIT_FALLBACK_ORDER) {
    if (fallback !== requestedModel && MODELS[fallback]) {
      modelsToTry.push(fallback);
    }
  }

  const errors = [];

  for (const modelId of modelsToTry) {
    const def = MODELS[modelId];
    if (!def) continue;

    const endpoint = def.type === 'both' ? def.editEndpoint : def.endpoint;
    if (!endpoint) continue;

    const payload = def.buildPayload(prompt, refUrl, extras);

    if (modelId !== requestedModel) {
      console.log(`[Turnaround] ⚠️  Falling back to ${modelId} after ${requestedModel} failed`);
    }

    try {
      const result = await callSync(falKey, endpoint, payload);
      if (result) {
        if (modelId !== requestedModel) {
          console.log(`[Turnaround] ✅ Fallback ${modelId} succeeded`);
          result.usedModel = modelId;
          result.fallbackUsed = true;
          result.fallbackNote = `${requestedModel} was unavailable — used ${modelId} instead`;
        }
        return result;
      }
    } catch (err) {
      const isServiceDown = err.statusCode >= 500 || err.message?.includes('unavailable') || err.message?.includes('504') || err.message?.includes('503') || err.message?.includes('502');
      errors.push({ model: modelId, error: err.message });
      console.warn(`[Turnaround] ${modelId} failed: ${err.message?.substring(0, 100)}`);

      if (!isServiceDown) {
        // Non-service error (400, auth, etc.) — don't try fallbacks, it's our fault
        throw err;
      }
      // Service error — continue to next fallback
    }
  }

  throw new Error(`All models unavailable. Tried: ${errors.map(e => e.model).join(', ')}. Please try again in a few minutes.`);
}

// ─── Synchronous call (edit endpoints) ────────────────────────────────────────
// Uses fal.run — blocks until image is returned. More reliable for edit models.

async function callSync(falKey, endpoint, payload) {
  console.log(`[Turnaround] Sync call: fal.run/${endpoint}`);
  console.log(`[Turnaround] Payload keys: ${Object.keys(payload).join(', ')}`);

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
    console.error(`[Turnaround] Sync error (${response.status}) from ${endpoint}: ${errorText.substring(0, 300)}`);
    const err = new Error(`${endpoint} error (${response.status}): ${errorText.substring(0, 200)}`);
    err.statusCode = response.status;
    throw err;
  }

  const data = await response.json();
  console.log(`[Turnaround] Sync response keys: ${Object.keys(data).join(', ')}`);

  if (data.images?.[0]?.url) {
    console.log(`[Turnaround] ✅ Got image from sync call to ${endpoint}`);
    return { imageUrl: data.images[0].url, status: 'completed' };
  }

  throw new Error(`No image returned from ${endpoint}`);
}

// ─── Queue-based call (generate endpoints) ────────────────────────────────────
// Posts to queue.fal.run — returns requestId for frontend polling.

async function submitToQueue(falKey, endpoint, pollModelId, payload) {
  console.log(`[Turnaround] Queue submit: queue.fal.run/${endpoint}`);
  console.log(`[Turnaround] Payload keys: ${Object.keys(payload).join(', ')}`);

  const response = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Turnaround] Queue error (${response.status}): ${errorText.substring(0, 300)}`);
    throw new Error(`${pollModelId} queue error: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  console.log(`[Turnaround] Queue response keys: ${Object.keys(data).join(', ')}`);

  // Some fast models return the image directly even via queue
  if (data.images?.[0]?.url) {
    console.log(`[Turnaround] Got immediate result from queue`);
    return { imageUrl: data.images[0].url, status: 'completed' };
  }

  // Normal queue response — return requestId for polling
  if (data.request_id) {
    console.log(`[Turnaround] Queued: ${data.request_id} → poll as ${pollModelId}`);
    return {
      requestId: data.request_id,
      model: pollModelId,
      status: 'processing',
      statusUrl: data.status_url,
      responseUrl: data.response_url,
    };
  }

  throw new Error(`Unexpected response from ${endpoint} — no image or request_id`);
}
