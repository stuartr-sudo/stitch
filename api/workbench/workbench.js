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
  buildSfxPrompt, generateSoundEffect,
} from '../lib/pipelineHelpers.js';
import { getFramework } from '../lib/videoStyleFrameworks.js';
import { SHORTS_TEMPLATES } from '../lib/shortsTemplates.js';
import { burnCaptions } from '../lib/captionBurner.js';
import { solveDurations } from '../lib/durationSolver.js';
import { composeVideoPrompt } from '../lib/visualPromptComposer.js';
import { logCost } from '../lib/costLogger.js';
import OpenAI from 'openai';

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
        const { text, voice = 'Perseus', style_instructions, speed = 1.0 } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'text required' });

        // Build pacing directive based on requested speed so TTS generates
        // naturally faster speech instead of relying solely on playback speedup
        let baseStyle = style_instructions || 'Speak in a warm, conversational tone.';
        let pacingPrefix = '';
        if (speed >= 1.3) {
          pacingPrefix = 'Speak at a brisk, fast pace with high energy. Keep sentences flowing quickly with minimal pauses between phrases. ';
        } else if (speed >= 1.15) {
          pacingPrefix = 'Speak at an uptempo, lively pace. Keep momentum between sentences with short pauses. ';
        } else if (speed >= 1.05) {
          pacingPrefix = 'Speak at a slightly quick, engaging pace. ';
        }
        const finalStyle = pacingPrefix + baseStyle;

        const audioUrl = await generateGeminiVoiceover(text, keys, supabase, {
          voice,
          model: 'gemini-2.5-flash-tts',
          styleInstructions: finalStyle,
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
        // Use framework music config first, then fall back to niche-specific music mood
        const nicheMood = niche && SHORTS_TEMPLATES[niche] ? SHORTS_TEMPLATES[niche].music_mood : null;
        const prompt = buildMusicPrompt(framework?.music || framework?.musicMood || nicheMood || 'cinematic background', framework?.category);
        const audioUrl = await genMusic(prompt, duration, keys, supabase, 'elevenlabs');
        if (!audioUrl) return res.status(500).json({ error: 'Music generation failed' });
        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_music', model: 'elevenlabs', metadata: { track_count: 1 } });
        return res.json({ audio_url: audioUrl });
      }

      // ─── Sound Effects ─────────────────────────────────────────────
      case 'sfx': {
        const { niche, duration = 65 } = req.body;
        const prompt = buildSfxPrompt(niche);
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
        } = req.body;

        if (!prompt && !narration) return res.status(400).json({ error: 'prompt or narration required' });

        let imageUrl;
        const effectivePrompt = prompt || narration;

        // Get niche visual mood for atmosphere/tone guidance
        const nicheTemplate = niche && SHORTS_TEMPLATES[niche] ? SHORTS_TEMPLATES[niche] : null;
        const nicheMood = nicheTemplate?.visual_mood || null;

        // Synthesize a proper visual description via LLM (not raw concatenation)
        const openai = new OpenAI({ apiKey: keys.openaiKey });
        const sections = [];
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
          sfx_url, sfx_volume = 0.3,
        } = req.body;

        if (!clips?.length) return res.status(400).json({ error: 'clips required' });
        if (!voiceover_url) return res.status(400).json({ error: 'voiceover_url required' });

        const videoUrls = clips.map(c => c.url);
        const clipDurations = clips.map(c => c.duration);

        // tts_duration from frontend is already the effective duration (raw / speed).
        // Don't divide by voice_speed again — that was causing a double-division bug.
        const effectiveTtsDuration = tts_duration || null;

        // Assemble with audio stripping on video tracks (Bug 3 fix)
        const assembledUrl = await assembleShort(
          videoUrls, voiceover_url, music_url,
          keys.falKey, supabase,
          clipDurations, music_volume,
          effectiveTtsDuration,
          sfx_url, sfx_volume,
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

      default:
        return res.status(404).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`[workbench/${action}] Error:`, err);
    return res.status(500).json({ error: err.message || 'Workbench action failed' });
  }
}
