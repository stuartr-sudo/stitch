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

import sharp from 'sharp';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';
import { getPoseSetById, getPoseSetGrid } from '../lib/turnaroundPoseSets.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Upscale an image 2x using Topaz via FAL.
 * Returns the upscaled image URL, or the original on error.
 */
const TOPAZ_ENDPOINT = 'fal-ai/topaz/upscale/image';

async function upscaleImage(imageUrl, falKey) {
  try {
    console.log(`[Turnaround/Upscale] Upscaling: ${imageUrl.substring(0, 80)}...`);
    const submitRes = await fetch(`https://queue.fal.run/${TOPAZ_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        model: 'Standard V2',
        upscale_factor: 2,
        output_format: 'png',
        subject_detection: 'All',
        face_enhancement: false,
      }),
    });

    const data = await submitRes.json();

    // Synchronous result
    if (data.image?.url) {
      console.log(`[Turnaround/Upscale] Done (sync): ${data.image.url.substring(0, 80)}`);
      return data.image.url;
    }

    // Queued — poll
    if (data.request_id) {
      const statusUrl = data.status_url || `https://queue.fal.run/${TOPAZ_ENDPOINT}/requests/${data.request_id}/status`;
      const responseUrl = data.response_url || `https://queue.fal.run/${TOPAZ_ENDPOINT}/requests/${data.request_id}`;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(statusUrl, { headers: { 'Authorization': `Key ${falKey}` } });
        const status = await statusRes.json();
        if (status.status === 'COMPLETED') {
          const resultRes = await fetch(responseUrl, { headers: { 'Authorization': `Key ${falKey}` } });
          const result = await resultRes.json();
          if (result.image?.url) {
            console.log(`[Turnaround/Upscale] Done (queued): ${result.image.url.substring(0, 80)}`);
            return result.image.url;
          }
        }
        if (status.status !== 'IN_QUEUE' && status.status !== 'IN_PROGRESS') break;
      }
    }

    console.warn('[Turnaround/Upscale] Timed out, using original');
    return imageUrl;
  } catch (err) {
    console.warn('[Turnaround/Upscale] Error, using original:', err.message);
    return imageUrl;
  }
}

/**
 * Stitch multiple reference images into a single side-by-side grid image.
 * Arranges images in a row (up to 4), or a 2×N grid if >4 images.
 * Returns a Supabase public URL of the stitched image.
 */
