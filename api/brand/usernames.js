/**
 * GET /api/brand/usernames
 * Returns the current user's assigned_usernames from the shared user_profiles table
 * (Doubleclicker DB — same Supabase instance).
 * Falls back to brand_kit.brand_username if user_profiles has no entries.
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Primary source: user_profiles.assigned_usernames (shared with Doubleclicker)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('assigned_usernames')
    .eq('id', req.user.id)
    .maybeSingle();

  const assignedUsernames = profile?.assigned_usernames || [];

  if (assignedUsernames.length > 0) {
    // Look up brand_name from brand_kit for each username
    const { data: brandKits } = await supabase
      .from('brand_kit')
      .select('brand_username, brand_name')
      .in('brand_username', assignedUsernames);

    const brandMap = {};
    (brandKits || []).forEach(bk => {
      if (bk.brand_username) brandMap[bk.brand_username] = bk.brand_name;
    });

    const usernames = assignedUsernames
      .filter(u => typeof u === 'string' && u.trim())
      .map(u => ({
        username: u,
        brand_name: brandMap[u] || u,
      }));

    return res.json({ success: true, usernames });
  }

  // Fallback: brand_kit for this user
  const { data: ownKit } = await supabase
    .from('brand_kit')
    .select('brand_username, brand_name')
    .eq('user_id', req.user.id)
    .maybeSingle();

  const usernames = [];
  if (ownKit?.brand_username?.trim()) {
    usernames.push({
      username: ownKit.brand_username,
      brand_name: ownKit.brand_name || ownKit.brand_username,
    });
  }

  return res.json({ success: true, usernames });
}
