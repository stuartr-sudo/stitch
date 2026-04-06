// Command Center — Item CRUD + Actions
// Handles: update, approve, reject, rebuild, publish

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    const itemId = req.params?.id;
    const action = req.params?.action; // approve, reject, rebuild, publish

    // PUT /api/command-center/items/:id — update item
    if (req.method === 'PUT' && !action) {
      if (!itemId) return res.status(400).json({ error: 'Item ID required' });

      const updates = {};
      const allowed = ['status', 'scheduled_at', 'preview_url', 'result_json', 'error'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data: item, error } = await supabase
        .from('command_center_items')
        .update(updates)
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Update campaign items_ready count if status changed to ready
      if (updates.status === 'ready' && item) {
        await updateCampaignReadyCount(supabase, item.campaign_id, userId);
      }

      return res.json({ item });
    }

    // POST /api/command-center/items/:id/approve
    if (req.method === 'POST' && action === 'approve') {
      if (!itemId) return res.status(400).json({ error: 'Item ID required' });

      const { data: item, error } = await supabase
        .from('command_center_items')
        .update({ status: 'approved' })
        .eq('id', itemId)
        .eq('user_id', userId)
        .in('status', ['ready', 'rejected']) // can only approve ready or previously rejected items
        .select()
        .single();

      if (error || !item) {
        return res.status(400).json({ error: 'Item not found or not in a reviewable state' });
      }

      // Check if all items in campaign are approved
      await checkCampaignAllApproved(supabase, item.campaign_id, userId);

      return res.json({ item });
    }

    // POST /api/command-center/items/:id/reject
    if (req.method === 'POST' && action === 'reject') {
      if (!itemId) return res.status(400).json({ error: 'Item ID required' });

      const { data: item, error } = await supabase
        .from('command_center_items')
        .update({ status: 'rejected' })
        .eq('id', itemId)
        .eq('user_id', userId)
        .in('status', ['ready', 'approved'])
        .select()
        .single();

      if (error || !item) {
        return res.status(400).json({ error: 'Item not found or not in a reviewable state' });
      }

      return res.json({ item });
    }

    // POST /api/command-center/items/:id/rebuild
    if (req.method === 'POST' && action === 'rebuild') {
      if (!itemId) return res.status(400).json({ error: 'Item ID required' });

      // Reset item to queued, clear previous results
      const { data: item, error } = await supabase
        .from('command_center_items')
        .update({
          status: 'queued',
          result_json: null,
          preview_url: null,
          error: null,
          execution_id: null
        })
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !item) {
        return res.status(400).json({ error: 'Item not found' });
      }

      // TODO: Phase 3 — trigger campaignOrchestrator to rebuild this item

      return res.json({ item, message: 'Item queued for rebuild' });
    }

    // POST /api/command-center/items/:id/publish
    if (req.method === 'POST' && action === 'publish') {
      if (!itemId) return res.status(400).json({ error: 'Item ID required' });

      // Verify item is approved
      const { data: item, error } = await supabase
        .from('command_center_items')
        .select('*')
        .eq('id', itemId)
        .eq('user_id', userId)
        .eq('status', 'approved')
        .single();

      if (error || !item) {
        return res.status(400).json({ error: 'Item not found or not approved' });
      }

      // TODO: Phase 5 — call appropriate publisher based on item.platform
      // For now, mark as published
      const { data: updated } = await supabase
        .from('command_center_items')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', itemId)
        .eq('user_id', userId)
        .select()
        .single();

      return res.json({ item: updated });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Command Center items error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

async function updateCampaignReadyCount(supabase, campaignId, userId) {
  const { count } = await supabase
    .from('command_center_items')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('user_id', userId)
    .eq('status', 'ready');

  await supabase
    .from('command_center_campaigns')
    .update({ items_ready: count || 0 })
    .eq('id', campaignId)
    .eq('user_id', userId);
}

async function checkCampaignAllApproved(supabase, campaignId, userId) {
  const { data: items } = await supabase
    .from('command_center_items')
    .select('status')
    .eq('campaign_id', campaignId)
    .eq('user_id', userId);

  if (!items || items.length === 0) return;

  const allApproved = items.every(i => i.status === 'approved' || i.status === 'published');
  if (allApproved) {
    await supabase
      .from('command_center_campaigns')
      .update({ status: 'approved' })
      .eq('id', campaignId)
      .eq('user_id', userId);
  }
}
