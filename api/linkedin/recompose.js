import { createClient } from '@supabase/supabase-js';
import { composeLinkedInSatori } from '../lib/composeLinkedInSatori.js';

/**
 * Recompose a LinkedIn post image with new style overrides.
 * No FAL call — uses the stored base_image_url and re-runs Satori composition.
 */
export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'post id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Fetch post
  const { data: post, error: postErr } = await supabase
    .from('linkedin_posts')
    .select('*')
    .eq('id', id)
    .eq('username', req.user.email)
    .single();

  if (postErr || !post) return res.status(404).json({ error: 'Post not found' });
  if (!post.base_image_url) return res.status(400).json({ error: 'No base image — regenerate the image first' });

  // Merge incoming overrides with existing
  const existingOverrides = post.style_overrides || {};
  const newOverrides = req.body.style_overrides || {};
  const merged = { ...existingOverrides, ...newOverrides };

  // Fetch brand for logo — use post's brand_kit_id if set
  const brandQuery = supabase
    .from('brand_kit')
    .select('logo_url, brand_name')
    .eq('user_id', req.user.id);
  if (post.brand_kit_id) brandQuery.eq('id', post.brand_kit_id);
  const { data: brand } = await brandQuery.maybeSingle();

  // Fetch config for series title
  const { data: config } = await supabase
    .from('linkedin_config')
    .select('series_title')
    .eq('user_id', req.user.id)
    .maybeSingle();

  try {
    const composedBuffer = await composeLinkedInSatori({
      backgroundImageUrl: post.base_image_url,
      logoUrl: brand?.logo_url,
      hookText: post.excerpt || '',
      seriesTitle: config?.series_title || 'INDUSTRY WATCH',
      postNumber: post.post_number || 1,
      carouselStyle: post.carousel_style || 'bold_editorial',
      templateIndex: post.template_index || 0,
      styleOverrides: merged,
    });

    // Upload composed image
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const { data: upload, error: uploadErr } = await supabase.storage
      .from('media')
      .upload(`linkedin/composed-sq-${ts}-${rand}.png`, composedBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadErr) return res.status(500).json({ error: `Upload failed: ${uploadErr.message}` });

    const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(upload.path);
    const imageUrl = publicUrl.publicUrl;

    // Update post with new image and merged overrides
    const { data: updated, error: updateErr } = await supabase
      .from('linkedin_posts')
      .update({
        featured_image_square: imageUrl,
        style_overrides: merged,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    return res.json({ success: true, post: updated });
  } catch (err) {
    console.error('[linkedin/recompose] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
