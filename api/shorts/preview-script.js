/**
 * POST /api/shorts/preview-script
 *
 * Generate a script preview only — no full pipeline, no job created.
 * Allows the user to read and edit the script before committing to generation.
 *
 * Body: {
 *   niche: string,
 *   topic?: string,
 *   brand_username: string,
 * }
 *
 * Response: { script, niche }
 */

import { createClient } from '@supabase/supabase-js';
import { getShortsTemplate } from '../lib/shortsTemplates.js';
import { generateScript } from '../lib/scriptGenerator.js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, topic, brand_username } = req.body;

  if (!brand_username || !niche) {
    return res.status(400).json({ error: 'Missing niche or brand_username' });
  }

  const nicheTemplate = getShortsTemplate(niche);
  if (!nicheTemplate) {
    return res.status(400).json({ error: `Unknown niche: ${niche}` });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const userId = await resolveUserIdFromBrand(brand_username, supabase, req.user?.id);
  if (!userId) return res.status(404).json({ error: 'Brand not found' });

  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('openai_key')
    .eq('user_id', userId)
    .maybeSingle();

  const openaiKey = userKeys?.openai_key || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

  try {
    const script = await generateScript({
      niche,
      topic,
      nicheTemplate,
      keys: { openaiKey },
      brandUsername: brand_username,
    });

    return res.json({ script, niche });
  } catch (err) {
    console.error('[shorts/preview-script] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
