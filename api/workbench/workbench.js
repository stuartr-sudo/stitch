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
 *   assemble       — Stitch clips + voiceover + music + captions
 *   review-quality — Visual QA: extract frames, compare to narration via GPT vision
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { generateGeminiVoiceover } from '../lib/voiceoverGenerator.js';
import { getWordTimestamps } from '../lib/getWordTimestamps.js';
import { alignBlocks } from '../lib/blockAligner.js';
import { generateImageV2, animateImageV2, animateMultiShot } from '../lib/mediaGenerator.js';
import { VIDEO_MODELS, veoDuration, isMultiShotCapable, isR2VCapable, getR2VEndpoint } from '../lib/modelRegistry.js';
import {
  generateMusic as genMusic, assembleShort, buildMusicPrompt,
  uploadUrlToSupabase, pollFalQueue, extractLastFrame, analyzeFrameContinuity,
  buildSfxPrompt, generateSoundEffect,
} from '../lib/pipelineHelpers.js';
import { getFramework } from '../lib/videoStyleFrameworks.js';
import { SHORTS_TEMPLATES } from '../lib/shortsTemplates.js';
import { burnCaptions } from '../lib/captionBurner.js';
import { solveDurations } from '../lib/durationSolver.js';
import { composeVideoPrompt } from '../lib/visualPromptComposer.js';
import { logCost } from '../lib/costLogger.js';
import OpenAI from 'openai';
import { loopVideo, composeSplitScreen } from '../lib/splitScreenCompositor.js';
import { recommendLipsyncModel, applyLipsync } from '../lib/storyboardLipsync.js';
import { reviewSceneAlignment } from '../lib/qualityReviewer.js';

