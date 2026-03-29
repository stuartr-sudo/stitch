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
import { generateImage } from '../lib/pipelineHelpers.js';
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
  if (url.includes('/generate-previews')) {
    return handleGeneratePreviews(req, res);
  }
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

  // Load existing frames
  const { data: frames } = await supabase
    .from('storyboard_frames')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .order('frame_number', { ascending: true });

  if (!frames?.length) return res.status(400).json({ error: 'No frames exist — create the storyboard first' });

  const { openaiKey } = await getUserKeys(userId, req.user.email);
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured.' });

  const openai = new OpenAI({ apiKey: openaiKey });
  const frameCount = frames.length;

  console.log(`[Storyboard Script] Generating for "${sb.name}" — ${frameCount} frames at ${sb.frame_interval}s intervals`);

  // Get model duration constraints
  const durationConstraints = {
    allowed: [sb.frame_interval], // each frame = one interval
    min: sb.frame_interval,
    max: sb.frame_interval,
  };

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
      targetSceneCount: frameCount,
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

    // ── Write to frames table ──
    const updates = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const beat = arc.beats[i] || {};
      const vis = processedScenes[i] || {};

      // Don't overwrite user-edited frames unless they're still empty
      if (frame.locked) continue;

      updates.push({
        id: frame.id,
        // Narrative (Stage 1)
        beat_type: beat.beatType || null,
        narrative_note: beat.narrativeMoment || null,
        setting: beat.setting || null,
        character_action: beat.characterAction || null,
        character_emotion: beat.characterEmotion || null,
        emotional_tone: beat.emotionalTone || null,
        pacing_note: beat.pacingNote || null,
        transition_note: beat.transitionNote || null,
        dialogue: beat.dialogue || null,
        // Visual (Stage 2)
        visual_prompt: vis.visualPrompt || null,
        motion_prompt: vis.motionPrompt || null,
        camera_angle: vis.cameraAngle || null,
        preview_image_prompt: vis.previewImagePrompt || null,
        negative_prompt: vis.negativePrompt || null,
        continuity_note: vis.continuityNote || null,
        brand_warnings: vis.brandWarnings || [],
      });
    }

    // Batch update
    for (const update of updates) {
      const { id, ...data } = update;
      await supabase
        .from('storyboard_frames')
        .update(data)
        .eq('id', id);
    }

    // Update storyboard status + metadata
    await supabase
      .from('storyboards')
      .update({
        status: 'scripted',
        logline: arc.logline,
      })
      .eq('id', storyboardId);

    console.log(`[Storyboard Script] Wrote ${updates.length} frames to database`);

    return res.json({
      success: true,
      title: arc.title,
      logline: arc.logline,
      narrativeStyle: arc.narrativeStyle,
      emotionalArc: arc.overallEmotionalArc,
      framesUpdated: updates.length,
      framesSkipped: frames.length - updates.length,
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
    .select('id, aspect_ratio, start_frame_url')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (!sb) return res.status(404).json({ error: 'Storyboard not found' });

  // Load frames (optionally filtered)
  let query = supabase
    .from('storyboard_frames')
    .select('id, frame_number, preview_image_prompt, visual_prompt')
    .eq('storyboard_id', storyboardId)
    .order('frame_number');

  if (frameNumbers?.length) {
    query = query.in('frame_number', frameNumbers);
  }

  const { data: frames } = await query;
  if (!frames?.length) return res.status(400).json({ error: 'No frames to generate previews for' });

  console.log(`[Storyboard Previews] Generating ${frames.length} preview images...`);

  // Generate all in parallel
  const results = await Promise.all(frames.map(async (frame, i) => {
    // Frame 1: use start frame if available
    if (frame.frame_number === 1 && sb.start_frame_url) {
      await supabase.from('storyboard_frames').update({
        preview_image_url: sb.start_frame_url,
        preview_status: 'done',
      }).eq('id', frame.id);

      return { frameNumber: frame.frame_number, imageUrl: sb.start_frame_url, source: 'start_frame' };
    }

    const prompt = frame.preview_image_prompt || frame.visual_prompt;
    if (!prompt) {
      return { frameNumber: frame.frame_number, error: 'No prompt — run script generation first' };
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
