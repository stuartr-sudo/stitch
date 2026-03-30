import { createClient } from '@supabase/supabase-js';
import { publishCarouselToLinkedIn } from '../lib/linkedinPublisher.js';

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

  // Verify all slides have composed images
  const slides = (carousel.carousel_slides || []).sort((a, b) => a.slide_number - b.slide_number);
  const readySlides = slides.filter(s => s.composed_image_url);
  if (readySlides.length === 0) {
    return res.status(400).json({ error: 'No slides with generated images. Generate images first.' });
  }

  if (carousel.platform === 'linkedin') {
    // Get LinkedIn access token from linkedin_config
    const { data: config } = await supabase
      .from('linkedin_config')
      .select('linkedin_access_token')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!config?.linkedin_access_token) {
      return res.status(400).json({ error: 'LinkedIn access token not configured. Set it in LinkedIn settings.' });
    }

    const result = await publishCarouselToLinkedIn({
      accessToken: config.linkedin_access_token,
      caption: carousel.caption_text || carousel.title,
      imageUrls: readySlides.map(s => s.composed_image_url),
    });

    if (!result.success) {
      await supabase.from('carousels')
        .update({ status: 'failed', error_message: result.error })
        .eq('id', id);
      return res.status(500).json({ error: result.error });
    }

    await supabase.from('carousels')
      .update({
        status: 'published',
        published_platform_id: result.linkedinPostId,
        published_at: new Date().toISOString(),
      })
      .eq('id', id);

    return res.json({ success: true, platformPostId: result.linkedinPostId });
  }

  // Other platforms not yet supported
  return res.status(400).json({
    error: `Publishing to ${carousel.platform} is not yet supported. Currently only LinkedIn is available.`,
  });
}
