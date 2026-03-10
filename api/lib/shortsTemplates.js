/**
 * Shorts Template Library — 60-second vertical video templates
 * optimized for YouTube Shorts, TikTok, and Instagram Reels.
 *
 * Each niche has a story-driven scene structure designed for retention
 * and monetizability (narrative arc, not generic listicles).
 */

export const SHORTS_NICHE_TYPES = {
  AI_TECH_NEWS: 'ai_tech_news',
  FINANCE_MONEY: 'finance_money',
  MOTIVATION: 'motivation_self_help',
  SCARY_HORROR: 'scary_horror',
};

export const SHORTS_SCENE_ROLES = {
  HOOK: 'hook',
  CONTEXT: 'context',
  POINT: 'point',
  IMPACT: 'impact',
  OPINION: 'opinion',
  PROBLEM: 'problem',
  STRATEGY: 'strategy',
  STEPS: 'steps',
  PROOF: 'proof',
  MINDSET: 'mindset',
  STORY_SETUP: 'story_setup',
  STRUGGLE: 'struggle',
  TURNING_POINT: 'turning_point',
  LESSON: 'lesson',
  SETTING: 'setting',
  BUILD_UP: 'build_up',
  ESCALATION: 'escalation',
  CLIMAX: 'climax',
  TWIST: 'twist',
  CTA: 'cta',
};

/**
 * Niche template definitions. Each has:
 *   - scenes: role, target duration, visual/motion hints for GPT
 *   - music_mood: prompt for background music generation
 *   - voice_pacing: instruction for GPT narration scripting
 *   - default_voice: ElevenLabs voice ID
 *   - visual_style: recommended VISUAL_STYLE_PRESETS key
 */
