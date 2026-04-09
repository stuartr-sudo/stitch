/**
 * GET /api/tiktok/callback?code=...&state=...
 * Handles TikTok OAuth redirect. No auth middleware.
 * Exchanges code + code_verifier for tokens, fetches user info.
 */

import { createClient } from '@supabase/supabase-js';
import { verifyNonce, saveTokens } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, state, error: oauthError, error_description } = req.query;

  if (oauthError) {
    console.error('[tiktok/callback] OAuth error:', oauthError, error_description);
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

  // Verify nonce and retrieve code_verifier from metadata
  const nonceRow = await verifyNonce(nonce, 'tiktok', supabase);
  if (!nonceRow) {
    return res.redirect('/settings/accounts?error=invalid_nonce');
  }

  const codeVerifier = nonceRow.metadata?.code_verifier;
  if (!codeVerifier) {
    return res.redirect('/settings/accounts?error=missing_code_verifier');
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('[tiktok/callback] Token exchange failed:', errText);
    return res.redirect('/settings/accounts?error=token_exchange_failed');
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in, open_id } = tokenData;

  if (!access_token) {
    console.error('[tiktok/callback] No access_token in response:', tokenData);
    return res.redirect('/settings/accounts?error=no_access_token');
  }

  // Fetch user info for display name
  let displayName = null;
  try {
    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      displayName = userData.data?.user?.display_name;
    }
  } catch (err) {
    console.error('[tiktok/callback] User info fetch failed:', err.message);
  }

  // Save to platform_connections
  await saveTokens(user_id, 'tiktok', {
    access_token,
    refresh_token: refresh_token || null,
    expires_in: expires_in || 86400,
    platform_user_id: open_id,
    platform_username: displayName || 'TikTok User',
    scopes: 'user.info.basic,video.publish,video.upload',
  }, supabase);

  console.log(`[tiktok/callback] Connected TikTok for user ${user_id} → ${displayName}`);
  const returnTo = nonceRow.metadata?.returnTo || '/settings/accounts';
  return res.redirect(`${returnTo}?connected=tiktok`);
}
