import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { assembleCarouselSlideshow } from '../lib/pipelineHelpers.js';

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'carousel id is required' });

  const slideDuration = req.body?.slide_duration || 3;

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: carousel, error: cErr } = await supabase
    .from('carousels')
    .select('*, carousel_slides(*)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (cErr || !carousel) return res.status(404).json({ error: 'Carousel not found' });

  const slides = (carousel.carousel_slides || [])
    .filter(s => s.composed_image_url)
    .sort((a, b) => a.slide_number - b.slide_number);

  if (slides.length === 0) {
    return res.status(400).json({ error: 'No slides have composed images yet' });
  }

  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.falKey) return res.status(500).json({ error: 'FAL key not configured' });

  // Mark as assembling
  await supabase.from('carousels').update({ status: 'assembling' }).eq('id', id);

  // Return immediately — assemble in background
  res.json({ success: true, message: `Creating slideshow from ${slides.length} slides (${slideDuration}s each)` });

  try {
    const imageUrls = slides.map(s => s.composed_image_url);

    console.log(`[carousel/create-slideshow] Assembling ${imageUrls.length} images for carousel ${id}`);
    const assembledUrl = await assembleCarouselSlideshow(imageUrls, keys.falKey, supabase, slideDuration);

    await supabase.from('carousels')
      .update({
        assembled_video_url: assembledUrl,
        status: 'ready',
        error_message: null,
      })
      .eq('id', id);

    console.log(`[carousel/create-slideshow] Done → ${assembledUrl?.slice(0, 80)}...`);
  } catch (err) {
    console.error('[carousel/create-slideshow] Error:', err.message);
    await supabase.from('carousels')
      .update({
        status: 'failed',
        error_message: `Slideshow failed: ${err.message}`,
      })
      .eq('id', id);
  }
}
