/**
 * POST /api/campaigns/publish
 *
 * Publish or schedule an ad draft.
 *
 * Body: {
 *   draft_id: string,
 *   action: 'publish_now' | 'schedule',
 *   scheduled_for?: string,  // ISO datetime — required if action === 'schedule'
 *   platforms?: string[],    // subset of draft's platforms to publish
 * }
 */

import { createClient } from '@supabase/supabase-js';
import { checkAndUpdateCampaignStatus } from '../lib/campaignHelpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { draft_id, action, scheduled_for, platforms } = req.body;

  if (!draft_id) return res.status(400).json({ error: 'draft_id is required' });
  if (!['publish_now', 'schedule'].includes(action)) return res.status(400).json({ error: "action must be 'publish_now' or 'schedule'" });
  if (action === 'schedule' && !scheduled_for) return res.status(400).json({ error: 'scheduled_for is required for schedule action' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify ownership
  const { data: draft, error: draftErr } = await supabase
    .from('ad_drafts')
    .select('id, campaign_id, generation_status, publish_status, platforms')
    .eq('id', draft_id)
    .eq('user_id', req.user.id)
    .single();

  if (draftErr || !draft) return res.status(404).json({ error: 'Draft not found' });
  if (draft.generation_status !== 'ready') return res.status(400).json({ error: 'Draft is not ready yet' });

  const now = new Date().toISOString();

  if (action === 'publish_now') {
    const { data, error } = await supabase
      .from('ad_drafts')
      .update({
        publish_status: 'published',
        scheduled_for: null,
        updated_at: now,
      })
      .eq('id', draft_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Update campaign status if all drafts are published
    await checkAndUpdateCampaignStatus(draft.campaign_id, supabase);

    return res.json({ success: true, draft: data, message: 'Published' });
  }

  if (action === 'schedule') {
    const scheduledAt = new Date(scheduled_for);
    if (isNaN(scheduledAt.getTime())) return res.status(400).json({ error: 'Invalid scheduled_for date' });
    if (scheduledAt < new Date()) return res.status(400).json({ error: 'scheduled_for must be in the future' });

    const { data, error } = await supabase
      .from('ad_drafts')
      .update({
        publish_status: 'scheduled',
        scheduled_for: scheduledAt.toISOString(),
        updated_at: now,
      })
      .eq('id', draft_id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ success: true, draft: data, message: `Scheduled for ${scheduledAt.toLocaleString()}` });
  }
}

