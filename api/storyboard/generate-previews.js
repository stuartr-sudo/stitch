/**
 * Storyboard Preview Generator
 *
 * Generates a cheap preview IMAGE for each scene using the previewImagePrompt
 * from Stage 2 (Visual Director). These images populate the storyboard document
 * that gets exported as PDF for client approval.
 *
 * Cost: ~$0.01 per image × 6 scenes = ~$0.06 total
 * Time: ~10-15 seconds (parallel generation)
 *
 * This runs BEFORE video generation — it's the "creative gate" where the client
 * sees thumbnails and approves the direction before you spend $2-3 on video clips.
 *
 * POST /api/storyboard/generate-previews
 * Body: {
 *   scenes: [{ sceneNumber, previewImagePrompt, durationSeconds, narrativeNote, ... }],
 *   aspectRatio: '16:9' | '9:16' | '1:1',
 *   imageModel: 'fal_flux' | 'fal_seedream' | 'fal_imagen4' | ...,
 *   startFrameUrl: string | null,  // If provided, Scene 1 uses this instead of generating
 * }
 *
 * Returns: {
 *   success: true,
 *   previews: [{ sceneNumber, imageUrl, prompt }]
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { generateImage, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    if (!keys.falKey && !keys.wavespeedKey) {
      return res.status(400).json({ error: 'Image generation API key required (FAL or Wavespeed).' });
    }

    const {
      scenes,
      aspectRatio = '16:9',
      imageModel = 'fal_flux',
      startFrameUrl = null,
      startFrameDescription = null,
      characterReferenceUrls = [],
    } = req.body;

    if (!scenes?.length) {
      return res.status(400).json({ error: 'No scenes provided' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // I2I helper — uses nano-banana-2/edit with reference images for style/character consistency
    // Supports multiple image_urls: starting image + character references
    const i2iAspectMap = { '16:9': '16:9', '9:16': '9:16', '1:1': '1:1', '4:3': '4:3', '3:4': '3:4' };
    async function generateI2I(referenceImageUrls, prompt, ar) {
      const res = await fetch('https://fal.run/fal-ai/nano-banana-2/edit', {
        method: 'POST',
        headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_urls: referenceImageUrls,
          prompt: `Composite the character(s) into the scene, matching the exact art style, character design, and color palette of the reference image(s). ${prompt}`,
          aspect_ratio: i2iAspectMap[ar] || '16:9',
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

    // Build reference image list: starting image first, then character references
    const referenceImages = [
      ...(startFrameUrl ? [startFrameUrl] : []),
      ...(characterReferenceUrls || []),
    ].filter(Boolean);
    const useI2I = referenceImages.length > 0 && !!keys.falKey;
    console.log(`[StoryboardPreviews] Generating ${scenes.length} preview images (model: ${imageModel}, aspect: ${aspectRatio}, I2I: ${useI2I}, refs: ${referenceImages.length})`);

    // Generate all preview images in parallel (they're independent)
    const previewPromises = scenes.map(async (scene, i) => {
      // Scene 1: use start frame if provided
      if (i === 0 && startFrameUrl) {
        console.log(`[StoryboardPreviews] Scene 1: using existing start frame`);
        return {
          sceneNumber: scene.sceneNumber || i + 1,
          imageUrl: startFrameUrl,
          prompt: 'Existing start frame',
          source: 'start_frame',
        };
      }

      const basePrompt = scene.previewImagePrompt || scene.visualPrompt || '';
      if (!basePrompt) {
        console.warn(`[StoryboardPreviews] Scene ${i + 1}: no preview prompt, skipping`);
        return {
          sceneNumber: scene.sceneNumber || i + 1,
          imageUrl: null,
          prompt: '',
          error: 'No preview prompt available',
        };
      }

      try {
        let imageUrl;

        if (useI2I) {
          // I2I: pass reference images (starting image + character refs) so the
          // model can see and match art style, character design, and color palette
          console.log(`[StoryboardPreviews] Scene ${i + 1}: generating via I2I (nano-banana-2/edit) with ${referenceImages.length} reference(s)...`);
          imageUrl = await generateI2I(referenceImages, basePrompt, aspectRatio);
        } else {
          // Fallback: T2I with text description of style
          const prompt = startFrameDescription && basePrompt
            ? `Maintain exact same art style, rendering style, and color palette as: ${startFrameDescription.substring(0, 200)}. Scene: ${basePrompt}`
            : basePrompt;
          console.log(`[StoryboardPreviews] Scene ${i + 1}: generating via T2I...`);
          imageUrl = await generateImage(
            prompt,
            aspectRatio,
            keys,
            supabase,
            imageModel
          );
        }

        console.log(`[StoryboardPreviews] Scene ${i + 1}: done — ${imageUrl.substring(0, 80)}`);
        return {
          sceneNumber: scene.sceneNumber || i + 1,
          imageUrl,
          prompt: basePrompt,
          source: useI2I ? 'i2i' : 'generated',
        };
      } catch (err) {
        console.error(`[StoryboardPreviews] Scene ${i + 1} failed:`, err.message);
        return {
          sceneNumber: scene.sceneNumber || i + 1,
          imageUrl: null,
          prompt: basePrompt,
          error: err.message,
        };
      }
    });

    const previews = await Promise.all(previewPromises);
    const successCount = previews.filter(p => p.imageUrl).length;
    const failCount = previews.filter(p => !p.imageUrl).length;

    console.log(`[StoryboardPreviews] Complete: ${successCount} succeeded, ${failCount} failed`);

    if (req.user?.email) {
      logCost({
        username: req.user.email.split('@')[0],
        category: 'preview_images',
        operation: 'storyboard_previews',
        model: imageModel,
        count: successCount,
      });
    }

    return res.json({
      success: true,
      previews,
      stats: { total: scenes.length, generated: successCount, failed: failCount },
    });

  } catch (err) {
    console.error('[StoryboardPreviews] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
