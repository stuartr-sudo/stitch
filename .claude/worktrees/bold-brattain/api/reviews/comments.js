import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;
  const requestId = req.params.id;

  try {
    // Verify the request belongs to this user
    const { data: request, error: reqError } = await supabase
      .from('review_requests')
      .select('id')
      .eq('id', requestId)
      .eq('user_id', userId)
      .single();
    if (reqError || !request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const { author, content, commit_hash } = req.body;
    if (!author || !content) {
      return res.status(400).json({ error: 'author and content are required' });
    }

    const { data, error } = await supabase.from('review_comments').insert({
      request_id: requestId,
      author,
      content,
      commit_hash: commit_hash || null,
    }).select().single();
    if (error) throw error;

    return res.json({ comment: data });
  } catch (err) {
    console.error('[Reviews] Comment error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
