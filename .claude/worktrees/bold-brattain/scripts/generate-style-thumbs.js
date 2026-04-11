/**
 * Generate AI thumbnails for visual style presets that need unique representations.
 * Run: node scripts/generate-style-thumbs.js
 */
import 'dotenv/config';
import { fileURLToPath } from 'url';

const FAL_KEY = process.env.FAL_KEY;
const CONCURRENCY = 4;
const MODEL = 'fal-ai/nano-banana-2';

// Style-specific prompts designed to showcase each visual style accurately
const STYLE_PROMPTS = {
  // UGC & Social Media
  'iphone_selfie': 'raw iPhone front-camera selfie of a young woman, slight wide-angle distortion, natural indoor lighting, visible skin texture, casual expression, messy room background, authentic unfiltered phone photo quality',
  'ugc_testimonial': 'person speaking directly to camera in their living room, warm indoor lamp lighting, genuine expression, casual home setting with couch behind, webcam framing, authentic user-generated content feel',
  'tiktok_reels': 'vibrant TikTok content creator, ring light reflection in eyes, bright saturated colors, direct to camera angle, energetic expression, clean simple background, vertical video composition, social media native',
  'instagram_candid': 'candid lifestyle photo of person laughing at outdoor cafe, golden warm natural light, shallow depth of field, warm color fade, effortlessly stylish, film-like quality, Instagram aesthetic',
  'facetime_screenshot': 'FaceTime video call screenshot, slightly above eye-level webcam angle, screen glow on face, casual at-home appearance, slight digital compression, conversation expression, laptop camera quality',
  'mirror_selfie': 'full-length mirror selfie in bedroom, phone visible in hand, ambient indoor lighting, casual outfit check pose, bathroom or bedroom mirror, real reflection, everyday home background',
  'car_selfie': 'car interior selfie, natural window light from side, dashboard partially visible, seatbelt visible, warm sunlight through windshield, casual relaxed pose, authentic phone camera quality',
  'gym_selfie': 'gym mirror selfie with dumbbells visible, harsh fluorescent overhead lighting, sweaty post-workout glow, athletic wear, gym equipment in background, motivational fitness aesthetic, raw energy',
  'golden_hour_selfie': 'golden hour outdoor selfie portrait, warm backlit magic-hour sunlight, sun flare and lens glow, amber skin tones, soft romantic haze, wind-blown hair, glowing highlights',
  'casual_snapshot': 'casual everyday snapshot of friends at a park, point-and-shoot camera quality, slightly off-center framing, natural available light, candid unposed, everyday setting, authentic colors',

  // Photography
  'photorealistic': 'professional studio portrait photography, sharp focus, accurate skin tones, studio lighting with soft shadows, true-to-life colors, high dynamic range, clean backdrop',
  'hyperrealistic': 'hyper-realistic extreme close-up of an eye with every detail visible, razor-sharp focus, every pore and fiber visible, perfect lighting revealing microscopic detail, 8K quality',
  'cinematic_photo': 'cinematic film still, anamorphic lens bokeh, teal-orange color grade, atmospheric haze, dramatic shadow, silhouette walking through moody urban alley, Hollywood production value',
  'documentary_photo': 'documentary photography, candid street moment, natural available light, muted desaturated colors, real environment, journalistic truthful aesthetic, observational framing',
  'portrait_photography': 'professional portrait, soft key light with gentle fill, shallow depth of field, natural skin tones, intimate eye contact, clean simple backdrop, emotional connection',
  'product_photography': 'professional product photography of a luxury watch on clean surface, studio lighting revealing surface texture, neutral gradient backdrop, sharp focus on details, slight reflection below',
  'street_photography': 'black and white street photography, candid urban moment, high contrast deep shadows, decisive moment, gritty city environment, Leica quality, photojournalistic honesty',
  'macro_photography': 'extreme macro close-up of dewdrops on a flower petal, razor-thin depth of field, microscopic detail visible, precise studio lighting, jewel-like color saturation',
  'golden_hour_photo': 'golden hour landscape photography, warm amber backlight from low sun, long dramatic shadows, lens flare, silhouetted tree edges with warm rim light, romantic atmospheric warmth',
  'cinematic_intimate': 'intimate close-up portrait, soft warm light with gentle fall-off, extreme shallow depth of field, quiet personal moment, muted understated colors, A24 indie film aesthetic',

  // Art Movements & Digital
  'abstract_art': 'abstract expressionist painting, bold gestural brushstrokes, vibrant colors on large canvas, non-representational forms, dynamic composition, Kandinsky and Rothko inspired, emotional color relationships',
  'minimalist_art': 'minimalist art composition, single geometric shape on vast white space, clean precise lines, limited palette of one color, quiet contemplative impact, less is more philosophy',
  'brutalist_art': 'Brutalist concrete architecture, massive raw exposed concrete forms, harsh directional shadows on textured surface, monumental imposing scale, grey monolithic structure, Le Corbusier inspired',
  'concept_art_style': 'fantasy concept art painting, dramatic atmospheric castle on cliff edge, painterly digital brushwork, dramatic volumetric god rays through clouds, epic environment, entertainment industry quality',
  'matte_painting_style': 'digital matte painting of impossible vast landscape, photorealistic environment extending beyond reality, atmospheric perspective with layered mountain depth, dramatic sunset sky, Hollywood backdrop quality',
  'steampunk_style': 'steampunk Victorian scene, brass clockwork gears and steam pipes, ornate mechanical devices, goggles and leather, warm sepia and bronze palette, intricate hand-crafted machinery, airship in background',
  'dieselpunk_style': 'dieselpunk 1940s industrial scene, heavy riveted steel machinery, Art Deco meets wartime industry, dark smoky atmosphere, military olive and rust palette, massive mechanical constructions, WWII era retro-futurism',
  'low_poly_style': 'low-poly 3D geometric landscape with mountains and trees, faceted triangular surfaces, vibrant gradient colors across geometric planes, modern minimalist 3D aesthetic, clean sharp edges, colorful simplified shapes',
  'isometric_style': 'isometric miniature city block, 30-degree angle view, cute detailed buildings and tiny cars, flat lighting with subtle shadows, pixel-perfect alignment, city builder game aesthetic, colorful organized',
  'neon_style': 'neon light sign glowing in dark alley, vivid pink and blue neon tubes against black wall, luminous gas-filled glass, electric glow, light bleeding and bloom effects, nightclub atmosphere',
  'neon_noir_style': 'neon noir scene, dark rainy city street, vivid neon signs reflected in wet asphalt, film noir shadows combined with cyberpunk neon, deep blacks with pools of colored light, mysterious urban nightscape',

  // Period / Aesthetic
  'vintage_style': 'vintage 1960s photograph, warm sepia color palette, faded desaturated tones, organic film grain texture, slight vignette, nostalgic period styling, retro color science',
  'vintage_8mm': 'vintage 8mm film frame, heavy visible grain, warm amber tint, gate weave instability, blown-out highlights, light leaks and scratches, nostalgic home-movie quality, family picnic scene',
  'vhs_1980s': '1980s VHS recording aesthetic, visible scan lines, tracking artifacts, neon pink and cyan color bleeding, CRT phosphor glow, analog video noise, date stamp in corner, synthwave nostalgia',
  'vintage_poster_style': 'vintage 1950s advertising poster, bold flat color blocks, retro mid-century illustration, graphic simplified forms, warm aged paper texture, commercial art quality, nostalgic Americana',
  'propaganda_poster_style': 'propaganda poster art, bold dramatic composition, heroic upward-gazing worker figure, limited red black and white palette, bold typography, Soviet constructivist graphic design, powerful geometric simplification',
  'motion_graphics_style': 'motion graphics design frame, clean geometric shapes, flat color blocks, smooth kinetic layout, infographic data visualization, bold typography and icons, professional broadcast quality, vibrant modern design',
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
  if (data.request_id) {
    return pollResult(data.request_id);
  }
  if (data.images?.[0]?.url) return data.images[0].url;
  throw new Error(`Unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
}

async function pollResult(requestId) {
  const statusUrl = `https://queue.fal.run/${MODEL}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${MODEL}/requests/${requestId}`;

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const res = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${FAL_KEY}` },
    });
    const status = await res.json();
    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
      });
      const result = await resultRes.json();
      if (result.images?.[0]?.url) return result.images[0].url;
      throw new Error(`No image in result: ${JSON.stringify(result).slice(0, 200)}`);
    }
    if (status.status === 'FAILED') {
      throw new Error(`Generation failed: ${JSON.stringify(status).slice(0, 200)}`);
    }
  }
  throw new Error('Timeout waiting for image generation');
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
    if (running.size >= concurrency) {
      await Promise.race(running);
    }
  }
  return Promise.all(results);
}

async function main() {
  const entries = Object.entries(STYLE_PROMPTS);
  console.log(`Generating ${entries.length} style thumbnails with ${CONCURRENCY} concurrent requests...\n`);

  const tasks = entries.map(([id, prompt]) => () => processStyle(id, prompt));
  const results = await runWithConcurrency(tasks, CONCURRENCY);

  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✓ ${succeeded.length}/${results.length} thumbnails generated`);
  if (failed.length > 0) {
    console.log(`✗ Failed: ${failed.map(f => f.id).join(', ')}`);
  }

  // Output URL map for easy copy-paste into stylePresets.js
  console.log('\n// ── URL Map ──');
  for (const r of succeeded) {
    console.log(`  ${r.id}: '${r.url}',`);
  }
}

main().catch(console.error);
