/**
 * Caption Burner — adds auto-generated subtitles to video
 * using FAL's fal-ai/workflow-utilities/auto-subtitle endpoint.
 *
 * This endpoint handles speech detection, word timing, and
 * karaoke-style word highlighting natively.
 */

import { pollFalQueue, uploadUrlToSupabase } from './pipelineHelpers.js';

const FAL_BASE = 'https://queue.fal.run';

// ── Caption styles mapped to auto-subtitle params ─────────────────────────────

const CAPTION_STYLES = {
  word_pop: {
    label: 'Word Pop',
    font_name: 'Montserrat',
    font_size: 110,
    font_weight: 'bold',
    font_color: 'white',
    highlight_color: 'yellow',
    stroke_width: 4,
    stroke_color: 'black',
    background_color: 'none',
    background_opacity: 0,
    position: 'bottom',
    y_offset: 75,
    words_per_subtitle: 1,
    enable_animation: true,
  },
  karaoke_glow: {
    label: 'Karaoke Glow',
    font_name: 'Poppins',
    font_size: 120,
    font_weight: 'black',
    font_color: 'white',
    highlight_color: 'green',
    stroke_width: 5,
    stroke_color: 'black',
    background_color: 'none',
    background_opacity: 0,
    position: 'bottom',
    y_offset: 75,
    words_per_subtitle: 1,
    enable_animation: true,
  },
  word_highlight: {
    label: 'Subtle Highlight',
    font_name: 'Montserrat',
    font_size: 100,
    font_weight: 'bold',
    font_color: 'white',
    highlight_color: 'purple',
    stroke_width: 3,
    stroke_color: 'black',
    background_color: 'none',
    background_opacity: 0,
    position: 'bottom',
    y_offset: 75,
    words_per_subtitle: 3,
    enable_animation: true,
  },
  news_ticker: {
    label: 'News Ticker',
    font_name: 'Oswald',
    font_size: 90,
    font_weight: 'bold',
    font_color: 'white',
    highlight_color: 'red',
    stroke_width: 2,
    stroke_color: 'black',
    background_color: 'black',
    background_opacity: 0.6,
    position: 'bottom',
    y_offset: 50,
    words_per_subtitle: 6,
    enable_animation: false,
  },
};

/**
 * Burn captions into a video using fal-ai/workflow-utilities/auto-subtitle.
 *
 * @param {string} videoUrl - URL of the video to caption
 * @param {Array|null} wordTimestamps - Unused (auto-subtitle handles its own transcription)
 * @param {string} falKey - FAL API key
 * @param {object} supabase - Supabase client
 * @param {string} [captionStyle='word_pop'] - Caption style preset
 * @returns {Promise<string>} Public URL of the captioned video
 */
export async function burnCaptions(videoUrl, wordTimestamps, falKey, supabase, captionStyle = 'word_pop') {
  if (!falKey) throw new Error('FAL key required for caption burn-in');
  if (!videoUrl) throw new Error('Video URL required');

  const style = CAPTION_STYLES[captionStyle] || CAPTION_STYLES.word_pop;

  console.log(`[captionBurner] Auto-subtitling video (style: ${captionStyle})`);

  const body = {
    video_url: videoUrl,
    language: 'en',
    font_name: style.font_name,
    font_size: style.font_size,
    font_weight: style.font_weight,
    font_color: style.font_color,
    highlight_color: style.highlight_color,
    stroke_width: style.stroke_width,
    stroke_color: style.stroke_color,
    background_color: style.background_color,
    background_opacity: style.background_opacity,
    position: style.position,
    y_offset: style.y_offset,
    words_per_subtitle: style.words_per_subtitle,
    enable_animation: style.enable_animation,
  };

  const res = await fetch(`${FAL_BASE}/fal-ai/workflow-utilities/auto-subtitle`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`FAL auto-subtitle failed (${res.status}): ${errorText}`);
  }

  const queueData = await res.json();

  // Poll for completion
  const output = await pollFalQueue(
    queueData.response_url || queueData.request_id,
    'fal-ai/workflow-utilities/auto-subtitle',
    falKey,
    120,
    3000
  );

  const outputUrl = output?.video?.url;
  if (!outputUrl) throw new Error('No video URL from auto-subtitle');

  console.log(`[captionBurner] Transcription: "${output?.transcription?.slice(0, 100)}..." (${output?.subtitle_count} segments)`);

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
