/**
 * Turnaround Sheet Generator
 * Generates a SINGLE image containing a 4×6 character turnaround grid.
 * The model renders all 24 poses in one image, maintaining character consistency.
 * Uses fal.ai Nano Banana 2 or Flux 2 (with optional reference image).
 */

import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const STYLE_PRESETS = {
  'concept-art': 'professional concept art, clean detailed rendering, animation studio quality',
  'anime': 'anime cel-shaded illustration, clean line art, vibrant colors',
  '3d-render': '3D rendered character model, clean studio lighting, subsurface scattering',
  'comic-book': 'comic book illustration, bold ink outlines, professional coloring',
  'pixar': 'Pixar-style 3D animation, smooth appealing design, warm lighting',
  'realistic': 'photorealistic rendering, studio photography lighting, high detail',
  'ghibli': 'Studio Ghibli style, soft watercolor, gentle tones, hand-drawn warmth',
  'game-art': 'AAA video game character art, PBR textures, detailed rendering',
};

// Build the single-image turnaround prompt
function buildTurnaroundPrompt(characterDescription, style) {
  const stylePrompt = STYLE_PRESETS[style] || STYLE_PRESETS['concept-art'];

  return [
    `Professional character turnaround model sheet, organized grid layout with 4 columns and 6 rows (24 poses total), clean white background`,
    `Character: ${characterDescription}`,
    `Row 1: front view standing, three-quarter front view, side profile view, back view — all in neutral standing pose`,
    `Row 2: three-quarter back view, neutral expression close-up, determined expression, joyful laughing expression`,
    `Row 3: side view walk cycle pose A (left foot forward), walk cycle pose B (right foot forward), walking toward viewer, walking away`,
    `Row 4: running side view, jumping with arms raised, dynamic landing pose, fighting/action stance`,
    `Row 5: sitting cross-legged, reaching hand outward, carrying an object, leaning against wall casually`,
    `Row 6: face close-up head and shoulders, hand and accessory detail, bird's-eye view from above, dramatic low angle from below`,
    `Same character in every cell with consistent design, proportions, colors, and outfit throughout the entire sheet`,
    `${stylePrompt}`,
    `character reference sheet, model sheet, turnaround sheet, multiple poses and angles, animation reference, white background grid layout`,
  ].join('. ');
}

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

  const prompt = buildTurnaroundPrompt(characterDescription, style);

  console.log(`[Turnaround] Single-image sheet | Model: ${model} | Style: ${style}`);
  console.log(`[Turnaround] Character: ${characterDescription.substring(0, 100)}...`);
  console.log(`[Turnaround] Prompt length: ${prompt.length} chars`);

  try {
    let result;

    // If reference image provided and using Flux, use image-to-image
    if (referenceImageUrl && model === 'fal-flux') {
      result = await generateFluxEdit(FAL_KEY, prompt, referenceImageUrl, loras || (loraUrl ? [{ url: loraUrl, scale: 1 }] : null));
    } else if (model === 'fal-flux') {
      result = await generateFlux(FAL_KEY, prompt, loras || (loraUrl ? [{ url: loraUrl, scale: 1 }] : null));
    } else {
      result = await generateNanoBanana2(FAL_KEY, prompt);
    }

    await logCost({
      username: req.user.email || req.user.id,
      category: 'fal',
      operation: 'turnaround_sheet',
      model,
      metadata: { style, has_reference: !!referenceImageUrl },
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

async function generateNanoBanana2(falKey, prompt) {
  const response = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: '2:3',  // portrait — taller than wide for 4 cols × 6 rows
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

  if (data.images?.[0]?.url) {
    return { imageUrl: data.images[0].url, status: 'completed' };
  }
  if (data.request_id) {
    return { requestId: data.request_id, model: 'nano-banana-2', status: 'processing' };
  }
  throw new Error('Unexpected response format');
}

async function generateFlux(falKey, prompt, loras) {
  const payload = {
    prompt,
    image_size: { width: 1024, height: 1536 },  // 2:3 portrait for grid
    num_images: 1,
  };

  if (loras?.length) {
    payload.loras = loras.map(l => ({ path: l.url, scale: l.scale ?? 1.0 }));
  }

  const response = await fetch('https://queue.fal.run/fal-ai/flux-2/lora', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flux error: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();

  if (data.images?.[0]?.url) {
    return { imageUrl: data.images[0].url, status: 'completed' };
  }
  if (data.request_id) {
    return { requestId: data.request_id, model: 'fal-flux', status: 'processing' };
  }
  throw new Error('Unexpected Flux response');
}

async function generateFluxEdit(falKey, prompt, imageUrl, loras) {
  const payload = {
    image_url: imageUrl,
    prompt,
    image_size: { width: 1024, height: 1536 },
    strength: 0.85,  // high strength — we want the layout to change significantly
    num_images: 1,
  };

  if (loras?.length) {
    payload.loras = loras.map(l => ({ path: l.url, scale: l.scale ?? 1.0 }));
  }

  const response = await fetch('https://queue.fal.run/fal-ai/flux-2/lora/edit', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flux edit error: ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();

  if (data.images?.[0]?.url) {
    return { imageUrl: data.images[0].url, status: 'completed' };
  }
  if (data.request_id) {
    return { requestId: data.request_id, model: 'fal-flux-edit', status: 'processing' };
  }
  throw new Error('Unexpected Flux edit response');
}
