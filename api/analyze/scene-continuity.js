/**
 * POST /api/analyze/scene-continuity
 *
 * Analyzes a generated video scene using Gemini native video understanding
 * for continuity with the next scene in a Shorts Builder pipeline.
 *
 * Body: { video_url, scene_label, next_scene_label, narration }
 * Returns: { analysis: string }
 */

import { analyzeSceneVideo } from '../lib/geminiVideoAnalyzer.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { video_url, scene_label, next_scene_label, narration } = req.body;

  if (!video_url) return res.status(400).json({ error: 'video_url is required' });

  try {
    const analysis = await analyzeSceneVideo(video_url, {
      sceneLabel: scene_label || 'Unknown',
      nextSceneLabel: next_scene_label || 'Next scene',
      narration: narration || '',
    });

    return res.json({ success: true, analysis });
  } catch (err) {
    console.error('[scene-continuity]', err.message);
    // Non-fatal — return narration fallback so pipeline doesn't break
    return res.json({
      success: true,
      analysis: `Previous scene "${scene_label || 'Unknown'}": ${narration || 'No narration available'}`,
      warning: err.message,
    });
  }
}
