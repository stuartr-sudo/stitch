import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { generateImageV2 } from '../lib/mediaGenerator.js';
import { composeSlide } from '../lib/composeSlide.js';
import { logCost } from '../lib/costLogger.js';

function parseAspectRatio(ar) {
  const [w, h] = (ar || '1080x1080').split('x').map(Number);
  const ratioMap = { '1080x1080': '1:1', '1080x1350': '4:5', '1080x1920': '9:16' };
  return { w, h, ratio: ratioMap[ar] || '1:1' };
}

export default async function handler(req, res) {
  const { id, slideId } = req.params;
  if (!id || !slideId) return res.status(400).json({ error: 'carousel id and slideId are required' });

  const { image_model = 'fal_nano_banana', style_prompt = '', compositor = 'sharp' } = req.body || {};

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Fetch carousel + specific slide
  const { data: carousel } = await supabase
    .from('carousels')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (!carousel) return res.status(404).json({ error: 'Carousel not found' });

  const { data: slide } = await supabase
    .from('carousel_slides')
    .select('*')
    .eq('id', slideId)
    .eq('carousel_id', id)
    .single();

  if (!slide) return res.status(404).json({ error: 'Slide not found' });
  if (slide.locked) return res.status(400).json({ error: 'Slide is locked' });

  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.falKey) return res.status(500).json({ error: 'FAL key not configured' });

  // Fetch brand data
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

  try {
    await supabase.from('carousel_slides')
      .update({ generation_status: 'generating' })
      .eq('id', slideId);

    // Build prompt with visual_world for consistency + style
    const promptParts = [
      carousel.visual_world ? `Scene: ${carousel.visual_world}` : null,
      style_prompt,
      slide.image_prompt,
    ].filter(Boolean);
    const fullPrompt = promptParts.join('. ') || 'abstract background, soft lighting';

    const bgUrl = await generateImageV2(image_model, fullPrompt, ratio, keys, supabase);

    logCost({
      username: req.user.email,
      category: 'fal',
      operation: 'carousel_image_regen',
      model: image_model,
    }).catch(() => {});

    const composedBuffer = await composeSlide({
      slideType: slide.slide_type,
      carouselStyle: carousel.carousel_style || 'bold_editorial',
      canvasW: w,
      canvasH: h,
      backgroundImageUrl: bgUrl,
      logoUrl,
      brandColors,
      headline: slide.headline,
      bodyText: slide.body_text,
      statValue: slide.stat_value,
      statLabel: slide.stat_label,
      ctaText: slide.cta_text,
      compositor,
    });

    const fileName = `carousels/${req.user.id}/${id}/slide-${slide.slide_number}.png`;
    await supabase.storage.from('media').upload(fileName, composedBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

    const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(fileName);

    const { data: updated } = await supabase.from('carousel_slides')
      .update({
        background_image_url: bgUrl,
        composed_image_url: publicUrl?.publicUrl,
        generation_status: 'done',
      })
      .eq('id', slideId)
      .select()
      .single();

    return res.json({ success: true, slide: updated });
  } catch (err) {
    console.error('[carousel/regenerate-slide] Error:', err);
    await supabase.from('carousel_slides')
      .update({ generation_status: 'failed' })
      .eq('id', slideId);
    return res.status(500).json({ error: err.message });
  }
}
