/**
 * GET /api/meta/auth
 * Returns Meta OAuth URL for Instagram + Facebook connections.
 * Single flow discovers both IG Business accounts and FB Pages.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { storeNonce } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;

  if (!appId || !redirectUri) {
    return res.status(500).json({ error: 'Meta OAuth not configured' });
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  await storeNonce(req.user.id, 'meta', nonce, { returnTo: req.query.returnTo || null }, supabase);

  const state = Buffer.from(JSON.stringify({
    user_id: req.user.id,
    nonce,
  })).toString('base64');

  const scopes = [
    'instagram_basic',
    'instagram_content_publish',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
  ].join(',');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: 'code',
  });

  const url = `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
  return res.json({ url });
}