async function stitchReferenceImages(imageUrls, supabase) {
  if (!imageUrls || imageUrls.length <= 1) return imageUrls?.[0] || null;

  // Fetch all images as buffers
  const buffers = await Promise.all(
    imageUrls.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch reference image: ${url}`);
      return Buffer.from(await res.arrayBuffer());
    })
  );

  // Get metadata to determine sizing
  const metas = await Promise.all(buffers.map(b => sharp(b).metadata()));

  // Normalize all images to the same height (use the smallest height, max 768px)
  const targetHeight = Math.min(768, ...metas.map(m => m.height || 768));
  const resized = await Promise.all(
    buffers.map(b => sharp(b).resize({ height: targetHeight }).toBuffer())
  );

  // Get resized dimensions
  const resizedMetas = await Promise.all(resized.map(b => sharp(b).metadata()));

  // Layout: single row if ≤4 images, else 2 columns
  const cols = imageUrls.length <= 4 ? imageUrls.length : 2;
  const rows = Math.ceil(imageUrls.length / cols);

  // Calculate canvas size
  const colWidths = [];
  for (let c = 0; c < cols; c++) {
    let maxW = 0;
    for (let r = 0; r < rows; r++) {
      const idx = r * cols + c;
      if (idx < resizedMetas.length) maxW = Math.max(maxW, resizedMetas[idx].width);
    }
    colWidths.push(maxW);
  }
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const totalHeight = targetHeight * rows;

  // Composite all images onto a white canvas
  const composites = resized.map((buf, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const left = colWidths.slice(0, col).reduce((a, b) => a + b, 0);
    const top = row * targetHeight;
    return { input: buf, left, top };
  });

  const stitchedBuffer = await sharp({
    create: { width: totalWidth, height: totalHeight, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toBuffer();

  // Upload to Supabase
  const filename = `turnaround-ref-stitch-${Date.now()}.jpg`;
  const path = `media/turnaround/${filename}`;
  const { error: uploadErr } = await supabase.storage
    .from('media')
    .upload(`turnaround/${filename}`, stitchedBuffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadErr) throw new Error(`Stitch upload failed: ${uploadErr.message}`);

  const { data: urlData } = supabase.storage.from('media').getPublicUrl(`turnaround/${filename}`);
  console.log(`[Turnaround] Stitched ${imageUrls.length} reference images → ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

/**
 * Builds a single cohesive prompt from all structured inputs.
 * This is the ONLY place prompt text is assembled — the frontend sends raw data.
 */
function buildTurnaroundPrompt({ characterDescription, style, hasReference, multipleReferences, props, negativePrompt, brandStyleGuide, poseSet, backgroundMode, sceneEnvironment }) {
  // Style rendering instructions
  const stylePrompt = (style && style.trim())
    ? `Rendered in ${style.trim()} style with high quality, detailed ${style.trim()} aesthetic throughout every cell`
    : 'Professional concept art style, clean detailed rendering, animation studio quality';

  // Reference handling
  const refNote = hasReference
    ? multipleReferences
      ? 'The reference image contains multiple views of the same character stitched together. Study ALL views carefully to understand the character from every angle. Recreate this exact character consistently in every cell of the grid, maintaining accurate proportions, colors, outfit, and details from all reference angles'
      : 'Use the reference image as the character design. Recreate this exact character in every cell of the grid'
    : 'Same character in every cell with consistent design, proportions, colors, and outfit throughout the entire sheet';

  // Props — woven into the pose descriptions
  const propsNote = (props && props.length > 0)
    ? `The character has the following props/accessories which should appear naturally throughout the poses: ${props.join(', ')}. Incorporate these items into relevant poses — for example, holding, wearing, using, or interacting with them`
    : 'No additional props or accessories — focus purely on the character';

  // Expression conflict resolution — only for standard-24 which has Row 2 expression cells
  let expressionCells = ['determined expression', 'joyful laughing expression'];
  if ((poseSet || 'standard-24') === 'standard-24' && negativePrompt) {
    const negLower = (negativePrompt || '').toLowerCase();

    // Default Row 2 expressions — filter out any that conflict with the negative prompt
    const defaultExpressions = [
      { label: 'determined expression', conflicts: ['angry', 'aggressive', 'fierce', 'intense', 'negative emotion'] },
      { label: 'joyful laughing expression', conflicts: ['sad', 'negative emotion', 'crying', 'unhappy'] },
    ];
    // Replacement expressions if originals are filtered out
    const safeExpressions = [
      'calm confident expression',
      'gentle smile expression',
      'curious interested expression',
      'thoughtful expression',
    ];

    expressionCells = defaultExpressions.map(e => {
      const isConflicting = e.conflicts.some(c => negLower.includes(c));
      return isConflicting ? null : e.label;
    });
    // Replace filtered expressions with safe alternatives
    let safeIdx = 0;
    expressionCells = expressionCells.map(e => {
      if (e === null && safeIdx < safeExpressions.length) return safeExpressions[safeIdx++];
      if (e === null) return 'neutral pleasant expression';
      return e;
    });
  }

  // Build the avoidance instruction — placed FIRST so the model sees it early
  const avoidNote = negativePrompt
    ? `CRITICAL INSTRUCTION — DO NOT include any of the following in ANY cell of this sheet: ${negativePrompt}. Every cell must avoid these elements completely`
    : '';

  const parts = [];

  // Avoidance goes FIRST — models pay most attention to the beginning of the prompt
  if (avoidNote) parts.push(avoidNote);

  // Derive grid dimensions from pose set structure
  const { cols: gridCols, rows: gridRows, total: gridTotal } = getPoseSetGrid(poseSet || 'standard-24');

  // Background: white (default), gray, or scene environment for R2V-compatible references
  const gridDesc = `Professional character turnaround model sheet, organized grid layout with ${gridCols} columns and ${gridRows} rows (${gridTotal} poses total)`;
  const cellDesc = 'clear cell separation, each cell should be large and detailed';
  let backgroundText;
  if (backgroundMode === 'scene' && sceneEnvironment) {
    backgroundText = `${gridDesc}, each pose set in a ${sceneEnvironment.trim()} environment with contextual background, ${cellDesc}`;
  } else if (backgroundMode === 'gray') {
    backgroundText = `${gridDesc}, clean neutral gray background with ${cellDesc}`;
  } else {
    backgroundText = `${gridDesc}, clean white background with ${cellDesc}`;
  }

  // 2. CHARACTER IDENTITY ANCHOR — face, hair, eyes, distinguishing marks, outfit
  // This is the most important section for consistency
  parts.push(`Character: ${characterDescription}`);

  // 3. Reference image instructions — locks identity to visual anchor
  parts.push(refNote);

  // 4. Grid layout & background instructions
  parts.push(backgroundText);

  // 5. Consistency & alignment instructions (from best-practice research)
  parts.push(
    'Maintain perfect identity consistency across every cell. Consistent head height alignment across all full-body views. Even spacing, uniform framing, relaxed A-pose for standing views. Same character proportions, facial features, hair, outfit colors, and accessories in every cell'
  );

  // 6. Style rendering
  parts.push(stylePrompt);

  // 7. Props integration
  parts.push(propsNote);

  // 8. Dynamic row definitions from pose set
  const poseSetData = getPoseSetById(poseSet || 'standard-24');
  poseSetData.rows.forEach((row, i) => {
    // For standard-24 Row 2, use expression-conflict-resolved cells
    if ((poseSet || 'standard-24') === 'standard-24' && i === 1) {
      const cells = row.cells.map((c, ci) => {
        if (ci === 2) return expressionCells[0];
        if (ci === 3) return expressionCells[1];
        return c.prompt;
      });
      parts.push(`Row ${i + 1} — ${row.label}: ${cells.join(', ')}`);
    } else {
      parts.push(`Row ${i + 1} — ${row.label}: ${row.cells.map(c => c.prompt).join(', ')}`);
    }
  });

  // 9. Taxonomy tags for model understanding
  parts.push('character reference sheet, model sheet, turnaround sheet, multiple poses and angles, animation reference');

  // 10. Repeat avoidance at the end for reinforcement
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

// Grid-aware aspect ratio & dimensions:
// 2×2 grids → 1:1 square (maximize per-cell resolution)
// 3×2 grids → 3:2 landscape (3 wide columns, 2 rows)
// 4×6 grids → 2:3 portrait (more rows than cols)
function gridAspect(extras) {
  if (extras?.gridSquare) return '1:1';
  if (extras?.gridLandscape) return '3:2';
  return '2:3';
}
function gridSeedreamDims(extras) {
  if (extras?.gridSquare) return { width: 2048, height: 2048 };
  if (extras?.gridLandscape) return { width: 2560, height: 1440 };
  return { width: 1440, height: 2560 };
}
function gridFluxDims(extras) {
  if (extras?.gridSquare) return { width: 1536, height: 1536 };
  if (extras?.gridLandscape) return { width: 1536, height: 1024 };
  return { width: 1024, height: 1536 };
}

const MODELS = {
  'nano-banana-2-edit': {
    endpoint: 'fal-ai/nano-banana-2/edit',
    type: 'edit',
    buildPayload: (prompt, refUrl, extras) => ({
      prompt,
      image_urls: [refUrl],
      num_images: 1,
      output_format: 'png',
      aspect_ratio: gridAspect(extras),
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
      aspect_ratio: gridAspect(extras),
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
      ...gridSeedreamDims(extras),
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
      aspect_ratio: gridAspect(extras),
      resolution: '1K',
      safety_tolerance: '4',
      ...(extras?.negativePrompt ? { negative_prompt: extras.negativePrompt } : {}),
    }),
  },
  'seedream-generate': {
    endpoint: 'fal-ai/bytedance/seedream/v4/text-to-image',
    type: 'generate',
    buildPayload: (prompt, _refUrl, extras) => {
      const dims = gridSeedreamDims(extras);
      return {
        prompt,
        num_images: 1,
        width: dims.width,
        height: dims.height,
        ...(extras?.negativePrompt ? { negative_prompt: extras.negativePrompt } : {}),
      };
    },
  },
  'fal-flux': {
    endpoint: 'fal-ai/flux-2/lora',
    editEndpoint: 'fal-ai/flux-2/lora/edit',
    type: 'both',
    buildPayload: (prompt, refUrl, extras) => {
      const loraList = extras?.loras;
      const negPrompt = extras?.negativePrompt;
      const dims = gridFluxDims(extras);
      if (refUrl) {
        return {
          prompt,
          image_urls: [refUrl],
          image_size: dims,
          strength: 0.85,
          num_images: 1,
          ...(loraList?.length ? { loras: loraList.map(l => { const e = { path: l.url, scale: l.scale ?? 1.0 }; if (l.transformer) e.transformer = l.transformer; return e; }) } : {}),
          ...(negPrompt ? { negative_prompt: negPrompt } : {}),
        };
      }
      return {
        prompt,
        image_size: dims,
        num_images: 1,
        ...(loraList?.length ? { loras: loraList.map(l => { const e = { path: l.url, scale: l.scale ?? 1.0 }; if (l.transformer) e.transformer = l.transformer; return e; }) } : {}),
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
    referenceImageUrl,   // legacy single URL (backward compat)
    referenceImageUrls,  // new: array of URLs
    characterDescription,
    style = 'concept-art',
    model = 'nano-banana-2-edit',
    loraUrl,
    loras,
    negativePrompt,
    props,
    brandStyleGuide,
    poseSet,
    characterName,
    backgroundMode,    // 'white' (default), 'gray', or 'scene'
    sceneEnvironment,  // e.g. 'Meadow', 'Forest', etc.
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

  // Resolve reference images — stitch multiple into one if needed
  const rawRefUrls = referenceImageUrls?.length ? referenceImageUrls : (referenceImageUrl ? [referenceImageUrl] : []);
  let resolvedRefUrl = rawRefUrls[0] || null;

  if (rawRefUrls.length > 1) {
    try {
      const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      resolvedRefUrl = await stitchReferenceImages(rawRefUrls, supabase);
      console.log(`[Turnaround] Stitched ${rawRefUrls.length} reference images into composite`);
    } catch (err) {
      console.error('[Turnaround] Stitch failed, using first image:', err.message);
      resolvedRefUrl = rawRefUrls[0];
    }
  }

  const hasRef = !!resolvedRefUrl;
  const negPrompt = negativePrompt?.trim() || undefined;
  const prompt = buildTurnaroundPrompt({
    characterDescription,
    style,
    hasReference: hasRef,
    multipleReferences: rawRefUrls.length > 1,
    props: Array.isArray(props) ? props : undefined,
    negativePrompt: negPrompt,
    brandStyleGuide: brandStyleGuide || undefined,
    poseSet,
    backgroundMode,
    sceneEnvironment,
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
    const { cols: gridCols, rows: gridRows } = getPoseSetGrid(poseSet || 'standard-24');
    const gridSquare = gridCols <= 2 && gridRows <= 2;
    const gridLandscape = gridCols > gridRows && !gridSquare; // 3x2 = landscape
    const extras = { loras: loras || (loraUrl ? [{ url: loraUrl, scale: 1 }] : null), negativePrompt: negPrompt, gridSquare, gridLandscape };

    if (modelDef.type === 'edit' || (modelDef.type === 'both' && hasRef)) {
      // Edit path — try with automatic fallback through available models
      result = await tryEditWithFallback(FAL_KEY, model, modelDef, prompt, resolvedRefUrl, extras);
      // Auto-upscale completed turnaround sheets for higher quality cell extraction
      if (result.imageUrl) {
        result.imageUrl = await upscaleImage(result.imageUrl, FAL_KEY);
        result.upscaled = true;
      }

    } else if (modelDef.type === 'both' && !hasRef) {
      // Queue-based models — upscale not applied automatically (image not available yet).
      // Users can upscale individual cells via the cell editor after generation completes.
      const payload = modelDef.buildPayload(prompt, null, extras);
      result = await submitToQueue(FAL_KEY, modelDef.endpoint, model, payload);

    } else {
      // Queue-based models — upscale not applied automatically (image not available yet).
      // Users can upscale individual cells via the cell editor after generation completes.
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
