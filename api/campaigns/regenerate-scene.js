/**
 * POST /api/campaigns/regenerate-scene
 *
 * Regenerates a specific scene within a draft without re-running the full pipeline.
 * After regenerating the target scene, cascades forward to maintain frame continuity
 * (scenes N+1, N+2... are re-generated using the new scene's last frame).
 *
 * Body: {
 *   draft_id: string,
 *   scene_index: number,
 *   ratio: string,             // '9:16', '16:9', '1:1'
 *   regeneration_type: string, // 'image_only', 'video_only', 'image_and_video'
 *   custom_visual_prompt?: string,
 *   custom_motion_prompt?: string,
 *   image_model?: string,
 *   video_model?: string,
 * }
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { generateImage, animateImage, extractLastFrame, analyzeFrameContinuity, concatVideos } from '../lib/pipelineHelpers.js';
import { getStyleSuffix } from '../lib/stylePresets.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const {
    draft_id,
    scene_index,
    ratio,
    regeneration_type = 'image_and_video',
    custom_visual_prompt,
    custom_motion_prompt,
    image_model,
    video_model,
  } = req.body;

  if (!draft_id || scene_index === undefined || !ratio) {
    return res.status(400).json({ error: 'draft_id, scene_index, and ratio are required' });
  }

  // Fetch the draft
  const { data: draft, error: draftErr } = await supabase
    .from('ad_drafts')
    .select('*, campaigns!inner(brand_username)')
    .eq('id', draft_id)
    .single();

  if (draftErr || !draft) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  const assets = draft.assets_json || [];
  const storyboard = draft.storyboard_json || {};
  const sceneInputs = draft.scene_inputs_json || [];
  const scenes = storyboard.scenes || [];

  if (scene_index < 0 || scene_index >= scenes.length) {
    return res.status(400).json({ error: `Invalid scene_index: ${scene_index}. Draft has ${scenes.length} scenes.` });
  }

  // Find the ratio group in assets
  const ratioGroupIdx = assets.findIndex(g => g.ratio === ratio);
  if (ratioGroupIdx === -1) {
    return res.status(400).json({ error: `Ratio "${ratio}" not found in draft assets` });
  }

  // Return immediately, process in background
  res.json({
    success: true,
    message: `Regenerating scene ${scene_index} (${ratio}). Subsequent scenes will cascade.`,
    scenes_affected: scenes.length - scene_index,
  });

  // Background regeneration
  try {
    await regenerateScene({
      draft, assets, storyboard, sceneInputs, scenes,
      ratioGroupIdx, scene_index, ratio, regeneration_type,
      custom_visual_prompt, custom_motion_prompt,
      image_model, video_model, supabase,
    });
  } catch (err) {
    console.error(`[regenerate-scene] Failed:`, err.message);
    await supabase.from('ad_drafts').update({
      generation_status: 'ready', // Don't leave it stuck in 'generating'
    }).eq('id', draft_id);
  }
}

async function regenerateScene({
  draft, assets, storyboard, sceneInputs, scenes,
  ratioGroupIdx, scene_index, ratio, regeneration_type,
  custom_visual_prompt, custom_motion_prompt,
  image_model, video_model, supabase,
}) {
  const draftId = draft.id;

  // Mark draft as generating
  await supabase.from('ad_drafts').update({ generation_status: 'generating' }).eq('id', draftId);

  // Get API keys
  const userId = draft.user_id;
  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('fal_key, wavespeed_key, openai_key')
    .eq('user_id', userId)
    .maybeSingle();

  const keys = {
    falKey: userKeys?.fal_key || process.env.FAL_KEY,
    wavespeedKey: userKeys?.wavespeed_key || process.env.WAVESPEED_KEY || process.env.WAVESPEED_API_KEY,
    openaiKey: userKeys?.openai_key || process.env.OPENAI_API_KEY,
  };

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  // Get LoRA config from scene inputs if available
  const sceneInput = sceneInputs[scene_index] || {};
  const loraConfig = sceneInput.lora_config || null;
  const styleSuffix = sceneInput.style_suffix || '';

  // Get model preferences
  const imgModel = image_model || sceneInput.image_model || null;
  const vidModel = video_model || sceneInput.video_model || null;

  const ratioGroup = assets[ratioGroupIdx];
  const ratioScenes = ratioGroup.scenes || [];
  const wantVideo = regeneration_type !== 'image_only';
  const wantImage = regeneration_type !== 'video_only';

  // Process scene_index and all subsequent scenes (cascade for continuity)
  let prevFrameUrl = null;
  let prevFrameAnalysis = null;

  // If regenerating from scene > 0, get the previous scene's last frame for continuity
  if (scene_index > 0 && ratioScenes[scene_index - 1]?.videoUrl) {
    try {
      const prevScene = scenes[scene_index - 1];
      prevFrameUrl = await extractLastFrame(
        ratioScenes[scene_index - 1].videoUrl,
        prevScene.duration_seconds || 5,
        keys.falKey
      );
      prevFrameAnalysis = await analyzeFrameContinuity(prevFrameUrl, openai);
    } catch (err) {
      console.warn(`[regenerate-scene] Could not extract previous frame:`, err.message);
    }
  }

  for (let idx = scene_index; idx < scenes.length; idx++) {
    const scene = scenes[idx];
    const isTargetScene = idx === scene_index;
    const isFirstScene = idx === 0;

    // Only regenerate subsequent scenes if we generated video for the target
    // (subsequent scenes need the cascaded frame for continuity)
    if (!isTargetScene && !wantVideo) break;

    const visualPrompt = isTargetScene && custom_visual_prompt
      ? custom_visual_prompt
      : scene.visual_prompt;
    const motionPrompt = isTargetScene && custom_motion_prompt
      ? custom_motion_prompt
      : scene.motion_prompt;

    let imageUrl = ratioScenes[idx]?.imageUrl || null;
    let videoUrl = ratioScenes[idx]?.videoUrl || null;

    // Generate image
    if (wantImage && (isTargetScene || isFirstScene || !prevFrameUrl)) {
      try {
        const basePrompt = `${visualPrompt}${styleSuffix}`;
        imageUrl = await generateImage(basePrompt, ratio, keys, supabase, imgModel, loraConfig);
        console.log(`[regenerate-scene] Scene ${idx} image generated`);
      } catch (err) {
        console.error(`[regenerate-scene] Scene ${idx} image failed:`, err.message);
        if (isTargetScene) throw err; // Fatal for target scene
        break; // Stop cascading on failure
      }
    } else if (!isTargetScene && prevFrameUrl) {
      // For cascaded scenes, use the extracted last frame
      imageUrl = prevFrameUrl;
    }

    // Generate video
    if (wantVideo && imageUrl) {
      try {
        const continuityNote = prevFrameAnalysis
          ? ` Maintain visual continuity from previous scene: ${prevFrameAnalysis}`
          : '';
        const fullMotionPrompt = `${motionPrompt || scene.visual_prompt}${continuityNote}`;

        videoUrl = await animateImage(
          imageUrl,
          fullMotionPrompt,
          ratio,
          Math.min(scene.duration_seconds || 5, 5),
          keys,
          supabase,
          vidModel,
        );
        console.log(`[regenerate-scene] Scene ${idx} video generated`);

        // Extract last frame for next scene (skip on final scene)
        if (idx < scenes.length - 1 && videoUrl && keys.falKey) {
          prevFrameUrl = await extractLastFrame(videoUrl, scene.duration_seconds || 5, keys.falKey);
          prevFrameAnalysis = await analyzeFrameContinuity(prevFrameUrl, openai);
        }
      } catch (err) {
        console.error(`[regenerate-scene] Scene ${idx} video failed:`, err.message);
        if (isTargetScene) throw err;
        break;
      }
    }

    // Update the scene in assets
    ratioScenes[idx] = {
      ...ratioScenes[idx],
      scene: ratioScenes[idx]?.scene || scene,
      imageUrl,
      videoUrl,
    };
  }

  // Update the ratio group
  assets[ratioGroupIdx] = { ...ratioGroup, scenes: ratioScenes };

  // Re-concatenate final videos if they existed
  const finalVideos = { ...(draft.final_videos_json || {}) };
  if (wantVideo && keys.falKey && finalVideos[ratio]) {
    const clips = ratioScenes.map(s => s.videoUrl).filter(Boolean);
    if (clips.length > 0) {
      try {
        finalVideos[ratio] = await concatVideos(clips, draft.music_url, keys.falKey, supabase);
        console.log(`[regenerate-scene] Re-concatenated ${clips.length} clips for ${ratio}`);
      } catch (err) {
        console.error(`[regenerate-scene] Re-concat failed:`, err.message);
      }
    }
  }

  // Log the regeneration
  await supabase.from('scene_regenerations').insert({
    draft_id: draftId,
    scene_index,
    ratio,
    regeneration_type,
    original_image_url: draft.assets_json?.[ratioGroupIdx]?.scenes?.[scene_index]?.imageUrl || null,
    original_video_url: draft.assets_json?.[ratioGroupIdx]?.scenes?.[scene_index]?.videoUrl || null,
    new_image_url: ratioScenes[scene_index]?.imageUrl || null,
    new_video_url: ratioScenes[scene_index]?.videoUrl || null,
    custom_prompt: custom_visual_prompt || custom_motion_prompt || null,
    status: 'completed',
  }).catch(err => console.warn('[regenerate-scene] Log insert failed:', err.message));

  // Save updated draft
  await supabase.from('ad_drafts').update({
    assets_json: assets,
    final_videos_json: finalVideos,
    generation_status: 'ready',
  }).eq('id', draftId);

  console.log(`[regenerate-scene] Done — draft ${draftId}, scene ${scene_index}, ratio ${ratio}`);
}
