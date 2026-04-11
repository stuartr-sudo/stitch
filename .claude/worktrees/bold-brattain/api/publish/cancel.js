/**
 * POST /api/publish/cancel
 *
 * Body: { queue_id }
 * Returns: { success: true }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { queue_id } = req.body;
  const userId = req.user.id;

  if (!queue_id) return res.status(400).json({ error: 'queue_id is required' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Verify item exists, belongs to user, and is scheduled
  const { data: item, error: fetchErr } = await supabase
    .from('publish_queue')
    .select('id, status')
    .eq('id', queue_id)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !item) {
    return res.status(404).json({ error: 'Queue item not found' });
  }

  if (item.status !== 'scheduled') {
    return res.status(400).json({ error: 'Only scheduled items can be cancelled' });
  }

  const { error: deleteErr } = await supabase
    .from('publish_queue')
    .delete()
    .eq('id', queue_id);

  if (deleteErr) {
    return res.status(500).json({ error: 'Failed to cancel' });
  }

  return res.json({ success: true });
}
