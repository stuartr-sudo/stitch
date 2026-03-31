/**
 * GET /api/linkedin/oauth/auth
 * Returns the LinkedIn OAuth authorization URL.
 * Called from the Connected Accounts page.
 */

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { storeNonce } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'LinkedIn OAuth not configured' });
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  await storeNonce(req.user.id, 'linkedin', nonce, {}, supabase);

  const state = Buffer.from(JSON.stringify({
    user_id: req.user.id,
    nonce,
  })).toString('base64');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile w_member_social',
  });

  const url = `https://www.linkedin.com/oauth/v2/authorization?${params}`;
  return res.json({ url });
}
