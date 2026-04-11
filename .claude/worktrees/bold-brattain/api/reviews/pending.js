import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('review_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    return res.json({ request: data || null });
  } catch (err) {
    console.error('[Reviews] Pending error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
