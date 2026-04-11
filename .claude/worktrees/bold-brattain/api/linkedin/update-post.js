import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { content, body, status } = req.body || {};
  const text = content ?? body; // frontend sends 'content', accept both
  if (text === undefined && status === undefined) return res.status(400).json({ error: 'content or status is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const updates = {};
  if (text !== undefined) updates.content = text;
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from('linkedin_posts')
    .update(updates)
    .eq('id', req.params.id)
    .eq('username', req.user.email)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Post not found' });
  return res.json({ success: true, post: data });
}
