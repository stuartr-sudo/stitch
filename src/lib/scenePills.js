/**
 * Scene Builder Pills — niche-aware visual direction helpers.
 *
 * NICHE_SCENE_PILLS provides per-niche curated pills.
 * SCENE_PILL_CATEGORIES is the legacy generic fallback.
 * getScenePillsForNiche(niche) merges niche-specific + shared camera pills.
 */

// ── Per-niche curated pills ─────────────────────────────────────────────────

export const NICHE_SCENE_PILLS = {
  ai_tech_news: [
    { label: 'Environments', pills: ['futuristic data center', 'holographic command room', 'silicon valley campus', 'server room interior', 'neon-lit tech lab', 'AI research facility', 'smart city overview'] },
    { label: 'Objects', pills: ['holographic display', 'neural network diagram', 'code on monitor', 'circuit board closeup', 'robot arm', 'AI chip', 'glowing data streams', 'smartphone with AI app'] },
    { label: 'Atmosphere', pills: ['blue digital glow', 'floating data particles', 'matrix rain effect', 'pulsing neon circuits', 'electric arcs', 'holographic shimmer'] },
  ],
  finance_money: [
    { label: 'Environments', pills: ['Wall Street exterior', 'luxury penthouse', 'trading floor', 'bank vault interior', 'modern home office', 'cryptocurrency mine', 'financial district skyline'] },
    { label: 'Objects', pills: ['stock chart rising', 'gold bars stacked', 'cryptocurrency coin', 'wallet with cash', 'credit card closeup', 'calculator display', 'luxury watch', 'briefcase full of money'] },
    { label: 'Atmosphere', pills: ['golden hour lighting', 'green candlestick glow', 'dramatic spotlight', 'wealth ambiance', 'sleek minimalist', 'power and success'] },
  ],
  motivation_self_help: [
    { label: 'Environments', pills: ['mountain summit sunrise', 'empty stadium', 'gym at dawn', 'rain-soaked street', 'meditation room', 'city rooftop overlooking skyline', 'long empty road'] },
    { label: 'Objects', pills: ['clenched fist', 'alarm clock 5am', 'journal and pen', 'mirror reflection', 'running shoes', 'trophy on shelf', 'crumpled paper and fresh start'] },
    { label: 'Atmosphere', pills: ['golden sunrise light', 'dramatic shadows', 'rain and determination', 'lens flare hope', 'silhouette against light', 'warm ember glow'] },
  ],
  scary_horror: [
    { label: 'Environments', pills: ['abandoned asylum corridor', 'dark forest at night', 'foggy graveyard', 'decrepit house interior', 'dimly lit basement', 'empty hospital ward', 'misty lake shore', 'old mine shaft'] },
    { label: 'Objects', pills: ['flickering flashlight', 'cracked mirror', 'old photograph', 'bloody handprint', 'ouija board', 'security camera footage', 'locked door with scratches', 'ticking grandfather clock'] },
    { label: 'Atmosphere', pills: ['thick fog and mist', 'flickering lights', 'deep shadows', 'moonlight through trees', 'cobwebs and dust', 'eerie green glow', 'breath visible in cold', 'storm lightning'] },
  ],
  history_did_you_know: [
    { label: 'Environments', pills: ['ancient Egyptian temple', 'medieval castle hall', 'World War battlefield', 'Roman colosseum', 'old library with scrolls', 'Viking longship', 'Renaissance courtyard', 'archaeological dig site'] },
    { label: 'Objects', pills: ['ancient map', 'sword and shield', 'royal crown', 'old compass', 'sealed letter with wax', 'stone tablet', 'telescope and star chart', 'dusty tome'] },
    { label: 'Atmosphere', pills: ['candlelit chamber', 'dusty golden light', 'torchlight on stone', 'misty battlefield', 'sepia tone', 'dramatic renaissance lighting'] },
  ],
  true_crime: [
    { label: 'Environments', pills: ['police interrogation room', 'crime scene at night', 'courtroom interior', 'forensic laboratory', 'dark alley', 'suburban house exterior', 'prison corridor', 'detective office'] },
    { label: 'Objects', pills: ['evidence markers', 'case file folder', 'fingerprint scan', 'DNA helix', 'mugshot photos', 'handcuffs', 'crime scene tape', 'newspaper headline'] },
    { label: 'Atmosphere', pills: ['harsh fluorescent light', 'noir shadows', 'blue police lights', 'rain-streaked windows', 'cold clinical lighting', 'tense dark mood'] },
  ],
  science_nature: [
    { label: 'Environments', pills: ['deep ocean abyss', 'microscopic cell world', 'volcanic landscape', 'crystal cave', 'rainforest canopy', 'arctic ice shelf', 'coral reef underwater', 'laboratory interior'] },
    { label: 'Objects', pills: ['DNA double helix', 'microscope view', 'brain cross-section', 'atom model', 'test tubes and beakers', 'fossil specimen', 'satellite image of Earth'] },
    { label: 'Atmosphere', pills: ['ethereal bioluminescence', 'cosmic nebula colors', 'bubbling underwater', 'electric charge particles', 'aurora borealis sky', 'crystalline refraction'] },
  ],
  relationships_dating: [
    { label: 'Environments', pills: ['cozy cafe for two', 'park bench at sunset', 'apartment living room', 'rooftop dinner scene', 'bedroom window light', 'rain outside window', 'city street at night'] },
    { label: 'Objects', pills: ['two coffee cups', 'intertwined hands', 'phone with messages', 'heart-shaped light', 'old photographs', 'love letter', 'broken mirror', 'tangled red string'] },
    { label: 'Atmosphere', pills: ['warm golden light', 'soft bokeh', 'intimate candlelight', 'gentle rain mood', 'morning sunlight', 'melancholic blue tones'] },
  ],
  health_fitness: [
    { label: 'Environments', pills: ['modern gym interior', 'outdoor track at sunrise', 'kitchen with healthy food', 'yoga studio', 'swimming pool underwater', 'mountain trail run', 'home workout space'] },
    { label: 'Objects', pills: ['barbell and weights', 'measuring tape', 'running shoes close-up', 'healthy meal plate', 'water bottle', 'fitness tracker', 'supplement bottles', 'jump rope'] },
    { label: 'Atmosphere', pills: ['energetic bright light', 'sweat and determination', 'sunrise motivation', 'steam and heat', 'clean modern aesthetic', 'dynamic motion blur'] },
  ],
  gaming_popculture: [
    { label: 'Environments', pills: ['neon arcade room', 'gaming setup with RGB', 'retro pixel world', 'VR environment', 'comic book cityscape', 'movie set behind scenes', 'convention hall'] },
    { label: 'Objects', pills: ['game controller close-up', 'retro cartridge', 'movie clapperboard', 'comic book panel', 'VR headset', 'gaming keyboard RGB', 'collectible figurines', 'film reel'] },
    { label: 'Atmosphere', pills: ['neon RGB glow', 'pixel art sparkle', 'cinematic letterbox', 'retro scanlines', 'holographic shimmer', 'screen glow in dark room'] },
  ],
  conspiracy_mystery: [
    { label: 'Environments', pills: ['underground bunker', 'secret meeting room', 'Area 51 exterior', 'Vatican archives', 'abandoned research facility', 'mysterious island aerial', 'government building night'] },
    { label: 'Objects', pills: ['classified documents', 'red string conspiracy board', 'old reel tape', 'hidden camera', 'ancient artifact', 'encrypted message', 'satellite dish array', 'redacted files'] },
    { label: 'Atmosphere', pills: ['harsh overhead light', 'deep shadows', 'grainy surveillance', 'static interference', 'eerie silence', 'flickering monitors', 'smoke-filled room'] },
  ],
  business_entrepreneur: [
    { label: 'Environments', pills: ['startup garage', 'boardroom meeting', 'co-working space', 'product launch stage', 'warehouse turned office', 'coffee shop hustle', 'Silicon Valley campus'] },
    { label: 'Objects', pills: ['laptop with metrics', 'whiteboard strategy', 'pitch deck', 'handshake close-up', 'product prototype', 'revenue chart', 'startup logo', 'business card exchange'] },
    { label: 'Atmosphere', pills: ['power and ambition', 'clean corporate light', 'energetic startup vibe', 'late-night grind', 'golden hour success', 'spotlit presentation'] },
  ],
  food_cooking: [
    { label: 'Environments', pills: ['professional kitchen', 'street food market', 'rustic farmhouse table', 'sushi bar counter', 'Italian trattoria', 'night market stall', 'bakery at dawn'] },
    { label: 'Objects', pills: ['sizzling pan close-up', 'chef knife cutting', 'fresh ingredients pile', 'steaming dish reveal', 'spice rack colorful', 'dough being kneaded', 'plated gourmet dish', 'pouring sauce'] },
    { label: 'Atmosphere', pills: ['warm kitchen light', 'steam and sizzle', 'golden crispy texture', 'rustic wood and copper', 'fire and flame', 'colorful ingredients overhead'] },
  ],
  travel_adventure: [
    { label: 'Environments', pills: ['tropical beach paradise', 'mountain pass overlook', 'ancient city ruins', 'bustling Asian market', 'Northern Lights sky', 'crystal blue cenote', 'desert sand dunes', 'cliffside village'] },
    { label: 'Objects', pills: ['passport and map', 'backpack on trail', 'compass in hand', 'airplane window view', 'local street food', 'vintage camera', 'hammock between palms', 'hot air balloon'] },
    { label: 'Atmosphere', pills: ['golden hour paradise', 'misty mountain morning', 'turquoise water glow', 'warm sunset silhouette', 'starry sky camping', 'exotic market colors'] },
  ],
  psychology_mindblown: [
    { label: 'Environments', pills: ['brain scan laboratory', 'lecture hall', 'psychology clinic', 'abstract mind space', 'mirror maze room', 'optical illusion room', 'padded observation room'] },
    { label: 'Objects', pills: ['brain cross-section', 'inkblot test card', 'eye tracking visual', 'maze diagram', 'mirror reflection distorted', 'chess pieces', 'tangled thoughts illustration', 'neural pathway'] },
    { label: 'Atmosphere', pills: ['surreal distortion', 'mind-bending perspective', 'clean clinical light', 'abstract color swirl', 'split screen duality', 'inception-style layers'] },
  ],
  space_cosmos: [
    { label: 'Environments', pills: ['ISS interior view', 'Mars surface landscape', 'black hole approach', 'nebula cloud interior', 'lunar surface', 'Saturn rings close', 'deep space void', 'exoplanet surface'] },
    { label: 'Objects', pills: ['telescope view', 'astronaut helmet', 'rocket launch', 'star map hologram', 'comet tail', 'rover on Mars', 'space station exterior', 'solar flare'] },
    { label: 'Atmosphere', pills: ['cosmic nebula glow', 'star field infinite', 'aurora from space', 'zero gravity float', 'sun corona glow', 'darkness of void', 'blue marble Earth'] },
  ],
  animals_wildlife: [
    { label: 'Environments', pills: ['African savanna sunset', 'coral reef underwater', 'arctic tundra', 'Amazon rainforest', 'deep sea trench', 'mountain eagle nest', 'desert oasis', 'cave system interior'] },
    { label: 'Objects', pills: ['macro insect detail', 'predator eyes close-up', 'animal footprint', 'bird feather pattern', 'spider web with dew', 'shell cross-section', 'animal skeleton', 'bioluminescent creature'] },
    { label: 'Atmosphere', pills: ['golden savanna light', 'underwater blue depth', 'misty jungle green', 'frozen tundra white', 'bioluminescent glow', 'dramatic nature documentary'] },
  ],
  sports_athletes: [
    { label: 'Environments', pills: ['packed stadium night', 'Olympic arena', 'boxing ring spotlight', 'finish line track', 'locker room pre-game', 'training facility', 'podium ceremony', 'empty court at dawn'] },
    { label: 'Objects', pills: ['trophy close-up', 'scoreboard dramatic', 'athlete silhouette', 'medal on neck', 'worn equipment', 'stopwatch frozen', 'victory celebration', 'training montage'] },
    { label: 'Atmosphere', pills: ['stadium floodlights', 'confetti explosion', 'rain-soaked pitch', 'freeze-frame action', 'slow motion power', 'adrenaline energy', 'dramatic spotlight'] },
  ],
  education_learning: [
    { label: 'Environments', pills: ['vast library interior', 'classroom chalkboard', 'museum exhibit', 'globe and atlas room', 'ancient study chamber', 'modern science lab', 'lecture amphitheater'] },
    { label: 'Objects', pills: ['open book glowing', 'world map detail', 'lightbulb moment', 'mathematical equations', 'periodic table', 'graduation cap', 'vintage encyclopedia', 'telescope and globe'] },
    { label: 'Atmosphere', pills: ['warm study lamp light', 'dusty book rays', 'chalkboard aesthetic', 'clean infographic style', 'wonder and discovery', 'cozy academic warmth'] },
  ],
  paranormal_ufo: [
    { label: 'Environments', pills: ['remote desert at night', 'military radar station', 'crop circle aerial', 'haunted mansion', 'forest clearing at night', 'Pentagon briefing room', 'ancient temple ruins', 'observatory dome'] },
    { label: 'Objects', pills: ['UFO silhouette', 'radar screen blip', 'classified folder', 'night vision footage', 'ancient cave painting', 'strange metal fragment', 'witness sketch', 'thermal camera image'] },
    { label: 'Atmosphere', pills: ['eerie night sky glow', 'green night vision', 'mysterious fog', 'pulsing unknown light', 'static interference', 'otherworldly ambiance', 'searchlight beams'] },
  ],
};

