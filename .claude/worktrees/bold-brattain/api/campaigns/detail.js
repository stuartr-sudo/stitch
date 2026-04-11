/**
 * GET /api/campaigns/:id
 * Returns full campaign detail including all ad drafts with their assets.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing campaign ID' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*, ad_drafts(*)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !campaign) return res.status(404).json({ error: 'Campaign not found' });

  return res.json({ success: true, campaign });
}
