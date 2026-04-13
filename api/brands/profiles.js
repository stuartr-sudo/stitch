/**
 * Brand Profile CRUD
 * POST /api/brands/profiles — create or update
 * GET /api/brands/profiles — list user's profiles
 * GET /api/brands/profiles/:id — get single profile
 * DELETE /api/brands/profiles/:id — deactivate
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Auth required' });

  // Extract ID from URL path if present
  const urlParts = req.url.split('/');
  const profileId = urlParts.length > 4 ? urlParts[4]?.split('?')[0] : null;

  try {
    // GET /api/brands/profiles — list all
    if (req.method === 'GET' && !profileId) {
      const { data, error } = await supabase.from('brand_profiles')
        .select('id, brand_name, brand_slug, brand_logo_url, brand_domain, primary_niche, content_angles, is_active, created_at, updated_at, brand_kit_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return res.json({ profiles: data || [] });
    }

    // GET /api/brands/profiles/:id — get single
    if (req.method === 'GET' && profileId) {
      const { data, error } = await supabase.from('brand_profiles')
        .select('*')
        .eq('id', profileId)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      return res.json({ profile: data });
    }

    // POST — create or update
    if (req.method === 'POST') {
      const { id, ...fields } = req.body;

      if (id) {
        // Update
        const { data, error } = await supabase.from('brand_profiles')
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', userId)
          .select('id')
          .single();
        if (error) throw error;
        return res.json({ profile_id: data.id, updated: true });
      }

      // Create
      if (!fields.brand_name) return res.status(400).json({ error: 'brand_name required' });
      if (!fields.brand_domain) return res.status(400).json({ error: 'brand_domain required' });

      // Auto-generate slug
      const slug = fields.brand_slug || fields.brand_name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const { data, error } = await supabase.from('brand_profiles').insert({
        user_id: userId,
        brand_slug: slug,
        ...fields,
      }).select('id').single();
      if (error) throw error;

      console.log(`[brand-profiles] Created: ${fields.brand_name} (${data.id})`);
      return res.json({ profile_id: data.id, created: true });
    }

    // DELETE — soft delete (set is_active = false)
    if (req.method === 'DELETE' && profileId) {
      const { error } = await supabase.from('brand_profiles')
        .update({ is_active: false })
        .eq('id', profileId)
        .eq('user_id', userId);
      if (error) throw error;
      return res.json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[brand-profiles] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
