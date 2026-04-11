import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  // Parse URL segments: /api/intelligence/competitors/[:id][/refresh]
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/intelligence/competitors', '').split('/').filter(Boolean);

  try {
    // Root: list or create
    if (pathParts.length === 0) {
      if (req.method === 'GET') {
        const { data, error } = await supabase
          .from('competitors')
          .select('*, ad_library(count)')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        return res.json({ competitors: data || [] });
      }
      if (req.method === 'POST') {
        const { name, website_url, industry, notes } = req.body;
        if (!name) return res.status(400).json({ error: 'name required' });
        const { data, error } = await supabase
          .from('competitors')
          .insert({ user_id: userId, name, website_url: website_url || null, industry: industry || null, notes: notes || null })
          .select()
          .single();
        if (error) throw error;
        return res.json({ competitor: data });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const competitorId = pathParts[0];

    // /competitors/:id/refresh — re-search
    if (pathParts[1] === 'refresh' && req.method === 'POST') {
      await supabase.from('competitors').update({ last_researched_at: new Date().toISOString() }).eq('id', competitorId).eq('user_id', userId);
      return res.json({ refreshed: true });
    }

    // /competitors/:id — get, update, delete
    if (req.method === 'GET') {
      const { data: competitor, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('id', competitorId)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      if (!competitor) return res.status(404).json({ error: 'Not found' });

      const { data: ads } = await supabase
        .from('ad_library')
        .select('*')
        .eq('competitor_id', competitorId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return res.json({ competitor, ads: ads || [] });
    }

    if (req.method === 'PATCH') {
      const updates = {};
      for (const key of ['name', 'website_url', 'industry', 'notes']) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const { data, error } = await supabase
        .from('competitors')
        .update(updates)
        .eq('id', competitorId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return res.json({ competitor: data });
    }

    if (req.method === 'DELETE') {
      await supabase.from('ad_library').update({ competitor_id: null }).eq('competitor_id', competitorId).eq('user_id', userId);
      const { error } = await supabase.from('competitors').delete().eq('id', competitorId).eq('user_id', userId);
      if (error) throw error;
      return res.json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[intelligence/competitors] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
