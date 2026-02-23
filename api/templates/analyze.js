/**
 * POST /api/templates/analyze
 *
 * Analyzes a reference video (by URL) or a text description of a style,
 * and returns a suggested template structure the user can save.
 *
 * When a video_url is provided the pipeline does real analysis:
 *   1. Extract 4 frames at 0%, 33%, 66%, 95% through the video (fal-ai/ffmpeg-api/extract-frame)
 *   2. Transcribe audio via Whisper (fal-ai/whisper)
 *   3. Send all frames + transcript to GPT-5-mini vision for deep scene analysis
 *   4. Build a reusable template from the comprehensive understanding
 *
 * Body:
 * {
 *   description?: string,  // text description of the video style (used alone or as context)
 *   video_url?: string,    // URL of a reference video — triggers real frame+audio extraction
 *   name?: string,         // optional suggested name
 *   duration_seconds?: number, // estimated video duration for frame timing (default 30)
 * }
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';

const FAL_BASE = 'https://queue.fal.run';
const FAL_DIRECT = 'https://fal.run';

const SceneDefinitionSchema = z.object({
  role: z.enum(['hook', 'problem', 'solution', 'proof', 'point', 'step', 'comparison', 'cta']),
  duration_seconds: z.number(),
  overlay_style: z.enum(['bold_white', 'minimal_dark', 'gradient_overlay']),
  position: z.enum(['top_safe', 'center', 'bottom_safe']),
  hint: z.string(),
});

const TemplateSchema = z.object({
  name: z.string(),
  description: z.string(),
  scene_count: z.number(),
  total_duration_seconds: z.number(),
  scenes: z.array(SceneDefinitionSchema),
  music_mood: z.string(),
  voice_pacing: z.string(),
  template_type: z.enum(['video', 'static', 'both']),
  suggested_writing_structures: z.array(z.string()),
  suggested_image_model: z.enum(['wavespeed', 'fal_seedream', 'fal_flux']),
  suggested_video_model: z.enum(['wavespeed_wan', 'fal_kling', 'fal_hailuo']),
  suggested_motion_style: z.enum(['standard', 'motion_transfer']),
});

const WRITING_STRUCTURES = [
  'BRAND-TUTORIAL', 'BRAND-LISTICLE', 'BRAND-COMPARISON', 'BRAND-CASESTUDY',
  'BRAND-PILLAR', 'BRAND-SUBHUB', 'AFF-MULTI-COMPARE', 'AFF-LISTICLE',
  'PRODUCT-PAGE', 'AFF-SUBHUB',
];

const SYSTEM_PROMPT = `You are a video production expert and content strategist. Reverse-engineer a short-form video template from the provided visual and audio evidence.

Output a reusable template structure with:
- A clear name and description
- 3-6 scenes with specific roles (hook, problem, solution, proof, point, step, comparison, cta)
- Duration in seconds per scene (total should be 15-60s)
- Text overlay style and position per scene
- A "hint" for each scene that tells the AI what to put there
- Overall music mood and voice pacing guidance
- template_type: 'video' for motion content, 'static' for still image ads, 'both' for dual output
- suggested_writing_structures: which article types this template suits best. Choose from: ${WRITING_STRUCTURES.join(', ')}
- suggested_image_model: 'wavespeed' (fastest), 'fal_seedream' (photorealistic), 'fal_flux' (creative/LoRA)
- suggested_video_model: 'wavespeed_wan' (fastest), 'fal_kling' (most realistic), 'fal_hailuo' (cinematic)
- suggested_motion_style: 'standard' (AI animates the image) or 'motion_transfer' (mimics motion from another video using Kling motion control)

Built-in template examples for reference:
- Product Review: hook(3s) → problem(4s) → solution(6s) → proof(6s) → cta(4s) | BRAND-TUTORIAL, PRODUCT-PAGE
- Listicle: hook(3s) → point(5s) → point(5s) → point(5s) → cta(4s) | BRAND-LISTICLE, AFF-LISTICLE
- How-To: hook(3s) → step(6s) → step(6s) → step(6s) → cta(4s) | BRAND-TUTORIAL
- Comparison: hook(3s) → comparison(7s) → comparison(7s) → cta(4s) | BRAND-COMPARISON, AFF-MULTI-COMPARE`;

// ---------------------------------------------------------------------------
// FAL polling helper (minimal — avoids importing from pipelineHelpers)
// ---------------------------------------------------------------------------

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function pollFalQueue(requestId, model, falKey, maxRetries = 60, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(`${FAL_BASE}/${model}/requests/${requestId}`, {
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) { await sleep(delayMs); continue; }
    const data = await res.json();
    if (data.status === 'COMPLETED') return data.output;
    if (data.status === 'FAILED') throw new Error(`FAL job failed: ${data.error || 'unknown'}`);
    await sleep(delayMs);
  }
  throw new Error('FAL queue polling timeout');
}

// ---------------------------------------------------------------------------
// Extract a single frame from a video at a given timestamp
// ---------------------------------------------------------------------------

async function extractFrame(videoUrl, frameTime, falKey) {
  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/extract-frame`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: videoUrl, frame_time: frameTime }),
  });
  if (!res.ok) throw new Error(`Frame extraction failed: ${await res.text()}`);
  const queueData = await res.json();
  if (queueData.image_url) return queueData.image_url;
  const output = await pollFalQueue(queueData.request_id, 'fal-ai/ffmpeg-api/extract-frame', falKey, 20, 2000);
  return output?.image_url || null;
}

// ---------------------------------------------------------------------------
// Transcribe audio via Whisper (fal-ai/whisper)
// ---------------------------------------------------------------------------

async function transcribeAudio(videoUrl, falKey) {
  const res = await fetch(`${FAL_BASE}/fal-ai/whisper`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio_url: videoUrl, task: 'transcribe', language: 'en' }),
  });
  if (!res.ok) throw new Error(`Whisper transcription failed: ${await res.text()}`);
  const queueData = await res.json();
  const output = await pollFalQueue(queueData.request_id, 'fal-ai/whisper', falKey, 60, 3000);
  return output?.text || output?.transcription || '';
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { description, video_url, name, duration_seconds = 30 } = req.body;
  if (!description && !video_url) {
    return res.status(400).json({ error: 'Provide a description or video_url to analyze' });
  }

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const openaiKey = keys.openaiKey || process.env.OPENAI_API_KEY;
    const falKey = keys.falKey || process.env.FAL_KEY;
    if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

    const openai = new OpenAI({ apiKey: openaiKey });

    // ── Text-only path (no video URL or no falKey for extraction) ─────────────
    if (!video_url || !falKey) {
      const userContent = [{
        type: 'text',
        text: video_url
          ? `Reference video URL: ${video_url}\n\nNote: real frame extraction not available (no FAL key). Use this URL as context.\n\nAnalyze the likely structure of this video style and create a reusable template.${description ? `\n\nAdditional description: ${description}` : ''}${name ? `\n\nSuggested name: "${name}"` : ''}`
          : `Create a video template based on this style description:\n\n${description}${name ? `\n\nSuggested name: "${name}"` : ''}`,
      }];

      const completion = await openai.beta.chat.completions.parse({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        response_format: zodResponseFormat(TemplateSchema, 'template'),
      });

      return res.json({ success: true, template: completion.choices[0].message.parsed, analyzed_by: 'text' });
    }

    // ── Video analysis path: extract frames + transcribe audio ─────────────
    console.log(`[templates/analyze] Extracting frames + audio from: ${video_url}`);

    // Extract 4 frames distributed across the video duration
    const frameTimes = [
      0.5,
      Math.round(duration_seconds * 0.33),
      Math.round(duration_seconds * 0.66),
      Math.max(0, duration_seconds - 1),
    ];

    const frameResults = await Promise.allSettled(
      frameTimes.map(t => extractFrame(video_url, t, falKey))
    );

    const frameUrls = frameResults
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value);

    console.log(`[templates/analyze] Extracted ${frameUrls.length}/${frameTimes.length} frames`);

    // Transcribe audio — non-fatal if it fails
    let transcript = '';
    try {
      transcript = await transcribeAudio(video_url, falKey);
      console.log(`[templates/analyze] Transcribed ${transcript.length} chars of audio`);
    } catch (whisperErr) {
      console.warn(`[templates/analyze] Whisper failed (non-fatal): ${whisperErr.message}`);
    }

    // Build the GPT-5-mini vision message with all evidence
    const visionContent = [];

    // Add frames as image_url blocks
    if (frameUrls.length > 0) {
      visionContent.push({
        type: 'text',
        text: `I am providing ${frameUrls.length} frames extracted from a reference video at ${frameTimes.slice(0, frameUrls.length).join('s, ')}s. Analyze these frames to understand the visual style, scene structure, pacing, text overlays, and cinematography.`,
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

    // Add transcript
    if (transcript) {
      visionContent.push({
        type: 'text',
        text: `\nAudio transcript (Whisper):\n"${transcript}"`,
      });
    }

    // Add any extra user description
    const contextNote = [
      `Video URL: ${video_url}`,
      `Estimated duration: ${duration_seconds}s`,
      description ? `Additional context: ${description}` : '',
      name ? `Suggested name: "${name}"` : '',
    ].filter(Boolean).join('\n');

    visionContent.push({
      type: 'text',
      text: `\n${contextNote}\n\nBased on all of the above evidence, reverse-engineer this video into a reusable short-form video template. Be precise about scene count, durations, overlay positions, and which writing structures this style suits.`,
    });

    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: visionContent },
      ],
      response_format: zodResponseFormat(TemplateSchema, 'template'),
    });

    const template = completion.choices[0].message.parsed;

    return res.json({
      success: true,
      template,
      analyzed_by: 'vision',
      frames_extracted: frameUrls.length,
      transcript_chars: transcript.length,
    });

  } catch (err) {
    console.error('[templates/analyze]', err);
    return res.status(500).json({ error: err.message });
  }
}
