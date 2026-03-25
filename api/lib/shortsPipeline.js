/**
 * Shorts Pipeline Orchestrator — framework-driven pipeline for Shorts generation
 * within the Storyboard/Campaigns system.
 *
 * Called by campaign-aware routes (not the legacy /api/shorts/generate endpoint).
 *
 * Steps:
 *  1. Load framework & generate script
 *  2. Generate TTS voiceover (Gemini or ElevenLabs, single or per-scene)
 *  3. Measure audio durations
 *  4. Generate images (per scene, with conditional frame chaining)
 *  5. Generate video clips (animate each image, duration matched to audio)
 *  6. Extract frames (first_frame_url + last_frame_url per scene for repair)
 *  7. Generate music (Lyria 2, mood from framework)
 *  8. Assemble video (volume from framework)
 *  9. Burn captions (full captionConfig: object or string)
 * 10. Save draft (all scene assets in step_results)
 */

import OpenAI from 'openai';
import { generateScript } from './scriptGenerator.js';
import { generateVoiceover, generateGeminiVoiceover } from './voiceoverGenerator.js';
import { burnCaptions } from './captionBurner.js';
import { generateImageV2, animateImageV2 } from './mediaGenerator.js';
import {
  generateMusic,
  extractLastFrame,
  extractFirstFrame,
  analyzeFrameContinuity,
  assembleShort,
  pollFalQueue,
  uploadUrlToSupabase,
} from './pipelineHelpers.js';
import { getVisualStyleSuffix, getImageStrategy } from './visualStyles.js';
import { getVideoStylePrompt } from './videoStylePresets.js';
import { getFramework } from './videoStyleFrameworks.js';
import { withRetry } from './retryHelper.js';
import { logCost } from './costLogger.js';

/**
 * Get the actual video duration after model-specific clamping.
 * Each model has different min/max constraints — this mirrors the
 * duration format converters in modelRegistry.js.
 */
function getActualDuration(modelKey, requestedSeconds) {
  const n = Number(requestedSeconds) || 5;
  switch (modelKey) {
    case 'fal_veo3':
    case 'fal_veo2':
      // Veo 3.1 only accepts 4, 6, 8
      if (n <= 4) return 4;
      if (n <= 6) return 6;
      return 8;
    case 'fal_kling':
      return n <= 7 ? 5 : 10; // Kling v2: 5 or 10
    case 'fal_kling_v3':
    case 'fal_kling_o3':
      return Math.max(3, Math.min(15, Math.round(n))); // Kling v3/O3: 3-15
    case 'fal_wan25':
      return n <= 7 ? 5 : 10; // Wan 2.5: 5 or 10
    case 'fal_pixverse':
      return n <= 6 ? 5 : 8; // PixVerse: 5 or 8
    case 'wavespeed_wan':
      return Math.max(5, Math.min(8, Math.round(n))); // Wavespeed: 5-8
    default:
      return Math.min(n, 8); // safe default
  }
}

/**
 * Estimate audio duration from text using word count.
 * Average speaking pace: ~150 words per minute = ~2.5 words per second.
 */
function estimateDurationFromText(text) {
  const wordCount = (text || '').split(/\s+/).filter(Boolean).length;
  return Math.max(2, wordCount / 2.5);
}

/**
 * Run the full framework-driven shorts generation pipeline.
 *
 * @param {object} opts
 * @param {string} opts.niche
 * @param {string} [opts.topic]
 * @param {string} [opts.story_context]
 * @param {string} opts.brand_username
 * @param {string} [opts.visual_style]
 * @param {string} [opts.video_style]
 * @param {string} [opts.video_model]
 * @param {string} [opts.voice_id]
 * @param {string|object} [opts.caption_style]   — preset key string or full config object
 * @param {string|object} [opts.caption_config]  — alias for caption_style (object preferred)
 * @param {number} [opts.words_per_chunk]
 * @param {Array}  [opts.lora_config]
 * @param {object|string|null} [opts.script]      — pre-built script (skips script generation)
 * @param {string} [opts.starting_image]          — URL of image to use for scene 0
 * @param {string} [opts.image_model]             — override image model
 * @param {number} [opts.video_length_preset]     — total duration override in seconds
 * @param {string} [opts.framework]               — framework ID from videoStyleFrameworks.js
 * @param {string} [opts.gemini_voice]            — Gemini TTS voice name (triggers Gemini TTS)
 * @param {string} [opts.gemini_model]            — Gemini TTS model
 * @param {string} [opts.style_instructions]      — TTS style/pacing instructions
 * @param {string} [opts.aspect_ratio]            — output aspect ratio (default '9:16')
 * @param {object} opts.supabase
 * @param {object} opts.keys
 * @param {string} opts.jobId
 * @param {string} opts.campaignId
 * @param {string} opts.userId
 * @param {object} [opts.nicheTemplate]
 */
