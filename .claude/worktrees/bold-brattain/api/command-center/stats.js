// Command Center — Dashboard Stats
// Returns aggregate counts for the stats bar

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Count items by status
    const statuses = ['queued', 'building', 'ready', 'approved', 'rejected', 'published', 'failed'];
    const counts = {};

    for (const status of statuses) {
      const { count } = await supabase
        .from('command_center_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', status);
      counts[status] = count || 0;
    }

    // Count campaigns by status
    const campaignStatuses = ['planning', 'building', 'review', 'approved', 'published', 'cancelled'];
    const campaignCounts = {};

    for (const status of campaignStatuses) {
      const { count } = await supabase
        .from('command_center_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', status);
      campaignCounts[status] = count || 0;
    }

    return res.json({
      items: {
        pending_review: counts.ready,
        building: counts.queued + counts.building,
        approved: counts.approved,
        published: counts.published,
        rejected: counts.rejected,
        failed: counts.failed
      },
      campaigns: campaignCounts,
      total_items: Object.values(counts).reduce((a, b) => a + b, 0),
      total_campaigns: Object.values(campaignCounts).reduce((a, b) => a + b, 0)
    });
  } catch (err) {
    console.error('Command Center stats error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
