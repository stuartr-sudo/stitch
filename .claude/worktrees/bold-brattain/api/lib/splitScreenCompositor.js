/**
 * Split-Screen Compositor
 *
 * Two functions for the avatar split-screen pipeline:
 * - loopVideo() — loops a short clip to a target duration
 * - composeSplitScreen() — stacks B-roll + avatar vertically (60/40)
 */

import { pollFalQueue, uploadUrlToSupabase } from './pipelineHelpers.js';

const FAL_BASE = 'https://queue.fal.run';
const SPLIT_RATIO = 0.6; // B-roll gets 60%, avatar gets 40%
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;

/**
 * Loop a short video clip to fill a target duration.
 * Uses FAL FFmpeg compose with repeated keyframes.
 *
 * @param {Object} params
 * @param {string} params.videoUrl — short clip to loop (e.g., 5-10s)
 * @param {number} params.clipDuration — duration of the source clip in seconds
 * @param {number} params.targetDuration — desired output duration in seconds
 * @param {string} params.falKey
 * @param {Object} params.supabase
 * @returns {Promise<string>} — URL of the looped video
 */
export async function loopVideo({ videoUrl, clipDuration, targetDuration, falKey, supabase }) {
  if (!videoUrl) throw new Error('videoUrl required for loopVideo');
  if (!clipDuration || clipDuration <= 0) throw new Error('clipDuration must be positive');
  if (!targetDuration || targetDuration <= 0) throw new Error('targetDuration must be positive');

  // If clip is already long enough, return as-is
  if (clipDuration >= targetDuration) return videoUrl;

  // Build repeated keyframes to fill the target duration
  const repetitions = Math.ceil(targetDuration / clipDuration);
  const keyframes = [];
  for (let i = 0; i < repetitions; i++) {
    keyframes.push({
      url: videoUrl,
      timestamp: i * clipDuration * 1000, // milliseconds
      duration: clipDuration * 1000,
      audio: false,
    });
  }

  const tracks = [
    { id: 'video', type: 'video', keyframes },
  ];

  console.log(`[loopVideo] Looping ${clipDuration}s clip ${repetitions}x to fill ${targetDuration}s`);

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/compose`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracks, duration: targetDuration }),
  });

  if (!res.ok) throw new Error(`FAL ffmpeg loop failed: ${await res.text()}`);
  const queueData = await res.json();

  const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/ffmpeg-api/compose', falKey, 120, 3000);
  const resultUrl = output?.video_url || output?.video?.url || output?.output_url;
  if (!resultUrl) throw new Error('No video URL from FFmpeg loop');

  return await uploadUrlToSupabase(resultUrl, supabase, 'pipeline/avatar');
}

// ---------------------------------------------------------------------------
// composeSplitScreen
// ---------------------------------------------------------------------------
//
// APPROACH RESEARCH (2026-04-02):
// The FAL ffmpeg-api/compose endpoint only supports temporal composition via
// a tracks[] array — it has NO documented support for spatial layout (x/y,
// width/height, filter_complex, vstack). Confirmed by:
//   - Fetching https://fal.ai/models/fal-ai/ffmpeg-api/compose/api (full schema)
//   - Fetching https://fal.ai/models/fal-ai/ffmpeg-api/compose/llms.txt
//   - Web search for fal.ai ffmpeg-api filter_complex / spatial layout
//
// Other FAL FFmpeg endpoints checked:
//   - fal-ai/ffmpeg-api/merge-videos  → sequential concat only, no spatial layout
//   - fal-ai/ffmpeg-api/blend-video   → layer blending (overlay), not stacking
//   - No fal-ai/ffmpeg-api/run endpoint found
//
// SELECTED APPROACH — Two-pass pre-scale + compose with filter_complex attempt:
//   Pass 1a: Scale B-roll to 1080×1152 via merge-videos (single-video re-encode)
//   Pass 1b: Scale avatar to 1080×768 via merge-videos (single-video re-encode)
//   Pass 2:  Submit both scaled videos to ffmpeg-api/compose with a
//            `filter_complex` top-level param (undocumented, best-guess attempt):
//            "[0:v][1:v]vstack=inputs=2[v]"
//            Audio: only B-roll track (voiceover + music already mixed in),
//            avatar audio discarded.
//
// VERIFICATION NEEDED:
//   The `filter_complex` parameter on /compose is UNDOCUMENTED. If FAL rejects
//   it (non-2xx response), the caller will see an error and this will need to be
//   re-implemented using an alternative service (e.g. a self-hosted FFmpeg
//   worker, or fal-ai/ffmpeg-api/run if that endpoint becomes available).
//
//   Alternative if filter_complex fails:
//     Use two compose calls to create top-half and bottom-half "strips" at their
//     respective resolutions, then find a way to vstack — ultimately this still
//     hits the same wall without a spatial compositor endpoint.
//
// ---------------------------------------------------------------------------

/**
 * Scale a video to exact pixel dimensions using fal-ai/ffmpeg-api/merge-videos.
 * Passing a single-element array causes the API to re-encode at the target res.
 */
async function scaleVideo(videoUrl, width, height, falKey) {
  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/merge-videos`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_urls: [videoUrl],
      resolution: { width, height },
    }),
  });

  if (!res.ok) throw new Error(`FAL ffmpeg scale (${width}x${height}) failed: ${await res.text()}`);
  const queueData = await res.json();

  // merge-videos is also a queue endpoint
  const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/ffmpeg-api/merge-videos', falKey, 120, 3000);
  const url = output?.video_url || output?.video?.url || output?.output_url;
  if (!url) throw new Error(`No video URL from FAL scale (${width}x${height})`);
  return url;
}

