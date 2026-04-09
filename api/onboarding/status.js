import { createClient } from '@supabase/supabase-js';

/**
 * GET  /api/onboarding/status — returns computed onboarding status
 * POST /api/onboarding/status — updates individual onboarding flags
 */
export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user.id;
  const userEmail = req.user.email || '';

  // Owner always bypasses onboarding
  const isOwner = process.env.OWNER_EMAIL
    && userEmail.toLowerCase() === process.env.OWNER_EMAIL.toLowerCase();

  if (req.method === 'GET') {
    if (isOwner) {
      return res.json({
        success: true,
        brand_kit_created: true,
        platforms_prompted: true,
        onboarding_complete: true,
        skipped_at: null,
        connected_platforms: [],
      });
    }
    // Fetch stored onboarding status
    const { data: keysRow } = await supabase
      .from('user_api_keys')
      .select('onboarding_status')
      .eq('user_id', userId)
      .maybeSingle();

    const status = keysRow?.onboarding_status || {};

    // Auto-detect: check if user already has brands or platform connections
    const { data: brands } = await supabase
      .from('brand_kit')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    const { data: connections } = await supabase
      .from('platform_connections')
      .select('platform')
      .eq('user_id', userId);

    if (brands?.length > 0) status.brand_kit_created = true;
    if (connections?.length > 0) status.platforms_prompted = true;

    return res.json({
      success: true,
      brand_kit_created: !!status.brand_kit_created,
      platforms_prompted: !!status.platforms_prompted,
      onboarding_complete: !!status.onboarding_complete,
      skipped_at: status.skipped_at || null,
      connected_platforms: connections?.map(c => c.platform) || [],
    });
  }

  if (req.method === 'POST') {
    const allowedFields = ['brand_kit_created', 'platforms_prompted', 'onboarding_complete', 'skipped_at'];
    const updates = {};
    for (const key of allowedFields) {
      if (key in req.body) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Read current status, merge, write back
    const { data: keysRow } = await supabase
      .from('user_api_keys')
      .select('onboarding_status')
      .eq('user_id', userId)
      .maybeSingle();

    const current = keysRow?.onboarding_status || {};
    const merged = { ...current, ...updates };

    const { error } = await supabase
      .from('user_api_keys')
      .update({ onboarding_status: merged })
      .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ success: true, onboarding_status: merged });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
