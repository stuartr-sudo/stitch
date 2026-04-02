/**
 * POST /api/publish/schedule
 *
 * Body: { draft_id, platforms: [{ platform, title, description, privacy }], scheduled_for? }
 * Returns: { queue_ids, scheduled_for }
 */

import { createClient } from '@supabase/supabase-js';
import { getConnections } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { draft_id, platforms, scheduled_for } = req.body;
  const userId = req.user.id;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!draft_id) return res.status(400).json({ error: 'draft_id is required' });
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: 'platforms must be a non-empty array' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // Verify draft exists, belongs to user, and has video
  const { data: draft, error: draftErr } = await supabase
    .from('ad_drafts')
    .select('id, captioned_video_url, assets_json, campaign_id')
    .eq('id', draft_id)
    .eq('user_id', userId)
    .single();

  if (draftErr || !draft) {
    return res.status(404).json({ error: 'Draft not found' });
  }

  const videoUrl = draft.captioned_video_url
    || draft.assets_json?.final_video_url
    || draft.assets_json?.video_url;
  if (!videoUrl) {
    return res.status(400).json({ error: 'Draft has no final video URL' });
  }

  // Verify all platforms are connected
  const connections = await getConnections(userId, supabase);
  const connectedPlatforms = new Set(connections.map(c => c.platform));

  const validPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'linkedin'];
  for (const p of platforms) {
    if (!validPlatforms.includes(p.platform)) {
      return res.status(400).json({ error: `Invalid platform: ${p.platform}` });
    }
    if (!connectedPlatforms.has(p.platform)) {
      return res.status(400).json({ error: `${p.platform} is not connected. Connect it in Settings.` });
    }
    if (!p.title) {
      return res.status(400).json({ error: `Title is required for ${p.platform}` });
    }
  }

  // Validate scheduled_for is in the future (or null for publish-now)
  let publishTime;
  if (scheduled_for) {
    publishTime = new Date(scheduled_for);
    if (isNaN(publishTime.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled_for date' });
    }
    if (publishTime <= new Date()) {
      return res.status(400).json({ error: 'scheduled_for must be in the future' });
    }
  } else {
    publishTime = new Date(); // publish now
  }

  // ── Insert queue items ──────────────────────────────────────────────────────
  const rows = platforms.map(p => ({
    user_id: userId,
    draft_id,
    platform: p.platform,
    status: 'scheduled',
    scheduled_for: publishTime.toISOString(),
    title: p.title,
    description: p.description || '',
    privacy: p.privacy || 'public',
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from('publish_queue')
    .insert(rows)
    .select('id');

  if (insertErr) {
    console.error('[publish/schedule] Insert error:', insertErr.message);
    return res.status(500).json({ error: 'Failed to schedule publishing' });
  }

  console.log(`[publish/schedule] Scheduled ${inserted.length} items for draft ${draft_id}`);
  return res.json({
    queue_ids: inserted.map(r => r.id),
    scheduled_for: publishTime.toISOString(),
  });
}
