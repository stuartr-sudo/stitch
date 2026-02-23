/**
 * GET /api/brand/usernames
 * Returns available brand usernames from the shared Supabase instance.
 *
 * Priority:
 * 1. user_profiles.assigned_usernames — scoped to what this user can access
 * 2. company_information table — all known brands (authoritative source, shared with Doubleclicker)
 * 3. brand_kit — fallback for Stitch-only brands
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 1. Check user_profiles.assigned_usernames (access-scoped list)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('assigned_usernames, role, is_superadmin')
    .eq('id', req.user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin' || profile?.is_superadmin === true;
  const assignedUsernames = profile?.assigned_usernames || [];

  // 2. Fetch from company_information — the authoritative username source
  let companyUsernames = [];
  const { data: companies } = await supabase
    .from('company_information')
    .select('username, client_namespace')
    .not('username', 'is', null)
    .order('username');

  if (companies?.length) {
    companyUsernames = companies
      .filter(c => c.username?.trim())
      .map(c => ({
        username: c.username,
        brand_name: c.client_namespace || c.username,
      }));
  }

  // If user has assigned_usernames and is not admin, scope to their list
  if (assignedUsernames.length > 0 && !isAdmin) {
    const allowed = new Set(assignedUsernames);
    const scoped = companyUsernames.filter(c => allowed.has(c.username));
    if (scoped.length > 0) {
      return res.json({ success: true, usernames: scoped });
    }
    // If company_information has no matches, return assigned_usernames directly
    return res.json({
      success: true,
      usernames: assignedUsernames
        .filter(u => typeof u === 'string' && u.trim())
        .map(u => ({ username: u, brand_name: u })),
    });
  }

  // Admin or no assigned_usernames: return all from company_information
  if (companyUsernames.length > 0) {
    return res.json({ success: true, usernames: companyUsernames });
  }

  // 3. Final fallback: brand_kit
  const { data: brandKits } = await supabase
    .from('brand_kit')
    .select('brand_username, brand_name')
    .not('brand_username', 'is', null)
    .order('brand_username');

  const usernames = (brandKits || [])
    .filter(bk => bk.brand_username?.trim())
    .map(bk => ({
      username: bk.brand_username,
      brand_name: bk.brand_name || bk.brand_username,
    }));

  return res.json({ success: true, usernames });
}
