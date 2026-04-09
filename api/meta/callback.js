/**
 * GET /api/meta/callback?code=...&state=...
 * Handles Meta OAuth redirect. No auth middleware.
 * Exchanges code → short-lived → long-lived token.
 * Discovers Facebook Pages and connected Instagram Business accounts.
 * Saves both instagram + facebook rows to platform_connections.
 */

import { createClient } from '@supabase/supabase-js';
import { verifyNonce, saveTokens } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code, state, error: oauthError, error_description } = req.query;

  if (oauthError) {
    console.error('[meta/callback] OAuth error:', oauthError, error_description);
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
  const nonceRow = await verifyNonce(nonce, 'meta', supabase);
  if (!nonceRow) {
    return res.redirect('/settings/accounts?error=invalid_nonce');
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;

  // Step 1: Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    `client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&client_secret=${appSecret}&code=${code}`
  );

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error('[meta/callback] Token exchange failed:', errText);
    return res.redirect('/settings/accounts?error=token_exchange_failed');
  }

  const shortLivedData = await tokenRes.json();

  // Step 2: Exchange short-lived → long-lived token (60 days)
  const longLivedRes = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&client_id=${appId}` +
    `&client_secret=${appSecret}&fb_exchange_token=${shortLivedData.access_token}`
  );

  let userAccessToken = shortLivedData.access_token;
  let expiresIn = shortLivedData.expires_in || 3600;

  if (longLivedRes.ok) {
    const longLivedData = await longLivedRes.json();
    userAccessToken = longLivedData.access_token;
    expiresIn = longLivedData.expires_in || 5184000; // ~60 days
  } else {
    console.warn('[meta/callback] Long-lived token exchange failed, using short-lived');
  }

  // Step 3: Discover Facebook Pages
  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${userAccessToken}`
  );

  const connected = [];

  if (pagesRes.ok) {
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    for (const page of pages) {
      // Save Facebook Page connection (page token never expires if user token is long-lived)
      await saveTokens(user_id, 'facebook', {
        access_token: page.access_token,
        expires_in: expiresIn,
        platform_user_id: page.id,
        platform_username: page.name,
        platform_page_id: page.id,
        platform_page_name: page.name,
        scopes: 'pages_show_list,pages_read_engagement,pages_manage_posts',
      }, supabase);
      connected.push('facebook');

      // Check for connected Instagram Business account
      if (page.instagram_business_account) {
        const igId = page.instagram_business_account.id;
        const igUsername = page.instagram_business_account.username;

        // Fetch IG username if not included
        let igName = igUsername;
        if (!igName) {
          try {
            const igRes = await fetch(
              `https://graph.facebook.com/v21.0/${igId}?fields=username,name&access_token=${page.access_token}`
            );
            if (igRes.ok) {
              const igData = await igRes.json();
              igName = igData.username || igData.name;
            }
          } catch {}
        }

        await saveTokens(user_id, 'instagram', {
          access_token: page.access_token, // Page token is used for IG API
          expires_in: expiresIn,
          platform_user_id: igId,
          platform_username: igName || 'Instagram Business',
          platform_page_id: igId,
          platform_page_name: igName,
          scopes: 'instagram_basic,instagram_content_publish',
        }, supabase);
        connected.push('instagram');
      }
    }
  } else {
    console.error('[meta/callback] Pages fetch failed:', await pagesRes.text());
  }

  // If no pages found, still save the user-level token for Facebook
  if (connected.length === 0) {
    // Fetch user profile as fallback
    try {
      const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${userAccessToken}`);
      if (meRes.ok) {
        const me = await meRes.json();
        await saveTokens(user_id, 'facebook', {
          access_token: userAccessToken,
          expires_in: expiresIn,
          platform_user_id: me.id,
          platform_username: me.name || 'Facebook',
          scopes: 'pages_show_list,pages_read_engagement,pages_manage_posts',
        }, supabase);
        connected.push('facebook');
      }
    } catch {}
  }

  const uniqueConnected = [...new Set(connected)];
  console.log(`[meta/callback] Connected for user ${user_id}: ${uniqueConnected.join(', ')}`);
  const returnTo = nonceRow.metadata?.returnTo || '/settings/accounts';
  return res.redirect(`${returnTo}?connected=${uniqueConnected.join(',')}`);
}
