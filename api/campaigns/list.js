import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('campaigns')
    .select(`
      id, name, article_title, platform, status, writing_structure,
      brand_username, source_url, total_drafts, completed_drafts,
      created_at, updated_at,
      ad_drafts (
        id, campaign_id, template_id, template_name, output_type,
        generation_status, publish_status, scheduled_for,
        platforms, assets_json, static_assets_json, storyboard_json,
        music_url, captions_json, timelines_json, created_at
      )
    `)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, campaigns: data || [] });
}
