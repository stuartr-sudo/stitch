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
import { generateImage } from '../lib/pipelineHelpers.js';
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
    } = req.body;

    if (!scenes?.length) {
      return res.status(400).json({ error: 'No scenes provided' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log(`[StoryboardPreviews] Generating ${scenes.length} preview images (model: ${imageModel}, aspect: ${aspectRatio})`);

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

      const prompt = scene.previewImagePrompt || scene.visualPrompt || '';
      if (!prompt) {
        console.warn(`[StoryboardPreviews] Scene ${i + 1}: no preview prompt, skipping`);
        return {
          sceneNumber: scene.sceneNumber || i + 1,
          imageUrl: null,
          prompt: '',
          error: 'No preview prompt available',
        };
      }

      try {
        console.log(`[StoryboardPreviews] Scene ${i + 1}: generating preview...`);
        const imageUrl = await generateImage(
          prompt,
          aspectRatio,
          keys,
          supabase,
          imageModel
        );

        console.log(`[StoryboardPreviews] Scene ${i + 1}: done — ${imageUrl.substring(0, 80)}`);
        return {
          sceneNumber: scene.sceneNumber || i + 1,
          imageUrl,
          prompt,
          source: 'generated',
        };
      } catch (err) {
        console.error(`[StoryboardPreviews] Scene ${i + 1} failed:`, err.message);
        return {
          sceneNumber: scene.sceneNumber || i + 1,
          imageUrl: null,
          prompt,
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
