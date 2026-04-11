/**
 * Reassemble a failed shorts pipeline job using existing assets.
 * Runs ONLY assembly + captions — no new video/audio generation.
 *
 * Usage: node scripts/reassemble-job.js <job_id>
 */
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { assembleShort } from '../api/lib/pipelineHelpers.js';
import { burnCaptions } from '../api/lib/captionBurner.js';

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: node scripts/reassemble-job.js <job_id>');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const falKey = process.env.FAL_KEY;

async function main() {
  // 1. Load job
  const { data: job, error } = await supabase.from('jobs').select('*').eq('id', jobId).single();
  if (error || !job) { console.error('Job not found:', error?.message); process.exit(1); }

  const sr = job.step_results || {};
  const sceneKeys = Object.keys(sr).filter(k => k.startsWith('scene_')).sort();

  if (sceneKeys.length === 0) { console.error('No scene assets in step_results'); process.exit(1); }

  // 2. Extract existing assets
  const videoUrls = [];
  const clipDurations = [];
  let voiceoverUrl = null;
  let ttsDuration = 0;

  for (const key of sceneKeys) {
    const scene = sr[key];
    if (!scene.video_url) { console.warn(`${key} missing video_url, skipping`); continue; }
    videoUrls.push(scene.video_url);
    clipDurations.push(scene.clip_duration || 8);
    if (!voiceoverUrl && scene.voiceover_url) voiceoverUrl = scene.voiceover_url;
    if (scene.end_time > ttsDuration) ttsDuration = scene.end_time;
  }

  console.log(`Found ${videoUrls.length} video clips, voiceover: ${!!voiceoverUrl}, TTS duration: ${ttsDuration}s`);
  console.log('Clips:', videoUrls.map((u, i) => `${i}: ${clipDurations[i]}s`).join(', '));

  if (!voiceoverUrl) { console.error('No voiceover URL found'); process.exit(1); }

  // 3. Assemble (no music for now — it wasn't saved)
  console.log('\n--- Step 1: FFmpeg Assembly ---');
  const assembledUrl = await assembleShort(
    videoUrls,
    voiceoverUrl,
    null, // no music
    falKey,
    supabase,
    clipDurations,
    0.15,
    ttsDuration
  );
  console.log('Assembled video:', assembledUrl);

  // 4. Burn captions
  console.log('\n--- Step 2: Burn Captions ---');
  let captionedUrl;
  try {
    captionedUrl = await burnCaptions(assembledUrl, 'word_pop', falKey, supabase);
    console.log('Captioned video:', captionedUrl);
  } catch (err) {
    console.warn('Caption burn failed, using uncaptioned:', err.message);
    captionedUrl = assembledUrl;
  }

  // 5. Update job + create draft
  const campaignId = job.input_json?.campaign_id;

  await supabase.from('jobs').update({
    status: 'completed',
    current_step: 'done',
    completed_steps: 10,
  }).eq('id', jobId);

  if (campaignId) {
    // Check if draft already exists
    const { data: existing } = await supabase.from('ad_drafts').select('id').eq('campaign_id', campaignId).limit(1);
    if (existing?.length) {
      await supabase.from('ad_drafts').update({
        generation_status: 'ready',
        final_video_url: captionedUrl,
        uncaptioned_video_url: assembledUrl,
      }).eq('id', existing[0].id);
      console.log('Updated existing draft:', existing[0].id);
    } else {
      const { data: draft, error: draftErr } = await supabase.from('ad_drafts').insert({
        campaign_id: campaignId,
        user_id: job.user_id,
        generation_status: 'ready',
        final_video_url: captionedUrl,
        uncaptioned_video_url: assembledUrl,
        pipeline_version: 'v3',
        generation_mode: 'v3_flf',
        scene_assets_json: sceneKeys.map(k => sr[k]),
      }).select().single();
      if (draftErr) console.error('Draft insert error:', draftErr.message);
      else console.log('Created draft:', draft.id);
    }

    await supabase.from('campaigns').update({ status: 'ready' }).eq('id', campaignId);
  }

  console.log('\nDone! Job marked completed.');
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
