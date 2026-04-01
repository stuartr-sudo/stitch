/**
 * Shorts Pipeline V3 — TTS-first architecture for framework-driven Shorts generation.
 *
 * Steps:
 *  0. Load framework
 *  1. Generate narrative (replaces generateScript)
 *  2. Generate TTS voiceover (single continuous track)
 *  3. Extract word timestamps (Whisper)
 *  4. Align blocks (TTS-first duration alignment)
 *  5. Direct scenes (keyframe image prompts)
 *  6. Generate assets (images + videos + music in parallel)
 *  7. Validate assembly timing
 *  8. Assemble video
 *  9. Burn captions
 * 10. Save draft
 */

// New V3 imports
import { generateNarrative } from './narrativeGenerator.js';
import { directScenes } from './sceneDirector.js';
import { composePrompts, composeIndependentPrompt, composeVideoPrompt } from './visualPromptComposer.js';
import { getWordTimestamps } from './getWordTimestamps.js';
import { alignBlocks } from './blockAligner.js';
import { validateAssemblyTiming } from './assemblyValidator.js';

// Keep these existing imports
import { generateVoiceover, generateGeminiVoiceover } from './voiceoverGenerator.js';
import { burnCaptions } from './captionBurner.js';
import { generateImageV2, animateImageV2 } from './mediaGenerator.js';
import { VIDEO_MODELS, veoDuration } from './modelRegistry.js';
import { solveDurations } from './durationSolver.js';
import { generateMusic, assembleShort, buildMusicPrompt, uploadUrlToSupabase, pollFalQueue, extractLastFrame } from './pipelineHelpers.js';
import { getVisualStyleSuffix, getImageStrategy } from './visualStyles.js';
import { getFramework } from './videoStyleFrameworks.js';
import { withRetry } from './retryHelper.js';
import { logCost } from './costLogger.js';
import { saveToLibrary } from './librarySave.js';
import { writeMediaMetadata } from './mediaMetadata.js';
import { processNextBatchJob } from './batchProcessor.js';

/**
 * Transform descriptive ttsPacing into imperative TTS style instructions.
 * Gemini TTS needs directives like "Speak slowly" not adjectives like "Slow, reflective".
 */
