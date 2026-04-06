import { createClient } from '@supabase/supabase-js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';

// Archive an image URL to permanent Supabase storage
async function archiveCreative(url, supabase, userId) {
  if (!url) return null;
  // Skip if already a Supabase URL
  if (url.includes('.supabase.co/storage/')) return url;
  try {
    const archived = await uploadUrlToSupabase(url, supabase, `intelligence/${userId}`);
    return archived || url;
  } catch (err) {
    console.warn('[intelligence/library] Creative archive failed, keeping original URL:', err.message);
    return url; // Graceful fallback
  }
}

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.replace('/api/intelligence/library', '').split('/').filter(Boolean);

  try {
    // Root: list or save
    if (pathParts.length === 0) {
      if (req.method === 'GET') {
        let query = supabase
          .from('ad_library')
          .select('*, competitors(name)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        const params = url.searchParams;
        if (params.get('competitor_id')) query = query.eq('competitor_id', params.get('competitor_id'));
        if (params.get('platform')) query = query.eq('platform', params.get('platform'));
        if (params.get('favorite') === 'true') query = query.eq('is_favorite', true);

        const { data, error } = await query;
        if (error) throw error;
        return res.json({ items: data || [] });
      }
      if (req.method === 'POST') {
        const { source_url, platform, ad_format, ad_copy, thumbnail_url, landing_page_url, analysis, landing_page_analysis, clone_recipe, niche, tags, competitor_id, notes } = req.body;

        // Archive the creative image to permanent Supabase storage
        const archivedUrl = await archiveCreative(thumbnail_url, supabase, userId);

        const { data, error } = await supabase
          .from('ad_library')
          .insert({
            user_id: userId,
            source_url: source_url || null,
            platform: platform || null,
            ad_format: ad_format || null,
            ad_copy: ad_copy || null,
            thumbnail_url: archivedUrl || null,
            landing_page_url: landing_page_url || null,
            analysis: analysis || null,
            landing_page_analysis: landing_page_analysis || null,
            clone_recipe: clone_recipe || null,
            niche: niche || null,
            tags: tags || [],
            competitor_id: competitor_id || null,
            notes: notes || null,
            is_favorite: false,
            discovered_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return res.json({ saved: data });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const itemId = pathParts[0];
    const action = pathParts[1]; // e.g. /library/:id/re-archive

    // POST /library/:id/re-archive — re-download and archive a creative whose URL may have expired
    if (req.method === 'POST' && action === 're-archive') {
      const { data: item } = await supabase
        .from('ad_library')
        .select('thumbnail_url')
        .eq('id', itemId)
        .eq('user_id', userId)
        .single();

      if (!item) return res.status(404).json({ error: 'Item not found' });

      if (item.thumbnail_url?.includes('.supabase.co/storage/')) {
        return res.json({ already_archived: true, thumbnail_url: item.thumbnail_url });
      }

      const archivedUrl = await archiveCreative(item.thumbnail_url, supabase, userId);
      if (archivedUrl && archivedUrl !== item.thumbnail_url) {
        await supabase
          .from('ad_library')
          .update({ thumbnail_url: archivedUrl })
          .eq('id', itemId)
          .eq('user_id', userId);
        return res.json({ archived: true, thumbnail_url: archivedUrl });
      }
      return res.json({ archived: false, note: 'Could not archive — URL may already be expired' });
    }

    // PATCH /library/:id — update fields
    if (req.method === 'PATCH') {
      const updates = {};
      for (const key of ['tags', 'notes', 'is_favorite', 'competitor_id', 'analysis', 'landing_page_analysis', 'landing_page_url']) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      const { data, error } = await supabase
        .from('ad_library')
        .update(updates)
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return res.json({ updated: data });
    }

    // DELETE /library/:id
    if (req.method === 'DELETE') {
      const { error } = await supabase.from('ad_library').delete().eq('id', itemId).eq('user_id', userId);
      if (error) throw error;
      return res.json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[intelligence/library] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
