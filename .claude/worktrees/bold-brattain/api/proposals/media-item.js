import { createClient } from '@supabase/supabase-js';

const ALLOWED_SLUGS = ['hamilton-city-council'];

export default async function handler(req, res) {
  const { slug, id } = req.params;

  if (!ALLOWED_SLUGS.includes(slug)) {
    return res.status(400).json({ error: 'Invalid proposal slug' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method === 'DELETE') {
    const { data, error } = await supabase
      .from('proposal_media')
      .delete()
      .eq('id', id)
      .eq('proposal_slug', slug)
      .select();

    if (error) {
      console.error('[Proposal Media] Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete media' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Media item not found' });
    }

    return res.json({ success: true });
  }

  if (req.method === 'PATCH') {
    const updates = {};
    if (req.body.caption !== undefined) updates.caption = req.body.caption;
    if (req.body.sort_order !== undefined) updates.sort_order = req.body.sort_order;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.updated_at = new Date().toISOString();

    const { data: item, error } = await supabase
      .from('proposal_media')
      .update(updates)
      .eq('id', id)
      .eq('proposal_slug', slug)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Media item not found' });
      }
      console.error('[Proposal Media] Update error:', error);
      return res.status(500).json({ error: 'Failed to update media' });
    }

    return res.json({ item });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
