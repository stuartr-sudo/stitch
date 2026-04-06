import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'post id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: post, error } = await supabase
    .from('linkedin_posts')
    .select('*, linkedin_topics(*)')
    .eq('id', id)
    .eq('username', req.user.email)
    .single();

  if (error || !post) return res.status(404).json({ error: 'Post not found' });

  return res.json({ post });
}
