/**
 * Niche Blueprints — Complete production direction for 23 niches.
 * Each blueprint defines hook formulas, visual style, music, SFX,
 * pacing, and failure modes for the Fichtean Curve beat structure.
 *
 * Used by: productionEngine.js
 */

// ─── UNIVERSAL BEAT STRUCTURE ────────────────────────────────────────────────

export const BEAT_STRUCTURE = [
  {
    id: 'hook',
    name: 'The Hook',
    timing: '0-3s',
    purpose: 'Stop the scroll. Create an open loop.',
    rules: [
      'First words must contain an unresolved element',
      'NEVER start with "Hey guys," "Welcome back," "In this video," "Did you know"',
      'Must work with AND without audio (text overlay carries the hook visually)',
      'Maximum 12 words spoken',
      'Visual must be the most arresting image in the entire video',
    ],
  },
  {
    id: 'context',
    name: 'The Context Anchor',
    timing: '3-8s',
    purpose: 'Ground the hook with just enough info to understand the stakes.',
    rules: [
      '1-2 sentences maximum',
      'Answers "why should I care?" without answering "what happens?"',
      'Must introduce the TENSION — not explain it away',
      'This is where the viewer commits to watching or leaves',
    ],
  },
  {
    id: 'escalation_1',
    name: 'Escalation 1',
    timing: '8-18s',
    purpose: 'First major information/tension ramp.',
    rules: [
      'Introduce a complication, twist, or deeper layer',
      'Use an escalation connector: "But here\'s the thing..." / "It gets weirder..."',
      'Each new piece of info must feel BIGGER than the last',
      'Visual pace increases here — cuts every 2-3 seconds',
    ],
  },
  {
    id: 'escalation_2',
    name: 'Escalation 2 / Peak Build',
    timing: '18-35s',
    purpose: 'The meat of the content. Deepest information density.',
    rules: [
      'This is the longest beat — but must never feel slow',
      'Stack 2-3 revelations or points with increasing stakes',
      'Use contrast: "Everyone thinks X. But actually Y."',
      'Micro-cliffhangers between sub-points',
      'Visual variety is critical — never hold one image for more than 4 seconds',
    ],
  },
  {
    id: 'climax',
    name: 'Climax / Payoff',
    timing: '35-50s',
    purpose: 'Deliver the thing the hook promised.',
    rules: [
      'This is the moment the open loop closes',
      'The biggest reveal, the most dramatic moment, the punchline',
      'Slight tempo change — either speed up for impact or slow down for weight',
      'Visual should be the SECOND most arresting image (after the hook)',
      'This beat should feel INEVITABLE — like everything before was building to it',
    ],
  },
  {
    id: 'kicker',
    name: 'Kicker / Loop Close',
    timing: '50-65s',
    purpose: 'Leave a lasting impression AND encourage replay/engagement.',
    rules: [
      'Callback to hook, unresolved question, hot take, or "Part 2?" tease',
      'If possible, engineer a LOOP — the final line connects to the first line',
      'NEVER end with "Like and subscribe" or "Follow for more" as the final words',
      'CTA (if any) goes in the MIDDLE of the kicker, not at the end',
      'Final visual should either match the opening (loop) or be a resonant closing image',
    ],
  },
  {
    id: 'buffer',
    name: 'Buffer',
    timing: '65-75s',
    purpose: 'Extra breathing room for pacing, end-card, or extended kicker.',
    rules: [
      'Only use if the script naturally needs it',
      'Can be a second kicker, a "bonus" fact, or a visual-only moment with music',
      'Do NOT pad — if the script is complete at 60s, end at 60s',
    ],
    optional: true,
  },
];

// ─── CONNECTIVE TISSUE ──────────────────────────────────────────────────────

// These are EXAMPLES, not a menu to pick from robotically.
// The best connectors feel organic to the story — like a friend mid-sentence
// who can't contain what they're about to tell you.
// RULE: Use these as INSPIRATION. Then write your own that match the niche tone.
// A horror connector should sound different from a finance connector.

export const ESCALATION_CONNECTORS = [
  // ── Complication / "It gets deeper" ──
  'But here\'s the thing—',
  'It gets worse.',
  'It gets better.',
  'But then—',
  'And it doesn\'t stop there.',
  'That was just the beginning.',

  // ── Surprise / "Wait, what?" ──
  'What nobody expected—',
  'Nobody saw this coming.',
  'Then something changed.',
  'And then the real story starts.',
  'But that\'s not why you should care.',

  // ── Revelation / "Look at THIS" ──
  'But look at this.',
  'Watch what happens next.',
  'Here\'s what they found.',
  'And here\'s the part no one talks about.',
  'The data tells a different story.',

  // ── Contradiction / "Actually..." ──
  'Except that\'s not what happened.',
  'But the opposite is true.',
  'The problem? None of that was real.',
  'Everyone assumed X. They were wrong.',

  // ── Stakes-raising / "It matters because..." ──
  'And that changes everything.',
  'This is where it starts to matter.',
  'By this point, there was no going back.',
  'And once you see it, you can\'t unsee it.',

  // ── Time-pressure / "Then suddenly..." ──
  'Within hours—',
  'By the next morning—',
  'Three days later—',
  'And then, silence.',
];

// Niche-flavored connector examples — the model should CREATE connectors
// in this register rather than using generic ones.
export const NICHE_CONNECTOR_FLAVORS = {
  scary_horror: [
    'Then the second photo loaded.',
    'That\'s when the audio cuts out.',
    'Nobody went back inside after that.',
    'The recording picks up again at 3 AM.',
  ],
  finance_money: [
    'Now run those numbers.',
    'Here\'s where the math breaks.',
    'Your bank already knows this.',
    'The spreadsheet doesn\'t lie.',
  ],
  science_nature: [
    'And then they looked closer.',
    'The microscope revealed something else.',
    'That\'s when the theory fell apart.',
    'Biology had a different answer.',
  ],
  history_did_you_know: [
    'The letter was dated three days earlier.',
    'But the archives tell a different story.',
    'Nobody read the footnote until now.',
    'The second page changes everything.',
  ],
  health_fitness: [
    'Your body already knows this.',
    'The study didn\'t stop there.',
    'And it compounds.',
    'Here\'s what the data actually shows.',
  ],
  motivation_self_help: [
    'And that\'s not discipline. That\'s design.',
    'I didn\'t believe it either.',
    'The shift happened in one sentence.',
    'Nobody teaches you this part.',
  ],
  gaming_popculture: [
    'But the code says something else.',
    'Players started noticing.',
    'The developers never patched this.',
    'And THAT is when the community lost it.',
  ],
  true_crime: [
    'The detective noticed one thing.',
    'The timeline didn\'t match.',
    'Nobody checked the second camera.',
    'Then the DNA came back.',
  ],
  conspiracy_mystery: [
    'The filing was dated wrong.',
    'Three witnesses. Same story. No coordination.',
    'The official report skips this part.',
    'And the redacted page? It was only one paragraph.',
  ],
  ai_tech_news: [
    'The changelog buried the real update.',
    'Nobody benchmarked this part.',
    'Then someone ran it on production data.',
    'The API docs don\'t mention this.',
  ],
  relationships_dating: [
    'And I didn\'t see it until someone said this.',
    'That silence? It was the answer.',
    'The pattern was always there.',
    'One conversation changed how I saw it.',
  ],
  business_entrepreneur: [
    'Then the revenue report came in.',
    'The pivot happened in a single meeting.',
    'Their competitors missed this entirely.',
    'One line in the P&L told the whole story.',
  ],
  food_cooking: [
    'And the second it hits the oil — everything changes.',
    'This is the step everyone skips.',
    'The restaurant version uses one more ingredient.',
    'Taste it now. Then taste it after.',
  ],
  travel_adventure: [
    'Then the local pointed down a side street.',
    'The guidebook doesn\'t mention this part.',
    'We almost turned back.',
    'By sunset, we understood why they come here.',
  ],
  psychology_mindblown: [
    'Your brain is doing this right now.',
    'The study tested it on 2,000 people. Same result every time.',
    'You\'ve felt this. You just didn\'t have the word for it.',
    'And once you see the pattern, you can\'t stop noticing.',
  ],
  space_cosmos: [
    'Now zoom out.',
    'That dot? That\'s us.',
    'The light we\'re seeing left before humans existed.',
    'And this is still the small version.',
  ],
  animals_wildlife: [
    'And it gets stranger the closer you look.',
    'Scientists didn\'t believe the footage at first.',
    'No other species does this. None.',
    'It survived by breaking every rule of biology.',
  ],
  sports_athletes: [
    'The clock showed four seconds.',
    'Nobody on the bench was standing.',
    'The coach had already called it.',
    'Then the replay showed what actually happened.',
  ],
  education_learning: [
    'Your textbook got this wrong.',
    'The actual mechanism is simpler than you think.',
    'And once you see it this way, everything clicks.',
    'The diagram should look like this instead.',
  ],
  paranormal_ufo: [
    'The radar data was never released.',
    'Then the second pilot confirmed it.',
    'The file was 400 pages. 380 were redacted.',
    'Nobody could explain the third frame.',
  ],
  diy_crafts: [
    'This is the step that makes it look professional.',
    'The $2 version holds up just as well.',
    'Most people quit here. Don\'t.',
    'And when you flip it over — that\'s when you see it.',
  ],
  parenting: [
    'And the tantrum just... stopped.',
    'I said one thing differently.',
    'The pediatrician paused before answering.',
    'No parenting book prepared me for this part.',
  ],
  crypto: [
    'The wallet moved at 3 AM.',
    'On-chain data doesn\'t lie.',
    'Then the exchange outflows spiked.',
    'This pattern has appeared exactly three times before.',
  ],
};

