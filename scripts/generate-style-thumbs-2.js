/**
 * Generate AI thumbnails for animation, art movement, and genre visual styles.
 * Run: node scripts/generate-style-thumbs-2.js
 */
import 'dotenv/config';

const FAL_KEY = process.env.FAL_KEY;
const CONCURRENCY = 4;
const MODEL = 'fal-ai/nano-banana-2';

const STYLE_PROMPTS = {
  // Animation
  anime_new: 'vibrant anime scene, cherry blossom petals falling around a young warrior on a rooftop at sunset, cel-shaded lighting with crisp shadow edges, detailed background cityscape, expressive large eyes, Japanese animation production quality, rich saturated colors',
  '3d_animation_new': 'beautiful 3D animated scene of a colorful underwater kingdom with glowing coral and friendly sea creatures, smooth subsurface scattering, ray-traced reflections, Pixar DreamWorks quality rendering, soft ambient occlusion, vibrant lighting',
  '2d_animation_new': '2D hand-drawn animated scene of a fox running through an enchanted autumn forest, clean consistent linework, flat color fills with subtle shading, painted watercolor background, expressive character pose, classic Disney animation aesthetic',
  stop_motion_new: 'stop motion animation scene of a tiny fox in a miniature forest set, handcrafted felt and fabric characters, visible fingerprint textures in clay, miniature practical trees with real moss, warm directional lighting, Laika Aardman quality',
  claymation_new: 'claymation characters having a tea party in a garden, sculpted plasticine figures with visible modeling marks, soft clay material texture, warm studio lighting on miniature flower set, colorful handmade charm, Wallace and Gromit style',
  pixel_art_new: '16-bit pixel art fantasy village scene with a blacksmith shop and market stalls, clean crisp pixels, limited retro color palette, carefully placed individual pixels, dithering patterns for shading, nostalgic SNES era quality, warm lighting',
  ghibli_new: 'Studio Ghibli style scene of a girl standing in a lush green meadow with a giant friendly forest spirit, hand-painted watercolor background, soft natural lighting, whimsical fantastical elements, Miyazaki inspired wonder, dreamy atmospheric quality',
  disney_pixar_new: 'Disney Pixar 3D animated scene of a brave little robot exploring a magical garden full of glowing fireflies, warm expressive eyes, physically-based rendering, rich vibrant sunset colors, magical golden lighting, heartfelt emotional storytelling',
  cartoon_new: 'classic cartoon scene of a mischievous cat chasing a mouse through a colorful kitchen, bold exaggerated character design, thick outlines, bright saturated primary colors, squash-and-stretch poses, comedic energy, Looney Tunes quality',
  '8bit_new': '8-bit retro pixel art dungeon scene with a knight fighting a dragon, NES-era limited 4-color palette per sprite, chunky visible pixels, CRT scanline glow effect, classic video game nostalgia, chiptune era aesthetic',
  manga_new: 'dramatic manga panel of a samurai in a rainstorm, black and white ink illustration, dynamic action lines and speed effects, detailed cross-hatching screentone shading, bold ink linework, Shonen Jump quality, intense expression',
  comic_book_new: 'dynamic comic book panel of a superhero landing in a city, bold ink outlines with halftone dot shading, vibrant four-color printing palette, dramatic foreshortening, POW action effect, Marvel DC quality linework and coloring',

  // Art Movements
  impressionist_new: 'Impressionist painting of a garden party by a lily pond, visible broken brushstrokes capturing dappled sunlight through trees, plein air quality, Monet Renoir inspired color harmony, pastel palette with vibrant accents, fleeting beauty',
  expressionist_new: 'Expressionist painting of a figure screaming on a bridge at sunset, distorted exaggerated forms, bold aggressive brushstrokes, intense non-naturalistic orange and blue colors, Munch inspired psychological tension, angular dramatic composition',
  cubism_new: 'Cubist still life painting of a guitar and wine bottle on a table, fragmented geometric forms showing multiple perspectives, angular faceted shapes, muted earth tones with blue accents, Picasso Braque inspired, flattened picture plane',
  pop_art_new: 'Pop Art portrait in bold primary colors, Ben-Day halftone dot pattern, thick black outlines, Warhol Lichtenstein inspired, flat graphic design, repeated motif, commercial advertising visual language, bright yellow red blue',
  renaissance_new: 'Renaissance painting of an angel in a classical garden, idealized human proportions, sfumato soft atmospheric shading, balanced symmetrical composition, Leonardo Raphael inspired mastery, warm earth tones with ultramarine blue, serene beauty',
  baroque_new: 'Baroque painting of a dramatic candlelit feast scene, deep chiaroscuro lighting with luminous highlights and deep blacks, rich opulent detail, theatrical emotional intensity, Caravaggio Rembrandt inspired, ornate gilded luxury',
  art_deco_new: 'Art Deco geometric design of a glamorous 1920s ballroom, bold gold and black symmetrical patterns, streamlined angular forms, sunburst motifs and chevron patterns, chrome and marble materials, Gatsby era elegance',
  art_nouveau_new: 'Art Nouveau illustration of a woman surrounded by flowing botanical vines and flowers, organic whiplash curves, ornate floral borders, Mucha inspired elegant figure, jewel-tone stained glass colors, sinuous decorative design',

  // Digital & Modern
  digital_art_new: 'digital art illustration of a futuristic cityscape at twilight, clean precise linework with smooth color gradients, professional digital painting, vibrant modern neon and purple palette, concept art studio quality, polished finished artwork',
  cyberpunk_new: 'cyberpunk neon-drenched rain-soaked megacity alley at night, holographic advertisements, augmented reality overlays, purple cyan magenta palette, dense urban verticality, Blade Runner inspired, chrome and neon reflections in puddles',
  vaporwave_new: 'vaporwave aesthetic scene with Greek bust sculpture on checkered floor, pastel pink purple cyan gradient sky, retro palm trees, glitch effects, Japanese text, Windows 95 nostalgia, lo-fi digital dreamscape, sunset grid horizon',
  glitch_art_new: 'glitch art portrait with RGB channel splitting and pixel displacement, data moshing compression artifacts, broken scan lines and static noise, neon colors bleeding through corrupted data, VHS tracking distortion, intentional digital error',

  // Genre & Period
  western_new: 'Western scene of a lone cowboy silhouetted on horseback overlooking a vast desert canyon at sunset, dusty amber ochre sun-baked palette, dramatic mesa formations, harsh directional sunlight, Sergio Leone widescreen composition',
  cottagecore_new: 'cottagecore scene of a rustic stone cottage with wildflower garden, golden sunlight through linen curtains, handmade pottery on windowsill, warm earthy color palette, romantic idealized countryside, gingham and linen textures, baked bread on table',
  dark_academia_new: 'dark academia old library interior, leather-bound books floor to ceiling, warm amber candlelight, Gothic university architecture with arched windows, rain outside, moody autumnal palette of deep brown burgundy forest green, scholarly atmosphere',
  tilt_shift_new: 'tilt-shift miniature photography of a bustling city intersection from above, extreme selective focus creating toy-like effect, real buildings appearing as tiny models, dramatic blur gradients, hyper-saturated colors, aerial perspective',
  storybook_new: 'children storybook illustration of a cozy treehouse in an enchanted forest, warm inviting hand-painted watercolor quality, gentle soft edges, whimsical lanterns and fairy lights, soft pastel colors, heartwarming innocent atmosphere',
  chinese_ink_new: 'traditional Chinese ink painting of misty mountains with a lone pavilion, flowing black ink on rice paper, bold calligraphic brushstrokes, graduated ink washes, bamboo in foreground, meditative Shan Shui landscape, poetry of empty space',
};

