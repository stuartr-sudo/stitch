import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;
  const requestId = req.params.id;

  try {
    // Update status to resolved
    const { data: request, error: updateError } = await supabase
      .from('review_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('user_id', userId)
      .select()
      .single();
    if (updateError) throw updateError;

    // If content provided, also add a comment
    if (req.body.content) {
      await supabase.from('review_comments').insert({
        request_id: requestId,
        author: req.body.author || 'claude',
        content: req.body.content,
        commit_hash: req.body.commit_hash || null,
      });
    }

    return res.json({ request });
  } catch (err) {
    console.error('[Reviews] Resolve error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
