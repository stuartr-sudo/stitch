import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;
  const requestId = req.params.id;

  try {
    const { data: request, error: reqError } = await supabase
      .from('review_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', userId)
      .single();
    if (reqError) throw reqError;
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const { data: comments, error: commError } = await supabase
      .from('review_comments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (commError) throw commError;

    return res.json({ request: { ...request, comments: comments || [] } });
  } catch (err) {
    console.error('[Reviews] Get error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
