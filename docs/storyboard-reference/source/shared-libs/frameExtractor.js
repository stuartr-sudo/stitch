/**
 * Frame Extractor — Extract frames from a video via fal.ai's ffmpeg API.
 * Used for scene chaining in Storyboard Planner: last frame of scene N
 * becomes the start frame for scene N+1.
 */

import { apiFetch } from '@/lib/api';

/**
 * Extract the last frame from a video URL using the server-side fal.ai ffmpeg API.
 * Returns a hosted image URL (not a base64 data URL).
 * @param {string} videoUrl - URL of the video
 * @param {string} [frameType='last'] - Which frame to extract: 'first', 'middle', or 'last'
 * @returns {Promise<string>} URL of the extracted frame image
 */
export async function extractLastFrame(videoUrl, frameType = 'last') {
  const res = await apiFetch('/api/video/extract-frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl, frameType }),
  });

  const data = await res.json();

  if (data.imageUrl) {
    return data.imageUrl;
  }

  throw new Error(data.error || 'Frame extraction failed');
}
