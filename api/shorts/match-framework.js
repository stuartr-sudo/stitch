/**
 * POST /api/shorts/match-framework
 *
 * Matches a topic to the best framework using embedding cosine similarity.
 *
 * Body: { topic: string, niche: string }
 * Returns: { frameworkId, frameworkName, category, score, topMatches }
 */

import { matchFramework } from '../lib/frameworkMatcher.js';
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic, niche } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const openaiKey = keys.openaiKey || process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

    const result = await matchFramework(topic, niche || null, openaiKey);

    return res.json({
      success: true,
      frameworkId: result.frameworkId,
      frameworkName: result.frameworkName,
      category: result.category,
      score: result.score,
      topMatches: result.allScores,
    });
  } catch (err) {
    console.error('[match-framework]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
