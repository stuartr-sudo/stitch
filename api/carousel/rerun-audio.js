import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { assembleCarouselSlideshow, generateMusic } from '../lib/pipelineHelpers.js';
import { generateVoiceover } from '../lib/voiceoverGenerator.js';
import { generateMusicPrompt } from './create-slideshow.js';

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'carousel id is required' });

  const slideDuration = req.body?.slide_duration || 3;
  const voiceover = req.body?.voiceover || false;
  const voice = req.body?.voice || 'Rachel';
  const music = req.body?.music ?? true;
  const musicMood = req.body?.music_mood || 'auto';

  if (!music && !voiceover) {
    return res.status(400).json({ error: 'Select at least music or voiceover to rerun' });
  }

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

  const extras = [voiceover && 'voiceover', music && 'music'].filter(Boolean).join(' + ');
  res.json({ success: true, message: `Rerunning ${extras} for ${slides.length} slides` });

  try {
    const imageUrls = slides.map(s => s.composed_image_url);
    const totalDuration = slides.length * slideDuration;
    let audioUrl = null;
    let musicUrl = null;

    const audioTasks = [];

    if (voiceover) {
      const script = slides.map(s => {
        const parts = [];
        if (s.headline) parts.push(s.headline);
        if (s.body_text) parts.push(s.body_text);
        if (s.stat_value && s.stat_label) parts.push(`${s.stat_value} — ${s.stat_label}`);
        if (s.cta_text) parts.push(s.cta_text);
        return parts.join('. ');
      }).filter(Boolean).join(' ... ');

      console.log(`[carousel/rerun-audio] Generating voiceover: ${script.length} chars, voice=${voice}`);
      audioTasks.push(
        generateVoiceover(script, keys, supabase, { voiceId: voice })
          .then(url => { audioUrl = url; console.log(`[carousel/rerun-audio] Voiceover ready`); })
      );
    }

    if (music) {
      const moodPrompt = await generateMusicPrompt(carousel, slides, musicMood, keys.openaiKey);
      console.log(`[carousel/rerun-audio] Generating music: ${totalDuration}s, mood=${musicMood}`);
      audioTasks.push(
        generateMusic(moodPrompt, totalDuration, keys, supabase)
          .then(url => { musicUrl = url; console.log(`[carousel/rerun-audio] Music ready`); })
      );
    }

    await Promise.all(audioTasks);

    console.log(`[carousel/rerun-audio] Re-assembling ${imageUrls.length} images for carousel ${id}`);
    const assembledUrl = await assembleCarouselSlideshow(imageUrls, keys.falKey, supabase, slideDuration, audioUrl, musicUrl);

    await supabase.from('carousels')
      .update({
        assembled_video_url: assembledUrl,
        status: 'ready',
        error_message: null,
      })
      .eq('id', id);

    console.log(`[carousel/rerun-audio] Done → ${assembledUrl?.slice(0, 80)}...`);
  } catch (err) {
    console.error('[carousel/rerun-audio] Error:', err.message);
    await supabase.from('carousels')
      .update({
        status: 'failed',
        error_message: `Rerun audio failed: ${err.message}`,
      })
      .eq('id', id);
  }
}
