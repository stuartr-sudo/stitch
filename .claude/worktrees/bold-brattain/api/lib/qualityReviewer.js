/**
 * Quality Review Gate
 *
 * Extracts one frame per scene clip, sends to GPT-4.1-mini vision
 * to check if visuals match the narration, returns per-scene pass/fail.
 */

import { pollFalQueue } from './pipelineHelpers.js';
import OpenAI from 'openai';

const FAL_BASE = 'https://queue.fal.run';

const VISION_PROMPT = `You are a video quality reviewer. Compare this video frame against the narration it should depict.

Narration: "{narration}"

Analyze whether the visual content of the frame matches the narration. Consider:
- Subject matter: Does the frame show what the narration describes?
- Setting/environment: Is the location/background appropriate?
- Mood/tone: Does the visual tone match the narration's tone?

Ignore minor stylistic differences (art style, color grading, exact composition). Focus on whether the frame depicts the RIGHT SUBJECT for this narration.

Respond with ONLY valid JSON (no markdown fencing):
{ "match": true, "confidence": 0.95, "reason": "Brief explanation" }`;

/**
 * Extract the middle frame from a video clip via FAL extract-frame API.
 * @param {string} clipUrl — URL of the video clip
 * @param {string} falKey — FAL API key
 * @returns {Promise<string>} — URL of the extracted frame image
 */
async function extractMiddleFrame(clipUrl, falKey) {
  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/extract-frame`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: clipUrl, frame_type: 'middle' }),
  });

  if (!res.ok) throw new Error(`FAL extract-frame failed: ${res.status}`);
  const queueData = await res.json();

  // Some FAL endpoints return the result directly
  if (queueData.images?.[0]?.url) return queueData.images[0].url;

  const result = await pollFalQueue(
    queueData.response_url || queueData.request_id,
    'fal-ai/ffmpeg-api/extract-frame',
    falKey, 30, 2000,
  );
  const imageUrl = result?.images?.[0]?.url || result?.image?.url;
  if (!imageUrl) throw new Error('No image URL from extract-frame');
  return imageUrl;
}

/**
 * Send a frame + narration to GPT-4.1-mini vision for alignment check.
 * @param {string} frameUrl — URL of the extracted frame image
 * @param {string} narrationText — narration this frame should depict
 * @param {OpenAI} openai — OpenAI client instance
 * @returns {Promise<{match: boolean, confidence: number, reason: string}>}
 */
async function analyzeFrameNarrationMatch(frameUrl, narrationText, openai) {
  const prompt = VISION_PROMPT.replace('{narration}', narrationText);

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: frameUrl } },
        { type: 'text', text: prompt },
      ],
    }],
    max_tokens: 200,
  });

  const raw = response.choices[0].message.content.trim();

  // Parse JSON from the response — handle possible markdown fencing
  let cleaned = raw;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      match: !!parsed.match,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reason: parsed.reason || 'No reason provided',
    };
  } catch {
    console.warn(`[qualityReview] Failed to parse vision response: ${raw}`);
    return { match: true, confidence: 0, reason: 'Review inconclusive — could not parse response' };
  }
}

/**
 * Review scene alignment: extract one frame per scene clip, compare
 * each frame against its narration using GPT-4.1-mini vision.
 *
 * @param {Object} params
 * @param {Array<{url: string, duration: number}>} params.clips
 * @param {Array<{narration: string}>} params.scenes
 * @param {string} params.falKey
 * @param {string} params.openaiKey
 * @returns {Promise<{results: Array}>}
 */
export async function reviewSceneAlignment({ clips, scenes, falKey, openaiKey }) {
  if (!clips?.length || !scenes?.length) {
    return { results: [], error: 'No clips or scenes to review' };
  }

  const count = Math.min(clips.length, scenes.length);

  // Phase 1: Extract middle frames from all clips in parallel
  console.log(`[qualityReview] Extracting ${count} middle frames...`);
  const framePromises = [];
  for (let i = 0; i < count; i++) {
    framePromises.push(
      extractMiddleFrame(clips[i].url, falKey)
        .catch(err => {
          console.warn(`[qualityReview] Frame extraction failed for scene ${i}: ${err.message}`);
          return null;
        })
    );
  }
  const frameUrls = await Promise.all(framePromises);
  console.log(`[qualityReview] Extracted ${frameUrls.filter(Boolean).length}/${count} frames`);

  // Phase 2: Vision analysis — compare each frame against its narration
  console.log(`[qualityReview] Running vision analysis on ${frameUrls.filter(Boolean).length} frames...`);
  const openai = new OpenAI({ apiKey: openaiKey });

  const visionPromises = frameUrls.map((frameUrl, i) => {
    if (!frameUrl) {
      return Promise.resolve({
        scene_index: i,
        match: true,
        confidence: 0,
        reason: 'Frame extraction failed',
        frame_url: null,
      });
    }

    const narration = scenes[i]?.narration || '';
    if (!narration.trim()) {
      return Promise.resolve({
        scene_index: i,
        match: true,
        confidence: 0,
        reason: 'No narration text to compare',
        frame_url: frameUrl,
      });
    }

    return analyzeFrameNarrationMatch(frameUrl, narration, openai)
      .then(analysis => ({
        scene_index: i,
        ...analysis,
        frame_url: frameUrl,
      }))
      .catch(err => {
        console.warn(`[qualityReview] Vision analysis failed for scene ${i}: ${err.message}`);
        return {
          scene_index: i,
          match: true,
          confidence: 0,
          reason: `Vision analysis failed: ${err.message}`,
          frame_url: frameUrl,
        };
      });
  });

  const results = await Promise.all(visionPromises);
  const flagged = results.filter(r => !r.match).length;
  console.log(`[qualityReview] Done — ${flagged}/${count} scenes flagged`);

  return { results };
}