export const REFRAME_CONNECTORS = [
  // ── Direct reveal ──
  'The real reason—',
  'Here\'s what actually happened.',
  'The answer is simpler than you think.',

  // ── Flip / inversion ──
  'Actually, it\'s the exact opposite.',
  'Everything you just heard? Flip it.',
  'The question was wrong the whole time.',

  // ── Consequence / "So what?" ──
  'And that\'s why—',
  'Which means—',
  'And now you know.',
  'That one detail changes the whole story.',

  // ── Confirmation / validation ──
  'The evidence confirmed it.',
  'The numbers don\'t lie.',
  'It was right there the whole time.',
  'They finally admitted it.',
];

export const BANNED_PHRASES = [
  // ── YouTube creator clichés ──
  'In this video I\'m going to...',
  'Before we get started...',
  'Make sure to like and subscribe',
  'Hey guys, welcome back',
  'Let me explain...',
  'So basically...',
  'Without further ado...',

  // ── Templated connectors (overused — create original ones instead) ──
  'But here\'s where it gets interesting...',
  'And that\'s not even the weird part.',
  'And that\'s not even the strangest part.',
  'Now pay attention to this part—',
  'What nobody expected was...',
  'Turns out...',

  // ── Wikipedia / blog voice ──
  'It remains one of...',
  'It is widely considered...',
  'It should be noted that...',
  'As we can see...',
  'In conclusion...',
  'As previously mentioned...',
  'It is important to understand...',
  'One of the most...',

  // ── CTA / fourth-wall breaks (NEVER in kicker) ──
  'Comment below',
  'Save this clip',
  'Pause here',
  'Replay the start',
  'Share this with',
  'Follow for more',
  'Stay tuned for part 2',

  // ── Filler / dead air ──
  'So, um...',
  'You know what I mean?',
  'Right?',
  'At the end of the day...',
  'The thing is...',
  'To be honest...',
  'Honestly...',
  'If you think about it...',

  // ── Jargon without translation ──
  'Spending power',
  'Nominal raises',
  'One-of-a-kind specimen',
];

// ─── VISUAL TRANSITIONS ─────────────────────────────────────────────────────

export const VISUAL_TRANSITIONS = [
  { id: 'hard_cut', name: 'Hard Cut', when: 'Beat escalations, shock reveals, pace changes', desc: 'Instant switch. No effect. Most powerful when unexpected.' },
  { id: 'whip_pan', name: 'Whip Pan', when: 'Between related points, energy maintenance', desc: 'Simulated fast camera pan with blur. 0.2-0.3s.' },
  { id: 'zoom_through', name: 'Zoom Through', when: 'Entering a deeper level of detail', desc: 'Push into a detail of current image, emerge in next scene.' },
  { id: 'match_cut', name: 'Match Cut', when: 'Connecting two ideas visually', desc: 'End frame matches shape/position/color of first frame of next clip.' },
  { id: 'fade_to_black', name: 'Fade to Black', when: 'Before major reveals, tonal shifts', desc: '0.3-0.5s fade. Creates a "chapter break" feeling. Use sparingly.' },
  { id: 'glitch_flash', name: 'Glitch/Flash', when: 'Tech, mystery, horror niches', desc: 'Brief digital glitch (2-3 frames) between clips. Creates unease or energy.' },
  { id: 'scale_shift', name: 'Scale Shift', when: 'Space, science, comparison content', desc: 'Zoom from macro to micro or vice versa in continuous motion.' },
  { id: 'cross_dissolve', name: 'Cross Dissolve', when: 'Emotional content, passage of time', desc: '0.5s blend between clips. ONLY for mood pieces — too slow for fast niches.' },
];

// ─── AUDIO TRANSITIONS ──────────────────────────────────────────────────────

export const AUDIO_TRANSITIONS = [
  { id: 'music_dropout', name: 'Music Dropout', when: 'Before major reveals (Beat 4→5)', desc: 'All music cuts to silence for 0.5-1s. Voiceover continues.' },
  { id: 'riser', name: 'Riser', when: 'Building to climax (Beat 3→4)', desc: 'Ascending pitch sweep (synth or white noise). 1-2s.' },
  { id: 'bass_drop', name: 'Bass Drop', when: 'At reveal moment (Beat 5)', desc: 'Low-frequency impact hit that coincides with the visual payoff.' },
  { id: 'texture_change', name: 'Texture Change', when: 'Between sections (Beat 2→3)', desc: 'Music shifts instrument or rhythm. Same key/tempo but different energy.' },
  { id: 'sfx_bridge', name: 'SFX Bridge', when: 'Between quick points (within Beats 3-4)', desc: 'A whoosh or impact connects the end of one point to the start of the next.' },
];

// ─── SFX BY MOOD ────────────────────────────────────────────────────────────

export const SFX_BY_MOOD = {
  dark_serious: ['Deep bass hits', 'low drones', 'metallic scrapes', 'heartbeat', 'reversed reverb'],
  upbeat_energetic: ['Whooshes', 'bright hits', 'electronic risers', 'snap/clap accents', 'UI sounds'],
  mysterious: ['Whispered textures', 'eerie tones', 'clock ticks', 'distant thunder', 'wind'],
  inspirational: ['Warm swells', 'gentle risers', 'soft piano hits', 'breath sounds', 'shimmering'],
  comedy_fun: ['Cartoon pops', 'record scratches', 'boing sounds', 'vinyl stops'],
  epic_grand: ['Orchestra hits', 'cinematic booms', 'trailer brass', 'massive sub drops'],
  tech_modern: ['Glitch sounds', 'data streams', 'notification pings', 'keyboard clicks', 'digital whooshes'],
};

// ─── NICHE BLUEPRINTS ───────────────────────────────────────────────────────