export async function runShortsPipeline(opts) {
  const {
    niche,
    topic,
    story_context: storyContext,
    brand_username,
    visual_style: visualStyle,
    visual_style_prompt: visualStylePrompt,
    video_style: videoStyle,
    video_model: videoModel = 'fal_kling',
    voice_id: voiceId,
    caption_style: captionStyle = 'word_pop',
    caption_config: captionConfig,
    words_per_chunk: wordsPerChunk = 3,
    lora_config: loraConfigs = [],
    script: prebuiltScript = null,
    starting_image,
    image_model,
    video_length_preset,
    generate_audio: generateAudioFlag = false,
    enable_background_music: enableBackgroundMusic = true,
    framework: frameworkId,
    gemini_voice,
    gemini_model,
    style_instructions,
    aspect_ratio: aspectRatio = '9:16',
    supabase,
    keys,
    jobId,
    campaignId,
    userId,
    nicheTemplate,
  } = opts;

  // Convenience updater
  const updateJob = (patch) => supabase.from('jobs').update(patch).eq('id', jobId);

  // Mutable tracking for structured error reporting
  let currentStep = 'init';
  let currentSceneIndex = -1;
  let currentModel = null;

  try {
    // ── Step 0: Load Framework ──────────────────────────────────────────────────
    const framework = frameworkId ? getFramework(frameworkId) : null;
    const effectiveFrameChain = framework ? framework.frameChain : (getImageStrategy(visualStyle) === 'frame_chain');
    const effectiveMusicVolume = framework?.musicVolume ?? 0.15;
    const effectiveMusicMood = framework?.musicMood || nicheTemplate?.music_mood || 'upbeat background music';

    if (framework) {
      console.log(`[shortsPipeline] Framework: ${framework.name} (${frameworkId}), frameChain=${effectiveFrameChain}, ttsMode=${framework.ttsMode}, musicVolume=${effectiveMusicVolume}`);
    }

    // Determine image strategy based on visual_style (legacy) or framework
    const imageStrategy = framework ? (effectiveFrameChain ? 'frame_chain' : 'fresh_per_scene') : getImageStrategy(visualStyle);
    // Use backend VISUAL_STYLES lookup first, fall back to frontend's promptText
    const visualSuffix = getVisualStyleSuffix(visualStyle) || (visualStylePrompt ? `, ${visualStylePrompt}` : '');
    const hasLoras = Array.isArray(loraConfigs) && loraConfigs.length > 0;

    if (hasLoras) {
      console.log(`[shortsPipeline] LoRA mode: ${loraConfigs.length} LoRA(s) active`);
      loraConfigs.forEach((c, i) =>
        console.log(`  LoRA ${i + 1}: ${c.triggerWord || '(no trigger)'} @ scale ${c.scale}`)
      );
    }

    console.log(`[shortsPipeline] image_strategy=${imageStrategy} visual_style=${visualStyle || 'default'} video_model=${videoModel} aspect_ratio=${aspectRatio}`);

    // ── Step 1: Generate Script ──────────────────────────────────────────────────
    currentStep = 'generating_script';
    let scriptResult;
    await updateJob({ current_step: 'generating_script', completed_steps: 0 });

    if (prebuiltScript) {
      if (typeof prebuiltScript === 'string') {
        // narration_full override — regenerate structured script using the text as topic guidance
        console.log(`[shortsPipeline] Step 1: Rebuilding script from prebuilt narration (${prebuiltScript.length} chars)`);
        scriptResult = await generateScript({
          niche,
          topic: prebuiltScript,
          nicheTemplate,
          keys,
          brandUsername: brand_username,
          storyContext,
          targetDurationSeconds: video_length_preset,
          framework,
        });
        scriptResult.narration_full = prebuiltScript;
      } else {
        // Full prebuilt script object — use as-is
        console.log(`[shortsPipeline] Step 1: Using prebuilt script object`);
        scriptResult = prebuiltScript;
        // Ensure narration_full exists (frontend may send only { scenes })
        if (!scriptResult.narration_full && scriptResult.scenes) {
          scriptResult.narration_full = scriptResult.scenes
            .map(s => s.narration_segment || s.narration || '')
            .filter(Boolean)
            .join(' ');
        }
        if (!scriptResult.title) {
          scriptResult.title = topic || 'Untitled Short';
        }
      }
    } else {
      console.log(`[shortsPipeline] Step 1: Generating script niche="${niche}" topic="${topic || 'auto'}"${framework ? ` framework="${frameworkId}"` : ''}`);
      scriptResult = await generateScript({
        niche,
        topic,
        nicheTemplate,
        keys,
        brandUsername: brand_username,
        storyContext,
        targetDurationSeconds: video_length_preset,
        framework,
      });
    }

    console.log(`[shortsPipeline] Script: "${scriptResult.title}" — ${scriptResult.scenes?.length} scenes`);

    // ── Step 2: Generate TTS Voiceover ──────────────────────────────────────────
    currentStep = 'generating_voiceover';
    await updateJob({ current_step: 'generating_voiceover', completed_steps: 1 });

    const useGemini = !!gemini_voice;
    let voiceoverUrl = null;
    let perSceneVoiceovers = [];

    if (useGemini && framework?.ttsMode === 'per_scene') {
      // Per-scene Gemini TTS
      console.log(`[shortsPipeline] Step 2: Generating per-scene Gemini voiceover (${scriptResult.scenes.length} scenes, voice=${gemini_voice})`);
      for (let i = 0; i < scriptResult.scenes.length; i++) {
        const scene = scriptResult.scenes[i];
        const narration = scene.narration_segment || scene.narration || '';
        if (!narration.trim()) {
          perSceneVoiceovers.push(null);
          continue;
        }
        const url = await withRetry(
          () => generateGeminiVoiceover(narration, keys, supabase, {
            voice: gemini_voice,
            model: gemini_model || 'gemini-2.5-flash-tts',
            styleInstructions: style_instructions || framework.ttsPacing,
          }),
          { maxAttempts: 2, baseDelayMs: 3000, onRetry: (a, e) => console.warn(`[shortsPipeline] Gemini TTS scene ${i + 1} retry ${a}: ${e.message}`) }
        );
        perSceneVoiceovers.push(url);
        logCost({
          username: brand_username,
          category: 'fal',
          operation: 'shorts_voiceover_gemini',
          model: gemini_model || 'gemini-2.5-flash-tts',
          metadata: { character_count: narration.length, scene_index: i },
        });
      }
      // Build a combined voiceover URL for assembly — we'll use per-scene durations
      // For assembly, we need a single voiceover track. Concatenate per-scene audio.
      // Use the first non-null as fallback if concat not possible
      const validVoiceovers = perSceneVoiceovers.filter(Boolean);
      if (validVoiceovers.length === 1) {
        voiceoverUrl = validVoiceovers[0];
      } else if (validVoiceovers.length > 1) {
        // Use ffmpeg compose to concatenate voiceover segments
        try {
          const FAL_BASE = 'https://queue.fal.run';
          let runningTs = 0;
          const voKeyframes = [];
          for (let i = 0; i < perSceneVoiceovers.length; i++) {
            if (!perSceneVoiceovers[i]) continue;
            const sceneDur = estimateDurationFromText(scriptResult.scenes[i].narration_segment || scriptResult.scenes[i].narration || '');
            voKeyframes.push({ url: perSceneVoiceovers[i], timestamp: runningTs * 1000, duration: sceneDur * 1000 });
            runningTs += sceneDur;
          }
          const concatRes = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/compose`, {
            method: 'POST',
            headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tracks: [{ id: 'voiceover', type: 'audio', keyframes: voKeyframes }],
              duration: runningTs,
            }),
          });
          if (concatRes.ok) {
            const qData = await concatRes.json();
            const output = await pollFalQueue(qData.response_url || qData.request_id, 'fal-ai/ffmpeg-api/compose', keys.falKey, 60, 3000);
            const url = output?.video_url || output?.audio?.url || output?.output_url;
            if (url) {
              voiceoverUrl = await uploadUrlToSupabase(url, supabase, 'pipeline/voiceover');
            }
          }
        } catch (concatErr) {
          console.warn(`[shortsPipeline] Per-scene voiceover concat failed, using first segment: ${concatErr.message}`);
        }
        if (!voiceoverUrl) voiceoverUrl = validVoiceovers[0];
      }
    } else if (useGemini) {
      // Single-file Gemini TTS
      const fullNarration = scriptResult.narration_full || scriptResult.scenes.map(s => s.narration_segment || s.narration || '').filter(Boolean).join('\n\n');
      console.log(`[shortsPipeline] Step 2: Generating single Gemini voiceover (${fullNarration.length} chars, voice=${gemini_voice})`);
      voiceoverUrl = await withRetry(
        () => generateGeminiVoiceover(fullNarration, keys, supabase, {
          voice: gemini_voice,
          model: gemini_model || 'gemini-2.5-flash-tts',
          styleInstructions: style_instructions || framework?.ttsPacing,
        }),
        { maxAttempts: 2, baseDelayMs: 3000, onRetry: (a, e) => console.warn(`[shortsPipeline] Gemini TTS retry ${a}: ${e.message}`) }
      );
      logCost({
        username: brand_username,
        category: 'fal',
        operation: 'shorts_voiceover_gemini',
        model: gemini_model || 'gemini-2.5-flash-tts',
        metadata: { character_count: fullNarration.length },
      });
    } else {
      // Legacy ElevenLabs TTS
      const fullNarration = scriptResult.narration_full || scriptResult.scenes.map(s => s.narration_segment || s.narration || '').filter(Boolean).join(' ');
      console.log(`[shortsPipeline] Step 2: Generating ElevenLabs voiceover (${fullNarration.length} chars)`);
      voiceoverUrl = await withRetry(
        () => generateVoiceover(fullNarration, keys, supabase, { voiceId }),
        { maxAttempts: 2, baseDelayMs: 3000, onRetry: (a, e) => console.warn(`[shortsPipeline] Voiceover retry ${a}: ${e.message}`) }
      );
      logCost({
        username: brand_username,
        category: 'elevenlabs',
        operation: 'shorts_voiceover',
        model: 'elevenlabs-tts',
        metadata: { character_count: fullNarration.length },
      });
    }

    // ── Step 3: Measure/Estimate Audio Durations ────────────────────────────────
    currentStep = 'measuring_audio';
    await updateJob({ current_step: 'measuring_audio', completed_steps: 2 });
    console.log('[shortsPipeline] Step 3: Estimating scene audio durations');

    // Estimate per-scene durations from text length (words / 2.5 = seconds)
    const sceneDurations = [];
    if (perSceneVoiceovers.length > 0) {
      // Per-scene TTS: estimate each independently
      for (const scene of scriptResult.scenes) {
        const narration = scene.narration_segment || scene.narration || '';
        sceneDurations.push(estimateDurationFromText(narration));
      }
    } else {
      // Single TTS: distribute total duration proportionally by character count
      const totalChars = scriptResult.scenes.reduce((sum, s) => sum + ((s.narration_segment || s.narration || '').length), 0);
      const totalTargetDuration = video_length_preset || scriptResult.scenes.reduce((sum, s) => sum + (s.duration_seconds || 8), 0);
      for (const scene of scriptResult.scenes) {
        const chars = (scene.narration_segment || scene.narration || '').length;
        const proportion = totalChars > 0 ? chars / totalChars : 1 / scriptResult.scenes.length;
        sceneDurations.push(Math.max(3, Math.round(proportion * totalTargetDuration)));
      }
    }

    console.log(`[shortsPipeline] Scene durations: [${sceneDurations.map(d => d.toFixed(1) + 's').join(', ')}]`);

    // ── Steps 4+5: Generate Images & Video Clips (per scene) ────────────────────
    currentStep = 'generating_images';
    await updateJob({ current_step: 'generating_images', completed_steps: 3 });
    console.log(`[shortsPipeline] Steps 4+5: Generating ${scriptResult.scenes.length} scene images + clips (strategy: ${imageStrategy})${hasLoras ? ' with LoRA' : ''}`);

    const sceneAssets = []; // { image_url, video_url, first_frame_url, last_frame_url, voiceover_url }
    const sceneClips = [];
    const actualClipDurations = [];
    let prevFrameUrl = null;
    let prevFrameAnalysis = null;

    const openai = new OpenAI({ apiKey: keys.openaiKey });

    for (let i = 0; i < scriptResult.scenes.length; i++) {
      const scene = scriptResult.scenes[i];
      currentSceneIndex = i;

      let imageUrl = null;
      let clipUrl = null;
      let firstFrameUrl = null;
      let lastFrameUrl = null;
      let imagePromptUsed = null;
      let motionPromptUsed = null;

      // Retry wrapper for entire scene — retry once on failure, then skip
      try {
        // ── Image ──────────────────────────────────────────────────────────────
        if (i === 0 && starting_image) {
          imageUrl = starting_image;
          console.log('[shortsPipeline] Using provided starting image for scene 0');
        } else if (effectiveFrameChain && i > 0 && prevFrameUrl) {
          // Reuse the last frame of the previous clip as the source image
          imageUrl = prevFrameUrl;
          imagePromptUsed = '[reused frame from previous clip]';
          console.log(`[shortsPipeline] Scene ${i + 1}: reusing prev frame (frame_chain)`);
        } else {
          // Build prompt
          const triggerPrefix = (loraConfigs || [])
            .map((c) => c.triggerWord)
            .filter(Boolean)
            .join(', ');

          const basePrompt = [triggerPrefix, scene.visual_prompt].filter(Boolean).join(', ');
          imagePromptUsed = basePrompt + visualSuffix + `. Vertical ${aspectRatio} format, cinematic, no text or words in image.`;

          // For fresh_per_scene (non-first scenes): append continuity context
          let promptWithContinuity = imagePromptUsed;
          if (imageStrategy === 'fresh_per_scene' && prevFrameAnalysis) {
            promptWithContinuity += `. Maintain visual continuity: ${prevFrameAnalysis}`;
          }

          const resolvedImageModel = image_model || (hasLoras ? 'fal_flux' : (framework?.defaults?.imageModel || undefined));
          currentModel = resolvedImageModel || 'default';
          console.log(`[shortsPipeline] Scene ${i + 1}: generating image (${imageStrategy}${resolvedImageModel ? ', model: ' + resolvedImageModel : ''})`);
          imageUrl = await withRetry(
            () => generateImageV2(resolvedImageModel || 'fal_flux', promptWithContinuity, aspectRatio, keys, supabase, {
              loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
            }),
            { maxAttempts: 2, baseDelayMs: 2000 }
          );

          logCost({
            username: brand_username,
            category: 'fal',
            operation: 'shorts_image',
            model: hasLoras ? 'flux-2-lora' : (resolvedImageModel || 'flux-pro'),
            metadata: { image_count: 1, lora_count: loraConfigs.length },
          });
        }

        // ── Video Clip ─────────────────────────────────────────────────────────
        const videoStylePrompt = getVideoStylePrompt(videoStyle);
        motionPromptUsed = [scene.motion_prompt, videoStylePrompt].filter(Boolean).join(', ') || 'slow cinematic pan';

        // Use estimated audio duration for clip duration (voiceover is master clock)
        const requestedDuration = sceneDurations[i] || scene.duration_seconds || 5;
        const actualDuration = getActualDuration(videoModel, requestedDuration);
        actualClipDurations.push(actualDuration);

        currentStep = 'animating_clips';
        currentModel = videoModel;
        await updateJob({ current_step: 'animating_clips', completed_steps: 3 });
        console.log(`[shortsPipeline] Scene ${i + 1}: animating clip (audio=${requestedDuration.toFixed?.(1) || requestedDuration}s -> actual ${actualDuration}s, model: ${videoModel})`);

        clipUrl = await withRetry(
          // Never send generate_audio for Shorts — we have our own voiceover + music
          () => animateImageV2(videoModel || 'fal_kling', imageUrl, motionPromptUsed, aspectRatio, requestedDuration, keys, supabase, { loras: loraConfigs, generate_audio: false }),
          { maxAttempts: 2, baseDelayMs: 5000 }
        );
        sceneClips.push(clipUrl);

        logCost({
          username: brand_username,
          category: 'fal',
          operation: 'shorts_video_clip',
          model: videoModel || 'fal_kling',
          metadata: { video_count: 1, duration: actualDuration },
        });

        // ── Step 6 (per-scene): Extract first and last frames ──────────────────
        try {
          [firstFrameUrl, lastFrameUrl] = await Promise.all([
            extractFirstFrame(clipUrl, keys.falKey),
            extractLastFrame(clipUrl, actualDuration, keys.falKey),
          ]);
          prevFrameUrl = lastFrameUrl;
          if (lastFrameUrl) {
            prevFrameAnalysis = await analyzeFrameContinuity(lastFrameUrl, openai);
          }
        } catch (e) {
          console.warn(`[shortsPipeline] Frame extraction failed for scene ${i + 1}: ${e.message}`);
          // Try last frame alone if parallel failed
          try {
            lastFrameUrl = await extractLastFrame(clipUrl, actualDuration, keys.falKey);
            prevFrameUrl = lastFrameUrl;
            if (lastFrameUrl) prevFrameAnalysis = await analyzeFrameContinuity(lastFrameUrl, openai);
          } catch (e2) {
            prevFrameUrl = null;
            prevFrameAnalysis = null;
          }
        }

      } catch (sceneErr) {
        // Scene failed even after retries — log and continue with remaining scenes
        console.error(`[shortsPipeline] Scene ${i + 1} failed, skipping: ${sceneErr.message}`);
        if (!clipUrl) {
          // No clip generated — push null placeholder so assembly skips it
          actualClipDurations.push(0);
        }
      }

      // ── Store scene assets ──────────────────────────────────────────────────
      const sceneAsset = {
        image_url: imageUrl,
        video_url: clipUrl,
        first_frame_url: firstFrameUrl,
        last_frame_url: lastFrameUrl,
        voiceover_url: perSceneVoiceovers[i] || voiceoverUrl,
        image_prompt_used: imagePromptUsed,
        motion_prompt_used: motionPromptUsed,
        lora_config: loraConfigs,
        visual_style: visualStyle,
        video_style: videoStyle,
        video_model: videoModel,
      };
      sceneAssets.push(sceneAsset);

      // ── Per-scene checkpoint write ─────────────────────────────────────────
      await updateJob({
        step_results: Object.fromEntries(
          sceneAssets.map((s, idx) => [`scene_${idx}`, {
            image_url: s.image_url,
            video_url: s.video_url,
            first_frame_url: s.first_frame_url,
            last_frame_url: s.last_frame_url,
            voiceover_url: s.voiceover_url,
            completed_at: new Date().toISOString(),
          }])
        ),
      });

      console.log(`[shortsPipeline] Scene ${i + 1}/${scriptResult.scenes.length} complete`);
    }

    // Filter out failed scenes for assembly
    const validClips = sceneAssets.filter(s => s.video_url).map(s => s.video_url);
    const validDurations = sceneAssets.map((s, i) => s.video_url ? actualClipDurations[i] : 0).filter(d => d > 0);

    if (validClips.length === 0) {
      throw new Error('All scenes failed — no video clips generated');
    }

    // ── Step 7: Generate Music (optional) ───────────────────────────────────────
    currentStep = 'generating_music';
    currentModel = 'lyria2';
    let musicUrl = null;
    await updateJob({ current_step: 'generating_music', completed_steps: 5 });

    if (enableBackgroundMusic) {
      console.log(`[shortsPipeline] Step 7: Generating background music (mood: ${effectiveMusicMood})`);
      const totalDuration = validDurations.reduce((sum, d) => sum + d, 0) || video_length_preset || 60;

      musicUrl = await withRetry(
        () => generateMusic(effectiveMusicMood, totalDuration + 5, keys, supabase),
        { maxAttempts: 2, baseDelayMs: 5000 }
      );

      if (musicUrl) {
        logCost({
          username: brand_username,
          category: 'fal',
          operation: 'shorts_music',
          model: 'lyria2',
          metadata: { track_count: 1 },
        });
      }
    } else {
      console.log('[shortsPipeline] Step 7: Background music disabled, skipping');
    }

    // ── Step 8: Assemble Video ────────────────────────────────────────────────────
    currentStep = 'assembling_video';
    currentModel = null;
    let assembledVideoUrl;
    await updateJob({ current_step: 'assembling_video', completed_steps: 6 });
    console.log(`[shortsPipeline] Step 8: Assembling video (${validClips.length} clips + voiceover${musicUrl ? ` + music vol=${effectiveMusicVolume}` : ''})`);

    assembledVideoUrl = await assembleShort(validClips, voiceoverUrl, musicUrl, keys.falKey, supabase, validDurations, effectiveMusicVolume);

    // ── Step 9: Burn Captions ─────────────────────────────────────────────────────
    currentStep = 'burning_captions';
    let captionedVideoUrl;
    await updateJob({ current_step: 'burning_captions', completed_steps: 7 });

    // Use caption_config (object) if provided, fall back to caption_style (string)
    const effectiveCaptionConfig = captionConfig || captionStyle;
    const captionLabel = typeof effectiveCaptionConfig === 'string' ? effectiveCaptionConfig : 'custom';
    console.log(`[shortsPipeline] Step 9: Burning captions (config: ${captionLabel})`);

    try {
      captionedVideoUrl = await burnCaptions(
        assembledVideoUrl,
        effectiveCaptionConfig,
        keys.falKey,
        supabase,
      );
    } catch (captionErr) {
      console.warn(`[shortsPipeline] Caption burning failed, using uncaptioned video: ${captionErr.message}`);
      captionedVideoUrl = assembledVideoUrl;
    }

    // ── Step 10: Finalize ─────────────────────────────────────────────────────────
    currentStep = 'finalizing';
    await updateJob({ current_step: 'finalizing', completed_steps: 8 });
    console.log('[shortsPipeline] Step 10: Saving ad_draft and finalizing');

    const { error: draftError } = await supabase.from('ad_drafts').insert({
      campaign_id: campaignId,
      user_id: userId,
      brand_username,
      content_type: 'shorts',
      aspect_ratio: aspectRatio,
      generation_status: 'ready',
      assets_json: {
        final_video_url: captionedVideoUrl,
        video_url: assembledVideoUrl,
      },
      voiceover_url: voiceoverUrl,
      captioned_video_url: captionedVideoUrl,
      scene_inputs_json: sceneAssets,
      shorts_metadata_json: {
        script: scriptResult,
        scenes: scriptResult.scenes,
        hashtags: scriptResult.hashtags,
        niche,
        topic,
        visual_style: visualStyle,
        video_style: videoStyle,
        video_model: videoModel,
        voice_id: voiceId,
        gemini_voice: gemini_voice || null,
        caption_config: effectiveCaptionConfig,
        music_url: musicUrl,
        framework: frameworkId || null,
        music_volume: effectiveMusicVolume,
      },
      storyboard_json: {
        scenes: scriptResult.scenes,
      },
    });

    if (draftError) {
      console.error('[shortsPipeline] Failed to insert ad_draft:', draftError.message);
      throw new Error(`Failed to create ad_draft: ${draftError.message}`);
    }

    await supabase.from('jobs').update({
      status: 'completed',
      current_step: 'done',
      completed_steps: 10,
      workflow_state: 'completed',
      output_json: {
        campaign_id: campaignId,
        video_url: captionedVideoUrl,
        title: scriptResult.title,
        niche,
        framework: frameworkId || null,
      },
    }).eq('id', jobId);

    await supabase.from('campaigns').update({ status: 'ready' }).eq('id', campaignId);

    console.log(`[shortsPipeline] Job ${jobId} complete — "${scriptResult.title}" — ${captionedVideoUrl}`);

  } catch (err) {
    console.error(`[shortsPipeline] Pipeline failed at step="${currentStep}" scene=${currentSceneIndex} model=${currentModel}:`, err);

    // Mark job as failed with structured error context
    await supabase.from('jobs').update({
      status: 'failed',
      error: err.message,
      last_error: JSON.stringify({
        step: currentStep,
        scene: currentSceneIndex,
        model: currentModel,
        timestamp: new Date().toISOString(),
        stack: err.stack?.split('\n').slice(0, 5),
      }),
    }).eq('id', jobId);

    await supabase.from('campaigns').update({
      status: 'failed',
    }).eq('id', campaignId);

    // Do NOT re-throw — the pipeline handles its own cleanup
  }
}
