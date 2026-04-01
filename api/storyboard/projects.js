/**
 * Storyboard CRUD API
 *
 * GET    /api/storyboard/projects              — List user's storyboards
 * POST   /api/storyboard/projects              — Create new storyboard
 * GET    /api/storyboard/projects/:id           — Get storyboard + all frames
 * PUT    /api/storyboard/projects/:id           — Update storyboard metadata
 * DELETE /api/storyboard/projects/:id           — Delete storyboard + frames
 *
 * PUT    /api/storyboard/projects/:id/frames    — Batch update frames
 * PUT    /api/storyboard/projects/:id/frames/:frameId — Update single frame
 * DELETE /api/storyboard/projects/:id/frames/:frameId — Delete frame + renumber
 * POST   /api/storyboard/projects/:id/frames/:frameId/split — Split frame in two
 *
 * POST   /api/storyboard/projects/:id/share     — Generate share link
 * GET    /api/storyboard/review/:token           — Public share view (no auth)
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req, res) {
  const supabase = getSupabase();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/storyboard/projects', '').split('/').filter(Boolean);

  // ── Public share view (no auth required) ──
  if (req.url.startsWith('/api/storyboard/review/')) {
    const token = req.url.split('/review/')[1]?.split('?')[0];
    return handlePublicReview(req, res, supabase, token);
  }

  // All other routes require auth
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // Route: /api/storyboard/projects
  if (pathParts.length === 0) {
    if (req.method === 'GET') return listStoryboards(req, res, supabase, userId);
    if (req.method === 'POST') return createStoryboard(req, res, supabase, userId);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const storyboardId = pathParts[0];

  // Route: /api/storyboard/projects/:id/share
  if (pathParts[1] === 'share') {
    if (req.method === 'POST') return createShareLink(req, res, supabase, userId, storyboardId);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Route: /api/storyboard/projects/:id/reorder-frames
  if (pathParts[1] === 'reorder-frames') {
    if (req.method === 'POST') return reorderFrames(req, res, supabase, userId, storyboardId);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Route: /api/storyboard/projects/:id/check-characters
  if (pathParts[1] === 'check-characters') {
    if (req.method === 'POST') return checkCharacters(req, res, supabase, userId, storyboardId);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Route: /api/storyboard/projects/:id/frames/:frameId/split
  if (pathParts[1] === 'frames' && pathParts[2] && pathParts[3] === 'split') {
    if (req.method === 'POST') return splitFrame(req, res, supabase, userId, storyboardId, pathParts[2]);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Route: /api/storyboard/projects/:id/frames/:frameId
  if (pathParts[1] === 'frames' && pathParts[2]) {
    if (req.method === 'PUT') return updateFrame(req, res, supabase, userId, storyboardId, pathParts[2]);
    if (req.method === 'DELETE') return deleteFrame(req, res, supabase, userId, storyboardId, pathParts[2]);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Route: /api/storyboard/projects/:id/frames
  if (pathParts[1] === 'frames') {
    if (req.method === 'PUT') return batchUpdateFrames(req, res, supabase, userId, storyboardId);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Route: /api/storyboard/projects/:id
  if (req.method === 'GET') return getStoryboard(req, res, supabase, userId, storyboardId);
  if (req.method === 'PUT') return updateStoryboard(req, res, supabase, userId, storyboardId);
  if (req.method === 'DELETE') return deleteStoryboard(req, res, supabase, userId, storyboardId);

  return res.status(405).json({ error: 'Method not allowed' });
}

// ── LIST ────────────────────────────────────────────────────────────────────

async function listStoryboards(req, res, supabase, userId) {
  const { data, error } = await supabase
    .from('storyboards')
    .select(`
      id, name, description, logline, status, narrative_style,
      aspect_ratio, desired_length, frame_interval, global_model,
      visual_style, start_frame_url, assembled_url, pdf_url,
      share_enabled, created_at, updated_at
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Get frame counts per storyboard
  const ids = data.map(s => s.id);
  const { data: frameCounts } = await supabase
    .from('storyboard_frames')
    .select('storyboard_id, id')
    .in('storyboard_id', ids);

  const countMap = {};
  (frameCounts || []).forEach(f => {
    countMap[f.storyboard_id] = (countMap[f.storyboard_id] || 0) + 1;
  });

  const storyboards = data.map(s => ({
    ...s,
    frameCount: countMap[s.id] || 0,
    thumbnail: s.start_frame_url || null,
  }));

  return res.json({ success: true, storyboards });
}

// ── CREATE ──────────────────────────────────────────────────────────────────

async function createStoryboard(req, res, supabase, userId) {
  const {
    name,
    description,
    desiredLength = 60,
    frameInterval = 4,
    aspectRatio = '16:9',
    resolution = '720p',
    narrativeStyle = 'entertaining',
    targetAudience,
    overallMood,
    clientBrief,
    // Style
    visualStyle = 'cinematic',
    visualStylePrompt,
    builderStyle,
    builderLighting,
    builderColorGrade,
    motionStyle,
    motionStylePrompt,
    // Model
    globalModel = 'veo3',
    enableAudio = false,
    // Brand
    brandData,
    // Characters
    elements,
    veoReferenceImages,
    startFrameUrl,
    startFrameDescription,
    sceneDirection,
    props,
    negativePrompt,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Storyboard name is required' });
  }

  const { data: storyboard, error: sbError } = await supabase
    .from('storyboards')
    .insert({
      user_id: userId,
      name: name.trim(),
      description,
      desired_length: desiredLength,
      frame_interval: frameInterval,
      aspect_ratio: aspectRatio,
      resolution,
      narrative_style: narrativeStyle,
      target_audience: targetAudience,
      overall_mood: overallMood,
      client_brief: clientBrief,
      visual_style: visualStyle,
      visual_style_prompt: visualStylePrompt,
      builder_style: builderStyle,
      builder_lighting: builderLighting,
      builder_color_grade: builderColorGrade,
      motion_style: motionStyle,
      motion_style_prompt: motionStylePrompt,
      global_model: globalModel,
      enable_audio: enableAudio,
      brand_data: brandData || null,
      elements: elements || [],
      veo_reference_images: veoReferenceImages || [],
      start_frame_url: startFrameUrl,
      start_frame_description: startFrameDescription,
      scene_direction: sceneDirection || {},
      props: props || [],
      negative_prompt: negativePrompt,
      status: 'draft',
    })
    .select()
    .single();

  if (sbError) return res.status(500).json({ error: sbError.message });

  // Frames are created later by Generate Script — not at creation time
  console.log(`[Storyboard CRUD] Created "${name}" — no frames yet (generate script to create scenes)`);

  return res.status(201).json({
    success: true,
    storyboard: { ...storyboard, frameCount: 0 },
  });
}

// ── GET ─────────────────────────────────────────────────────────────────────

async function getStoryboard(req, res, supabase, userId, storyboardId) {
  const { data: storyboard, error: sbError } = await supabase
    .from('storyboards')
    .select('*')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (sbError || !storyboard) {
    return res.status(404).json({ error: 'Storyboard not found' });
  }

  const { data: frames, error: frError } = await supabase
    .from('storyboard_frames')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .order('frame_number', { ascending: true });

  if (frError) {
    return res.status(500).json({ error: frError.message });
  }

  return res.json({
    success: true,
    storyboard,
    frames: frames || [],
  });
}

// ── UPDATE STORYBOARD ───────────────────────────────────────────────────────

async function updateStoryboard(req, res, supabase, userId, storyboardId) {
  // Only allow updating fields that make sense to change
  const allowedFields = [
    'name', 'description', 'logline', 'status', 'narrative_style', 'target_audience',
    'overall_mood', 'aspect_ratio', 'resolution', 'desired_length', 'frame_interval',
    'visual_style', 'visual_style_prompt', 'builder_style', 'builder_lighting',
    'builder_color_grade', 'motion_style', 'motion_style_prompt', 'global_model',
    'enable_audio', 'tts_model', 'voice', 'tts_speed', 'lipsync_model', 'content_type',
    'music_mood', 'music_volume', 'music_url', 'caption_style', 'brand_data',
    'elements', 'veo_reference_images', 'start_frame_url', 'start_frame_description',
    'scene_direction', 'props', 'negative_prompt', 'assembled_url', 'captioned_url',
    'pdf_url', 'client_brief', 'location_description', 'image_model', 'production_status',
  ];

  const updates = {};
  for (const field of allowedFields) {
    // Convert camelCase from frontend to snake_case for DB
    const camelField = field;
    const snakeField = field;
    if (req.body[camelField] !== undefined) {
      updates[snakeField] = req.body[camelField];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('storyboards')
    .update(updates)
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Storyboard not found' });

  return res.json({ success: true, storyboard: data });
}

// ── DELETE ───────────────────────────────────────────────────────────────────

async function deleteStoryboard(req, res, supabase, userId, storyboardId) {
  // Frames cascade delete via FK
  const { error } = await supabase
    .from('storyboards')
    .delete()
    .eq('id', storyboardId)
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ success: true });
}

// ── UPDATE SINGLE FRAME ────────────────────────────────────────────────────

async function updateFrame(req, res, supabase, userId, storyboardId, frameId) {
  // Verify ownership
  const { data: sb } = await supabase
    .from('storyboards')
    .select('id')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (!sb) return res.status(404).json({ error: 'Storyboard not found' });

  const { data, error } = await supabase
    .from('storyboard_frames')
    .update({ ...req.body, user_edited: true })
    .eq('id', frameId)
    .eq('storyboard_id', storyboardId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, frame: data });
}

// ── BATCH UPDATE FRAMES ────────────────────────────────────────────────────

async function batchUpdateFrames(req, res, supabase, userId, storyboardId) {
  const { frames } = req.body;
  if (!frames?.length) return res.status(400).json({ error: 'No frames provided' });

  // Verify ownership
  const { data: sb } = await supabase
    .from('storyboards')
    .select('id')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (!sb) return res.status(404).json({ error: 'Storyboard not found' });

  const results = [];
  for (const frame of frames) {
    const { id, ...updates } = frame;
    if (!id) continue;

    const { data, error } = await supabase
      .from('storyboard_frames')
      .update(updates)
      .eq('id', id)
      .eq('storyboard_id', storyboardId)
      .select()
      .single();

    if (data) results.push(data);
    if (error) console.warn(`[Storyboard CRUD] Frame update failed:`, error.message);
  }

  return res.json({ success: true, frames: results, updated: results.length });
}

// ── DELETE FRAME ──────────────────────────────────────────────────────────────

async function deleteFrame(req, res, supabase, userId, storyboardId, frameId) {
  // Verify ownership
  const { data: sb } = await supabase
    .from('storyboards')
    .select('id')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (!sb) return res.status(404).json({ error: 'Storyboard not found' });

  // Check frame exists and is not locked
  const { data: frame } = await supabase
    .from('storyboard_frames')
    .select('id, locked')
    .eq('id', frameId)
    .eq('storyboard_id', storyboardId)
    .single();

  if (!frame) return res.status(404).json({ error: 'Frame not found' });
  if (frame.locked) return res.status(400).json({ error: 'Cannot delete a locked frame' });

  // Delete the frame
  const { error: delError } = await supabase
    .from('storyboard_frames')
    .delete()
    .eq('id', frameId);

  if (delError) return res.status(500).json({ error: delError.message });

  // Fetch remaining frames, renumber, recalculate timestamps
  const { data: remaining, error: fetchError } = await supabase
    .from('storyboard_frames')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .order('frame_number', { ascending: true });

  if (fetchError) return res.status(500).json({ error: fetchError.message });

  let runningTime = 0;
  for (let i = 0; i < remaining.length; i++) {
    remaining[i].frame_number = i + 1;
    remaining[i].timestamp_seconds = runningTime;
    runningTime += remaining[i].duration_seconds;

    await supabase
      .from('storyboard_frames')
      .update({ frame_number: i + 1, timestamp_seconds: remaining[i].timestamp_seconds })
      .eq('id', remaining[i].id);
  }

  console.log(`[Storyboard CRUD] Deleted frame ${frameId}, ${remaining.length} frames remain`);
  return res.json({ success: true, frames: remaining });
}

// ── REORDER FRAMES ───────────────────────────────────────────────────────────

/**
 * POST /api/storyboard/projects/:id/reorder-frames
 * Body: { frameOrder: [id1, id2, ...] }  — ordered array of all frame IDs
 *
 * Re-assigns frame_number and recalculates timestamp_seconds for every frame.
 */