export const SHORTS_TEMPLATES = {
  [SHORTS_NICHE_TYPES.AI_TECH_NEWS]: {
    name: 'AI / Tech News',
    description: 'Breaking AI developments with authority and urgency',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',     duration: 3,  hint: 'Shocking AI headline, stat, or question that stops the scroll' },
      { role: 'context',  duration: 7,  hint: 'Why this matters right now — connect to everyday life' },
      { role: 'point',    duration: 8,  hint: 'Key development 1 — the core breakthrough or change' },
      { role: 'point',    duration: 8,  hint: 'Key development 2 — supporting evidence or related advance' },
      { role: 'point',    duration: 8,  hint: 'Key development 3 — the most surprising angle' },
      { role: 'impact',   duration: 10, hint: 'What this means for regular people — jobs, daily life, future' },
      { role: 'opinion',  duration: 8,  hint: 'Bold prediction or hot take to drive comments' },
      { role: 'cta',      duration: 4,  hint: 'Follow for daily AI updates, ask a question' },
    ],
    music_mood: 'futuristic ambient electronic, pulsing synths, tech-forward, driving energy, no vocals',
    voice_pacing: 'Fast-paced, authoritative news-anchor energy. Short punchy sentences. Pattern interrupts every 10 seconds.',
    default_voice: 'pNInz6obpgDQGcFmaJgB', // Adam — deep authoritative male
    visual_style: 'cinematic',
    script_system_prompt: `You are a tech journalist creating a viral 60-second news breakdown.
Rules:
- Open with the most shocking stat or claim
- Every sentence must deliver value — no filler
- Use pattern interrupts: "But here's what nobody's talking about..."
- End with a prediction viewers will want to debate
- Write like you're explaining to a smart friend, not a professor
- Include specific numbers, dates, company names — be concrete`,
  },

  [SHORTS_NICHE_TYPES.FINANCE_MONEY]: {
    name: 'Finance / Money',
    description: 'Actionable money strategies with credibility and clarity',
    total_duration_seconds: 55,
    scenes: [
      { role: 'hook',     duration: 3,  hint: 'Provocative money stat or counterintuitive claim' },
      { role: 'problem',  duration: 8,  hint: 'The financial mistake or pain point most people have' },
      { role: 'strategy', duration: 10, hint: 'The core strategy or approach — explain simply' },
      { role: 'steps',    duration: 10, hint: 'Specific actionable steps viewers can take today' },
      { role: 'proof',    duration: 10, hint: 'Real numbers, case study, or historical data backing this' },
      { role: 'mindset',  duration: 10, hint: 'The mindset shift needed — why most people fail at this' },
      { role: 'cta',      duration: 4,  hint: 'Follow for more money strategies, save this video' },
    ],
    music_mood: 'confident motivational background, subtle piano and ambient pads, professional, no vocals',
    voice_pacing: 'Confident and calm, like a trusted financial advisor. Clear actionable language. Build credibility through specific numbers.',
    default_voice: 'pNInz6obpgDQGcFmaJgB', // Adam
    visual_style: 'cinematic',
    script_system_prompt: `You are a financial educator creating a viral 55-second money strategy video.
Rules:
- Open with a stat that makes viewers feel they're losing money
- Include specific dollar amounts and percentages
- Give ONE clear actionable strategy, not a vague overview
- Include a real-world example or case study
- Never give specific stock picks or guarantees
- End with a mindset reframe that changes how they think about money
- Disclaimer-safe: use "consider" and "research" language`,
  },

  [SHORTS_NICHE_TYPES.MOTIVATION]: {
    name: 'Motivation / Self-Help',
    description: 'Powerful stories with emotional arc and life lessons',
    total_duration_seconds: 55,
    scenes: [
      { role: 'hook',          duration: 3,  hint: 'Powerful question or moment that hooks emotionally' },
      { role: 'story_setup',   duration: 10, hint: 'Set the scene — who, where, what was at stake' },
      { role: 'struggle',      duration: 12, hint: 'The lowest point — make the viewer feel the weight' },
      { role: 'turning_point', duration: 12, hint: 'The moment everything changed — specific action or realization' },
      { role: 'lesson',        duration: 12, hint: 'The universal lesson — connect to viewer\'s own life' },
      { role: 'cta',           duration: 6,  hint: 'Powerful closing line + follow for daily motivation' },
    ],
    music_mood: 'emotional inspirational orchestral, building from quiet piano to soaring strings, cinematic hope, no vocals',
    voice_pacing: 'Slow and deliberate at emotional moments, building intensity. Pauses for impact. Like a storyteller around a campfire.',
    default_voice: 'ErXwobaYiN019PkySvjV', // Antoni — warm inspiring male
    visual_style: 'cinematic',
    script_system_prompt: `You are a master storyteller creating a viral 55-second motivation video.
Rules:
- Tell a SPECIFIC story, not generic advice
- Can be about a famous person, historical figure, or composite character
- Structure: setup → struggle → turning point → lesson
- Use vivid sensory details — what did they see, feel, hear?
- The turning point must be a SPECIFIC action, not a vague realization
- End with a universal lesson the viewer can apply TODAY
- Never be preachy — show, don't tell
- Make the viewer feel something in the first 3 seconds`,
  },

  [SHORTS_NICHE_TYPES.SCARY_HORROR]: {
    name: 'Scary / Horror Stories',
    description: 'Atmospheric horror with slow build and shocking twist',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',       duration: 3,  hint: 'Chilling opening line or disturbing detail that grabs' },
      { role: 'setting',    duration: 8,  hint: 'Establish the eerie setting — time, place, atmosphere' },
      { role: 'build_up',   duration: 12, hint: 'First strange occurrence — something slightly wrong' },
      { role: 'escalation', duration: 12, hint: 'Things get worse — tension rises, details don\'t add up' },
      { role: 'climax',     duration: 12, hint: 'The horrifying revelation or encounter' },
      { role: 'twist',      duration: 8,  hint: 'Final twist that recontextualizes everything' },
      { role: 'cta',        duration: 5,  hint: 'Follow for more, ask if they want part 2' },
    ],
    music_mood: 'dark ambient horror, low drones, distant echoes, unsettling tension, creeping dread, no vocals',
    voice_pacing: 'Slow and hushed, building dread. Whisper-like at tense moments. Sudden pace changes at reveals. Like reading a scary story at midnight.',
    default_voice: '2EiwWnXFnvU5JabPnv8n', // Clyde — deep gravelly male
    visual_style: 'documentary',
    script_system_prompt: `You are a horror storyteller creating a viral 60-second scary story.
Rules:
- Tell a SPECIFIC story — not generic creepypasta tropes
- Can be "true story" style, urban legend, or original fiction
- Build atmosphere with sensory details — sounds, smells, shadows
- Use the "rule of three" — three escalating events before the climax
- The twist must genuinely surprise — not the obvious ending
- Keep it PG-13: psychological horror over gore
- Use present tense for immediacy: "She opens the door and..."
- End with something that lingers — an unanswered question`,
  },
};

/**
 * Get a shorts template by niche key.
 * @param {string} niche - e.g. 'ai_tech_news'
 * @returns {object|null}
 */
export function getShortsTemplate(niche) {
  return SHORTS_TEMPLATES[niche] || null;
}

/**
 * List all available niche keys.
 * @returns {string[]}
 */
export function listShortsNiches() {
  return Object.keys(SHORTS_TEMPLATES);
}

/**
 * ElevenLabs voice presets — curated voices for faceless shorts.
 */
export const VOICE_PRESETS = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',    description: 'Deep, authoritative male — tech, finance',  niches: ['ai_tech_news', 'finance_money'] },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni',  description: 'Warm, inspiring male — motivation, stories', niches: ['motivation_self_help'] },
  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde',   description: 'Deep gravelly male — horror, mystery',       niches: ['scary_horror'] },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel',  description: 'Calm, eerie female — horror, ASMR',          niches: ['scary_horror'] },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',    description: 'Young energetic male — tech, motivation',    niches: ['ai_tech_news', 'motivation_self_help'] },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',   description: 'Young clear female — general, finance',      niches: ['finance_money', 'ai_tech_news'] },
];
