/**
 * POST /api/imagineer/character-reel
 *
 * Generates an animated character reel from individual pose cell images.
 * For each consecutive pair, generates a transition video via animateImageV2(),
 * optionally generates background music, then assembles everything into a single reel.
 *
 * Transitions are generated SEQUENTIALLY to avoid rate limits.
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { animateImageV2 } from '../lib/mediaGenerator.js';
import {
  generateMusic as genMusic,
  uploadUrlToSupabase,
  pollFalQueue,
} from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';

const MOTION_PROMPT = 'Smooth cinematic transition between character poses, maintaining character identity and proportions, fluid natural movement, consistent lighting and style throughout';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    pose_images,
    video_model = 'fal_kling',
    duration_per_transition = 4,
    music_mood,
    music_model = 'elevenlabs',
    loop = true,
  } = req.body;

  if (!pose_images || !Array.isArray(pose_images) || pose_images.length < 3) {
    return res.status(400).json({ error: 'pose_images must be an array of at least 3 image URLs' });
  }
  if (pose_images.length > 8) {
    return res.status(400).json({ error: 'Maximum 8 pose images allowed' });
  }

  const duration = Math.max(3, Math.min(6, Number(duration_per_transition) || 4));

  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.falKey) return res.status(400).json({ error: 'FAL.ai API key not configured.' });

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Build pairs: each consecutive pair of images becomes a transition
    const pairs = [];
    for (let i = 0; i < pose_images.length - 1; i++) {
      pairs.push({ from: pose_images[i], to: pose_images[i + 1], label: `${i + 1}→${i + 2}` });
    }
    // If loop, also add last→first
    if (loop && pose_images.length >= 3) {
      pairs.push({ from: pose_images[pose_images.length - 1], to: pose_images[0], label: `${pose_images.length}→1 (loop)` });
    }

    console.log(`[CharacterReel] Starting ${pairs.length} transitions, model=${video_model}, duration=${duration}s, loop=${loop}`);

    // Generate transitions SEQUENTIALLY
    const clips = [];
    const clipDurations = [];
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      console.log(`[CharacterReel] Generating transition ${i + 1}/${pairs.length}: ${pair.label}`);

      try {
        const clipUrl = await animateImageV2(
          video_model,
          pair.from,
          MOTION_PROMPT,
          '1:1',       // square aspect for character poses
          duration,
          keys,
          supabase,
          { generate_audio: false }
        );
        clips.push(clipUrl);
        clipDurations.push(duration);
        console.log(`[CharacterReel] Transition ${i + 1}/${pairs.length} done: ${clipUrl?.substring(0, 80)}`);
      } catch (err) {
        console.error(`[CharacterReel] Transition ${i + 1} failed: ${err.message}`);
        return res.status(500).json({
          error: `Transition ${pair.label} failed: ${err.message}`,
          completed_clips: clips,
        });
      }
    }

    // Optionally generate background music
    let musicUrl = null;
    if (music_mood) {
      const totalDuration = clipDurations.reduce((a, b) => a + b, 0) + 2; // pad 2s
      console.log(`[CharacterReel] Generating music: "${music_mood}" (${totalDuration}s)`);
      try {
        musicUrl = await genMusic(music_mood, totalDuration, keys, supabase, music_model);
        console.log(`[CharacterReel] Music generated: ${musicUrl?.substring(0, 80)}`);
      } catch (err) {
        console.warn(`[CharacterReel] Music generation failed (non-blocking): ${err.message}`);
      }
    }

    // Assemble all clips into a single reel using FFmpeg compose
    console.log(`[CharacterReel] Assembling ${clips.length} clips into reel...`);

    let runningTimestamp = 0;
    const videoKeyframes = clips.map((url, i) => {
      const durationMs = clipDurations[i] * 1000;
      const kf = { url, timestamp: runningTimestamp, duration: durationMs, audio: false };
      runningTimestamp += durationMs;
      return kf;
    });
    const totalDurationMs = runningTimestamp;
    const totalDurationSec = totalDurationMs / 1000;

    const tracks = [
      { id: 'video', type: 'video', keyframes: videoKeyframes },
    ];

    if (musicUrl) {
      tracks.push({
        id: 'music',
        type: 'audio',
        keyframes: [{ url: musicUrl, timestamp: 0, duration: totalDurationMs, volume: 0.5 }],
      });
    }

    const assembleRes = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/compose', {
      method: 'POST',
      headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks, duration: totalDurationSec }),
    });

    if (!assembleRes.ok) throw new Error(`FFmpeg assembly failed: ${await assembleRes.text()}`);
    const queueData = await assembleRes.json();

    const output = await pollFalQueue(queueData.response_url, 'fal-ai/ffmpeg-api/compose', keys.falKey, 120, 3000);
    const reelVideoUrl = output?.video_url || output?.video?.url || output?.output_url;
    if (!reelVideoUrl) throw new Error('No video URL from FFmpeg reel assembly');

    const finalUrl = await uploadUrlToSupabase(reelVideoUrl, supabase, 'pipeline/finals');

    await logCost({
      username: req.user.email || req.user.id,
      category: 'fal',
      operation: 'character_reel',
      model: video_model,
      metadata: { transitions: clips.length, duration, loop, has_music: !!musicUrl },
    });

    console.log(`[CharacterReel] Done! ${clips.length} transitions, reel: ${finalUrl?.substring(0, 80)}`);

    return res.json({
      success: true,
      reel_url: finalUrl,
      clips,
      clip_durations: clipDurations,
      music_url: musicUrl,
      total_duration: totalDurationSec,
    });

  } catch (err) {
    console.error('[CharacterReel] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