// ── Shared camera pills (appended to every niche) ───────────────────────────

const SHARED_CAMERA_PILLS = [
  'extreme close-up', 'wide establishing shot', 'aerial drone view',
  'slow zoom in', 'pan left to right', 'dolly forward', 'tracking shot',
  'bird eye view', 'low angle looking up', 'over the shoulder', 'handheld shake',
];

// ── Framework-specific pill sets ─────────────────────────────────────────────

const FRAMEWORK_PILLS = {
  story: {
    Atmosphere: ['warm golden light', 'misty morning', 'quiet intimacy', 'nostalgic warmth', 'dramatic shadows', 'soft bokeh background'],
    Emotion: ['determination', 'vulnerability', 'triumph', 'reflection', 'hope', 'tension'],
    Pacing: ['slow reveal', 'building momentum', 'lingering moment', 'quiet pause'],
  },
  fast_paced: {
    Action: ['quick zoom', 'rapid cuts', 'dynamic movement', 'high energy', 'snappy transitions'],
    Impact: ['bold graphics', 'striking contrast', 'neon accents', 'clean modern', 'eye-catching'],
    Rhythm: ['punchy beats', 'staccato rhythm', 'countdown energy', 'reveal moment'],
  },
};

/**
 * Get scene pills with context awareness.
 * Combines niche-specific pills, framework context, visual style, and duration.
 * Returns curated visual direction helpers for the scene builder.
 * @param {string} niche - Niche key (e.g. 'scary_horror')
 * @param {Object} framework - Framework object with { category, name } (e.g. { category: 'story', name: 'Story-Driven' })
 * @param {string} visualStyle - Visual style name (informational, may influence pill selection)
 * @param {number} duration - Video duration in seconds (affects pill count)
 * @returns {Array<{label: string, pills: string[]}>}
 */
