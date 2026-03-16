/**
 * Turnaround Sheet Generator
 * Generates a SINGLE image containing a 4×6 character turnaround grid.
 *
 * ALL models use queue.fal.run to submit async jobs — returns a requestId
 * for the frontend to poll via /api/imagineer/result.
 * This avoids Fly.io proxy timeouts (60s) on long-running generations.
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
      const loraList = loras || (loraUrl ? [{ url: loraUrl, scale: 1 }] : null);
      if (hasRef) {
        result = await submitToQueue(FAL_KEY, MODEL_ENDPOINTS['fal-flux'].edit, 'fal-flux-edit', {
          image_urls: [referenceImageUrl],
          prompt,
          image_size: { width: 1024, height: 1536 },
          strength: 0.85,
          num_images: 1,
          ...(loraList?.length ? { loras: loraList.map(l => ({ path: l.url, scale: l.scale ?? 1.0 })) } : {}),
        });
      } else {
        result = await submitToQueue(FAL_KEY, MODEL_ENDPOINTS['fal-flux'].generate, 'fal-flux', {
          prompt,
          image_size: { width: 1024, height: 1536 },
          num_images: 1,
          ...(loraList?.length ? { loras: loraList.map(l => ({ path: l.url, scale: l.scale ?? 1.0 })) } : {}),
        });
      }
    } else if (hasRef) {
      const endpoint = MODEL_ENDPOINTS[model]?.edit;
      if (!endpoint) {
        return res.status(400).json({ error: `No edit endpoint for model: ${model}` });
      }

      const payload = {
        prompt,
        image_urls: [referenceImageUrl],
        num_images: 1,
      };

      // Model-specific options
      if (model === 'seedream') {
        payload.width = 1440;
        payload.height = 2560;
      } else {
        payload.output_format = 'png';
        payload.aspect_ratio = '2:3';
        payload.resolution = '1K';
        payload.safety_tolerance = '4';
      }

      const pollModelId = `${model}-edit`;
      result = await submitToQueue(FAL_KEY, endpoint, pollModelId, payload);

    } else if (MODEL_ENDPOINTS[model]?.generate) {
      result = await submitToQueue(FAL_KEY, MODEL_ENDPOINTS[model].generate, model, {
        prompt,
        aspect_ratio: '2:3',
        resolution: '1K',
        num_images: 1,
        output_format: 'png',
        safety_tolerance: '4',
      });
    } else {
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

// ─── Submit to fal.ai queue (all models) ──────────────────────────────────────
// Posts to queue.fal.run and returns requestId + model for frontend polling.
// Never blocks waiting for the image — returns immediately.

async function submitToQueue(falKey, endpoint, pollModelId, payload) {
  console.log(`[Turnaround] Submitting to queue: ${endpoint}`);
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
    console.error(`[Turnaround] Queue submit error (${response.status}): ${errorText.substring(0, 300)}`);
    throw new Error(`${pollModelId} error: ${errorText.substring(0, 200)}`);
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
