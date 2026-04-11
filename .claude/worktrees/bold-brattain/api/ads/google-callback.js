/**
 * GET /api/ads/google/callback
 * Handles Google Ads OAuth callback — exchanges code for tokens,
 * stores in platform_connections.
 *
 * No auth middleware — this is an OAuth redirect target.
 */

import { createClient } from '@supabase/supabase-js';
import { verifyNonce, saveTokens } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    console.error('[google-ads-callback] OAuth error:', error);
    return res.redirect('/settings/accounts?error=google_ads_denied');
  }

  if (!code || !state) {
    return res.redirect('/settings/accounts?error=google_ads_missing_params');
  }

  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch {
    return res.redirect('/settings/accounts?error=google_ads_invalid_state');
  }

  const { user_id, nonce } = parsed;
  if (!user_id || !nonce) {
    return res.redirect('/settings/accounts?error=google_ads_invalid_state');
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify nonce
  const nonceValid = await verifyNonce(user_id, 'google_ads', nonce, supabase);
  if (!nonceValid) {
    return res.redirect('/settings/accounts?error=google_ads_nonce_invalid');
  }

  // Exchange code for tokens
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI || 'https://stitchstudios.app/api/ads/google/callback';

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[google-ads-callback] Token exchange failed:', err);
      return res.redirect('/settings/accounts?error=google_ads_token_failed');
    }

    const tokens = await tokenRes.json();

    // Store tokens
    await saveTokens(user_id, 'google_ads', {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
    }, supabase);

    return res.redirect('/settings/accounts?connected=google_ads');
  } catch (err) {
    console.error('[google-ads-callback] Error:', err);
    return res.redirect('/settings/accounts?error=google_ads_error');
  }
}