export function getScenePills(niche, framework = null, visualStyle = null, duration = null) {
  const nichePills = NICHE_SCENE_PILLS[niche];
  const frameworkCategory = framework?.category || 'story';
  const frameworkPills = FRAMEWORK_PILLS[frameworkCategory] || {};

  // If no niche-specific pills found, use fallback
  if (!nichePills) {
    return SCENE_PILL_CATEGORIES;
  }

  const allCategories = {};

  // Niche-specific pills first (in order from NICHE_SCENE_PILLS)
  for (const category of nichePills) {
    allCategories[category.label] = [...category.pills];
  }

  // Framework pills added/merged
  for (const [cat, pills] of Object.entries(frameworkPills)) {
    if (allCategories[cat]) {
      allCategories[cat] = [...allCategories[cat], ...pills];
    } else {
      allCategories[cat] = [...pills];
    }
  }

  // Duration-aware: shorter videos get fewer pills per category
  const maxPills = duration && duration <= 30 ? 4 : 6;

  // Build result array with sliced pills
  const result = Object.entries(allCategories).map(([label, pills]) => ({
    label,
    pills: pills.slice(0, maxPills),
  }));

  // Always append camera pills
  result.push({
    label: 'Camera',
    pills: SHARED_CAMERA_PILLS.slice(0, maxPills),
  });

  return result;
}

