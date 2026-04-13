import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { topicId } = req.params;
  if (!topicId) return res.status(400).json({ error: 'topicId is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: topic, error: topicErr } = await supabase
      .from('social_topics')
      .select('*')
      .eq('id', topicId)
      .eq('user_id', req.user.id)
      .single();

    if (topicErr || !topic) return res.status(404).json({ error: 'Topic not found' });

    const { data: posts, error: postsErr } = await supabase
      .from('social_posts')
      .select('*')
      .eq('topic_id', topicId)
      .order('created_at', { ascending: false });

    if (postsErr) return res.status(500).json({ error: postsErr.message });

    return res.json({ topic, posts: posts || [] });
  } catch (err) {
    console.error('[social/get-topic] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
