/**
 * Autopilot Worker — processes a single production queue item through the
 * full Shorts pipeline (script → voiceover → timing → music → frames → clips → assemble).
 *
 * Imports underlying functions directly — never calls HTTP endpoints.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { generateScript } from './scriptGenerator.js';
import { generateGeminiVoiceover } from './voiceoverGenerator.js';
import { getWordTimestamps } from './getWordTimestamps.js';
import { generateMusic, assembleShort, extractLastFrame, uploadUrlToSupabase } from './pipelineHelpers.js';
import { generateImageV2, animateImageV2 } from './mediaGenerator.js';
import { alignBlocks } from './blockAligner.js';
import { solveDurations } from './durationSolver.js';
import { SHORTS_TEMPLATES } from './shortsTemplates.js';
import { burnCaptions } from './captionBurner.js';
import { composeVideoPrompt } from './visualPromptComposer.js';
import { logCost } from './costLogger.js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Update a queue item's status (and optionally other fields).
 */
async function updateQueueItem(supabase, id, updates) {
  const { error } = await supabase
    .from('production_queue')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error(`[autopilot] Failed to update queue item ${id}:`, error.message);
}

/**
 * Synthesize a visual prompt for a scene via LLM (mirrors workbench generate-frame logic).
 */
async function synthesizeVisualPrompt(openai, { narration, visualStylePrompt, nicheMood, visionContext }) {
  const sections = [];
  if (nicheMood) sections.push(`ATMOSPHERE & MOOD (CRITICAL — this defines the overall tone): ${nicheMood}`);
  sections.push(`NARRATION/SCENE CONTEXT: ${narration}`);
  if (visualStylePrompt) sections.push(`VISUAL STYLE: ${visualStylePrompt}`);
  if (visionContext) sections.push(`CONTINUITY FROM PREVIOUS SCENE: ${visionContext.slice(0, 300)}`);

  const messages = [
    {
      role: 'system',
      content: `You are a visual prompt engineer for AI image generation. Synthesize ALL inputs into a single vivid image generation prompt (2-4 sentences).

PRIORITY ORDER:
1. ATMOSPHERE & MOOD — this is the VISUAL UNDERTONE. It defines color palette, lighting, and emotional tone.
2. NARRATION — extract ONLY the visual elements implied by the story.
3. VISUAL STYLE — artistic rendering approach.
4. CONTINUITY — match previous scene's look if provided.

Rules:
- Describe ONLY what should be VISIBLE — people, objects, environment, lighting, composition, colors, mood.
- The mood/atmosphere must permeate every visual choice.
- Never include narration text, dialogue, or abstract concepts.
- Output the prompt only, no explanation.`,
    },
    { role: 'user', content: sections.join('\n\n') },
  ];

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages,
      max_tokens: 300,
    });
    return (res.choices[0]?.message?.content || '').trim() || narration;
  } catch (err) {
    console.warn(`[autopilot] LLM prompt synthesis failed: ${err.message}`);
    return narration; // fallback to raw narration
  }
}

/**
 * Process a single queue item through the entire Shorts pipeline.
 *
 * @param {object} queueItem - Row from production_queue
 * @param {object} keys - { openaiKey, falKey, wavespeedKey }
 * @param {object} [supabase] - Optional pre-built client
 */