/**
 * Get scene pills for a specific niche (backward compatible).
 * Returns niche-specific categories + shared camera.
 * Falls back to generic pills if niche has no custom pills.
 * @param {string} niche - Niche key (e.g. 'scary_horror')
 * @returns {Array<{label: string, pills: string[]}>}
 */
export function getScenePillsForNiche(niche) {
  return getScenePills(niche);
}

// ── Legacy generic fallback (unchanged for backward compat) ─────────────────

export const SCENE_PILL_CATEGORIES = [
  {
    label: 'Environments',
    pills: [
      'urban cityscape', 'dark laboratory', 'modern office', 'futuristic corridor',
      'forest clearing', 'underwater scene', 'mountain peak', 'space station interior',
      'neon-lit street', 'ancient temple', 'desert landscape', 'cozy room interior',
    ],
  },
  {
    label: 'Objects',
    pills: [
      'glowing screens', 'holographic display', 'code on monitor', 'circuit board',
      'smartphone in hand', 'stack of documents', 'microscope', 'robot arm',
      'cryptocurrency chart', 'brain scan image', 'security camera', 'clock ticking',
    ],
  },
  {
    label: 'Atmosphere',
    pills: [
      'fog and mist', 'rain drops', 'neon lights', 'golden hour sun',
      'dramatic shadows', 'lens flare', 'floating particles', 'smoke wisps',
      'lightning flash', 'candlelight', 'moonlight', 'fire glow',
    ],
  },
  {
    label: 'Camera',
    pills: SHARED_CAMERA_PILLS,
  },
];
