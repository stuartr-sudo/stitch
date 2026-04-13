import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { platform } = req.query || {};

    // Build topic query
    let query = supabase
      .from('social_topics')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: topics, error: topicsErr } = await query;
    if (topicsErr) return res.status(500).json({ error: topicsErr.message });

    // Fetch all posts for these topics in one query
    const topicIds = (topics || []).map(t => t.id);
    let postsMap = {};

    if (topicIds.length > 0) {
      const { data: posts, error: postsErr } = await supabase
        .from('social_posts')
        .select('*')
        .in('topic_id', topicIds)
        .order('created_at', { ascending: false });

      if (!postsErr && posts) {
        for (const post of posts) {
          if (!postsMap[post.topic_id]) postsMap[post.topic_id] = [];
          postsMap[post.topic_id].push(post);
        }
      }
    }

    // Attach posts array to each topic
    const enriched = (topics || []).map(t => ({
      ...t,
      posts: postsMap[t.id] || [],
    }));

    return res.json({ topics: enriched });
  } catch (err) {
    console.error('[social/list-topics] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
