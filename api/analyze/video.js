/**
 * POST /api/analyze/video
 *
 * Analyzes a reference video frame-by-frame + audio transcription,
 * returning a structured breakdown for recreating the video.
 *
 * Body: { video_url: string, duration_seconds?: number }
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';

const FAL_BASE = 'https://queue.fal.run';

// ---------------------------------------------------------------------------
// FAL polling (local copy — same pattern as templates/analyze.js)
// ---------------------------------------------------------------------------

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function pollFalQueue(requestIdOrUrl, model, falKey, maxRetries = 60, delayMs = 2000) {
  let statusUrl, resultUrl;
  if (requestIdOrUrl.startsWith?.('http')) {
    const base = requestIdOrUrl.replace(/\/status\/?$/, '');
    statusUrl = `${base}/status`;
    resultUrl = base;
  } else {
    const base = `${FAL_BASE}/${model}/requests/${requestIdOrUrl}`;
    statusUrl = `${base}/status`;
    resultUrl = base;
  }
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) { await sleep(delayMs); continue; }
    const data = await res.json();
    if (data.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      });
      if (!resultRes.ok) throw new Error(`FAL result fetch failed: ${resultRes.status}`);
      return resultRes.json();
    }
    if (data.status === 'FAILED') throw new Error(`FAL job failed: ${data.error || 'unknown'}`);
    await sleep(delayMs);
  }
  throw new Error('FAL queue polling timeout');
}

// ---------------------------------------------------------------------------
// Frame extraction
// ---------------------------------------------------------------------------

async function extractFrame(videoUrl, frameTime, durationSeconds, falKey) {
  // Map to first/middle/last for short videos, or use frame_time for longer ones
  let body;
  if (frameTime <= 0.5) {
    body = { video_url: videoUrl, frame_type: 'first' };
  } else if (frameTime >= durationSeconds - 0.5) {
    body = { video_url: videoUrl, frame_type: 'last' };
  } else {
    // Use 'middle' as a safe fallback — the extract-frame API supports first/middle/last
    // For intermediate frames we use frame_time which ffmpeg handles directly
    body = { video_url: videoUrl, frame_type: 'time', frame_time: frameTime };
  }

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/extract-frame`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Frame extraction failed: ${await res.text()}`);
  const queueData = await res.json();
  if (queueData.images?.[0]?.url) return queueData.images[0].url;
  const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/ffmpeg-api/extract-frame', falKey, 20, 2000);
  return output?.images?.[0]?.url || null;
}

// ---------------------------------------------------------------------------
// Whisper transcription
// ---------------------------------------------------------------------------

async function transcribeAudio(videoUrl, falKey) {
  const res = await fetch(`${FAL_BASE}/fal-ai/whisper`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url: videoUrl, task: 'transcribe', language: 'en', chunk_level: 'segment' }),
  });
  if (!res.ok) throw new Error(`Whisper transcription failed: ${await res.text()}`);
  const queueData = await res.json();
  const output = await pollFalQueue(queueData.response_url || queueData.request_id, 'fal-ai/whisper', falKey, 60, 3000);
  return {
    text: output?.text || output?.transcription || '',
    chunks: output?.chunks || [],
  };
}

// ---------------------------------------------------------------------------
// Output schema
// ---------------------------------------------------------------------------

const SceneSchema = z.object({
  timestamp: z.string().describe('e.g. "0:00-0:03"'),
  camera: z.string().describe('Camera angle/type'),
  framing: z.string().describe('Shot framing (close-up, wide, etc.)'),
  movement: z.string().describe('Camera movement (pan, zoom, static, etc.)'),
  description: z.string().describe('What is happening in this scene'),
});

const AnalysisSchema = z.object({
  script_structure: z.object({
    hook: z.string().describe('Opening hook (first 1-3 seconds)'),
    setup: z.string().describe('Setup/context'),
    body: z.string().describe('Main content/argument'),
    climax: z.string().describe('Peak moment or key reveal'),
    cta: z.string().describe('Call to action or closing'),
  }),
  scenes: z.array(SceneSchema),
  pacing: z.object({
    avg_scene_duration: z.number(),
    rhythm: z.string().describe('e.g. fast-cut, slow-build, steady, accelerating'),
  }),
  visual_style: z.object({
    palette: z.string().describe('Color palette description'),
    lighting: z.string().describe('Lighting style'),
    mood: z.string().describe('Overall visual mood'),
  }),
  audio: z.object({
    music_type: z.string().describe('Type of background music'),
    voiceover_style: z.string().describe('Voiceover delivery style'),
    sfx: z.string().describe('Notable sound effects'),
  }),
  what_works: z.array(z.string()).describe('3-5 things that make this video effective'),
  recreation_config: z.object({
    niche_suggestion: z.string().describe('Suggested niche key from: ai_tech_news, finance_money, motivation, horror_creepy, history_era, crime_mystery, science_nature, dating_relationships, fitness_health, gaming, conspiracy, business_startup, food_cooking, travel, psychology, space_cosmos, animals_nature, sports, education, paranormal_ufo'),
    framework_suggestion: z.string().describe('Suggested framework style: story_driven, fast_paced, educational, cinematic, etc.'),
    video_style_suggestion: z.string().describe('Visual style keyword for generation'),
    scene_count: z.number(),
    duration: z.number().describe('Total video duration in seconds'),
    music_mood: z.string().describe('Music mood keyword'),
  }),
});

const SYSTEM_PROMPT = `You are a world-class video analyst and content strategist. Given frames extracted from a short-form video and its audio transcript, produce a comprehensive structural breakdown.

Your analysis should be actionable — someone should be able to recreate this video's style and structure using your output.

For script_structure: identify the narrative arc even if it's subtle. Every video has a hook, setup, body, climax, and CTA (even if the CTA is implicit).

For scenes: break down every distinct visual change. Include precise timestamps, camera work, and what's shown.

For pacing: characterize the editing rhythm. Fast-cut = <2s avg, steady = 2-4s, slow-build = 4s+.

For visual_style: describe the color grading, lighting approach, and emotional tone of the visuals.

For audio: characterize the music, voiceover delivery, and any sound design.

For what_works: identify 3-5 specific techniques that make this video effective (be specific, not generic).

For recreation_config: suggest the best niche, framework, visual style, scene count, duration, and music mood to recreate something similar. Choose niche from: ai_tech_news, finance_money, motivation, horror_creepy, history_era, crime_mystery, science_nature, dating_relationships, fitness_health, gaming, conspiracy, business_startup, food_cooking, travel, psychology, space_cosmos, animals_nature, sports, education, paranormal_ufo.`;

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { video_url, duration_seconds: rawDuration = 30 } = req.body;
  if (!video_url) {
    return res.status(400).json({ error: 'video_url is required' });
  }

  const duration_seconds = Math.min(Math.max(rawDuration, 5), 120);

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const openaiKey = keys.openaiKey || process.env.OPENAI_API_KEY;
    const falKey = keys.falKey || process.env.FAL_KEY;
    if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });
    if (!falKey) return res.status(400).json({ error: 'FAL.ai API key required for video analysis' });

    const openai = new OpenAI({ apiKey: openaiKey });

    console.log(`[analyze/video] Analyzing: ${video_url} (est. ${duration_seconds}s)`);

    // Extract 8 frames at even intervals
    const framePercentages = [0, 0.12, 0.25, 0.37, 0.50, 0.62, 0.75, 0.87];
    const frameTimes = framePercentages.map(p => Math.max(0.5, Math.round(p * duration_seconds * 10) / 10));
    // Ensure last frame uses 'last' by capping at duration
    frameTimes[frameTimes.length - 1] = Math.min(frameTimes[frameTimes.length - 1], duration_seconds - 0.5);

    // Extract frames in parallel (with concurrency limit of 4)
    const frameUrls = [];
    for (let batch = 0; batch < frameTimes.length; batch += 4) {
      const batchTimes = frameTimes.slice(batch, batch + 4);
      const results = await Promise.allSettled(
        batchTimes.map(t => extractFrame(video_url, t, duration_seconds, falKey))
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) frameUrls.push(r.value);
      }
    }

    console.log(`[analyze/video] Extracted ${frameUrls.length}/${frameTimes.length} frames`);

    // Transcribe audio — non-fatal if it fails
    let transcript = '';
    let chunks = [];
    try {
      const whisperResult = await transcribeAudio(video_url, falKey);
      transcript = whisperResult.text;
      chunks = whisperResult.chunks;
      console.log(`[analyze/video] Transcribed ${transcript.length} chars`);
    } catch (whisperErr) {
      console.warn(`[analyze/video] Whisper failed (non-fatal): ${whisperErr.message}`);
    }

    // Build vision message
    const visionContent = [];

    if (frameUrls.length > 0) {
      visionContent.push({
        type: 'text',
        text: `I am providing ${frameUrls.length} frames extracted at even intervals from a ${duration_seconds}-second video. Analyze these frames to understand the visual style, scene transitions, pacing, and cinematography.`,
      });
      for (const [i, url] of frameUrls.entries()) {
        visionContent.push({
          type: 'text',
          text: `Frame ${i + 1} (at ~${frameTimes[i]}s):`,
        });
        visionContent.push({
          type: 'image_url',
          image_url: { url },
        });
      }
    }

    if (transcript) {
      visionContent.push({
        type: 'text',
        text: `\nAudio transcript:\n"${transcript}"`,
      });
    }

    visionContent.push({
      type: 'text',
      text: `\nVideo URL: ${video_url}\nEstimated duration: ${duration_seconds}s\n\nAnalyze this video completely. Break down every scene, the script structure, visual style, pacing, audio design, and what makes it effective. Then provide a recreation_config that would let someone recreate this style.`,
    });

    const completion = await openai.chat.completions.parse({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: visionContent },
      ],
      response_format: zodResponseFormat(AnalysisSchema, 'video_analysis'),
    });

    const analysis = completion.choices[0].message.parsed;

    return res.json({
      success: true,
      analysis,
      frames: frameUrls,
      transcript,
      transcript_chunks: chunks,
      frames_extracted: frameUrls.length,
    });

  } catch (err) {
    console.error('[analyze/video]', err);
    return res.status(500).json({ error: err.message });
  }
}