/**
 * Compose a split-screen video: B-roll on top, avatar on bottom.
 *
 * Audio comes from the B-roll track only (voiceover + music).
 * Avatar audio is discarded to avoid double-voiceover.
 *
 * Layout (1080×1920):
 *   Top 60%  → B-roll  (1080×1152)
 *   Bottom 40% → Avatar (1080×768)
 *
 * @param {Object} params
 * @param {string} params.brollVideoUrl — assembled B-roll video (from assembleShort)
 * @param {string} params.avatarVideoUrl — lip-synced avatar video
 * @param {number} params.duration — total duration in seconds
 * @param {string} params.falKey
 * @param {Object} params.supabase
 * @returns {Promise<{videoUrl: string}>}
 */
export async function composeSplitScreen({ brollVideoUrl, avatarVideoUrl, duration, falKey, supabase }) {
  if (!brollVideoUrl) throw new Error('brollVideoUrl required for composeSplitScreen');
  if (!avatarVideoUrl) throw new Error('avatarVideoUrl required for composeSplitScreen');
  if (!duration || duration <= 0) throw new Error('duration must be positive');
  if (!falKey) throw new Error('falKey required for composeSplitScreen');

  const brollHeight = Math.round(OUTPUT_HEIGHT * SPLIT_RATIO);      // 1152
  const avatarHeight = OUTPUT_HEIGHT - brollHeight;                  // 768
  const durationMs = duration * 1000;

  console.log(`[composeSplitScreen] Split ${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}: B-roll top ${OUTPUT_WIDTH}x${brollHeight}, avatar bottom ${OUTPUT_WIDTH}x${avatarHeight}, ${duration}s`);

  // Pass 1: Pre-scale both videos to their target panel dimensions in parallel
  console.log('[composeSplitScreen] Pass 1: scaling B-roll and avatar...');
  const [scaledBroll, scaledAvatar] = await Promise.all([
    scaleVideo(brollVideoUrl, OUTPUT_WIDTH, brollHeight, falKey),
    scaleVideo(avatarVideoUrl, OUTPUT_WIDTH, avatarHeight, falKey),
  ]);
  console.log('[composeSplitScreen] Pass 1 complete — B-roll and avatar scaled');

  // Pass 2: Vstack the two scaled videos via filter_complex on ffmpeg-api/compose.
  //
  // NOTE: filter_complex is an UNDOCUMENTED parameter on this endpoint.
  // The compose endpoint's documented schema only covers tracks[]/duration.
  // This is a best-guess attempt based on the native FFmpeg filter graph syntax:
  //   [0:v]scale=1080:1152[top];[1:v]scale=1080:768[bot];[top][bot]vstack=inputs=2[v]
  // Since we pre-scaled in Pass 1, the filter_complex here simplifies to just vstack.
  //
  // If FAL rejects the filter_complex param, the error message will indicate this
  // and the implementation will need a different spatial compositor.
  //
  // Audio strategy: B-roll track has audio=true (voiceover+music already mixed).
  //                 Avatar track has audio=false (discard avatar audio).
  console.log('[composeSplitScreen] Pass 2: composing split-screen via vstack...');

  const tracks = [
    {
      id: 'broll',
      type: 'video',
      keyframes: [{ url: scaledBroll, timestamp: 0, duration: durationMs, audio: true }],
    },
    {
      id: 'avatar',
      type: 'video',
      keyframes: [{ url: scaledAvatar, timestamp: 0, duration: durationMs, audio: false }],
    },
  ];

  const composeBody = {
    tracks,
    duration,
    // Undocumented filter_complex: vertically stack the two video streams.
    // B-roll (track 0) on top at 1080×1152, avatar (track 1) on bottom at 1080×768.
    // Combined output: 1080×1920. Audio mapped from track 0 only.
    filter_complex: '[0:v][1:v]vstack=inputs=2[v]',
    output_width: OUTPUT_WIDTH,
    output_height: OUTPUT_HEIGHT,
  };

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/compose`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(composeBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `FAL ffmpeg split-screen compose failed (Pass 2 vstack). ` +
      `filter_complex may be unsupported by fal-ai/ffmpeg-api/compose — ` +
      `needs alternative spatial compositor. Raw error: ${errText}`
    );
  }
  const queueData = await res.json();

  const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/ffmpeg-api/compose', falKey, 180, 3000);
  const resultUrl = output?.video_url || output?.video?.url || output?.output_url;
  if (!resultUrl) throw new Error('No video URL from split-screen compose');

  console.log('[composeSplitScreen] Split-screen composed successfully');
  const finalUrl = await uploadUrlToSupabase(resultUrl, supabase, 'pipeline/avatar');
  return { videoUrl: finalUrl };
}
