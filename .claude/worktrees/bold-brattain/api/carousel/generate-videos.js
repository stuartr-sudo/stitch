import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { animateImageV2 } from '../lib/mediaGenerator.js';
import { logCost } from '../lib/costLogger.js';

const CONCURRENCY = 2;

function parseAspectRatio(ar) {
  const ratioMap = { '1080x1080': '1:1', '1080x1350': '4:5', '1080x1920': '9:16' };
  return ratioMap[ar] || '1:1';
}

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'carousel id is required' });

  const { video_model = 'wavespeed_wan', video_duration = 5 } = req.body || {};

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: carousel, error: cErr } = await supabase
    .from('carousels')
    .select('*, carousel_slides(*)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (cErr || !carousel) return res.status(404).json({ error: 'Carousel not found' });

  // Only process slides that have images but no video yet
  const slides = (carousel.carousel_slides || [])
    .filter(s => s.composed_image_url && s.video_generation_status !== 'done' && !s.locked)
    .sort((a, b) => a.slide_number - b.slide_number);

  if (slides.length === 0) {
    return res.json({ success: true, message: 'All slides already have videos' });
  }

  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.falKey) return res.status(500).json({ error: 'FAL key not configured' });

  const ratio = parseAspectRatio(carousel.aspect_ratio);

  // Mark carousel as generating videos
  await supabase.from('carousels').update({ status: 'generating_videos' }).eq('id', id);

  // Return immediately — generate in background
  res.json({ success: true, message: `Generating ${slides.length} slide videos`, slide_count: slides.length });

  let failCount = 0;
  for (let i = 0; i < slides.length; i += CONCURRENCY) {
    const batch = slides.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (slide) => {
        try {
          await supabase.from('carousel_slides')
            .update({ video_generation_status: 'generating' })
            .eq('id', slide.id);

          const motionPrompt = slide.image_prompt || slide.headline || 'gentle cinematic motion';
          console.log(`[carousel/generate-videos] Slide ${slide.slide_number}: animating with ${video_model} (${video_duration}s)`);

          const videoUrl = await animateImageV2(
            video_model,
            slide.composed_image_url,
            motionPrompt,
            ratio,
            video_duration,
            keys,
            supabase,
          );

          console.log(`[carousel/generate-videos] Slide ${slide.slide_number}: video generated → ${videoUrl?.slice(0, 80)}...`);

          logCost({
            username: req.user.email,
            category: 'fal',
            operation: 'carousel_video',
            model: video_model,
          }).catch(() => {});

          await supabase.from('carousel_slides')
            .update({
              video_url: videoUrl,
              video_generation_status: 'done',
            })
            .eq('id', slide.id);

        } catch (err) {
          console.error(`[carousel/generate-videos] Slide ${slide.slide_number} failed:`, err.message);
          failCount++;
          await supabase.from('carousel_slides')
            .update({ video_generation_status: 'failed' })
            .eq('id', slide.id);
        }
      })
    );
  }

  const finalStatus = failCount === slides.length ? 'failed' : 'ready';
  await supabase.from('carousels')
    .update({
      status: finalStatus,
      error_message: failCount > 0 ? `${failCount}/${slides.length} video slides failed` : null,
    })
    .eq('id', id);
}
