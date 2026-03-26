/**
 * Generate AI thumbnails for new Kids & Education video style presets.
 * Run: node scripts/generate-video-style-thumbs-kids.js
 */
import 'dotenv/config';

const FAL_KEY = process.env.FAL_KEY;
const CONCURRENCY = 4;
const MODEL = 'fal-ai/nano-banana-2';

const STYLE_PROMPTS = {
  kids_soft_cartoon: 'soft 2D kids cartoon, thin clean outlines, pastel flat colors, rounded friendly dog character in tidy backyard with green grass, warm diffused lighting, gentle Australian preschool animation style, cozy suburban setting',
  kids_family_cartoon: 'warm family cartoon scene, thin outlines, soft flat colors, rounded parent and child characters cooking together in kitchen, gentle 2D animation, warm golden lighting, suburban home interior, heartfelt family moment',
  kids_school_cartoon: 'soft educational cartoon classroom scene, gentle flat colors, rounded child characters at desks with friendly teacher, bright classroom with chalkboard and art supplies, warm encouraging atmosphere, preschool animation quality',
  kids_cozy_cartoon: 'cozy cartoon tea party scene, soft rounded shapes, thin clean lines, warm gentle pastel colors, stuffed animals and tiny cups on blanket, cushions and warm indoor lighting, British preschool 2D animation style',
  kids_maker_edu: 'educational maker cartoon, clean thin outlines, bright soft flat colors, child character building with colorful blocks and gears, numbers and letters floating around, STEM learning environment, cheerful primary colors',
  kids_nature_island: 'soft textured nature island illustration, muted warm earthy tones, gentle organic shapes, puffin bird on rocky coastal cliff with wildflowers, delicate watercolor-like nature documentary animation style, golden light',
  kids_gentle_meadow: 'gentle meadow illustration, soft muted watercolor textures, warm golden light through tall grass, rolling green hills with scattered wildflowers in soft pink and lavender, calming earthy palette, peaceful nature scene',
  kids_gentle_ocean: 'soft textured underwater illustration, muted pastel ocean colors in aqua and coral, gentle organic shapes of swaying seaweed and rounded coral, friendly sea turtle with big eyes, calming nature animation, dappled sunbeams',
  kids_sitcom_cartoon: 'classic American animated sitcom style, yellow skin characters, flat bold colors, family sitting on couch in living room, thick outlines, simple props, everyday suburban comedy scene, long-running animated show quality',
  kids_3d_character: 'stylized 3D character art, cute character with big expressive eyes, detailed colorful outfit, vibrant gradient panel background, modern 3D kids character design, smooth rendering, personality pose',
  kids_candy_city: 'whimsical 3D candy-colored city, pastel buildings shaped like cupcakes and sweets, pink puffy cotton-candy clouds, lollipop trees, gumdrop lampposts, toylike vibrant world, playful joyful atmosphere',
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
  console.log(`Generating ${entries.length} Kids video style thumbnails with ${CONCURRENCY} concurrent requests...\n`);

  const tasks = entries.map(([id, prompt]) => () => processStyle(id, prompt));
  const results = await runWithConcurrency(tasks, CONCURRENCY);

  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✓ ${succeeded.length}/${results.length} thumbnails generated`);
  if (failed.length > 0) {
    console.log(`✗ Failed: ${failed.map(f => f.id).join(', ')}`);
  }

  console.log('\n// ── URL Map (paste into videoStylePresets.js) ──');
  for (const r of succeeded) {
    console.log(`  ${r.id}: '${r.url}',`);
  }
}

main().catch(console.error);