async function reorderFrames(req, res, supabase, userId, storyboardId) {
  const { frameOrder } = req.body;
  if (!Array.isArray(frameOrder) || frameOrder.length === 0) {
    return res.status(400).json({ error: 'frameOrder array required' });
  }

  // Verify ownership
  const { data: sb } = await supabase
    .from('storyboards')
    .select('id')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (!sb) return res.status(404).json({ error: 'Storyboard not found' });

  // Load all frames to get their durations
  const { data: allFrames, error: fetchError } = await supabase
    .from('storyboard_frames')
    .select('id, duration_seconds, locked')
    .eq('storyboard_id', storyboardId);

  if (fetchError) return res.status(500).json({ error: fetchError.message });

  // Build lookup map
  const frameMap = {};
  for (const f of allFrames) frameMap[f.id] = f;

  // Validate all provided IDs exist
  for (const id of frameOrder) {
    if (!frameMap[id]) return res.status(400).json({ error: `Frame ${id} not found` });
  }

  // Apply new order — update each frame's number and timestamp
  let runningTime = 0;
  for (let i = 0; i < frameOrder.length; i++) {
    const frameId = frameOrder[i];
    const frame = frameMap[frameId];
    const newNumber = i + 1;
    const newTimestamp = runningTime;

    const { error: updateError } = await supabase
      .from('storyboard_frames')
      .update({ frame_number: newNumber, timestamp_seconds: newTimestamp })
      .eq('id', frameId);

    if (updateError) return res.status(500).json({ error: updateError.message });

    runningTime += frame.duration_seconds || 4;
  }

  // Return updated frames
  const { data: updated, error: refetchError } = await supabase
    .from('storyboard_frames')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .order('frame_number', { ascending: true });

  if (refetchError) return res.status(500).json({ error: refetchError.message });

  console.log(`[Storyboard CRUD] Reordered ${frameOrder.length} frames for storyboard ${storyboardId}`);
  return res.json({ success: true, frames: updated });
}

