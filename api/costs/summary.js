/**
 * GET /api/costs/summary
 *
 * Returns aggregated cost data from cost_ledger for the authenticated user's brands.
 *
 * Query params:
 *   range: '7d' | '30d' | '90d' (default: '30d')
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { range = '30d' } = req.query;
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Get user's brand usernames
  const { data: brands } = await supabase
    .from('brand_kit')
    .select('brand_username')
    .eq('user_id', req.user.id);

  const usernames = (brands || []).map(b => b.brand_username).filter(Boolean);

  if (usernames.length === 0) {
    return res.json({ success: true, total: 0, entry_count: 0, by_model: [], by_day: [], by_category: [] });
  }

  // Fetch all cost entries for this user's brands
  const { data: entries, error } = await supabase
    .from('cost_ledger')
    .select('*')
    .in('username', usernames)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const allEntries = entries || [];

  // Aggregate
  let total = 0;
  const byModel = {};
  const byDay = {};
  const byCategory = {};

  for (const e of allEntries) {
    const cost = e.estimated_cost_usd || 0;
    total += cost;

    const model = e.model || 'unknown';
    const day = e.created_at?.slice(0, 10) || 'unknown';
    const cat = e.category || 'other';

    byModel[model] = (byModel[model] || 0) + cost;
    byDay[day] = (byDay[day] || 0) + cost;
    byCategory[cat] = (byCategory[cat] || 0) + cost;
  }

  const round = (n) => Math.round(n * 100) / 100;

  return res.json({
    success: true,
    total: round(total),
    entry_count: allEntries.length,
    by_model: Object.entries(byModel)
      .map(([model, cost]) => ({ model, cost: round(cost) }))
      .sort((a, b) => b.cost - a.cost),
    by_day: Object.entries(byDay)
      .map(([day, cost]) => ({ day, cost: round(cost) })),
    by_category: Object.entries(byCategory)
      .map(([category, cost]) => ({ category, cost: round(cost) }))
      .sort((a, b) => b.cost - a.cost),
  });
}
