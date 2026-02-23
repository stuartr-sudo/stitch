/**
 * /api/brand/avatars  (table: visual_subjects)
 *
 * GET  — list all visual subjects for the authenticated user
 * POST — create a new visual subject (LoRA reference)
 *
 * /api/brand/avatars/:id
 * DELETE — delete a visual subject (ownership verified)
 *
 * Note: the API path keeps "avatars" for backwards compatibility with existing
 * frontend calls, but the underlying table is now "visual_subjects".
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('visual_subjects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, avatars: data || [] });
  }

  if (req.method === 'POST') {
    const {
      brand_username,
      name,
      description = '',
      reference_image_url = null,
      lora_url = null,
      lora_trigger_word = null,
      is_active = true,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Visual subject name is required' });

    const { data, error } = await supabase
      .from('visual_subjects')
      .insert({
        user_id: userId,
        brand_username: brand_username || 'default',
        name: name.trim(),
        description,
        reference_image_url,
        lora_url,
        lora_trigger_word,
        is_active,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, avatar: data });
  }

  // DELETE — handled via req.params.id set by server.js
  if (req.method === 'DELETE') {
    const id = req.params?.id || req.query?.id;
    if (!id) return res.status(400).json({ error: 'Visual subject ID required' });

    const { error } = await supabase
      .from('visual_subjects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