// ── SPLIT FRAME ──────────────────────────────────────────────────────────────

async function splitFrame(req, res, supabase, userId, storyboardId, frameId) {
  // Verify ownership
  const { data: sb } = await supabase
    .from('storyboards')
    .select('id')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (!sb) return res.status(404).json({ error: 'Storyboard not found' });

  // Load the target frame
  const { data: frame } = await supabase
    .from('storyboard_frames')
    .select('*')
    .eq('id', frameId)
    .eq('storyboard_id', storyboardId)
    .single();

  if (!frame) return res.status(404).json({ error: 'Frame not found' });
  if (frame.locked) return res.status(400).json({ error: 'Cannot split a locked frame' });

  const halfDuration = Math.max(1, Math.floor(frame.duration_seconds / 2));
  const otherHalf = frame.duration_seconds - halfDuration;

  // Update original frame with first half duration
  await supabase
    .from('storyboard_frames')
    .update({ duration_seconds: halfDuration })
    .eq('id', frameId);

  // Bump frame_number for all subsequent frames (work from highest to avoid unique constraint)
  const { data: allFrames } = await supabase
    .from('storyboard_frames')
    .select('id, frame_number')
    .eq('storyboard_id', storyboardId)
    .gt('frame_number', frame.frame_number)
    .order('frame_number', { ascending: false });

  for (const f of (allFrames || [])) {
    await supabase
      .from('storyboard_frames')
      .update({ frame_number: f.frame_number + 1 })
      .eq('id', f.id);
  }

  // Insert new frame after the original
  const { error: insertError } = await supabase
    .from('storyboard_frames')
    .insert({
      storyboard_id: storyboardId,
      frame_number: frame.frame_number + 1,
      timestamp_seconds: 0, // recalculated below
      duration_seconds: otherHalf,
    });

  if (insertError) return res.status(500).json({ error: insertError.message });

  // Fetch all frames, recalculate timestamps
  const { data: updated, error: fetchError } = await supabase
    .from('storyboard_frames')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .order('frame_number', { ascending: true });

  if (fetchError) return res.status(500).json({ error: fetchError.message });

  let runningTime = 0;
  for (let i = 0; i < updated.length; i++) {
    if (updated[i].timestamp_seconds !== runningTime) {
      await supabase
        .from('storyboard_frames')
        .update({ timestamp_seconds: runningTime })
        .eq('id', updated[i].id);
      updated[i].timestamp_seconds = runningTime;
    }
    runningTime += updated[i].duration_seconds;
  }

  console.log(`[Storyboard CRUD] Split frame ${frameId} → ${updated.length} frames total`);
  return res.json({ success: true, frames: updated });
}

