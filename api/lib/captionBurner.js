/**
 * Caption Burner — burns word-level animated captions into video
 * using FFmpeg drawtext filters via FAL's ffmpeg-api.
 *
 * Words are grouped into readable chunks (3 words at a time) and
 * displayed with enable='between(t,start,end)' for precise timing.
 */

const FAL_BASE = 'https://queue.fal.run';

// ── Caption styles ───────────────────────────────────────────────────────────

const CAPTION_STYLES = {
  word_pop: {
    label: 'Word Pop',
    fontsize: 56,
    fontcolor: 'white',
    borderw: 3,
    bordercolor: 'black',
    shadowcolor: 'black@0.5',
    shadowx: 2,
    shadowy: 2,
    y_expr: '(h*0.78)',
  },
  karaoke_glow: {
    label: 'Karaoke Glow',
    fontsize: 64,
    fontcolor: 'yellow',
    borderw: 4,
    bordercolor: 'black',
    shadowcolor: 'black@0.8',
    shadowx: 3,
    shadowy: 3,
    y_expr: '(h*0.72)',
  },
  word_highlight: {
    label: 'Subtle Highlight',
    fontsize: 48,
    fontcolor: 'white',
    borderw: 2,
    bordercolor: '#222222',
    shadowcolor: 'black@0.4',
    shadowx: 1,
    shadowy: 1,
    y_expr: '(h*0.80)',
  },
};

/**
 * Escape text for FFmpeg drawtext filter.
 * Must escape: ' : \ and the commas inside enable='between(t,X,Y)'
 */
function escapeDrawtext(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\\\\\''")
    .replace(/:/g, '\\:')
    .replace(/"/g, '\\"')
    .replace(/%/g, '%%');
}

/**
 * Group word timestamps into readable chunks for display.
 *
 * @param {Array<{ word, start, end }>} words
 * @param {number} [wordsPerChunk=3] - Words per display group
 * @returns {Array<{ text: string, start: number, end: number }>}
 */
function groupWordsIntoChunks(words, wordsPerChunk = 3) {
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

/**
 * Build FFmpeg drawtext filter chain from word chunks.
 *
 * @param {Array<{ text, start, end }>} chunks
 * @param {string} styleKey - 'word_pop' | 'karaoke_glow' | 'word_highlight'
 * @returns {string} Comma-joined drawtext filters
 */
function buildDrawtextFilters(chunks, styleKey = 'word_pop') {
  const style = CAPTION_STYLES[styleKey] || CAPTION_STYLES.word_pop;

  return chunks.map(chunk => {
    const escapedText = escapeDrawtext(chunk.text);
    const start = chunk.start.toFixed(3);
    const end = chunk.end.toFixed(3);

    // Use fontfile path available on FAL's Linux FFmpeg environment
    return [
      `drawtext=text='${escapedText}'`,
      `fontsize=${style.fontsize}`,
      `fontcolor=${style.fontcolor}`,
      `borderw=${style.borderw}`,
      `bordercolor=${style.bordercolor}`,
      `shadowcolor=${style.shadowcolor}`,
      `shadowx=${style.shadowx}`,
      `shadowy=${style.shadowy}`,
      `fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`,
      `x=(w-text_w)/2`,
      `y=${style.y_expr}`,
      `enable='between(t\\,${start}\\,${end})'`,
    ].join(':');
  }).join(',');
}

/**
 * Burn captions into a video using FFmpeg drawtext filters.
 *
 * @param {string} videoUrl - URL of the video to caption
 * @param {Array<{ word, start, end }>} wordTimestamps - Word-level timestamps from Whisper
 * @param {string} falKey - FAL API key
 * @param {object} supabase - Supabase client
 * @param {string} [captionStyle='word_pop'] - Caption style preset
 * @param {number} [wordsPerChunk=3] - Words per caption group
 * @returns {Promise<string>} Public URL of the captioned video
 */
export async function burnCaptions(videoUrl, wordTimestamps, falKey, supabase, captionStyle = 'word_pop', wordsPerChunk = 3) {
  if (!falKey) throw new Error('FAL key required for caption burn-in');
  if (!videoUrl) throw new Error('Video URL required');
  if (!wordTimestamps?.length) {
    console.warn('[captionBurner] No word timestamps — returning original video');
    return videoUrl;
  }

  console.log(`[captionBurner] Burning ${wordTimestamps.length} words into video (style: ${captionStyle}, ${wordsPerChunk} words/chunk)`);

  const chunks = groupWordsIntoChunks(wordTimestamps, wordsPerChunk);
  console.log(`[captionBurner] ${chunks.length} caption chunks`);

  const drawtextFilters = buildDrawtextFilters(chunks, captionStyle);
  const filterComplex = `[0:v]${drawtextFilters}[captioned]`;

  const body = {
    inputs: [{ url: videoUrl }],
    filter_complex: filterComplex,
    output_options: ['-map', '[captioned]', '-map', '0:a', '-c:v', 'libx264', '-c:a', 'copy', '-preset', 'fast'],
    output_filename: `captioned_${Date.now()}.mp4`,
  };

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`FAL ffmpeg caption burn failed (${res.status}): ${errorText}`);
  }

  const queueData = await res.json();

  // Poll for completion
  const output = await pollFalCaptionQueue(queueData.response_url || queueData.request_id, falKey, 120, 3000);
  const outputUrl = output?.video?.url || output?.output_url;
  if (!outputUrl) throw new Error('No video URL from FFmpeg caption burn');

  // Upload to Supabase
  const captionedUrl = await uploadToSupabase(outputUrl, supabase);
  console.log(`[captionBurner] Captioned video uploaded: ${captionedUrl}`);
  return captionedUrl;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollFalCaptionQueue(requestIdOrUrl, falKey, maxRetries = 120, delayMs = 3000) {
  const pollUrl = requestIdOrUrl.startsWith?.('http')
    ? requestIdOrUrl
    : `${FAL_BASE}/fal-ai/ffmpeg-api/requests/${requestIdOrUrl}`;
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(pollUrl, {
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      await sleep(delayMs);
      continue;
    }

    const data = await res.json();
    if (data.status === 'COMPLETED') return data.output;
    if (data.status === 'FAILED') throw new Error(`FFmpeg caption job failed: ${data.error || 'unknown'}`);

    await sleep(delayMs);
  }
  throw new Error('FFmpeg caption burn polling timeout');
}

async function uploadToSupabase(url, supabase) {
  try {
    const response = await fetch(url);
    if (!response.ok) return url;

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = `pipeline/finals/${Date.now()}-captioned-${Math.random().toString(36).slice(2)}.mp4`;

    const { error } = await supabase.storage
      .from('videos')
      .upload(fileName, buffer, { contentType: 'video/mp4', upsert: false });

    if (error) return url;

    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
    return publicUrl;
  } catch {
    return url;
  }
}

export { CAPTION_STYLES, groupWordsIntoChunks };
