/**
 * POST /api/templates/assign
 * Assigns a saved template to one or more brand_usernames.
 * For each username, creates a copy of the template scoped to that brand.
 * If the template already exists for a given username, it updates it.
 *
 * Body: { template_id: uuid, usernames: string[] }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { template_id, usernames } = req.body;

  if (!template_id) return res.status(400).json({ error: 'template_id is required' });
  if (!usernames?.length) return res.status(400).json({ error: 'At least one username is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Fetch the source template (verify ownership)
  const { data: source, error: fetchErr } = await supabase
    .from('user_templates')
    .select('*')
    .eq('id', template_id)
    .eq('user_id', req.user.id)
    .single();

  if (fetchErr || !source) {
    return res.status(404).json({ error: 'Template not found or access denied' });
  }

  const results = [];

  for (const username of usernames) {
    // Check if this user already has a copy of this template for this brand
    const { data: existing } = await supabase
      .from('user_templates')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('name', source.name)
      .eq('brand_username', username)
      .maybeSingle();

    const payload = {
      user_id: req.user.id,
      name: source.name,
      description: source.description,
      scene_count: source.scene_count,
      total_duration_seconds: source.total_duration_seconds,
      scenes: source.scenes,
      music_mood: source.music_mood,
      voice_pacing: source.voice_pacing,
      reference_video_url: source.reference_video_url,
      thumbnail_url: source.thumbnail_url,
      template_type: source.template_type,
      output_type: source.output_type,
      model_preferences: source.model_preferences,
      applicable_writing_structures: source.applicable_writing_structures,
      platforms: source.platforms,
      avatar_id: source.avatar_id,
      visual_style_preset: source.visual_style_preset,
      brand_username: username,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Update the existing copy
      const { data, error } = await supabase
        .from('user_templates')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) {
        results.push({ username, error: error.message });
      } else {
        results.push({ username, id: data.id, action: 'updated' });
      }
    } else {
      // Create a new copy for this brand
      const { data, error } = await supabase
        .from('user_templates')
        .insert(payload)
        .select()
        .single();
      if (error) {
        results.push({ username, error: error.message });
      } else {
        results.push({ username, id: data.id, action: 'created' });
      }
    }
  }

  const failed = results.filter(r => r.error);
  if (failed.length === results.length) {
    return res.status(500).json({ error: 'All assignments failed', details: failed });
  }

  return res.json({
    success: true,
    assigned: results.filter(r => !r.error),
    failed,
  });
}
