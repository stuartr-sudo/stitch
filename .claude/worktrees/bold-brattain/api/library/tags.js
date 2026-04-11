import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabase.rpc('get_user_tags_with_counts', { p_user_id: userId });

    if (error) {
      // Fallback to simple query if RPC not available
      const { data: tags, error: tagErr } = await supabase
        .from('image_tags')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (tagErr) return res.status(500).json({ error: tagErr.message });

      const tagsWithCounts = await Promise.all(tags.map(async (tag) => {
        const { count } = await supabase
          .from('image_tag_links')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id);
        const { data: latest } = await supabase
          .from('image_tag_links')
          .select('image_id, image_library_items(created_at)')
          .eq('tag_id', tag.id)
          .order('image_library_items(created_at)', { ascending: false })
          .limit(1)
          .maybeSingle();
        const last_used = latest?.image_library_items?.created_at || null;
        return { ...tag, count: count || 0, last_used };
      }));

      tagsWithCounts.sort((a, b) => {
        if (!a.last_used && !b.last_used) return 0;
        if (!a.last_used) return 1;
        if (!b.last_used) return -1;
        return new Date(b.last_used) - new Date(a.last_used);
      });

      return res.json({ tags: tagsWithCounts });
    }

    return res.json({ tags: data });
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Tag name required' });

    const trimmed = name.trim();

    const { data: existing } = await supabase
      .from('image_tags')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', trimmed)
      .maybeSingle();

    if (existing) return res.json({ tag: existing });

    const { data: tag, error } = await supabase
      .from('image_tags')
      .insert({ user_id: userId, name: trimmed })
      .select('id, name')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ tag });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