// ── SHARE LINK ──────────────────────────────────────────────────────────────

async function createShareLink(req, res, supabase, userId, storyboardId) {
  const token = crypto.randomBytes(24).toString('hex');

  const { data, error } = await supabase
    .from('storyboards')
    .update({ share_token: token, share_enabled: true })
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .select('share_token')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const shareUrl = `${process.env.VITE_APP_URL || 'https://app.stitchstudios.com'}/review/${data.share_token}`;

  return res.json({ success: true, shareUrl, token: data.share_token });
}

// ── CHARACTER DIFFERENTIATION CHECK ─────────────────────────────────────────

const DifferentiationResultSchema = z.object({
  passed: z.boolean().describe('true if all characters are visually distinct enough'),
  warnings: z.array(z.string()).describe('Specific differentiation issues found'),
  suggestions: z.array(z.string()).describe('Actionable suggestions to improve differentiation'),
});

async function checkCharacters(req, res, supabase, userId, storyboardId) {
  // Verify ownership
  const { data: sb } = await supabase
    .from('storyboards')
    .select('id, elements, brand_data')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (!sb) return res.status(404).json({ error: 'Storyboard not found' });

  const characters = (sb.elements || []).filter(el => el.description);
  if (characters.length < 2) {
    return res.json({
      success: true,
      result: {
        passed: true,
        warnings: [],
        suggestions: ['Add at least 2 characters with descriptions to check differentiation.'],
      },
    });
  }

  const { openaiKey } = await getUserKeys(userId, req.user?.email);
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

  const openai = new OpenAI({ apiKey: openaiKey });

  const characterList = characters.map((c, i) =>
    `Character ${i + 1}${c.name ? ` (${c.name})` : ''}: ${c.description}`
  ).join('\n\n');

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      {
        role: 'system',
        content: `You are a visual development expert. Analyze character descriptions for visual distinctiveness in animated/video content.

Check three dimensions of visual differentiation:
1. SILHOUETTE CONTRAST — Do the characters have clearly different body shapes, heights, proportions, or distinctive outlines that are recognizable even in shadow?
2. COLOR CONTRAST — Are the primary colors of clothing, hair, or skin sufficiently different so characters can be told apart at a glance?
3. FEATURE CONTRAST — Do the characters have distinctly different facial features, hairstyles, accessories, or other key visual identifiers?

A pair of characters passes if they have STRONG contrast in at least 2 of the 3 dimensions.`,
      },
      {
        role: 'user',
        content: `Analyze the visual differentiation between these characters:\n\n${characterList}\n\nAre they visually distinct enough to be immediately recognizable in video content?`,
      },
    ],
    response_format: zodResponseFormat(DifferentiationResultSchema, 'differentiation_result'),
  });

  const result = completion.choices[0].message.parsed;
  console.log(`[Storyboard] Character diff check for ${storyboardId}: passed=${result.passed}, warnings=${result.warnings.length}`);

  return res.json({ success: true, result });
}

