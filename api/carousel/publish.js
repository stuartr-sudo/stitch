import { createClient } from '@supabase/supabase-js';
import { publishCarouselToLinkedIn } from '../lib/linkedinPublisher.js';
import { publishCarouselToInstagram } from '../lib/instagramPublisher.js';
import { publishToFacebookPage } from '../lib/facebookPublisher.js';
import { publishCarouselToTikTok } from '../lib/tiktokPublisher.js';
import { loadTokens } from '../lib/tokenManager.js';

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'carousel id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Fetch carousel + slides
  const { data: carousel, error: cErr } = await supabase
    .from('carousels')
    .select('*, carousel_slides(*)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (cErr || !carousel) return res.status(404).json({ error: 'Carousel not found' });

  const slides = (carousel.carousel_slides || []).sort((a, b) => a.slide_number - b.slide_number);
  const readySlides = slides.filter(s => s.composed_image_url);
  if (readySlides.length === 0) {
    return res.status(400).json({ error: 'No slides with generated images. Generate images first.' });
  }

  const platform = carousel.platform;
  const imageUrls = readySlides.map(s => s.composed_image_url);
  const caption = carousel.caption_text || carousel.title;

  // Resolve token for the target platform
  let conn = await loadTokens(req.user.id, platform, supabase);

  // LinkedIn legacy fallback
  if (!conn && platform === 'linkedin') {
    const { data: config } = await supabase
      .from('linkedin_config')
      .select('linkedin_access_token')
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (config?.linkedin_access_token) {
      conn = { access_token: config.linkedin_access_token };
    }
  }

  if (!conn?.access_token) {
    return res.status(400).json({
      error: `${platform} not connected. Go to Settings → Connected Accounts.`,
    });
  }

  let result;

  try {
    switch (platform) {
      case 'linkedin':
        result = await publishCarouselToLinkedIn({
          accessToken: conn.access_token,
          caption,
          imageUrls,
        });
        break;

      case 'instagram':
        result = await publishCarouselToInstagram({
          accessToken: conn.access_token,
          igAccountId: conn.platform_page_id,
          imageUrls,
          caption,
        });
        break;

      case 'facebook':
        result = await publishToFacebookPage({
          accessToken: conn.access_token,
          pageId: conn.platform_page_id,
          message: caption,
          imageUrls,
        });
        break;

      case 'tiktok':
        result = await publishCarouselToTikTok({
          accessToken: conn.access_token,
          imageUrls,
          caption,
        });
        break;

      default:
        return res.status(400).json({
          error: `Publishing to ${platform} is not supported.`,
        });
    }
  } catch (err) {
    console.error(`[carousel/publish] ${platform} error:`, err.message);
    result = { success: false, error: err.message };
  }

  const platformPostId = result.linkedinPostId || result.mediaId || result.postId || result.publishId;

  if (!result.success) {
    await supabase.from('carousels')
      .update({ status: 'failed', error_message: result.error })
      .eq('id', id);
    return res.status(500).json({ error: result.error });
  }

  await supabase.from('carousels')
    .update({
      status: 'published',
      published_platform_id: platformPostId,
      published_at: new Date().toISOString(),
    })
    .eq('id', id);

  return res.json({ success: true, platformPostId });
}
