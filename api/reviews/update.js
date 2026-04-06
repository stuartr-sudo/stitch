import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;
  const requestId = req.params.id;

  try {
    const updates = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.priority) updates.priority = req.body.priority;

    // resolved_at rule: set when transitioning to resolved/closed, clear when re-opening
    if (updates.status === 'resolved' || updates.status === 'closed') {
      updates.resolved_at = new Date().toISOString();
    } else if (updates.status === 'pending') {
      updates.resolved_at = null;
    }

    const { data, error } = await supabase
      .from('review_requests')
      .update(updates)
      .eq('id', requestId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;

    return res.json({ request: data });
  } catch (err) {
    console.error('[Reviews] Update error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
