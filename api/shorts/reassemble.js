import { createClient } from '@supabase/supabase-js';
import { assembleShort } from '../lib/pipelineHelpers.js';
import { burnCaptions } from '../lib/captionBurner.js';

export default async function handler(req, res) {
  const { draft_id, caption_config: overrideCaptionConfig } = req.body;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Look up job via draft (same lookup pattern as repair-scene)
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
  const scenes = (stepResults.scenes || []).filter(s => s.video_url);
  const videoUrls = scenes.map(s => s.video_url);
  const clipDurations = scenes.map(s => s.duration_seconds || 8);

  const { getUserKeys } = await import('../lib/getUserKeys.js');
  const keys = await getUserKeys(req.user.id, req.user.email);

  // 2. Re-assemble
  const { getFramework } = await import('../lib/videoStyleFrameworks.js');
  const framework = stepResults.framework_id ? getFramework(stepResults.framework_id) : null;

  const assembledUrl = await assembleShort(
    videoUrls,
    stepResults.global?.voiceover_url,
    stepResults.global?.music_url,
    keys.falKey,
    supabase,
    clipDurations,
    framework?.musicVolume || 0.15,
  );

  // 3. Re-burn captions
  const captionConfig = overrideCaptionConfig || stepResults.caption_config || 'word_pop';
  const captionedUrl = await burnCaptions(assembledUrl, captionConfig, keys.falKey, supabase);

  // 4. Update draft
  await supabase
    .from('ad_drafts')
    .update({ video_url: captionedUrl })
    .eq('id', draft_id);

  // 5. Update step_results
  stepResults.global = stepResults.global || {};
  stepResults.global.assembled_url = assembledUrl;
  stepResults.global.captioned_url = captionedUrl;
  await supabase
    .from('jobs')
    .update({ step_results: stepResults })
    .eq('id', job.id);

  res.json({ video_url: captionedUrl });
}