export const NICHE_BLUEPRINTS = {

  // ── AI / TECH NEWS ──────────────────────────────────────────────────────
  ai_tech_news: {
    name: 'AI / Tech News',
    archetype: 'Educational with urgency overlay',
    tone: 'Informed insider sharing breaking intel. Not robotic. Think excited tech journalist, not Wikipedia.',
    duration_sweet_spot: [60, 65],
    hook_formulas: [
      'OpenAI just quietly released something that changes everything.',
      '[Company] built an AI that can [seemingly impossible thing].',
      'This AI tool does in 3 seconds what takes you 4 hours.',
      'Everyone\'s talking about [X]. Nobody\'s talking about what it actually means.',
      'In 6 months, [current common task] won\'t exist anymore. Here\'s why.',
    ],
    visual_style: 'Clean futuristic, dark backgrounds with neon accent lighting (blue/cyan/purple), holographic UI elements, circuit board patterns, glowing data visualizations, shallow depth of field on tech objects, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC AI capability or product the voiceover describes — if it says "does in 3 seconds what takes 4 hours" show a split-screen of BOTH timeframes. If it says "quietly released" show the product interface. The claim IS the image.',
      context: 'Show the SCALE or SIGNIFICANCE — the data behind the tool, the company that built it, the number of users affected. Ground the hype in something concrete and visual.',
      escalation: 'Show each capability or comparison AS DESCRIBED — the before/after of using the tool, the benchmark results, the specific use case in action. If the script says "writes code in seconds" show code appearing on screen rapidly.',
      climax: 'Show the IMPLICATION — not "cool tech" but what it MEANS for the viewer. The job that changes, the workflow that disappears, the capability that\'s now accessible. Make the viewer see their own future in the image.',
      kicker: 'Show the BIGGER PICTURE — the industry shifting, the timeline compressing, or the human standing at the edge of what\'s changing. Specific, not abstract.',
    },
    music: { style: 'Dark electronic, ambient synth pads, subtle pulsing bass', bpm: '90-110', energy: 'Builds steadily from minimal to moderate. Brief silence before the main reveal.' },
    sfx_palette: ['Digital glitches', 'data processing sounds', 'notification pings', 'servo whirs', 'electronic risers', 'UI click sounds'],
    pacing: 'Moderate to fast. No lingering. Information-dense delivery. Cuts every 2-3 seconds during escalation.',
    failure_modes: [
      'Sounding like a press release ("Company X announced today...")',
      'Explaining what AI is before getting to the news',
      'No stakes — "this is cool" vs "this changes YOUR life because..."',
      'Jargon without translation — say what it DOES, not what it\'s called',
    ],
  },

  // ── FINANCE & MONEY ─────────────────────────────────────────────────────
  finance_money: {
    name: 'Finance / Money',
    archetype: 'Motivation/Education hybrid — the money truth nobody tells you',
    tone: 'Straight-talking financial friend. Not a guru. Not a scammer. Cuts through BS.',
    duration_sweet_spot: [60, 70],
    hook_formulas: [
      'You\'re losing $X every month and you don\'t even know it.',
      'The richest people don\'t save money. They do this instead.',
      'I made $[amount] from a [timeframe] experiment. Here\'s exactly how.',
      'Your bank is making money off you right now. Here\'s the math.',
      'Everyone says [common financial advice]. It\'s actually costing you money.',
    ],
    visual_style: 'Sleek and authoritative, dark charcoal backgrounds, gold/green accent colors, clean data visualizations, stock tickers, cash/currency close-ups with dramatic lighting, luxury minimal aesthetic, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC financial object the voiceover mentions — the paycheck, the price tag, the bank statement, the number. Make it dramatic through lighting, but the subject must be WHAT THE SCRIPT IS ABOUT.',
      context: 'Show the SPECIFIC comparison or scenario described — the actual gap between two numbers, the inflation vs raise chart, the wallet getting thinner. Visualize the MATH, not just "a moody office."',
      escalation: 'Show each financial concept AS A CONCRETE IMAGE — if the script says "groceries cost more" show grocery prices. If it says "rent goes up" show a rent notice. Every abstract money concept needs a PHYSICAL anchor the viewer can feel.',
      climax: 'Show the SOLUTION or REVELATION being described — the strategy visualized, the correct approach demonstrated, the before/after result of acting on the advice.',
      kicker: 'Show the viewer in a position of CONTROL — not a generic silhouette walking, but a specific image of the action they should take (negotiating, checking numbers, making a call).',
    },
    music: { style: 'Confident, minimal trap beats or smooth lo-fi with subtle bass', bpm: '85-100', energy: 'Builds to confident energy at climax.' },
    sfx_palette: ['Cash register cha-ching', 'coin drops', 'calculator clicks', 'stock ticker sounds', 'subtle wooshes', 'impact hits for big numbers'],
    pacing: 'Measured but relentless. Each number/fact lands with weight. Brief pauses after shocking figures.',
    failure_modes: [
      'Vague advice ("invest in yourself" — means nothing)',
      'Promising unrealistic returns without framing',
      'Starting with "In today\'s economy..." (snooze)',
      'No specific numbers — finance content LIVES on concrete figures',
    ],
  },

  // ── MOTIVATION ──────────────────────────────────────────────────────────
  motivation_self_help: {
    name: 'Motivation',
    archetype: 'Identity challenge → reframe → action',
    tone: 'Battle-tested friend sharing hard-won wisdom. Raw, not polished. Earned authority, not preached authority.',
    duration_sweet_spot: [55, 65],
    hook_formulas: [
      'You\'re not lazy. You\'re building someone else\'s dream.',
      'Stop setting goals. Do this instead.',
      'The most successful people I know all share one trait — and it\'s not discipline.',
      'You\'ve been lied to about hard work. Here\'s what actually matters.',
      '3 years ago I was [bad situation]. Here\'s the one thing that changed.',
    ],
    visual_style: 'Gritty cinematic, high contrast, desaturated with selective warm highlights (amber/gold), dramatic shadows, silhouettes against sunrise/sunset, urban environments, raw textures (concrete, rain, sweat), 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC scenario the voiceover describes — if it says "building someone else\'s dream" show a person working on something that isn\'t theirs. If it says "you hit snooze" show a hand hitting snooze. The visual IS the relatable moment.',
      context: 'Show the SPECIFIC pain point being agitated — the alarm clock, the commute, the guilt, the failed attempt. Make the viewer SEE their own life in the image.',
      escalation: 'Show the REFRAME happening visually — the old way vs the new way, the environment being changed, the specific action being taken. If the script says "deleted every app" show apps being deleted.',
      climax: 'Show the TRANSFORMATION result — not a generic summit/sunrise, but the specific outcome described. If it says "your environment makes the choice easy" show an environment that\'s been engineered for success.',
      kicker: 'Show the IDENTITY the viewer becomes — but through a SPECIFIC action, not a silhouette against a sunset. A person doing the thing the script just taught them.',
    },
    music: { style: 'Emotional piano building to orchestral swell, OR dark trap building to epic drop', bpm: '70-90 (emotional) or 130-140 (intense)', energy: 'Dramatic silence before the reframe moment.' },
    sfx_palette: ['Heartbeat', 'deep breaths', 'impact booms', 'rising orchestral hits', 'wind/atmospheric', 'clock ticking'],
    pacing: 'Starts measured and deliberate. Builds through escalation. Climax hits hard. Kicker slows down — the final line needs SPACE.',
    failure_modes: [
      'Generic platitudes ("believe in yourself," "just keep going")',
      'All pain, no reframe (leaves viewer feeling bad with no path forward)',
      'Guru tone — talking DOWN to the viewer instead of alongside them',
      'No specificity — "work harder" vs "I deleted every app off my phone for 30 days"',
    ],
  },

  // ── SCARY / HORROR ──────────────────────────────────────────────────────
  scary_horror: {
    name: 'Scary / Horror',
    archetype: 'Story/Narrative with dread escalation',
    tone: 'Campfire storyteller. Controlled, deliberate. The RESTRAINT is what makes it scary. Whispered intensity > shouting.',
    duration_sweet_spot: [65, 75],
    hook_formulas: [
      'In 2019, a hiker found a camera in the woods. The last photo was taken after the owner died.',
      'This house has been on the market for 6 years. Every buyer cancels within a week.',
      'At 3:47 AM, every Ring doorbell on this street recorded the same thing.',
      'She called 911 from inside her own house. But she lived alone.',
      'The audio was never meant to be released. Listen to what it captured.',
    ],
    visual_style: 'Dark horror aesthetic, deep blacks and muted cold blues/greens, film grain, fog/mist, abandoned environments, shadows with barely visible shapes, low-angle shots, flickering light, VHS/analog distortion effects, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC unsettling object or scene the voiceover describes — the phone, the door, the photo, the footage. Not generic darkness. The object that starts the story, made terrifying through composition and lighting.',
      context: 'Show the SPECIFIC location mentioned — the actual house, church, town, forest. Ground the horror in a real place the viewer can picture standing in.',
      escalation: 'Show each piece of escalating evidence AS IT IS DESCRIBED — if the voiceover says "bones arranged in patterns" show BONES IN PATTERNS. If it says "scratches on the wall" show SCRATCHES ON THE WALL. Each visual should be MORE disturbing than the last. The thing that shouldn\'t be there must be VISIBLE — a shape in the fog, a figure in the doorway, an object moved from where it was.',
      climax: 'Show the REVEAL the voiceover delivers — the document with the word on it, the figure finally seen clearly, the evidence that confirms the horror. This is the image that makes the viewer\'s stomach drop.',
      kicker: 'Return to a location from earlier — but something has CHANGED. A light is off. A new shadow. A door that was closed is open. The difference should be subtle but noticeable on rewatch.',
    },
    music: { style: 'Dark ambient, low drones, dissonant strings, detuned piano. NO steady beat — rhythmic ambiguity creates unease.', bpm: 'None/freeform', energy: 'Music should feel like it\'s breathing.' },
    sfx_palette: ['Creaking doors', 'distant footsteps', 'whispered voices (barely audible)', 'static/white noise', 'sudden silence', 'bass rumble', 'reversed audio', 'heartbeat accelerating', 'branch snaps'],
    pacing: 'SLOWER than other niches. Let silence work. Pauses are weapons. Build SLOWLY through escalation. The climax can be a sudden acceleration.',
    failure_modes: [
      'Over-explaining — horror lives in ambiguity and implication',
      'Jump-scare approach in the script (works in video, not in narration)',
      'Giving away the scary thing too early — delay, delay, delay',
      'Narrating emotions instead of details ("It was terrifying" vs describing the terrifying detail)',
    ],
  },

  // ── HISTORY ─────────────────────────────────────────────────────────────
  history_did_you_know: {
    name: 'History',
    archetype: 'Story/Narrative with myth-busting element',
    tone: 'The cool history professor who makes you lean forward. Irreverent but informed. Finds the HUMAN story in the big event.',
    duration_sweet_spot: [65, 75],
    hook_formulas: [
      'In 1943, a woman walked into a top-secret facility and nobody stopped her.',
      'The [famous event] didn\'t happen the way you think.',
      'This one decision in [year] accidentally changed the entire modern world.',
      'Historians still argue about what happened in this room on [date].',
      '[Famous person] had a secret that wasn\'t discovered until [year].',
    ],
    visual_style: 'Cinematic historical, warm sepia/amber tones for period imagery transitioning to cooler modern tones for context, painterly textures, dramatic chiaroscuro lighting, aged paper/map overlays, architectural grandeur, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC dramatic moment the voiceover describes — the person walking into the facility, the document being hidden, the decision being made. Not "a generic old building." The MOMENT that starts the story.',
      context: 'Show the SPECIFIC era, location, and people involved — if it says "a 26-year-old diplomat" show a young person in period-appropriate clothing at a negotiation table. Ground the history in HUMAN detail.',
      escalation: 'Show each piece of evidence or each escalating event AS DESCRIBED — the letter, the map route, the weapon, the secret meeting. If the voiceover says "they searched for years" show the SEARCH — flyers, posters, worn-out maps.',
      climax: 'Show the CONSEQUENCE or REVELATION — the aftermath of the event, the modern-day impact, the document that proves the thesis. The visual should make the viewer feel the WEIGHT of what happened.',
      kicker: 'Show the LEGACY that connects to today — the building that still stands, the tradition that persists, the impact visible in the modern world. Bridge past to present visually.',
    },
    music: { style: 'Orchestral/cinematic. Strings and piano for emotional beats. Military drums for war content.', bpm: '80-100', energy: 'Builds from atmospheric to sweeping.' },
    sfx_palette: ['Page turning', 'quill on paper', 'cannon fire (distant)', 'crowd murmurs', 'horse hooves', 'clock chimes', 'door creaking open', 'fire crackling'],
    pacing: 'Measured start, then accelerates through the middle. The climax gets breathing room. Historical content can sustain slightly longer beats because the STORY carries attention.',
    failure_modes: [
      'Starting with the year/date ("In 1776..." — that\'s a textbook, not a story)',
      'Linear chronological telling instead of starting at the most dramatic moment',
      'No human anchor — "The treaty was signed" vs "A 26-year-old diplomat bluffed his way into..."',
      'Treating history as settled fact without finding the tension/mystery/debate',
    ],
  },

  // ── TRUE CRIME ──────────────────────────────────────────────────────────
  true_crime: {
    name: 'True Crime',
    archetype: 'Story/Narrative with investigative tension',
    tone: 'Investigative journalist sharing findings. Not sensational. Not glorifying. Respectful but gripping. The PUZZLE is the draw.',
    duration_sweet_spot: [65, 75],
    hook_formulas: [
      'The detective noticed one detail everyone else missed.',
      'She disappeared on camera. Then the footage was erased.',
      'The case was closed for 20 years. Then a DNA match reopened everything.',
      'Everyone in the town knew who did it. But nobody could prove it.',
      'The 911 call lasted 47 seconds. In those seconds, three things didn\'t add up.',
    ],
    visual_style: 'Noir detective aesthetic, high contrast black and white with selective red or amber accents, crime board with string connections, evidence photography style, rain-slicked streets, shadowy interiors, document close-ups, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC piece of evidence or moment the voiceover describes — the camera footage, the detail the detective noticed, the 911 call visualized. Not "noir atmosphere." The EVIDENCE.',
      context: 'Show the SPECIFIC location — the actual house, street, or town described. The viewer needs to SEE where this happened.',
      escalation: 'Show each piece of evidence IN SEQUENCE as the voiceover describes it — the document, the photo, the map with the route, the timeline with gaps. If the script says "the timeline didn\'t match" show a timeline with a visible discrepancy.',
      climax: 'Show the BREAKTHROUGH or the UNANSWERABLE QUESTION — the piece of evidence that changes everything, or the gap that can never be filled. This is the image that makes the viewer lean forward.',
      kicker: 'Show the aftermath — the location TODAY, empty and unchanged. Or the case file, still open. The visual silence of an unsolved crime.',
    },
    music: { style: 'Dark, minimal, tension-building. Low strings, sparse piano, ticking percussion.', bpm: '70-85', energy: 'Music should make you feel uneasy without being obvious.' },
    sfx_palette: ['Police radio chatter (low)', 'camera shutter clicks', 'door opening', 'footsteps on gravel', 'pen on paper', 'phone ringing', 'evidence bag rustling', 'gavel'],
    pacing: 'Deliberate and controlled. Let facts land. Brief pauses after shocking revelations.',
    failure_modes: [
      'Sensationalizing violence or glorifying criminals',
      'Revealing the answer in the hook (the mystery IS the retention)',
      'Too many characters introduced too fast — simplify',
      'Narrating like a true crime podcast (overly dramatic voice descriptions)',
    ],
  },

  // ── SCIENCE & NATURE ────────────────────────────────────────────────────
  science_nature: {
    name: 'Science & Nature',
    archetype: 'Educational with wonder/awe driver',
    tone: 'Fascinated scientist sharing a discovery. Childlike wonder meets adult intelligence. "Isn\'t this INCREDIBLE?"',
    duration_sweet_spot: [60, 70],
    hook_formulas: [
      'There\'s a creature at the bottom of the ocean that\'s technically immortal.',
      'Your body does this 20,000 times a day and you\'ve never noticed.',
      'Scientists just found something that breaks a 100-year-old theory.',
      'This happens every 6 seconds on Earth and nobody talks about it.',
      'The most dangerous thing in your kitchen isn\'t what you think.',
    ],
    visual_style: 'Nature documentary meets sci-fi, rich saturated colors, macro photography aesthetics, bioluminescence, microscopic textures scaled up, dramatic natural lighting (golden hour, storm light, underwater caustics), 9:16 portrait',
    visual_guidance: {
      hook: 'Show the ACTUAL phenomenon the voiceover describes — the creature, the cell, the reaction, the cosmic object. If the script says "a creature that\'s technically immortal" show THAT creature. Not a generic "deep ocean" shot.',
      context: 'Show WHERE this phenomenon happens or HOW it connects to the viewer — the human body, the kitchen, the backyard, the ocean floor. Ground the wonder in something relatable.',
      escalation: 'Show increasingly detailed views of the MECHANISM being explained — zoom into the cell, show the chemical reaction step by step, reveal the anatomy. Each visual should teach something the previous one didn\'t.',
      climax: 'Show the MOST mind-bending aspect of the phenomenon — the scale comparison, the before/after, the thing that makes you say "that can\'t be real." This is the visual WOW moment.',
      kicker: 'Pull back to show the viewer\'s connection to this phenomenon — "this is happening inside you right now" or "this is visible from your backyard." Make the wonder personal.',
    },
    music: { style: 'Wonder/ambient. Synth pads, gentle piano, ethereal textures.', bpm: '90-110', energy: 'Swells at moments of awe.' },
    sfx_palette: ['Water drops', 'bubbling', 'wind', 'heartbeat', 'electronic scanning sounds', 'microscope focusing', 'nature ambience', '"discovery" chime'],
    pacing: 'Moderate with strategic slowdowns for awe moments. Let the VISUAL carry attention during the most stunning beats.',
    failure_modes: [
      'Textbook tone ("The mitochondria is the powerhouse of the cell")',
      'Explaining mechanism before establishing wonder — lead with the WOW, then explain HOW',
      'No personal relevance — "this star is 40 light years away" vs "this star is so close that if you could drive there..."',
      'Overloading with technical terms without translating them into human impact',
    ],
  },

  // ── RELATIONSHIPS ───────────────────────────────────────────────────────
  relationships_dating: {
    name: 'Relationships',
    archetype: 'Motivation/Comedy hybrid — identity-based insight',
    tone: 'Your wisest, most emotionally honest friend. Not a therapist. Not judgmental. Just... perceptive.',
    duration_sweet_spot: [55, 65],
    hook_formulas: [
      'The person who texts back fast isn\'t more interested. They\'re more anxious.',
      'If they wanted to, they would. And here\'s what that actually means.',
      'The strongest relationships have one thing in common — and it\'s not love.',
      'Stop saying "I\'m fine" when you\'re not. Here\'s what to say instead.',
      'You\'re not asking for too much. You\'re asking the wrong person.',
    ],
    visual_style: 'Warm and intimate, soft golden hour lighting, close-up textures (hands touching, coffee cups, phone screens with messages), shallow depth of field, muted warm palette (dusty rose, warm cream, soft amber), candid photography style, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC relationship moment the voiceover describes — the phone face-down, the text left on read, the empty seat at dinner. Not "warm golden light." The MOMENT that every viewer has lived.',
      context: 'Show the RELATABLE SCENARIO described — the argument position, the silence at the table, the distance in a shared bed. The viewer must SEE their own relationship in the image.',
      escalation: 'Show the PATTERN being described — the contrast between healthy and unhealthy, the specific behavior being called out, the moment of recognition. If the script says "the person who texts fast is anxious" show anxious texting.',
      climax: 'Show the BREAKTHROUGH — the moment of understanding, the conversation happening honestly, the shift in dynamic. This should feel like the visual equivalent of a deep breath.',
      kicker: 'Show RESOLUTION or SELF-POSSESSION — not generic warmth, but the specific emotional state the script lands on. A person at peace with what they just learned.',
    },
    music: { style: 'Lo-fi, indie acoustic, soft piano. Emotional but not melodramatic.', bpm: '75-90', energy: 'Gentle swell at the reframe moment.' },
    sfx_palette: ['Soft phone buzz', 'text message sounds', 'door closing gently', 'heartbeat', 'deep breath', 'ambient room tone', 'rain'],
    pacing: 'Intimate. Slightly slower than other niches. Pauses carry emotional weight. The reframe moment needs 1-2 seconds of near-silence.',
    failure_modes: [
      'Gendered stereotypes or toxic advice dressed as "real talk"',
      'All agitation, no resolution (making people feel bad without offering insight)',
      'Therapy-speak without making it HUMAN',
      'Preachy/superior tone — "You need to learn that..." vs "I didn\'t understand this until..."',
    ],
  },

  // ── HEALTH & FITNESS ────────────────────────────────────────────────────
  health_fitness: {
    name: 'Health & Fitness',
    archetype: 'Tutorial/Education with myth-busting urgency',
    tone: 'Knowledgeable training partner. Evidence-based but approachable. Cuts through broscience.',
    duration_sweet_spot: [55, 65],
    hook_formulas: [
      'This exercise is destroying your shoulders and you don\'t even feel it yet.',
      'Trainers won\'t tell you this because it sounds too simple.',
      'You don\'t need to eat less. You need to eat [differently].',
      'The #1 exercise for [goal] isn\'t what Instagram tells you.',
      'I stopped [common practice] for 30 days. My body did something unexpected.',
    ],
    visual_style: 'High-energy athletic, dynamic lighting (gym environments, outdoor training), high contrast, action freeze-frames, anatomical overlays on body movements, clean modern typography, bold accent colors (electric blue, neon green, red), 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC exercise or body part the voiceover mentions — if it says "destroying your shoulders" show a shoulder under strain. If it says "5 minutes before breakfast" show a pre-dawn workout. The subject IS the claim.',
      context: 'Show the MYTH being busted — the "wrong" way visualized. If the script says "you\'ve been told to eat before training" show someone eating before training. Make the viewer SEE the thing they\'re about to learn is wrong.',
      escalation: 'Show each piece of evidence or each step AS IT IS DESCRIBED — the sprint interval, the timer at 20 seconds, the body mechanism in action. If the script says "insulin is low" show a visual representation of that metabolic state. Every claim needs a visual.',
      climax: 'Show the RESULT or PROOF — the study finding visualized, the transformation, the data that confirms the claim. This should be the most satisfying visual — the payoff for watching.',
      kicker: 'Show the viewer DOING the thing — not an abstract motivation shot. A person mid-stride at dawn, a timer starting, shoes being laced. Specific action, not generic inspiration.',
    },
    music: { style: 'High-energy electronic, workout beats, motivational trap.', bpm: '120-140', energy: 'Drops at key demonstration moments.' },
    sfx_palette: ['Weight plate clangs', 'timer beeps', 'rope whoosh', 'breathing heavy', 'heartbeat', 'gym ambience', 'sneaker squeaks'],
    pacing: 'Fast and punchy. Mirror the energy of a workout. Short sentences. Staccato delivery during demo sections.',
    failure_modes: [
      'Medical claims without evidence framing',
      'Body-shaming hooks',
      'Too much "science" without actionable advice',
      'Showing the exercise without explaining WHY it works',
    ],
  },

  // ── GAMING & POP CULTURE ────────────────────────────────────────────────
  gaming_popculture: {
    name: 'Gaming & Pop Culture',
    archetype: 'Listicle/Story hybrid — insider knowledge',
    tone: 'Hyped-up gaming friend who just discovered something wild. Authentic enthusiasm, not performative.',
    duration_sweet_spot: [55, 65],
    hook_formulas: [
      '[Game] has a secret room that developers tried to hide.',
      'The lore behind [character] is way darker than you think.',
      '[Studio] just leaked something they immediately tried to delete.',
      'Only 0.1% of players have ever found this.',
      'The true ending of [game] requires doing something no one would think to try.',
    ],
    visual_style: 'Gaming aesthetic, vibrant saturated colors, neon glows on dark backgrounds, pixel art elements mixed with cinematic game visuals, HUD/UI overlay elements, screen-capture style compositions, glitch effects, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC game element the voiceover describes — the hidden room, the glitched biome, the secret character. Not "generic gaming aesthetic." The actual in-game thing that starts the story.',
      context: 'Show the GAME WORLD this takes place in — the specific environment, the area where the secret is found. The viewer needs to recognize the game.',
      escalation: 'Show each discovery AS IT IS DESCRIBED — the code anomaly, the community screenshots, the lore text, the developer comment. If the script says "the waterfalls behaved like water AND lava" show waterfalls with impossible physics.',
      climax: 'Show the REVEAL — the confirmed secret, the developer\'s admission, the final piece of proof. This should be the image that makes a gamer say "no way."',
      kicker: 'Return to normal gameplay — but now the viewer KNOWS what\'s hidden. Show the game world with the secret subtly visible to those who know where to look.',
    },
    music: { style: 'Chiptune/synth hybrid, electronic, game-OST-inspired.', bpm: '110-130', energy: 'Energy matches the genre of the game discussed.' },
    sfx_palette: ['Achievement unlock sounds', 'menu select clicks', 'power-up chimes', '8-bit sounds', 'level-up jingles', 'dramatic game-over stings', 'controller click'],
    pacing: 'Fast. Gaming audiences have the shortest attention spans. Cut every 1.5-2 seconds during escalation. Energy stays high throughout.',
    failure_modes: [
      'Explaining what the game IS to people who already play it',
      'Clickbait that doesn\'t pay off',
      'Spending too long on setup before getting to the secret/reveal',
      'Condescending tone — "most people don\'t know this" feels gatekeepy',
    ],
  },

  // ── CONSPIRACY & MYSTERY ────────────────────────────────────────────────
  conspiracy_mystery: {
    name: 'Conspiracy & Mystery',
    archetype: 'Story/Narrative with investigative tension — focused on unsolved/unexplained',
    tone: 'Measured skeptic who\'s genuinely unsettled. Not tinfoil hat. Not dismissive. "I don\'t know what to make of this, but look at these facts."',
    duration_sweet_spot: [65, 75],
    hook_formulas: [
      'This document was classified for 47 years. When they released it, one page was still redacted.',
      'In [year], [number] people reported seeing the exact same thing. None of them knew each other.',
      'There\'s a building in [location] with no address, no mailbox, and no record of who owns it.',
      'The official explanation has three problems. Nobody can explain the third one.',
      'This photo was taken by accident. Look at the background.',
    ],
    visual_style: 'Investigative noir, desaturated with selective color highlights, redacted document aesthetics, surveillance camera angles, pin-board with string connections, fog/grain, clandestine meeting atmospheres, dimly lit archives, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC anomaly the voiceover describes — the redacted document with the missing page, the photo with the unexplained background, the building with no address. Not "generic noir." The EVIDENCE that starts the investigation.',
      context: 'Show the OFFICIAL VERSION — the clean institutional record, the government statement, the accepted explanation. This is the baseline the script is about to crack.',
      escalation: 'Show each CRACK in the official story AS DESCRIBED — the contradicting dates, the impossible overlap on the map, the anomaly highlighted in the footage. If the script says "three witnesses, same story" show three separate witness statements with matching details.',
      climax: 'Show the UNANSWERABLE element — the thing that cannot be explained away. The image should leave the viewer with a genuine question, not a conspiracy cliché.',
      kicker: 'ZOOM OUT to show how big the question really is — but through a SPECIFIC image (the stack of remaining classified files, the map of other incidents) not abstract darkness.',
    },
    music: { style: 'Dark ambient, tension drones, scattered percussive elements, analog synth.', bpm: 'freeform/atmospheric', energy: 'Builds unease without resolution.' },
    sfx_palette: ['Static/radio interference', 'typewriter clicks', 'filing cabinet opening', 'camera shutter', 'redaction marker sound', 'distant phone ring', 'paper shuffling'],
    pacing: 'Deliberately measured. Each "clue" needs a moment to land. Tension comes from ACCUMULATION, not speed.',
    failure_modes: [
      'Presenting conspiracy theories as confirmed fact',
      'Relying on "they don\'t want you to know" — sounds like spam',
      'Not presenting the conventional explanation before the anomalies',
      'Ending with certainty — the power of this niche is the QUESTION, not the answer',
    ],
  },

  // ── BUSINESS ────────────────────────────────────────────────────────────
  business_entrepreneur: {
    name: 'Business',
    archetype: 'Educational/Story hybrid — case study or counterintuitive insight',
    tone: 'Sharp business strategist at a dinner party. Real talk, real numbers, real stories. Not LinkedIn cringe.',
    duration_sweet_spot: [60, 70],
    hook_formulas: [
      '[Company] made $[amount] by doing the opposite of what everyone said.',
      'The worst business advice I ever got was "[common advice]."',
      'This startup was worth $0 in January. By December, [result].',
      'Stop trying to find customers. Make them find you. Here\'s how [company] did it.',
      'A single email generated $[amount]. Here\'s what it said.',
    ],
    visual_style: 'Clean corporate-premium, dark charcoal or navy backgrounds, white/gold typography, clean data visualizations, boardroom aesthetics, product close-ups, city skylines at golden hour, minimalist brand-inspired layouts, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC result or claim — the revenue number, the company\'s product, the email that generated money. If the script says "an algorithm predicts startup failure" show an algorithm scoring startups. The claim IS the visual.',
      context: 'Show the STARTING POINT or PROBLEM the voiceover describes — the small office, the empty shop, the failing metric. Ground the story in its beginning.',
      escalation: 'Show each piece of evidence or strategy AS IT IS DESCRIBED — the chart climbing, the specific tactic being used, the data point that proves the claim. When the script says "early traction velocity" show TWO CURVES diverging.',
      climax: 'Show the CORE INSIGHT being revealed — the strategic diagram, the moment of realization, the data that proves the thesis. This should feel like the curtain being pulled back.',
      kicker: 'Show the HUMAN implication — not a generic city skyline, but the specific person/founder/viewer in the position the script describes. If it says "predicting you" show a person reflected in a screen.',
    },
    music: { style: 'Confident, forward-moving. Minimal electronic, corporate-but-cool.', bpm: '95-110', energy: 'Builds authority without being cheesy.' },
    sfx_palette: ['Typing', 'notification dings', 'cash register', 'stock ticker', 'meeting room ambient', 'presentation click', 'graph-drawing sound'],
    pacing: 'Confident and steady. Numbers get emphasis (slight slowdown). Stories move fast. Insights get breathing room.',
    failure_modes: [
      'LinkedIn motivational poster energy ("Hustle. Grind. Repeat.")',
      'Vague principles without examples ("add value" — to WHAT?)',
      'Ignoring survivorship bias',
      'No story — pure advice without narrative is forgettable',
    ],
  },

  // ── FOOD & COOKING ──────────────────────────────────────────────────────
  food_cooking: {
    name: 'Food & Cooking',
    archetype: 'Tutorial with sensory engagement and surprise',
    tone: 'Excited home cook who just discovered something game-changing. Not a chef lecturing — a friend sharing a discovery.',
    duration_sweet_spot: [55, 65],
    hook_formulas: [
      'You\'ve been cooking pasta wrong. An Italian grandmother told me why.',
      'This $2 ingredient makes restaurant food taste expensive.',
      'Stop throwing away [common scraps]. They\'re the best part.',
      'The secret to [dish] has nothing to do with the recipe.',
      'I tested 5 viral food hacks. Only one actually works.',
    ],
    visual_style: 'Food photography aesthetic, warm dramatic lighting (backlit/sidelit), rich saturated colors, steam/sizzle visible, macro close-ups of textures (melting cheese, caramelizing onions, bubbling sauce), clean counter/dark background, overhead and 45-degree angles, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC food claim — if the script says "you\'ve been cooking pasta wrong" show pasta being cooked THE WRONG WAY. If it says "$2 ingredient" show THAT ingredient. The visual IS the promise.',
      context: 'Show the STARTING POINT — the ingredients on the counter, the "before" version of the dish, the common mistake being demonstrated. The viewer needs to see what they\'re about to learn to improve.',
      escalation: 'Show each COOKING STEP as it\'s described — the garlic hitting oil, the technique being demonstrated, the transformation happening. SENSORY details: steam, sizzle, bubbling, melting. If the voiceover says "the second it hits the oil" the visual MUST show the moment of contact.',
      climax: 'The MONEY SHOT — the finished dish in full glory, the cheese pull, the perfect cross-section, the first bite. This should make the viewer hungry. Steam, lighting, texture — all maximized.',
      kicker: 'The COMPARISON — restaurant version vs yours, or the before vs after, or someone\'s genuine reaction to tasting it. Prove the technique worked.',
    },
    music: { style: 'Upbeat acoustic, jazzy lo-fi, or playful kitchen vibes.', bpm: '100-120', energy: 'Bright and warm energy. Swells at the reveal.' },
    sfx_palette: ['Sizzling', 'chopping', 'bubbling', 'oil crackling', 'plate set down', 'fork clinking', 'crunch/bite sound', 'pouring liquid', 'timer ding'],
    pacing: 'Moderate with satisfying rhythm. Cooking steps should feel choreographed, not rushed. The final dish reveal needs a MOMENT.',
    failure_modes: [
      'Listing ingredients without showing WHY (the science/technique is what hooks)',
      'No sensory language ("add the garlic" vs "the SECOND the garlic hits the oil, your whole kitchen changes")',
      'Recipe without a hook — "Here\'s how to make X" vs "You\'ve been making X wrong"',
      'No payoff shot — the final dish needs to look INCREDIBLE',
    ],
  },

  // ── TRAVEL & ADVENTURE ──────────────────────────────────────────────────
  travel_adventure: {
    name: 'Travel & Adventure',
    archetype: 'Story/Listicle hybrid — transportive experience',
    tone: 'Adventurous friend who just got back from somewhere incredible. Makes you feel like you\'re THERE.',
    duration_sweet_spot: [60, 70],
    hook_formulas: [
      'This country costs $30 a day and looks like a movie set.',
      'I found a beach with no tourists, no hotels, and no name on Google Maps.',
      'The most dangerous road in the world is also the most beautiful.',
      'Locals told me not to go here. I went anyway.',
      'There\'s a hidden [restaurant/temple/waterfall] in [city] that most tourists never find.',
    ],
    visual_style: 'Cinematic travel, rich saturated colors, golden hour and blue hour lighting, epic landscape compositions, culture close-ups (food, textiles, architecture details), aerial/drone perspectives, adventure photography style, lens flare, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC place or experience the voiceover describes — if it says "$30 a day country that looks like a movie set" show THAT country\'s most cinematic view with a visual hint of affordability. Not "generic beach sunset."',
      context: 'Show the ARRIVAL — the airport, the first street, the initial impression. Ground the viewer in the journey\'s beginning.',
      escalation: 'Show each SPECIFIC detail as described — the hidden restaurant entrance, the local food close-up, the narrow street, the market stall. Every visual should make the viewer feel like they\'re THERE discovering it alongside the narrator.',
      climax: 'Show the PEAK MOMENT — the vista from the summit, the hidden waterfall revealed, the sunset from the secret spot. This is the image that makes someone book a flight.',
      kicker: 'Show the DEPARTURE or the "one more thing" — the unexpected bonus discovery, or the view from the plane leaving. Create longing.',
    },
    music: { style: 'World music elements + cinematic. Regional instruments matched to location.', bpm: '100-120', energy: 'Starts intimate, builds to epic at the vista reveal.' },
    sfx_palette: ['Airport ambience', 'plane taking off', 'waves', 'market chatter', 'birds', 'wind', 'footsteps on different terrain', 'camera shutter'],
    pacing: 'Flows like a journey. Starts intimate/curious, builds to expansive. The landscape reveal needs a slight slowdown for awe.',
    failure_modes: [
      'Generic "top 10 places" without personality or story',
      'No sensory detail — "it was beautiful" vs "the water was so clear you could see fish 30 feet down"',
      'Focusing only on visuals without narrative tension',
      'Not mentioning practical details that make viewers feel like they COULD do this',
    ],
  },

  // ── PSYCHOLOGY ──────────────────────────────────────────────────────────
  psychology_mindblown: {
    name: 'Psychology',
    archetype: 'Educational with identity/self-recognition hook',
    tone: 'Insightful friend who just read something that blew their mind. Makes complex behavior feel like "oh... THAT\'s why I do that."',
    duration_sweet_spot: [60, 70],
    hook_formulas: [
      'Your brain does something every morning that decides your entire day.',
      'The reason you procrastinate has nothing to do with laziness.',
      'There\'s a name for that feeling when you walk into a room and forget why.',
      'Psychologists discovered a trick that makes anyone trust you instantly.',
      'You\'re not overthinking. Your brain is doing exactly what it was designed to do.',
    ],
    visual_style: 'Cerebral and clean, dark backgrounds with neural network patterns, brain visualizations, abstract thought representations, mirror/reflection imagery, optical illusions, split-screen duality visuals, cool blue-purple palette with warm accents, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC mental phenomenon the voiceover describes — if it says "your brain does something every morning" show a brain/mind visual of THAT morning process. If it says "walk into a room and forget why" show a person frozen in a doorway. The psychological experience IS the image.',
      context: 'Show the RELATABLE SCENARIO — the person at the desk procrastinating, lying awake at 3am, scrolling their phone. The viewer must SEE themselves in the image.',
      escalation: 'Show the MECHANISM being explained — the neural pathway visualized, the behavioral pattern diagrammed, the bias demonstrated through a concrete example. If the script says "your brain fills in the gaps" show a visual demonstration of that gap-filling.',
      climax: 'Show the AHA MOMENT — the diagram that makes everything click, the pattern finally visible, the mechanism laid bare. This should be the visual that makes the viewer say "oh... THAT\'s why I do that."',
      kicker: 'Return to the HUMAN — the same relatable person from context, but now with a knowing look. Or the viewer\'s own hands/phone/environment, reframed by what they just learned.',
    },
    music: { style: 'Thoughtful ambient, minimal piano, gentle electronic.', bpm: '80-100', energy: 'Builds curiosity, never overwhelming. Space between notes matters.' },
    sfx_palette: ['Thought bubble pop', 'neural firing sounds', 'page flip', 'lightbulb ding', 'soft clock tick', 'whispered thoughts', 'ambient room tone'],
    pacing: 'Measured and deliberate. Let insights land. Psychological content rewards PAUSES — give the viewer time to map the insight onto their own experience.',
    failure_modes: [
      'Reducing complex psychology to "one weird trick"',
      'Overusing technical terms without human examples',
      'No self-recognition moment — the viewer needs to think "wait, I DO that"',
      'Presenting behavioral patterns without context for why they exist',
    ],
  },

  // ── SPACE & COSMOS ──────────────────────────────────────────────────────
  space_cosmos: {
    name: 'Space & Cosmos',
    archetype: 'Educational with sublime awe',
    tone: 'Overwhelmed astronomer who just has to share this. The SCALE is the emotion. Make people feel cosmically tiny and amazed.',
    duration_sweet_spot: [65, 75],
    hook_formulas: [
      'There\'s a star so big that if you replaced our sun with it, it would swallow Jupiter.',
      'NASA just photographed something that shouldn\'t exist.',
      'Light from this object left before Earth had life on it.',
      'You could fit 1.3 million Earths inside the Sun. The Sun is a SMALL star.',
      'Somewhere in this image is a galaxy that died 10 billion years ago.',
    ],
    visual_style: 'Cosmic cinematic, ultra-deep blacks with vibrant nebula colors (deep purples, electric blues, hot pinks, stellar golds), particle effects, vast scale compositions showing tiny objects against massive ones, lens flare, star fields, planetary surfaces, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC cosmic object or scale comparison the voiceover describes — if it says "a star that would swallow Jupiter" show THAT star next to Jupiter. Not "generic nebula." The claim IS the image.',
      context: 'Show the FAMILIAR baseline — Earth, the Sun, the Moon, the solar system. The viewer needs a reference point they understand before you shatter their sense of scale.',
      escalation: 'Show the SCALE INCREASING with each beat — each visual must make the previous one look TINY. If the script says "you could fit 1.3 million Earths" show that comparison. The escalation IS the visual progression.',
      climax: 'Show the most INCOMPREHENSIBLE scale or phenomenon — the image that breaks the viewer\'s mental model. This should be the visual that makes someone pause and stare.',
      kicker: 'Return to Earth — but now it looks DIFFERENT. Tiny. Fragile. A pale dot. The shift in perspective IS the emotional payload.',
    },
    music: { style: 'Epic orchestral meets ambient electronic. Swelling strings, deep sub bass, ethereal pads.', bpm: '70-90', energy: 'Music does the MOST work here — it carries the emotion of scale.' },
    sfx_palette: ['Deep space ambience (processed low drones)', 'radio telescope signals', 'countdown sequences', 'rocket ignition', 'cosmic whooshes', 'twinkling/shimmer'],
    pacing: 'Builds from intimate to vast. Each scale comparison gets a MOMENT. Don\'t rush the awe — let the numbers hang in the air.',
    failure_modes: [
      'Just listing big numbers without comparison anchors',
      'NASA press release tone',
      'No emotional through-line — facts without wonder are forgettable',
      'Missing the "so what?" — why does this matter to a person on Earth?',
    ],
  },

  // ── ANIMALS & WILDLIFE ──────────────────────────────────────────────────
  animals_wildlife: {
    name: 'Animals & Wildlife',
    archetype: 'Educational with "nature is wilder than fiction" energy',
    tone: 'David Attenborough meets your most enthusiastic friend. Reverence + disbelief.',
    duration_sweet_spot: [55, 65],
    hook_formulas: [
      'This animal hasn\'t evolved in 450 million years. And it\'s in your backyard.',
      'Octopuses have three hearts. And that\'s the LEAST interesting thing about them.',
      'The deadliest animal on Earth weighs less than a paperclip.',
      'This fish can walk, breathe air, and survive on land for days.',
      'Your dog is lying to you. Here\'s how scientists proved it.',
    ],
    visual_style: 'Nature documentary premium, ultra-sharp wildlife photography, dramatic natural lighting, close-up textures (scales, feathers, eyes), habitat establishing shots, underwater cinematography look, warm savanna tones or cool ocean blues, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC animal doing the SPECIFIC thing the voiceover describes — if it says "this fish walks on land" show a FISH WALKING ON LAND. Not "pretty underwater scene." The bizarre fact IS the image.',
      context: 'Show the HABITAT — where this animal lives, at the scale that makes its survival impressive or its ability remarkable.',
      escalation: 'Show each INCREASINGLY surprising ability or feature AS DESCRIBED — the anatomy close-up, the behavior in action, the hunting technique. Each visual should make the viewer think "wait, it can do THAT too?"',
      climax: 'Show the MOST mind-blowing behavior or fact — the impossible feat, the survival mechanism, the thing no other species can do. This image should make someone say "that can\'t be real."',
      kicker: 'Show the animal in its full beauty in context — or a SCALE comparison to something familiar that makes the viewer re-evaluate what they just learned.',
    },
    music: { style: 'Nature documentary scoring. Warm strings for mammals, mysterious woodwinds for ocean, percussion for predators.', bpm: '80-110', energy: 'Swells match the dramatic moments.' },
    sfx_palette: ['Animal calls/sounds', 'water splashing', 'wind through grass', 'heartbeat during predator moments', 'branch snaps', 'underwater bubbles', 'wing flaps'],
    pacing: 'Varied — mirrors the animal\'s behavior. Predator content: build slowly, then STRIKE. Gentle animal content: flowing, even pace.',
    failure_modes: [
      'Wikipedia recitation',
      'Only cute animals — the WEIRD ones perform best',
      'No escalation — leading with the best fact instead of building to it',
      'Missing the emotional hook — anthropomorphize strategically',
    ],
  },

  // ── SPORTS & ATHLETES ───────────────────────────────────────────────────
  sports_athletes: {
    name: 'Sports & Athletes',
    archetype: 'Story/Narrative with underdog/greatness tension',
    tone: 'Hyped commentator meets storyteller. The STAKES matter. Make the viewer feel the pressure of the moment.',
    duration_sweet_spot: [55, 65],
    hook_formulas: [
      'Down 3 points. 4 seconds left. Everyone knew it was over. Except [player].',
      '[Athlete] was told they\'d never play again. 18 months later, [result].',
      'The greatest play in [sport] history was actually a mistake.',
      'This rookie broke a record that stood for 40 years — in their first game.',
      '[Athlete] almost quit in [year]. Here\'s what changed their mind.',
    ],
    visual_style: 'Sports broadcast premium, high-energy action freeze-frames, stadium lighting (dramatic spotlights, bokeh crowd lights), motion blur for speed, sweat/rain detail close-ups, scoreboard graphics, victorious silhouettes, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC moment the voiceover describes — the scoreboard at 4 seconds left, the player on the ground after injury, the rookie stepping onto the field. Not "generic stadium lights." The MOMENT that defines the story.',
      context: 'Show the BACKSTORY — the empty rehab gym, the training montage, the moment of doubt. If the script says "told they\'d never play again" show the medical context, the brace, the empty locker.',
      escalation: 'Show the COMEBACK BUILDING as described — the crowd noise rising, the clock ticking, the player getting closer. Each visual should increase the PRESSURE. If the script says "down 3 points with 4 seconds" show the actual scoreboard and clock.',
      climax: 'Show THE MOMENT — the catch, the goal, the finish line crossing, the celebration. This should feel like a freeze-frame the viewer wants to live inside. The peak of athletic achievement, captured.',
      kicker: 'Show the LEGACY — the trophy, the stat line, the tears, the embrace. Or the player years later, still carrying the weight of that moment.',
    },
    music: { style: 'Epic sports anthems. Dramatic builds with massive drops. Orchestral + electronic hybrid.', bpm: '120-140 for action, 70-80 for emotional backstory', energy: 'Dramatic silence before massive drops.' },
    sfx_palette: ['Crowd roar (building)', 'whistle', 'buzzer', 'ball bounce/kick', 'sneaker squeak', 'heavy breathing', 'heartbeat', 'slow-motion whoosh'],
    pacing: 'Matches the sport\'s rhythm. FAST during action sequences. SLOW during emotional beats. The climax moment gets a slow-motion treatment.',
    failure_modes: [
      'Reading stats without narrative',
      'No emotional stakes — the comeback means nothing without the setback',
      'Assuming knowledge — not every viewer follows the sport',
      'Anti-climactic ending — the payoff MUST match the buildup',
    ],
  },

  // ── EDUCATION ───────────────────────────────────────────────────────────
  education_learning: {
    name: 'Education',
    archetype: 'Educational with "school never taught you this" framing',
    tone: 'The teacher you wish you\'d had. Makes complex things simple WITHOUT dumbing them down. Respectful of intelligence.',
    duration_sweet_spot: [60, 70],
    hook_formulas: [
      'Your teacher lied to you about [topic]. Here\'s what really happens.',
      'I can teach you [complex skill] in 60 seconds.',
      'There\'s a reason [subject] is so hard — and it\'s not your brain.',
      'The education system skips [topic] entirely. It might be the most important one.',
      'This one concept explains 80% of [subject].',
    ],
    visual_style: 'Clean educational, whiteboard/chalkboard aesthetics with modern twist, infographic style, clean diagrams with animated reveals, warm neutral backgrounds with colorful accent diagrams, textbook illustrations reimagined cinematically, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC "wrong" thing the voiceover claims — the textbook page with the incorrect fact circled, the diagram everyone learned that\'s actually incomplete, the test question that has a flawed premise. The visual IS the challenge to conventional knowledge.',
      context: 'Show what people THINK they know — the conventional diagram, the standard explanation, the textbook version. This is the baseline the script is about to correct.',
      escalation: 'Show the REAL mechanism being built piece by piece — each visual adds a new layer to the correct understanding. If the script says "the diagram should look like THIS instead" show the corrected diagram. Build the visual explanation in steps.',
      climax: 'Show the COMPLETE correct picture — the full diagram, the accurate model, the framework that makes everything click. This should be visually elegant and immediately understandable.',
      kicker: 'Show the APPLICATION — how this knowledge changes what the viewer can now do. Not "a graduation cap" but the specific practical use of what they just learned.',
    },
    music: { style: 'Curious and bright. Plucked strings, marimba, light electronic.', bpm: '100-115', energy: 'Energy of discovery, not lecture.' },
    sfx_palette: ['Chalk on board', 'page flip', 'pencil writing', '"eureka" chime', 'eraser wipe', 'marker squeaks', 'notebook snap shut'],
    pacing: 'Rhythmic and clear. Each concept gets its own beat. Use the "stack" technique — build the diagram piece by piece.',
    failure_modes: [
      'Lecturing tone (the TEACHER voice vs the FRIEND voice)',
      'Too much scope — one concept explained well > three concepts explained badly',
      'Not demonstrating WHY this matters practically',
      'Assuming the viewer knows prerequisite concepts',
    ],
  },

  // ── PARANORMAL & UFO ────────────────────────────────────────────────────
  paranormal_ufo: {
    name: 'Paranormal & UFO',
    archetype: 'Conspiracy/Mystery with eyewitness credibility',
    tone: 'Seriously curious investigator. Not a believer, not a debunker. "I just looked into this and... I can\'t explain it."',
    duration_sweet_spot: [65, 75],
    hook_formulas: [
      'The Pentagon released this footage in [year]. They still haven\'t explained it.',
      '37 pilots reported the same object in the same week. None of them were connected.',
      'This audio was recorded in [location]. Nobody knows what made this sound.',
      'A NASA astronaut said something live on broadcast that was immediately cut.',
      'The CIA has a file on [location]. It\'s 400 pages. 380 are still classified.',
    ],
    visual_style: 'Declassified document aesthetic, grain and static filters, night vision green, infrared thermal imagery, military/government document textures, FLIR camera footage style, stark lighting on faces in dark rooms, radar displays, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC evidence the voiceover describes — the Pentagon footage frame, the radar display with the anomaly, the classified document cover. Not "generic night sky." The PROOF that starts the investigation.',
      context: 'Show the OFFICIAL CONTEXT — the military briefing room, the pilot\'s cockpit, the press conference where the question was asked. Ground it in credible institutions.',
      escalation: 'Show each piece of evidence AS DESCRIBED — the enhanced footage with the anomaly circled, the flight path map with the impossible trajectory, the second pilot\'s corroborating report. Each visual should add CREDIBILITY, not atmosphere.',
      climax: 'Show the UNEXPLAINABLE element — the frame of footage that defies physics, the radar data that contradicts the official story, the redacted paragraph that\'s only one sentence. The image that makes even a skeptic pause.',
      kicker: 'Show the CONTRAST — the official denial next to the evidence, or the classified file with "380 pages redacted" visible. Leave the viewer with the QUESTION, not an answer.',
    },
    music: { style: 'Eerie ambient, X-Files inspired. Theremin-like tones, low pulsing bass, scattered metallic percussion.', bpm: 'freeform/atmospheric', energy: 'Creates unease without being campy.' },
    sfx_palette: ['Radio static', 'military radio chatter', 'scanner beeps', 'film projector clicking', 'classified stamp sound', 'redaction marker', 'distant aircraft', 'electromagnetic interference'],
    pacing: 'Investigative rhythm. Present evidence deliberately. Let each piece of evidence LAND before moving to the next.',
    failure_modes: [
      'Presenting speculation as confirmed truth',
      'Alien/X-Files music that makes it feel like entertainment (destroys credibility)',
      'Not sourcing claims',
      'Dismissing the entire topic in the kicker',
    ],
  },

  // ── DIY & CRAFTS (NEW) ─────────────────────────────────────────────────
  diy_crafts: {
    name: 'DIY & Crafts',
    archetype: 'Tutorial with transformation payoff',
    tone: 'Enthusiastic maker who just discovered a shortcut. Practical, encouraging, and slightly obsessed with the before/after.',
    duration_sweet_spot: [55, 65],
    hook_formulas: [
      'This $5 hack looks like a $500 renovation.',
      'You\'ve been using hot glue wrong your entire life.',
      'I turned literal trash into something people offered to buy.',
      'The tool pros use that nobody talks about — and it\'s $12.',
      'My landlord thought I hired a contractor. I spent $30.',
    ],
    visual_style: 'Bright maker space aesthetic, well-lit craft table from overhead, warm wood tones, colorful materials and tools, clean before/after compositions, time-lapse energy, hands-in-frame close-ups, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the FINISHED RESULT or the TRANSFORMATION described — if the script says "$5 hack looks like $500" show the result that looks expensive. The payoff image FIRST, before the process.',
      context: 'Show the BEFORE STATE the voiceover describes — the ugly wall, the broken item, the cheap material on the table. The viewer needs to see how bad it started to appreciate the transformation.',
      escalation: 'Show each STEP of the process AS DESCRIBED — the specific tool being used, the specific technique being applied, the material being cut/shaped/painted. If the script says "sand it down" show sanding. Each step should show VISIBLE progress.',
      climax: 'Show the REVEAL — the finished piece in context. In a room, in use, being admired. This is the hero shot. Lighting, angle, and composition should make it look professional.',
      kicker: 'Show the REACTION or COMPARISON — someone\'s genuine surprise, or the final before/after side by side. Prove the transformation was worth it.',
    },
    music: { style: 'Upbeat indie, acoustic guitar, light electronic beats. Craft-montage energy.', bpm: '105-125', energy: 'Builds with the project. Peaks at the reveal.' },
    sfx_palette: ['Power tool whirs', 'scissors cutting', 'paint brush strokes', 'measuring tape snap', 'glue gun click', 'sanding', 'hammer tap', 'spray paint hiss'],
    pacing: 'Rhythmic like a montage. Each step is quick but clear. The reveal gets a dramatic slowdown.',
    failure_modes: [
      'Showing every step without explaining which ones matter most',
      'No "before" baseline — the transformation needs a starting point',
      'Making it look harder than it is (scares people off)',
      'Weak reveal — the finished product needs to look professional',
    ],
  },

  // ── PARENTING (NEW) ─────────────────────────────────────────────────────
  parenting: {
    name: 'Parenting',
    archetype: 'Identity/humor/validation hybrid',
    tone: 'Exhausted but honest parent sharing hard-won wisdom. Not preachy. Not perfect. Real.',
    duration_sweet_spot: [55, 65],
    hook_formulas: [
      'No parenting book tells you about this stage.',
      'The trick that stopped tantrums in our house — and it\'s not what you think.',
      'I said one sentence to my kid and it changed everything.',
      'Every parent does this. No parent admits it.',
      'The pediatrician told me something that contradicts everything on Instagram.',
    ],
    visual_style: 'Warm domestic, natural window lighting, soft focus backgrounds, child-safe color palette (pastels, warm neutrals), candid family moments, toy/nursery textures, morning kitchen light, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC parenting moment the voiceover describes — if it says "the trick that stopped tantrums" show a child MID-TANTRUM (tastefully). If it says "one sentence changed everything" show the parent kneeling to the child\'s level. The REAL moment, not a stock photo of a happy family.',
      context: 'Show the SPECIFIC struggle described — the bedtime battle, the food refusal, the school morning chaos. The viewer must think "that\'s MY house."',
      escalation: 'Show the TECHNIQUE or SHIFT being described — the specific thing the parent did differently, the conversation happening at eye level, the change in environment. Make the approach VISIBLE.',
      climax: 'Show the RESULT — the calm after the storm, the child responding positively, the breakthrough moment. This should feel earned, not staged.',
      kicker: 'Show the QUIET AFTERMATH — the sleeping child, the parent exhaling, the peaceful house. The emotional payoff of everything the script just taught.',
    },
    music: { style: 'Gentle acoustic, soft piano, warm lo-fi. Emotional but never saccharine.', bpm: '75-95', energy: 'Gentle throughout. Slight swell at the emotional peak.' },
    sfx_palette: ['Kid laughter', 'toy sounds', 'door closing softly', 'phone buzzing', 'deep sigh', 'pages turning', 'lullaby music box', 'rain on windows'],
    pacing: 'Conversational and warm. Slightly slower than average — parents are tired and want to be talked to, not at.',
    failure_modes: [
      'Judging other parenting styles',
      'Making it sound too easy ("just do X and they\'ll stop")',
      'Only showing the cute parts — authenticity is what resonates',
      'Giving medical advice without qualifying it',
    ],
  },

  // ── CRYPTO (NEW) ────────────────────────────────────────────────────────
  crypto: {
    name: 'Crypto',
    archetype: 'Educational with urgency and FOMO management',
    tone: 'Rational analyst cutting through hype. Not a moonboy. Not a doomer. Shows the data and lets you decide.',
    duration_sweet_spot: [60, 70],
    hook_formulas: [
      'This altcoin just did something Bitcoin couldn\'t do in 15 years.',
      'The smart money is moving — here\'s the on-chain proof.',
      'Everyone\'s watching Bitcoin. Nobody\'s watching what Ethereum just did.',
      'A wallet that\'s been dormant since 2014 just moved $400 million.',
      'This pattern has appeared 3 times before. Each time, the market did the same thing.',
    ],
    visual_style: 'Digital finance aesthetic, dark backgrounds with blockchain node visualizations, green/cyan accent colors, candlestick chart close-ups, wallet address typography, matrix-style data rain, holographic coin renders, 9:16 portrait',
    visual_guidance: {
      hook: 'Show the SPECIFIC on-chain event the voiceover describes — the whale wallet moving, the chart pattern forming, the exchange outflow spiking. If the script says "a wallet dormant since 2014 just moved $400M" show a wallet address with a massive transaction. The DATA is the image.',
      context: 'Show the MARKET CONTEXT described — the BTC price at the relevant moment, the comparison chart, the timeline of events. Ground the signal in recognizable market reality.',
      escalation: 'Show each piece of ON-CHAIN EVIDENCE as described — the wallet flow diagram, the exchange outflow chart, the network metric with the anomaly highlighted. If the script says "the shape of the curve" show TWO curves with different shapes, clearly contrasted.',
      climax: 'Show the PATTERN or SIGNAL being revealed — the historical comparison with the matching formation, the convergence point on the chart, the on-chain metric that confirms the thesis. This should make a crypto person lean in.',
      kicker: 'Show the DECISION POINT — not generic "city lights" but the specific chart setup for what comes next, or the unresolved question on the data display.',
    },
    music: { style: 'Dark electronic, pulsing bass, cyberpunk undertones. Tension-building synths.', bpm: '95-115', energy: 'Builds tension through data stacking. Brief pause before the main signal reveal.' },
    sfx_palette: ['Trading bell', 'notification dings', 'keyboard clicks', 'digital scanning sounds', 'blockchain node connection pings', 'cash register', 'alert tone'],
    pacing: 'Data-driven rhythm. Numbers need emphasis. Charts need 2-3 seconds to register. The signal moment gets breathing room.',
    failure_modes: [
      'Shilling specific tokens ("buy X now")',
      'All hype, no data — "this is going to moon" without on-chain evidence',
      'Using jargon without explaining it (MACD, RSI — show what it MEANS)',
      'Making price predictions without caveats',
    ],
  },
};

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────