// ── PUBLIC REVIEW (no auth) ─────────────────────────────────────────────────

async function handlePublicReview(req, res, supabase, token) {
  if (!token) return res.status(400).json({ error: 'Missing review token' });

  const { data: storyboard, error: sbErr } = await supabase
    .from('storyboards')
    .select('id, name, description, logline, status, aspect_ratio, desired_length, overall_mood, narrative_style, brand_data, created_at, share_enabled')
    .eq('share_token', token)
    .eq('share_enabled', true)
    .single();

  if (sbErr || !storyboard) {
    return res.status(404).json({ error: 'Storyboard not found or sharing disabled' });
  }

  const { data: frames } = await supabase
    .from('storyboard_frames')
    .select('frame_number, timestamp_seconds, duration_seconds, narrative_note, setting, character_action, dialogue, emotional_tone, camera_angle, motion_prompt, preview_image_url, beat_type, pacing_note')
    .eq('storyboard_id', storyboard.id)
    .order('frame_number', { ascending: true });

  return res.json({
    success: true,
    storyboard: {
      name: storyboard.name,
      description: storyboard.description,
      logline: storyboard.logline,
      status: storyboard.status,
      aspectRatio: storyboard.aspect_ratio,
      desiredLength: storyboard.desired_length,
      mood: storyboard.overall_mood,
      narrativeStyle: storyboard.narrative_style,
      brandName: storyboard.brand_data?.brand_name || null,
      createdAt: storyboard.created_at,
    },
    frames: frames || [],
  });
}
