/**
 * GET /api/linkedin/oauth/callback?code=...&state=...
 * Handles LinkedIn OAuth redirect. No auth middleware — redirect from LinkedIn.
 * Exchanges code for tokens, fetches profile, saves to platform_connections.
 */

import { createClient } from '@supabase/supabase-js';
import { verifyNonce, saveTokens } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect('/settings/accounts?error=' + encodeURIComponent(oauthError));
  }

  if (!code || !state) {
    return res.redirect('/settings/accounts?error=missing_params');
  }

  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch {
    return res.redirect('/settings/accounts?error=invalid_state');
  }

  const { user_id, nonce } = stateData;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify nonce
  const nonceRow = await verifyNonce(nonce, 'linkedin', supabase);
  if (!nonceRow) {
    return res.redirect('/settings/accounts?error=invalid_nonce');
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('[linkedin/oauth-callback] Token exchange failed:', errText);
    return res.redirect('/settings/accounts?error=token_exchange_failed');
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokenData;

  // Fetch profile for person URN + name
  let profileName = null;
  let personSub = null;
  try {
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      personSub = profile.sub;
      profileName = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(' ');
    }
  } catch (err) {
    console.error('[linkedin/oauth-callback] Profile fetch failed:', err.message);
  }

  // Save to platform_connections
  await saveTokens(user_id, 'linkedin', {
    access_token,
    refresh_token: refresh_token || null,
    expires_in: expires_in || 5184000, // LinkedIn tokens last ~60 days
    platform_user_id: personSub,
    platform_username: profileName || 'Connected',
    scopes: 'openid profile w_member_social',
  }, supabase);

  // Also write to linkedin_config for backward compat
  await supabase.from('linkedin_config').upsert({
    user_id,
    linkedin_access_token: access_token,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  console.log(`[linkedin/oauth-callback] Connected LinkedIn for user ${user_id} → ${profileName}`);
  return res.redirect('/settings/accounts?connected=linkedin');
}
