/**
 * YouTube OAuth token management.
 * loadTokens(brandUsername, supabase) — Load and auto-refresh tokens for a brand.
 */

export async function loadTokens(brandUsername, supabase) {
  const { data: tokens, error } = await supabase
    .from('brand_youtube_tokens')
    .select('*')
    .eq('brand_username', brandUsername)
    .maybeSingle();

  if (error || !tokens) return null;

  const expiresAt = new Date(tokens.expires_at);
  const now = new Date(Date.now() + 5 * 60 * 1000);

  if (expiresAt <= now) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    if (!refreshed) {
      await supabase.from('brand_youtube_tokens').delete().eq('id', tokens.id);
      return null;
    }
    await supabase
      .from('brand_youtube_tokens')
      .update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq('id', tokens.id);
    return { ...tokens, access_token: refreshed.access_token };
  }

  return tokens;
}

async function refreshAccessToken(refreshToken) {
  try {
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
    return await res.json();
  } catch {
    return null;
  }
}
