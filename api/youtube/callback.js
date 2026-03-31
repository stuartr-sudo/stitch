/**
 * GET /api/youtube/callback?code=...&state=...
 * Handles Google OAuth redirect. Exchanges code for tokens, stores in DB.
 */

import { createClient } from '@supabase/supabase-js';
import { saveTokens } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect('/studio?youtube_error=' + encodeURIComponent(oauthError));
  }

  if (!code || !state) {
    return res.redirect('/studio?youtube_error=missing_params');
  }

  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch {
    return res.redirect('/studio?youtube_error=invalid_state');
  }

  const { brand_username, user_id, nonce } = stateData;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify nonce
  const { data: nonceRow } = await supabase
    .from('youtube_oauth_nonces')
    .select('*')
    .eq('nonce', nonce)
    .eq('user_id', user_id)
    .maybeSingle();

  if (!nonceRow) {
    return res.redirect('/studio?youtube_error=invalid_nonce');
  }

  await supabase.from('youtube_oauth_nonces').delete().eq('nonce', nonce);

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('[youtube/callback] Token exchange failed:', errText);
    return res.redirect('/studio?youtube_error=token_exchange_failed');
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokenData;

  if (!refresh_token) {
    console.error('[youtube/callback] No refresh_token returned');
    return res.redirect('/studio?youtube_error=no_refresh_token');
  }

  // Fetch channel info
  let channelId = null;
  let channelTitle = null;
  try {
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const channelData = await channelRes.json();
    if (channelData.items?.length) {
      channelId = channelData.items[0].id;
      channelTitle = channelData.items[0].snippet?.title;
    }
  } catch (err) {
    console.error('[youtube/callback] Channel fetch failed:', err);
  }

  // Upsert tokens
  const { error: upsertError } = await supabase
    .from('brand_youtube_tokens')
    .upsert({
      brand_username,
      user_id,
      access_token,
      refresh_token,
      expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      channel_id: channelId,
      channel_title: channelTitle,
    }, { onConflict: 'brand_username' });

  if (upsertError) {
    console.error('[youtube/callback] Upsert error:', upsertError);
    return res.redirect('/studio?youtube_error=save_failed');
  }

  // Dual-write to platform_connections for unified token management
  try {
    await saveTokens(user_id, 'youtube', {
      access_token,
      refresh_token,
      expires_in,
      platform_user_id: channelId,
      platform_username: channelTitle || brand_username,
      platform_page_id: channelId,
      platform_page_name: channelTitle,
      scopes: 'youtube.upload youtube.readonly',
    }, supabase);
  } catch (err) {
    console.error('[youtube/callback] platform_connections write failed:', err.message);
    // Non-fatal — legacy table is the primary
  }

  console.log(`[youtube/callback] Connected ${brand_username} → ${channelTitle || channelId}`);
  return res.redirect(`/?youtube_connected=1&brand=${encodeURIComponent(brand_username)}`);
}
