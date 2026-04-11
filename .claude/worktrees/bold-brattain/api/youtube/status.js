/**
 * GET /api/youtube/status?brand_username=xyz
 * Returns YouTube connection status for a brand.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { brand_username } = req.query;
  if (!brand_username) return res.status(400).json({ error: 'brand_username required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data } = await supabase
    .from('brand_youtube_tokens')
    .select('channel_id, channel_title')
    .eq('brand_username', brand_username)
    .eq('user_id', req.user.id)
    .maybeSingle();

  return res.json({
    connected: !!data,
    channel_id: data?.channel_id || null,
    channel_title: data?.channel_title || null,
  });
}
