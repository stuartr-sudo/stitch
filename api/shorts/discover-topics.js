/**
 * POST /api/shorts/discover-topics
 *
 * Body: { niche, framework?, count?, excludeTopics? }
 * Returns ranked hook suggestions for the given niche.
 */

import { discoverTopics } from '../lib/topicDiscovery.js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { getFramework } from '../lib/videoStyleFrameworks.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, framework: frameworkId, count = 5, excludeTopics = [] } = req.body;

  if (!niche) return res.status(400).json({ error: 'niche is required' });

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const framework = frameworkId ? getFramework(frameworkId) : null;

    const suggestions = await discoverTopics({
      niche,
      framework,
      count,
      excludeTopics,
      keys,
      brandUsername: req.user.email,
    });

    res.json({ success: true, suggestions });
  } catch (err) {
    console.error('[discover-topics] Error:', err.message);
    res.status(500).json({ error: err.message || 'Topic discovery failed' });
  }
}
