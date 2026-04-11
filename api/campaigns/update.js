/**
 * PATCH /api/campaigns/:id
 * Updates campaign name.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const { id } = req.params;
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('campaigns')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, campaign: data });
}
