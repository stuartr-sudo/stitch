/**
 * POST /api/campaigns/create
 *
 * Manually create a campaign with user-supplied storyboard scenes.
 *
 * Body: {
 *   name: string,
 *   brand_username?: string,
 *   template_id?: string,         // optional user_template to base on
 *   style_preset?: string,        // visual style preset key
 *   platforms?: string[],
 *   scenes?: [{ role, hint, duration_seconds, visual_prompt, motion_prompt }],
 *   music_mood?: string,
 *   output_type?: 'video' | 'static' | 'both',
 *   auto_generate?: boolean,      // immediately start generating assets
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { generateImage, animateImage, generateMusic, concatVideos } from '../lib/pipelineHelpers.js';
import { getStyleSuffix } from '../lib/stylePresets.js';
import { groupPlatformsByRatio } from '../lib/videoTemplates.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    name,
    brand_username,
    template_id,
    style_preset,
    platforms = ['tiktok', 'instagram_reels'],
    scenes = [],
    music_mood,
    output_type = 'both',
    auto_generate = false,
  } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Campaign name is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  // Create campaign
  const { data: campaign, error: campErr } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name: name.trim(),
      platform: platforms[0] || 'tiktok',
      status: auto_generate ? 'processing' : 'draft',
      brand_username: brand_username || null,
      source_url: null,
      source_type: 'manual',
      total_drafts: 1,
      completed_drafts: 0,
    })
    .select()
    .single();

  if (campErr) return res.status(500).json({ error: `Failed to create campaign: ${campErr.message}` });

  // Create draft with user-supplied storyboard
  const { data: draft, error: draftErr } = await supabase
    .from('ad_drafts')
    .insert({
      campaign_id: campaign.id,
      user_id: userId,
      template_id: template_id || null,
      template_name: 'Manual',
      output_type,
      platforms,
      storyboard_json: {
        campaign_name: name,
        scenes: scenes,
        music_mood: music_mood || '',
      },
      generation_status: auto_generate ? 'generating' : 'draft',
      style_preset_applied: style_preset || null,
    })
    .select()
    .single();

  if (draftErr) return res.status(500).json({ error: `Failed to create draft: ${draftErr.message}` });

  // If auto_generate, kick off generation in background
  if (auto_generate && scenes.length > 0) {
    generateManualDraft(draft, campaign, userId, style_preset, platforms, output_type, supabase)
      .catch(err => {
        console.error('[campaigns/create] Background generation failed:', err.message);
        supabase.from('ad_drafts').update({ generation_status: 'failed' }).eq('id', draft.id);
        supabase.from('campaigns').update({ status: 'failed' }).eq('id', campaign.id);
      });
  }

  return res.json({ success: true, campaign, draft });
}

/** Background generation for manually created campaigns */
async function generateManualDraft(draft, campaign, userId, stylePreset, platforms, outputType, supabase) {
  const wantVideo = outputType === 'video' || outputType === 'both';
  const scenes = draft.storyboard_json?.scenes || [];
  const styleSuffix = getStyleSuffix(stylePreset);
  const ratioGroups = groupPlatformsByRatio(platforms);

  // Get API keys
  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('fal_key, wavespeed_key')
    .eq('user_id', userId)
    .maybeSingle();

  const keys = {
    falKey: userKeys?.fal_key || process.env.FAL_KEY,
    wavespeedKey: userKeys?.wavespeed_key || process.env.WAVESPEED_KEY,
  };

  const allRatioAssets = [];

  for (const { ratio, platforms: groupPlatforms } of ratioGroups) {
    const sceneAssets = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      let imageUrl = null;
      let videoUrl = null;

      try {
        const prompt = `${scene.visual_prompt || scene.hint || 'cinematic scene'}${styleSuffix}`;
        imageUrl = await generateImage(prompt, ratio, keys, supabase);
      } catch (err) {
        console.error(`[manual-gen] Scene ${i} image failed:`, err.message);
      }

      if (wantVideo && imageUrl) {
        try {
          videoUrl = await animateImage(
            imageUrl,
            scene.motion_prompt || scene.visual_prompt || '',
            ratio,
            Math.min(scene.duration_seconds || 5, 5),
            keys,
            supabase,
          );
        } catch (err) {
          console.error(`[manual-gen] Scene ${i} video failed:`, err.message);
        }
      }

      sceneAssets.push({ scene, imageUrl, videoUrl });
    }

    allRatioAssets.push({ ratio, platforms: groupPlatforms, scenes: sceneAssets });
  }

  // Music
  let musicUrl = null;
  const musicMood = draft.storyboard_json?.music_mood;
  if (musicMood) {
    const totalSecs = scenes.reduce((s, sc) => s + (sc.duration_seconds || 5), 0);
    try {
      musicUrl = await generateMusic(musicMood, Math.min(120, totalSecs + 5), keys, supabase);
    } catch (err) {
      console.error('[manual-gen] Music failed:', err.message);
    }
  }

  // Concat
  const finalVideosByRatio = {};
  if (wantVideo && keys.falKey) {
    for (const { ratio, scenes: ratioScenes } of allRatioAssets) {
      const clips = ratioScenes.map(a => a.videoUrl).filter(Boolean);
      if (clips.length === 0) continue;
      try {
        finalVideosByRatio[ratio] = await concatVideos(clips, musicUrl, keys.falKey, supabase);
      } catch (err) {
        console.error(`[manual-gen] Concat failed (${ratio}):`, err.message);
      }
    }
  }

  // Save
  await supabase.from('ad_drafts').update({
    generation_status: 'ready',
    assets_json: allRatioAssets,
    music_url: musicUrl,
    final_videos_json: finalVideosByRatio,
  }).eq('id', draft.id);

  await supabase.from('campaigns').update({
    status: 'ready',
    completed_drafts: 1,
  }).eq('id', campaign.id);

  console.log(`[manual-gen] Campaign "${campaign.name}" generation complete`);
}
