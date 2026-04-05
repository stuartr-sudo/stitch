/**
 * POST /api/analyze/clone-ad
 *
 * Analyzes a video ad and produces ad-specific insights plus a clone recipe.
 * Optionally adapts the recipe to the user's brand kit.
 *
 * Body: { video_url: string, duration_seconds?: number, brand_kit_id?: string }
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { resolveVideoUrl } from '../lib/resolveVideoUrl.js';
import { saveAnalysisFrames } from '../lib/saveAnalysisFrames.js';

const FAL_BASE = 'https://queue.fal.run';

// ---------------------------------------------------------------------------
// FAL polling
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
// Schemas
// ---------------------------------------------------------------------------

const AdSectionSchema = z.object({
  label: z.string().describe('Section name (e.g. "Hook", "Problem", "Solution", "CTA")'),
  start_seconds: z.number(),
  end_seconds: z.number(),
  description: z.string().describe('What happens in this section'),
});

const CloneRecipeSchema = z.object({
  suggested_hook: z.string().describe('Adapted hook for the user brand'),
  suggested_script_outline: z.array(z.object({
    scene: z.string().describe('Scene label (e.g. "Scene 1: Hook")'),
    duration_seconds: z.number(),
    narration: z.string().describe('Suggested voiceover text'),
    visual_direction: z.string().describe('Visual description for image/video generation'),
  })),
  suggested_visual_style: z.string().describe('Visual style direction for generation'),
  suggested_duration: z.number().describe('Optimal total duration in seconds'),
});

const AdCloneSchema = z.object({
  hook_technique: z.string().describe('How the ad grabs attention (pattern interrupt, bold claim, question, shock, etc.)'),
  cta_style: z.string().describe('Call-to-action approach (urgency, social proof, scarcity, benefit-driven)'),
  product_showcase: z.string().describe('How the product is presented (demo, lifestyle, comparison, testimonial)'),
  emotional_triggers: z.array(z.string()).describe('Emotions targeted (fear, aspiration, curiosity, FOMO, etc.)'),
  ad_structure: z.array(AdSectionSchema).describe('Breakdown of ad sections with timing'),
  target_audience_inferred: z.string().describe('Who this ad targets based on content and style'),
  platform_optimizations: z.array(z.string()).describe('Platform features the ad leverages'),
  clone_recipe: CloneRecipeSchema,
});

// Also run the base video analysis
const SceneSchema = z.object({
  timestamp: z.string().describe('e.g. "0:00-0:03"'),
  camera: z.string().describe('Camera angle/type'),
  framing: z.string().describe('Shot framing (close-up, wide, etc.)'),
  movement: z.string().describe('Camera movement (pan, zoom, static, etc.)'),
  description: z.string().describe('What is happening in this scene'),
});

const BaseAnalysisSchema = z.object({
  script_structure: z.object({
    hook: z.string(),
    setup: z.string(),
    body: z.string(),
    climax: z.string(),
    cta: z.string(),
  }),
  scenes: z.array(SceneSchema),
  pacing: z.object({
    avg_scene_duration: z.number(),
    rhythm: z.string(),
  }),
  visual_style: z.object({
    palette: z.string(),
    lighting: z.string(),
    mood: z.string(),
  }),
  audio: z.object({
    music_type: z.string(),
    voiceover_style: z.string(),
    sfx: z.string(),
  }),
  what_works: z.array(z.string()),
  recreation_config: z.object({
    niche_suggestion: z.string(),
    framework_suggestion: z.string(),
    video_style_suggestion: z.string(),
    scene_count: z.number(),
    duration: z.number(),
    music_mood: z.string(),
  }),
});

const BASE_SYSTEM = `You are a world-class video analyst and content strategist. Given frames extracted from a short-form video and its audio transcript, produce a comprehensive structural breakdown.

Your analysis should be actionable — someone should be able to recreate this video's style and structure using your output.

For script_structure: identify the narrative arc even if it's subtle. Every video has a hook, setup, body, climax, and CTA (even if the CTA is implicit).

For scenes: break down every distinct visual change. Include precise timestamps, camera work, and what's shown.

For pacing: characterize the editing rhythm. Fast-cut = <2s avg, steady = 2-4s, slow-build = 4s+.

For visual_style: describe the color grading, lighting approach, and emotional tone of the visuals.

For audio: characterize the music, voiceover delivery, and any sound design.

For what_works: identify 3-5 specific techniques that make this video effective (be specific, not generic).

For recreation_config: suggest the best niche, framework, visual style, scene count, duration, and music mood to recreate something similar. Choose niche from: ai_tech_news, finance_money, motivation, horror_creepy, history_era, crime_mystery, science_nature, dating_relationships, fitness_health, gaming, conspiracy, business_startup, food_cooking, travel, psychology, space_cosmos, animals_nature, sports, education, paranormal_ufo.`;

const AD_SYSTEM = `You are a world-class advertising strategist and creative director. You have already seen a detailed structural analysis of a video ad (frames + transcript). Now provide ad-specific analysis.

Identify:
1. hook_technique — How does the ad grab attention in the first 1-3 seconds? (pattern interrupt, bold claim, question, shocking stat, visual hook, etc.)
2. cta_style — What approach does the CTA use? (urgency, social proof, scarcity, benefit-driven, direct command, etc.)
3. product_showcase — How is the product/service presented? (live demo, lifestyle context, before/after, testimonial, comparison, abstract, etc.)
4. emotional_triggers — What emotions does the ad target? Be specific (FOMO, aspiration, curiosity, fear of missing out, belonging, pride, etc.)
5. ad_structure — Break the ad into timed sections (hook, problem, agitation, solution, social proof, CTA, etc.). Every ad has at least a hook and CTA.
6. target_audience_inferred — Based on messaging, visuals, and tone, who is this ad targeting?
7. platform_optimizations — What platform-specific features does it leverage? (vertical format, captions, sound-off design, etc.)
8. clone_recipe — A concrete recipe for recreating this ad with a different brand:
   - suggested_hook: An adapted opening hook
   - suggested_script_outline: Scene-by-scene breakdown with narration and visual direction
   - suggested_visual_style: Overall visual approach for generation
   - suggested_duration: Optimal duration in seconds

BRAND_CONTEXT_PLACEHOLDER

Make the clone_recipe specific and actionable — someone should be able to hand this to a video creator and get a similar ad.`;

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { video_url, duration_seconds: rawDuration = 30, brand_kit_id } = req.body;
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
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Resolve platform URLs (YouTube, TikTok, IG, etc.) to direct video URLs
    const { videoUrl: resolvedUrl, metadata: videoMetadata, warning: resolveWarning } = await resolveVideoUrl(video_url);
    const effectiveDuration = videoMetadata?.duration || duration_seconds;
    if (resolveWarning) console.warn(`[analyze/clone-ad] ${resolveWarning}`);
    console.log(`[analyze/clone-ad] Analyzing ad: ${resolvedUrl} (${effectiveDuration}s${videoMetadata?.platform ? `, ${videoMetadata.platform}` : ''})`);

    // Load brand kit if provided
    let brandKit = null;
    if (brand_kit_id) {
      const { data } = await supabase
        .from('brand_kit')
        .select('*')
        .eq('id', brand_kit_id)
        .eq('user_id', req.user.id)
        .single();
      brandKit = data;
      if (brandKit) {
        console.log(`[analyze/clone-ad] Brand kit loaded: ${brandKit.brand_name}`);
      }
    }

    // Extract 8 frames at even intervals
    const framePercentages = [0, 0.12, 0.25, 0.37, 0.50, 0.62, 0.75, 0.87];
    const frameTimes = framePercentages.map(p => Math.max(0.5, Math.round(p * effectiveDuration * 10) / 10));
    frameTimes[frameTimes.length - 1] = Math.min(frameTimes[frameTimes.length - 1], effectiveDuration - 0.5);

    // Extract frames in parallel (concurrency limit of 4)
    const frameUrls = [];
    for (let batch = 0; batch < frameTimes.length; batch += 4) {
      const batchTimes = frameTimes.slice(batch, batch + 4);
      const results = await Promise.allSettled(
        batchTimes.map(t => extractFrame(resolvedUrl, t, effectiveDuration, falKey))
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) frameUrls.push(r.value);
      }
    }

    console.log(`[analyze/clone-ad] Extracted ${frameUrls.length}/${frameTimes.length} frames`);

    // Save frames to library (fire-and-forget)
    saveAnalysisFrames(supabase, req.user.id, req.user.email, frameUrls, videoMetadata, 'ad-clone')
      .catch(err => console.warn(`[analyze/clone-ad] Frame save failed (non-fatal): ${err.message}`));

    // Transcribe audio (non-fatal)
    let transcript = '';
    let chunks = [];
    try {
      const whisperResult = await transcribeAudio(resolvedUrl, falKey);
      transcript = whisperResult.text;
      chunks = whisperResult.chunks;
      console.log(`[analyze/clone-ad] Transcribed ${transcript.length} chars`);
    } catch (whisperErr) {
      console.warn(`[analyze/clone-ad] Whisper failed (non-fatal): ${whisperErr.message}`);
    }

    // Build vision content for GPT
    const visionContent = [];

    if (frameUrls.length > 0) {
      visionContent.push({
        type: 'text',
        text: `I am providing ${frameUrls.length} frames extracted at even intervals from a ${duration_seconds}-second video ad. Analyze these frames to understand the visual style, scene transitions, pacing, and cinematography.`,
      });
      for (const [i, url] of frameUrls.entries()) {
        visionContent.push({ type: 'text', text: `Frame ${i + 1} (at ~${frameTimes[i]}s):` });
        visionContent.push({ type: 'image_url', image_url: { url } });
      }
    }

    if (transcript) {
      visionContent.push({ type: 'text', text: `\nAudio transcript:\n"${transcript}"` });
    }

    visionContent.push({
      type: 'text',
      text: `\nVideo URL: ${video_url}\nEstimated duration: ${duration_seconds}s\n\nAnalyze this video completely. Break down every scene, the script structure, visual style, pacing, audio design, and what makes it effective. Then provide a recreation_config that would let someone recreate this style.`,
    });

    // Stage 1: Base video analysis
    const baseCompletion = await openai.chat.completions.parse({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: BASE_SYSTEM },
        { role: 'user', content: visionContent },
      ],
      response_format: zodResponseFormat(BaseAnalysisSchema, 'video_analysis'),
    });

    const baseAnalysis = baseCompletion.choices[0].message.parsed;

    // Stage 2: Ad-specific analysis
    let brandContext = '';
    if (brandKit) {
      const parts = [];
      if (brandKit.brand_name) parts.push(`Brand name: ${brandKit.brand_name}`);
      if (brandKit.tagline) parts.push(`Tagline: ${brandKit.tagline}`);
      if (brandKit.industry) parts.push(`Industry: ${brandKit.industry}`);
      if (brandKit.target_audience) parts.push(`Target audience: ${brandKit.target_audience}`);
      if (brandKit.brand_colors?.length) parts.push(`Brand colors: ${brandKit.brand_colors.join(', ')}`);
      if (brandKit.tone_of_voice) parts.push(`Tone of voice: ${brandKit.tone_of_voice}`);
      brandContext = `\n\nAdapt the clone_recipe for this brand:\n${parts.join('\n')}\nMake all suggestions specific to this brand's identity, industry, and audience.`;
    }

    const adSystemPrompt = AD_SYSTEM.replace('BRAND_CONTEXT_PLACEHOLDER', brandContext);

    const adUserContent = `Here is the base analysis of the video ad:\n\n${JSON.stringify(baseAnalysis, null, 2)}\n\nTranscript: "${transcript || '(no transcript available)'}"\n\nNow provide the ad-specific analysis with hook technique, CTA style, emotional triggers, ad structure timeline, target audience, platform optimizations, and a clone recipe.`;

    const adCompletion = await openai.chat.completions.parse({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: adSystemPrompt },
        { role: 'user', content: adUserContent },
      ],
      response_format: zodResponseFormat(AdCloneSchema, 'ad_clone_analysis'),
    });

    const adAnalysis = adCompletion.choices[0].message.parsed;

    return res.json({
      success: true,
      base_analysis: baseAnalysis,
      ad_analysis: adAnalysis,
      frames: frameUrls,
      transcript,
      transcript_chunks: chunks,
      frames_extracted: frameUrls.length,
      brand_kit: brandKit ? { id: brandKit.id, brand_name: brandKit.brand_name } : null,
      metadata: videoMetadata,
      resolve_warning: resolveWarning,
    });

  } catch (err) {
    console.error('[analyze/clone-ad]', err);
    return res.status(500).json({ error: err.message });
  }
}
