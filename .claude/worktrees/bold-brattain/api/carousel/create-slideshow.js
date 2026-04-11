import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { assembleCarouselSlideshow, generateMusic } from '../lib/pipelineHelpers.js';
import { generateVoiceover } from '../lib/voiceoverGenerator.js';

// ─── Music mood presets ──────────────────────────────────────────────────────

export const MUSIC_MOOD_PRESETS = {
  upbeat_energetic: 'Upbeat energetic pop instrumental, driving drums, bright synths, 120+ BPM, confident and forward-moving energy. Modern and punchy.',
  calm_ambient: 'Calm ambient instrumental, soft piano and pad textures, gentle atmospheric layers, slow tempo, peaceful and meditative.',
  corporate_professional: 'Modern corporate instrumental, clean acoustic guitar and light percussion, confident mid-tempo, professional and polished.',
  dramatic_cinematic: 'Dramatic cinematic score, orchestral strings with building tension, powerful dynamic range, epic and emotionally resonant.',
  fun_playful: 'Fun playful instrumental, bouncy ukulele and hand claps, cheerful melody, lighthearted and whimsical energy.',
  dark_moody: 'Dark moody ambient, deep bass drone and sparse percussion, minor key, mysterious and contemplative atmosphere.',
  inspiring_uplifting: 'Inspiring uplifting instrumental, soaring strings and piano, gradual crescendo build, hopeful and motivational.',
};

/**
 * Generate a music prompt that matches the carousel content.
 * If musicMood is 'auto', uses GPT to analyze content and pick an appropriate mood.
 * Otherwise uses a preset from MUSIC_MOOD_PRESETS.
 */
export async function generateMusicPrompt(carousel, slides, musicMood, openaiKey) {
  // Manual preset
  if (musicMood && musicMood !== 'auto' && MUSIC_MOOD_PRESETS[musicMood]) {
    const topic = carousel.topic || carousel.name || '';
    return `${MUSIC_MOOD_PRESETS[musicMood]} Background music for: ${topic}`.slice(0, 300);
  }

  // Auto: use GPT to analyze content
  if (!openaiKey) {
    // Fallback if no OpenAI key
    const topic = carousel.topic || carousel.name || 'social media content';
    return `Instrumental background music that matches the mood of: ${topic}. Modern, not distracting.`;
  }

  const slideContent = slides.map(s => {
    const parts = [];
    if (s.headline) parts.push(s.headline);
    if (s.body_text) parts.push(s.body_text);
    return parts.join(' — ');
  }).filter(Boolean).join(' | ').slice(0, 1500);

  const client = new OpenAI({ apiKey: openaiKey });
  const completion = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a music director for social media videos. Given the carousel content, write a 1-2 sentence music direction describing genre, instruments, tempo, and emotional tone. Instrumental only, no vocals. Max 250 characters. Just output the direction, nothing else.',
      },
      {
        role: 'user',
        content: `Topic: ${carousel.topic || carousel.name || 'unknown'}\nVisual style: ${carousel.style_preset || 'default'}\nSlide content: ${slideContent}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 100,
  });

  const aiPrompt = completion.choices[0]?.message?.content?.trim();
  return aiPrompt || `Instrumental background music for: ${carousel.topic || carousel.name || 'social media carousel'}. Modern, subtle.`;
}

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'carousel id is required' });

  const slideDuration = req.body?.slide_duration || 3;
  const voiceover = req.body?.voiceover || false;
  const voice = req.body?.voice || 'Rachel';
  const music = req.body?.music || false;
  const musicMood = req.body?.music_mood || 'auto';

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
  res.json({ success: true, message: `Creating slideshow from ${slides.length} slides (${slideDuration}s each)${extras ? ` with ${extras}` : ''}` });

  try {
    const imageUrls = slides.map(s => s.composed_image_url);
    const totalDuration = slides.length * slideDuration;
    let audioUrl = null;
    let musicUrl = null;

    // Generate voiceover and music in parallel if both requested
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

      console.log(`[carousel/create-slideshow] Generating voiceover: ${script.length} chars, voice=${voice}`);
      audioTasks.push(
        generateVoiceover(script, keys, supabase, { voiceId: voice })
          .then(url => { audioUrl = url; console.log(`[carousel/create-slideshow] Voiceover ready`); })
      );
    }

    if (music) {
      const moodPrompt = await generateMusicPrompt(carousel, slides, musicMood, keys.openaiKey);
      console.log(`[carousel/create-slideshow] Generating music: ${totalDuration}s, mood=${musicMood}, prompt="${moodPrompt.slice(0, 80)}..."`);
      audioTasks.push(
        generateMusic(moodPrompt, totalDuration, keys, supabase)
          .then(url => { musicUrl = url; console.log(`[carousel/create-slideshow] Music ready`); })
      );
    }

    if (audioTasks.length > 0) {
      await Promise.all(audioTasks);
    }

    console.log(`[carousel/create-slideshow] Assembling ${imageUrls.length} images for carousel ${id}`);
    const assembledUrl = await assembleCarouselSlideshow(imageUrls, keys.falKey, supabase, slideDuration, audioUrl, musicUrl);

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
