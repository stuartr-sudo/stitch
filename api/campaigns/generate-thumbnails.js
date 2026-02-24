/**
 * POST /api/campaigns/generate-thumbnails
 *
 * Generates platform-specific thumbnails for a draft.
 * Picks the "hook" scene image, generates text-overlay versions per platform
 * ratio (YouTube 16:9, TikTok 9:16, Instagram 1:1).
 *
 * Body: {
 *   draft_id: string,
 *   platforms?: string[],  // defaults to ['youtube', 'tiktok', 'instagram']
 *   custom_headline?: string,
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { generateImage } from '../lib/pipelineHelpers.js';

const PLATFORM_RATIOS = {
  youtube: { ratio: '16:9', label: 'YouTube' },
  tiktok: { ratio: '9:16', label: 'TikTok' },
  instagram: { ratio: '1:1', label: 'Instagram' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const {
    draft_id,
    platforms = ['youtube', 'tiktok', 'instagram'],
    custom_headline,
  } = req.body;

  if (!draft_id) return res.status(400).json({ error: 'draft_id is required' });

  // Fetch draft
  const { data: draft, error: draftErr } = await supabase
    .from('ad_drafts')
    .select('*, campaigns!inner(brand_username)')
    .eq('id', draft_id)
    .single();

  if (draftErr || !draft) return res.status(404).json({ error: 'Draft not found' });

  const storyboard = draft.storyboard_json || {};
  const assets = draft.assets_json || [];
  const scenes = storyboard.scenes || [];

  // Find the "hook" scene — first scene, or the one with role === 'hook'
  const hookSceneIdx = scenes.findIndex(s => s.role?.toLowerCase() === 'hook');
  const hookIdx = hookSceneIdx >= 0 ? hookSceneIdx : 0;
  const hookScene = scenes[hookIdx];

  if (!hookScene) return res.status(400).json({ error: 'No scenes found in storyboard' });

  // Get the hook scene's image URL from the first ratio group
  const hookImageUrl = assets[0]?.scenes?.[hookIdx]?.imageUrl || null;

  // Get headline text
  const headline = custom_headline || storyboard.hook_headline || hookScene.headline || '';

  // Get API keys
  const userId = draft.user_id;
  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('fal_key, wavespeed_key')
    .eq('user_id', userId)
    .maybeSingle();

  const keys = {
    falKey: userKeys?.fal_key || process.env.FAL_KEY,
    wavespeedKey: userKeys?.wavespeed_key || process.env.WAVESPEED_KEY || process.env.WAVESPEED_API_KEY,
  };

  // Get scene inputs for model/LoRA config
  const sceneInputs = draft.scene_inputs_json || [];
  const sceneInput = sceneInputs[hookIdx] || {};
  const loraConfig = sceneInput.lora_config || null;
  const styleSuffix = sceneInput.style_suffix || '';
  const imgModel = sceneInput.image_model || null;

  // Return immediately, process in background
  res.json({
    success: true,
    message: `Generating thumbnails for ${platforms.length} platforms`,
    platforms,
  });

  // Background generation
  try {
    const thumbnails = [];

    for (const platform of platforms) {
      const config = PLATFORM_RATIOS[platform];
      if (!config) continue;

      try {
        // Build thumbnail prompt — emphasize the headline text overlay
        const thumbPrompt = `${hookScene.visual_prompt}${styleSuffix}, with bold eye-catching text overlay reading "${headline}", cinematic thumbnail, high contrast, vibrant colors, professional social media thumbnail for ${config.label}`;

        const url = await generateImage(thumbPrompt, config.ratio, keys, supabase, imgModel, loraConfig);

        thumbnails.push({
          platform,
          ratio: config.ratio,
          url,
          headline,
        });

        console.log(`[thumbnails] Generated ${config.label} (${config.ratio}) thumbnail`);
      } catch (err) {
        console.error(`[thumbnails] ${config.label} thumbnail failed:`, err.message);
        thumbnails.push({
          platform,
          ratio: config.ratio,
          url: hookImageUrl, // Fallback to hook scene image
          headline,
          fallback: true,
        });
      }
    }

    // Save thumbnails to draft
    await supabase.from('ad_drafts').update({
      thumbnails_json: thumbnails,
    }).eq('id', draft_id);

    console.log(`[thumbnails] Done — ${thumbnails.length} thumbnails for draft ${draft_id}`);
  } catch (err) {
    console.error(`[thumbnails] Failed:`, err.message);
  }
}
