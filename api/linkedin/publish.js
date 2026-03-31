import { createClient } from '@supabase/supabase-js';
import { publishToLinkedIn } from '../lib/linkedinPublisher.js';
import { loadTokens } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch post + verify ownership
    const { data: post, error: postErr } = await supabase
      .from('linkedin_posts')
      .select('*, linkedin_topics(headline, url)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (postErr || !post) return res.status(404).json({ error: 'Post not found' });
    if (!['generated', 'approved'].includes(post.status)) {
      return res.status(400).json({ error: `Cannot publish post with status: ${post.status}` });
    }

    // Resolve LinkedIn token: platform_connections first, fallback to legacy linkedin_config
    let accessToken = null;
    const conn = await loadTokens(req.user.id, 'linkedin', supabase);
    if (conn?.access_token) {
      accessToken = conn.access_token;
    } else {
      const { data: config } = await supabase
        .from('linkedin_config')
        .select('linkedin_access_token')
        .eq('user_id', req.user.id)
        .maybeSingle();
      accessToken = config?.linkedin_access_token;
    }

    if (!accessToken) {
      return res.status(400).json({ error: 'LinkedIn not connected. Go to Settings → Connected Accounts.' });
    }

    // Publish to LinkedIn — use pre-generated square image
    const linkedinResult = await publishToLinkedIn({
      accessToken,
      body: post.body,
      imageUrl: post.featured_image_square || null,
    });

    // Update post status
    const updateFields = {
      status: linkedinResult.success ? 'published' : 'failed',
      published_linkedin_id: linkedinResult.linkedinPostId || null,
      error_message: linkedinResult.error || null,
    };

    const { data: updated, error: updateErr } = await supabase
      .from('linkedin_posts')
      .update(updateFields)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateErr) console.error('[linkedin/publish] Update error:', updateErr.message);

    return res.json({
      success: linkedinResult.success,
      post: updated || { ...post, ...updateFields },
      linkedin: linkedinResult,
    });
  } catch (err) {
    console.error('[linkedin/publish] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
