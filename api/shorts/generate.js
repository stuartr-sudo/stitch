/**
 * POST /api/shorts/generate
 *
 * Faceless Shorts Factory — topic → script → voiceover → images → video → music → assembly → captions → done.
 *
 * Body: {
 *   niche: string,           // e.g. 'ai_tech_news'
 *   topic?: string,          // optional — auto-generated if omitted
 *   brand_username: string,
 *   voice_id?: string,       // ElevenLabs voice ID override
 *   visual_style?: string,   // style preset key (default: template's visual_style)
 *   caption_style?: string,  // 'word_pop' | 'karaoke_glow' | 'word_highlight'
 *   words_per_chunk?: number, // caption words per group (default: 3)
 *   lora_config?: Array<{ id, type, url, triggerWord, scale }>,  // from LoRAPicker UI
 *   script?: string,         // pre-generated narration text (from preview-script) — skips GPT script generation
 *   story_context?: string,  // optional real story context to inject into script generation
 * }
 *
 * Response: { success, jobId, poll_url }
 */

import { createClient } from '@supabase/supabase-js';
import { getShortsTemplate, listShortsNiches } from '../lib/shortsTemplates.js';
import { generateScript } from '../lib/scriptGenerator.js';
import { generateVoiceover, generateTimestamps, mapWordsToScenes } from '../lib/voiceoverGenerator.js';
import { burnCaptions } from '../lib/captionBurner.js';
import { generateImage, animateImage, generateMusic, extractLastFrame, analyzeFrameContinuity, assembleShort, selectModelForScene } from '../lib/pipelineHelpers.js';
import { getStyleSuffix } from '../lib/stylePresets.js';
import { logCost } from '../lib/costLogger.js';
import { WorkflowEngine } from '../lib/workflowEngine.js';
import { withRetry } from '../lib/retryHelper.js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';
import { resolveLoraConfigs, mapPickerToLoraConfigs } from '../lib/resolveLoraConfigs.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    niche,
    topic,
    brand_username,
    voice_id,
    visual_style,
    caption_style = 'word_pop',
    words_per_chunk = 3,
    lora_config,
    script: prebuiltScript,
    story_context,
  } = req.body;

  if (!brand_username) return res.status(400).json({ error: 'Missing brand_username' });
  if (!niche) return res.status(400).json({ error: 'Missing niche' });

  const nicheTemplate = getShortsTemplate(niche);
  if (!nicheTemplate) {
    return res.status(400).json({
      error: `Unknown niche: ${niche}`,
      available: listShortsNiches(),
    });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Resolve user_id: brand_kit → company_information → authenticated user
  const userId = await resolveUserIdFromBrand(brand_username, supabase, req.user?.id);
  if (!userId) {
    return res.status(404).json({ error: `Brand not found: ${brand_username}` });
  }

  // Try to load brand kit (optional — shorts don't strictly need it)
  const { data: brandKit } = await supabase
    .from('brand_kit')
    .select('*')
    .eq('brand_username', brand_username)
    .maybeSingle();

  // Build a minimal brandKit fallback if none exists
  const effectiveBrandKit = brandKit || { brand_username: brand_username, user_id: userId };

  // Get API keys
  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('fal_key, wavespeed_key, openai_key, elevenlabs_key')
    .eq('user_id', userId)
    .maybeSingle();

  const keys = {
    falKey: userKeys?.fal_key || process.env.FAL_KEY,
    wavespeedKey: userKeys?.wavespeed_key || process.env.WAVESPEED_KEY || process.env.WAVESPEED_API_KEY,
    openaiKey: userKeys?.openai_key || process.env.OPENAI_API_KEY,
    elevenlabsKey: userKeys?.elevenlabs_key || process.env.ELEVENLABS_API_KEY,
  };

  if (!keys.openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });
  if (!keys.elevenlabsKey) return res.status(400).json({ error: 'ElevenLabs API key required' });
  if (!keys.falKey) return res.status(400).json({ error: 'FAL API key required' });

  // Resolve LoRA configs:
  //  1. Explicit from UI (lora_config in request body)
  //  2. Fallback to brand_kit.default_loras
  let loraConfigs = [];
  if (lora_config?.length) {
    // Direct from LoRAPicker UI: [{ id, type, url, triggerWord, scale }]
    loraConfigs = mapPickerToLoraConfigs(lora_config);
    console.log(`[shorts] ${loraConfigs.length} LoRA(s) from request body`);
  } else {
    // Try brand-level defaults (resolveLoraConfigs handles null template gracefully)
    loraConfigs = await resolveLoraConfigs(null, effectiveBrandKit, supabase);
    if (loraConfigs.length) {
      console.log(`[shorts] ${loraConfigs.length} LoRA(s) from brand defaults`);
    }
  }

  // Create job record
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      type: 'shorts_generation',
      status: 'processing',
      current_step: 'generating_script',
      total_steps: 9,
      completed_steps: 0,
      input_json: { niche, topic, brand_username, voice_id, visual_style, caption_style, lora_count: loraConfigs.length, has_prebuilt_script: !!prebuiltScript },
      workflow_state: 'running',
    })
    .select()
    .single();

  if (jobErr) return res.status(500).json({ error: 'Failed to create job' });

  res.json({
    success: true,
    jobId: job.id,
    status: 'processing',
    poll_url: `/api/jobs/public-status?jobId=${job.id}`,
  });

  // Run pipeline in background
  runShortsPipeline({
    job, userId, brandKit: effectiveBrandKit, keys, niche, topic, nicheTemplate,
    voiceId: voice_id || nicheTemplate.default_voice,
    visualStyle: visual_style || nicheTemplate.visual_style,
    captionStyle: caption_style,
    wordsPerChunk: words_per_chunk,
    loraConfigs,
    prebuiltScript: prebuiltScript || null,
    storyContext: story_context || null,
    supabase,
  }).catch(async (err) => {
    console.error('[shorts/generate] Pipeline error:', err);
    await supabase.from('jobs').update({
      status: 'failed',
      error: err.message,
      workflow_state: 'failed',
    }).eq('id', job.id);
  });
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

