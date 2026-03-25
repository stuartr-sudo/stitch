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
 * @param {string|object} captionConfig - Caption style preset key (string) OR a full config object.
 *   If a string, looks up in CAPTION_STYLES (falls back to 'word_pop').
 *   If an object, uses it directly as the style config (unknown keys are ignored).
 * @param {string} falKey - FAL API key
 * @param {object} supabase - Supabase client
 * @returns {Promise<string>} Public URL of the captioned video
 */
export async function burnCaptions(videoUrl, captionConfig, falKey, supabase) {
  if (!falKey) throw new Error('FAL key required for caption burn-in');
  if (!videoUrl) throw new Error('Video URL required');

  // Resolve config: string → preset lookup, object → use directly, null/undefined → default preset
  const config = (captionConfig && typeof captionConfig === 'object')
    ? captionConfig
    : (CAPTION_STYLES[captionConfig] || CAPTION_STYLES.word_pop);

  const styleLabel = (typeof captionConfig === 'string') ? captionConfig : (config.label || 'custom');
  console.log(`[captionBurner] Auto-subtitling video (style: ${styleLabel})`);

  const body = {
    video_url: videoUrl,
    language: 'en',
    font_name: config.font_name || 'Montserrat',
    font_size: config.font_size || 100,
    font_weight: config.font_weight || 'bold',
    font_color: config.font_color || 'white',
    highlight_color: config.highlight_color || 'purple',
    stroke_width: config.stroke_width || 3,
    stroke_color: config.stroke_color || 'black',
    background_color: config.background_color || 'none',
    background_opacity: config.background_opacity || 0,
    position: config.position || 'bottom',
    y_offset: config.y_offset || 75,
    words_per_subtitle: config.words_per_subtitle || 1,
    enable_animation: config.enable_animation !== false,
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
