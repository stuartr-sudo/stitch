/**
 * Storyboard Voiceover API
 *
 * POST /api/storyboard/generate-voiceover
 *
 * Two modes:
 *   1. Single scene preview: { sceneNumber, dialogue, voice, model }
 *      → Returns one audio URL for instant playback preview
 *
 *   2. Full storyboard batch: { scenes: [...], voice, model }
 *      → Returns all scene audio URLs + total duration
 *      → Adjusts scene durations based on TTS output (master clock)
 *
 * The voiceover audio is used for:
 *   - Scene duration calculation (TTS-as-master-clock)
 *   - Lipsync input (audio-driven mouth animation)
 *   - Final assembly mix (voiceover track)
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { generateSpeech, generateStoryboardVoiceover, TTS_MODELS, ELEVENLABS_VOICES } from '../lib/storyboardVoiceover.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Return available voices and models for the UI
    return res.json({
      models: Object.entries(TTS_MODELS).map(([key, config]) => ({
        id: key,
        label: config.label,
        description: config.description,
        costPer1kChars: config.costPer1kChars,
        defaultVoice: config.defaultVoice,
      })),
      voices: ELEVENLABS_VOICES,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    if (!keys.falKey) {
      return res.status(400).json({ error: 'FAL API key required for TTS.' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const {
      mode = 'single',      // 'single' or 'batch'
      // Single mode
      sceneNumber,
      dialogue,
      // Batch mode
      scenes,
      // Shared settings
      model = 'elevenlabs-v3',
      voice = 'Rachel',
      speed = 1.0,
      stability = 0.5,
      // Duration adjustment
      modelDurationConstraints, // { allowed: [4, 6, 8] } — snap TTS duration to nearest allowed
    } = req.body;

    const ttsOptions = {
      model,
      voice,
      speed,
      stability,
      falKey: keys.falKey,
      supabase,
    };

    // ── Single Scene Preview ──
    if (mode === 'single' || (!scenes && dialogue)) {
      if (!dialogue?.trim()) {
        return res.status(400).json({ error: 'No dialogue text provided' });
      }

      console.log(`[Voiceover API] Single scene: "${dialogue.substring(0, 60)}..."`);
      const result = await generateSpeech(dialogue, ttsOptions);

      if (req.user?.email) {
        logCost({
          username: req.user.email.split('@')[0],
          category: 'tts',
          operation: 'voiceover_preview',
          model,
          input_chars: result.charCount,
        });
      }

      return res.json({
        success: true,
        mode: 'single',
        sceneNumber: sceneNumber || 1,
        audioUrl: result.audioUrl,
        durationSeconds: result.durationSeconds,
        timestamps: result.timestamps,
        voice: result.voice,
        estimatedCost: result.estimatedCost,
      });
    }

    // ── Batch (Full Storyboard) ──
    if (!scenes?.length) {
      return res.status(400).json({ error: 'No scenes provided for batch voiceover' });
    }

    console.log(`[Voiceover API] Batch: ${scenes.length} scenes, model: ${model}, voice: ${voice}`);
    const batchResult = await generateStoryboardVoiceover(scenes, ttsOptions);

    // Adjust scene durations based on TTS output (TTS-as-master-clock)
    const adjustedScenes = scenes.map(scene => {
      const audioResult = batchResult.results.find(r => r.sceneNumber === scene.sceneNumber);
      if (!audioResult?.durationSeconds) return scene;

      let adjustedDuration = audioResult.durationSeconds;

      // Add 0.5s buffer for breathing room
      adjustedDuration = Math.ceil(adjustedDuration + 0.5);

      // Snap to allowed durations if model constraints provided
      if (modelDurationConstraints?.allowed?.length) {
        const allowed = modelDurationConstraints.allowed;
        // Find smallest allowed duration that fits the TTS audio
        const fitting = allowed.filter(d => d >= adjustedDuration);
        adjustedDuration = fitting.length > 0 ? fitting[0] : allowed[allowed.length - 1];
      }

      return {
        ...scene,
        durationSeconds: adjustedDuration,
        originalDuration: scene.durationSeconds,
        ttsDuration: audioResult.durationSeconds,
      };
    });

    if (req.user?.email) {
      logCost({
        username: req.user.email.split('@')[0],
        category: 'tts',
        operation: 'voiceover_batch',
        model,
        count: batchResult.scenesWithAudio,
        total_chars: batchResult.results.reduce((sum, r) => sum + (r.charCount || 0), 0),
      });
    }

    return res.json({
      success: true,
      mode: 'batch',
      results: batchResult.results.map(r => ({
        sceneNumber: r.sceneNumber,
        audioUrl: r.audioUrl,
        durationSeconds: r.durationSeconds,
        timestamps: r.timestamps,
        voice: r.voice,
        skipped: r.skipped,
        error: r.error,
      })),
      adjustedScenes,
      totalDuration: batchResult.totalDuration,
      totalCost: batchResult.totalCost,
      stats: {
        withAudio: batchResult.scenesWithAudio,
        skipped: batchResult.scenesSkipped,
        failed: batchResult.scenesFailed,
      },
    });

  } catch (err) {
    console.error('[Voiceover API] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
