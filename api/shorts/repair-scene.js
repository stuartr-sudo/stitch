import { createClient } from '@supabase/supabase-js';
import { pollFalQueue, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';

export default async function handler(req, res) {
  const { draft_id, scene_index, prompt, duration } = req.body;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Look up job via draft
  const { data: draft } = await supabase
    .from('ad_drafts')
    .select('campaign_id')
    .eq('id', draft_id)
    .single();

  if (!draft) return res.status(404).json({ error: 'Draft not found' });

  const { data: job } = await supabase
    .from('jobs')
    .select('id, step_results, input_json')
    .filter('input_json->>campaign_id', 'eq', draft.campaign_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!job) return res.status(404).json({ error: 'Job not found' });

  const stepResults = job.step_results;
  const scenes = stepResults.scenes;
  const scene = scenes[scene_index];
  if (!scene) return res.status(400).json({ error: `Scene ${scene_index} not found` });

  // 2. Get user keys FIRST (needed for both paths)
  const { getUserKeys } = await import('../lib/getUserKeys.js');
  const keys = await getUserKeys(req.user.id, req.user.email);

  // 3. Get first/last frames from adjacent scenes
  const prevScene = scene_index > 0 ? scenes[scene_index - 1] : null;
  const nextScene = scene_index < scenes.length - 1 ? scenes[scene_index + 1] : null;

  const firstFrameUrl = prevScene?.last_frame_url || stepResults.global?.starting_image;
  const lastFrameUrl = nextScene?.first_frame_url;

  if (!firstFrameUrl) {
    return res.status(400).json({ error: 'Cannot repair: no first frame (no previous scene or starting image).' });
  }

  // Last scene edge case: no lastFrameUrl → use standard image-to-video via animateImageV2
  if (!lastFrameUrl) {
    const { animateImageV2 } = await import('../lib/mediaGenerator.js');
    const videoUrl = await animateImageV2(
      stepResults.video_model || 'fal_veo3',
      firstFrameUrl,
      prompt || scene.motion_prompt || scene.visual_prompt,
      stepResults.aspect_ratio || '9:16',
      scene.duration_seconds || 8,
      keys,
      supabase,
      { generate_audio: false }
    );
    // Upload to supabase
    const publicUrl = await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/scenes');
    return res.json({ video_url: publicUrl, scene_index, status: 'completed' });
  }

  // 4. Call Veo 3.1 First-Last-Frame
  // Veo 3.1 only accepts '4s', '6s', '8s'
  const rawDuration = duration || scene.duration_seconds || 8;
  const veoDuration = rawDuration <= 4 ? '4s' : rawDuration <= 6 ? '6s' : '8s';

  const veoBody = {
    prompt: prompt || scene.motion_prompt || scene.visual_prompt,
    first_frame_url: firstFrameUrl,
    last_frame_url: lastFrameUrl,
    aspect_ratio: stepResults.aspect_ratio || '9:16',
    duration: veoDuration,
    resolution: '720p',
    generate_audio: false,
    safety_tolerance: '6',
    auto_fix: true,
  };

  const submitRes = await fetch('https://queue.fal.run/fal-ai/veo3.1/fast/first-last-frame-to-video', {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(veoBody),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    return res.status(500).json({ error: `Veo 3.1 FLF submit failed: ${err}` });
  }

  const { request_id } = await submitRes.json();

  // Return immediately with request_id for frontend polling
  res.json({ request_id, scene_index, status: 'queued' });
}
