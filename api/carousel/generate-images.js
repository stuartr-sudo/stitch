import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { generateImageV2 } from '../lib/mediaGenerator.js';
import { composeSlide } from '../lib/composeSlide.js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';

const CONCURRENCY = 3;

/**
 * Parse aspect_ratio string "1080x1080" into { w, h, ratio }
 * ratio is the FAL-style aspect ratio string (e.g. "1:1", "4:5", "9:16")
 */
function parseAspectRatio(ar) {
  const [w, h] = (ar || '1080x1080').split('x').map(Number);
  const ratioMap = {
    '1080x1080': '1:1',
    '1080x1350': '4:5',
    '1080x1920': '9:16',
  };
  return { w, h, ratio: ratioMap[ar] || '1:1' };
}

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'carousel id is required' });

  const { image_model = 'nano-banana-2', style_prompt = '' } = req.body || {};

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Fetch carousel + slides
  const { data: carousel, error: cErr } = await supabase
    .from('carousels')
    .select('*, carousel_slides(*)')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (cErr || !carousel) return res.status(404).json({ error: 'Carousel not found' });

  const slides = (carousel.carousel_slides || [])
    .filter(s => s.generation_status !== 'done' && !s.locked)
    .sort((a, b) => a.slide_number - b.slide_number);

  if (slides.length === 0) {
    return res.json({ success: true, message: 'All slides already generated' });
  }

  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.falKey) return res.status(500).json({ error: 'FAL key not configured' });

  // Fetch brand kit for logo + colors
  let logoUrl = null;
  let brandColors = [];
  if (carousel.brand_kit_id) {
    const { data: brand } = await supabase
      .from('brand_kit')
      .select('logo_url, colors')
      .eq('id', carousel.brand_kit_id)
      .single();
    if (brand) {
      logoUrl = brand.logo_url;
      brandColors = brand.colors || [];
    }
  }

  const { w, h, ratio } = parseAspectRatio(carousel.aspect_ratio);

  // Mark carousel as generating
  await supabase.from('carousels').update({ status: 'generating' }).eq('id', id);

  // Return immediately — generate in background
  res.json({ success: true, message: `Generating ${slides.length} slide images`, slide_count: slides.length });

  // Process slides in batches of CONCURRENCY
  let failCount = 0;
  for (let i = 0; i < slides.length; i += CONCURRENCY) {
    const batch = slides.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (slide) => {
        try {
          // Mark slide as generating
          await supabase.from('carousel_slides')
            .update({ generation_status: 'generating' })
            .eq('id', slide.id);

          // Build the prompt: slide's image_prompt + user-selected style
          const fullPrompt = [slide.image_prompt, style_prompt].filter(Boolean).join('. ');

          // Generate background image
          const bgUrl = await generateImageV2(
            image_model,
            fullPrompt,
            ratio,
            keys,
            supabase,
          );

          logCost({
            username: req.user.email,
            category: 'fal',
            operation: 'carousel_image',
            model: image_model,
          }).catch(() => {});

          // Compose branded slide overlay
          const composedBuffer = await composeSlide({
            slideType: slide.slide_type,
            canvasW: w,
            canvasH: h,
            backgroundImageUrl: bgUrl,
            logoUrl,
            brandColors,
            colorTemplateIndex: carousel.color_template || 0,
            headline: slide.headline,
            bodyText: slide.body_text,
            statValue: slide.stat_value,
            statLabel: slide.stat_label,
            ctaText: slide.cta_text,
          });

          // Upload composed image to Supabase storage
          const fileName = `carousels/${req.user.id}/${id}/slide-${slide.slide_number}.png`;
          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('media')
            .upload(fileName, composedBuffer, {
              contentType: 'image/png',
              upsert: true,
            });

          if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

          const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(fileName);
          const composedUrl = publicUrl?.publicUrl;

          // Update slide record
          await supabase.from('carousel_slides')
            .update({
              background_image_url: bgUrl,
              composed_image_url: composedUrl,
              generation_status: 'done',
            })
            .eq('id', slide.id);

        } catch (err) {
          console.error(`[carousel/generate-images] Slide ${slide.slide_number} failed:`, err.message);
          failCount++;
          await supabase.from('carousel_slides')
            .update({ generation_status: 'failed' })
            .eq('id', slide.id);
        }
      })
    );
  }

  // Update carousel status
  const finalStatus = failCount === slides.length ? 'failed' : 'ready';
  await supabase.from('carousels')
    .update({
      status: finalStatus,
      error_message: failCount > 0 ? `${failCount}/${slides.length} slides failed` : null,
    })
    .eq('id', id);
}
