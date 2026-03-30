import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const {
    title = 'Untitled Carousel',
    platform = 'instagram',
    aspect_ratio = '1080x1080',
    brand_kit_id = null,
    style_preset = null,
    color_template = 0,
    source_url = null,
  } = req.body || {};

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('carousels')
    .insert({
      user_id: req.user.id,
      title,
      platform,
      aspect_ratio,
      brand_kit_id: brand_kit_id || null,
      style_preset: style_preset || null,
      color_template,
      source_url: source_url || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, carousel: data });
}
