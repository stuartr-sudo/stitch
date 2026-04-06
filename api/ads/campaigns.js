/**
 * POST /api/ads/campaigns — Create a new ad campaign
 * GET  /api/ads/campaigns — List all campaigns for user
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (req.method === 'POST') {
    const { name, objective, platforms, landing_url, product_description, target_audience, brand_kit_id, writing_style } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    const VALID_STYLES = ['default', 'storytelling', 'data_driven', 'conversational', 'professional'];
    const style = VALID_STYLES.includes(writing_style) ? writing_style : 'default';

    const { data, error } = await supabase
      .from('ad_campaigns')
      .insert({
        user_id: req.user.id,
        name,
        objective: objective || 'traffic',
        platforms: platforms || ['linkedin'],
        landing_url: landing_url || null,
        product_description: product_description || null,
        target_audience: target_audience || null,
        brand_kit_id: brand_kit_id || null,
        writing_style: style,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ campaign: data });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('ad_campaigns')
      .select('*, ad_variations(id, platform, ad_format, status)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ campaigns: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
