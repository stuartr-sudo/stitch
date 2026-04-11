/**
 * POST /api/youtube/disconnect
 * Body: { brand_username }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { brand_username } = req.body;
  if (!brand_username) return res.status(400).json({ error: 'brand_username required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await supabase
    .from('brand_youtube_tokens')
    .delete()
    .eq('brand_username', brand_username)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });

  return res.json({ success: true });
}
