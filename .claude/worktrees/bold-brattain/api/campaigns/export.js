/**
 * GET /api/campaigns/export?draft_id=xxx
 * Returns JSON manifest with download links for all assets organized by platform.
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { draft_id } = req.query;
  if (!draft_id) return res.status(400).json({ error: 'draft_id required' });

  if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: draft, error } = await supabase
    .from('ad_drafts')
    .select('*')
    .eq('id', draft_id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !draft) return res.status(404).json({ error: 'Draft not found' });

  const assets = draft.assets_json || [];
  const storyboard = draft.storyboard_json || {};

  const exportBundle = {
    draft_id: draft.id,
    campaign_name: storyboard.campaign_name || draft.template_name || 'Campaign',
    created_at: draft.created_at,
    platforms: (draft.platforms || []).map(platform => {
      const platformAssets = assets.find(a => a.platforms?.includes(platform));
      if (!platformAssets) return { platform, assets: [] };
      return {
        platform,
        ratio: platformAssets.ratio,
        scenes: (platformAssets.scenes || []).map((scene, i) => ({
          index: i,
          role: scene.scene?.role || `scene_${i + 1}`,
          headline: scene.scene?.headline || '',
          videoUrl: scene.videoUrl || null,
          imageUrl: scene.imageUrl || null,
        })),
      };
    }),
    subtitles_available: true,
    subtitle_url: `/api/campaigns/download-subtitles?draft_id=${draft_id}`,
  };

  return res.json({ success: true, export: exportBundle });
}
