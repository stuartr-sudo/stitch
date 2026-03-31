/**
 * PATCH  /api/ads/variations/:id — Update copy_data or image_urls
 * DELETE /api/ads/variations/:id — Remove a variation
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { id } = req.params;

  if (req.method === 'PATCH') {
    const allowed = ['copy_data', 'image_urls', 'status', 'ad_format'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const { data, error } = await supabase
      .from('ad_variations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ variation: data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('ad_variations')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
