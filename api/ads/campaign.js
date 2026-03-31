/**
 * GET    /api/ads/campaigns/:id — Get single campaign with variations
 * PATCH  /api/ads/campaigns/:id — Update campaign fields
 * DELETE /api/ads/campaigns/:id — Delete campaign + cascade variations
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { id } = req.params;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('*, ad_variations(*)')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Campaign not found' });
    return res.json({ campaign: data });
  }

  if (req.method === 'PATCH') {
    const allowed = ['name', 'objective', 'platforms', 'landing_url', 'product_description', 'target_audience', 'brand_kit_id', 'status'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const { data, error } = await supabase
      .from('ad_campaigns')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ campaign: data });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('ad_campaigns')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