async function runShortsPipeline({
  job, userId, brandKit, keys, niche, topic, nicheTemplate,
  voiceId, visualStyle, captionStyle, wordsPerChunk, loraConfigs,
  prebuiltScript, storyContext,
  supabase,
}) {
  const jobId = job.id;
  const updateJob = (patch) => supabase.from('jobs').update(patch).eq('id', jobId);
  const brand_username = brandKit.brand_username;

  const wf = new WorkflowEngine(jobId, supabase);
  await wf.loadState();

  const styleSuffix = getStyleSuffix(visualStyle);
  const hasLoras = loraConfigs.length > 0;

  // When LoRAs are present, force FLUX 2 model; otherwise use fal_flux as default
  const imageModel = hasLoras ? 'fal_flux' : 'fal_flux';
  const videoModel = 'fal_kling';  // default video model for shorts

  if (hasLoras) {
    console.log(`[shorts] LoRA mode: ${loraConfigs.length} LoRA(s) → using FLUX 2 for images`);
    loraConfigs.forEach((c, i) => console.log(`  LoRA ${i + 1}: ${c.triggerWord || '(no trigger)'} @ scale ${c.scale}`));
  }

  // ── Step 1: Generate Script ─────────────────────────────────────────────────
  let script;
  if (!wf.hasCompleted('generate_script')) {
    await updateJob({ current_step: 'generating_script', completed_steps: 0 });

    if (prebuiltScript) {
      // User reviewed and optionally edited the script via preview-script endpoint
      console.log(`[shorts] Step 1: Using prebuilt script (${prebuiltScript.narration_full?.length || typeof prebuiltScript === 'string' ? (typeof prebuiltScript === 'string' ? prebuiltScript.length : prebuiltScript.narration_full.length) : 0} chars)`);
      // prebuiltScript may be a full script object or just the narration string
      if (typeof prebuiltScript === 'string') {
        // narration_full override only — regenerate structured script with this narration as guidance
        script = await generateScript({
          niche,
          topic: prebuiltScript, // pass as topic so GPT uses it as the script content
          nicheTemplate,
          keys,
          brandUsername: brand_username,
          storyContext,
        });
        // Override narration_full with the user-edited text
        script.narration_full = prebuiltScript;
      } else {
        script = prebuiltScript;
      }
    } else {
      console.log(`[shorts] Step 1: Generating script for niche="${niche}" topic="${topic || 'auto'}"`);
      script = await generateScript({
        niche,
        topic,
        nicheTemplate,
        keys,
        brandUsername: brand_username,
        storyContext,
      });
    }

    await wf.transition('generate_script', { script });
  } else {
    script = wf.getStepResult('generate_script')?.script;
  }
  if (wf.isPaused) return;

  // ── Step 2: Generate Voiceover ──────────────────────────────────────────────
  let voiceoverUrl;
  if (!wf.hasCompleted('generate_voiceover')) {
    await updateJob({ current_step: 'generating_voiceover', completed_steps: 1 });
    console.log(`[shorts] Step 2: Generating voiceover (${script.narration_full.length} chars)`);

    voiceoverUrl = await withRetry(
      () => generateVoiceover(script.narration_full, keys, supabase, { voiceId }),
      { maxAttempts: 2, baseDelayMs: 3000, onRetry: (a, e) => console.warn(`[shorts] Voiceover retry ${a}: ${e.message}`) }
    );

    // Log cost
    logCost({
      username: brand_username,
      category: 'elevenlabs',
      operation: 'shorts_voiceover',
      model: 'elevenlabs-tts',
      metadata: { character_count: script.narration_full.length },
    });

    await wf.transition('generate_voiceover', { voiceoverUrl });
  } else {
    voiceoverUrl = wf.getStepResult('generate_voiceover')?.voiceoverUrl;
  }
  if (wf.isPaused) return;

  // ── Step 3: Generate Word Timestamps ────────────────────────────────────────
  let wordTimestamps, sceneWordMap;
  if (!wf.hasCompleted('generate_timestamps')) {
    await updateJob({ current_step: 'generating_timestamps', completed_steps: 2 });
    console.log('[shorts] Step 3: Generating word-level timestamps via Whisper');

    const tsResult = await generateTimestamps(voiceoverUrl, keys.falKey);
    wordTimestamps = tsResult.words;
    sceneWordMap = mapWordsToScenes(wordTimestamps, script.scenes);

    console.log(`[shorts] ${wordTimestamps.length} words mapped to ${sceneWordMap.length} scenes`);
    await wf.transition('generate_timestamps', { wordTimestamps, sceneWordMap });
  } else {
    const tsData = wf.getStepResult('generate_timestamps');
    wordTimestamps = tsData?.wordTimestamps || [];
    sceneWordMap = tsData?.sceneWordMap || [];
  }
  if (wf.isPaused) return;

  // ── Step 4: Generate Images ─────────────────────────────────────────────────
  let sceneImages;
  if (!wf.hasCompleted('generate_images')) {
    await updateJob({ current_step: 'generating_images', completed_steps: 3 });
    console.log(`[shorts] Step 4: Generating ${script.scenes.length} scene images${hasLoras ? ' (with LoRA)' : ''}`);

    sceneImages = [];
    let prevFrameUrl = null;
    let prevFrameAnalysis = null;

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];

      // Use selectModelForScene for smart routing (LoRAs force FLUX 2)
      const sceneModel = selectModelForScene(
        scene.role,
        { smart_routing: true, image_model: imageModel },
        loraConfigs
      );

      let prompt = `${scene.visual_prompt}${styleSuffix}`;

      // Add continuity context from previous frame
      if (prevFrameAnalysis) {
        prompt += `. Maintain visual continuity: ${prevFrameAnalysis}`;
      }

      // Vertical 9:16 aspect ratio
      prompt += '. Vertical 9:16 format, cinematic, no text or words in image.';

      const imageUrl = await withRetry(
        () => generateImage(prompt, '9:16', keys, supabase, sceneModel, loraConfigs),
        { maxAttempts: 2, baseDelayMs: 2000 }
      );
      sceneImages.push(imageUrl);

      logCost({
        username: brand_username,
        category: 'fal',
        operation: 'shorts_image',
        model: hasLoras ? 'flux-2-lora' : 'flux-pro',
        metadata: { image_count: 1, lora_count: loraConfigs.length },
      });

      // Extract last frame for continuity chain (skip for last scene)
      if (i < script.scenes.length - 1 && imageUrl) {
        try {
          prevFrameUrl = imageUrl; // For images, the image itself is the "last frame"
          prevFrameAnalysis = await analyzeFrameContinuity(prevFrameUrl, keys.openaiKey);
        } catch (e) {
          console.warn(`[shorts] Frame continuity analysis failed for scene ${i}: ${e.message}`);
          prevFrameAnalysis = null;
        }
      }

      console.log(`[shorts] Image ${i + 1}/${script.scenes.length} done (model: ${sceneModel})`);
    }

    await wf.transition('generate_images', { sceneImages });
  } else {
    sceneImages = wf.getStepResult('generate_images')?.sceneImages || [];
  }
  if (wf.isPaused) return;

  // ── Step 5: Animate Clips ──────────────────────────────────────────────────
  let sceneClips;
  if (!wf.hasCompleted('animate_clips')) {
    await updateJob({ current_step: 'animating_clips', completed_steps: 4 });
    console.log(`[shorts] Step 5: Animating ${sceneImages.length} clips`);

    sceneClips = [];
    for (let i = 0; i < sceneImages.length; i++) {
      const scene = script.scenes[i];
      const sceneWord = sceneWordMap[i];

      // Duration from actual voiceover timing (not template default)
      const duration = sceneWord
        ? Math.max(3, Math.round(sceneWord.endTime - sceneWord.startTime))
        : scene.duration_seconds;

      const motionPrompt = scene.motion_prompt || 'slow cinematic pan';

      const clipUrl = await withRetry(
        () => animateImage(sceneImages[i], motionPrompt, '9:16', duration, keys, supabase, videoModel, loraConfigs),
        { maxAttempts: 2, baseDelayMs: 5000 }
      );
      sceneClips.push(clipUrl);

      logCost({
        username: brand_username,
        category: 'fal',
        operation: 'shorts_video_clip',
        model: 'kling-v2',
        metadata: { video_count: 1 },
      });

      console.log(`[shorts] Clip ${i + 1}/${sceneImages.length} done (${duration}s)`);
    }

    await wf.transition('animate_clips', { sceneClips });
  } else {
    sceneClips = wf.getStepResult('animate_clips')?.sceneClips || [];
  }
  if (wf.isPaused) return;

  // ── Step 6: Generate Music ─────────────────────────────────────────────────
  let musicUrl;
  if (!wf.hasCompleted('generate_music')) {
    await updateJob({ current_step: 'generating_music', completed_steps: 5 });
    console.log(`[shorts] Step 6: Generating background music`);

    const musicMood = script.music_mood || nicheTemplate.music_mood;
    musicUrl = await withRetry(
      () => generateMusic(musicMood, keys, { duration_seconds: nicheTemplate.total_duration_seconds + 5 }),
      { maxAttempts: 2, baseDelayMs: 5000 }
    );

    logCost({
      username: brand_username,
      category: 'fal',
      operation: 'shorts_music',
      model: 'minimax-music',
      metadata: { track_count: 1 },
    });

    await wf.transition('generate_music', { musicUrl });
  } else {
    musicUrl = wf.getStepResult('generate_music')?.musicUrl;
  }
  if (wf.isPaused) return;

  // ── Step 7: Assemble Video ─────────────────────────────────────────────────
  let assembledUrl;
  if (!wf.hasCompleted('assemble_video')) {
    await updateJob({ current_step: 'assembling_video', completed_steps: 6 });
    console.log('[shorts] Step 7: Assembling video (clips + voiceover + music)');

    assembledUrl = await assembleShort(sceneClips, voiceoverUrl, musicUrl, keys.falKey, supabase);
    await wf.transition('assemble_video', { assembledUrl });
  } else {
    assembledUrl = wf.getStepResult('assemble_video')?.assembledUrl;
  }
  if (wf.isPaused) return;

  // ── Step 8: Burn Captions ──────────────────────────────────────────────────
  let captionedUrl;
  if (!wf.hasCompleted('burn_captions')) {
    await updateJob({ current_step: 'burning_captions', completed_steps: 7 });
    console.log(`[shorts] Step 8: Burning captions (style: ${captionStyle})`);

    captionedUrl = await burnCaptions(
      assembledUrl,
      wordTimestamps,
      keys.falKey,
      supabase,
      captionStyle,
      wordsPerChunk,
    );

    await wf.transition('burn_captions', { captionedUrl });
  } else {
    captionedUrl = wf.getStepResult('burn_captions')?.captionedUrl;
  }
  if (wf.isPaused) return;

  // ── Step 9: Finalize ───────────────────────────────────────────────────────
  if (!wf.hasCompleted('finalize')) {
    await updateJob({ current_step: 'finalizing', completed_steps: 8 });
    console.log('[shorts] Step 9: Saving to campaign & draft');

    // Create campaign
    const { data: campaign } = await supabase.from('campaigns').insert({
      user_id: userId,
      name: script.title,
      article_title: script.title,
      platform: 'youtube_shorts',
      status: 'ready',
      content_type: 'shorts',
      brand_username,
      total_drafts: 1,
      completed_drafts: 1,
    }).select().single();

    if (!campaign) throw new Error('Failed to create campaign');

    // Create draft
    const { data: draft } = await supabase.from('ad_drafts').insert({
      campaign_id: campaign.id,
      user_id: userId,
      platform: 'youtube_shorts',
      headline: script.title,
      body_text: script.description,
      final_video_url: captionedUrl,
      voiceover_url: voiceoverUrl,
      word_timestamps_json: wordTimestamps,
      captioned_video_url: captionedUrl,
      shorts_metadata_json: {
        niche,
        topic: topic || 'auto',
        hashtags: script.hashtags,
        narration_full: script.narration_full,
        scenes: script.scenes,
        music_mood: script.music_mood,
        voice_id: voiceId,
        visual_style: visualStyle,
        caption_style: captionStyle,
        scene_images: sceneImages,
        scene_clips: sceneClips,
        music_url: musicUrl,
        assembled_url: assembledUrl,
        lora_config: loraConfigs.length ? loraConfigs : null,
      },
      generation_status: 'ready',
      aspect_ratio: '9:16',
    }).select().single();

    await wf.transition('finalize', { campaign_id: campaign.id, draft_id: draft?.id });

    await updateJob({
      status: 'completed',
      current_step: 'done',
      completed_steps: 9,
      workflow_state: 'completed',
      output_json: {
        campaign_id: campaign.id,
        draft_id: draft?.id,
        video_url: captionedUrl,
        title: script.title,
        niche,
      },
    });

    console.log(`[shorts] Job ${jobId} complete — "${script.title}" — ${captionedUrl}`);
  }
}
