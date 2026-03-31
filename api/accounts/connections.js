import { createClient } from '@supabase/supabase-js';
import { getConnections, deleteConnection } from '../lib/tokenManager.js';

/**
 * GET  /api/accounts/connections          — list all connected platforms
 * DELETE /api/accounts/connections/:platform — disconnect a platform
 */
export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (req.method === 'GET') {
    // Also check legacy YouTube tokens
    const [connections, youtubeTokens] = await Promise.all([
      getConnections(req.user.id, supabase),
      supabase
        .from('brand_youtube_tokens')
        .select('brand_username, channel_title, channel_id, expires_at, created_at')
        .eq('user_id', req.user.id),
    ]);

    // Merge YouTube from legacy table if not already in platform_connections
    const platforms = new Map(connections.map(c => [c.platform, c]));

    if (!platforms.has('youtube') && youtubeTokens.data?.length > 0) {
      const yt = youtubeTokens.data[0];
      platforms.set('youtube', {
        platform: 'youtube',
        platform_username: yt.channel_title || yt.brand_username,
        platform_page_id: yt.channel_id,
        token_expires_at: yt.expires_at,
        created_at: yt.created_at,
        connected: true,
      });
    }

    // Also check legacy LinkedIn config
    if (!platforms.has('linkedin')) {
      const { data: liConfig } = await supabase
        .from('linkedin_config')
        .select('linkedin_access_token, created_at')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (liConfig?.linkedin_access_token) {
        platforms.set('linkedin', {
          platform: 'linkedin',
          platform_username: 'Connected (legacy)',
          token_expires_at: null,
          created_at: liConfig.created_at,
          connected: true,
        });
      }
    }

    return res.json({
      success: true,
      connections: [...platforms.values()],
    });
  }

  if (req.method === 'DELETE') {
    const platform = req.params.platform;
    if (!platform) return res.status(400).json({ error: 'platform is required' });

    const success = await deleteConnection(req.user.id, platform, supabase);

    // Also clear legacy tables
    if (platform === 'youtube') {
      await supabase.from('brand_youtube_tokens').delete().eq('user_id', req.user.id);
    }
    if (platform === 'linkedin') {
      await supabase.from('linkedin_config')
        .update({ linkedin_access_token: null })
        .eq('user_id', req.user.id);
    }

    return res.json({ success });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
