import { createClient } from '@supabase/supabase-js';
import { publishImageToInstagram } from '../lib/instagramPublisher.js';
import { publishToFacebookPage } from '../lib/facebookPublisher.js';
import { loadTokens } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  const { postId } = req.params;
  if (!postId) return res.status(400).json({ error: 'postId is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch post + verify ownership
    const { data: post, error: postErr } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', req.user.id)
      .single();

    if (postErr || !post) return res.status(404).json({ error: 'Post not found' });

    if (post.status === 'published') {
      return res.status(400).json({ error: 'Post is already published' });
    }

    // Resolve token — both Instagram and Facebook use Meta OAuth
    const conn = await loadTokens(req.user.id, 'meta', supabase);
    if (!conn?.access_token) {
      return res.status(400).json({
        error: `${post.platform} not connected. Go to Settings -> Connected Accounts to connect Meta.`,
      });
    }

    let result;
    const imageUrl = post.featured_image_url || post.base_image_url || null;

    switch (post.platform) {
      case 'instagram': {
        if (!conn.platform_page_id) {
          return res.status(400).json({ error: 'Instagram account not linked. Reconnect via Meta OAuth.' });
        }
        result = await publishImageToInstagram({
          accessToken: conn.access_token,
          igAccountId: conn.platform_page_id,
          imageUrl,
          caption: post.content,
        });
        break;
      }

      case 'facebook': {
        if (!conn.platform_page_id) {
          return res.status(400).json({ error: 'Facebook page not linked. Reconnect via Meta OAuth.' });
        }
        result = await publishToFacebookPage({
          accessToken: conn.access_token,
          pageId: conn.platform_page_id,
          message: post.content,
          imageUrls: imageUrl ? [imageUrl] : [],
        });
        break;
      }

      default:
        return res.status(400).json({ error: `Publishing to ${post.platform} is not supported yet.` });
    }

    const platformPostId = result.mediaId || result.postId || null;

    if (!result.success) {
      await supabase.from('social_posts')
        .update({ status: 'failed', error_message: result.error })
        .eq('id', postId);
      return res.status(500).json({ error: result.error });
    }

    // Update post as published
    const { data: updated, error: updateErr } = await supabase
      .from('social_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_platform_id: platformPostId,
      })
      .eq('id', postId)
      .select()
      .single();

    if (updateErr) console.error('[social/publish] Update error:', updateErr.message);

    return res.json({
      success: true,
      post: updated || { ...post, status: 'published' },
      platformPostId,
    });
  } catch (err) {
    console.error('[social/publish] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
