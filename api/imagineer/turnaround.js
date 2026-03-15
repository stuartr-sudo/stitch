/**
 * Turnaround Sheet Generator
 * Generates a 4×6 character turnaround sheet from a reference image.
 * Each cell shows the character at a different angle/pose/action.
 * Uses fal.ai Nano Banana 2 or Flux 2 for parallel image generation.
 */

import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

// 24 cells: 4 columns × 6 rows
// Row themes: angles, expressions, actions, dynamic motion, interaction, detail views
const CELL_DEFINITIONS = [
  // Row 1 — Core angles (front, 3/4, side, back)
  { angle: 'front view', action: 'standing in a neutral A-pose', label: 'Front' },
  { angle: 'three-quarter front view', action: 'standing relaxed with arms slightly out', label: '3/4 Front' },
  { angle: 'side profile view', action: 'standing upright', label: 'Side' },
  { angle: 'back view from behind', action: 'standing with arms at sides', label: 'Back' },

  // Row 2 — Rotational angles
  { angle: 'three-quarter back view', action: 'looking over shoulder', label: '3/4 Back' },
  { angle: 'front view', action: 'slight head tilt, gentle smile', label: 'Neutral Expression' },
  { angle: 'front view', action: 'determined expression, fists clenched', label: 'Determined' },
  { angle: 'three-quarter view', action: 'laughing joyfully', label: 'Joyful' },

  // Row 3 — Walking / movement cycle
  { angle: 'side profile view', action: 'mid-stride walking pose, one foot forward', label: 'Walk Cycle A' },
  { angle: 'side profile view', action: 'walking pose, opposite foot forward', label: 'Walk Cycle B' },
  { angle: 'three-quarter front view', action: 'walking toward the viewer', label: 'Walk Toward' },
  { angle: 'three-quarter back view', action: 'walking away from the viewer', label: 'Walk Away' },

  // Row 4 — Dynamic action poses
  { angle: 'side profile view', action: 'running at full speed, dynamic motion blur', label: 'Running' },
  { angle: 'front view', action: 'jumping in the air, arms raised triumphantly', label: 'Jumping' },
  { angle: 'low angle view from below', action: 'dramatic heroic landing pose, one knee down', label: 'Hero Landing' },
  { angle: 'three-quarter view', action: 'combat-ready fighting stance', label: 'Fighting Stance' },

  // Row 5 — Everyday actions & interaction
  { angle: 'three-quarter front view', action: 'sitting cross-legged on the ground', label: 'Sitting' },
  { angle: 'front view', action: 'reaching one hand out toward the viewer', label: 'Reaching Out' },
  { angle: 'three-quarter view', action: 'carrying a bag or object in one hand', label: 'Carrying' },
  { angle: 'side view', action: 'leaning against a wall casually, arms crossed', label: 'Leaning' },

  // Row 6 — Close-ups & detail
  { angle: 'close-up front view, head and shoulders only', action: 'neutral expression, showing face detail', label: 'Face Close-Up' },
  { angle: 'extreme close-up', action: 'showing hand and accessory details', label: 'Hand Detail' },
  { angle: 'top-down bird\'s-eye view from above', action: 'lying on the ground, looking up at camera', label: 'Top-Down' },
  { angle: 'dramatic worm\'s-eye view from below', action: 'powerful stance, looking down at camera', label: 'Worm\'s Eye' },
];

