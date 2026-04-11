/**
 * POST /api/campaigns/generate-captions
 *
 * Generates SRT/VTT subtitle files from a draft's captions_json.
 * Supports styles: 'sentence' (one cue per scene voiceover),
 * 'word_highlight' (one cue per word for TikTok-style karaoke).
 *
 * Body: {
 *   draft_id: string,
 *   style?: 'sentence' | 'word_highlight',  // default: 'sentence'
 * }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { draft_id, style = 'sentence' } = req.body;

  if (!draft_id) return res.status(400).json({ error: 'draft_id is required' });

  const { data: draft, error: draftErr } = await supabase
    .from('ad_drafts')
    .select('id, captions_json')
    .eq('id', draft_id)
    .single();

  if (draftErr || !draft) return res.status(404).json({ error: 'Draft not found' });

  const captions = draft.captions_json || [];
  if (captions.length === 0) return res.status(400).json({ error: 'No captions found in draft' });

  // Calculate cumulative timestamps
  let cumulativeSeconds = 0;
  const timedCaptions = captions.map(cap => {
    const start = cumulativeSeconds;
    const duration = cap.duration_seconds || 5;
    cumulativeSeconds += duration;
    return { ...cap, start_seconds: start, end_seconds: cumulativeSeconds };
  });

  let srt, vtt;

  if (style === 'word_highlight') {
    // Word-by-word cues — distribute timing evenly across words per scene
    const srtCues = [];
    const vttCues = [];
    let cueIndex = 1;

    for (const cap of timedCaptions) {
      const text = cap.voiceover || cap.headline || '';
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length === 0) continue;

      const sceneDuration = cap.end_seconds - cap.start_seconds;
      const wordDuration = sceneDuration / words.length;

      for (let w = 0; w < words.length; w++) {
        const wordStart = cap.start_seconds + w * wordDuration;
        const wordEnd = cap.start_seconds + (w + 1) * wordDuration;

        srtCues.push(formatSrtCue(cueIndex, wordStart, wordEnd, words[w]));
        vttCues.push(formatVttCue(wordStart, wordEnd, words[w]));
        cueIndex++;
      }
    }

    srt = srtCues.join('\n\n');
    vtt = 'WEBVTT\n\n' + vttCues.join('\n\n');
  } else {
    // Sentence mode — one cue per scene voiceover
    const srtCues = timedCaptions.map((cap, i) => {
      const text = cap.voiceover || cap.headline || `Scene ${i + 1}`;
      return formatSrtCue(i + 1, cap.start_seconds, cap.end_seconds, text);
    });

    const vttCues = timedCaptions.map((cap, i) => {
      const text = cap.voiceover || cap.headline || `Scene ${i + 1}`;
      return formatVttCue(cap.start_seconds, cap.end_seconds, text);
    });

    srt = srtCues.join('\n\n');
    vtt = 'WEBVTT\n\n' + vttCues.join('\n\n');
  }

  // Save to draft
  await supabase.from('ad_drafts').update({
    subtitles_srt: srt,
    subtitles_vtt: vtt,
  }).eq('id', draft_id);

  return res.json({
    success: true,
    style,
    cue_count: style === 'word_highlight'
      ? timedCaptions.reduce((sum, c) => sum + (c.voiceover || c.headline || '').split(/\s+/).filter(Boolean).length, 0)
      : timedCaptions.length,
    total_duration: cumulativeSeconds,
    srt_preview: srt.slice(0, 500),
    vtt_preview: vtt.slice(0, 500),
  });
}

// ── SRT/VTT formatting helpers ───────────────────────────────────────────────

function formatTimestamp(seconds, separator = ',') {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad3(ms)}`;
}

function pad(n) { return String(n).padStart(2, '0'); }
function pad3(n) { return String(n).padStart(3, '0'); }

function formatSrtCue(index, start, end, text) {
  return `${index}\n${formatTimestamp(start, ',')} --> ${formatTimestamp(end, ',')}\n${text}`;
}

function formatVttCue(start, end, text) {
  return `${formatTimestamp(start, '.')} --> ${formatTimestamp(end, '.')}\n${text}`;
}
