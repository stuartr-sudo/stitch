import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { assembleCarouselVideo } from '../lib/pipelineHelpers.js';

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'carousel id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: carousel, error: cErr } = await supabase
    .from('carousels')
    .select('*, carousel_slides(*)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (cErr || !carousel) return res.status(404).json({ error: 'Carousel not found' });

  const slides = (carousel.carousel_slides || [])
    .filter(s => s.video_url)
    .sort((a, b) => a.slide_number - b.slide_number);

  if (slides.length === 0) {
    return res.status(400).json({ error: 'No slides have videos yet' });
  }

  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.falKey) return res.status(500).json({ error: 'FAL key not configured' });

  // Mark as assembling
  await supabase.from('carousels').update({ status: 'assembling' }).eq('id', id);

  // Return immediately — assemble in background
  res.json({ success: true, message: `Assembling ${slides.length} slide videos` });

  try {
    const videoUrls = slides.map(s => s.video_url);
    const duration = carousel.video_duration || 5;
    const clipDurations = slides.map(() => duration);

    console.log(`[carousel/assemble-video] Assembling ${videoUrls.length} clips for carousel ${id}`);
    const assembledUrl = await assembleCarouselVideo(videoUrls, keys.falKey, supabase, clipDurations);

    await supabase.from('carousels')
      .update({
        assembled_video_url: assembledUrl,
        status: 'ready',
        error_message: null,
      })
      .eq('id', id);

    console.log(`[carousel/assemble-video] Done → ${assembledUrl?.slice(0, 80)}...`);
  } catch (err) {
    console.error('[carousel/assemble-video] Error:', err.message);
    await supabase.from('carousels')
      .update({
        status: 'failed',
        error_message: `Assembly failed: ${err.message}`,
      })
      .eq('id', id);
  }
}