const FLF_MODELS = ['fal_veo3', 'fal_kling_v3', 'fal_kling_o3'];

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const action = req.url.split('/').pop().split('?')[0];
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const keys = await getUserKeys(req.user.id, req.user.email);

  try {
    switch (action) {

      // ─── Voiceover ────────────────────────────────────────────────
      case 'voiceover': {
        const {
          text, voice = 'Perseus', style_instructions, speed = 1.0,
          provider = 'gemini', // 'gemini' | 'elevenlabs' | 'maya' | 'minimax'
          voice_description, // Maya: text description of the voice
          voice_id, // MiniMax: voice_id (preset or cloned)
          pitch = 0, // MiniMax: pitch adjustment
        } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'text required' });

        let audioUrl;
        let ttsDuration = null; // Actual voiceover duration in seconds

        if (provider === 'maya') {
          // Maya1 TTS — voice described in text, supports inline emotion tags
          const { generateMayaVoiceover } = await import('../lib/voiceoverGenerator.js');
          const result = await generateMayaVoiceover(text, keys, supabase, {
            voiceDescription: voice_description || style_instructions || 'A 30-year-old narrator with warm, conversational tone, medium pace, natural delivery',
            temperature: 0.4,
          });
          audioUrl = result.url;
          ttsDuration = result.duration;
          logCost({ username: req.user.email, category: 'fal', operation: 'workbench_voiceover', model: 'maya1', metadata: { character_count: text.length } });

        } else if (provider === 'minimax') {
          // MiniMax Speech 2.8 HD — supports pause tags <#1.5#>, interjections, voice modification
          const { generateMinimaxVoiceover } = await import('../lib/voiceoverGenerator.js');
          const result = await generateMinimaxVoiceover(text, keys, supabase, {
            voiceId: voice_id || voice || 'Wise_Woman',
            speed: speed || 1,
            pitch: pitch || 0,
            volume: 1,
          });
          audioUrl = result.url;
          ttsDuration = result.duration;
          logCost({ username: req.user.email, category: 'fal', operation: 'workbench_voiceover', model: 'minimax-speech-2.8-hd', metadata: { character_count: text.length } });

        } else if (provider === 'elevenlabs') {
          // ElevenLabs via FAL proxy — doesn't return duration directly
          audioUrl = await generateVoiceover(text, keys, supabase, { voiceId: voice });
          // Estimate duration from word count
          ttsDuration = Math.round(text.split(/\s+/).length / 2.5);
          logCost({ username: req.user.email, category: 'fal', operation: 'workbench_voiceover', model: 'elevenlabs-v3', metadata: { character_count: text.length } });

        } else {
          // Gemini TTS (default) — doesn't return duration directly
          let baseStyle = style_instructions || 'Speak in a warm, conversational tone.';
          let pacingPrefix = '';
          if (speed >= 1.3) pacingPrefix = 'Speak at a brisk, fast pace with high energy. Keep sentences flowing quickly with minimal pauses between phrases. ';
          else if (speed >= 1.15) pacingPrefix = 'Speak at an uptempo, lively pace. Keep momentum between sentences with short pauses. ';
          else if (speed >= 1.05) pacingPrefix = 'Speak at a slightly quick, engaging pace. ';
          const finalStyle = pacingPrefix + baseStyle;

          audioUrl = await generateGeminiVoiceover(text, keys, supabase, {
            voice,
            model: 'gemini-2.5-flash-tts',
            styleInstructions: finalStyle,
          });
          // Estimate duration from word count adjusted for speed
          ttsDuration = Math.round((text.split(/\s+/).length / 2.5) / (speed || 1));
          logCost({ username: req.user.email, category: 'fal', operation: 'workbench_voiceover', model: 'gemini-2.5-flash-tts', metadata: { character_count: text.length } });
        }

        return res.json({ audio_url: audioUrl, speed, provider, tts_duration: ttsDuration });
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
        const { framework_id, niche, duration = 65, music_model = 'elevenlabs', music_mood } = req.body;
        const framework = framework_id ? getFramework(framework_id) : null;
        // Priority: explicit music_mood from production engine → framework → niche template → fallback
        const nicheMood = niche && SHORTS_TEMPLATES[niche] ? SHORTS_TEMPLATES[niche].music_mood : null;
        const prompt = music_mood
          ? buildMusicPrompt(music_mood)
          : buildMusicPrompt(framework?.music || framework?.musicMood || nicheMood || 'cinematic background', framework?.category);
        const validModels = ['elevenlabs', 'minimax', 'fal_lyria2', 'suno'];
        const selectedModel = validModels.includes(music_model) ? music_model : 'elevenlabs';
        const audioUrl = await genMusic(prompt, duration, keys, supabase, selectedModel);
        if (!audioUrl) return res.status(500).json({ error: 'Music generation failed' });
        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_music', model: selectedModel, metadata: { track_count: 1 } });
        return res.json({ audio_url: audioUrl });
      }

      // ─── Voice Clone (MiniMax) ─────────────────────────────────────
      case 'voice-clone': {
        const { audio_url, preview_text } = req.body;
        if (!audio_url) return res.status(400).json({ error: 'audio_url required (min 10 seconds)' });
        const { cloneVoiceMinimax } = await import('../lib/voiceoverGenerator.js');
        const result = await cloneVoiceMinimax(audio_url, keys.falKey, preview_text || null);
        logCost({ username: req.user.email, category: 'fal', operation: 'voice_clone', model: 'minimax-voice-clone' });
        return res.json({ voice_id: result.voiceId, preview_url: result.previewUrl });
      }

      // ─── Voice Design (MiniMax) ───────────────────────────────────
      case 'voice-design': {
        const { description, preview_text } = req.body;
        if (!description) return res.status(400).json({ error: 'description required' });
        const { designVoiceMinimax } = await import('../lib/voiceoverGenerator.js');
        const result = await designVoiceMinimax(description, keys.falKey, preview_text || 'Hello, this is a preview of your designed voice. How does it sound?');
        logCost({ username: req.user.email, category: 'fal', operation: 'voice_design', model: 'minimax-voice-design' });
        return res.json({ voice_id: result.voiceId, preview_url: result.previewUrl });
      }

      // ─── Sound Effects ─────────────────────────────────────────────
      case 'sfx': {
        const { niche, duration = 65, prompt: customPrompt } = req.body;
        const prompt = customPrompt || buildSfxPrompt(niche);
        try {
          const sfxUrl = await generateSoundEffect(prompt, duration, keys.falKey, supabase);
          return res.json({ sfx_url: sfxUrl });
        } catch (err) {
          console.warn('[workbench/sfx] SFX generation failed (non-blocking):', err.message);
          return res.json({ sfx_url: null });
        }
      }

      // ─── Generate Frame ───────────────────────────────────────────
      case 'generate-frame': {
        const {
          prompt, narration, visual_style, visual_style_prompt, video_style,
          image_model = 'fal_nano_banana', aspect_ratio = '9:16',
          reference_image_url, scene_index, frame_type, vision_context, niche,
          characters = [],
        } = req.body;

        if (!prompt && !narration) return res.status(400).json({ error: 'prompt or narration required' });

        let imageUrl;
        const effectivePrompt = prompt || narration;

        // Get niche visual mood for atmosphere/tone guidance
        const nicheTemplate = niche && SHORTS_TEMPLATES[niche] ? SHORTS_TEMPLATES[niche] : null;
        const nicheMood = nicheTemplate?.visual_mood || null;

        // Build character description prefix from assigned characters
        const charDescriptions = characters
          .filter(c => c.description)
          .map(c => `CHARACTER "${c.name}": ${c.description}`)
          .join('\n');

        // Synthesize a proper visual description via LLM (not raw concatenation)
        const openai = new OpenAI({ apiKey: keys.openaiKey });
        const sections = [];
        if (charDescriptions) sections.push(`CHARACTERS IN THIS SCENE (must appear as described):\n${charDescriptions}`);
        if (nicheMood) sections.push(`ATMOSPHERE & MOOD (CRITICAL — this defines the overall tone): ${nicheMood}`);
        sections.push(`NARRATION/SCENE CONTEXT: ${effectivePrompt}`);
        if (visual_style_prompt) sections.push(`VISUAL STYLE: ${visual_style_prompt}`);
        if (video_style) sections.push(`VIDEO/MOTION STYLE: ${video_style}`);
        if (vision_context) sections.push(`CONTINUITY FROM PREVIOUS SCENE: ${vision_context.slice(0, 300)}`);
        if (frame_type === 'end') sections.push(`FRAME TYPE: End frame — show the conclusion/result of the action described.`);
        else if (frame_type === 'start') sections.push(`FRAME TYPE: Start frame — show the beginning/setup of the action described.`);

        // LLM MUST synthesize the prompt — never concatenate raw inputs
        let finalPrompt;
        const llmMessages = [
          { role: 'system', content: `You are a visual prompt engineer for AI image generation. Synthesize ALL inputs into a single vivid image generation prompt (2-4 sentences).

PRIORITY ORDER:
1. ATMOSPHERE & MOOD — this is the VISUAL UNDERTONE. It defines color palette, lighting, and emotional tone. Every image must feel like it belongs in this genre.
2. NARRATION — extract ONLY the visual elements implied by the story (setting, characters, objects, environment).
3. VISUAL STYLE — artistic rendering approach.
4. CONTINUITY — match previous scene's look if provided.

Rules:
- Describe ONLY what should be VISIBLE — people, objects, environment, lighting, composition, colors, mood.
- The mood/atmosphere must permeate every visual choice (lighting, color grading, composition).
- Never include narration text, dialogue, or abstract concepts.
- Output the prompt only, no explanation.` },
          { role: 'user', content: sections.join('\n\n') },
        ];

        try {
          const llmRes = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: llmMessages,
            max_tokens: 300,
          });
          finalPrompt = (llmRes.choices[0]?.message?.content || '').trim();
          console.log(`[workbench/generate-frame] LLM prompt (${finalPrompt.length} chars): ${finalPrompt.slice(0, 200)}...`);
        } catch (err) {
          console.warn(`[workbench/generate-frame] LLM prompt synthesis failed, retrying with smaller model: ${err.message}`);
          // Retry with gpt-4.1-nano — still LLM synthesis, never concatenation
          try {
            const retryRes = await openai.chat.completions.create({ model: 'gpt-4.1-nano', messages: llmMessages, max_tokens: 200 });
            finalPrompt = (retryRes.choices[0]?.message?.content || '').trim();
          } catch (retryErr) {
            console.error(`[workbench/generate-frame] Both LLM calls failed, using narration only: ${retryErr.message}`);
            // Last resort: use narration as-is (no concatenation)
            finalPrompt = effectivePrompt;
          }
        }

        if (reference_image_url && frame_type === 'start' && scene_index > 0 && !req.body.use_as_i2i) {
          // FLF chain: start frame = previous scene's end frame (just pass through)
          imageUrl = reference_image_url;
        } else if (reference_image_url) {
          // I2I: Generate from reference image (user-provided, prev scene frame, or FLF end frame)
          // Use nano-banana-2/edit for image-to-image composition with LLM-synthesized prompt
          console.log(`[workbench/generate-frame] I2I mode: ref=${reference_image_url.slice(-40)}, prompt=${finalPrompt.slice(0, 100)}...`);
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
            visionAnalysis = await analyzeFrameContinuity(imageUrl, openai, character_references || null);
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
          motion_prompt = 'Smooth cinematic movement', camera_config, video_style,
          duration = 6, aspect_ratio = '9:16', scene_index,
          character_references,
        } = req.body;

        if (!start_frame_url) return res.status(400).json({ error: 'start_frame_url required' });

        let videoUrl;
        let actualDuration = null;
        let lastFrameUrl = null;
        let visionAnalysis = null;

        const fullPrompt = composeVideoPrompt('', motion_prompt, { videoStyle: video_style, isFLF: mode === 'flf', cameraConfig: camera_config });

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

        } else if (mode === 'mt') {
          // Motion Transfer mode
          const { motion_ref } = req.body;
          if (!motion_ref?.video_url && !motion_ref?.trimmed_url) {
            return res.status(400).json({ error: 'motion_ref with video_url or trimmed_url required for MT mode' });
          }

          const { generateMotionTransfer } = await import('../lib/motionTransferRegistry.js');
          const motionVideoUrl = motion_ref.trimmed_url || motion_ref.video_url;

          const result = await generateMotionTransfer(
            motion_ref.model || 'kling_motion_control',
            start_frame_url,
            motionVideoUrl,
            {
              character_orientation: motion_ref.character_orientation || 'image',
              prompt: motion_ref.prompt || fullPrompt,
              keep_original_sound: false, // Shorts: always false — has its own voiceover + music
              elements: motion_ref.elements,
            },
            keys.falKey,
            supabase,
          );

          videoUrl = result.videoUrl;

          // Extract last frame for chaining (same as I2V)
          try {
            lastFrameUrl = await extractLastFrame(videoUrl, duration, keys.falKey);
            if (lastFrameUrl) {
              lastFrameUrl = await uploadUrlToSupabase(lastFrameUrl, supabase, 'pipeline/workbench');
              // Vision analysis for next-scene prompt continuity
              const openai = new OpenAI({ apiKey: keys.openaiKey });
              visionAnalysis = await analyzeFrameContinuity(lastFrameUrl, openai, character_references || null);
            }
          } catch (err) {
            console.warn(`[workbench] MT last frame extraction failed: ${err.message}`);
          }
        } else if (mode === 'r2v' && isR2VCapable(video_model)) {
          // R2V mode — use model's reference-to-video endpoint
          const r2vEndpoint = getR2VEndpoint(video_model);
          const model = VIDEO_MODELS[video_model];
          const { image_references = [] } = req.body;

          // Build the R2V body using the model's standard buildBody as a base, then override endpoint
          const r2vBody = {
            prompt: fullPrompt,
            ...(image_references.length > 0 && { image_references }),
            ...(start_frame_url && { image_url: start_frame_url }),
            aspect_ratio,
            generate_audio: false,
          };

          // Model-specific adjustments
          if (video_model.includes('pixverse')) {
            // PixVerse C1 uses generate_audio_switch, not generate_audio
            delete r2vBody.generate_audio;
            r2vBody.generate_audio_switch = false;
            r2vBody.duration = Math.max(1, Math.min(15, Math.round(Number(duration) || 5)));
          } else if (video_model.includes('kling')) {
            r2vBody.duration = String(Math.max(3, Math.min(15, Math.round(Number(duration) || 5))));
          } else if (video_model.includes('veo')) {
            r2vBody.duration = veoDuration(duration);
            r2vBody.resolution = '720p';
            r2vBody.safety_tolerance = '6';
            r2vBody.auto_fix = true;
          } else if (video_model.includes('grok')) {
            r2vBody.duration = Math.max(1, Math.min(15, Number(duration) || 6));
            r2vBody.resolution = '720p';
          }

          const submitRes = await fetch(`https://queue.fal.run/${r2vEndpoint}`, {
            method: 'POST',
            headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(r2vBody),
          });
          if (!submitRes.ok) throw new Error(`R2V submit failed: ${await submitRes.text()}`);
          const queueData = await submitRes.json();
          const result = await pollFalQueue(queueData.response_url || queueData.request_id, r2vEndpoint, keys.falKey, 150, 4000);
          videoUrl = model.parseResult(result);
          if (!videoUrl) throw new Error('No video URL from R2V generation');
          videoUrl = await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/workbench');

          // Extract last frame + vision analysis for chaining
          try {
            lastFrameUrl = await extractLastFrame(videoUrl, duration, keys.falKey);
            if (lastFrameUrl) {
              lastFrameUrl = await uploadUrlToSupabase(lastFrameUrl, supabase, 'pipeline/workbench');
              const openai = new OpenAI({ apiKey: keys.openaiKey });
              visionAnalysis = await analyzeFrameContinuity(lastFrameUrl, openai, character_references || null);
            }
          } catch (err) {
            console.warn(`[workbench] R2V last frame extraction failed: ${err.message}`);
          }

        } else {
          // I2V mode (also fallback if R2V requested but model doesn't support it)
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
              visionAnalysis = await analyzeFrameContinuity(lastFrameUrl, openai, character_references || null);
            }
          } catch (err) {
            console.warn(`[workbench] Last frame extraction failed: ${err.message}`);
          }
        }

        // Return post-quantization duration based on model's duration function
        // (e.g., Veo quantizes 5s→6s, Kling v2 quantizes 4s→5s)
        const model = VIDEO_MODELS[video_model];
        if (model) {
          // Compute what the model actually received as duration
          const m = video_model.toLowerCase();
          if (m.includes('veo3') || m === 'fal_veo3_lite') {
            actualDuration = parseInt(veoDuration(duration));
          } else if (m.includes('kling_v3') || m.includes('kling_o3') || m === 'fal_kling_v3' || m === 'fal_kling_o3') {
            actualDuration = Math.max(3, Math.min(15, Math.round(Number(duration) || 5)));
          } else if (m.includes('kling') || m === 'fal_kling') {
            actualDuration = Number(duration) <= 7 ? 5 : 10;
          } else if (m.includes('pixverse')) {
            actualDuration = Number(duration) <= 6 ? 5 : 8;
          } else if (m.includes('wan') && !m.includes('wan_pro')) {
            actualDuration = Number(duration) <= 7 ? 5 : 10;
          } else if (m.includes('veo2') || m === 'fal_veo2') {
            const n = Number(duration) || 5;
            actualDuration = n <= 5 ? 5 : n <= 6 ? 6 : n <= 7 ? 7 : 8;
          } else {
            actualDuration = duration;
          }
        } else {
          actualDuration = duration;
        }

        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_clip', model: mode === 'mt' ? (req.body.motion_ref?.model || 'kling_motion_control') : video_model, metadata: { video_count: 1, mode } });

        return res.json({
          video_url: videoUrl,
          actual_duration: actualDuration,
          last_frame_url: lastFrameUrl,
          vision_analysis: visionAnalysis,
        });
      }

      // ─── Multi-Shot ────────────────────────────────────────────────
      // Generates all scenes in a single API call using Kling V3/O3 multi_prompt.
      // Returns a single continuous video with model-handled scene transitions.
      case 'generate-multishot': {
        const {
          video_model = 'fal_kling_v3',
          scenes, // [{ motionPrompt, duration, videoStyle }]
          start_frame_url,
          aspect_ratio = '9:16',
          camera_config,
          video_style,
        } = req.body;

        if (!scenes?.length || scenes.length < 2) {
          return res.status(400).json({ error: 'Multi-shot requires at least 2 scenes.' });
        }
        if (scenes.length > 6) {
          return res.status(400).json({ error: 'Multi-shot supports a maximum of 6 scenes.' });
        }
        if (!isMultiShotCapable(video_model)) {
          return res.status(400).json({ error: `Model ${video_model} does not support multi-shot.` });
        }

        // Build multi_prompt array with composed prompts per scene
        const multiPrompt = scenes.map(scene => {
          const composed = composeVideoPrompt('', scene.motionPrompt || 'Smooth cinematic movement', {
            videoStyle: scene.videoStyle || video_style,
            cameraConfig: scene.cameraConfig || camera_config,
          });
          return {
            prompt: composed,
            duration: String(Math.max(1, Math.min(15, Math.round(Number(scene.duration) || 3)))),
          };
        });

        const totalDuration = multiPrompt.reduce((sum, s) => sum + Number(s.duration), 0);
        if (totalDuration > 15) {
          return res.status(400).json({ error: `Total duration (${totalDuration}s) exceeds 15s maximum for multi-shot.` });
        }

        const videoUrl = await animateMultiShot(
          video_model,
          start_frame_url || null,
          multiPrompt,
          totalDuration,
          aspect_ratio,
          keys,
          supabase,
          { generate_audio: false },
        );

        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_multishot', model: video_model, metadata: { scene_count: scenes.length, total_duration: totalDuration } });

        return res.json({ video_url: videoUrl, total_duration: totalDuration, scene_count: scenes.length });
      }

      // ─── Assemble ─────────────────────────────────────────────────
      case 'assemble': {
        const {
          clips, voiceover_url, music_url, music_volume = 0.15,
          tts_duration, voice_speed = 1.0, caption_config,
          sfx_url, sfx_volume = 0.3, sfx_tracks, music_events,
          avatar_mode, avatar_lipsync_url,
        } = req.body;

        if (!clips?.length) return res.status(400).json({ error: 'clips required' });
        // voiceover_url is optional — assembly works without narration (music-only shorts)

        const videoUrls = clips.map(c => c.url);
        const clipDurations = clips.map(c => c.duration);

        // tts_duration from frontend is already the effective duration (raw / speed).
        // Don't divide by voice_speed again — that was causing a double-division bug.
        const effectiveTtsDuration = tts_duration || null;

        // Assemble B-roll with voiceover + music (same as before)
        const assembledUrl = await assembleShort(
          videoUrls, voiceover_url, music_url,
          keys.falKey, supabase,
          clipDurations, music_volume,
          effectiveTtsDuration,
          sfx_url, sfx_volume,
          sfx_tracks || null,
          music_events || null,
        );

        let finalUrl = assembledUrl;

        // Split-screen composite if avatar mode is active
        if (avatar_mode && avatar_lipsync_url) {
          try {
            const compositeDuration = effectiveTtsDuration
              || clipDurations.reduce((sum, d) => sum + d, 0);

            const { videoUrl: compositeUrl } = await composeSplitScreen({
              brollVideoUrl: assembledUrl,
              avatarVideoUrl: avatar_lipsync_url,
              duration: compositeDuration,
              falKey: keys.falKey,
              supabase,
            });

            finalUrl = compositeUrl;
            logCost({ username: req.user.email, category: 'fal', operation: 'avatar_split_screen', model: 'ffmpeg-compose', metadata: { duration: compositeDuration } });
          } catch (err) {
            console.error(`[workbench] Split-screen composite failed, using B-roll only: ${err.message}`);
            // finalUrl remains as assembledUrl (B-roll only) — user still gets a video
          }
        }

        // Burn captions
        const uncaptionedUrl = finalUrl;
        if (caption_config) {
          try {
            finalUrl = await burnCaptions(finalUrl, caption_config, keys.falKey, supabase);
          } catch (err) {
            console.warn(`[workbench] Caption burn failed, using uncaptioned: ${err.message}`);
          }
        }

        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_assemble', model: 'ffmpeg-compose', metadata: { clip_count: clips.length, avatar_mode: !!avatar_mode } });

        return res.json({ video_url: finalUrl, uncaptioned_url: uncaptionedUrl });
      }

      // ─── Quality Review Gate ─────────────────────────────────────
      case 'review-quality': {
        const { clips, scenes } = req.body;
        if (!clips?.length) return res.status(400).json({ error: 'clips array required' });
        if (!scenes?.length) return res.status(400).json({ error: 'scenes array required' });
        if (clips.length !== scenes.length) {
          return res.status(400).json({ error: `clips (${clips.length}) and scenes (${scenes.length}) must have matching lengths` });
        }

        const result = await reviewSceneAlignment({
          clips,
          scenes,
          falKey: keys.falKey,
          openaiKey: keys.openaiKey,
        });

        const sceneCount = clips.length;
        logCost({ username: req.user.email, category: 'openai', operation: 'quality_review', model: 'gpt-4.1-mini', metadata: { scene_count: sceneCount } });

        return res.json(result);
      }

      // ─── Avatar: Generate Portrait ────────────────────────────────
      case 'generate-avatar-portrait': {
        const { visual_subject_id } = req.body;
        if (!visual_subject_id) return res.status(400).json({ error: 'visual_subject_id required' });

        // Load Visual Subject (verify ownership)
        const { data: subject, error: subjectErr } = await supabase
          .from('visual_subjects')
          .select('id, name, lora_url, lora_trigger_word, reference_image_url')
          .eq('id', visual_subject_id)
          .eq('user_id', req.user.id)
          .single();
        if (subjectErr || !subject) return res.status(404).json({ error: 'Visual Subject not found' });
        if (!subject.lora_url) return res.status(400).json({ error: 'Visual Subject has no trained LoRA' });

        // Build presenter portrait prompt
        const triggerWord = subject.lora_trigger_word || 'person';
        const prompt = `${triggerWord} person speaking to camera, shoulders up, direct eye contact, neutral solid background, portrait photography, soft studio lighting`;

        // Generate portrait with LoRA
        const portraitUrl = await generateImageV2(
          'fal_nano_banana',
          prompt,
          'landscape_4_3', // 4:3 landscape — closest standard ratio to 1080×768 (1.4:1) target
          keys,
          supabase,
          {
            loras: [{ path: subject.lora_url, scale: 0.85 }],
          },
        );

        logCost({ username: req.user.email, category: 'fal', operation: 'avatar_portrait', model: 'nano-banana-2', metadata: { visual_subject_id } });

        return res.json({ portrait_url: portraitUrl, subject_name: subject.name });
      }

      // ─── Avatar: Animate Portrait ─────────────────────────────────
      case 'animate-avatar': {
        const { portrait_url, duration: targetDuration } = req.body;
        if (!portrait_url) return res.status(400).json({ error: 'portrait_url required' });
        if (!targetDuration) return res.status(400).json({ error: 'duration required (voiceover length in seconds)' });

        // Hardcoded face-animation model — best for talking heads
        const AVATAR_VIDEO_MODEL = 'fal_wan25';
        const AVATAR_MOTION_PROMPT = 'person speaking naturally to camera, subtle head movement, gentle gestures, blinking, conversational body language';

        // Generate at model's max duration (Wan 2.5 supports up to 10s)
        const modelMaxDuration = 10;
        const clipDuration = Math.min(modelMaxDuration, targetDuration);

        const rawClipUrl = await animateImageV2(
          AVATAR_VIDEO_MODEL,
          portrait_url,
          AVATAR_MOTION_PROMPT,
          'landscape_4_3',
          clipDuration,
          keys,
          supabase,
          { generate_audio: false },
        );

        logCost({ username: req.user.email, category: 'fal', operation: 'avatar_animate', model: AVATAR_VIDEO_MODEL, metadata: { clip_duration: clipDuration, target_duration: targetDuration } });

        // Loop the clip to match voiceover duration if needed
        let avatarVideoUrl = rawClipUrl;
        if (targetDuration > clipDuration) {
          avatarVideoUrl = await loopVideo({
            videoUrl: rawClipUrl,
            clipDuration,
            targetDuration,
            falKey: keys.falKey,
            supabase,
          });
          logCost({ username: req.user.email, category: 'fal', operation: 'avatar_loop', model: 'ffmpeg-compose', metadata: { clip_duration: clipDuration, target_duration: targetDuration } });
        }

        return res.json({ avatar_video_url: avatarVideoUrl });
      }

      // ─── Avatar: Lip-sync ─────────────────────────────────────────
      case 'lipsync-avatar': {
        const { avatar_video_url, voiceover_url } = req.body;
        if (!avatar_video_url) return res.status(400).json({ error: 'avatar_video_url required' });
        if (!voiceover_url) return res.status(400).json({ error: 'voiceover_url required' });

        // Recommend best model for realistic close-up talking head
        const model = recommendLipsyncModel({
          contentType: 'realistic',
          isCloseUp: true,
          hasVideoAlready: true,
        });

        const result = await applyLipsync({
          videoUrl: avatar_video_url,
          audioUrl: voiceover_url,
          model,
          falKey: keys.falKey,
          supabase,
        });

        logCost({ username: req.user.email, category: 'fal', operation: 'avatar_lipsync', model, metadata: { processing_time: result.processingTime } });

        return res.json({ lipsync_video_url: result.videoUrl, model_used: result.model });
      }

      // ─── Save Draft ──────────────────────────────────────────────
      case 'save-draft': {
        const { draft_id, state } = req.body;
        if (!state) return res.status(400).json({ error: 'state required' });

        if (draft_id) {
          // Update existing draft
          const { error } = await supabase.from('ad_drafts')
            .update({
              storyboard_json: state,
              generation_status: state.step === 'assemble' && state.finalVideoUrl ? 'complete' : 'in_progress',
              voiceover_url: state.voiceoverUrl || null,
              music_url: state.musicUrl || null,
              final_video_url: state.finalVideoUrl || null,
            })
            .eq('id', draft_id)
            .eq('user_id', req.user.id);
          if (error) throw new Error(`Save failed: ${error.message}`);
          return res.json({ draft_id });
        }

        // Create new campaign + draft
        const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
          user_id: req.user.id,
          name: state.topic || 'Untitled Workbench',
          content_type: 'shorts',
          status: 'workbench',
        }).select('id').single();
        if (campErr) throw new Error(`Campaign create failed: ${campErr.message}`);

        const { data: draft, error: draftErr } = await supabase.from('ad_drafts').insert({
          campaign_id: campaign.id,
          user_id: req.user.id,
          storyboard_json: state,
          generation_status: state.step === 'assemble' && state.finalVideoUrl ? 'complete' : 'in_progress',
          template_type: 'workbench',
          voiceover_url: state.voiceoverUrl || null,
          music_url: state.musicUrl || null,
        }).select('id').single();
        if (draftErr) throw new Error(`Draft create failed: ${draftErr.message}`);

        return res.json({ draft_id: draft.id, campaign_id: campaign.id });
      }

      // ─── Load Draft ──────────────────────────────────────────────
      case 'load-draft': {
        const draftId = req.method === 'GET'
          ? new URL(req.url, 'http://localhost').searchParams.get('id')
          : req.body?.draft_id;
        if (!draftId) return res.status(400).json({ error: 'draft_id required' });

        const { data: draft, error } = await supabase.from('ad_drafts')
          .select('id, storyboard_json, voiceover_url, music_url, final_video_url, created_at, updated_at, campaign_id')
          .eq('id', draftId)
          .eq('user_id', req.user.id)
          .single();
        if (error || !draft) return res.status(404).json({ error: 'Draft not found' });

        return res.json({ draft });
      }

      // ─── List Drafts ─────────────────────────────────────────────
      case 'list-drafts': {
        const { data: drafts, error } = await supabase.from('ad_drafts')
          .select('id, storyboard_json, generation_status, voiceover_url, music_url, final_video_url, created_at, updated_at, campaigns!inner(name)')
          .eq('user_id', req.user.id)
          .eq('template_type', 'workbench')
          .order('updated_at', { ascending: false })
          .limit(20);
        if (error) throw new Error(`List failed: ${error.message}`);

        const items = (drafts || []).map(d => ({
          id: d.id,
          topic: d.campaigns?.name || d.storyboard_json?.topic || 'Untitled',
          niche: d.storyboard_json?.niche,
          step: d.storyboard_json?.step || 0,
          status: d.generation_status,
          has_video: !!d.final_video_url,
          updated_at: d.updated_at,
        }));

        return res.json({ drafts: items });
      }

      // ─── Delete Draft ────────────────────────────────────────────
      case 'delete-draft': {
        const draftId = req.method === 'GET'
          ? new URL(req.url, 'http://localhost').searchParams.get('id')
          : req.body?.draft_id;
        if (!draftId) return res.status(400).json({ error: 'draft_id required' });

        // Get the draft to find its campaign_id
        const { data: draft, error: fetchErr } = await supabase.from('ad_drafts')
          .select('campaign_id')
          .eq('id', draftId)
          .eq('user_id', req.user.id)
          .single();
        if (fetchErr || !draft) return res.status(404).json({ error: 'Draft not found' });

        // Delete the draft
        const { error: deleteErr } = await supabase.from('ad_drafts')
          .delete()
          .eq('id', draftId)
          .eq('user_id', req.user.id);
        if (deleteErr) throw new Error(`Delete failed: ${deleteErr.message}`);

        // If campaign has no other drafts, delete the campaign too
        if (draft.campaign_id) {
          const { count } = await supabase.from('ad_drafts')
            .select('id', { count: 'exact' })
            .eq('campaign_id', draft.campaign_id);
          if (count === 0) {
            await supabase.from('campaigns')
              .delete()
              .eq('id', draft.campaign_id)
              .eq('user_id', req.user.id);
          }
        }

        return res.json({ success: true });
      }

      // ─── Delete Multiple Drafts ──────────────────────────────────
      case 'delete-drafts': {
        const { draft_ids } = req.body;
        if (!draft_ids || !Array.isArray(draft_ids) || draft_ids.length === 0) {
          return res.status(400).json({ error: 'draft_ids array required' });
        }

        // Get all drafts to find their campaign_ids
        const { data: drafts, error: fetchErr } = await supabase.from('ad_drafts')
          .select('id, campaign_id')
          .in('id', draft_ids)
          .eq('user_id', req.user.id);
        if (fetchErr || !drafts || drafts.length === 0) {
          return res.status(404).json({ error: 'No drafts found' });
        }

        // Delete all drafts
        const { error: deleteErr } = await supabase.from('ad_drafts')
          .delete()
          .in('id', draft_ids)
          .eq('user_id', req.user.id);
        if (deleteErr) throw new Error(`Bulk delete failed: ${deleteErr.message}`);

        // Check each campaign and delete if it has no remaining drafts
        const campaignIds = [...new Set(drafts.map(d => d.campaign_id).filter(Boolean))];
        for (const campaignId of campaignIds) {
          const { count } = await supabase.from('ad_drafts')
            .select('id', { count: 'exact' })
            .eq('campaign_id', campaignId);
          if (count === 0) {
            await supabase.from('campaigns')
              .delete()
              .eq('id', campaignId)
              .eq('user_id', req.user.id);
          }
        }

        return res.json({ success: true, deleted_count: draft_ids.length });
      }

      default:
        return res.status(404).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`[workbench/${action}] Error:`, err);
    return res.status(500).json({ error: err.message || 'Workbench action failed' });
  }
}
