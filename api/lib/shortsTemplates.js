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
  HISTORY: 'history_did_you_know',
  TRUE_CRIME: 'true_crime',
  SCIENCE_NATURE: 'science_nature',
  RELATIONSHIPS: 'relationships_dating',
  HEALTH_FITNESS: 'health_fitness',
  GAMING_POPCULTURE: 'gaming_popculture',
  CONSPIRACY_MYSTERY: 'conspiracy_mystery',
  BUSINESS: 'business_entrepreneur',
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
 *   - default_voice: FAL voice name (e.g. 'Adam', 'Brian', 'Roger')
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
    default_voice: 'Adam',
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
    default_voice: 'Adam',
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
    default_voice: 'Brian',
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
    default_voice: 'Roger',
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

  [SHORTS_NICHE_TYPES.HISTORY]: {
    name: 'History / Did You Know',
    description: 'Fascinating historical facts and untold stories',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',    duration: 3,  hint: 'Mind-blowing historical fact or question' },
      { role: 'context', duration: 8,  hint: 'Set the historical scene — time, place, key figure' },
      { role: 'point',   duration: 10, hint: 'The core story — what actually happened' },
      { role: 'point',   duration: 10, hint: 'The surprising detail most people don\'t know' },
      { role: 'impact',  duration: 10, hint: 'How this changed history or still affects us' },
      { role: 'point',   duration: 10, hint: 'The most shocking part — twist or ironic outcome' },
      { role: 'opinion', duration: 5,  hint: 'Thought-provoking question connecting to modern day' },
      { role: 'cta',     duration: 4,  hint: 'Follow for daily history facts' },
    ],
    music_mood: 'epic orchestral ambient, historical documentary feel, building tension, no vocals',
    voice_pacing: 'Storyteller energy — measured pace with dramatic pauses. Build wonder and surprise.',
    default_voice: 'Adam',
    visual_style: 'cinematic',
    script_system_prompt: `You are a history storyteller creating a viral 60-second video.
Rules:
- Pick ONE specific historical event — not a broad overview
- Open with the most surprising or counterintuitive aspect
- Include specific dates, names, places
- Connect to something modern viewers care about
- Use vivid sensory details
- End with a question that makes viewers comment`,
  },

  [SHORTS_NICHE_TYPES.TRUE_CRIME]: {
    name: 'True Crime',
    description: 'Gripping real crime cases with twists and revelations',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',       duration: 4,  hint: 'Shocking crime detail or question that demands attention' },
      { role: 'setting',    duration: 7,  hint: 'Set the scene — location, victim, circumstances' },
      { role: 'build_up',   duration: 10, hint: 'The events leading up to the crime — what seemed normal' },
      { role: 'escalation', duration: 10, hint: 'The crime itself or the investigation begins' },
      { role: 'climax',     duration: 12, hint: 'The breakthrough moment — key evidence or confession' },
      { role: 'twist',      duration: 8,  hint: 'The shocking reveal or unexpected outcome' },
      { role: 'impact',     duration: 5,  hint: 'Legacy of the case — what changed because of it' },
      { role: 'cta',        duration: 4,  hint: 'Follow for more true crime, ask their opinion' },
    ],
    music_mood: 'suspenseful investigative documentary, sparse piano, distant heartbeat, tension-building, no vocals',
    voice_pacing: 'Measured and deliberate like a documentary narrator. Build dread with facts. Let silences breathe.',
    default_voice: 'Roger',
    visual_style: 'documentary',
    script_system_prompt: `You are a true crime documentarian creating a viral 60-second case breakdown.
Rules:
- Focus on ONE specific real case (or a composite based on real cases)
- Lead with the most shocking or counterintuitive detail
- Include specific details: dates, locations, names (can be changed for privacy)
- Follow the investigation arc — not just the crime
- The twist should recontextualize everything that came before
- Be respectful of victims — focus on justice, not sensationalism
- End with an open question that sparks debate`,
  },

  [SHORTS_NICHE_TYPES.SCIENCE_NATURE]: {
    name: 'Science / Nature',
    description: 'Mind-expanding science facts that make viewers question reality',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',    duration: 3,  hint: 'The most counterintuitive science fact — breaks their mental model' },
      { role: 'context', duration: 8,  hint: 'What most people think is true — set up the misconception' },
      { role: 'point',   duration: 10, hint: 'The actual scientific truth — explain simply' },
      { role: 'point',   duration: 10, hint: 'The mechanism — HOW or WHY this happens' },
      { role: 'point',   duration: 10, hint: 'The mind-blowing implication or scale of this fact' },
      { role: 'impact',  duration: 10, hint: 'Real-world applications or what this means for humanity' },
      { role: 'opinion', duration: 5,  hint: 'The biggest unanswered question this raises' },
      { role: 'cta',     duration: 4,  hint: 'Follow for daily science facts that blow your mind' },
    ],
    music_mood: 'ethereal cosmic ambient, wonder and discovery, gentle electronic textures, expansive, no vocals',
    voice_pacing: 'Curious and enthusiastic like a passionate science teacher. Build from simple to mind-blowing. Use analogies.',
    default_voice: 'Charlie',
    visual_style: 'cinematic',
    script_system_prompt: `You are a science communicator creating a viral 60-second educational video.
Rules:
- Pick ONE specific phenomenon — not a broad topic overview
- Open with the fact that most contradicts intuition
- Explain using relatable analogies (no jargon)
- Include specific numbers that convey scale or surprise
- Build to the biggest implication — make them feel small or amazed
- Spark curiosity, not anxiety
- End with a question that makes them want to learn more`,
  },

  [SHORTS_NICHE_TYPES.RELATIONSHIPS]: {
    name: 'Relationships / Dating',
    description: 'Psychology-backed relationship insights that feel personally relevant',
    total_duration_seconds: 55,
    scenes: [
      { role: 'hook',          duration: 3,  hint: 'Relatable relationship scenario or uncomfortable truth' },
      { role: 'problem',       duration: 8,  hint: 'The common relationship mistake or pattern most people fall into' },
      { role: 'story_setup',   duration: 8,  hint: 'A specific scenario illustrating the problem' },
      { role: 'turning_point', duration: 10, hint: 'The psychology behind it — why this actually happens' },
      { role: 'strategy',      duration: 10, hint: 'The practical shift — what to do instead' },
      { role: 'lesson',        duration: 10, hint: 'The deeper truth about love, connection, or self-worth' },
      { role: 'cta',           duration: 6,  hint: 'Ask a relatable question, follow for relationship insights' },
    ],
    music_mood: 'warm intimate acoustic, gentle guitar or piano, emotionally resonant but not sad, understated, no vocals',
    voice_pacing: 'Warm and conversational, like a trusted friend who studied psychology. Empathetic tone. No judgment.',
    default_voice: 'Brian',
    visual_style: 'cinematic',
    script_system_prompt: `You are a relationship psychology educator creating a viral 55-second video.
Rules:
- Address ONE specific relationship dynamic, not general advice
- Open with something that makes viewers say "that's literally me"
- Reference real psychology (attachment theory, love languages, etc.) but explain it simply
- Use a specific relatable scenario — not abstract
- The insight must feel earned, not obvious
- End with practical actionable advice
- Never shame — always empower
- Make it feel like someone finally explained what they've been feeling`,
  },

  [SHORTS_NICHE_TYPES.HEALTH_FITNESS]: {
    name: 'Health & Fitness',
    description: 'Science-backed health insights that debunk myths and drive action',
    total_duration_seconds: 55,
    scenes: [
      { role: 'hook',     duration: 3,  hint: 'Shocking health stat or myth most people believe' },
      { role: 'problem',  duration: 8,  hint: 'The common health mistake — why most people fail at this' },
      { role: 'proof',    duration: 8,  hint: 'The science — what research actually shows' },
      { role: 'strategy', duration: 10, hint: 'The evidence-based approach that actually works' },
      { role: 'steps',    duration: 10, hint: 'Specific actionable steps anyone can start today' },
      { role: 'impact',   duration: 10, hint: 'The transformation — what changes in 30/90 days' },
      { role: 'cta',      duration: 6,  hint: 'Save this, follow for evidence-based health tips' },
    ],
    music_mood: 'energetic motivational, upbeat electronic with driving beat, positive energy, no vocals',
    voice_pacing: 'Energetic and direct, like a knowledgeable personal trainer. Cut through myths with confidence. Use numbers.',
    default_voice: 'Charlie',
    visual_style: 'cinematic',
    script_system_prompt: `You are a health and fitness educator creating a viral 55-second video.
Rules:
- Focus on ONE specific health myth, habit, or strategy
- Open by challenging a popular belief with science
- Reference real studies or mechanisms (explain simply)
- Include specific numbers: percentages, timeframes, repetitions
- The strategy must be specific and doable — not "eat better"
- Always add appropriate caveats (consult a doctor, results vary)
- End with an immediate first step they can take today`,
  },

  [SHORTS_NICHE_TYPES.GAMING_POPCULTURE]: {
    name: 'Gaming / Pop Culture',
    description: 'Hidden lore, wild theories, and untold stories from gaming and entertainment',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',    duration: 3,  hint: 'The fact or theory that will blow fans\' minds' },
      { role: 'context', duration: 7,  hint: 'Quick setup — what most fans think they know' },
      { role: 'point',   duration: 10, hint: 'The hidden detail, Easter egg, or untold backstory' },
      { role: 'point',   duration: 10, hint: 'The deeper lore or real-world connection behind it' },
      { role: 'point',   duration: 10, hint: 'The implications — what this changes about the story' },
      { role: 'impact',  duration: 10, hint: 'Why this matters to the community or franchise' },
      { role: 'opinion', duration: 6,  hint: 'Hot take or theory — what it means going forward' },
      { role: 'cta',     duration: 4,  hint: 'Follow for more hidden lore and fan theories' },
    ],
    music_mood: 'dynamic gaming-inspired, electronic with melodic elements, nostalgic yet modern, building energy, no vocals',
    voice_pacing: 'Enthusiastic fan energy — excited but knowledgeable. Like the most passionate person at a gaming convention.',
    default_voice: 'Charlie',
    visual_style: 'cinematic',
    script_system_prompt: `You are a gaming and pop culture expert creating a viral 60-second deep-dive video.
Rules:
- Focus on ONE specific game, movie, show, or franchise
- Lead with the most surprising or little-known fact
- Can cover: hidden Easter eggs, development secrets, lore theories, real-world inspirations
- Use specific details: character names, game titles, release dates
- Connect to something fans already love — deepen their appreciation
- Build to a revelation that reframes what they thought they knew
- End with a question that sparks fan debate`,
  },

  [SHORTS_NICHE_TYPES.CONSPIRACY_MYSTERY]: {
    name: 'Conspiracy / Mystery',
    description: 'Unsolved mysteries and alternative theories that spark deep thinking',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',       duration: 4,  hint: 'The unanswered question or unsettling anomaly' },
      { role: 'setting',    duration: 7,  hint: 'The official story — what the world was told' },
      { role: 'build_up',   duration: 10, hint: 'The first inconsistency — what doesn\'t add up' },
      { role: 'escalation', duration: 10, hint: 'More anomalies or evidence that deepens the mystery' },
      { role: 'climax',     duration: 12, hint: 'The most compelling alternative theory or explanation' },
      { role: 'twist',      duration: 8,  hint: 'The detail that makes the theory almost undeniable' },
      { role: 'opinion',    duration: 5,  hint: 'Present both sides — let viewers decide' },
      { role: 'cta',        duration: 4,  hint: 'Ask what they think, follow for more mysteries' },
    ],
    music_mood: 'mysterious investigative, layered synths with a subtle unease, tension without being horror, no vocals',
    voice_pacing: 'Measured and curious, like a journalist uncovering something. Not sensationalist — let the facts speak.',
    default_voice: 'Adam',
    visual_style: 'documentary',
    script_system_prompt: `You are an investigative journalist creating a viral 60-second mystery breakdown.
Rules:
- Focus on ONE specific mystery, unsolved case, or anomaly
- Present evidence objectively — not ranting, just questioning
- Include verifiable facts alongside the anomalies
- The "twist" should be a real documented detail, not speculation
- Always present multiple perspectives fairly
- Avoid harmful misinformation — stick to documented mysteries
- End with a genuine open question that respects viewer intelligence
- Tone: curious and analytical, never paranoid`,
  },

  [SHORTS_NICHE_TYPES.BUSINESS]: {
    name: 'Business / Entrepreneur',
    description: 'Raw business strategies and founder stories that drive action',
    total_duration_seconds: 55,
    scenes: [
      { role: 'hook',          duration: 3,  hint: 'Counterintuitive business insight or shocking revenue stat' },
      { role: 'story_setup',   duration: 8,  hint: 'A founder story or business scenario to anchor the lesson' },
      { role: 'problem',       duration: 8,  hint: 'The business mistake 90% of entrepreneurs make' },
      { role: 'strategy',      duration: 10, hint: 'The contrarian strategy that actually drives results' },
      { role: 'proof',         duration: 10, hint: 'Real business example, case study, or revenue numbers' },
      { role: 'steps',         duration: 10, hint: 'The actionable framework — what to do first' },
      { role: 'cta',           duration: 6,  hint: 'Save this, follow for founder-tested business strategies' },
    ],
    music_mood: 'confident determined background, driving electronic with subtle intensity, forward-moving energy, no vocals',
    voice_pacing: 'Direct and high-energy, like a successful founder on a podcast. No corporate fluff. Talk straight.',
    default_voice: 'Adam',
    visual_style: 'cinematic',
    script_system_prompt: `You are a serial entrepreneur creating a viral 55-second business strategy video.
Rules:
- Lead with a specific business insight, not a vague motivational statement
- Name real companies, founders, or revenue milestones when relevant
- The strategy must be specific and implementable — not "think differently"
- Include a contrarian angle that challenges conventional business advice
- Use concrete numbers: revenue, growth percentage, timeframes
- Tell a mini founder story to illustrate the point
- End with one clear next action the viewer can take today`,
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
// Voice IDs are FAL voice names (used directly with fal-ai/elevenlabs/tts/eleven-v3).
// Valid FAL voices: Aria, Roger, Sarah, Laura, Charlie, George, Callum, River,
// Liam, Charlotte, Alice, Matilda, Will, Jessica, Eric, Chris, Brian, Daniel, Lily, Bill, Rachel, Adam.
export const VOICE_PRESETS = [
  {
    id: 'Adam',
    name: 'Adam',
    description: 'Deep, authoritative male — tech, finance',
    niches: ['ai_tech_news', 'finance_money', 'history_did_you_know', 'conspiracy_mystery', 'business_entrepreneur'],
  },
  {
    id: 'Brian',
    name: 'Brian',
    description: 'Warm, inspiring male — motivation, stories',
    niches: ['motivation_self_help', 'relationships_dating'],
  },
  {
    id: 'Roger',
    name: 'Roger',
    description: 'Deep gravelly male — horror, mystery',
    niches: ['scary_horror', 'true_crime'],
  },
  {
    id: 'Rachel',
    name: 'Rachel',
    description: 'Calm, eerie female — horror, ASMR',
    niches: ['scary_horror', 'true_crime', 'conspiracy_mystery'],
  },
  {
    id: 'Charlie',
    name: 'Charlie',
    description: 'Young energetic male — tech, motivation, gaming',
    niches: ['ai_tech_news', 'motivation_self_help', 'science_nature', 'health_fitness', 'gaming_popculture'],
  },
  {
    id: 'Laura',
    name: 'Laura',
    description: 'Young clear female — general, finance',
    niches: ['finance_money', 'ai_tech_news', 'health_fitness', 'relationships_dating'],
  },
  {
    id: 'Aria',
    name: 'Aria',
    description: 'Expressive, versatile female — all niches',
    niches: ['ai_tech_news', 'motivation_self_help', 'science_nature', 'health_fitness', 'finance_money'],
  },
  {
    id: 'George',
    name: 'George',
    description: 'Deep, commanding male — history, documentary',
    niches: ['history_did_you_know', 'science_nature', 'conspiracy_mystery', 'business_entrepreneur'],
  },
];
