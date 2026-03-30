/**
 * Storyboard Production Status
 *
 * GET /api/storyboard/projects/:id/production-status
 *
 * Returns the current production job status plus updated frame data.
 * The workspace polls this every 4 seconds while production is running.
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = getSupabase();

  // Extract storyboard ID from URL
  const urlParts = (req.url || '').split('/');
  const projectsIdx = urlParts.indexOf('projects');
  const storyboardId = projectsIdx >= 0 ? urlParts[projectsIdx + 1] : null;

  if (!storyboardId) return res.status(400).json({ error: 'Storyboard ID required' });

  // Load storyboard (just status fields)
  const { data: storyboard, error: sbErr } = await supabase
    .from('storyboards')
    .select('id, production_status, assembled_url, captioned_url, music_url')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (sbErr || !storyboard) return res.status(404).json({ error: 'Storyboard not found' });

  // Load latest job for this storyboard
  const { data: job } = await supabase
    .from('storyboard_jobs')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Load frames with generation status
  const { data: frames } = await supabase
    .from('storyboard_frames')
    .select('id, frame_number, generation_status, generation_error, video_url, audio_url, lipsync_video_url, last_frame_url, tts_duration, preview_image_url, narrative_note, beat_type, dialogue')
    .eq('storyboard_id', storyboardId)
    .order('frame_number', { ascending: true });

  return res.json({
    success: true,
    storyboard: {
      id: storyboard.id,
      production_status: storyboard.production_status,
      assembled_url: storyboard.assembled_url,
      captioned_url: storyboard.captioned_url,
    },
    job: job ? {
      id: job.id,
      status: job.status,
      current_step: job.current_step,
      current_frame: job.current_frame,
      total_frames: job.total_frames,
      step_results: job.step_results,
      error: job.error,
      assembled_url: job.assembled_url,
      captioned_url: job.captioned_url,
      started_at: job.started_at,
      completed_at: job.completed_at,
    } : null,
    frames: frames || [],
  });
}
