/**
 * POST /api/workbench/:action
 *
 * Thin wrappers around existing pipeline functions.
 * Each action is a single step the workbench UI calls independently.
 *
 * Actions:
 *   voiceover  — Generate TTS audio
 *   timing     — Run Whisper + block aligner
 *   music      — Generate background music
 *   generate-frame — Generate a single image (T2I or I2I)
 *   generate-clip  — Generate a single video clip (FLF or I2V)
 *   assemble   — Stitch clips + voiceover + music + captions
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { generateGeminiVoiceover } from '../lib/voiceoverGenerator.js';
import { getWordTimestamps } from '../lib/getWordTimestamps.js';
import { alignBlocks } from '../lib/blockAligner.js';
import { generateImageV2, animateImageV2 } from '../lib/mediaGenerator.js';
import { VIDEO_MODELS, veoDuration } from '../lib/modelRegistry.js';
import {
  generateMusic as genMusic, assembleShort, buildMusicPrompt,
  uploadUrlToSupabase, pollFalQueue, extractLastFrame, analyzeFrameContinuity,
} from '../lib/pipelineHelpers.js';
import { getFramework } from '../lib/videoStyleFrameworks.js';
import { burnCaptions } from '../lib/captionBurner.js';
import { solveDurations } from '../lib/durationSolver.js';
import { composeVideoPrompt } from '../lib/visualPromptComposer.js';
import { logCost } from '../lib/costLogger.js';
import OpenAI from 'openai';

const FLF_MODELS = ['fal_veo3', 'fal_kling_v3', 'fal_kling_o3'];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const action = req.url.split('/').pop().split('?')[0];
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const keys = await getUserKeys(req.user.id, req.user.email);

  try {
    switch (action) {

      // ─── Voiceover ────────────────────────────────────────────────
      case 'voiceover': {
        const { text, voice = 'Perseus', style_instructions, speed = 1.0 } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'text required' });

        const audioUrl = await generateGeminiVoiceover(text, keys, supabase, {
          voice,
          model: 'gemini-2.5-flash-tts',
          styleInstructions: style_instructions || 'Speak in a warm, conversational tone.',
        });

        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_voiceover', model: 'gemini-2.5-flash-tts', metadata: { character_count: text.length } });

        return res.json({ audio_url: audioUrl, speed });
      }

      // ─── Timing (Whisper + Block Aligner) ─────────────────────────
      case 'timing': {
        const { audio_url, video_model = 'fal_veo3', framework_id, video_length_preset = 60, voice_speed = 1.0 } = req.body;
        if (!audio_url) return res.status(400).json({ error: 'audio_url required' });

        // Whisper — timestamps are at 1x speed
        const { words, totalDuration: rawDuration } = await getWordTimestamps(audio_url, keys.falKey);

        // Adjust for playback speed: at 1.25x a 90s clip plays in 72s
        const effectiveDuration = rawDuration / voice_speed;
        const effectiveWords = words.map(w => ({
          ...w,
          start: w.start / voice_speed,
          end: w.end / voice_speed,
        }));

        // Framework scene hints
        const framework = framework_id ? getFramework(framework_id) : null;
        const frameworkScenes = framework?.sceneStructure?.[video_length_preset]
          || framework?.sceneStructure?.[framework?.supportedDurations?.[0]]
          || null;

        // Align using speed-adjusted timestamps
        let blocks;
        if (effectiveWords.length > 0) {
          const alignment = alignBlocks(effectiveWords, effectiveDuration, video_model, frameworkScenes);
          blocks = alignment.blocks;
        } else {
          // Fallback: framework durations
          const ranges = frameworkScenes?.map(s => s.durationRange) || [[4, 8]];
          const durations = solveDurations(Math.round(effectiveDuration), ranges, video_model);
          blocks = durations.map((dur, i) => ({
            clipDuration: dur,
            startTime: durations.slice(0, i).reduce((a, b) => a + b, 0),
            endTime: durations.slice(0, i + 1).reduce((a, b) => a + b, 0),
            narration: '',
            frameworkLabel: frameworkScenes?.[i]?.label || null,
            frameworkBeat: frameworkScenes?.[i]?.beat || null,
          }));
        }

        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_whisper', model: 'whisper-v3', metadata: { word_count: words.length } });

        return res.json({ blocks, tts_duration: effectiveDuration, raw_tts_duration: rawDuration, voice_speed, word_count: words.length });
      }

      // ─── Music ────────────────────────────────────────────────────
      case 'music': {
        const { framework_id, niche, duration = 65 } = req.body;
        const framework = framework_id ? getFramework(framework_id) : null;
        const prompt = buildMusicPrompt(framework?.music || framework?.musicMood || 'cinematic background', framework?.category);
        const audioUrl = await genMusic(prompt, duration, keys, supabase, 'beatoven');
        if (!audioUrl) return res.status(500).json({ error: 'Music generation failed' });
        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_music', model: 'beatoven', metadata: { track_count: 1 } });
        return res.json({ audio_url: audioUrl });
      }

      // ─── Generate Frame ───────────────────────────────────────────
      case 'generate-frame': {
        const {
          prompt, narration, visual_style, visual_style_prompt, video_style,
          image_model = 'fal_nano_banana', aspect_ratio = '9:16',
          reference_image_url, scene_index, frame_type, vision_context,
        } = req.body;

        if (!prompt && !narration) return res.status(400).json({ error: 'prompt or narration required' });

        let imageUrl;
        const effectivePrompt = prompt || narration;

        // Build final prompt with visual style
        let finalPrompt = effectivePrompt;
        if (visual_style_prompt) finalPrompt += `, ${visual_style_prompt}`;
        if (vision_context && reference_image_url) {
          finalPrompt = `Continuing from: ${vision_context.slice(0, 200)}. ${finalPrompt}`;
        }

        if (reference_image_url && frame_type === 'end') {
          // I2I: Generate end frame from start frame (for FLF mode)
          // Use nano-banana-2/edit for image-to-image
          const i2iRes = await fetch('https://fal.run/fal-ai/nano-banana-2/edit', {
            method: 'POST',
            headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_urls: [reference_image_url],
              prompt: finalPrompt,
              aspect_ratio: aspect_ratio,
              resolution: '1K',
              num_images: 1,
            }),
          });
          if (!i2iRes.ok) throw new Error(`I2I failed: ${await i2iRes.text()}`);
          const i2iData = await i2iRes.json();
          imageUrl = i2iData.images?.[0]?.url;
          if (!imageUrl) throw new Error('No image from I2I');
          imageUrl = await uploadUrlToSupabase(imageUrl, supabase, 'pipeline/workbench');
        } else if (reference_image_url && frame_type === 'start' && scene_index > 0) {
          // FLF chain: start frame = previous scene's end frame (just pass through)
          imageUrl = reference_image_url;
        } else {
          // T2I: Fresh image generation
          imageUrl = await generateImageV2(image_model, finalPrompt, aspect_ratio, keys, supabase, {
            originalAspectRatio: aspect_ratio,
          });
        }

        // Vision analysis (for continuity chain)
        let visionAnalysis = null;
        if (frame_type === 'end' || frame_type === 'single') {
          try {
            const openai = new OpenAI({ apiKey: keys.openaiKey });
            visionAnalysis = await analyzeFrameContinuity(imageUrl, openai);
          } catch (err) {
            console.warn(`[workbench] Vision analysis failed: ${err.message}`);
          }
        }

        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_frame', model: image_model, metadata: { image_count: 1 } });

        return res.json({ image_url: imageUrl, vision_analysis: visionAnalysis });
      }

      // ─── Generate Clip ────────────────────────────────────────────
      case 'generate-clip': {
        const {
          mode, video_model = 'fal_veo3', start_frame_url, end_frame_url,
          motion_prompt = 'Smooth cinematic movement', video_style,
          duration = 6, aspect_ratio = '9:16', scene_index,
        } = req.body;

        if (!start_frame_url) return res.status(400).json({ error: 'start_frame_url required' });

        let videoUrl;
        let actualDuration = null;
        let lastFrameUrl = null;
        let visionAnalysis = null;

        const fullPrompt = composeVideoPrompt('', motion_prompt, { videoStyle: video_style, isFLF: mode === 'flf' });

        if (mode === 'flf') {
          // First-Last-Frame video generation
          if (!end_frame_url) return res.status(400).json({ error: 'end_frame_url required for FLF mode' });

          const isVeo = video_model === 'fal_veo3';
          const veoDur = (d) => d <= 4 ? '4s' : d <= 6 ? '6s' : '8s';
          const klingDur = (d) => String(Math.max(3, Math.min(15, Math.round(d))));

          let endpoint, body;
          if (isVeo) {
            endpoint = 'fal-ai/veo3.1/fast/first-last-frame-to-video';
            body = {
              prompt: fullPrompt,
              first_frame_url: start_frame_url,
              last_frame_url: end_frame_url,
              aspect_ratio: aspect_ratio,
              duration: veoDur(duration),
              resolution: '720p',
              generate_audio: false,
              safety_tolerance: '6',
              auto_fix: true,
            };
          } else {
            const model = VIDEO_MODELS?.[video_model];
            endpoint = model?.endpoint || 'fal-ai/kling-video/o3/pro/image-to-video';
            const isV3 = video_model === 'fal_kling_v3';
            body = {
              prompt: fullPrompt,
              ...(isV3 ? { start_image_url: start_frame_url } : { image_url: start_frame_url }),
              end_image_url: end_frame_url,
              aspect_ratio: aspect_ratio,
              duration: klingDur(duration),
              generate_audio: false,
            };
          }

          const submitRes = await fetch(`https://queue.fal.run/${endpoint}`, {
            method: 'POST',
            headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!submitRes.ok) throw new Error(`FLF submit failed: ${await submitRes.text()}`);
          const queueData = await submitRes.json();
          const result = await pollFalQueue(queueData.response_url || queueData.request_id, endpoint, keys.falKey, 150, 4000);
          videoUrl = result?.video?.url;
          if (!videoUrl) throw new Error('No video URL from FLF');
          videoUrl = await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/workbench');

        } else {
          // I2V mode
          videoUrl = await animateImageV2(video_model, start_frame_url, fullPrompt, aspect_ratio, duration, keys, supabase, {
            generate_audio: false,
          });

          // Extract last frame for chaining
          try {
            lastFrameUrl = await extractLastFrame(videoUrl, duration, keys.falKey);
            if (lastFrameUrl) {
              lastFrameUrl = await uploadUrlToSupabase(lastFrameUrl, supabase, 'pipeline/workbench');
              // Vision analyze for next scene's prompt
              const openai = new OpenAI({ apiKey: keys.openaiKey });
              visionAnalysis = await analyzeFrameContinuity(lastFrameUrl, openai);
            }
          } catch (err) {
            console.warn(`[workbench] Last frame extraction failed: ${err.message}`);
          }
        }

        // TODO: Probe actual video duration via ffprobe-equivalent
        // For now, trust the model's output duration (this is Bug 7 from audit — fix later)
        actualDuration = duration;

        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_clip', model: video_model, metadata: { video_count: 1 } });

        return res.json({
          video_url: videoUrl,
          actual_duration: actualDuration,
          last_frame_url: lastFrameUrl,
          vision_analysis: visionAnalysis,
        });
      }

      // ─── Assemble ─────────────────────────────────────────────────
      case 'assemble': {
        const {
          clips, voiceover_url, music_url, music_volume = 0.15,
          tts_duration, voice_speed = 1.0, caption_config,
        } = req.body;

        if (!clips?.length) return res.status(400).json({ error: 'clips required' });
        if (!voiceover_url) return res.status(400).json({ error: 'voiceover_url required' });

        const videoUrls = clips.map(c => c.url);
        const clipDurations = clips.map(c => c.duration);

        // If voice is sped up/down, the effective TTS duration changes.
        // We need to time-stretch the voiceover audio before assembly.
        // For now, pass the effective duration to assembleShort.
        const effectiveTtsDuration = tts_duration ? tts_duration / voice_speed : null;

        // Assemble with audio stripping on video tracks (Bug 3 fix)
        const assembledUrl = await assembleShort(
          videoUrls, voiceover_url, music_url,
          keys.falKey, supabase,
          clipDurations, music_volume,
          effectiveTtsDuration,
        );

        // Burn captions
        let finalUrl = assembledUrl;
        if (caption_config) {
          try {
            finalUrl = await burnCaptions(assembledUrl, caption_config, keys.falKey, supabase);
          } catch (err) {
            console.warn(`[workbench] Caption burn failed, using uncaptioned: ${err.message}`);
          }
        }

        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_assemble', model: 'ffmpeg-compose', metadata: { clip_count: clips.length } });

        return res.json({ video_url: finalUrl, uncaptioned_url: assembledUrl });
      }

      default:
        return res.status(404).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`[workbench/${action}] Error:`, err);
    return res.status(500).json({ error: err.message || 'Workbench action failed' });
  }
}
