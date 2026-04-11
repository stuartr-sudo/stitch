/**
 * POST /api/templates/save
 * Create or update a user template.
 *
 * Body: {
 *   id?, name, description, scenes, music_mood, voice_pacing, reference_video_url?,
 *   template_type, output_type, model_preferences, applicable_writing_structures, platforms, avatar_id?,
 *   visual_style_preset?, brand_username?, brand_usernames?
 * }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    id,
    name,
    description = '',
    scenes,
    music_mood = '',
    voice_pacing = '',
    reference_video_url = null,
    thumbnail_url = null,
    template_type = 'video',
    output_type = 'both',
    model_preferences = {},
    applicable_writing_structures = [],
    platforms = ['tiktok', 'instagram_reels', 'youtube_shorts'],
    avatar_id = null,
    visual_style_preset = null,
    brand_username = null,
    brand_usernames = [],
  } = req.body;

  if (!name || !scenes?.length) {
    return res.status(400).json({ error: 'name and scenes are required' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Resolve brand_usernames: prefer the array, fall back to single brand_username
  const resolvedUsernames = Array.isArray(brand_usernames) && brand_usernames.length > 0
    ? brand_usernames
    : (brand_username ? [brand_username] : []);

  const payload = {
    user_id: req.user.id,
    name,
    description,
    scene_count: scenes.length,
    total_duration_seconds: scenes.reduce((s, sc) => s + (sc.duration_seconds || 5), 0),
    scenes,
    music_mood,
    voice_pacing,
    reference_video_url,
    thumbnail_url,
    template_type,
    output_type,
    model_preferences,
    applicable_writing_structures,
    platforms,
    avatar_id,
    visual_style_preset,
    // Keep brand_username as first entry for backward compat with queue/pipeline
    brand_username: resolvedUsernames[0] || null,
    brand_usernames: resolvedUsernames,
    updated_at: new Date().toISOString(),
  };

  let result;
  if (id) {
    // Update — verify ownership
    const { data, error } = await supabase
      .from('user_templates')
      .update(payload)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    result = data;
  } else {
    const { data, error } = await supabase
      .from('user_templates')
      .insert(payload)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    result = data;
  }

  return res.json({ success: true, template: result });
}