const STYLE_PRESETS = {
  'concept-art': 'professional concept art character turnaround sheet, clean white background, consistent proportions, animation reference quality, detailed rendering',
  'anime': 'anime character model sheet, clean cel-shaded style, consistent design, white background, animation production reference',
  '3d-render': '3D character model turnaround, clean studio lighting, neutral gray background, subsurface scattering, high detail',
  'comic-book': 'comic book character reference sheet, bold ink outlines, consistent design, clean white background, professional illustration',
  'pixar': 'Pixar-style 3D character turnaround, smooth rendering, appealing design, studio lighting, clean background',
  'realistic': 'photorealistic character reference sheet, studio photography lighting, neutral background, high detail, consistent appearance',
  'ghibli': 'Studio Ghibli style character sheet, soft watercolor rendering, gentle tones, hand-drawn warmth, clean background',
  'game-art': 'AAA video game character turnaround, PBR rendering reference, detailed textures, neutral studio lighting, clean background',
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

  const stylePrompt = STYLE_PRESETS[style] || STYLE_PRESETS['concept-art'];

  console.log(`[Turnaround] Starting 24-cell sheet | Model: ${model} | Style: ${style}`);
  console.log(`[Turnaround] Character: ${characterDescription.substring(0, 100)}...`);
  if (referenceImageUrl) console.log(`[Turnaround] Reference image provided`);

  try {
    // Build all 24 prompts
    const cellPrompts = CELL_DEFINITIONS.map((cell) => {
      const parts = [
        `Character turnaround sheet cell — ${cell.label}`,
        `${cell.angle} of ${characterDescription}`,
        cell.action,
        stylePrompt,
        'single character only, isolated pose, consistent character design throughout',
      ];
      return parts.join(', ');
    });

    // If we have a reference image, use image-to-image (Flux edit) for better consistency
    const useImageToImage = referenceImageUrl && model !== 'nano-banana-2';

    // Generate all 24 images in parallel batches
    // fal.ai can handle concurrent requests, but let's batch in groups of 6 to be reasonable
    const BATCH_SIZE = 6;
    const allResults = [];

    for (let batchStart = 0; batchStart < cellPrompts.length; batchStart += BATCH_SIZE) {
      const batch = cellPrompts.slice(batchStart, batchStart + BATCH_SIZE);
      const batchIndex = batchStart / BATCH_SIZE;

      console.log(`[Turnaround] Submitting batch ${batchIndex + 1}/${Math.ceil(cellPrompts.length / BATCH_SIZE)}`);

      const batchPromises = batch.map((prompt, i) => {
        if (useImageToImage) {
          return submitFluxEdit(FAL_KEY, prompt, referenceImageUrl, loras || (loraUrl ? [{ url: loraUrl, scale: 1 }] : null));
        }
        return submitGeneration(FAL_KEY, prompt, model, loras || (loraUrl ? [{ url: loraUrl, scale: 1 }] : null));
      });

      const batchResults = await Promise.allSettled(batchPromises);
      allResults.push(...batchResults);
    }

    // Collect request IDs and any immediate results
    const cellResults = allResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          index,
          label: CELL_DEFINITIONS[index].label,
          ...result.value,
        };
      }
      return {
        index,
        label: CELL_DEFINITIONS[index].label,
        error: result.reason?.message || 'Generation failed',
      };
    });

    // Log cost
    const successCount = cellResults.filter(r => !r.error).length;
    await logCost({
      username: req.user.email || req.user.id,
      category: 'fal',
      operation: 'turnaround_sheet',
      model: model,
      metadata: { cells_requested: 24, cells_submitted: successCount, style },
    });

    console.log(`[Turnaround] All batches submitted. ${successCount}/24 successful submissions`);

    return res.json({
      success: true,
      cellResults,
      totalCells: 24,
      gridCols: 4,
      gridRows: 6,
      cellDefinitions: CELL_DEFINITIONS.map(c => ({ label: c.label, angle: c.angle })),
      pollEndpoint: '/api/imagineer/result',
    });

  } catch (err) {
    console.error('[Turnaround] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function submitGeneration(falKey, prompt, model, loras) {
  if (model === 'fal-flux') {
    return submitFluxGenerate(falKey, prompt, loras);
  }
  return submitNanoBanana2(falKey, prompt);
}

async function submitNanoBanana2(falKey, prompt) {
  const response = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: '1:1',
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

async function submitFluxGenerate(falKey, prompt, loras) {
  const payload = {
    prompt,
    image_size: 'square_hd',
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

async function submitFluxEdit(falKey, prompt, imageUrl, loras) {
  const payload = {
    image_url: imageUrl,
    prompt,
    image_size: 'square_hd',
    strength: 0.65,
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
