// Command Center — Calendar/Gantt data
// Returns items within a date range for timeline views

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { start, end } = req.query;

    // Default to current week if no range specified
    const now = new Date();
    const startDate = start || new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
    const endDate = end || new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 14)).toISOString();

    // Items with scheduled_at in range
    const { data: scheduledItems, error: schedErr } = await supabase
      .from('command_center_items')
      .select('*, command_center_campaigns!inner(name, status)')
      .eq('user_id', userId)
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at', { ascending: true });

    if (schedErr) throw schedErr;

    // Also get recent campaigns (for Gantt — shows build/review timeline)
    const { data: recentCampaigns, error: campErr } = await supabase
      .from('command_center_campaigns')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (campErr) throw campErr;

    // Get items for these campaigns (for Gantt rows)
    const campaignIds = (recentCampaigns || []).map(c => c.id);
    let campaignItems = [];
    if (campaignIds.length > 0) {
      const { data } = await supabase
        .from('command_center_items')
        .select('*')
        .in('campaign_id', campaignIds)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      campaignItems = data || [];
    }

    return res.json({
      scheduled_items: scheduledItems || [],
      campaigns: (recentCampaigns || []).map(c => ({
        ...c,
        items: campaignItems.filter(i => i.campaign_id === c.id)
      }))
    });
  } catch (err) {
    console.error('Command Center calendar error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
