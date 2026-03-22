/**
 * Shorts Pipeline Orchestrator — unified 9-step pipeline for Shorts generation
 * within the Storyboard/Campaigns system.
 *
 * Called by campaign-aware routes (not the legacy /api/shorts/generate endpoint).
 *
 * Steps:
 *  1. Generate Script
 *  2. Generate Voiceover
 *  3. Generate Word Timestamps
 *  4. Generate Images   ┐ interleaved per scene for frame_chain strategy
 *  5. Animate Clips     ┘
 *  6. Generate Music
 *  7. Assemble Video
 *  8. Burn Captions
 *  9. Finalize (ad_draft + job/campaign status)
 */

import OpenAI from 'openai';
import { generateScript } from './scriptGenerator.js';
import { generateVoiceover, generateTimestamps, mapWordsToScenes } from './voiceoverGenerator.js';
import { burnCaptions } from './captionBurner.js';
import { generateImageV2, animateImageV2 } from './mediaGenerator.js';
import {
  generateMusic,
  extractLastFrame,
  analyzeFrameContinuity,
  assembleShort,
} from './pipelineHelpers.js';
import { getVisualStyleSuffix, getImageStrategy } from './visualStyles.js';
import { getVideoStylePrompt } from './videoStylePresets.js';
import { withRetry } from './retryHelper.js';
import { logCost } from './costLogger.js';

