/**
 * GET /api/youtube/auth?brand_username=xyz
 * Redirects to Google OAuth consent screen.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { brand_username } = req.query;
  if (!brand_username) return res.status(400).json({ error: 'brand_username required' });

  const nonce = crypto.randomBytes(16).toString('hex');

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  await supabase.from('youtube_oauth_nonces').upsert({
    nonce,
    user_id: req.user.id,
    brand_username,
    created_at: new Date().toISOString(),
  });

  const state = Buffer.from(JSON.stringify({
    brand_username,
    user_id: req.user.id,
    nonce,
  })).toString('base64');

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return res.json({ success: true, url: authUrl });
}
