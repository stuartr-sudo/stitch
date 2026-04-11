/**
 * Generate AI thumbnails for new kids video style presets.
 * Run: node scripts/generate-style-thumbs-kids.js
 */
import 'dotenv/config';

const FAL_KEY = process.env.FAL_KEY;
const CONCURRENCY = 4;
const MODEL = 'fal-ai/nano-banana-2';

const STYLE_PROMPTS = {
  kids_fairy_tale: 'enchanted fairy tale scene, magical castle on a hill surrounded by glowing fireflies and a winding forest path, soft golden glow with sparkle particle effects, pastel pink purple and gold color palette, dreamy atmospheric haze, friendly dragon peeking from behind a tree, whimsical storybook kingdom, warm inviting children illustration',
  kids_storybook: 'children storybook illustration, cozy cottage kitchen scene with a bear family having breakfast, hand-painted watercolor style with soft feathered edges, visible paper texture, warm pastel peach mint and lavender palette, gentle light through curtained window, round simple character faces, bedtime story warmth and comfort',
  kids_educational: 'fun educational kids scene, colorful classroom with floating numbers 1-2-3 and alphabet letters, friendly cartoon teacher with round features pointing at a labeled diagram of the solar system, bright primary color backgrounds, pop-up style 3D elements, cheerful learning atmosphere, clean graphic design',
  kids_preschool: 'preschool toddler animation scene, ultra-simple geometric characters playing in a sunny garden, bold saturated primary colors red blue yellow green, thick rounded outlines, large friendly faces with dot eyes and curved smiles, simple flower shapes and a rainbow, clean solid-color background, gentle safe atmosphere',
  kids_flat_vector: 'flat vector kids illustration, clean geometric animal characters at a zoo, crisp shapes with no outlines, modern minimal design with solid bright coral teal and sunshine yellow fills, organized composition with generous white space, subtle shadow layers, contemporary app-illustration quality',
  kids_space: 'kids space adventure scene, cartoon rocket ship flying past colorful candy-bright planets with rings, friendly round green alien waving from a purple planet, dense twinkling star field against deep blue nebula, cute robot floating in zero gravity, bold saturated cosmic purple teal orange and gold palette',
  kids_action: 'kids action hero scene, young superhero in bright red cape striking a power pose on a rooftop, bold primary colors with speed lines radiating outward, comic-panel style POW effect in corner, dramatic low camera angle, cel-shaded lighting with clean bold shadows, exciting urban skyline background, dynamic composition',
  kids_garden: 'whimsical miniature garden scene, tiny fairy character standing on a giant mushroom, friendly smiling sunflower and ladybug, sparkling morning dewdrops on oversized leaves, warm dappled sunlight filtering through, rich greens with pops of pink purple orange flowers, magical fairy-dust particles, peaceful nature world',
  kids_city: 'colorful kids cartoon city scene, cheerful rounded buildings in candy colors with oversized shop signs, friendly smiling bus and fire truck on the street, diverse child characters walking on sidewalk, warm sunny day with blue sky and fluffy clouds, community park with playground visible, safe welcoming neighborhood',
  kids_stop_motion: 'kids claymation scene, adorable handcrafted clay dinosaur and rabbit characters having a picnic, visible thumbprint textures in plasticine, soft wool felt grass and fabric tree props, warm studio lighting, bright primary-colored clay figures, miniature handmade set with cardboard mountains, charming tactile quality',
  kids_watercolor: 'soft watercolor kids illustration, gentle scene of a fox and owl sitting by a pond in rolling green hills, transparent color washes bleeding on textured watercolor paper, wet-on-wet technique, warm pastel palette of soft blue green peach and lavender, puffy watercolor clouds, visible brushstrokes, dreamy hand-painted charm',
  kids_puppet: 'puppet show scene, charming felt puppet characters of a lion and mouse on a miniature theatre stage, red velvet curtains framing the scene, warm theatrical spotlight from above, handcrafted cardboard tree backdrop, visible fabric stitching and button eyes, cozy intimate puppet performance, soft muted rich textures',
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
  console.log(`Generating ${entries.length} kids style thumbnails...\n`);
  const tasks = entries.map(([id, prompt]) => () => processStyle(id, prompt));
  const results = await runWithConcurrency(tasks, CONCURRENCY);
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  console.log(`\n✓ ${succeeded.length}/${results.length} generated`);
  if (failed.length > 0) console.log(`✗ Failed: ${failed.map(f => f.id).join(', ')}`);
  console.log('\n// ── URL Map (paste into videoStylePresets.js) ──');
  for (const r of succeeded) console.log(`  ${r.id}: '${r.url}',`);
}

main().catch(console.error);
