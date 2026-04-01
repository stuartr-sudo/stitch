/**
 * GET /api/batch/list
 *
 * Returns the user's 20 most recent batches.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.user.id;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: batches, error } = await supabase
    .from('batches')
    .select('id, niche, status, total_items, completed_items, failed_items, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch batches' });
  }

  return res.json({ batches: batches || [] });
}
