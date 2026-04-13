import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { topicId } = req.params;
  if (!topicId) return res.status(400).json({ error: 'topicId is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Delete posts first (in case no cascade is set on FK)
    await supabase
      .from('social_posts')
      .delete()
      .eq('topic_id', topicId);

    const { error } = await supabase
      .from('social_topics')
      .delete()
      .eq('id', topicId)
      .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ success: true });
  } catch (err) {
    console.error('[social/delete-topic] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
