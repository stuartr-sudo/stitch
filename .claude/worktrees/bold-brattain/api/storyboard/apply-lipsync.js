/**
 * Storyboard Lipsync API
 *
 * POST /api/storyboard/apply-lipsync
 *
 * Two modes:
 *   1. Single scene: { videoUrl, audioUrl, model }
 *      → Returns lipsynced video URL
 *
 *   2. Batch (full storyboard): { scenes: [...], model, contentType }
 *      → Returns all lipsynced scene URLs
 *
 * GET /api/storyboard/apply-lipsync
 *   → Returns available models and recommendation logic
 *
 * This is a POST-PRODUCTION step that runs AFTER both video generation
 * and voiceover generation are complete.
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { applyLipsync, applyStoryboardLipsync, recommendLipsyncModel, LIPSYNC_MODELS } from '../lib/storyboardLipsync.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.json({
      models: Object.entries(LIPSYNC_MODELS).map(([key, config]) => ({
        id: key,
        label: config.label,
        description: config.description,
        costDescription: config.costDescription,
        bestFor: config.bestFor,
        inputType: config.inputType,
        processingTime: config.processingTime,
      })),
      recommendations: {
        cartoon: recommendLipsyncModel({ contentType: 'cartoon' }),
        realistic: recommendLipsyncModel({ contentType: 'realistic' }),
        realistic_closeup: recommendLipsyncModel({ contentType: 'realistic', isCloseUp: true }),
        budget: recommendLipsyncModel({ contentType: 'realistic', budgetMode: true }),
        avatar_from_image: recommendLipsyncModel({ hasVideoAlready: false }),
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    if (!keys.falKey) {
      return res.status(400).json({ error: 'FAL API key required for lipsync.' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const {
      mode = 'single',
      // Single mode
      videoUrl,
      audioUrl,
      imageUrl,
      // Batch mode
      scenes,
      // Shared
      model,             // Override model selection
      contentType = 'cartoon', // 'cartoon'|'realistic'|'anime'|'3d'
      isCloseUp = false,
      budgetMode = false,
    } = req.body;

    // ── Single Scene ──
    if (mode === 'single' || (!scenes && videoUrl)) {
      if (!videoUrl && !imageUrl) {
        return res.status(400).json({ error: 'Video URL or image URL required' });
      }
      if (!audioUrl) {
        return res.status(400).json({ error: 'Audio URL required for lipsync' });
      }

      const effectiveModel = model || recommendLipsyncModel({
        contentType,
        isCloseUp,
        budgetMode,
        hasVideoAlready: !!videoUrl,
      });

      console.log(`[Lipsync API] Single scene: model=${effectiveModel}`);

      const result = await applyLipsync({
        videoUrl,
        audioUrl,
        imageUrl,
        model: effectiveModel,
        falKey: keys.falKey,
        supabase,
      });

      if (req.user?.email) {
        logCost({
          username: req.user.email.split('@')[0],
          category: 'lipsync',
          operation: 'lipsync_single',
          model: result.model,
        });
      }

      return res.json({
        success: true,
        mode: 'single',
        videoUrl: result.videoUrl,
        model: result.model,
        processingTime: result.processingTime,
      });
    }

    // ── Batch ──
    if (!scenes?.length) {
      return res.status(400).json({ error: 'No scenes provided for batch lipsync' });
    }

    // Filter to only scenes that have both video and audio
    const eligibleScenes = scenes.filter(s => s.videoUrl && s.audioUrl);
    if (eligibleScenes.length === 0) {
      return res.status(400).json({
        error: 'No scenes have both video and audio. Generate voiceover first.',
        hint: 'Only scenes with dialogue get lipsync. Run voiceover generation before lipsync.',
      });
    }

    console.log(`[Lipsync API] Batch: ${eligibleScenes.length}/${scenes.length} eligible scenes`);

    const batchResult = await applyStoryboardLipsync(scenes, {
      model,
      contentType,
      isCloseUp,
      budgetMode,
      falKey: keys.falKey,
      supabase,
    });

    if (req.user?.email) {
      logCost({
        username: req.user.email.split('@')[0],
        category: 'lipsync',
        operation: 'lipsync_batch',
        model: batchResult.model,
        count: batchResult.stats.processed,
      });
    }

    return res.json({
      success: true,
      mode: 'batch',
      model: batchResult.model,
      results: batchResult.results.map(r => ({
        sceneNumber: r.sceneNumber,
        lipsyncVideoUrl: r.lipsyncVideoUrl,
        originalVideoUrl: r.originalVideoUrl,
        processingTime: r.processingTime,
        skipped: r.skipped,
        reason: r.reason,
        error: r.error,
      })),
      stats: batchResult.stats,
    });

  } catch (err) {
    console.error('[Lipsync API] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
