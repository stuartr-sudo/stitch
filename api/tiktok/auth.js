/**
 * GET /api/tiktok/auth
 * Returns TikTok OAuth URL. TikTok requires PKCE (code_verifier + code_challenge).
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { storeNonce } from '../lib/tokenManager.js';

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !redirectUri) {
    return res.status(500).json({ error: 'TikTok OAuth not configured' });
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Store code_verifier and optional returnTo in nonce metadata for retrieval in callback
  await storeNonce(req.user.id, 'tiktok', nonce, { code_verifier: codeVerifier, returnTo: req.query.returnTo || null }, supabase);

  const state = Buffer.from(JSON.stringify({
    user_id: req.user.id,
    nonce,
  })).toString('base64');

  const scopes = 'user.info.basic,video.publish,video.upload';

  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope: scopes,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const url = `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  return res.json({ url });
}
