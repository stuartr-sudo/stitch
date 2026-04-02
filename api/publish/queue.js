/**
 * GET /api/publish/queue
 *
 * Query: ?status=scheduled,failed&limit=50
 * Returns: { items: [...] }
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.user.id;
  const statusFilter = req.query.status ? req.query.status.split(',') : null;
  const limit = parseInt(req.query.limit) || 50;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  let query = supabase
    .from('publish_queue')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (statusFilter) {
    query = query.in('status', statusFilter);
  }

  const { data: items, error } = await query;

  if (error) {
    console.error('[publish/queue] Query error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch publish queue' });
  }

  // Enrich with draft title and video URL
  const draftIds = [...new Set((items || []).map(i => i.draft_id))];
  const draftMap = {};

  if (draftIds.length > 0) {
    const { data: drafts } = await supabase
      .from('ad_drafts')
      .select('id, captioned_video_url, assets_json, campaign_id')
      .in('id', draftIds);

    // Get campaign names
    const campaignIds = [...new Set((drafts || []).map(d => d.campaign_id).filter(Boolean))];
    const campaignMap = {};
    if (campaignIds.length > 0) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds);
      for (const c of (campaigns || [])) {
        campaignMap[c.id] = c.name;
      }
    }

    for (const d of (drafts || [])) {
      draftMap[d.id] = {
        title: campaignMap[d.campaign_id] || 'Untitled',
        video_url: d.captioned_video_url || d.assets_json?.final_video_url || null,
      };
    }
  }

  const enriched = (items || []).map(item => ({
    ...item,
    draft_title: draftMap[item.draft_id]?.title || 'Untitled',
    draft_video_url: draftMap[item.draft_id]?.video_url || null,
  }));

  return res.json({ items: enriched });
}