async function generateImage(prompt) {
  const res = await fetch(`https://queue.fal.run/${MODEL}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: 'square_hd',
      num_images: 1,
      output_format: 'png',
    }),
  });
  const data = await res.json();
  if (data.request_id) return pollResult(data.request_id);
  if (data.images?.[0]?.url) return data.images[0].url;
  throw new Error(`Unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
}

async function pollResult(requestId) {
  const statusUrl = `https://queue.fal.run/${MODEL}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${MODEL}/requests/${requestId}`;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(statusUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
    const status = await res.json();
    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, { headers: { 'Authorization': `Key ${FAL_KEY}` } });
      const result = await resultRes.json();
      if (result.images?.[0]?.url) return result.images[0].url;
      throw new Error(`No image in result`);
    }
    if (status.status === 'FAILED') throw new Error(`Generation failed`);
  }
  throw new Error('Timeout');
}

async function processStyle(id, prompt) {
  try {
    const imageUrl = await generateImage(prompt);
    console.log(`✓ ${id}: ${imageUrl}`);
    return { id, success: true, url: imageUrl };
  } catch (err) {
    console.error(`✗ ${id}: ${err.message}`);
    return { id, success: false, error: err.message };
  }
}

async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  const running = new Set();
  for (const task of tasks) {
    const promise = task().then(r => { running.delete(promise); return r; });
    running.add(promise);
    results.push(promise);
    if (running.size >= concurrency) await Promise.race(running);
  }
  return Promise.all(results);
}

async function main() {
  const entries = Object.entries(STYLE_PROMPTS);
  console.log(`Generating ${entries.length} style thumbnails...\n`);
  const tasks = entries.map(([id, prompt]) => () => processStyle(id, prompt));
  const results = await runWithConcurrency(tasks, CONCURRENCY);
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  console.log(`\n✓ ${succeeded.length}/${results.length} generated`);
  if (failed.length > 0) console.log(`✗ Failed: ${failed.map(f => f.id).join(', ')}`);
  console.log('\n// ── URL Map ──');
  for (const r of succeeded) console.log(`  ${r.id}: '${r.url}',`);
}

main().catch(console.error);
