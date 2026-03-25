import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { body, status } = req.body || {};
  if (!body && !status) return res.status(400).json({ error: 'body or status is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const updates = {};
  if (body !== undefined) updates.body = body;
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from('linkedin_posts')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Post not found' });
  return res.json({ success: true, post: data });
}
