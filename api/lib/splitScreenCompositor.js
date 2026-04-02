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

  const output = await pollFalQueue(queueData.response_url, 'fal-ai/ffmpeg-api/compose', falKey, 120, 3000);
  const resultUrl = output?.video_url || output?.video?.url || output?.output_url;
  if (!resultUrl) throw new Error('No video URL from FFmpeg loop');

  return await uploadUrlToSupabase(resultUrl, supabase, 'pipeline/avatar');
}