/**
 * Run the full 9-step shorts generation pipeline.
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
 * @param {string} [opts.caption_style]
 * @param {number} [opts.words_per_chunk]
 * @param {Array}  [opts.lora_config]
 * @param {object|string|null} [opts.script]  — pre-built script (skips Step 1 GPT call)
 * @param {string} [opts.starting_image]      — URL of image to use for scene 0 instead of generating
 * @param {string} [opts.image_model]         — override image model (e.g. 'fal_flux', 'fal_flux_pro')
 * @param {number} [opts.video_length_preset] — total duration override in seconds
 * @param {object} opts.supabase              — Supabase client
 * @param {object} opts.keys                  — { falKey, wavespeedKey, openaiKey, elevenlabsKey }
 * @param {string} opts.jobId
 * @param {string} opts.campaignId
 * @param {string} opts.userId
 * @param {object} [opts.nicheTemplate]       — resolved niche template (from getShortsTemplate)
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
    words_per_chunk: wordsPerChunk = 3,
    lora_config: loraConfigs = [],
    script: prebuiltScript = null,
    starting_image,
    image_model,
    video_length_preset,
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
    // Determine image strategy based on visual_style
    const imageStrategy = getImageStrategy(visualStyle);
    // Use backend VISUAL_STYLES lookup first, fall back to frontend's promptText
    const visualSuffix = getVisualStyleSuffix(visualStyle) || (visualStylePrompt ? `, ${visualStylePrompt}` : '');
    const hasLoras = Array.isArray(loraConfigs) && loraConfigs.length > 0;

    if (hasLoras) {
      console.log(`[shortsPipeline] LoRA mode: ${loraConfigs.length} LoRA(s) active`);
      loraConfigs.forEach((c, i) =>
        console.log(`  LoRA ${i + 1}: ${c.triggerWord || '(no trigger)'} @ scale ${c.scale}`)
      );
    }

    console.log(`[shortsPipeline] image_strategy=${imageStrategy} visual_style=${visualStyle || 'default'} video_model=${videoModel}`);

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
      console.log(`[shortsPipeline] Step 1: Generating script niche="${niche}" topic="${topic || 'auto'}"`);
      scriptResult = await generateScript({
        niche,
        topic,
        nicheTemplate,
        keys,
        brandUsername: brand_username,
        storyContext,
      });
    }

    console.log(`[shortsPipeline] Script: "${scriptResult.title}" — ${scriptResult.scenes?.length} scenes`);

    // ── Step 2: Generate Voiceover ───────────────────────────────────────────────
    currentStep = 'generating_voiceover';
    let voiceoverUrl;
    await updateJob({ current_step: 'generating_voiceover', completed_steps: 1 });
    console.log(`[shortsPipeline] Step 2: Generating voiceover (${scriptResult.narration_full.length} chars)`);

    voiceoverUrl = await withRetry(
      () => generateVoiceover(scriptResult.narration_full, keys, supabase, { voiceId }),
      { maxAttempts: 2, baseDelayMs: 3000, onRetry: (a, e) => console.warn(`[shortsPipeline] Voiceover retry ${a}: ${e.message}`) }
    );

    logCost({
      username: brand_username,
      category: 'elevenlabs',
      operation: 'shorts_voiceover',
      model: 'elevenlabs-tts',
      metadata: { character_count: scriptResult.narration_full.length },
    });

    // ── Step 3: Generate Word Timestamps ─────────────────────────────────────────
    currentStep = 'generating_timestamps';
    let wordTimestamps, sceneWordMap;
    await updateJob({ current_step: 'generating_timestamps', completed_steps: 2 });
    console.log('[shortsPipeline] Step 3: Generating word-level timestamps via Whisper');

    const tsResult = await generateTimestamps(voiceoverUrl, keys.falKey);
    wordTimestamps = tsResult.words;
    sceneWordMap = mapWordsToScenes(wordTimestamps, scriptResult.scenes);
    console.log(`[shortsPipeline] ${wordTimestamps.length} words mapped to ${sceneWordMap.length} scenes`);

    // ── Steps 4+5: Generate Images & Animate Clips (interleaved per scene) ───────
    currentStep = 'generating_images';
    await updateJob({ current_step: 'generating_images', completed_steps: 3 });
    console.log(`[shortsPipeline] Steps 4+5: Generating ${scriptResult.scenes.length} scene images (strategy: ${imageStrategy})${hasLoras ? ' with LoRA' : ''}`);

    const sceneImages = [];
    const sceneClips = [];
    const sceneInputs = [];
    let prevFrameUrl = null;
    let prevFrameAnalysis = null;

    const openai = new OpenAI({ apiKey: keys.openaiKey });

    for (let i = 0; i < scriptResult.scenes.length; i++) {
      const scene = scriptResult.scenes[i];
      const sceneWord = sceneWordMap[i];
      currentSceneIndex = i;

      // ── Image ──────────────────────────────────────────────────────────────────
      let imageUrl;
      let imagePromptUsed;

      if (i === 0 && opts.starting_image) {
        imageUrl = opts.starting_image;
        console.log('[shortsPipeline] Using provided starting image for scene 0');
      } else if (imageStrategy === 'frame_chain' && i > 0 && prevFrameUrl) {
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
        imagePromptUsed = basePrompt + visualSuffix + '. Vertical 9:16 format, cinematic, no text or words in image.';

        // For fresh_per_scene (non-first scenes): append continuity context
        let promptWithContinuity = imagePromptUsed;
        if (imageStrategy === 'fresh_per_scene' && prevFrameAnalysis) {
          promptWithContinuity += `. Maintain visual continuity: ${prevFrameAnalysis}`;
        }

        const resolvedImageModel = image_model || (hasLoras ? 'fal_flux' : undefined);
        currentModel = resolvedImageModel || 'default';
        console.log(`[shortsPipeline] Scene ${i + 1}: generating image (${imageStrategy}${resolvedImageModel ? ', model: ' + resolvedImageModel : ''})`);
        imageUrl = await withRetry(
          () => generateImageV2(promptWithContinuity, '9:16', keys, supabase, resolvedImageModel, loraConfigs),
          { maxAttempts: 2, baseDelayMs: 2000 }
        );

        logCost({
          username: brand_username,
          category: 'fal',
          operation: 'shorts_image',
          model: hasLoras ? 'flux-2-lora' : 'flux-pro',
          metadata: { image_count: 1, lora_count: loraConfigs.length },
        });
      }

      sceneImages.push(imageUrl);

      // ── Video Clip ─────────────────────────────────────────────────────────────
      const videoStylePrompt = getVideoStylePrompt(videoStyle);
      const motionPromptUsed = [scene.motion_prompt, videoStylePrompt].filter(Boolean).join(', ') || 'slow cinematic pan';

      // Duration from actual voiceover timing (fallback to template)
      const clipDuration = sceneWord
        ? Math.max(3, Math.round(sceneWord.endTime - sceneWord.startTime))
        : scene.duration_seconds || 5;

      currentStep = 'animating_clips';
      currentModel = videoModel;
      await updateJob({ current_step: 'animating_clips', completed_steps: 3 });
      console.log(`[shortsPipeline] Scene ${i + 1}: animating clip (${clipDuration}s, model: ${videoModel})`);

      const clipUrl = await withRetry(
        () => animateImageV2(imageUrl, motionPromptUsed, '9:16', clipDuration, keys, supabase, videoModel, loraConfigs),
        { maxAttempts: 2, baseDelayMs: 5000 }
      );
      sceneClips.push(clipUrl);

      logCost({
        username: brand_username,
        category: 'fal',
        operation: 'shorts_video_clip',
        model: videoModel || 'fal_kling',
        metadata: { video_count: 1, duration: clipDuration },
      });

      // ── Extract last frame for next scene ──────────────────────────────────────
      try {
        prevFrameUrl = await extractLastFrame(clipUrl, clipDuration, keys.falKey);
        if (prevFrameUrl) {
          prevFrameAnalysis = await analyzeFrameContinuity(prevFrameUrl, openai);
        }
      } catch (e) {
        console.warn(`[shortsPipeline] Frame extraction/analysis failed for scene ${i + 1}: ${e.message}`);
        prevFrameUrl = null;
        prevFrameAnalysis = null;
      }

      // ── Store scene inputs for per-scene regeneration ──────────────────────────
      sceneInputs.push({
        image_url: imageUrl,
        clip_url: clipUrl,
        image_prompt_used: imagePromptUsed,
        motion_prompt_used: motionPromptUsed,
        lora_config: loraConfigs,
        visual_style: visualStyle,
        video_style: videoStyle,
        video_model: videoModel,
      });

      // ── Per-scene checkpoint write ─────────────────────────────────────────────
      await updateJob({
        step_results: Object.fromEntries(
          sceneInputs.map((s, idx) => [`scene_${idx}`, {
            image_url: s.image_url,
            clip_url: s.clip_url,
            completed_at: new Date().toISOString(),
          }])
        ),
      });

      console.log(`[shortsPipeline] Scene ${i + 1}/${scriptResult.scenes.length} complete`);
    }

    // ── Step 6: Generate Music ────────────────────────────────────────────────────
    currentStep = 'generating_music';
    currentModel = 'minimax-music';
    let musicUrl;
    await updateJob({ current_step: 'generating_music', completed_steps: 5 });
    console.log('[shortsPipeline] Step 6: Generating background music');

    const musicMood = scriptResult.music_mood || nicheTemplate?.music_mood || 'upbeat background music';
    const totalDuration = video_length_preset || nicheTemplate?.total_duration_seconds || 60;

    musicUrl = await withRetry(
      () => generateMusic(musicMood, totalDuration + 5, keys, supabase),
      { maxAttempts: 2, baseDelayMs: 5000 }
    );

    if (musicUrl) {
      logCost({
        username: brand_username,
        category: 'fal',
        operation: 'shorts_music',
        model: 'minimax-music',
        metadata: { track_count: 1 },
      });
    }

    // ── Step 7: Assemble Video ────────────────────────────────────────────────────
    currentStep = 'assembling_video';
    currentModel = null;
    let assembledVideoUrl;
    await updateJob({ current_step: 'assembling_video', completed_steps: 6 });
    console.log('[shortsPipeline] Step 7: Assembling video (clips + voiceover + music)');

    assembledVideoUrl = await assembleShort(sceneClips, voiceoverUrl, musicUrl, keys.falKey, supabase);

    // ── Step 8: Burn Captions ─────────────────────────────────────────────────────
    currentStep = 'burning_captions';
    let captionedVideoUrl;
    await updateJob({ current_step: 'burning_captions', completed_steps: 7 });
    console.log(`[shortsPipeline] Step 8: Burning captions (style: ${captionStyle})`);

    captionedVideoUrl = await burnCaptions(
      assembledVideoUrl,
      wordTimestamps,
      keys.falKey,
      supabase,
      captionStyle,
      wordsPerChunk,
    );

    // ── Step 9: Finalize ───────────────────────────────────────────────────────────
    currentStep = 'finalizing';
    await updateJob({ current_step: 'finalizing', completed_steps: 8 });
    console.log('[shortsPipeline] Step 9: Saving ad_draft and finalizing');

    const { error: draftError } = await supabase.from('ad_drafts').insert({
      campaign_id: campaignId,
      user_id: userId,
      brand_username,
      content_type: 'shorts',
      aspect_ratio: '9:16',
      generation_status: 'ready',
      assets_json: {
        final_video_url: captionedVideoUrl,
        video_url: assembledVideoUrl,
      },
      voiceover_url: voiceoverUrl,
      word_timestamps_json: wordTimestamps,
      captioned_video_url: captionedVideoUrl,
      scene_inputs_json: sceneInputs,
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
        caption_style: captionStyle,
        music_url: musicUrl,
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
      completed_steps: 9,
      workflow_state: 'completed',
      output_json: {
        campaign_id: campaignId,
        video_url: captionedVideoUrl,
        title: scriptResult.title,
        niche,
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
