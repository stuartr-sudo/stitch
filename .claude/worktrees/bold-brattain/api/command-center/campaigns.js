// Command Center — Campaign CRUD
// Handles: list, get, create, update, delete campaigns

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    // GET /api/command-center/campaigns — list all campaigns
    // GET /api/command-center/campaigns/:id — get single campaign with items
    if (req.method === 'GET') {
      const campaignId = req.params?.id;

      if (campaignId) {
        // Single campaign with items
        const { data: campaign, error } = await supabase
          .from('command_center_campaigns')
          .select('*')
          .eq('id', campaignId)
          .eq('user_id', userId)
          .single();

        if (error || !campaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }

        const { data: items } = await supabase
          .from('command_center_items')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        return res.json({ campaign: { ...campaign, items: items || [] } });
      }

      // List campaigns
      const statusFilter = req.query.status;
      let query = supabase
        .from('command_center_campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: campaigns, error } = await query;
      if (error) throw error;

      // Fetch items for each campaign
      const campaignIds = (campaigns || []).map(c => c.id);
      let items = [];
      if (campaignIds.length > 0) {
        const { data } = await supabase
          .from('command_center_items')
          .select('*')
          .in('campaign_id', campaignIds)
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        items = data || [];
      }

      // Group items by campaign
      const itemsByCampaign = {};
      for (const item of items) {
        if (!itemsByCampaign[item.campaign_id]) itemsByCampaign[item.campaign_id] = [];
        itemsByCampaign[item.campaign_id].push(item);
      }

      const result = (campaigns || []).map(c => ({
        ...c,
        items: itemsByCampaign[c.id] || []
      }));

      return res.json({ campaigns: result });
    }

    // POST /api/command-center/campaigns — create new campaign
    if (req.method === 'POST') {
      const { name, description, plan_json, braindump_text } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Campaign name is required' });
      }

      const { data: campaign, error } = await supabase
        .from('command_center_campaigns')
        .insert({
          user_id: userId,
          name,
          description: description || null,
          plan_json: plan_json || null,
          braindump_text: braindump_text || null,
          status: 'planning',
          item_count: 0,
          items_ready: 0
        })
        .select()
        .single();

      if (error) throw error;
      return res.json({ campaign });
    }

    // PUT /api/command-center/campaigns/:id — update campaign
    if (req.method === 'PUT') {
      const campaignId = req.params?.id;
      if (!campaignId) return res.status(400).json({ error: 'Campaign ID required' });

      const updates = {};
      const allowed = ['name', 'description', 'status', 'plan_json', 'item_count', 'items_ready'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data: campaign, error } = await supabase
        .from('command_center_campaigns')
        .update(updates)
        .eq('id', campaignId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return res.json({ campaign });
    }

    // DELETE /api/command-center/campaigns/:id — delete campaign (cascades to items)
    if (req.method === 'DELETE') {
      const campaignId = req.params?.id;
      if (!campaignId) return res.status(400).json({ error: 'Campaign ID required' });

      const { error } = await supabase
        .from('command_center_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', userId);

      if (error) throw error;
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Command Center campaigns error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
