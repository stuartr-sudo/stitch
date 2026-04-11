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
  FOOD_COOKING: 'food_cooking',
  TRAVEL_ADVENTURE: 'travel_adventure',
  PSYCHOLOGY: 'psychology_mindblown',
  SPACE_COSMOS: 'space_cosmos',
  ANIMALS_WILDLIFE: 'animals_wildlife',
  SPORTS_ATHLETES: 'sports_athletes',
  EDUCATION: 'education_learning',
  PARANORMAL_UFO: 'paranormal_ufo',
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
 *   - visual_mood: atmosphere/tone description for image generation prompts
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
    visual_mood: 'Clean futuristic aesthetic, cool blue and white tones, sleek technology, holographic displays, data visualizations, neon accents, dark polished surfaces, professional lighting',
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
    visual_mood: 'Professional dark backgrounds, gold and green accents, financial charts and graphs, luxury textures, sharp typography, wealth imagery, polished corporate aesthetic',
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
    visual_mood: 'Warm golden-hour lighting, sunrise/sunset tones, silhouettes of people overcoming obstacles, dramatic lens flares, hopeful upward compositions, inspirational landscapes',
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
    visual_mood: 'Dark oppressive atmosphere, deep shadows, desaturated cold tones, fog and mist, abandoned locations, flickering dim light, unsettling angles, horror film color grading with sickly greens and deep blacks',
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
    visual_mood: 'Sepia and warm amber tones, aged parchment textures, dramatic oil painting lighting, historical architecture, candlelit interiors, epic wide landscape shots, documentary gravitas',
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
    visual_mood: 'Dark noir aesthetic, high-contrast black and white with red accents, crime scene tape, rain-slicked streets, surveillance footage grain, dramatic spotlight shadows, investigative documentary feel',
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
    visual_mood: 'Vivid macro photography, deep ocean blues and electric greens, laboratory aesthetics, microscopic worlds, cosmic nebula colors, nature close-ups with dramatic depth of field, wonder and discovery',
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
    visual_mood: 'Warm soft lighting, intimate close-ups, bokeh backgrounds, cozy indoor scenes, warm skin tones, romantic golden tones, thoughtful contemplative poses, emotional connection',
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
    visual_mood: 'High-energy gym lighting, dynamic action shots, athletic bodies in motion, clean bright environments, sweat and determination, bold vibrant colors, motivational energy',
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
    visual_mood: 'Neon-lit dark environments, RGB gaming aesthetics, pixel art accents, vibrant purple and electric blue, screen glow reflections, retro-futuristic pop culture mashups, energetic compositions',
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
    visual_mood: 'Shadowy dimly-lit rooms, redacted documents, pinboard with red string connections, surveillance camera grain, mysterious symbols, eerie government buildings, paranoid documentary aesthetic',
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
    visual_mood: 'Sleek modern offices, conference rooms with city skyline views, sharp professional attire, bold typography overlays, ambitious upward angles, corporate power aesthetic with warm amber accents',
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

  [SHORTS_NICHE_TYPES.FOOD_COOKING]: {
    name: 'Food / Cooking',
    description: 'Fascinating food science and cooking secrets that change how you eat',
    total_duration_seconds: 55,
    scenes: [
      { role: 'hook',     duration: 3,  hint: 'Shocking food fact or question that stops the scroll' },
      { role: 'context',  duration: 8,  hint: 'What most people get wrong about this food or technique' },
      { role: 'point',    duration: 10, hint: 'The science or secret behind the food — explain simply' },
      { role: 'steps',    duration: 12, hint: 'The technique or recipe trick anyone can try today' },
      { role: 'proof',    duration: 10, hint: 'Before/after or real-world example showing the difference' },
      { role: 'impact',   duration: 8,  hint: 'Why this changes everything about how you cook or eat' },
      { role: 'cta',      duration: 4,  hint: 'Save this recipe, follow for more food secrets' },
    ],
    music_mood: 'warm acoustic background, gentle upbeat rhythm, kitchen vibes, cozy and inviting, no vocals',
    voice_pacing: 'Warm and enthusiastic, like a passionate chef sharing secrets. Use sensory language — describe tastes, textures, aromas.',
    default_voice: 'Charlie',
    visual_style: 'cinematic',
    visual_mood: 'Warm kitchen lighting, rich saturated food colors, steam and sizzle, rustic wooden surfaces, overhead flat-lay compositions, appetizing close-ups with shallow depth of field, cozy inviting atmosphere',
    script_system_prompt: `You are a food scientist and chef creating a viral 55-second food video.
Rules:
- Focus on ONE specific food fact, technique, or recipe secret
- Open with something that challenges what people think they know
- Include the science (Maillard reaction, emulsification, etc.) but explain simply
- Use sensory language: describe how things taste, smell, feel
- Give a specific actionable technique viewers can try immediately
- Include real comparisons or before/after scenarios
- End with a line that makes them want to try it tonight`,
  },

  [SHORTS_NICHE_TYPES.TRAVEL_ADVENTURE]: {
    name: 'Travel / Adventure',
    description: 'Hidden destinations and travel secrets that inspire wanderlust',
    total_duration_seconds: 55,
    scenes: [
      { role: 'hook',       duration: 3,  hint: 'A destination or fact that makes viewers want to pack their bags' },
      { role: 'setting',    duration: 8,  hint: 'Paint the scene — what this place looks, sounds, and feels like' },
      { role: 'point',      duration: 10, hint: 'The hidden secret or unknown aspect of this destination' },
      { role: 'point',      duration: 10, hint: 'The experience you can only get here — be specific' },
      { role: 'strategy',   duration: 10, hint: 'How to actually do this — practical tips, costs, timing' },
      { role: 'impact',     duration: 8,  hint: 'Why this experience changes people — emotional payoff' },
      { role: 'cta',        duration: 6,  hint: 'Save for your next trip, follow for hidden destinations' },
    ],
    music_mood: 'uplifting world music, acoustic guitar with global percussion, wanderlust and adventure, no vocals',
    voice_pacing: 'Dreamy and vivid like a travel documentary. Paint pictures with words. Build wonder and desire.',
    default_voice: 'Brian',
    visual_style: 'cinematic',
    visual_mood: 'Breathtaking landscape vistas, golden hour travel photography, vibrant local culture and colors, aerial drone perspectives, turquoise waters, ancient ruins, wanderlust adventure aesthetic',
    script_system_prompt: `You are a travel documentarian creating a viral 55-second destination video.
Rules:
- Focus on ONE specific destination, experience, or travel secret
- Open with the most awe-inspiring or counterintuitive fact
- Use vivid sensory descriptions — transport the viewer there
- Include specific practical details: costs, best time to visit, how to get there
- Mention something you can only experience at this location
- Connect to a deeper human desire (freedom, discovery, connection)
- End with a line that triggers immediate travel planning`,
  },

  [SHORTS_NICHE_TYPES.PSYCHOLOGY]: {
    name: 'Psychology / Mind',
    description: 'Mind-bending psychological insights that change how you see the world',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',          duration: 3,  hint: 'A psychological fact that makes the viewer question themselves' },
      { role: 'context',       duration: 8,  hint: 'The common behavior or belief most people don\'t question' },
      { role: 'point',         duration: 10, hint: 'The psychological mechanism behind it — name the bias or effect' },
      { role: 'story_setup',   duration: 10, hint: 'The famous experiment or real-world example demonstrating this' },
      { role: 'impact',        duration: 10, hint: 'How this controls your decisions, relationships, or beliefs daily' },
      { role: 'strategy',      duration: 10, hint: 'How to recognize and overcome this — practical awareness tip' },
      { role: 'cta',           duration: 4,  hint: 'Follow for psychology insights that change your thinking' },
    ],
    music_mood: 'mysterious intellectual ambient, subtle piano with atmospheric pads, curious and thoughtful, no vocals',
    voice_pacing: 'Measured and insightful, like a fascinating psychology professor. Build revelations gradually. Use "you" to make it personal.',
    default_voice: 'Adam',
    visual_style: 'cinematic',
    visual_mood: 'Abstract thought visualizations, brain neural networks, surreal dreamlike imagery, optical illusions, split-screen duality, moody introspective lighting, intellectual depth with purple and deep blue tones',
    script_system_prompt: `You are a psychology expert creating a viral 60-second mind-bending video.
Rules:
- Focus on ONE specific psychological phenomenon, bias, or experiment
- Open with something that makes the viewer immediately question their own behavior
- Name the specific effect (Dunning-Kruger, confirmation bias, etc.)
- Reference a famous experiment or study with specific details
- Make it PERSONAL — show how this affects the viewer's daily life
- Include a practical "now you'll notice this everywhere" moment
- End with a question that makes them reflect on their own behavior
- Never be condescending — position as shared human experience`,
  },

  [SHORTS_NICHE_TYPES.SPACE_COSMOS]: {
    name: 'Space / Cosmos',
    description: 'Mind-expanding cosmic facts that make you feel tiny and amazed',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',    duration: 3,  hint: 'The most mind-bending space fact that defies comprehension' },
      { role: 'context', duration: 8,  hint: 'Set the cosmic scene — distances, scales, or timelines involved' },
      { role: 'point',   duration: 10, hint: 'The core phenomenon — what actually happens and why' },
      { role: 'point',   duration: 10, hint: 'The detail that makes it even more incredible — scale or implication' },
      { role: 'point',   duration: 10, hint: 'The connection to Earth or humanity — why this matters to us' },
      { role: 'impact',  duration: 10, hint: 'The existential implication — what this means about our place' },
      { role: 'opinion', duration: 5,  hint: 'The biggest unanswered question about this' },
      { role: 'cta',     duration: 4,  hint: 'Follow for daily cosmos facts that expand your mind' },
    ],
    music_mood: 'epic cinematic space ambient, soaring synths with deep sub bass, cosmic wonder and awe, orchestral grandeur, no vocals',
    voice_pacing: 'Awestruck and measured, building from curiosity to cosmic wonder. Use analogies to make incomprehensible scales relatable.',
    default_voice: 'George',
    visual_style: 'cinematic',
    visual_mood: 'Deep space blacks with nebula colors, cosmic scale comparisons, planet surfaces, star fields, astronaut silhouettes against Earth, epic orbital photography, awe-inspiring celestial imagery',
    script_system_prompt: `You are a space science communicator creating a viral 60-second cosmic video.
Rules:
- Focus on ONE specific space phenomenon, discovery, or cosmic fact
- Open with the fact that most defies human comprehension
- Use relatable analogies to convey cosmic scale (if the Sun were a basketball...)
- Include specific numbers: distances in light-years, temperatures, ages
- Build from the fact to its implications for humanity
- Reference real missions, telescopes, or discoveries
- End with something that makes viewers feel both tiny and amazed
- Inspire wonder, not fear`,
  },

  [SHORTS_NICHE_TYPES.ANIMALS_WILDLIFE]: {
    name: 'Animals / Wildlife',
    description: 'Incredible animal abilities and behaviors that seem impossible',
    total_duration_seconds: 55,
    scenes: [
      { role: 'hook',    duration: 3,  hint: 'The most unbelievable animal ability or fact' },
      { role: 'context', duration: 8,  hint: 'What this animal looks like and where it lives — set the scene' },
      { role: 'point',   duration: 10, hint: 'The specific ability or behavior in detail — how it works' },
      { role: 'point',   duration: 10, hint: 'The science behind it — why evolution produced this' },
      { role: 'point',   duration: 10, hint: 'The comparison that makes it relatable — if humans could do this...' },
      { role: 'impact',  duration: 8,  hint: 'What scientists are learning or building from this' },
      { role: 'cta',     duration: 6,  hint: 'Follow for incredible animal facts, comment your favorite' },
    ],
    music_mood: 'nature documentary ambient, organic textures with gentle rhythm, wonder and discovery, warm narration underscore, no vocals',
    voice_pacing: 'Curious and amazed like a nature documentary narrator. Build wonder through specific details. Use vivid descriptions.',
    default_voice: 'Charlie',
    visual_style: 'cinematic',
    visual_mood: 'Lush jungle greens, savanna golden light, wildlife close-ups with intense eye contact, underwater marine blue, nature documentary cinematography, dramatic predator-prey tension, pristine wilderness',
    script_system_prompt: `You are a wildlife documentarian creating a viral 55-second animal video.
Rules:
- Focus on ONE specific animal and its most incredible ability
- Open with the fact that sounds too crazy to be real
- Describe the animal vividly — what it looks like, its habitat
- Explain the biological mechanism in simple terms
- Use a human comparison to drive home how impressive this is
- Mention biomimicry or what scientists are learning from it
- End with a fact that makes the viewer want to learn more
- Be accurate — don't exaggerate real animal abilities`,
  },

  [SHORTS_NICHE_TYPES.SPORTS_ATHLETES]: {
    name: 'Sports / Athletes',
    description: 'Epic sports moments and athlete stories that give you chills',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',          duration: 3,  hint: 'The moment or stat that defines this story' },
      { role: 'story_setup',   duration: 8,  hint: 'Who this athlete is and what was at stake' },
      { role: 'struggle',      duration: 10, hint: 'The obstacle, injury, or setback they faced' },
      { role: 'build_up',      duration: 10, hint: 'The preparation, training, or comeback journey' },
      { role: 'climax',        duration: 12, hint: 'The moment itself — the play, the finish, the record' },
      { role: 'impact',        duration: 8,  hint: 'What this meant — records broken, lives changed, legacy' },
      { role: 'lesson',        duration: 5,  hint: 'The universal lesson from this athletic feat' },
      { role: 'cta',           duration: 4,  hint: 'Follow for epic sports stories, comment your GOAT' },
    ],
    music_mood: 'epic motivational orchestral, building drums with soaring brass, triumph and determination, stadium energy, no vocals',
    voice_pacing: 'Excited sports commentary energy, building tension toward the climax. Slow down at emotional beats. Fast during action.',
    default_voice: 'Adam',
    visual_style: 'cinematic',
    visual_mood: 'Stadium floodlights, action freeze-frames, sweat and intensity close-ups, dramatic slow-motion captures, championship trophy gold, roaring crowd energy, athletic peak performance',
    script_system_prompt: `You are a sports storyteller creating a viral 60-second epic moment video.
Rules:
- Focus on ONE specific moment, match, or athlete story
- Open with the defining stat or outcome that hooks immediately
- Set the stakes clearly — what was on the line
- Include a genuine obstacle or setback that makes the payoff earned
- Describe the key moment with vivid play-by-play detail
- Include specific stats, scores, times
- The climax must give chills — use pacing and detail to build it
- End with the legacy or lesson that transcends sports`,
  },

  [SHORTS_NICHE_TYPES.EDUCATION]: {
    name: 'Education / Facts',
    description: 'Mind-blowing facts and knowledge that school never taught you',
    total_duration_seconds: 55,
    scenes: [
      { role: 'hook',    duration: 3,  hint: 'A fact so surprising it sounds made up' },
      { role: 'context', duration: 8,  hint: 'Why most people don\'t know this — what we were taught instead' },
      { role: 'point',   duration: 10, hint: 'The actual truth — explained clearly and memorably' },
      { role: 'point',   duration: 10, hint: 'The supporting evidence or example that proves it' },
      { role: 'impact',  duration: 10, hint: 'Why knowing this changes your understanding of the world' },
      { role: 'point',   duration: 8,  hint: 'The bonus fact that makes it even more surprising' },
      { role: 'cta',     duration: 6,  hint: 'Follow for facts school never taught you, save this' },
    ],
    music_mood: 'curious intellectual ambient, playful piano with light electronic textures, wonder and learning, no vocals',
    voice_pacing: 'Enthusiastic teacher energy, like someone who just discovered something incredible. Build surprise through delivery.',
    default_voice: 'Charlie',
    visual_style: 'cinematic',
    visual_mood: 'Clean educational infographic style, chalkboard and whiteboard aesthetics, bright curious colors, animated diagram feel, clear visual explanations, engaging classroom energy',
    script_system_prompt: `You are an educator creating a viral 55-second "things school never taught you" video.
Rules:
- Focus on ONE specific fact, concept, or piece of knowledge
- Open with the fact that sounds too surprising to be real
- Explain why this isn't commonly known — what gets taught instead
- Use clear analogies and simple explanations
- Include verifiable evidence or sources
- Connect to daily life — why this matters practically
- End with a bonus fact that creates a "wait, WHAT?" moment
- Be accurate and educational, not clickbait`,
  },

  [SHORTS_NICHE_TYPES.PARANORMAL_UFO]: {
    name: 'Paranormal / UFO',
    description: 'Credible encounters and unexplained phenomena with real evidence',
    total_duration_seconds: 60,
    scenes: [
      { role: 'hook',       duration: 3,  hint: 'The most credible or documented encounter detail' },
      { role: 'setting',    duration: 8,  hint: 'When and where this happened — establish credibility' },
      { role: 'build_up',   duration: 10, hint: 'What was observed — specific details from witnesses' },
      { role: 'escalation', duration: 10, hint: 'The evidence that makes this hard to dismiss' },
      { role: 'climax',     duration: 12, hint: 'The most compelling aspect — radar data, photos, testimony' },
      { role: 'twist',      duration: 8,  hint: 'The official response and why it doesn\'t fully explain things' },
      { role: 'opinion',    duration: 5,  hint: 'Present multiple interpretations fairly' },
      { role: 'cta',        duration: 4,  hint: 'Follow for credible paranormal evidence, share your experience' },
    ],
    music_mood: 'eerie atmospheric ambient, distant signals, cosmic dread mixed with wonder, mysterious investigation tone, no vocals',
    voice_pacing: 'Investigative journalist tone — serious and measured. Let the evidence speak. Build intrigue through facts, not sensationalism.',
    default_voice: 'Roger',
    visual_style: 'documentary',
    visual_mood: 'Eerie night skies, grainy VHS footage aesthetic, mysterious lights in darkness, declassified document overlays, isolated rural landscapes, unsettling alien encounter atmosphere, X-Files investigation tone',
    script_system_prompt: `You are an investigative journalist covering a viral 60-second UFO/paranormal case.
Rules:
- Focus on ONE specific documented case or encounter
- Prioritize cases with multiple witnesses, official documentation, or physical evidence
- Include specific dates, locations, names of witnesses or officials
- Present the evidence objectively — don't editorialize
- Include the official explanation AND why it falls short
- Reference specific documents, footage, or testimony
- Always present multiple interpretations fairly
- Tone: serious and curious, never tabloid or conspiratorial
- End with what remains unexplained`,
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
    niches: ['history_did_you_know', 'science_nature', 'conspiracy_mystery', 'business_entrepreneur', 'space_cosmos', 'education_learning'],
  },
  {
    id: 'Daniel',
    name: 'Daniel',
    description: 'Warm, authoritative male — travel, sports',
    niches: ['travel_adventure', 'sports_athletes', 'animals_wildlife'],
  },
  {
    id: 'Lily',
    name: 'Lily',
    description: 'Curious, enthusiastic female — science, animals, education',
    niches: ['animals_wildlife', 'education_learning', 'food_cooking', 'psychology_mindblown'],
  },
  {
    id: 'Liam',
    name: 'Liam',
    description: 'Energetic, intense male — sports, paranormal',
    niches: ['sports_athletes', 'paranormal_ufo', 'space_cosmos'],
  },
];
