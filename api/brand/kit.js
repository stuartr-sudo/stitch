import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('brand_kit')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, brandKit: data });
  }

  if (req.method === 'POST') {
    const { brand_name, colors, logo_url, voice_style, taglines, style_preset } = req.body;

    const payload = {
      user_id: userId,
      brand_name: brand_name || null,
      colors: colors || [],
      logo_url: logo_url || null,
      voice_style: voice_style || 'professional',
      taglines: taglines || [],
      style_preset: style_preset || 'modern',
    };

    const { data, error } = await supabase
      .from('brand_kit')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, brandKit: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