function buildTtsStyleInstructions(ttsPacing) {
  if (!ttsPacing) return 'Speak in a warm, conversational tone at a natural pace.';

  const parts = [];
  const lower = ttsPacing.toLowerCase();

  if (lower.includes('slow')) parts.push('Speak slowly with deliberate pacing');
  else if (lower.includes('fast') || lower.includes('punchy') || lower.includes('rapid')) parts.push('Speak at a brisk, energetic pace');
  else if (lower.includes('measured') || lower.includes('methodical')) parts.push('Speak at a measured, steady pace');
  else parts.push('Speak at a natural conversational pace');

  if (lower.includes('whisper')) parts.push('lower your voice to a near-whisper in tense moments');
  if (lower.includes('dread') || lower.includes('eerie') || lower.includes('haunting') || lower.includes('dark')) parts.push('use a dark, unsettling tone');
  if (lower.includes('reflective') || lower.includes('thoughtful')) parts.push('sound reflective and contemplative');
  if (lower.includes('conversational') || lower.includes('casual') || lower.includes('warm')) parts.push('keep a warm, conversational feel');
  if (lower.includes('authoritative') || lower.includes('confident') || lower.includes('bold')) parts.push('sound authoritative and confident');
  if (lower.includes('excited') || lower.includes('enthusiastic') || lower.includes('energetic')) parts.push('sound genuinely excited and enthusiastic');
  if (lower.includes('dramatic') || lower.includes('intense')) parts.push('add dramatic weight to key phrases');
  if (lower.includes('storytelling') || lower.includes('narrator')) parts.push('narrate like you are telling a captivating story');
  if (lower.includes('documentary')) parts.push('use a documentary narrator voice');
  if (lower.includes('conspiratorial')) parts.push('lean in like you are sharing a secret');
  if (lower.includes('provocative') || lower.includes('debunking')) parts.push('sound provocative and challenging');
  if (lower.includes('teacher') || lower.includes('educational') || lower.includes('coach')) parts.push('sound like an engaging teacher explaining something fascinating');

  if (lower.includes('building') || lower.includes('builds')) parts.push('gradually build energy and intensity toward the end');
  if (lower.includes('peak energy')) parts.push('hit peak energy at the climactic moment');

  parts.push('Do not drag words out or over-enunciate. Keep delivery crisp even when slow.');

  return parts.join('. ') + '.';
}

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
    const effectiveMusicVolume = framework?.musicVolume ?? 0.15;

    // Use caption_config (object) if provided, fall back to caption_style (string)
    const effectiveCaptionConfig = captionConfig || captionStyle;

    if (framework) {
      console.log(`[shortsPipeline] Framework: ${framework.name} (${frameworkId}), ttsMode=${framework.ttsMode}, musicVolume=${effectiveMusicVolume}`);
    }

    const useGemini = !!gemini_voice;
    const hasLoras = Array.isArray(loraConfigs) && loraConfigs.length > 0;
    const resolvedImageModel = image_model || (hasLoras ? 'fal_flux' : (framework?.defaults?.imageModel || undefined));
    let characterRef = null;

    if (hasLoras) {
      console.log(`[shortsPipeline] LoRA mode: ${loraConfigs.length} LoRA(s) active`);
      loraConfigs.forEach((c, i) =>
        console.log(`  LoRA ${i + 1}: ${c.triggerWord || '(no trigger)'} @ scale ${c.scale}`)
      );
    }

    // ── Step 1: Generate Narrative ──────────────────────────────────────────────
    currentStep = 'generating_narrative';
    await updateJob({ current_step: 'generating_narrative', completed_steps: 0 });

    let narrativeResult;
    if (prebuiltScript) {
      if (typeof prebuiltScript === 'string') {
        console.log(`[shortsPipeline] Step 1: Building narrative from prebuilt text (${prebuiltScript.length} chars)`);
        narrativeResult = await generateNarrative({
          niche, topic: prebuiltScript, nicheTemplate, framework,
          targetDurationSeconds: video_length_preset, storyContext,
          keys, brandUsername: brand_username,
        });
        narrativeResult.narration_full = prebuiltScript;
      } else {
        console.log(`[shortsPipeline] Step 1: Using prebuilt script object`);
        narrativeResult = prebuiltScript;
        if (!narrativeResult.narration_full && narrativeResult.scenes) {
          narrativeResult.narration_full = narrativeResult.scenes
            .map(s => s.narration_segment || s.narration || '').filter(Boolean).join(' ');
        }
        if (!narrativeResult.title) narrativeResult.title = topic || 'Untitled Short';
        if (!narrativeResult.hook_line) narrativeResult.hook_line = narrativeResult.narration_full?.split(/[.!?]/)?.[0] || '';
      }
    } else {
      console.log(`[shortsPipeline] Step 1: Generating narrative niche="${niche}" topic="${topic || 'auto'}"${framework ? ` framework="${frameworkId}"` : ''}`);
      narrativeResult = await generateNarrative({
        niche, topic, nicheTemplate, framework,
        targetDurationSeconds: video_length_preset, storyContext,
        keys, brandUsername: brand_username,
      });
    }
    console.log(`[shortsPipeline] Narrative: "${narrativeResult.title}" — ${narrativeResult.narration_full?.split(/\s+/).length} words`);

    // ── Step 2: Generate TTS Voiceover ──────────────────────────────────────────
    currentStep = 'generating_voiceover';
    await updateJob({ current_step: 'generating_voiceover', completed_steps: 1 });

    const fullNarration = narrativeResult.narration_full || narrativeResult.scenes
      .map(s => s.narration_segment || '').filter(Boolean).join(' ');

    let voiceoverUrl = null;
    const ttsStyleInstructions = framework?.tts?.styleInstructions
      || style_instructions
      || buildTtsStyleInstructions(framework?.ttsPacing);

    if (useGemini) {
      console.log(`[shortsPipeline] Step 2: Generating Gemini voiceover (${fullNarration.length} chars, voice=${gemini_voice})`);
      voiceoverUrl = await withRetry(
        () => generateGeminiVoiceover(fullNarration, keys, supabase, {
          voice: gemini_voice || framework?.tts?.defaultVoice || 'Kore',
          model: gemini_model || 'gemini-2.5-flash-tts',
          styleInstructions: ttsStyleInstructions,
        }),
        { maxAttempts: 2, baseDelayMs: 3000 }
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
        { maxAttempts: 2, baseDelayMs: 3000 }
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

    // ── Step 3: Extract Word Timestamps ─────────────────────────────────────────
    currentStep = 'analyzing_voiceover';
    await updateJob({ current_step: 'analyzing_voiceover', completed_steps: 2 });

    let wordTimestamps = null;
    let ttsDuration = video_length_preset;

    try {
      console.log('[shortsPipeline] Step 3: Extracting word timestamps via Whisper...');
      const tsResult = await withRetry(
        () => getWordTimestamps(voiceoverUrl, keys.falKey),
        { maxAttempts: 2, baseDelayMs: 3000 }
      );
      wordTimestamps = tsResult.words;
      ttsDuration = tsResult.totalDuration;
      console.log(`[shortsPipeline] Whisper: ${tsResult.wordCount} words, ${ttsDuration.toFixed(1)}s total`);
      logCost({ username: brand_username, category: 'fal', operation: 'shorts_whisper_timestamps', model: 'whisper-v3', metadata: { word_count: tsResult.wordCount } });
    } catch (whisperErr) {
      console.warn(`[shortsPipeline] Whisper failed, using framework durations: ${whisperErr.message}`);
    }

    // ── Step 4: Align Blocks ────────────────────────────────────────────────────
    currentStep = 'aligning_blocks';
    await updateJob({ current_step: 'aligning_blocks', completed_steps: 3 });

    const frameworkScenes = framework?.sceneStructure[video_length_preset]
      || framework?.sceneStructure[framework?.supportedDurations[0]]
      || null;

    let alignedBlocks;

    if (wordTimestamps && wordTimestamps.length > 0) {
      console.log(`[shortsPipeline] Step 4: Aligning blocks (TTS-first, model=${videoModel})`);
      const alignment = alignBlocks(wordTimestamps, ttsDuration, videoModel || 'fal_kling', frameworkScenes);
      alignedBlocks = alignment.blocks;
      console.log(`[shortsPipeline] ${alignedBlocks.length} blocks, ${alignment.totalClipDuration}s clips, drift ${alignment.drift.toFixed(1)}s`);
    } else {
      console.log('[shortsPipeline] Step 4: Fallback — using framework durations');
      const durationRanges = frameworkScenes?.map(s => s.durationRange) || [[4, 8]];
      const lockedDurations = solveDurations(video_length_preset, durationRanges, videoModel || 'fal_kling');
      alignedBlocks = lockedDurations.map((dur, i) => ({
        clipDuration: dur,
        startTime: lockedDurations.slice(0, i).reduce((a, b) => a + b, 0),
        endTime: lockedDurations.slice(0, i + 1).reduce((a, b) => a + b, 0),
        narration: narrativeResult.scenes?.[i]?.narration_segment || '',
        frameworkLabel: frameworkScenes?.[i]?.label || null,
        frameworkBeat: frameworkScenes?.[i]?.beat || null,
      }));
    }

    // ── Step 5: Direct Scenes ───────────────────────────────────────────────────
    currentStep = 'directing_scenes';
    await updateJob({ current_step: 'directing_scenes', completed_steps: 4 });

    // TEST MODE: cap scenes for cheap test runs (remove after verification)
    const TEST_MAX_SCENES = parseInt(process.env.TEST_MAX_SCENES || '0', 10);
    if (TEST_MAX_SCENES > 0 && alignedBlocks.length > TEST_MAX_SCENES) {
      console.log(`[shortsPipeline] TEST MODE: capping ${alignedBlocks.length} scenes to ${TEST_MAX_SCENES}`);
      alignedBlocks.length = TEST_MAX_SCENES;
    }
    const sceneCount = alignedBlocks.length;
    console.log(`[shortsPipeline] Step 5: Generating ${sceneCount + 1} keyframe prompts for ${sceneCount} scenes`);
    const { keyframes, mode: directionMode } = await directScenes({
      narrative: narrativeResult,
      alignedBlocks,
      framework,
      visualStyle,
      visualStylePrompt,
      videoStyle,
      visualDirections: null,
      keys,
      brandUsername: brand_username,
    });
    const useI2IChain = directionMode === 'continuous';
    console.log(`[shortsPipeline] Direction mode: ${directionMode}, I2I chain: ${useI2IChain}`);

    // ── Step 6: Generate Assets (3 parallel phases) ─────────────────────────────
    currentStep = 'generating_assets';
    await updateJob({ current_step: 'generating_assets', completed_steps: 5 });

    // Phase C: Music (launches first, only needs TTS duration)
    const musicMoodPrompt = buildMusicPrompt(
      framework?.music || framework?.musicMood || nicheTemplate?.music_mood,
      framework?.category
    );
    const musicPromise = enableBackgroundMusic
      ? withRetry(
          () => generateMusic(musicMoodPrompt, Math.ceil(ttsDuration) + 3, keys, supabase, 'beatoven'),
          { maxAttempts: 2, baseDelayMs: 5000 }
        ).catch(err => { console.warn('[shortsPipeline] Music failed:', err.message); return null; })
      : Promise.resolve(null);

    // Determine generation mode: V3 (FLF) or V2 (extract-last-frame)
    const FIRST_LAST_FRAME_MODELS = ['fal_veo3', 'fal_kling_o3', 'fal_kling_v3'];
    const useFirstLastFrame = FIRST_LAST_FRAME_MODELS.includes(videoModel || 'fal_veo3');
    const generationMode = useFirstLastFrame ? 'v3_flf' : 'v2_extract';
    console.log(`[shortsPipeline] Generation mode: ${generationMode} (model=${videoModel})`);

    const keyframeImageUrls = new Array(sceneCount + 1).fill(null);
    const sceneAssets = [];
    const clips = [];

    if (useFirstLastFrame) {
    // ═══ V3 PATH: keyframe generation → parallel FLF video ═══

    // I2I helper — uses nano-banana-2/edit (synchronous, accepts image_urls + prompt)
    const i2iAspectMap = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1', '4:3': '4:3', '3:4': '3:4' };
    async function generateI2I(referenceImageUrl, prompt, ar) {
      const res = await fetch('https://fal.run/fal-ai/nano-banana-2/edit', {
        method: 'POST',
        headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_urls: [referenceImageUrl],
          prompt,
          aspect_ratio: i2iAspectMap[ar] || '9:16',
          resolution: '1K',
          num_images: 1,
        }),
      });
      if (!res.ok) throw new Error(`I2I generation failed: ${await res.text()}`);
      const data = await res.json();
      const imgUrl = data.images?.[0]?.url;
      if (!imgUrl) throw new Error('No image URL from I2I result');
      return uploadUrlToSupabase(imgUrl, supabase, 'pipeline/images');
    }

    if (useI2IChain) {
    // ═══ CONTINUOUS: Sequential I2I keyframe chain ═══

    // Step 1: Scene 1 FIRST frame (T2I or starting_image)
    if (starting_image) {
      keyframeImageUrls[0] = starting_image;
      console.log(`[shortsPipeline] KF[0] Scene 1 FIRST: using starting_image`);
    } else {
      const { imagePrompt: prompt0 } = composePrompts({
        sceneDirection: { imagePrompt: keyframes[0].imagePrompt, motionPrompt: keyframes[0].motionHint },
        visualStyle, visualStylePrompt, videoStyle,
        frameworkDefaults: framework?.sceneDefaults,
        aspectRatio, loraConfigs,
        isFirstScene: true, frameChain: false,
      });
      keyframeImageUrls[0] = await withRetry(
        () => generateImageV2(resolvedImageModel || 'fal_flux', prompt0, aspectRatio, keys, supabase, {
          loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
        }),
        { maxAttempts: 2, baseDelayMs: 2000 }
      ).catch(err => { console.error(`[shortsPipeline] KF[0] T2I failed: ${err.message}`); return null; });
      console.log(`[shortsPipeline] KF[0] Scene 1 FIRST: ${keyframeImageUrls[0] ? 'OK' : 'FAILED'}`);
    }

    // Step 2: Sequential I2I chain — each scene's LAST frame from its FIRST frame
    // KF[1] = Scene 1 LAST (I2I from KF[0]) = Scene 2 FIRST
    // KF[2] = Scene 2 LAST (I2I from KF[1]) = Scene 3 FIRST
    // ...
    // KF[N] = Scene N LAST (I2I from KF[N-1])
    for (let k = 1; k <= sceneCount; k++) {
      const prevImage = keyframeImageUrls[k - 1];
      if (!prevImage) {
        console.error(`[shortsPipeline] KF[${k}]: chain broken (no KF[${k - 1}]), falling back to T2I`);
        const { imagePrompt: fallbackPrompt } = composePrompts({
          sceneDirection: { imagePrompt: keyframes[k].imagePrompt, motionPrompt: keyframes[k].motionHint },
          visualStyle, visualStylePrompt, videoStyle,
          frameworkDefaults: framework?.sceneDefaults,
          aspectRatio, loraConfigs,
          isFirstScene: false, frameChain: false,
        });
        keyframeImageUrls[k] = await withRetry(
          () => generateImageV2(resolvedImageModel || 'fal_flux', fallbackPrompt, aspectRatio, keys, supabase, {
            loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
          }),
          { maxAttempts: 2, baseDelayMs: 2000 }
        ).catch(err => { console.error(`[shortsPipeline] KF[${k}] T2I fallback failed: ${err.message}`); return null; });
      } else {
        const { imagePrompt: i2iPrompt } = composePrompts({
          sceneDirection: { imagePrompt: keyframes[k].imagePrompt, motionPrompt: keyframes[k].motionHint },
          visualStyle, visualStylePrompt, videoStyle,
          frameworkDefaults: framework?.sceneDefaults,
          aspectRatio, loraConfigs,
          isFirstScene: false, frameChain: true,
        });
        keyframeImageUrls[k] = await withRetry(
          () => generateI2I(prevImage, i2iPrompt, aspectRatio),
          { maxAttempts: 2, baseDelayMs: 2000 }
        ).catch(err => { console.error(`[shortsPipeline] KF[${k}] I2I failed: ${err.message}`); return null; });
      }
      console.log(`[shortsPipeline] KF[${k}] Scene ${k} LAST / Scene ${k + 1} FIRST: ${keyframeImageUrls[k] ? 'OK' : 'FAILED'}`);
    }

    characterRef = keyframeImageUrls[0];

    } else {
    // ═══ INDEPENDENT: T2I per scene — no I2I chain ═══
    console.log(`[shortsPipeline] Phase A (independent): Generating ${sceneCount} first + last frames via T2I in parallel`);

    // Generate all first-frame images in parallel
    const firstFramePromises = alignedBlocks.map((block, i) => {
      const { imagePrompt, negativePrompt } = composeIndependentPrompt({
        sceneDirection: { imagePrompt: keyframes[i].imagePrompt, motionHint: keyframes[i].motionHint },
        visualStyle, visualStylePrompt, videoStyle,
        frameworkDefaults: framework?.sceneDefaults,
        aspectRatio, loraConfigs,
      });

      return withRetry(
        () => generateImageV2(resolvedImageModel || 'fal_flux', imagePrompt, aspectRatio, keys, supabase, {
          loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
        }),
        { maxAttempts: 2, baseDelayMs: 2000 }
      ).catch(err => {
        console.error(`[shortsPipeline] Independent scene ${i + 1} first frame failed: ${err.message}`);
        return null;
      });
    });

    const firstResults = await Promise.allSettled(firstFramePromises);
    for (let i = 0; i < alignedBlocks.length; i++) {
      keyframeImageUrls[i] = firstResults[i].status === 'fulfilled' ? firstResults[i].value : null;
    }

    // Generate all last-frame images in parallel (independent T2I, NOT I2I from first)
    const lastFramePromises = alignedBlocks.map((block, i) => {
      if (!keyframeImageUrls[i]) return Promise.resolve(null);

      const nextKfPrompt = keyframes[i + 1]?.imagePrompt || keyframes[i].imagePrompt;
      const { imagePrompt: lastPrompt } = composeIndependentPrompt({
        sceneDirection: { imagePrompt: nextKfPrompt, motionHint: '' },
        visualStyle, visualStylePrompt, videoStyle,
        frameworkDefaults: framework?.sceneDefaults,
        aspectRatio, loraConfigs,
      });

      return withRetry(
        () => generateImageV2(resolvedImageModel || 'fal_flux', lastPrompt, aspectRatio, keys, supabase, {
          loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
        }),
        { maxAttempts: 2, baseDelayMs: 2000 }
      ).catch(err => {
        console.error(`[shortsPipeline] Independent scene ${i + 1} last frame failed: ${err.message}`);
        return null;
      });
    });

    const lastResults = await Promise.allSettled(lastFramePromises);
    for (let i = 0; i < alignedBlocks.length; i++) {
      keyframeImageUrls[i + 1] = lastResults[i].status === 'fulfilled' ? lastResults[i].value : null;
    }

    characterRef = keyframeImageUrls[0];
    console.log(`[shortsPipeline] Independent frames: ${keyframeImageUrls.filter(Boolean).length}/${keyframeCount} generated`);
    } // end useI2IChain

    await updateJob({
      step_results: {
        keyframe_images: keyframeImageUrls.map((url, i) => ({ index: i, url, prompt: keyframes[i].imagePrompt })),
      },
    });

    // Phase B: FLF video clips — all fire in parallel
      console.log(`[shortsPipeline] Phase B (V3): Firing ${sceneCount} first-last-frame videos IN PARALLEL (model=${videoModel})`);
      const isVeo = (videoModel || 'fal_veo3') === 'fal_veo3';
      const veoClampDuration = (dur) => dur <= 4 ? '4s' : dur <= 6 ? '6s' : '8s';
      const klingDuration = (dur) => String(Math.max(3, Math.min(15, Math.round(dur))));

      const videoPromises = alignedBlocks.map((block, i) => {
        const firstImg = keyframeImageUrls[i];
        const lastImg = keyframeImageUrls[i + 1];

        if (!firstImg || !lastImg) {
          console.warn(`[shortsPipeline] Scene ${i + 1}: missing keyframe image (first=${!!firstImg}, last=${!!lastImg}), skipping`);
          return Promise.resolve(null);
        }

        const motionPrompt = keyframes[i].motionHint || 'Smooth cinematic transition';
        const { motionPrompt: composedMotion } = composePrompts({
          sceneDirection: { imagePrompt: keyframes[i].imagePrompt, motionPrompt },
          visualStyle,
          visualStylePrompt,
          videoStyle,
          frameworkDefaults: framework?.sceneDefaults,
          aspectRatio,
          loraConfigs,
          isFirstScene: i === 0,
          frameChain: false,
        });

        const prompt = composeVideoPrompt(keyframes[i].imagePrompt, composedMotion || motionPrompt, { videoStyle, isFLF: true });

        let endpoint, body;
        if (isVeo) {
          endpoint = 'fal-ai/veo3.1/fast/first-last-frame-to-video';
          body = {
            prompt,
            first_frame_url: firstImg,
            last_frame_url: lastImg,
            aspect_ratio: aspectRatio || '9:16',
            duration: veoClampDuration(block.clipDuration),
            resolution: '720p',
            generate_audio: false,
            safety_tolerance: '6',
            auto_fix: true,
          };
        } else {
          // Kling O3/V3
          const model = VIDEO_MODELS?.[videoModel];
          endpoint = model?.endpoint || 'fal-ai/kling-video/o3/pro/image-to-video';
          const isKlingV3 = videoModel === 'fal_kling_v3';
          body = {
            prompt,
            // Kling V3 uses start_image_url, Kling O3 uses image_url
            ...(isKlingV3 ? { start_image_url: firstImg } : { image_url: firstImg }),
            end_image_url: lastImg,
            aspect_ratio: aspectRatio || '9:16',
            duration: klingDuration(block.clipDuration),
            generate_audio: false,
          };
        }

        return withRetry(async () => {
          const submitRes = await fetch(`https://queue.fal.run/${endpoint}`, {
            method: 'POST',
            headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!submitRes.ok) {
            const errText = await submitRes.text();
            throw new Error(`FLF submit failed (scene ${i + 1}, ${videoModel}): ${errText}`);
          }
          const queueData = await submitRes.json();
          const result = await pollFalQueue(queueData.response_url || queueData.status_url || queueData.request_id, endpoint, keys.falKey);
          const videoUrl = result?.video?.url;
          if (!videoUrl) throw new Error(`No video URL in FLF result for scene ${i + 1}`);
          return uploadUrlToSupabase(videoUrl, supabase, 'pipeline/scenes');
        }, { maxAttempts: 2, baseDelayMs: 5000 }).catch(err => {
          console.error(`[shortsPipeline] Scene ${i + 1} first-last-frame failed: ${err.message}`);
          return { error: err.message };
        });
      });

      const videoResults = await Promise.allSettled(videoPromises);

      for (let i = 0; i < alignedBlocks.length; i++) {
        const block = alignedBlocks[i];
        const raw = videoResults[i].status === 'fulfilled' ? videoResults[i].value : null;
        const clipUrl = (raw && typeof raw === 'string') ? raw : null;
        const sceneError = raw?.error || (videoResults[i].status === 'rejected' ? videoResults[i].reason?.message : null);

        clips.push({
          url: clipUrl,
          firstFrameUrl: keyframeImageUrls[i],
          lastFrameUrl: keyframeImageUrls[i + 1],
          imageUrl: keyframeImageUrls[i],
        });

        sceneAssets.push({
          image_url: keyframeImageUrls[i],
          video_url: clipUrl,
          first_frame_url: keyframeImageUrls[i],
          last_frame_url: keyframeImageUrls[i + 1],
          voiceover_url: voiceoverUrl,
          clip_duration: block.clipDuration,
          start_time: block.startTime, end_time: block.endTime,
          narration: block.narration, framework_label: block.frameworkLabel,
          ...(sceneError && { error: sceneError }),
        });
      }

      console.log(`[shortsPipeline] Phase B complete: ${clips.filter(c => c.url).length}/${sceneCount} videos generated`);

    } else {
      // V2 PATH: Sequential I2V with last-frame extraction for non-FLF models
      // Flow: generate image → animate → extract last frame → use as next scene's image → repeat
      // Fully sequential — each scene depends on the previous scene's video
      console.log(`[shortsPipeline] Phase A+B (V2): Sequential I2V + extract-last-frame — model ${videoModel}`);

      let currentImage = null;

      // Scene 1 image: T2I or starting_image
      if (starting_image) {
        currentImage = starting_image;
        console.log(`[shortsPipeline] V2 Scene 1 image: using starting_image`);
      } else {
        const { imagePrompt: prompt0 } = composePrompts({
          sceneDirection: { imagePrompt: keyframes[0].imagePrompt, motionPrompt: keyframes[0].motionHint },
          visualStyle, visualStylePrompt, videoStyle,
          frameworkDefaults: framework?.sceneDefaults,
          aspectRatio, loraConfigs,
          isFirstScene: true, frameChain: false,
        });
        currentImage = await withRetry(
          () => generateImageV2(resolvedImageModel || 'fal_flux', prompt0, aspectRatio, keys, supabase, {
            loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
          }),
          { maxAttempts: 2, baseDelayMs: 2000 }
        ).catch(err => { console.error(`[shortsPipeline] V2 Scene 1 image failed: ${err.message}`); return null; });
        console.log(`[shortsPipeline] V2 Scene 1 image: ${currentImage ? 'OK' : 'FAILED'}`);
      }

      // Override keyframeImageUrls[0] for checkpoint data
      keyframeImageUrls[0] = currentImage;
      characterRef = currentImage;

      for (let i = 0; i < alignedBlocks.length; i++) {
        const block = alignedBlocks[i];
        currentSceneIndex = i;

        let clipUrl = null;
        let lastFrameUrl = null;
        let sceneError = null;
        const sceneFirstFrame = currentImage;

        if (!currentImage) {
          console.error(`[shortsPipeline] V2 Scene ${i + 1}: no image, attempting T2I fallback`);
          const { imagePrompt: fallbackPrompt } = composePrompts({
            sceneDirection: { imagePrompt: keyframes[i].imagePrompt, motionPrompt: keyframes[i].motionHint },
            visualStyle, visualStylePrompt, videoStyle,
            frameworkDefaults: framework?.sceneDefaults,
            aspectRatio, loraConfigs,
            isFirstScene: i === 0, frameChain: false,
          });
          currentImage = await withRetry(
            () => generateImageV2(resolvedImageModel || 'fal_flux', fallbackPrompt, aspectRatio, keys, supabase, {
              loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
            }),
            { maxAttempts: 2, baseDelayMs: 2000 }
          ).catch(err => { console.error(`[shortsPipeline] V2 Scene ${i + 1} T2I fallback failed: ${err.message}`); return null; });
        }

        if (currentImage) {
          try {
            const motionPrompt = keyframes[i].motionHint || 'Smooth cinematic movement';
            const { motionPrompt: composedMotion } = composePrompts({
              sceneDirection: { imagePrompt: keyframes[i].imagePrompt, motionPrompt },
              visualStyle, visualStylePrompt, videoStyle,
              frameworkDefaults: framework?.sceneDefaults,
              aspectRatio, loraConfigs,
              isFirstScene: i === 0, frameChain: i > 0,
            });

            const fullPrompt = composeVideoPrompt(keyframes[i].imagePrompt, composedMotion || motionPrompt, { videoStyle });

            currentModel = videoModel;
            clipUrl = await withRetry(
              () => animateImageV2(videoModel || 'fal_kling', currentImage, fullPrompt, aspectRatio, block.clipDuration, keys, supabase, {
                loras: loraConfigs, generate_audio: false,
              }),
              { maxAttempts: 2, baseDelayMs: 5000 }
            );

            // Extract last frame → becomes next scene's starting image
            if (clipUrl && i < alignedBlocks.length - 1) {
              lastFrameUrl = await extractLastFrame(clipUrl, block.clipDuration, keys.falKey);
              if (lastFrameUrl) {
                lastFrameUrl = await uploadUrlToSupabase(lastFrameUrl, supabase, 'pipeline/images');
              }
              console.log(`[shortsPipeline] V2 Scene ${i + 1}: last frame extracted: ${lastFrameUrl ? 'OK' : 'FAILED'}`);
            }
          } catch (sceneErr) {
            console.error(`[shortsPipeline] V2 Scene ${i + 1} failed: ${sceneErr.message}`);
            sceneError = sceneErr.message;
          }
        }

        clips.push({
          url: clipUrl,
          firstFrameUrl: sceneFirstFrame,
          lastFrameUrl: lastFrameUrl,
          imageUrl: sceneFirstFrame,
        });

        sceneAssets.push({
          image_url: sceneFirstFrame,
          video_url: clipUrl,
          first_frame_url: sceneFirstFrame,
          last_frame_url: lastFrameUrl,
          voiceover_url: voiceoverUrl,
          clip_duration: block.clipDuration,
          start_time: block.startTime, end_time: block.endTime,
          narration: block.narration, framework_label: block.frameworkLabel,
          ...(sceneError && { error: sceneError }),
        });

        // Chain: next scene's image = this scene's last frame
        currentImage = lastFrameUrl || null;

        console.log(`[shortsPipeline] V2 Scene ${i + 1}/${sceneCount} complete`);
      }
    }

    // Checkpoint all scene assets
    await updateJob({
      step_results: Object.fromEntries(
        sceneAssets.map((s, idx) => [`scene_${idx}`, { ...s, completed_at: new Date().toISOString() }])
      ),
    });

    // Await music
    const musicUrl = await musicPromise;

    if (musicUrl) {
      logCost({
        username: brand_username,
        category: 'fal',
        operation: 'shorts_music',
        model: 'beatoven',
        metadata: { track_count: 1 },
      });
      autoSave(supabase, userId, userEmail, {
        url: musicUrl, type: 'video',
        title: `[Short] ${topic} - Music`,
        source: 'shorts',
        model_name: 'Beatoven',
        short_name: topic || null,
      });
    }

    // ── Step 7: Validate Assembly ───────────────────────────────────────────────
    currentStep = 'validating_assembly';
    await updateJob({ current_step: 'validating_assembly', completed_steps: 7 });

    const validClips = clips.filter(c => c.url);
    if (validClips.length === 0) throw new Error('All scenes failed — no video clips generated');

    const validation = validateAssemblyTiming({
      sceneResults: sceneAssets.map(s => ({ clipDuration: s.clip_duration, videoUrl: s.video_url })),
      ttsAudioDuration: ttsDuration,
      musicDuration: null,
    });

    if (!validation.valid) {
      console.warn(`[shortsPipeline] Assembly validation issues: ${validation.issues.join('; ')}`);
    }

    // ── Step 8: Assemble Video ──────────────────────────────────────────────────
    currentStep = 'assembling_video';
    currentModel = null;
    let assembledVideoUrl;
    await updateJob({ current_step: 'assembling_video', completed_steps: 8 });

    // Filter clipDurations in sync with validClipUrls so timing stays aligned
    const validClipData = clips.map((c, i) => c.url ? { url: c.url, duration: alignedBlocks[i].clipDuration } : null).filter(Boolean);
    const validClipUrls = validClipData.map(c => c.url);
    const clipDurations = validClipData.map(c => c.duration);
    console.log(`[shortsPipeline] Step 8: Assembling video (${validClipUrls.length} clips + voiceover${musicUrl ? ` + music vol=${effectiveMusicVolume}` : ''})`);

    assembledVideoUrl = await assembleShort(validClipUrls, voiceoverUrl, musicUrl, keys.falKey, supabase, clipDurations, effectiveMusicVolume, ttsDuration);

    autoSave(supabase, userId, userEmail, {
      url: assembledVideoUrl, type: 'video',
      title: `[Short] ${topic} - Final`,
      source: 'shorts',
      video_style: framework?.name || frameworkId || null,
      visual_style: visualStyle || null,
      model_name: videoModel || null,
      short_name: topic || null,
    });

    // ── Step 9: Burn Captions ───────────────────────────────────────────────────
    currentStep = 'burning_captions';
    let captionedVideoUrl;
    await updateJob({ current_step: 'burning_captions', completed_steps: 9 });

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

    // ── Step 10: Finalize ───────────────────────────────────────────────────────
    currentStep = 'finalizing';
    await updateJob({ current_step: 'finalizing', completed_steps: 10 });
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
      storyboard_json: {
        scenes: alignedBlocks,
      },
      shorts_metadata_json: {
        narrative: narrativeResult,
        script: narrativeResult,     // backward compat alias
        scenes: alignedBlocks,
        keyframes: keyframes.map((kf, i) => ({
          imagePrompt: kf.imagePrompt,
          motionHint: kf.motionHint,
          imageUrl: keyframeImageUrls[i],
        })),
        hashtags: narrativeResult.hashtags,
        niche, topic,
        visual_style: visualStyle,
        video_style: videoStyle,
        video_model: videoModel,
        voice_id: voiceId,
        gemini_voice: gemini_voice || null,
        caption_config: effectiveCaptionConfig,
        music_url: musicUrl,
        framework: frameworkId || null,
        music_volume: effectiveMusicVolume,
        tts_duration: ttsDuration,
        pipeline_version: 'v3',
        generation_mode: generationMode, // 'v3_flf' or 'v2_extract'
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
        title: narrativeResult.title,
        niche,
        framework: frameworkId || null,
      },
    }).eq('id', jobId);

    await supabase.from('campaigns').update({ status: 'ready' }).eq('id', campaignId);

    console.log(`[shortsPipeline] Job ${jobId} complete — "${narrativeResult.title}" — ${captionedVideoUrl}`);

    // ── Batch completion hook ───────────────────────────────────────────────────
    const { data: completedJob } = await supabase
      .from('jobs')
      .select('batch_id')
      .eq('id', jobId)
      .single();

    if (completedJob?.batch_id) {
      // Atomic increment + completion check in one Postgres transaction
      await supabase.rpc('batch_job_finished', {
        p_batch_id: completedJob.batch_id,
        p_field: 'completed_items',
      });
      // Start next pending job (fire-and-forget)
      processNextBatchJob(completedJob.batch_id, supabase).catch(err =>
        console.error('[shortsPipeline] processNextBatchJob error:', err.message)
      );
    }

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

    // Batch hook — count as failed item, start next job
    try {
      const { data: failedJob } = await supabase
        .from('jobs')
        .select('batch_id')
        .eq('id', jobId)
        .single();

      if (failedJob?.batch_id) {
        await supabase.rpc('batch_job_finished', {
          p_batch_id: failedJob.batch_id,
          p_field: 'failed_items',
        });
        processNextBatchJob(failedJob.batch_id, supabase).catch(err =>
          console.error('[shortsPipeline] processNextBatchJob error in failure path:', err.message)
        );
      }
    } catch (batchHookErr) {
      console.error('[shortsPipeline] Batch hook error in catch block:', batchHookErr.message);
    }

    // Do NOT re-throw — the pipeline handles its own cleanup
  }
}
