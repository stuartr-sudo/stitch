/**
 * Generate AI thumbnails for all 76 video style frameworks using Nano Banana 2.
 * Run: node scripts/generate-framework-thumbs.js
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'frameworks');
const FAL_KEY = process.env.FAL_KEY;
const CONCURRENCY = 4;
const MODEL = 'fal-ai/nano-banana-2';

// Themed prompts per framework
const FRAMEWORK_PROMPTS = {
  // ── Universal frameworks ──
  personal_journey: 'A person standing at a crossroads in golden light, looking toward a bright horizon, cinematic atmosphere, emotional journey, warm tones, dramatic lighting',
  origin_story: 'A small garage workshop with a single lightbulb, humble beginnings, startup origin story, vintage feel, warm nostalgic light, documentary style',
  mini_documentary: 'A filmmaker with a camera on a tripod in dramatic lighting, documentary production, cinematic depth of field, serious tone, professional setup',
  day_in_the_life: 'Morning coffee in hand walking through a bustling city street, first-person vlog perspective, natural lighting, casual authentic feel, urban lifestyle',
  before_after: 'Split composition showing transformation, left side dark and worn, right side bright and renewed, dramatic contrast, before and after reveal',
  explainer_story: 'A glowing lightbulb moment with floating question marks dissolving into clarity, educational concept, clean modern aesthetic, bright insightful mood',
  emotional_tribute: 'Soft golden light through a window illuminating old photographs and memories, warm nostalgia, gentle bokeh, emotional tribute atmosphere',
  challenge_experiment: 'A person with a stopwatch and determined expression beginning a challenge, experimental setup, energetic mood, countdown timer visible',
  how_it_works: 'Transparent mechanical gears and blueprints with arrows showing process flow, educational diagram aesthetic, clean modern, technical illustration style',
  top_x_countdown: 'Bold neon countdown numbers floating in space with dynamic energy, ranked list aesthetic, vibrant colors, fast-paced graphic design feel',
  everything_you_need_to_know: 'An exploding book with knowledge and icons flying out in all directions, information overload aesthetic, bright energetic, colorful infographic style',
  myth_busting: 'A large red X stamp breaking through a common misconception bubble, myth debunked visual, bold graphic, high contrast, punchy design',
  comparison_versus: 'Two opposing forces facing off with lightning between them, versus battle concept, split screen energy, dramatic showdown, competitive',
  did_you_know: 'A magnifying glass revealing hidden glowing text and secrets, discovery moment, mysterious blue light, conspiratorial energy, surprising reveal',
  history_timeline: 'A sweeping timeline with historical eras fading into each other, ancient to modern progression, sepia to color transition, chronological sweep',
  hot_take: 'A microphone on fire with bold text energy, controversial opinion aesthetic, dramatic flames, confident stance, bold graphic design',

  // ── AI/Tech News ──
  ai_tech_demo: 'A futuristic holographic interface being demonstrated with glowing blue screens, tech demo walkthrough, sleek modern lab, digital innovation',
  ai_breaking_news: 'Breaking news alert screens with urgent red banners and AI neural network graphics, tech newsroom, multiple monitors, fast-paced energy',
  ai_tool_review: 'A sleek AI product on a clean desk being examined with rating stars floating above, tech review setup, modern minimalist, evaluation mood',

  // ── Finance ──
  finance_blueprint: 'A golden blueprint of wealth building with ascending stairs made of coins, financial strategy, luxurious yet clean, prosperity roadmap',
  finance_market_pulse: 'Live trading screens with green candlestick charts pulsing with energy, market analysis, Wall Street energy, real-time data, financial dashboard',
  finance_money_mistakes: 'Money falling through holes in a bucket with warning signs, financial mistakes concept, cautionary red accents, dramatic lighting',

  // ── Motivation ──
  motivation_rise_grind: 'Person running up stairs at 5am with city skyline silhouette, rise and grind energy, dramatic sunrise, determination, athletic motivation',
  motivation_mindset_shift: 'A head silhouette with gears transforming from dark rusty to golden glowing, mindset transformation, psychological breakthrough, clean design',
  motivation_life_lesson: 'An old wise tree on a hilltop at golden hour with a single person sitting beneath, life wisdom, contemplative atmosphere, beautiful landscape',

  // ── Horror ──
  horror_campfire: 'A campfire in dark woods with eerie shadows and faces forming in the smoke, horror storytelling, flickering firelight, creepy atmosphere, nighttime',
  horror_creepy_countdown: 'Numbered cards floating in darkness with creepy hands reaching up, horror countdown, eerie green glow, ranked terror, unsettling mood',
  horror_urban_legend: 'A foggy abandoned street with a mysterious figure in the distance, urban legend investigation, streetlight glow, creepy suburban, nighttime dread',

  // ── History ──
  history_lost_civilization: 'Ancient ruins overgrown with jungle vines, mysterious lost civilization, golden light filtering through canopy, archaeological discovery, epic scale',
  history_what_if: 'A forking timeline splitting into alternate realities with different historical outcomes, counterfactual history, surreal branches, dramatic concept',
  history_forgotten_heroes: 'A dusty portrait in a forgotten museum with a spotlight revealing the subject, overlooked historical figure, dramatic discovery, vintage frame',

  // ── True Crime ──
  crime_case_file: 'A detective desk with case files, evidence photos, and a single desk lamp, true crime investigation, noir lighting, methodical, dark mood',
  crime_evidence_trail: 'Red string connecting evidence pins on a corkboard with photographs, evidence trail investigation, detective work, dramatic close-up',
  crime_cold_case: 'A dusty cold case box being reopened with old evidence spilling out, unsolved mystery, harsh fluorescent light, abandoned precinct',

  // ── Science ──
  science_discovery: 'A scientist having a eureka moment with glowing test tubes and molecular structures, laboratory breakthrough, bright clean light, wonder',
  science_nature_secrets: 'A macro lens revealing hidden microscopic worlds in a dewdrop on a leaf, nature secrets, bioluminescent colors, scientific wonder',
  science_thought_experiment: 'A brain surrounded by floating impossible geometric shapes and paradoxes, thought experiment concept, surreal physics, mind-bending visuals',

  // ── Relationships ──
  dating_love_story: 'Two silhouettes walking toward each other on a sunset beach, love story, warm golden light, romantic atmosphere, cinematic composition',
  dating_red_flags: 'Red warning flags waving in wind with a relationship silhouette in background, dating red flags concept, cautionary mood, bold red accents',
  dating_attachment: 'Abstract threads connecting two people in different attachment styles, psychology of love, clean modern illustration, soft blue tones',

  // ── Health & Fitness ──
  fitness_transformation: 'A dramatic split showing athletic transformation with before and after silhouettes, body transformation, gym lighting, motivational',
  fitness_health_hack: 'A glowing health tip card surrounded by fresh vegetables and a stopwatch, quick health hack, clean bright aesthetic, actionable energy',
  fitness_myth_buster: 'A dumbbell smashing through a myth bubble with facts emerging, fitness myths debunked, dynamic action shot, bold graphic energy',

  // ── Gaming ──
  gaming_lore: 'An ancient game world tome glowing with lore and mystical symbols, gaming universe deep dive, fantasy aesthetic, magical atmosphere',
  gaming_easter_eggs: 'A pixelated golden egg hidden behind a game wall being discovered, hidden easter egg, retro gaming glow, secret find excitement, 8-bit charm',
  gaming_pop_breakdown: 'A movie screen shattering into trending memes and pop culture icons, pop culture breakdown, neon colors, viral energy, dynamic composition',

  // ── Conspiracy ──
  conspiracy_rabbit_hole: 'A person falling down a glowing spiral tunnel of classified documents, rabbit hole descent, surreal depth, conspiracy theory, mysterious',
  conspiracy_cover_up: 'Redacted documents with a magnifying glass revealing hidden truth beneath, cover-up exposed, dramatic spotlight, government secrets',
  conspiracy_unsolved: 'A locked door with a question mark keyhole glowing with mysterious light, unsolved mystery, dark corridor, atmospheric tension, enigmatic',

  // ── Business ──
  business_startup_story: 'A garage with a laptop and whiteboard evolving into a glass skyscraper office, startup journey, split composition, growth narrative',
  business_breakdown: 'A corporate machine with visible gears showing how a business works, business analysis, clean infographic style, transparent mechanism',
  business_revenue_playbook: 'A glowing playbook with revenue charts and strategy arrows, business strategy, professional gold and navy, executive aesthetic',

  // ── Food ──
  food_recipe_reveal: 'Fresh ingredients being assembled into a beautiful dish with steam rising, recipe reveal, warm kitchen light, appetizing colors, culinary art',
  food_science: 'A molecular gastronomy experiment with scientific equipment and colorful food reactions, food science, laboratory meets kitchen, fascinating',
  food_street_tour: 'A vibrant night market with sizzling street food stalls and neon signs, street food tour, colorful lights, bustling energy, appetizing',

  // ── Travel ──
  travel_hidden_gem: 'A secret paradise beach accessed through a cave opening, hidden gem discovery, turquoise water, dramatic reveal, breathtaking landscape',
  travel_hacks: 'A passport surrounded by money-saving icons and travel tips floating in air, travel hacks, clean modern design, helpful tips aesthetic',
  travel_adventure_log: 'First-person view from a mountain peak with hiking boots visible, adventure log, epic landscape, gopro perspective, adrenaline rush',

  // ── Psychology ──
  psych_mind_trick: 'An optical illusion that shifts between two images, mind trick demonstration, clean black and white, psychological phenomenon, mesmerizing',
  psych_social_experiment: 'People in a room being observed through one-way glass, social experiment setup, clinical observation, human behavior study, dramatic lighting',
  psych_facts: 'A brain exploding with colorful fact bubbles and neural connections, psychology facts rapid fire, vibrant energy, mind-blown aesthetic',

  // ── Space ──
  space_cosmic_journey: 'A spacecraft traveling through a colorful nebula toward distant stars, cosmic journey, epic space exploration, vibrant nebula colors, awe',
  space_mystery: 'A mysterious anomaly in deep space with scientists observing in silhouette, space mystery, dark cosmic void, unknown signal, tense atmosphere',
  space_cosmic_scale: 'Earth shrinking to a dot compared to increasingly massive celestial objects, cosmic scale comparison, mind-blowing size perspective',

  // ── Animals ──
  animals_creature_feature: 'An extreme close-up of a magnificent predator eye reflecting the wild landscape, creature feature, wildlife documentary, intense detail',
  animals_superpowers: 'A collage of animals with glowing superpower auras — a mantis shrimp punch, electric eel spark, animal superpowers, dynamic comic style',
  animals_nature_hunt: 'A wildlife photographer hidden in camouflage tracking a rare animal through misty jungle, nature hunt, adventure documentary, early morning',

  // ── Sports ──
  sports_athlete_rise: 'A young athlete training alone in an empty stadium at dawn, rising star, determination, lonely road to greatness, inspirational lighting',
  sports_game_changer: 'A frozen moment of an incredible athletic feat with stadium lights blazing, game changing moment, freeze frame action, epic sports drama',
  sports_stats_showdown: 'Bold sports statistics and numbers flying across a stadium scoreboard, stats showdown, data visualization, dynamic numbers, competitive energy',

  // ── Education ──
  edu_quick_lesson: 'A chalkboard rapidly filling with diagrams and equations in fast-forward, quick lesson, educational energy, time-lapse learning, clean design',
  edu_fact_blast: 'Colorful fact cards exploding from an open book like confetti, fact blast, rapid fire knowledge, playful energy, educational fun',
  edu_discovery: 'A scientist holding up a glowing discovery with amazement, eureka moment, historical breakthrough, dramatic laboratory light, wonder',

  // ── Paranormal ──
  paranormal_encounter: 'A person in a dark forest seeing mysterious lights hovering between trees, paranormal encounter, eerie atmosphere, unexplained phenomenon',
  paranormal_evidence: 'Night vision footage showing an unexplained shape with data readouts, paranormal evidence file, green night vision, classified footage',
  paranormal_investigation: 'Ghost hunters with equipment in a dark abandoned building, paranormal investigation, infrared cameras, flashlight beams, tense exploration',
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
      image_size: 'landscape_16_9',
      num_images: 1,
      output_format: 'jpeg',
    }),
  });
  const data = await res.json();
  // Queue response — poll for result
  if (data.request_id) {
    return pollResult(data.request_id);
  }
  // Synchronous response
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

async function downloadImage(url, filepath) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
}

async function processFramework(id, prompt) {
  const filename = id.replace(/_/g, '-') + '.jpg';
  const filepath = path.join(OUT_DIR, filename);

  try {
    const imageUrl = await generateImage(prompt);
    await downloadImage(imageUrl, filepath);
    console.log(`✓ ${id}`);
    return { id, success: true };
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
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const entries = Object.entries(FRAMEWORK_PROMPTS);
  console.log(`Generating ${entries.length} thumbnails with ${CONCURRENCY} concurrent requests...\n`);

  const tasks = entries.map(([id, prompt]) => () => processFramework(id, prompt));
  const results = await runWithConcurrency(tasks, CONCURRENCY);

  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success);

  console.log(`\n✓ ${succeeded}/${results.length} thumbnails generated`);
  if (failed.length > 0) {
    console.log(`✗ Failed: ${failed.map(f => f.id).join(', ')}`);
  }
}

main().catch(console.error);
