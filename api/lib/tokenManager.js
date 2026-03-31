/**
 * Central token manager for all social platform connections.
 * Uses the `platform_connections` table for unified token storage.
 * Auto-refreshes tokens when within 5 minutes of expiry.
 */

// ── Platform-specific refresh logic ─────────────────────────────────────────

async function refreshYouTube(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { access_token: data.access_token, expires_in: data.expires_in };
}

async function refreshLinkedIn(refreshToken) {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { access_token: data.access_token, expires_in: data.expires_in };
}

async function refreshMeta(accessToken) {
  // Meta long-lived tokens can be refreshed before they expire (within last 60 days)
  const res = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?` +
    `grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}` +
    `&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${accessToken}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  // Long-lived tokens last ~60 days
  return { access_token: data.access_token, expires_in: data.expires_in || 5184000 };
}

async function refreshTikTok(refreshToken) {
  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token, // TikTok rotates refresh tokens
    expires_in: data.expires_in,
  };
}

const REFRESH_FNS = {
  youtube: (conn) => refreshYouTube(conn.refresh_token),
  linkedin: (conn) => refreshLinkedIn(conn.refresh_token),
  instagram: (conn) => refreshMeta(conn.access_token),
  facebook: (conn) => refreshMeta(conn.access_token),
  tiktok: (conn) => refreshTikTok(conn.refresh_token),
};

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Load tokens for a platform, auto-refreshing if close to expiry.
 * Returns the full connection row or null if not connected.
 */
export async function loadTokens(userId, platform, supabase) {
  const { data: conn, error } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle();

  if (error || !conn) return null;

  // Check if token needs refresh (within 5 minutes of expiry)
  if (conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at);
    const bufferTime = new Date(Date.now() + 5 * 60 * 1000);

    if (expiresAt <= bufferTime) {
      const refreshFn = REFRESH_FNS[platform];
      if (!refreshFn) return conn; // No refresh logic for this platform

      try {
        const refreshed = await refreshFn(conn);
        if (!refreshed) {
          console.warn(`[tokenManager] Failed to refresh ${platform} token for user ${userId}`);
          // Token expired and can't refresh — still return it, let caller handle
          return conn;
        }

        const updates = {
          access_token: refreshed.access_token,
          token_expires_at: new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        };
        // TikTok rotates refresh tokens
        if (refreshed.refresh_token) {
          updates.refresh_token = refreshed.refresh_token;
        }

        await supabase
          .from('platform_connections')
          .update(updates)
          .eq('id', conn.id);

        return { ...conn, ...updates };
      } catch (err) {
        console.error(`[tokenManager] Refresh error for ${platform}:`, err.message);
        return conn;
      }
    }
  }

  return conn;
}

/**
 * Save or update tokens for a platform connection.
 */
export async function saveTokens(userId, platform, tokenData, supabase) {
  const row = {
    user_id: userId,
    platform,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token || null,
    token_expires_at: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : tokenData.token_expires_at || null,
    platform_user_id: tokenData.platform_user_id || null,
    platform_username: tokenData.platform_username || null,
    platform_page_id: tokenData.platform_page_id || null,
    platform_page_name: tokenData.platform_page_name || null,
    scopes: tokenData.scopes || null,
    raw_profile: tokenData.raw_profile || {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('platform_connections')
    .upsert(row, { onConflict: 'user_id,platform' })
    .select()
    .single();

  if (error) {
    console.error(`[tokenManager] saveTokens error for ${platform}:`, error.message);
    return null;
  }
  return data;
}

/**
 * Remove a platform connection.
 */
export async function deleteConnection(userId, platform, supabase) {
  const { error } = await supabase
    .from('platform_connections')
    .delete()
    .eq('user_id', userId)
    .eq('platform', platform);

  if (error) {
    console.error(`[tokenManager] deleteConnection error for ${platform}:`, error.message);
    return false;
  }
  return true;
}

/**
 * Get all connected platforms for a user (for the settings page).
 * Returns array of { platform, platform_username, platform_page_name, token_expires_at, connected: true }
 */
export async function getConnections(userId, supabase) {
  const { data, error } = await supabase
    .from('platform_connections')
    .select('platform, platform_username, platform_page_name, platform_page_id, token_expires_at, created_at, updated_at')
    .eq('user_id', userId);

  if (error) {
    console.error('[tokenManager] getConnections error:', error.message);
    return [];
  }
  return (data || []).map(c => ({ ...c, connected: true }));
}

/**
 * Store an OAuth nonce for CSRF protection.
 */
export async function storeNonce(userId, platform, nonce, metadata, supabase) {
  await supabase.from('oauth_nonces').insert({
    nonce,
    user_id: userId,
    platform,
    metadata: metadata || {},
  });
}

/**
 * Verify and consume an OAuth nonce.
 * Returns the nonce row (with metadata) or null if invalid.
 */
export async function verifyNonce(nonce, platform, supabase) {
  const { data } = await supabase
    .from('oauth_nonces')
    .select('*')
    .eq('nonce', nonce)
    .eq('platform', platform)
    .maybeSingle();

  if (!data) return null;

  // Delete consumed nonce
  await supabase.from('oauth_nonces').delete().eq('id', data.id);
  return data;
}
