/**
 * Retry video generation for a single storyboard frame.
 *
 * POST /api/storyboard/projects/:id/retry-frame
 * Body: { frameId }
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { generateFrameVideo } from './produce.js';
import { extractLastFrame, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';

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

  const { frameId } = req.body || {};
  if (!frameId) return res.status(400).json({ error: 'frameId required' });

  const supabase = getSupabase();

  // Extract storyboard ID from URL
  const urlParts = (req.originalUrl || req.url || '').split('/');
  const projectsIdx = urlParts.indexOf('projects');
  const storyboardId = projectsIdx >= 0 ? urlParts[projectsIdx + 1] : null;
  if (!storyboardId) return res.status(400).json({ error: 'Storyboard ID required' });

  // Load storyboard
  const { data: storyboard, error: sbErr } = await supabase
    .from('storyboards')
    .select('*')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (sbErr || !storyboard) return res.status(404).json({ error: 'Storyboard not found' });

  // Load the frame
  const { data: frame, error: fErr } = await supabase
    .from('storyboard_frames')
    .select('*')
    .eq('id', frameId)
    .eq('storyboard_id', storyboardId)
    .single();

  if (fErr || !frame) return res.status(404).json({ error: 'Frame not found' });

  // Get previous frame's last_frame_url for chaining
  let prevLastFrame = null;
  if (frame.frame_number > 1) {
    const { data: prevFrame } = await supabase
      .from('storyboard_frames')
      .select('last_frame_url')
      .eq('storyboard_id', storyboardId)
      .eq('frame_number', frame.frame_number - 1)
      .single();
    prevLastFrame = prevFrame?.last_frame_url;
  }

  const keys = await getUserKeys(userId, req.user.email);
  if (!keys.falKey && !keys.wavespeedKey) {
    return res.status(400).json({ error: 'No API keys configured' });
  }

  const config = {
    model: storyboard.global_model || 'veo3-fast',
    imageModel: storyboard.image_model || 'fal_nano_banana',
    aspectRatio: storyboard.aspect_ratio || '16:9',
    resolution: storyboard.resolution || '720p',
    startFrameUrl: storyboard.start_frame_url,
    frameInterval: storyboard.frame_interval || 4,
    elements: storyboard.elements,
    veoReferenceImages: storyboard.veo_reference_images,
  };

  // Mark as generating
  await supabase.from('storyboard_frames').update({
    generation_status: 'generating',
    generation_error: null,
    generation_attempt: (frame.generation_attempt || 0) + 1,
  }).eq('id', frameId);

  try {
    const { videoUrl, lastFrameUrl } = await generateFrameVideo(
      frame, config, prevLastFrame, keys, supabase
    );

    const updates = {
      video_url: videoUrl,
      last_frame_url: lastFrameUrl,
      generation_status: 'done',
      generation_error: null,
    };

    await supabase.from('storyboard_frames').update(updates).eq('id', frameId);

    return res.json({
      success: true,
      frame: { id: frameId, ...updates },
    });
  } catch (err) {
    console.error(`[RetryFrame] Frame ${frame.frame_number} failed:`, err.message);

    await supabase.from('storyboard_frames').update({
      generation_status: 'error',
      generation_error: err.message,
    }).eq('id', frameId);

    return res.status(500).json({ error: err.message });
  }
}
