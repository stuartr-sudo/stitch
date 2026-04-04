/**
 * POST /api/analyze/video-gemini
 *
 * Deep video analysis with 12-frame sampling + enhanced structured output.
 * Returns all fields from the basic analyzer PLUS scene transitions,
 * text overlays, color grading, motion analysis, and production quality scoring.
 *
 * Body: { video_url: string, duration_seconds?: number }
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';

const FAL_BASE = 'https://queue.fal.run';

// ---------------------------------------------------------------------------
// FAL polling (local copy — same pattern as video.js)
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
  let body;
  if (frameTime <= 0.5) {
    body = { video_url: videoUrl, frame_type: 'first' };
  } else if (frameTime >= durationSeconds - 0.5) {
    body = { video_url: videoUrl, frame_type: 'last' };
  } else {
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
// Deep analysis output schema
// ---------------------------------------------------------------------------

const SceneSchema = z.object({
  timestamp: z.string().describe('e.g. "0:00-0:03"'),
  camera: z.string().describe('Camera angle/type'),
  framing: z.string().describe('Shot framing (close-up, wide, etc.)'),
  movement: z.string().describe('Camera movement (pan, zoom, static, etc.)'),
  description: z.string().describe('What is happening in this scene'),
});

const SceneTransitionSchema = z.object({
  timestamp: z.string().describe('Timestamp where transition occurs, e.g. "0:03"'),
  type: z.enum(['cut', 'dissolve', 'fade', 'wipe', 'zoom', 'morph', 'other']).describe('Type of transition'),
  description: z.string().describe('Brief description of the transition effect'),
});

const TextOverlaySchema = z.object({
  timestamp: z.string().describe('When the text appears, e.g. "0:02-0:05"'),
  text: z.string().describe('The text content shown on screen'),
  position: z.string().describe('Where on screen (top, center, bottom, lower-third, etc.)'),
  style: z.string().describe('Visual style of the text (bold, animated, handwritten, caption, etc.)'),
});

const MotionAnalysisSchema = z.object({
  scene: z.string().describe('Scene label or timestamp range'),
  camera_movement: z.string().describe('Camera movement description (pan left, zoom in, tracking shot, static, etc.)'),
  subject_movement: z.string().describe('How subjects/objects move within the frame'),
  speed: z.string().describe('Perceived speed (slow, normal, fast, time-lapse, slow-motion)'),
});

const DeepAnalysisSchema = z.object({
  // Base fields (same as video.js)
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

  // Deep analysis fields
  scene_transitions: z.array(SceneTransitionSchema).describe('All scene transitions detected in the video'),
  text_overlays: z.array(TextOverlaySchema).describe('All text overlays/captions visible on screen'),
  color_grading: z.object({
    dominant_palette: z.array(z.string()).describe('3-5 dominant colors, e.g. ["warm orange", "deep navy", "soft cream"]'),
    contrast: z.string().describe('Contrast level and style (high contrast, low-key, flat, cinematic, etc.)'),
    saturation: z.string().describe('Saturation approach (desaturated, vibrant, muted, selective color, etc.)'),
    mood: z.string().describe('Emotional mood created by the color grading'),
  }),
  motion_analysis: z.array(MotionAnalysisSchema).describe('Camera and subject motion breakdown per scene'),
  production_quality: z.object({
    lighting: z.number().min(1).max(10).describe('Lighting quality score 1-10'),
    composition: z.number().min(1).max(10).describe('Composition/framing quality 1-10'),
    audio_mix: z.number().min(1).max(10).describe('Audio mix quality 1-10'),
    overall_score: z.number().min(1).max(10).describe('Overall production quality 1-10'),
    notes: z.string().describe('Brief production quality notes'),
  }),
});

const SYSTEM_PROMPT = `You are a world-class video analyst, colorist, and production expert. Given 12 frames extracted at even intervals from a short-form video and its audio transcript, produce an exhaustive deep analysis.

This is a DEEP analysis — be thorough and specific. You have 12 frames to work with, giving you excellent coverage of the entire video.

## Base Analysis
For script_structure: identify the narrative arc even if it's subtle. Every video has a hook, setup, body, climax, and CTA (even if the CTA is implicit).

For scenes: break down every distinct visual change. Include precise timestamps, camera work, and what's shown. With 12 frames you should catch most scene changes.

For pacing: characterize the editing rhythm. Fast-cut = <2s avg, steady = 2-4s, slow-build = 4s+.

For visual_style: describe the color grading, lighting approach, and emotional tone of the visuals.

For audio: characterize the music, voiceover delivery, and any sound design.

For what_works: identify 3-5 specific techniques that make this video effective (be specific, not generic).

For recreation_config: suggest the best niche, framework, visual style, scene count, duration, and music mood to recreate something similar. Choose niche from: ai_tech_news, finance_money, motivation, horror_creepy, history_era, crime_mystery, science_nature, dating_relationships, fitness_health, gaming, conspiracy, business_startup, food_cooking, travel, psychology, space_cosmos, animals_nature, sports, education, paranormal_ufo.

## Deep Analysis (additional fields)
For scene_transitions: identify EVERY transition between scenes. Note the exact timestamp, type (cut, dissolve, fade, wipe, zoom, morph), and describe the effect. Compare adjacent frames to detect transitions.

For text_overlays: identify ALL text visible on screen — titles, captions, lower-thirds, call-outs, watermarks, subtitles. Note when they appear, what they say, where they are positioned, and their visual style.

For color_grading: analyze the overall color treatment. Identify 3-5 dominant colors, describe the contrast approach, saturation level, and the emotional mood the grading creates. Look for consistency or intentional shifts across scenes.

For motion_analysis: for each major scene, describe both camera movement (pan, tilt, zoom, tracking, static, handheld, drone, etc.) and subject movement (walking, gesturing, product rotation, text animation, etc.). Rate the perceived speed.

For production_quality: score each aspect 1-10 with justification. Lighting (natural, studio, mixed, motivated), composition (rule of thirds, centered, dynamic, symmetry), audio mix (voice clarity, music balance, SFX integration), and overall production value. Add brief notes explaining the scores.`;

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

    console.log(`[analyze/video-gemini] Deep analyzing: ${video_url} (est. ${duration_seconds}s)`);

    // Extract 12 frames at even intervals (0%, 8%, 17%, 25%, 33%, 42%, 50%, 58%, 67%, 75%, 83%, 92%)
    const framePercentages = [0, 0.08, 0.17, 0.25, 0.33, 0.42, 0.50, 0.58, 0.67, 0.75, 0.83, 0.92];
    const frameTimes = framePercentages.map(p => Math.max(0.5, Math.round(p * duration_seconds * 10) / 10));
    // Cap last frame before video end
    frameTimes[frameTimes.length - 1] = Math.min(frameTimes[frameTimes.length - 1], duration_seconds - 0.5);

    // Extract frames in parallel (concurrency limit of 4)
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

    console.log(`[analyze/video-gemini] Extracted ${frameUrls.length}/${frameTimes.length} frames`);

    // Transcribe audio — non-fatal if it fails
    let transcript = '';
    let chunks = [];
    try {
      const whisperResult = await transcribeAudio(video_url, falKey);
      transcript = whisperResult.text;
      chunks = whisperResult.chunks;
      console.log(`[analyze/video-gemini] Transcribed ${transcript.length} chars`);
    } catch (whisperErr) {
      console.warn(`[analyze/video-gemini] Whisper failed (non-fatal): ${whisperErr.message}`);
    }

    // Build vision message with all 12 frames
    const visionContent = [];

    if (frameUrls.length > 0) {
      visionContent.push({
        type: 'text',
        text: `I am providing ${frameUrls.length} frames extracted at even intervals from a ${duration_seconds}-second video. This is a DEEP analysis with high frame density — use all frames to detect transitions, text overlays, camera movements, and color shifts between scenes.`,
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
      text: `\nVideo URL: ${video_url}\nEstimated duration: ${duration_seconds}s\n\nPerform a DEEP analysis of this video. Include:\n1. Full base analysis (script structure, scenes, pacing, visual style, audio, what works, recreation config)\n2. Scene transitions — identify every transition between scenes with type and timestamp\n3. Text overlays — all on-screen text with position and style\n4. Color grading — dominant palette, contrast, saturation, mood\n5. Motion analysis — camera and subject movement per scene\n6. Production quality — score lighting, composition, audio mix, and overall (1-10 each)`,
    });

    const completion = await openai.chat.completions.parse({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: visionContent },
      ],
      response_format: zodResponseFormat(DeepAnalysisSchema, 'deep_video_analysis'),
    });

    const analysis = completion.choices[0].message.parsed;

    return res.json({
      success: true,
      analysis,
      frames: frameUrls,
      transcript,
      transcript_chunks: chunks,
      frames_extracted: frameUrls.length,
      analysis_type: 'deep',
    });

  } catch (err) {
    console.error('[analyze/video-gemini]', err);
    return res.status(500).json({ error: err.message });
  }
}
