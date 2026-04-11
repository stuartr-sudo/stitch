/**
 * GET /api/templates/list
 * Returns user's saved templates + built-in system templates.
 */

import { createClient } from '@supabase/supabase-js';
import { VIDEO_TEMPLATES } from '../lib/videoTemplates.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: userTemplates, error } = await supabase
    .from('user_templates')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Expose built-in templates as read-only options
  const builtIn = Object.entries(VIDEO_TEMPLATES).map(([key, t]) => ({
    id: `builtin:${key}`,
    name: t.name,
    description: t.description,
    scene_count: t.scene_count,
    total_duration_seconds: t.total_duration_seconds,
    scenes: t.scenes,
    music_mood: t.music_mood,
    voice_pacing: t.voice_pacing,
    template_type: 'video',
    output_type: 'both',
    model_preferences: {},
    applicable_writing_structures: [],
    platforms: ['tiktok', 'instagram_reels', 'youtube_shorts'],
    avatar_id: null,
    is_builtin: true,
  }));

  return res.json({
    success: true,
    templates: [
      ...builtIn,
      ...(userTemplates || []).map(t => ({ ...t, is_builtin: false })),
    ],
  });
}
