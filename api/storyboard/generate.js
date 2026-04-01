/**
 * Storyboard Script + Previews API
 *
 * POST /api/storyboard/projects/:id/generate-script
 *   Runs two-stage script generation and populates all frames with narrative
 *   beats + visual prompts. Saves directly to the storyboard_frames table.
 *
 * POST /api/storyboard/projects/:id/generate-previews
 *   Generates preview images for all frames (or specific frame numbers).
 *   Updates preview_image_url on each frame.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';
import { generateImage, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import {
  buildNarrativeSystemPrompt,
  buildNarrativeUserPrompt,
  calculateSceneCount,
  NarrativeArcSchema,
} from '../lib/storyboardNarrativeGenerator.js';
import {
  buildVisualDirectorSystemPrompt,
  buildVisualDirectorUserPrompt,
  postProcessVisualScenes,
  VisualDirectorOutputSchema,
} from '../lib/storyboardVisualDirector.js';
import {
  calculateGridLayout,
  buildGridPrompt,
  sliceGrid,
  uploadCellToSupabase,
} from '../lib/storyboardGridGenerator.js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Determine which sub-action
  const url = req.url || '';
  if (url.includes('/generate-previews')) return handleGeneratePreviews(req, res);
  if (url.includes('/generate-grid')) return handleGenerateGrid(req, res);
  if (url.includes('/interpolate-grid')) return handleInterpolateGrid(req, res);
  return handleGenerateScript(req, res);
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE SCRIPT — populate frames with narrative + visual prompts
// ═══════════════════════════════════════════════════════════════════════════

async function handleGenerateScript(req, res) {
  const supabase = getSupabase();
  const userId = req.user.id;

  const { storyboardId } = req.body;
  if (!storyboardId) return res.status(400).json({ error: 'storyboardId required' });

  // Load storyboard
  const { data: sb, error: sbErr } = await supabase
    .from('storyboards')
    .select('*')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (sbErr || !sb) return res.status(404).json({ error: 'Storyboard not found' });

  // Load existing frames (may be empty for first run)
  const { data: existingFrames } = await supabase
    .from('storyboard_frames')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .order('frame_number', { ascending: true });

  const hasExistingFrames = existingFrames?.length > 0;

  const { openaiKey } = await getUserKeys(userId, req.user.email);
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured.' });

  const openai = new OpenAI({ apiKey: openaiKey });

  // If frames exist, match that count. Otherwise let AI decide based on duration + style.
  const durationConstraints = {
    allowed: [sb.frame_interval || 4],
    min: sb.frame_interval || 4,
    max: sb.frame_interval || 4,
  };
  const targetSceneCount = hasExistingFrames
    ? existingFrames.length
    : calculateSceneCount(sb.desired_length, durationConstraints, sb.narrative_style || 'entertaining');

  console.log(`[Storyboard Script] Generating for "${sb.name}" — ${targetSceneCount} scenes (${hasExistingFrames ? 'updating existing' : 'creating new'})`);

  // Character descriptions
  const activeElements = (sb.elements || []).filter(el => el.description);
  const characterDescriptions = activeElements.map(el => el.description);

  try {
    // ── STAGE 1: Narrative ──
    console.log(`[Storyboard Script] Stage 1: Narrative generation...`);

    const narrativeInputs = {
      storyOverview: sb.description || sb.name,
      storyboardName: sb.name,
      overallMood: sb.overall_mood,
      narrativeStyle: sb.narrative_style || 'entertaining',
      targetAudience: sb.target_audience,
      desiredLength: sb.desired_length,
      targetSceneCount,
      durationConstraints,
      sceneDirection: sb.scene_direction,
      brandStyleGuide: sb.brand_data,
      clientBrief: sb.client_brief,
      hasDialogue: true, // always generate dialogue slots
    };

    const stage1 = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: buildNarrativeSystemPrompt(narrativeInputs) },
        { role: 'user', content: buildNarrativeUserPrompt(narrativeInputs) },
      ],
      response_format: zodResponseFormat(NarrativeArcSchema, 'narrative_arc'),
    });

    const arc = stage1.choices[0].message.parsed;
    if (stage1.usage) {
      logCost({ username: req.user.email?.split('@')[0], category: 'openai', operation: 'storyboard_stage1', model: 'gpt-4.1-mini-2025-04-14', input_tokens: stage1.usage.prompt_tokens, output_tokens: stage1.usage.completion_tokens });
    }

    console.log(`[Storyboard Script] Stage 1 complete: "${arc.title}" — ${arc.beats.length} beats`);

    // ── STAGE 2: Visual Director ──
    console.log(`[Storyboard Script] Stage 2: Visual direction for ${sb.global_model}...`);

    const visualInputs = {
      modelId: sb.global_model || 'veo3-fast',
      narrativeBeats: arc.beats,
      visualStylePrompt: sb.visual_style_prompt,
      builderStyle: sb.builder_style,
      builderLighting: sb.builder_lighting,
      builderColorGrade: sb.builder_color_grade,
      motionStylePrompt: sb.motion_style_prompt,
      startFrameDescription: sb.start_frame_description,
      characterDescriptions: characterDescriptions.length > 0 ? characterDescriptions : undefined,
      brandStyleGuide: sb.brand_data,
      aspectRatio: sb.aspect_ratio,
      sceneDirection: sb.scene_direction,
      anchorImageDescription: sb.anchor_image_description || null,
      ingredients: sb.ingredients || null,
    };

    const stage2 = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: buildVisualDirectorSystemPrompt(visualInputs) },
        { role: 'user', content: buildVisualDirectorUserPrompt(arc.beats.length) },
      ],
      response_format: zodResponseFormat(VisualDirectorOutputSchema, 'visual_director'),
    });

    const visual = stage2.choices[0].message.parsed;
    if (stage2.usage) {
      logCost({ username: req.user.email?.split('@')[0], category: 'openai', operation: 'storyboard_stage2', model: 'gpt-4.1-mini-2025-04-14', input_tokens: stage2.usage.prompt_tokens, output_tokens: stage2.usage.completion_tokens });
    }

    // Post-process for model compliance
    const processedScenes = postProcessVisualScenes(visual.scenes, sb.global_model || 'veo3-fast', sb.brand_data);

    console.log(`[Storyboard Script] Stage 2 complete: ${processedScenes.length} visual prompts`);

    // ── Write frames ──
    let framesUpdated = 0;
    let framesSkipped = 0;
    let finalFrames = [];

    const buildFrameData = (beat, vis) => ({
      beat_type: beat.beatType || null,
      narrative_note: beat.narrativeMoment || null,
      setting: beat.setting || null,
      character_action: beat.characterAction || null,
      character_emotion: beat.characterEmotion || null,
      emotional_tone: beat.emotionalTone || null,
      pacing_note: beat.pacingNote || null,
      transition_note: beat.transitionNote || null,
      dialogue: beat.dialogue || null,
      visual_prompt: vis.visualPrompt || null,
      motion_prompt: vis.motionPrompt || null,
      camera_angle: vis.cameraAngle || null,
      preview_image_prompt: vis.previewImagePrompt || null,
      negative_prompt: vis.negativePrompt || null,
      continuity_note: vis.continuityNote || null,
      brand_warnings: vis.brandWarnings || [],
    });

    if (!hasExistingFrames) {
      // ── CREATE frames from script output ──
      let runningTime = 0;
      const newFrames = [];
      for (let i = 0; i < arc.beats.length; i++) {
        const beat = arc.beats[i] || {};
        const vis = processedScenes[i] || {};
        const duration = beat.durationSeconds || (sb.frame_interval || 4);
        newFrames.push({
          storyboard_id: storyboardId,
          frame_number: i + 1,
          timestamp_seconds: runningTime,
          duration_seconds: duration,
          ...buildFrameData(beat, vis),
        });
        runningTime += duration;
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('storyboard_frames')
        .insert(newFrames)
        .select();

      if (insertErr) throw new Error('Failed to create frames: ' + insertErr.message);
      finalFrames = inserted || [];
      framesUpdated = finalFrames.length;
      console.log(`[Storyboard Script] Created ${framesUpdated} new frames`);
    } else {
      // ── UPDATE existing unlocked frames ──
      for (let i = 0; i < existingFrames.length; i++) {
        const frame = existingFrames[i];
        const beat = arc.beats[i] || {};
        const vis = processedScenes[i] || {};

        if (frame.locked) {
          framesSkipped++;
          continue;
        }

        const data = buildFrameData(beat, vis);
        await supabase
          .from('storyboard_frames')
          .update(data)
          .eq('id', frame.id);
        framesUpdated++;
      }

      // Re-fetch for response
      const { data: refreshed } = await supabase
        .from('storyboard_frames')
        .select('*')
        .eq('storyboard_id', storyboardId)
        .order('frame_number', { ascending: true });
      finalFrames = refreshed || [];
      console.log(`[Storyboard Script] Updated ${framesUpdated} frames, skipped ${framesSkipped} locked`);
    }

    // Update storyboard status + metadata
    await supabase
      .from('storyboards')
      .update({
        status: 'scripted',
        logline: arc.logline,
      })
      .eq('id', storyboardId);

    return res.json({
      success: true,
      title: arc.title,
      logline: arc.logline,
      narrativeStyle: arc.narrativeStyle,
      emotionalArc: arc.overallEmotionalArc,
      framesUpdated,
      framesSkipped,
      frames: finalFrames,
      brandWarnings: processedScenes.flatMap(s => s.brandWarnings || []),
    });

  } catch (err) {
    console.error('[Storyboard Script] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE PREVIEWS — create preview images for frames
// ═══════════════════════════════════════════════════════════════════════════

async function handleGeneratePreviews(req, res) {
  const supabase = getSupabase();
  const userId = req.user.id;

  const { storyboardId, frameNumbers, imageModel = 'fal_flux' } = req.body;
  if (!storyboardId) return res.status(400).json({ error: 'storyboardId required' });

  const keys = await getUserKeys(userId, req.user.email);
  if (!keys.falKey && !keys.wavespeedKey) {
    return res.status(400).json({ error: 'Image generation API key required.' });
  }

  // Load storyboard
  const { data: sb } = await supabase
    .from('storyboards')
    .select('id, aspect_ratio, start_frame_url, anchor_image_description')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (!sb) return res.status(404).json({ error: 'Storyboard not found' });

  // Load frames (optionally filtered), including generation_mode for continuity
  let query = supabase
    .from('storyboard_frames')
    .select('id, frame_number, preview_image_prompt, visual_prompt, preview_image_url, generation_mode')
    .eq('storyboard_id', storyboardId)
    .order('frame_number');

  if (frameNumbers?.length) {
    query = query.in('frame_number', frameNumbers);
  }

  const { data: frames } = await query;
  if (!frames?.length) return res.status(400).json({ error: 'No frames to generate previews for' });

  console.log(`[Storyboard Previews] Generating ${frames.length} preview images...`);

  // Generate all in parallel (collect as indexed for continuity lookups)
  const results = await Promise.all(frames.map(async (frame, i) => {
    const genMode = frame.generation_mode || 'auto';

    // standalone mode: generate fresh with no references
    // continuity mode: use previous frame's preview as style reference
    // Frame 1: use start frame if available (unless standalone)
    if (frame.frame_number === 1 && sb.start_frame_url && genMode !== 'standalone') {
      await supabase.from('storyboard_frames').update({
        preview_image_url: sb.start_frame_url,
        preview_status: 'done',
      }).eq('id', frame.id);

      return { frameNumber: frame.frame_number, imageUrl: sb.start_frame_url, source: 'start_frame' };
    }

    const basePrompt = frame.preview_image_prompt || frame.visual_prompt;
    if (!basePrompt) {
      return { frameNumber: frame.frame_number, error: 'No prompt — run script generation first' };
    }

    // Build final prompt incorporating anchor style if set
    let prompt = basePrompt;
    if (sb.anchor_image_description && genMode !== 'standalone') {
      prompt = `[Visual style: ${sb.anchor_image_description.substring(0, 150)}] ${basePrompt}`;
    }

    // Continuity: prepend previous frame's visual context
    if (genMode === 'continuity' && i > 0) {
      const prevFrame = frames[i - 1];
      if (prevFrame?.preview_image_url) {
        prompt = `[Continue from previous scene style] ${prompt}`;
      }
    }

    try {
      await supabase.from('storyboard_frames').update({ preview_status: 'generating' }).eq('id', frame.id);

      const imageUrl = await generateImage(prompt, sb.aspect_ratio || '16:9', keys, supabase, imageModel);

      await supabase.from('storyboard_frames').update({
        preview_image_url: imageUrl,
        preview_status: 'done',
      }).eq('id', frame.id);

      return { frameNumber: frame.frame_number, imageUrl, source: 'generated' };
    } catch (err) {
      await supabase.from('storyboard_frames').update({ preview_status: 'error' }).eq('id', frame.id);
      return { frameNumber: frame.frame_number, error: err.message };
    }
  }));

  const success = results.filter(r => r.imageUrl).length;
  const failed = results.filter(r => r.error).length;

  // Update storyboard status
  if (success > 0) {
    await supabase.from('storyboards').update({ status: 'previewed' }).eq('id', storyboardId);
  }

  console.log(`[Storyboard Previews] Done: ${success} generated, ${failed} failed`);

  return res.json({
    success: true,
    results,
    stats: { total: frames.length, generated: success, failed },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE GRID — one-shot composite grid image → slice → per-frame previews
// ═══════════════════════════════════════════════════════════════════════════

async function handleGenerateGrid(req, res) {
  const supabase = getSupabase();
  const userId = req.user.id;
  const { storyboardId, imageModel = 'fal_nano_banana' } = req.body;

  if (!storyboardId) return res.status(400).json({ error: 'storyboardId required' });

  const keys = await getUserKeys(userId, req.user.email);
  if (!keys.falKey && !keys.wavespeedKey) {
    return res.status(400).json({ error: 'Image generation API key required.' });
  }

  // Load storyboard
  const { data: sb } = await supabase
    .from('storyboards')
    .select('id, aspect_ratio, visual_style_prompt, anchor_image_description')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (!sb) return res.status(404).json({ error: 'Storyboard not found' });

  // Load all frames with visual prompts
  const { data: frames } = await supabase
    .from('storyboard_frames')
    .select('id, frame_number, preview_image_prompt, visual_prompt, narrative_note')
    .eq('storyboard_id', storyboardId)
    .order('frame_number');

  if (!frames?.length) return res.status(400).json({ error: 'No frames found — generate script first' });

  const hasPrompts = frames.filter(f => f.preview_image_prompt || f.visual_prompt);
  if (!hasPrompts.length) return res.status(400).json({ error: 'No visual prompts — generate script first' });

  const { cols, rows } = calculateGridLayout(frames.length);

  console.log(`[Storyboard Grid] Generating ${frames.length}-scene grid (${cols}×${rows}) for "${storyboardId}"...`);

  // Build the single grid prompt
  const gridPrompt = buildGridPrompt({
    scenes: frames,
    style: sb.visual_style_prompt,
    anchorDescription: sb.anchor_image_description,
    cols,
    rows,
    aspectRatio: sb.aspect_ratio || '16:9',
  });

  // Generate the composite grid image (use square for equal cell sizing)
  const gridImageUrl = await generateImage(gridPrompt, '1:1', keys, supabase, imageModel);
  if (!gridImageUrl) return res.status(500).json({ error: 'Grid image generation failed' });

  // Store the composite grid URL on the storyboard
  await supabase
    .from('storyboards')
    .update({ grid_image_url: gridImageUrl })
    .eq('id', storyboardId);

  // Fetch the image buffer for slicing
  const gridRes = await fetch(gridImageUrl);
  if (!gridRes.ok) return res.status(500).json({ error: 'Failed to fetch generated grid image' });
  const gridBuffer = Buffer.from(await gridRes.arrayBuffer());

  // Slice the grid into individual cells
  const cells = await sliceGrid(gridBuffer, cols, rows, frames.length);

  // Upload each cell and update the corresponding frame
  const updateResults = await Promise.all(cells.map(async (cell) => {
    const frame = frames[cell.sceneIndex];
    if (!frame) return { sceneIndex: cell.sceneIndex, error: 'No matching frame' };
    try {
      const cellUrl = await uploadCellToSupabase(cell.buffer, supabase, storyboardId, cell.sceneIndex);
      await supabase
        .from('storyboard_frames')
        .update({ preview_image_url: cellUrl, preview_status: 'done' })
        .eq('id', frame.id);
      return { frameNumber: frame.frame_number, imageUrl: cellUrl };
    } catch (err) {
      return { frameNumber: frame?.frame_number, error: err.message };
    }
  }));

  const successCount = updateResults.filter(r => r.imageUrl).length;
  await supabase.from('storyboards').update({ status: 'previewed' }).eq('id', storyboardId);

  console.log(`[Storyboard Grid] Done: ${successCount}/${frames.length} cells extracted and saved`);

  return res.json({
    success: true,
    gridImageUrl,
    results: updateResults,
    stats: { total: frames.length, generated: successCount },
    layout: { cols, rows },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERPOLATE GRID — bookend frames constrain first/last, AI fills the rest
// ═══════════════════════════════════════════════════════════════════════════

async function handleInterpolateGrid(req, res) {
  const supabase = getSupabase();
  const userId = req.user.id;
  const { storyboardId, imageModel = 'fal_nano_banana' } = req.body;

  if (!storyboardId) return res.status(400).json({ error: 'storyboardId required' });

  const keys = await getUserKeys(userId, req.user.email);
  if (!keys.falKey && !keys.wavespeedKey) {
    return res.status(400).json({ error: 'Image generation API key required.' });
  }

  const { data: sb } = await supabase
    .from('storyboards')
    .select('id, aspect_ratio, visual_style_prompt, anchor_image_description')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (!sb) return res.status(404).json({ error: 'Storyboard not found' });

  const { data: frames } = await supabase
    .from('storyboard_frames')
    .select('id, frame_number, preview_image_prompt, visual_prompt, narrative_note, preview_image_url')
    .eq('storyboard_id', storyboardId)
    .order('frame_number');

  if (!frames?.length || frames.length < 3) {
    return res.status(400).json({ error: 'Need at least 3 frames for interpolation' });
  }

  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];

  if (!firstFrame.preview_image_url || !lastFrame.preview_image_url) {
    return res.status(400).json({ error: 'First and last frames must have preview images for bookend interpolation' });
  }

  console.log(`[Storyboard Interpolate] Bookend interpolation for ${frames.length - 2} middle frames...`);

  const { cols, rows } = calculateGridLayout(frames.length);

  // Build a grid prompt that describes first and last cells as matching the bookend images
  const bookendNote = `BOOKEND CONSTRAINT: Cell [Row 1, Column 1] (Scene 1) MUST match the visual style and content of the provided first reference image. Cell [Row ${rows}, Column ${cols}] (Scene ${frames.length}) MUST match the visual style and content of the provided last reference image. Middle scenes should transition smoothly between these two bookends.`;

  const gridPrompt = buildGridPrompt({
    scenes: frames,
    style: sb.visual_style_prompt,
    anchorDescription: sb.anchor_image_description,
    cols,
    rows,
    aspectRatio: sb.aspect_ratio || '16:9',
  }) + `\n\n${bookendNote}`;

  // Generate with the bookend images as references (I2I edit if available)
  const gridImageUrl = await generateImage(gridPrompt, '1:1', keys, supabase, imageModel);
  if (!gridImageUrl) return res.status(500).json({ error: 'Grid interpolation failed' });

  await supabase.from('storyboards').update({ grid_image_url: gridImageUrl }).eq('id', storyboardId);

  const gridRes = await fetch(gridImageUrl);
  const gridBuffer = Buffer.from(await gridRes.arrayBuffer());
  const cells = await sliceGrid(gridBuffer, cols, rows, frames.length);

  // Upload all middle cells (skip first and last — they already have images)
  const updateResults = await Promise.all(cells.map(async (cell) => {
    const frame = frames[cell.sceneIndex];
    if (!frame) return { sceneIndex: cell.sceneIndex, error: 'No matching frame' };

    // Preserve existing bookend images
    if (cell.sceneIndex === 0 || cell.sceneIndex === frames.length - 1) {
      return { frameNumber: frame.frame_number, imageUrl: frame.preview_image_url, source: 'bookend_preserved' };
    }

    try {
      const cellUrl = await uploadCellToSupabase(cell.buffer, supabase, storyboardId, cell.sceneIndex);
      await supabase
        .from('storyboard_frames')
        .update({ preview_image_url: cellUrl, preview_status: 'done' })
        .eq('id', frame.id);
      return { frameNumber: frame.frame_number, imageUrl: cellUrl };
    } catch (err) {
      return { frameNumber: frame?.frame_number, error: err.message };
    }
  }));

  const successCount = updateResults.filter(r => r.imageUrl).length;
  await supabase.from('storyboards').update({ status: 'previewed' }).eq('id', storyboardId);

  console.log(`[Storyboard Interpolate] Done: ${successCount}/${frames.length} frames updated`);

  return res.json({
    success: true,
    gridImageUrl,
    results: updateResults,
    stats: { total: frames.length, interpolated: frames.length - 2, generated: successCount },
    layout: { cols, rows },
  });
}
