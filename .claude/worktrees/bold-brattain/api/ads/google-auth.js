/**
 * GET /api/ads/google/auth
 * Returns Google Ads OAuth URL.
 * Redirect URI: https://stitchstudios.app/api/ads/google/callback
 * Scope: https://www.googleapis.com/auth/adwords
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { storeNonce } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI || 'https://stitchstudios.app/api/ads/google/callback';

  if (!clientId) {
    return res.status(500).json({ error: 'Google Ads OAuth not configured — GOOGLE_ADS_CLIENT_ID or GOOGLE_CLIENT_ID required' });
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  await storeNonce(req.user.id, 'google_ads', nonce, {}, supabase);

  const state = Buffer.from(JSON.stringify({
    user_id: req.user.id,
    nonce,
  })).toString('base64');

  const scopes = [
    'https://www.googleapis.com/auth/adwords',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  });

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return res.json({ url });
}
