/**
 * Storyboard Preview Generator
 *
 * Generates a preview IMAGE for each scene. When a character reference image
 * is available, uses MiniMax Subject Reference (fal-ai/minimax/image-01/subject-reference)
 * to maintain character consistency across scenes — same character, different scene/action.
 *
 * Without character refs, falls back to standard T2I using the user's selected image model.
 *
 * POST /api/storyboard/generate-previews
 * Body: {
 *   scenes: [{ sceneNumber, previewImagePrompt, durationSeconds, narrativeNote, ... }],
 *   aspectRatio: '16:9' | '9:16' | '1:1',
 *   imageModel: 'fal_nano_banana' | 'fal_flux' | ...,
 *   startFrameUrl: string | null,
 *   startFrameDescription: string | null,
 *   characterReferenceUrls: string[],  // character ref images for subject consistency
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { generateImage, uploadUrlToSupabase, pollFalQueue } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';

const FAL_QUEUE = 'https://queue.fal.run';

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
      imageModel = 'fal_nano_banana',
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

    // Pick the best character reference: explicit character refs first, then starting image
    const characterRefUrl = characterReferenceUrls?.[0] || startFrameUrl || null;
    const useSubjectRef = !!characterRefUrl && !!keys.falKey;

    // MiniMax Subject Reference — generates a new scene with the same character identity
    const MINIMAX_ENDPOINT = 'fal-ai/minimax/image-01/subject-reference';
    async function generateWithSubjectRef(characterImageUrl, scenePrompt, ar) {
      // Submit to FAL queue
      const submitRes = await fetch(`${FAL_QUEUE}/${MINIMAX_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: scenePrompt,
          image_url: characterImageUrl,
          aspect_ratio: ar || '16:9',
          num_images: 1,
        }),
      });
      if (!submitRes.ok) throw new Error(`MiniMax Subject Ref submit failed: ${await submitRes.text()}`);
      const submitData = await submitRes.json();
      const requestId = submitData.request_id;
      if (!requestId) throw new Error('No request_id from MiniMax Subject Ref');

      // Poll for result
      const result = await pollFalQueue(requestId, MINIMAX_ENDPOINT, keys.falKey, 60, 3000);
      const imgUrl = result?.images?.[0]?.url;
      if (!imgUrl) throw new Error('No image URL from MiniMax Subject Ref result');
      return uploadUrlToSupabase(imgUrl, supabase, 'pipeline/images');
    }

    console.log(`[StoryboardPreviews] Generating ${scenes.length} preview images (model: ${imageModel}, aspect: ${aspectRatio}, subjectRef: ${useSubjectRef}, charRef: ${characterRefUrl ? 'yes' : 'no'})`);

    // Generate all preview images in parallel
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

        if (useSubjectRef) {
          // MiniMax Subject Reference: maintains character identity across different scenes
          console.log(`[StoryboardPreviews] Scene ${i + 1}: generating via MiniMax Subject Reference...`);
          imageUrl = await generateWithSubjectRef(characterRefUrl, basePrompt, aspectRatio);
        } else {
          // Fallback: standard T2I with text description of style
          const prompt = startFrameDescription && basePrompt
            ? `Maintain exact same art style, rendering style, and color palette as: ${startFrameDescription.substring(0, 200)}. Scene: ${basePrompt}`
            : basePrompt;
          console.log(`[StoryboardPreviews] Scene ${i + 1}: generating via T2I (${imageModel})...`);
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
          source: useSubjectRef ? 'subject_ref' : 'generated',
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
        category: 'fal',
        operation: 'storyboard_previews',
        model: useSubjectRef ? 'minimax-subject-ref' : imageModel,
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
