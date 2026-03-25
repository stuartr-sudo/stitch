/**
 * Caption Burner — adds auto-generated captions to video
 * using FAL's fal-ai/auto-caption endpoint.
 *
 * This replaces the previous FFmpeg drawtext approach which was
 * unreliable. The auto-caption API handles speech detection,
 * timing, and rendering natively.
 */

import { pollFalQueue, uploadUrlToSupabase } from './pipelineHelpers.js';

const FAL_BASE = 'https://queue.fal.run';

// ── Caption styles mapped to auto-caption params ─────────────────────────────

const CAPTION_STYLES = {
  word_pop: {
    label: 'Word Pop',
    txt_color: 'white',
    txt_font: 'Standard',
    font_size: 56,
    stroke_width: 3,
    top_align: 0.78,
    left_align: 'center',
    refresh_interval: 1.5,
  },
  karaoke_glow: {
    label: 'Karaoke Glow',
    txt_color: 'yellow',
    txt_font: 'Arial',
    font_size: 64,
    stroke_width: 4,
    top_align: 0.72,
    left_align: 'center',
    refresh_interval: 1.2,
  },
  word_highlight: {
    label: 'Subtle Highlight',
    txt_color: 'white',
    txt_font: 'Garamond',
    font_size: 48,
    stroke_width: 2,
    top_align: 0.80,
    left_align: 'center',
    refresh_interval: 1.5,
  },
};

/**
 * Burn captions into a video using fal-ai/auto-caption.
 *
 * @param {string} videoUrl - URL of the video to caption
 * @param {Array<{ word, start, end }>} wordTimestamps - Word-level timestamps (unused by auto-caption, kept for API compat)
 * @param {string} falKey - FAL API key
 * @param {object} supabase - Supabase client
 * @param {string} [captionStyle='word_pop'] - Caption style preset
 * @param {number} [wordsPerChunk=3] - Unused (auto-caption handles its own chunking)
 * @returns {Promise<string>} Public URL of the captioned video
 */
export async function burnCaptions(videoUrl, wordTimestamps, falKey, supabase, captionStyle = 'word_pop', wordsPerChunk = 3) {
  if (!falKey) throw new Error('FAL key required for caption burn-in');
  if (!videoUrl) throw new Error('Video URL required');

  const style = CAPTION_STYLES[captionStyle] || CAPTION_STYLES.word_pop;

  console.log(`[captionBurner] Auto-captioning video (style: ${captionStyle})`);

  const body = {
    video_url: videoUrl,
    txt_color: style.txt_color,
    txt_font: style.txt_font,
    font_size: style.font_size,
    stroke_width: style.stroke_width,
    top_align: style.top_align,
    left_align: style.left_align,
    refresh_interval: style.refresh_interval,
  };

  const res = await fetch(`${FAL_BASE}/fal-ai/auto-caption`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`FAL auto-caption failed (${res.status}): ${errorText}`);
  }

  const queueData = await res.json();

  // Poll for completion
  const output = await pollFalQueue(
    queueData.response_url || queueData.request_id,
    'fal-ai/auto-caption',
    falKey,
    120,
    3000
  );

  const outputUrl = output?.video_url || output?.video?.url;
  if (!outputUrl) throw new Error('No video URL from auto-caption');

  // Upload to Supabase
  const captionedUrl = await uploadUrlToSupabase(outputUrl, supabase, 'pipeline/finals');
  console.log(`[captionBurner] Captioned video uploaded: ${captionedUrl}`);
  return captionedUrl;
}

export { CAPTION_STYLES };

/**
 * Group word timestamps into readable chunks for display.
 * Kept for backward compatibility with any code that imports it.
 */
export function groupWordsIntoChunks(words, wordsPerChunk = 3) {
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const group = words.slice(i, i + wordsPerChunk);
    if (group.length === 0) continue;
    chunks.push({
      text: group.map(w => w.word).join(' '),
      start: group[0].start,
      end: group[group.length - 1].end,
    });
  }
  return chunks;
}
