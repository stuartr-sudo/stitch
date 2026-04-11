import { createClient } from '@supabase/supabase-js';

const BRAND_FIELDS = [
  'brand_name', 'brand_username', 'colors', 'logo_url', 'voice_style',
  'taglines', 'style_preset', 'target_market', 'brand_personality',
  'brand_voice_detail', 'content_style_rules', 'preferred_elements',
  'prohibited_elements', 'visual_style_notes', 'mood_atmosphere',
  'lighting_prefs', 'composition_style', 'ai_prompt_rules', 'blurb', 'website',
  'default_loras',
];

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  // GET — return all brands for this user
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('brand_kit')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Backward compat: also return brandKit (singular) as the first one
    return res.json({ success: true, brands: data || [], brandKit: data?.[0] || null });
  }

  // POST — create or update a brand
  if (req.method === 'POST') {
    const { id, ...fields } = req.body;

    const payload = { user_id: userId };
    for (const key of BRAND_FIELDS) {
      if (key in fields) {
        payload[key] = fields[key] ?? null;
      }
    }

    // Defaults for required fields
    if (!payload.voice_style) payload.voice_style = 'professional';
    if (!payload.style_preset) payload.style_preset = 'modern';
    if (!payload.colors) payload.colors = [];
    if (!payload.taglines) payload.taglines = [];

    let data, error;

    if (id) {
      // Update existing brand
      ({ data, error } = await supabase
        .from('brand_kit')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single());
    } else {
      // Create new brand
      ({ data, error } = await supabase
        .from('brand_kit')
        .insert(payload)
        .select()
        .single());
    }

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, brandKit: data });
  }

  // DELETE — remove a brand
  if (req.method === 'DELETE') {
    const brandId = req.query?.id || req.body?.id;
    if (!brandId) return res.status(400).json({ error: 'Brand id required' });

    const { error } = await supabase
      .from('brand_kit')
      .delete()
      .eq('id', brandId)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
