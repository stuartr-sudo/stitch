/**
 * POST /api/shorts/topics
 *
 * Generate topic ideas for a niche — for cherry-picking before batch production.
 *
 * Body: { niche, count?, exclude_topics?, brand_username }
 * Response: { topics: [{ title, hook_idea }] }
 */

import { createClient } from '@supabase/supabase-js';
import { getShortsTemplate, listShortsNiches } from '../lib/shortsTemplates.js';
import { generateTopics } from '../lib/scriptGenerator.js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, count = 10, exclude_topics = [], brand_username } = req.body;

  if (!brand_username) return res.status(400).json({ error: 'Missing brand_username' });
  if (!niche) return res.status(400).json({ error: 'Missing niche' });

  const nicheTemplate = getShortsTemplate(niche);
  if (!nicheTemplate) {
    return res.status(400).json({ error: `Unknown niche: ${niche}`, available: listShortsNiches() });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Resolve user_id: try brand_kit first, fall back to company_information, then authenticated user
  const userId = await resolveUserIdFromBrand(brand_username, supabase, req.user?.id);
  if (!userId) return res.status(404).json({ error: `Brand not found: ${brand_username}` });

  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('openai_key')
    .eq('user_id', userId)
    .maybeSingle();

  const openaiKey = userKeys?.openai_key || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

  try {
    const topics = await generateTopics({
      niche,
      nicheName: nicheTemplate.name,
      count: Math.min(count, 20),
      excludeTopics: exclude_topics,
      keys: { openaiKey },
      brandUsername: brand_username,
    });

    return res.json({ topics, niche, count: topics.length });
  } catch (err) {
    console.error('[shorts/topics] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
