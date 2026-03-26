/**
 * Shorts Pipeline Orchestrator — framework-driven pipeline for Shorts generation
 * within the Storyboard/Campaigns system.
 *
 * Called by campaign-aware routes (not the legacy /api/shorts/generate endpoint).
 *
 * Steps:
 *  1. Load framework, solve durations, & generate script
 *  2. Generate TTS voiceover (single continuous track)
 *  3. Generate images & video clips per scene (continuous or cut mode)
 *  4. Generate music (Lyria 2, mood from framework)
 *  5. Assemble video (volume from framework)
 *  6. Burn captions (full captionConfig: object or string)
 *  7. Save draft (all scene assets in step_results)
 */

import { generateScript } from './scriptGenerator.js';
import { generateVoiceover, generateGeminiVoiceover } from './voiceoverGenerator.js';
import { burnCaptions } from './captionBurner.js';
import { generateImageV2, animateImageV2, animateImageR2V } from './mediaGenerator.js';
import { solveDurations } from './durationSolver.js';
import { getR2VEndpoint } from './modelRegistry.js';
import {
  generateMusic,
  extractLastFrame,
  extractFirstFrame,
  assembleShort,
} from './pipelineHelpers.js';
import { getVisualStyleSuffix, getImageStrategy } from './visualStyles.js';
import { getVideoStylePrompt } from './videoStylePresets.js';
import { getFramework } from './videoStyleFrameworks.js';
import { withRetry } from './retryHelper.js';
import { logCost } from './costLogger.js';
import { saveToLibrary } from './librarySave.js';
import { writeMediaMetadata } from './mediaMetadata.js';

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
/** Fire-and-forget library auto-save — never blocks or fails the pipeline */
function autoSave(supabase, userId, userEmail, opts) {
  saveToLibrary(supabase, userId, userEmail, opts).catch(err =>
    console.warn(`[shortsPipeline] autoSave failed for ${opts.title}:`, err.message)
  );
}

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
    userEmail,
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

    // --- Duration Solver ---
    let lockedDurations = null;
    if (framework) {
      const sceneStructure = framework.sceneStructure[video_length_preset] ||
        framework.sceneStructure[framework.supportedDurations[0]];
      const durationRanges = sceneStructure.map(s => s.durationRange);
      lockedDurations = solveDurations(video_length_preset, durationRanges, videoModel);
      console.log('[shorts] Locked durations:', lockedDurations, 'sum:', lockedDurations.reduce((a, b) => a + b, 0));
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
          lockedDurations,
          frameChain: framework?.frameChain ?? true,
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
        lockedDurations,
        frameChain: framework?.frameChain ?? true,
      });
    }

    console.log(`[shortsPipeline] Script: "${scriptResult.title}" — ${scriptResult.scenes?.length} scenes`);

    // ── Step 2: Generate TTS Voiceover (always single continuous track) ─────────
    currentStep = 'generating_voiceover';
    await updateJob({ current_step: 'generating_voiceover', completed_steps: 1 });

    const useGemini = !!gemini_voice;
    const fullNarration = scriptResult.narration_full || scriptResult.scenes
      .map(s => s.narration_segment || s.narration || '')
      .filter(Boolean)
      .join(' ');

    let voiceoverUrl = null;

    if (useGemini) {
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

    if (voiceoverUrl) {
      autoSave(supabase, userId, userEmail, {
        url: voiceoverUrl, type: 'video',
        title: `[Short] ${topic} - Voiceover`,
        source: 'shorts',
        model_name: gemini_voice ? 'Gemini TTS' : 'ElevenLabs',
        short_name: topic || null,
      });
    }

    // ── Steps 3+4+5: Generate Images & Video Clips (per scene) ──────────────────
    currentStep = 'generating_images';
    await updateJob({ current_step: 'generating_images', completed_steps: 2 });

    const isContinuous = effectiveFrameChain;
    const videoStylePrompt = getVideoStylePrompt(videoStyle);
    const resolvedImageModel = image_model || (hasLoras ? 'fal_flux' : (framework?.defaults?.imageModel || undefined));
    let characterRef = null;

    console.log(`[shortsPipeline] Steps 3-5: Generating ${scriptResult.scenes.length} scenes (mode: ${isContinuous ? 'continuous' : 'cut'})${hasLoras ? ' with LoRA' : ''}`);
    if (lockedDurations) {
      console.log(`[shortsPipeline] Locked durations: [${lockedDurations.map(d => d + 's').join(', ')}]`);
    }

    const sceneAssets = [];
    const clips = [];
    const actualDurations = [];

    for (let i = 0; i < scriptResult.scenes.length; i++) {
      const scene = scriptResult.scenes[i];
      currentSceneIndex = i;
      const duration = lockedDurations ? lockedDurations[i] : (scene.duration_seconds || 5);

      const visualPrompt = scene.visual_prompt || scene.visual_description || '';
      const motionPrompt = scene.motion_prompt || '';
      const fullPrompt = [visualPrompt, motionPrompt, videoStylePrompt].filter(Boolean).join('. ');

      let imageUrl = null;
      let clipUrl = null;
      let firstFrameUrl = null;
      let lastFrameUrl = null;

      // Retry wrapper for entire scene — retry once on failure, then skip
      try {
        if (i === 0) {
          // Scene 1: always generate image (or use starting_image) then I2V
          if (starting_image) {
            imageUrl = starting_image;
            console.log('[shortsPipeline] Using provided starting image for scene 0');
          } else {
            const triggerPrefix = (loraConfigs || []).map(c => c.triggerWord).filter(Boolean).join(', ');
            const basePrompt = [triggerPrefix, visualPrompt].filter(Boolean).join(', ');
            const imagePrompt = basePrompt + visualSuffix + `. Vertical ${aspectRatio} format, cinematic, no text or words in image.`;

            currentModel = resolvedImageModel || 'default';
            console.log(`[shortsPipeline] Scene 1: generating image (model: ${resolvedImageModel || 'fal_flux'})`);
            imageUrl = await withRetry(
              () => generateImageV2(resolvedImageModel || 'fal_flux', imagePrompt, aspectRatio, keys, supabase, {
                loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
              }),
              { maxAttempts: 2, baseDelayMs: 2000 }
            );

            logCost({ username: brand_username, category: 'fal', operation: 'shorts_image', model: hasLoras ? 'flux-2-lora' : (resolvedImageModel || 'flux-pro'), metadata: { image_count: 1 } });
            autoSave(supabase, userId, userEmail, { url: imageUrl, type: 'image', title: `[Short] ${topic} - Scene 1 Image`, source: 'shorts', visual_style: visualStyle || null, model_name: resolvedImageModel || 'fal_nano_banana', short_name: topic || null });
          }

          characterRef = imageUrl;

          currentStep = 'animating_clips';
          currentModel = videoModel;
          await updateJob({ current_step: 'animating_clips', completed_steps: 3 });
          console.log(`[shortsPipeline] Scene 1: animating clip (${duration}s, model: ${videoModel})`);

          clipUrl = await withRetry(
            () => animateImageV2(videoModel || 'fal_kling', imageUrl, fullPrompt, aspectRatio, duration, keys, supabase, { loras: loraConfigs, generate_audio: false }),
            { maxAttempts: 2, baseDelayMs: 5000 }
          );
        } else if (isContinuous) {
          // Continuous: last frame of previous clip -> I2V
          const lastFrame = clips[clips.length - 1]?.lastFrameUrl;
          if (!lastFrame) {
            throw new Error(`No last frame available from scene ${i} for frame chaining`);
          }

          currentStep = 'animating_clips';
          currentModel = videoModel;
          await updateJob({ current_step: 'animating_clips', completed_steps: 3 });
          console.log(`[shortsPipeline] Scene ${i + 1}: continuous I2V from last frame (${duration}s)`);

          clipUrl = await withRetry(
            () => animateImageV2(videoModel || 'fal_kling', lastFrame, fullPrompt, aspectRatio, duration, keys, supabase, { loras: loraConfigs, generate_audio: false }),
            { maxAttempts: 2, baseDelayMs: 5000 }
          );
        } else {
          // Cut mode: R2V with character ref, or fresh image -> I2V
          const r2vEndpoint = getR2VEndpoint(videoModel);

          currentStep = 'animating_clips';
          currentModel = videoModel;
          await updateJob({ current_step: 'animating_clips', completed_steps: 3 });

          if (characterRef && r2vEndpoint) {
            console.log(`[shortsPipeline] Scene ${i + 1}: R2V with character ref (${duration}s, endpoint: ${r2vEndpoint})`);
            clipUrl = await withRetry(
              () => animateImageR2V(r2vEndpoint, characterRef, fullPrompt, aspectRatio, duration, keys, supabase),
              { maxAttempts: 2, baseDelayMs: 5000 }
            );
          } else {
            // No R2V endpoint — fall back to fresh image -> I2V
            const triggerPrefix = (loraConfigs || []).map(c => c.triggerWord).filter(Boolean).join(', ');
            const basePrompt = [triggerPrefix, visualPrompt].filter(Boolean).join(', ');
            const imagePrompt = basePrompt + visualSuffix + `. Vertical ${aspectRatio} format, cinematic, no text or words in image.`;

            currentModel = resolvedImageModel || 'default';
            console.log(`[shortsPipeline] Scene ${i + 1}: generating fresh image + I2V (${duration}s)`);
            imageUrl = await withRetry(
              () => generateImageV2(resolvedImageModel || 'fal_flux', imagePrompt, aspectRatio, keys, supabase, {
                loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
              }),
              { maxAttempts: 2, baseDelayMs: 2000 }
            );

            logCost({ username: brand_username, category: 'fal', operation: 'shorts_image', model: hasLoras ? 'flux-2-lora' : (resolvedImageModel || 'flux-pro'), metadata: { image_count: 1 } });
            autoSave(supabase, userId, userEmail, { url: imageUrl, type: 'image', title: `[Short] ${topic} - Scene ${i + 1} Image`, source: 'shorts', visual_style: visualStyle || null, model_name: resolvedImageModel || 'fal_nano_banana', short_name: topic || null });

            currentModel = videoModel;
            clipUrl = await withRetry(
              () => animateImageV2(videoModel || 'fal_kling', imageUrl, fullPrompt, aspectRatio, duration, keys, supabase, { loras: loraConfigs, generate_audio: false }),
              { maxAttempts: 2, baseDelayMs: 5000 }
            );
          }
        }

        logCost({ username: brand_username, category: 'fal', operation: 'shorts_video_clip', model: videoModel || 'fal_kling', metadata: { video_count: 1, duration } });
        autoSave(supabase, userId, userEmail, { url: clipUrl, type: 'video', title: `[Short] ${topic} - Scene ${i + 1} Video`, source: 'shorts', video_style: framework?.name || frameworkId || null, visual_style: visualStyle || null, model_name: videoModel || null, short_name: topic || null });

        // Extract frames for chaining and checkpointing
        try {
          [firstFrameUrl, lastFrameUrl] = await Promise.all([
            extractFirstFrame(clipUrl, keys.falKey),
            extractLastFrame(clipUrl, duration, keys.falKey),
          ]);
        } catch (e) {
          console.warn(`[shortsPipeline] Frame extraction failed for scene ${i + 1}: ${e.message}`);
          try {
            lastFrameUrl = await extractLastFrame(clipUrl, duration, keys.falKey);
          } catch (e2) {
            lastFrameUrl = null;
          }
        }

      } catch (sceneErr) {
        // Scene failed even after retries — log and continue with remaining scenes
        console.error(`[shortsPipeline] Scene ${i + 1} failed, skipping: ${sceneErr.message}`);
      }

      clips.push({ url: clipUrl, firstFrameUrl, lastFrameUrl, imageUrl });
      actualDurations.push(clipUrl ? duration : 0);

      // ── Store scene assets ──────────────────────────────────────────────────
      const sceneAsset = {
        image_url: imageUrl,
        video_url: clipUrl,
        first_frame_url: firstFrameUrl,
        last_frame_url: lastFrameUrl,
        voiceover_url: voiceoverUrl,
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
    const validClips = clips.filter(c => c.url).map(c => c.url);
    const validDurations = actualDurations.filter(d => d > 0);

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

        autoSave(supabase, userId, userEmail, {
          url: musicUrl, type: 'video',
          title: `[Short] ${topic} - Music`,
          source: 'shorts',
          model_name: 'Lyria 2',
          short_name: topic || null,
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

    autoSave(supabase, userId, userEmail, {
      url: assembledVideoUrl, type: 'video',
      title: `[Short] ${topic} - Final`,
      source: 'shorts',
      video_style: framework?.name || frameworkId || null,
      visual_style: visualStyle || null,
      model_name: videoModel || null,
      short_name: topic || null,
    });

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

    autoSave(supabase, userId, userEmail, {
      url: captionedVideoUrl, type: 'video',
      title: `[Short] ${topic} - Final (Captioned)`,
      source: 'shorts',
      video_style: framework?.name || frameworkId || null,
      visual_style: visualStyle || null,
      model_name: videoModel || null,
      short_name: topic || null,
    });

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