export async function processQueueItem(queueItem, keys, supabase) {
  if (!supabase) supabase = getSupabase();

  const { id, user_id, title, niche, topic, hook, angle, config = {} } = queueItem;
  const {
    duration = 60,
    voice = null,
    visual_style = null,
    visual_style_prompt = null,
    video_model = 'fal_wan',
    image_model = 'fal_nano_banana',
    framework = null,
    caption_style = 'word_pop',
    music_volume = 0.15,
  } = config;

  const nicheTemplate = SHORTS_TEMPLATES[niche] || null;
  const nicheMood = nicheTemplate?.visual_mood || null;
  const musicMood = nicheTemplate?.music_mood || 'cinematic ambient background, subtle, instrumental';
  const defaultVoice = nicheTemplate?.default_voice || 'Kore';

  console.log(`[autopilot] Starting item ${id}: "${title}" (niche=${niche}, duration=${duration}s)`);

  // FLF models use first-last-frame generation; I2V models use image-to-video
  const FLF_MODELS = ['fal_veo3', 'fal_veo3_lite', 'fal_kling_v3', 'fal_kling_o3'];
  const isFLF = FLF_MODELS.includes(video_model);

  try {
    // ─── Step 1: Script ──────────────────────────────────────────────────
    await updateQueueItem(supabase, id, { status: 'scripting' });
    console.log(`[autopilot] [${id}] Generating script...`);

    const fullTopic = [topic, hook && `Hook: ${hook}`, angle && `Angle: ${angle}`]
      .filter(Boolean).join('. ');

    const script = await generateScript({
      niche,
      topic: fullTopic,
      nicheTemplate,
      keys,
      brandUsername: user_id,
      targetDurationSeconds: duration,
      framework,
    });

    console.log(`[autopilot] [${id}] Script: ${script.scenes.length} scenes, title="${script.title}"`);

    // ─── Step 2: Voiceover ───────────────────────────────────────────────
    console.log(`[autopilot] [${id}] Generating voiceover...`);
    const voiceId = voice || defaultVoice;
    const voiceoverUrl = await generateGeminiVoiceover(
      script.narration_full,
      keys,
      supabase,
      { voice: voiceId, styleInstructions: nicheTemplate?.voice_pacing || 'Speak in a warm, engaging tone' },
    );
    console.log(`[autopilot] [${id}] Voiceover ready: ${voiceoverUrl.slice(0, 80)}...`);

    // ─── Step 3: Timing ──────────────────────────────────────────────────
    await updateQueueItem(supabase, id, { status: 'generating' });
    console.log(`[autopilot] [${id}] Getting word timestamps...`);

    const { words, totalDuration: ttsDuration } = await getWordTimestamps(voiceoverUrl, keys.falKey);

    // Solve durations for each scene
    const durationRanges = script.scenes.map(s => ({
      min: Math.max(3, s.duration_seconds - 2),
      max: s.duration_seconds + 2,
      target: s.duration_seconds,
    }));
    const solvedDurations = solveDurations(ttsDuration, durationRanges, video_model);

    // Align word blocks to scenes
    const blocks = alignBlocks(words, ttsDuration, video_model);

    console.log(`[autopilot] [${id}] Timing: ${words.length} words, TTS ${ttsDuration.toFixed(1)}s, ${solvedDurations.length} scene durations`);

    // ─── Step 4: Music ───────────────────────────────────────────────────
    console.log(`[autopilot] [${id}] Generating music...`);
    let musicUrl = null;
    try {
      musicUrl = await generateMusic(musicMood, ttsDuration, keys, supabase);
    } catch (err) {
      console.warn(`[autopilot] [${id}] Music generation failed (non-fatal): ${err.message}`);
    }

    // ─── Step 5: Keyframes ───────────────────────────────────────────────
    console.log(`[autopilot] [${id}] Generating ${script.scenes.length} keyframes...`);
    const openai = new OpenAI({ apiKey: keys.openaiKey });

    const sceneData = []; // { imageUrl, endImageUrl?, clipUrl, duration }
    let previousVisionContext = null;

    for (let i = 0; i < script.scenes.length; i++) {
      const scene = script.scenes[i];
      const sceneDuration = solvedDurations[i] || scene.duration_seconds;

      console.log(`[autopilot] [${id}] Scene ${i + 1}/${script.scenes.length}: generating keyframe...`);

      // Synthesize visual prompt via LLM
      const visualPrompt = await synthesizeVisualPrompt(openai, {
        narration: scene.narration_segment,
        visualStylePrompt: visual_style_prompt || visual_style,
        nicheMood,
        visionContext: previousVisionContext,
      });

      // Generate start frame image
      const startImageUrl = await generateImageV2(
        image_model,
        visualPrompt,
        '9:16',
        keys,
        supabase,
      );

      let endImageUrl = null;
      if (isFLF && i < script.scenes.length - 1) {
        // For FLF models, generate an end frame for this scene too
        const nextScene = script.scenes[i + 1];
        const endPrompt = await synthesizeVisualPrompt(openai, {
          narration: nextScene?.narration_segment || scene.narration_segment,
          visualStylePrompt: visual_style_prompt || visual_style,
          nicheMood,
          visionContext: null,
        });
        endImageUrl = await generateImageV2(image_model, endPrompt, '9:16', keys, supabase);
      }

      sceneData.push({
        imageUrl: startImageUrl,
        endImageUrl,
        clipUrl: null,
        duration: sceneDuration,
        narration: scene.narration_segment,
      });
    }

    // ─── Step 6: Video Clips ─────────────────────────────────────────────
    console.log(`[autopilot] [${id}] Generating ${script.scenes.length} video clips...`);

    for (let i = 0; i < sceneData.length; i++) {
      const sd = sceneData[i];
      console.log(`[autopilot] [${id}] Scene ${i + 1}/${sceneData.length}: generating clip (${isFLF ? 'FLF' : 'I2V'}, ${sd.duration}s)...`);

      const motionPrompt = composeVideoPrompt('', 'Smooth cinematic movement', {
        videoStyle: visual_style,
        isFLF,
      });

      try {
        if (isFLF && sd.endImageUrl) {
          // FLF mode: use animateImageV2 which handles FLF internally for supported models
          sd.clipUrl = await animateImageV2(
            video_model,
            sd.imageUrl,
            motionPrompt,
            '9:16',
            sd.duration,
            keys,
            supabase,
            { generate_audio: false, end_image_url: sd.endImageUrl },
          );
        } else {
          // I2V mode
          sd.clipUrl = await animateImageV2(
            video_model,
            sd.imageUrl,
            motionPrompt,
            '9:16',
            sd.duration,
            keys,
            supabase,
            { generate_audio: false },
          );
        }

        // Extract last frame for continuity → next scene
        if (i < sceneData.length - 1) {
          try {
            const lastFrame = await extractLastFrame(sd.clipUrl, sd.duration, keys.falKey);
            if (lastFrame) {
              const savedFrame = await uploadUrlToSupabase(lastFrame, supabase, 'pipeline/workbench');
              previousVisionContext = `Previous scene ended with this frame — maintain visual continuity.`;
            }
          } catch (err) {
            console.warn(`[autopilot] [${id}] Last frame extraction failed for scene ${i + 1}: ${err.message}`);
          }
        }
      } catch (err) {
        console.error(`[autopilot] [${id}] Clip generation failed for scene ${i + 1}: ${err.message}`);
        throw new Error(`Clip generation failed at scene ${i + 1}: ${err.message}`);
      }
    }

    // Verify all clips generated
    const missingClips = sceneData.filter(s => !s.clipUrl);
    if (missingClips.length > 0) {
      throw new Error(`${missingClips.length} clips failed to generate`);
    }

    // ─── Step 7: Assembly ────────────────────────────────────────────────
    await updateQueueItem(supabase, id, { status: 'assembling' });
    console.log(`[autopilot] [${id}] Assembling final video...`);

    const videoUrls = sceneData.map(s => s.clipUrl);
    const clipDurations = sceneData.map(s => s.duration);

    let finalUrl = await assembleShort(
      videoUrls,
      voiceoverUrl,
      musicUrl,
      keys.falKey,
      supabase,
      clipDurations,
      music_volume,
      ttsDuration,
    );

    // Burn captions
    if (caption_style) {
      try {
        console.log(`[autopilot] [${id}] Burning captions (style=${caption_style})...`);
        finalUrl = await burnCaptions(finalUrl, caption_style, keys.falKey, supabase);
      } catch (err) {
        console.warn(`[autopilot] [${id}] Caption burn failed (non-fatal): ${err.message}`);
      }
    }

    // ─── Step 8: Save Draft ──────────────────────────────────────────────
    console.log(`[autopilot] [${id}] Saving draft...`);

    // Create campaign row
    const { data: campaign, error: campErr } = await supabase.from('campaigns').insert({
      user_id,
      name: script.title || title,
      content_type: 'shorts',
      status: 'workbench',
    }).select('id').single();

    if (campErr) throw new Error(`Campaign create failed: ${campErr.message}`);

    // Build workbench-compatible state for the draft
    const draftState = {
      step: 'assemble',
      niche,
      topic: fullTopic,
      title: script.title,
      description: script.description,
      hashtags: script.hashtags,
      narration_full: script.narration_full,
      voiceoverUrl,
      voiceId,
      musicUrl,
      scenes: script.scenes.map((s, i) => ({
        ...s,
        duration: solvedDurations[i] || s.duration_seconds,
        imageUrl: sceneData[i]?.imageUrl,
        endImageUrl: sceneData[i]?.endImageUrl,
        clipUrl: sceneData[i]?.clipUrl,
      })),
      finalVideoUrl: finalUrl,
      videoModel: video_model,
      imageModel: image_model,
      visualStyle: visual_style,
      framework,
      ttsDuration,
      autopilot: true,
    };

    const { data: draft, error: draftErr } = await supabase.from('ad_drafts').insert({
      campaign_id: campaign.id,
      user_id,
      storyboard_json: draftState,
      generation_status: 'complete',
      template_type: 'workbench',
      voiceover_url: voiceoverUrl,
      music_url: musicUrl,
      final_video_url: finalUrl,
    }).select('id').single();

    if (draftErr) throw new Error(`Draft create failed: ${draftErr.message}`);

    // ─── Step 9: Update queue item → ready ───────────────────────────────
    await updateQueueItem(supabase, id, {
      status: 'ready',
      draft_id: draft.id,
      error_message: null,
    });

    console.log(`[autopilot] [${id}] Complete! Draft ${draft.id}, final video: ${finalUrl.slice(0, 80)}...`);
    return { draft_id: draft.id, final_video_url: finalUrl };

  } catch (err) {
    console.error(`[autopilot] [${id}] FAILED: ${err.message}`);
    await updateQueueItem(supabase, id, {
      status: 'failed',
      error_message: err.message?.slice(0, 500),
    });
    throw err;
  }
}