/**
 * Get the blueprint for a specific niche.
 * @param {string} nicheKey - Niche key (e.g., 'ai_tech_news')
 * @returns {object|null} The niche blueprint or null
 */
export function getNicheBlueprint(nicheKey) {
  return NICHE_BLUEPRINTS[nicheKey] || null;
}

/**
 * Get all available niche keys with names.
 * @returns {Array<{ key: string, name: string }>}
 */
export function getAvailableNiches() {
  return Object.entries(NICHE_BLUEPRINTS).map(([key, bp]) => ({
    key,
    name: bp.name,
  }));
}

/**
 * Build the system prompt section for a specific niche.
 * Used by the production engine to inject niche-specific guidance into the LLM prompt.
 */
export function buildNichePromptSection(nicheKey) {
  const bp = NICHE_BLUEPRINTS[nicheKey];
  if (!bp) return '';

  // Get niche-specific connector flavors if available
  const connectorFlavors = NICHE_CONNECTOR_FLAVORS[nicheKey];
  const connectorSection = connectorFlavors
    ? `\nNICHE-FLAVORED CONNECTOR EXAMPLES (use these as INSPIRATION to write your own — do NOT copy verbatim):
${connectorFlavors.map(c => `  - "${c}"`).join('\n')}
Create connectors that feel organic to THIS story. The best connector doesn't sound like a connector — it sounds like the next sentence a fascinated person would say.`
    : '';

  return `
NICHE: ${bp.name}
ARCHETYPE: ${bp.archetype}
TONE: ${bp.tone}
TARGET DURATION: ${bp.duration_sweet_spot[0]}-${bp.duration_sweet_spot[1]} seconds

HOOK FORMULA BANK (pick from these patterns or create similar):
${bp.hook_formulas.map((h, i) => `  ${i + 1}. "${h}"`).join('\n')}

VISUAL STYLE FOR ALL IMAGES: ${bp.visual_style}

VISUAL GUIDANCE PER BEAT:
  - Hook: ${bp.visual_guidance.hook}
  - Context: ${bp.visual_guidance.context}
  - Escalation: ${bp.visual_guidance.escalation}
  - Climax: ${bp.visual_guidance.climax}
  - Kicker: ${bp.visual_guidance.kicker}

MUSIC DIRECTION:
  - Style: ${bp.music.style}
  - BPM Range: ${bp.music.bpm}
  - Energy Curve: ${bp.music.energy}

SFX PALETTE: ${bp.sfx_palette.join(', ')}

PACING: ${bp.pacing}
${connectorSection}

FAILURE MODES TO AVOID:
${bp.failure_modes.map(f => `  - ${f}`).join('\n')}`;
}
