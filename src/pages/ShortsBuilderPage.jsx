/**
 * ShortsBuilderPage — Clean rebuild of the Shorts creation tool.
 * Step-by-step wizard that produces Shorts and saves as Flows templates.
 *
 * WIRED — API connections active
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { STYLE_CATEGORIES } from '@/lib/stylePresets';
// BUILDER_FRAMEWORKS removed — production engine handles structure via Fichtean Curve + niche blueprints

// ─── Static data: 20 Niches ───────────────────────────────────────────────────
const NICHES = [
  { id: 'ai_tech_news', name: 'AI / Tech News', icon: '🤖', color: '#3B82F6' },
  { id: 'finance_money', name: 'Finance & Money', icon: '💰', color: '#10B981' },
  { id: 'motivation_self_help', name: 'Motivation', icon: '🔥', color: '#F59E0B' },
  { id: 'scary_horror', name: 'Scary / Horror', icon: '👻', color: '#6B21A8' },
  { id: 'history_did_you_know', name: 'History', icon: '🏛️', color: '#92400E' },
  { id: 'true_crime', name: 'True Crime', icon: '🔍', color: '#DC2626' },
  { id: 'science_nature', name: 'Science & Nature', icon: '🔬', color: '#059669' },
  { id: 'relationships_dating', name: 'Relationships', icon: '💕', color: '#EC4899' },
  { id: 'health_fitness', name: 'Health & Fitness', icon: '💪', color: '#14B8A6' },
  { id: 'gaming_popculture', name: 'Gaming & Pop Culture', icon: '🎮', color: '#8B5CF6' },
  { id: 'conspiracy_mystery', name: 'Conspiracy & Mystery', icon: '🕵️', color: '#6D28D9' },
  { id: 'business_entrepreneur', name: 'Business', icon: '📈', color: '#0284C7' },
  { id: 'food_cooking', name: 'Food & Cooking', icon: '🍳', color: '#EA580C' },
  { id: 'travel_adventure', name: 'Travel & Adventure', icon: '✈️', color: '#0891B2' },
  { id: 'psychology_mindblown', name: 'Psychology', icon: '🧠', color: '#7C3AED' },
  { id: 'space_cosmos', name: 'Space & Cosmos', icon: '🌌', color: '#1E3A5F' },
  { id: 'animals_wildlife', name: 'Animals & Wildlife', icon: '🦁', color: '#65A30D' },
  { id: 'sports_athletes', name: 'Sports & Athletes', icon: '⚽', color: '#E11D48' },
  { id: 'education_learning', name: 'Education', icon: '📚', color: '#2563EB' },
  { id: 'paranormal_ufo', name: 'Paranormal & UFO', icon: '👽', color: '#4C1D95' },
  { id: 'diy_crafts', name: 'DIY & Crafts', icon: '🔨', color: '#D97706' },
  { id: 'parenting', name: 'Parenting', icon: '👶', color: '#F472B6' },
  { id: 'crypto', name: 'Crypto', icon: '₿', color: '#F97316' },
];

// ─── Static data: Frameworks ──────────────────────────────────────────────────
// Each defines scene beats with baked-in camera directions per scene.
// Avatar Mode is a framework, not an add-on.
// niches: null = universal (shown for all niches), array = niche-specific only.
const FRAMEWORKS = [
  // ── Universal ──
  { id: 'personal_journey', name: 'Personal Journey', category: 'story', niches: null,
    description: 'First-person narrative arc — transformative experience with emotional beats.',
    duration: '30-35s', sceneCount: '5-6 scenes',
    scenes: [
      { label: 'Setup', camera: 'Medium close-up, eye level, slow push in' },
      { label: 'Inciting Moment', camera: 'Close-up, slight low angle, steady' },
      { label: 'Struggle', camera: 'Handheld drift, medium shot, desaturated' },
      { label: 'Turning Point', camera: 'Wide to close-up rack focus' },
      { label: 'Resolution', camera: 'Slow dolly out, warm grade, soft focus' },
    ],
  },
  { id: 'origin_story', name: 'Origin Story', category: 'story', niches: null,
    description: 'Humble beginnings and rise of a brand, person, or idea.',
    duration: '30-35s', sceneCount: '5 scenes',
    scenes: [
      { label: 'Humble Beginning', camera: 'Wide establishing, muted tones' },
      { label: 'The Spark', camera: 'Close-up detail shot, sharp focus' },
      { label: 'First Attempt', camera: 'Medium shot, handheld energy' },
      { label: 'Breakthrough', camera: 'Dynamic low angle, push in' },
      { label: 'Where They Are Now', camera: 'Wide cinematic, warm grade' },
    ],
  },
  { id: 'mini_documentary', name: 'Mini Documentary', category: 'story', niches: null,
    description: 'Authoritative deep-dive with cold open hook and measured pacing.',
    duration: '30-35s', sceneCount: '5 scenes',
    scenes: [
      { label: 'Cold Open', camera: 'Tight close-up, dramatic lighting' },
      { label: 'Context', camera: 'Medium shot, documentary framing' },
      { label: 'Deep Dive', camera: 'Slow pan across details' },
      { label: 'Key Insight', camera: 'Close-up, direct to camera' },
      { label: 'Resolution', camera: 'Wide pull-back, reflective' },
    ],
  },
  { id: 'explainer', name: 'Explainer', category: 'educational', niches: null,
    description: 'Clear teacher-like walkthrough of a mechanism or process.',
    duration: '25-30s', sceneCount: '4-5 scenes',
    scenes: [
      { label: 'Hook Question', camera: 'Close-up, curious angle' },
      { label: 'Simple Explanation', camera: 'Medium shot, clean background' },
      { label: 'Visual Example', camera: 'Top-down or diagram view' },
      { label: 'Takeaway', camera: 'Direct to camera, steady' },
    ],
  },
  { id: 'myth_busting', name: 'Myth Busting', category: 'educational', niches: null,
    description: 'Debunk popular misconceptions with confident energy.',
    duration: '25-30s', sceneCount: '5 scenes',
    scenes: [
      { label: 'The Myth', camera: 'Medium shot, warm lighting, trustworthy framing' },
      { label: 'Why People Believe It', camera: 'Close-up details, soft focus' },
      { label: 'The Truth', camera: 'Direct to camera, sharp, higher contrast' },
      { label: 'Proof', camera: 'Close-up evidence shots, clinical' },
      { label: 'Mind Blown', camera: 'Wide dramatic reveal, bold angle' },
    ],
  },
  { id: 'top_countdown', name: 'Top X Countdown', category: 'listicle', niches: null,
    description: 'Ranked list building anticipation toward #1.',
    duration: '30-35s', sceneCount: '6 scenes',
    scenes: [
      { label: 'Tease #1', camera: 'Quick cuts, mystery angle' },
      { label: 'Entry 5', camera: 'Medium shot, steady' },
      { label: 'Entry 4', camera: 'Slightly tighter framing' },
      { label: 'Entry 3', camera: 'Close-up, building tension' },
      { label: 'Entry 2', camera: 'Dynamic angle, energy building' },
      { label: '#1 Reveal', camera: 'Epic wide or dramatic close-up' },
    ],
  },
  { id: 'before_after', name: 'Before & After', category: 'story', niches: null,
    description: 'Transformation story — the journey from A to B.',
    duration: '25-30s', sceneCount: '4 scenes',
    scenes: [
      { label: 'The Before', camera: 'Flat lighting, desaturated, steady' },
      { label: 'The Catalyst', camera: 'Close-up moment, sharp focus' },
      { label: 'The Process', camera: 'Time-lapse style, medium shots' },
      { label: 'The After', camera: 'Bright, warm, wide triumphant shot' },
    ],
  },
  { id: 'hot_take', name: 'Hot Take', category: 'opinion', niches: null,
    description: 'Bold opinion delivered with confidence — drives comments and shares.',
    duration: '25-30s', sceneCount: '4 scenes',
    scenes: [
      { label: 'The Statement', camera: 'Tight close-up, direct eye contact' },
      { label: 'Why I Believe This', camera: 'Medium shot, confident posture' },
      { label: 'The Evidence', camera: 'Cut-away evidence shots' },
      { label: 'The Challenge', camera: 'Return to close-up, lean in' },
    ],
  },
  { id: 'did_you_know', name: 'Did You Know?', category: 'educational', niches: null,
    description: 'Curiosity-driven explanation that subverts common assumptions.',
    duration: '20-25s', sceneCount: '3 scenes',
    scenes: [
      { label: 'The Question', camera: 'Close-up, intrigued expression' },
      { label: 'The Surprising Answer', camera: 'Wide reveal or visual proof' },
      { label: 'Why It Matters', camera: 'Medium shot, direct delivery' },
    ],
  },
  { id: 'avatar_narrator', name: 'Avatar Narrator', category: 'avatar', niches: null,
    description: 'AI avatar presents to camera — talking head with B-roll cutaways.',
    duration: '30-35s', sceneCount: '5 scenes',
    scenes: [
      { label: 'Avatar Hook', camera: 'Medium close-up, eye level, avatar centered' },
      { label: 'Main Point', camera: 'Same framing, slight push in' },
      { label: 'B-Roll Cutaway', camera: 'Full-screen visual, cinematic' },
      { label: 'Supporting Detail', camera: 'Return to avatar, medium shot' },
      { label: 'Avatar Close', camera: 'Close-up, direct CTA delivery' },
    ],
  },
  { id: 'avatar_split_screen', name: 'Avatar Split Screen', category: 'avatar', niches: null,
    description: 'Avatar on one side, visuals on the other — presentation style.',
    duration: '30-35s', sceneCount: '5 scenes',
    scenes: [
      { label: 'Avatar Intro', camera: 'Split: avatar left, title card right' },
      { label: 'Visual + Commentary', camera: 'Split: avatar left, visual right' },
      { label: 'Key Point', camera: 'Full-screen visual emphasis' },
      { label: 'Visual + Commentary', camera: 'Split: avatar left, data right' },
      { label: 'Avatar CTA', camera: 'Full avatar, close-up, direct' },
    ],
  },
  // ── Niche-specific ──
  { id: 'breaking_tech_news', name: 'Breaking Tech News', category: 'news', niches: ['ai_tech_news'],
    description: 'Fast-paced tech announcement with urgency and authority.',
    duration: '25-30s', sceneCount: '5 scenes',
    scenes: [
      { label: 'Breaking Hook', camera: 'Tight close-up, urgent framing' },
      { label: 'What Happened', camera: 'Medium shot, news-style' },
      { label: 'Why It Matters', camera: 'Close-up, direct to camera' },
      { label: 'Impact', camera: 'Wide contextual shot' },
      { label: 'What\'s Next', camera: 'Medium, forward-looking energy' },
    ],
  },
  { id: 'ai_tool_review', name: 'AI Tool Review', category: 'review', niches: ['ai_tech_news'],
    description: 'Quick hands-on look at a new AI tool — what it does, demo, verdict.',
    duration: '30s', sceneCount: '5 scenes',
    scenes: [
      { label: 'Hook', camera: 'Screen recording or product shot' },
      { label: 'What It Does', camera: 'Medium explanatory shot' },
      { label: 'Demo', camera: 'Screen capture, top-down' },
      { label: 'Pros & Cons', camera: 'Split comparison framing' },
      { label: 'Verdict', camera: 'Close-up, direct delivery' },
    ],
  },
  { id: 'wealth_blueprint', name: 'Wealth Blueprint', category: 'strategy', niches: ['finance_money'],
    description: 'Step-by-step money strategy — actionable and specific.',
    duration: '30s', sceneCount: '5 scenes',
    scenes: [
      { label: 'Hook Stat', camera: 'Bold number graphic, tight frame' },
      { label: 'The Strategy', camera: 'Medium shot, confident delivery' },
      { label: 'Step 1', camera: 'Close-up detail shot' },
      { label: 'Step 2', camera: 'Medium, visual demonstration' },
      { label: 'Result', camera: 'Wide triumphant, warm grade' },
    ],
  },
  { id: 'money_mistakes', name: 'Money Mistakes', category: 'cautionary', niches: ['finance_money'],
    description: 'Common financial mistakes — each more painful than the last.',
    duration: '30s', sceneCount: '5 scenes',
    scenes: [
      { label: 'Hook', camera: 'Close-up, concerned expression' },
      { label: 'Mistake 1', camera: 'Medium shot, visual evidence' },
      { label: 'Mistake 2', camera: 'Tighter framing, building tension' },
      { label: 'The Worst One', camera: 'Dramatic close-up, pause' },
      { label: 'Fix', camera: 'Wide, hopeful, action-oriented' },
    ],
  },
  { id: 'campfire_story', name: 'Campfire Story', category: 'story', niches: ['scary_horror'],
    description: 'Classic horror tale — slow tension build and terrifying climax.',
    duration: '30-35s', sceneCount: '6 scenes',
    scenes: [
      { label: 'Setting the Scene', camera: 'Wide establishing, dark, foggy' },
      { label: 'First Sign', camera: 'Medium, subtle movement in frame' },
      { label: 'Growing Dread', camera: 'Slow push in, shadows deepening' },
      { label: 'The Discovery', camera: 'Close-up reveal, sharp focus' },
      { label: 'The Horror', camera: 'Fast cut, chaotic angles' },
      { label: 'Aftermath', camera: 'Wide pull-back, eerie stillness' },
    ],
  },
  { id: 'cold_case', name: 'Cold Case', category: 'investigation', niches: ['true_crime'],
    description: 'Unsolved case gets new attention — fresh evidence.',
    duration: '30-35s', sceneCount: '6 scenes',
    scenes: [
      { label: 'The Crime', camera: 'Noir lighting, evidence board' },
      { label: 'The Victim', camera: 'Soft portrait, humanizing' },
      { label: 'What We Know', camera: 'Document close-ups, clinical' },
      { label: 'The Theories', camera: 'Split screen, contrasting angles' },
      { label: 'New Evidence', camera: 'Dramatic reveal, sharp focus' },
      { label: 'Open Question', camera: 'Wide, lingering, unresolved' },
    ],
  },
  { id: 'rise_and_grind', name: 'Rise & Grind', category: 'motivation', niches: ['motivation_self_help'],
    description: 'Early-morning discipline — the grind behind the glory.',
    duration: '30s', sceneCount: '5 scenes',
    scenes: [
      { label: '4AM Alarm', camera: 'Close-up alarm clock, dark room' },
      { label: 'The Routine', camera: 'Time-lapse morning sequence' },
      { label: 'The Work', camera: 'Medium action shots, focused' },
      { label: 'The Payoff', camera: 'Wide achievement shot, golden light' },
      { label: 'Your Move', camera: 'Direct to camera, challenging' },
    ],
  },
  { id: 'mindset_shift', name: 'Mindset Shift', category: 'motivation', niches: ['motivation_self_help'],
    description: 'A single powerful reframe that changes perspective.',
    duration: '25-30s', sceneCount: '4 scenes',
    scenes: [
      { label: 'The Problem', camera: 'Medium shot, frustrated energy' },
      { label: 'The Old Way', camera: 'Flat, conventional framing' },
      { label: 'The Reframe', camera: 'Dynamic angle shift, new perspective' },
      { label: 'The New Truth', camera: 'Close-up, confident, bright' },
    ],
  },
  { id: 'cosmic_voyage', name: 'Cosmic Voyage', category: 'story', niches: ['space_cosmos'],
    description: 'Epic journey through space — familiar to unfathomably distant.',
    duration: '30-35s', sceneCount: '6 scenes',
    scenes: [
      { label: 'Earth', camera: 'Orbital wide shot, blue marble' },
      { label: 'Moon', camera: 'Fly-by, crater details' },
      { label: 'Mars', camera: 'Aerial landscape, red dust' },
      { label: 'Jupiter', camera: 'Massive scale, storm detail' },
      { label: 'Edge of Solar System', camera: 'Pale blue dot perspective' },
      { label: 'Deep Space', camera: 'Infinite void, galaxy clusters' },
    ],
  },
  { id: 'lost_civilization', name: 'Lost Civilization', category: 'story', niches: ['history_did_you_know'],
    description: 'A vanished civilization and the mysteries they left behind.',
    duration: '30-35s', sceneCount: '5 scenes',
    scenes: [
      { label: 'The Discovery', camera: 'Wide ruins reveal, aerial sweep' },
      { label: 'Who They Were', camera: 'Close-up artifacts, warm light' },
      { label: 'Their Achievements', camera: 'Grand architectural shots' },
      { label: 'What Happened', camera: 'Dramatic, storm/destruction' },
      { label: 'The Mystery Remains', camera: 'Wide, mist, lingering' },
    ],
  },
];

// ─── Static data: Topic suggestions (truncated sample per niche) ──────────────
const TOPIC_SUGGESTIONS = {
  ai_tech_news: [
    { label: 'AI Breakthroughs', sub: [
      { label: 'Reasoning & Intelligence', hooks: ['beyond human level', 'caught cheating', 'real-world testing', 'surprise benchmark', 'leaked results'] },
      { label: 'Creative AI', hooks: ['fooling experts', 'original compositions', 'replacing artists', 'viral generation', 'AI vs human test'] },
      { label: 'Robotics', hooks: ['learning emotions', 'warehouse takeover', 'humanoid progress', 'home robots coming', 'factory replaced'] },
      { label: 'Medical AI', hooks: ['outperforming doctors', 'drug discovery', 'predicting illness', 'cancer detection', 'surgery AI'] },
    ]},
    { label: 'AI & Society', sub: [
      { label: 'Jobs disruption', hooks: ['lawyers affected', 'coding obsolete', 'finance automation', 'consultants replaced', 'new careers'] },
      { label: 'Ethics & deepfakes', hooks: ['caught on camera', 'political impact', 'impossible to detect', 'identity theft', 'regulation coming'] },
      { label: 'Existential risk', hooks: ['researchers warning', 'alignment problem', 'containment failure', 'rogue AI scenario', 'kill switch'] },
    ]},
    { label: 'Tech Giants', sub: [
      { label: 'OpenAI', hooks: ['internal drama', 'secret projects', 'power struggle', 'GPT-5 rumors', 'Altman moves'] },
      { label: 'Google & Meta', hooks: ['falling behind', 'search dying', 'Gemini controversy', 'secret labs', 'pivot strategy'] },
    ]},
    { label: 'Consumer Tech', sub: [
      { label: 'Gadgets & devices', hooks: ['killed the industry', 'hidden feature found', 'planned obsolescence', 'teardown reveals', 'nobody expected this'] },
      { label: 'Apps & platforms', hooks: ['algorithm exposed', 'secret settings', 'privacy nightmare', 'already tracking you', 'banned worldwide'] },
    ]},
    { label: 'AI Tools & Products', sub: [
      { label: 'Productivity AI', hooks: ['replaces entire workflow', 'free tool nobody knows', 'tested 50 tools', 'before and after', 'saved 10 hours weekly'] },
      { label: 'Open source AI', hooks: ['beats closed models', 'runs on laptop', 'community breakthrough', 'no API needed', 'local and private'] },
      { label: 'AI coding', hooks: ['wrote entire app', 'debugging itself', 'junior devs worried', 'vibe coding era', 'autonomy milestone'] },
    ]},
  ],
  finance_money: [
    { label: 'Wealth Building', sub: [
      { label: 'Investing', hooks: ['beating the market', 'hidden strategies', 'common mistakes', 'index fund truth', 'compound effect'] },
      { label: 'Real Estate', hooks: ['house hacking', 'rent vs buy', 'passive income', 'market crash coming', 'first property'] },
      { label: 'Side hustles', hooks: ['no-code SaaS', 'digital products', 'vending machines', 'newsletter model', 'flipping'] },
    ]},
    { label: 'Money Myths', sub: [
      { label: 'Debt myths', hooks: ['good vs bad', 'credit score trap', 'minimum payment scam', 'student loan truth', 'mortgage hack'] },
      { label: 'Wealth myths', hooks: ['self-made myth', 'luck factor', 'rich mindset', 'generational wealth', 'millionaire habits'] },
    ]},
    { label: 'Tax & Banking', sub: [
      { label: 'Tax strategies', hooks: ['legal avoidance', 'LLC benefits', 'missed deductions', 'crypto taxes', 'audit triggers'] },
      { label: 'Hidden fees', hooks: ['bank profits', 'fractional reserve', 'inflation erosion', 'subscription traps', 'fine print'] },
    ]},
    { label: 'Economy & Markets', sub: [
      { label: 'Market signals', hooks: ['crash indicator', 'bubble forming', 'smart money moving', 'insider selling', 'historical pattern'] },
      { label: 'Global economy', hooks: ['currency collapse', 'trade war impact', 'recession signs', 'supply chain broken', 'who benefits'] },
    ]},
    { label: 'Crypto & Digital Assets', sub: [
      { label: 'Crypto trends', hooks: ['next big narrative', 'whale activity', 'regulation incoming', 'protocol exploit', 'yield strategy'] },
      { label: 'DeFi & Web3', hooks: ['passive income', 'rug pull warning', 'institutional adoption', 'bridge hack', 'tokenization shift'] },
      { label: 'Bitcoin cycles', hooks: ['halving effect', 'historical repeating', 'accumulation phase', 'on-chain signal', 'macro correlation'] },
    ]},
  ],
  motivation_self_help: [
    { label: 'Mindset', sub: [
      { label: 'Mental models', hooks: ['reframe everything', 'stoic wisdom', 'cognitive bias', 'decision framework', 'growth mindset'] },
      { label: 'Habits', hooks: ['atomic habits', 'keystone habit', '21-day myth', 'habit stacking', 'breaking bad habits'] },
    ]},
    { label: 'Success Stories', sub: [
      { label: 'Against all odds', hooks: ['rock bottom', 'impossible comeback', 'rejected 100 times', 'started at 50', 'overnight success myth'] },
      { label: 'Daily routines', hooks: ['4AM club', 'CEO morning', 'cold plunge effect', 'journaling power', 'digital detox'] },
    ]},
    { label: 'Personal Growth', sub: [
      { label: 'Confidence', hooks: ['fake it research', 'body language hack', 'imposter syndrome', 'public speaking fear', 'first impression'] },
      { label: 'Productivity', hooks: ['deep work', 'time blocking', 'Parkinson\'s law', 'Pomodoro evolved', 'saying no'] },
    ]},
    { label: 'Philosophy & Wisdom', sub: [
      { label: 'Ancient philosophy', hooks: ['stoic principle', 'Marcus Aurelius said', 'samurai code', 'Zen koan', 'Taoist lesson'] },
      { label: 'Modern thinkers', hooks: ['Goggins mentality', 'Huberman protocol', 'Naval Ravikant truth', 'contrarian wisdom', 'unpopular opinion'] },
    ]},
    { label: 'Emotional Mastery', sub: [
      { label: 'Managing emotions', hooks: ['anger control hack', 'anxiety technique', 'overthinking cure', 'emotional regulation', 'stress response'] },
      { label: 'Resilience', hooks: ['post-traumatic growth', 'anti-fragile mindset', 'failure fuel', 'bouncing back faster', 'mental toughness'] },
      { label: 'Relationships & boundaries', hooks: ['people pleaser trap', 'toxic patterns', 'healthy detachment', 'saying no guilt-free', 'energy vampires'] },
    ]},
  ],
  scary_horror: [
    { label: 'Haunted Places', sub: [
      { label: 'Abandoned buildings', hooks: ['documented evidence', 'still active', 'sealed forever', 'police called', 'caught on camera'] },
      { label: 'Cursed locations', hooks: ['pattern of deaths', 'locals avoid', 'government warning', 'still happening', 'no explanation'] },
    ]},
    { label: 'Unexplained Events', sub: [
      { label: 'Disappearances', hooks: ['without trace', 'overnight vanishing', 'official cover-up', 'no bodies found', 'search abandoned'] },
      { label: 'Time anomalies', hooks: ['documented cases', 'witness accounts', 'missing time', 'aged overnight', 'scientific study'] },
    ]},
    { label: 'True Scary Stories', sub: [
      { label: 'Real encounters', hooks: ['security footage', 'multiple witnesses', 'police report filed', 'still unsolved', 'happened last week'] },
      { label: 'Creepy places', hooks: ['don\'t visit alone', 'banned from entering', 'locals won\'t talk', 'sounds at night', 'never explained'] },
    ]},
    { label: 'Folklore & Legends', sub: [
      { label: 'Urban legends', hooks: ['based on truth', 'origin story', 'local version', 'still reported', 'nobody goes there'] },
      { label: 'Mythology creatures', hooks: ['sightings continue', 'cultural origins', 'worldwide pattern', 'physical evidence', 'native warnings'] },
    ]},
    { label: 'Psychological Horror', sub: [
      { label: 'Sleep & dreams', hooks: ['sleep paralysis demon', 'recurring nightmare', 'lucid gone wrong', 'shared dream', 'premonition cases'] },
      { label: 'Mind experiments', hooks: ['isolation effects', 'sensory deprivation', 'perception warped', 'reality questioned', 'subjects broke down'] },
      { label: 'Doppelgangers', hooks: ['seen by family', 'photographed twice', 'historical cases', 'impossible encounter', 'crisis apparition'] },
    ]},
  ],
  history_did_you_know: [
    { label: 'Hidden History', sub: [
      { label: 'Forgotten events', hooks: ['erased from textbooks', 'covered up', 'nobody talks about', 'changed everything', 'rewritten'] },
      { label: 'Lost civilizations', hooks: ['vanished overnight', 'technology ahead of time', 'still unexplained', 'recently discovered', 'underwater ruins'] },
    ]},
    { label: 'Historical Figures', sub: [
      { label: 'Unsung heroes', hooks: ['never got credit', 'died unknown', 'saved thousands', 'ahead of their time', 'erased from history'] },
      { label: 'Controversial figures', hooks: ['dark secret', 'hidden past', 'double life', 'real story', 'myth vs reality'] },
    ]},
    { label: 'Wars & Conflicts', sub: [
      { label: 'Turning points', hooks: ['one decision changed everything', 'nearly lost', 'secret weapon', 'intelligence failure', 'accidental victory'] },
      { label: 'Untold stories', hooks: ['classified until now', 'soldiers testimony', 'civilian experience', 'forgotten front', 'what really happened'] },
    ]},
    { label: 'Ancient World', sub: [
      { label: 'Empires', hooks: ['why they fell', 'peak power moment', 'forgotten empire', 'trade network', 'cultural legacy'] },
      { label: 'Daily life', hooks: ['what they ate', 'how they lived', 'surprising modern', 'hygiene reality', 'social structure'] },
      { label: 'Inventions', hooks: ['ahead of their time', 'reinvented centuries later', 'lost technology', 'accidental discovery', 'changed civilization'] },
    ]},
    { label: 'Historical Mysteries', sub: [
      { label: 'Disappearances', hooks: ['vanished colony', 'missing ship', 'lost expedition', 'empty settlement', 'no trace found'] },
      { label: 'Codes & secrets', hooks: ['still undeciphered', 'hidden message found', 'manuscript mystery', 'coded letter', 'spy network revealed'] },
    ]},
  ],
  true_crime: [
    { label: 'Unsolved Cases', sub: [
      { label: 'Cold cases', hooks: ['new evidence', 'reopened', 'DNA breakthrough', 'witness came forward', 'still missing'] },
      { label: 'Serial cases', hooks: ['pattern found', 'connected crimes', 'still at large', 'wrong person convicted', 'overlooked clue'] },
    ]},
    { label: 'Investigations', sub: [
      { label: 'Forensic breakthroughs', hooks: ['one fingerprint', 'DNA match', 'digital trail', 'phone records', 'surveillance footage'] },
      { label: 'Wrongful convictions', hooks: ['innocent imprisoned', 'real killer found', 'confession recanted', 'evidence fabricated', 'years lost'] },
    ]},
    { label: 'Notorious Criminals', sub: [
      { label: 'Psychology of crime', hooks: ['what drove them', 'warning signs missed', 'childhood clues', 'escalation pattern', 'expert analysis'] },
      { label: 'Heists & scams', hooks: ['nearly perfect plan', 'inside job', 'millions stolen', 'how they got caught', 'still missing'] },
    ]},
    { label: 'Missing Persons', sub: [
      { label: 'Active cases', hooks: ['last seen here', 'someone knows something', 'new lead found', 'family plea', 'timeline reconstructed'] },
      { label: 'Found alive', hooks: ['years later', 'different identity', 'escaped captor', 'memory returned', 'recognized on street'] },
    ]},
    { label: 'Crime & Technology', sub: [
      { label: 'Digital forensics', hooks: ['deleted data recovered', 'GPS tracked them', 'social media exposed', 'dark web operation', 'encrypted messages cracked'] },
      { label: 'Modern crime', hooks: ['AI-generated fraud', 'cryptocurrency laundering', 'deepfake evidence', 'cyber kidnapping', 'romance scam ring'] },
      { label: 'Cold case tech', hooks: ['genealogy database match', 'facial reconstruction', 'satellite imagery', 'pollen analysis', 'spectral imaging'] },
    ]},
  ],
  science_nature: [
    { label: 'Discoveries', sub: [
      { label: 'Recent breakthroughs', hooks: ['changes everything', 'thought impossible', 'accidental discovery', 'published this week', 'Nobel worthy'] },
      { label: 'Deep ocean', hooks: ['never seen before', 'deeper than Everest', 'alien-like life', 'pressure mystery', 'bioluminescence'] },
    ]},
    { label: 'Nature', sub: [
      { label: 'Extreme weather', hooks: ['record breaking', 'climate shift', 'unprecedented', 'scientists alarmed', 'pattern emerging'] },
      { label: 'Evolution', hooks: ['happening now', 'rapid adaptation', 'unexpected mutation', 'survival strategy', 'arms race'] },
    ]},
    { label: 'Human Body', sub: [
      { label: 'Brain science', hooks: ['rewires itself', 'consciousness mystery', 'memory manipulation', 'dream function', 'neural breakthrough'] },
      { label: 'Genetic frontiers', hooks: ['gene editing live', 'inherited traits myth', 'DNA surprise', 'epigenetics proof', 'designer babies debate'] },
    ]},
    { label: 'Physics & Chemistry', sub: [
      { label: 'Quantum world', hooks: ['defies logic', 'spooky action', 'observer effect real', 'teleportation progress', 'parallel universes'] },
      { label: 'Materials science', hooks: ['stronger than steel', 'self-healing material', 'room temperature superconductor', 'impossible substance', 'graphene application'] },
      { label: 'Energy breakthroughs', hooks: ['fusion milestone', 'battery revolution', 'solar record', 'nuclear renaissance', 'energy storage solved'] },
    ]},
    { label: 'Earth Science', sub: [
      { label: 'Geology', hooks: ['supervolcano update', 'tectonic shift', 'core mystery', 'magnetic flip', 'earthquake prediction'] },
      { label: 'Climate systems', hooks: ['tipping point reached', 'ocean current change', 'ice core reveal', 'carbon capture', 'geoengineering debate'] },
    ]},
  ],
  relationships_dating: [
    { label: 'Psychology', sub: [
      { label: 'Attachment styles', hooks: ['anxious vs avoidant', 'why you attract wrong', 'secure attachment', 'healing patterns', 'test yourself'] },
      { label: 'Red flags', hooks: ['subtle signs', 'narcissist tactics', 'love bombing', 'gaslighting signals', 'trust your gut'] },
    ]},
    { label: 'Modern Dating', sub: [
      { label: 'App culture', hooks: ['algorithm secrets', 'profile mistakes', 'swipe fatigue', 'paradox of choice', 'what works'] },
      { label: 'Communication', hooks: ['text decoding', 'mixed signals', 'vulnerability power', 'conflict resolution', 'emotional intelligence'] },
    ]},
    { label: 'Long-Term Relationships', sub: [
      { label: 'Marriage science', hooks: ['Gottman research', 'divorce predictor', 'repair attempt', 'emotional bid', 'contempt warning'] },
      { label: 'Keeping connection', hooks: ['date night science', 'love language update', 'intimacy after kids', 'growing apart signs', 'rekindling spark'] },
    ]},
    { label: 'Breakups & Healing', sub: [
      { label: 'Moving on', hooks: ['no-contact rule', 'rebound science', 'grief timeline', 'identity reclaiming', 'when to let go'] },
      { label: 'Self-worth', hooks: ['codependency escape', 'boundaries saved me', 'alone vs lonely', 'healing timeline', 'choosing yourself'] },
      { label: 'Toxic dynamics', hooks: ['trauma bonding explained', 'intermittent reinforcement', 'hoovering tactics', 'flying monkeys', 'grey rock method'] },
    ]},
    { label: 'Social Dynamics', sub: [
      { label: 'Friendship', hooks: ['outgrowing people', 'friend audit', 'making friends as adult', 'quality over quantity', 'energy matching'] },
      { label: 'Family relationships', hooks: ['setting boundaries', 'generational patterns', 'enmeshment escape', 'inner child work', 'reparenting yourself'] },
    ]},
  ],
  health_fitness: [
    { label: 'Nutrition', sub: [
      { label: 'Diet myths', hooks: ['calories myth', 'fasting truth', 'sugar conspiracy', 'supplement scams', 'gut health'] },
      { label: 'Science-backed', hooks: ['proven methods', 'new research says', 'doctors recommend', 'longevity diet', 'performance food'] },
    ]},
    { label: 'Exercise', sub: [
      { label: 'Training myths', hooks: ['cardio debate', 'overtraining signs', 'muscle confusion myth', 'stretching truth', 'rest days'] },
      { label: 'Transformations', hooks: ['30-day results', 'before and after', 'body recomposition', 'beginner gains', 'plateau breaking'] },
    ]},
    { label: 'Mental Health', sub: [
      { label: 'Anxiety & stress', hooks: ['vagus nerve hack', 'cortisol control', 'nervous system reset', 'panic attack stop', 'breath technique'] },
      { label: 'Sleep optimization', hooks: ['melatonin myth', 'sleep architecture', 'blue light truth', 'nap science', 'circadian reset'] },
    ]},
    { label: 'Longevity', sub: [
      { label: 'Anti-aging science', hooks: ['biological age test', 'telomere research', 'fasting mimicking', 'zone 2 cardio', 'NAD+ truth'] },
      { label: 'Biohacking', hooks: ['cold exposure data', 'sauna protocol', 'glucose monitoring', 'supplement stack', 'blood work decoded'] },
      { label: 'Centenarian secrets', hooks: ['blue zone habits', 'Okinawa diet', 'Sardinia lifestyle', 'common denominator', 'what they avoid'] },
    ]},
    { label: 'Sports Medicine', sub: [
      { label: 'Injury prevention', hooks: ['mobility routine', 'prehab beats rehab', 'joint protection', 'posture correction', 'desk worker fix'] },
      { label: 'Recovery science', hooks: ['inflammation debate', 'ice bath evidence', 'compression therapy', 'active recovery', 'sleep for gains'] },
    ]},
  ],
  gaming_popculture: [
    { label: 'Gaming', sub: [
      { label: 'Hidden secrets', hooks: ['easter eggs found', 'developer room', 'cut content leaked', 'secret ending', 'glitch discovery'] },
      { label: 'Game lore', hooks: ['deeper meaning', 'timeline explained', 'theory confirmed', 'hidden story', 'character backstory'] },
    ]},
    { label: 'Pop Culture', sub: [
      { label: 'Movie/TV', hooks: ['detail you missed', 'fan theory proven', 'behind the scenes', 'deleted scene', 'actor secret'] },
      { label: 'Internet culture', hooks: ['meme origin', 'trend explained', 'drama breakdown', 'cancelled why', 'viral moment'] },
    ]},
    { label: 'Game Design', sub: [
      { label: 'Development stories', hooks: ['almost cancelled', 'crunch horror story', 'last-minute change', 'original concept', 'prototype leaked'] },
      { label: 'Game mechanics', hooks: ['genius design choice', 'psychological trick', 'difficulty balance', 'RNG manipulation', 'reward loop'] },
    ]},
    { label: 'Anime & Manga', sub: [
      { label: 'Deep dives', hooks: ['symbolism decoded', 'creator intended', 'foreshadowing genius', 'real-world inspiration', 'cultural context'] },
      { label: 'Industry secrets', hooks: ['animator pay truth', 'production crisis', 'studio rivalry', 'censorship differences', 'localization changes'] },
      { label: 'Versus debates', hooks: ['power scaling proof', 'canon confirmed', 'creator settled it', 'strongest character', 'fandom was wrong'] },
    ]},
    { label: 'Nostalgia & Retro', sub: [
      { label: 'Gaming history', hooks: ['console war truth', 'failed hardware', 'forgotten classic', 'ahead of its time', 'killed by timing'] },
      { label: 'Pop culture flashback', hooks: ['lost media found', 'childhood show secret', 'you forgot this existed', 'darker than remembered', 'hidden adult joke'] },
    ]},
  ],
  conspiracy_mystery: [
    { label: 'Government', sub: [
      { label: 'Declassified', hooks: ['just released', 'redacted sections', 'whistleblower', 'official denial', 'document proves'] },
      { label: 'Cover-ups', hooks: ['evidence destroyed', 'witnesses silenced', 'timeline doesn\'t match', 'money trail', 'who benefits'] },
    ]},
    { label: 'Mysteries', sub: [
      { label: 'Unsolved', hooks: ['no explanation', 'defies physics', 'experts baffled', 'pattern discovered', 'new theory'] },
      { label: 'Ancient mysteries', hooks: ['impossible construction', 'lost technology', 'star alignment', 'underwater structures', 'encoded message'] },
    ]},
    { label: 'Secret Societies', sub: [
      { label: 'Historical orders', hooks: ['still operating', 'member list leaked', 'initiation ritual', 'hidden symbols', 'power network'] },
      { label: 'Modern elites', hooks: ['annual meeting', 'attendee list', 'agenda leaked', 'media blackout', 'policy connection'] },
    ]},
    { label: 'Corporate Conspiracies', sub: [
      { label: 'Big pharma', hooks: ['suppressed cure', 'trial data hidden', 'pricing scandal', 'lobbying exposed', 'whistleblower testimony'] },
      { label: 'Tech surveillance', hooks: ['listening confirmed', 'data collection scale', 'backdoor access', 'metadata reveals', 'opt-out impossible'] },
      { label: 'Food industry', hooks: ['addictive by design', 'labeling loophole', 'funded study bias', 'ingredient banned elsewhere', 'lobbying power'] },
    ]},
    { label: 'Strange Phenomena', sub: [
      { label: 'Mandela effect', hooks: ['mass misremembering', 'evidence both ways', 'timeline theory', 'new example found', 'reality glitch'] },
      { label: 'Simulation theory', hooks: ['physicist argues', 'mathematical proof', 'glitch compiled', 'probability calculation', 'evidence mounting'] },
    ]},
  ],
  business_entrepreneur: [
    { label: 'Startup Stories', sub: [
      { label: 'Origin stories', hooks: ['garage startup', 'rejected by investors', 'pivot saved company', 'accidental billion', 'copycat won'] },
      { label: 'Failures', hooks: ['burned through millions', 'fatal mistake', 'wrong market', 'co-founder split', 'too early'] },
    ]},
    { label: 'Strategy', sub: [
      { label: 'Revenue models', hooks: ['hidden revenue stream', 'unit economics', 'pricing psychology', 'freemium trap', 'subscription math'] },
      { label: 'Growth tactics', hooks: ['viral loop', 'zero to one', 'first 100 customers', 'distribution hack', 'retention secret'] },
    ]},
    { label: 'Leadership', sub: [
      { label: 'Management styles', hooks: ['servant leadership', 'radical candor', 'micromanagement cost', 'remote team secrets', 'hiring framework'] },
      { label: 'CEO lessons', hooks: ['fired then returned', 'culture over strategy', 'one decision changed everything', 'delegation failure', 'founder mode'] },
    ]},
    { label: 'Industry Disruption', sub: [
      { label: 'Business models', hooks: ['killed the incumbent', 'zero to billion', 'marketplace flywheel', 'platform economics', 'bundling strategy'] },
      { label: 'Future trends', hooks: ['AI replacing agencies', 'creator economy shift', 'solo operator rising', 'automation arbitrage', 'next trillion dollar'] },
      { label: 'Case studies', hooks: ['what went wrong', 'perfect execution', 'timing was everything', 'underdog won', 'regulatory advantage'] },
    ]},
    { label: 'Personal Branding', sub: [
      { label: 'Content strategy', hooks: ['LinkedIn algorithm', 'newsletter monetization', 'audience building', 'thought leadership', 'repurpose system'] },
      { label: 'Monetization', hooks: ['audience to revenue', 'community model', 'digital product launch', 'consulting premium', 'course creation'] },
    ]},
  ],
  food_cooking: [
    { label: 'Techniques', sub: [
      { label: 'Kitchen science', hooks: ['why it works', 'chemical reaction', 'temperature secret', 'texture hack', 'flavor compound'] },
      { label: 'Chef secrets', hooks: ['restaurant trick', 'pro technique', 'one ingredient changes everything', 'common mistake', 'tool upgrade'] },
    ]},
    { label: 'Food Stories', sub: [
      { label: 'Origin stories', hooks: ['accidental invention', 'cultural fusion', 'war-time creation', 'street food history', 'banned ingredient'] },
      { label: 'Food science', hooks: ['why it tastes good', 'addictive ingredient', 'texture psychology', 'umami secret', 'fermentation magic'] },
    ]},
    { label: 'World Cuisine', sub: [
      { label: 'Regional deep dives', hooks: ['authentic vs adapted', 'grandmother recipe', 'street food guide', 'local secret ingredient', 'regional rivalry'] },
      { label: 'Fusion & trends', hooks: ['unexpected combo works', 'viral food trend', 'chef experiment', 'TikTok recipe test', 'food truck innovation'] },
    ]},
    { label: 'Kitchen Hacks', sub: [
      { label: 'Time savers', hooks: ['one-pan method', 'meal prep system', 'freezer hack', 'batch cooking', '15-minute dinner'] },
      { label: 'Equipment', hooks: ['tool you need', 'cheap vs expensive', 'game-changing gadget', 'cast iron care', 'knife skills basics'] },
      { label: 'Ingredient swaps', hooks: ['healthier substitute', 'budget replacement', 'allergy-friendly', 'pantry staple magic', 'season extension'] },
    ]},
    { label: 'Food Industry', sub: [
      { label: 'Restaurant secrets', hooks: ['markup exposed', 'menu psychology', 'kitchen reality', 'chef confession', 'Michelin politics'] },
      { label: 'Food safety', hooks: ['what they hide', 'recall patterns', 'processing truth', 'label decoding', 'inspection failures'] },
    ]},
  ],
  travel_adventure: [
    { label: 'Destinations', sub: [
      { label: 'Hidden gems', hooks: ['locals only', 'skip the tourist trap', 'no crowds', 'off the map', 'secret beach'] },
      { label: 'Disappearing places', hooks: ['climate threatened', 'overtourism damage', 'last chance', 'before it\'s gone', 'rising seas'] },
    ]},
    { label: 'Travel Tips', sub: [
      { label: 'Budget hacks', hooks: ['exact costs', 'flight trick', 'accommodation hack', 'free experiences', 'money saved'] },
      { label: 'Cultural insights', hooks: ['don\'t do this', 'local custom', 'misunderstood culture', 'real experience', 'what tourists miss'] },
    ]},
    { label: 'Extreme Travel', sub: [
      { label: 'Adventure sports', hooks: ['adrenaline rush', 'near-death experience', 'hardest trek', 'survival challenge', 'bucket list extreme'] },
      { label: 'Forbidden places', hooks: ['illegal to visit', 'restricted zone', 'abandoned city', 'military exclusion', 'permit impossible'] },
    ]},
    { label: 'Travel Stories', sub: [
      { label: 'Gone wrong', hooks: ['stranded abroad', 'scam exposed', 'border nightmare', 'lost everything', 'emergency evacuation'] },
      { label: 'Life-changing trips', hooks: ['quit my job after', 'perspective shift', 'unexpected connection', 'moved there permanently', 'changed everything'] },
      { label: 'Solo travel', hooks: ['safety truth', 'loneliness myth', 'confidence builder', 'female solo tips', 'first trip guide'] },
    ]},
    { label: 'Geography & Nature', sub: [
      { label: 'Natural wonders', hooks: ['formed over millions', 'only place on Earth', 'geological mystery', 'seasonal phenomenon', 'scale is unreal'] },
      { label: 'Climate destinations', hooks: ['visit before gone', 'best time to go', 'weather window', 'off-season advantage', 'seasonal migration'] },
    ]},
  ],
  psychology_mindblown: [
    { label: 'Cognitive Science', sub: [
      { label: 'Biases', hooks: ['you do this daily', 'brain tricked', 'decision hijacked', 'invisible influence', 'can\'t unsee'] },
      { label: 'Experiments', hooks: ['disturbing results', 'ethical controversy', 'replicated recently', 'subjects didn\'t know', 'changed the field'] },
    ]},
    { label: 'Human Behavior', sub: [
      { label: 'Dark patterns', hooks: ['designed to manipulate', 'apps exploit this', 'advertising trick', 'social media hook', 'breaking free'] },
      { label: 'Body language', hooks: ['tells everything', 'liars do this', 'power signal', 'attraction sign', 'micro-expression'] },
    ]},
    { label: 'Social Psychology', sub: [
      { label: 'Group dynamics', hooks: ['mob mentality trigger', 'bystander effect real', 'conformity pressure', 'authority obedience', 'groupthink disaster'] },
      { label: 'Persuasion tactics', hooks: ['Cialdini principle', 'anchoring effect', 'scarcity illusion', 'reciprocity trap', 'commitment escalation'] },
    ]},
    { label: 'Neuroscience', sub: [
      { label: 'Brain hacks', hooks: ['dopamine system gamed', 'neuroplasticity proof', 'memory palace works', 'attention hijacked', 'flow state trigger'] },
      { label: 'Consciousness', hooks: ['hard problem unsolved', 'free will debate', 'split brain experiment', 'perception constructed', 'reality is filtered'] },
      { label: 'Addiction science', hooks: ['reward pathway hijacked', 'phone addiction real', 'sugar vs cocaine study', 'habit loop biology', 'recovery neuroscience'] },
    ]},
    { label: 'Personality & Identity', sub: [
      { label: 'Personality science', hooks: ['big five explained', 'MBTI debunked', 'dark triad signs', 'trait vs state', 'personality change proof'] },
      { label: 'Self-deception', hooks: ['Dunning-Kruger reality', 'confirmation bias daily', 'motivated reasoning', 'hindsight illusion', 'narrative fallacy'] },
    ]},
  ],
  space_cosmos: [
    { label: 'Deep Space', sub: [
      { label: 'Cosmic objects', hooks: ['would destroy Earth', 'bigger than solar system', 'defies physics', 'just discovered', 'heading toward us'] },
      { label: 'Scale & distance', hooks: ['mind-breaking number', 'impossible to comprehend', 'light years explained', 'visible universe edge', 'pale blue dot'] },
    ]},
    { label: 'Space Exploration', sub: [
      { label: 'Missions', hooks: ['still out there', 'lost contact', 'unexpected discovery', 'photos released', 'what they found'] },
      { label: 'Future', hooks: ['Mars colony timeline', 'warp drive theory', 'alien signal', 'space mining', 'generation ships'] },
    ]},
    { label: 'Alien Life', sub: [
      { label: 'Biosignatures', hooks: ['detected on moon', 'atmospheric anomaly', 'Fermi paradox update', 'habitable zone found', 'ocean world candidate'] },
      { label: 'SETI & signals', hooks: ['unexplained signal', 'Wow signal update', 'technosignature search', 'laser communication', 'radio telescope find'] },
    ]},
    { label: 'Solar System', sub: [
      { label: 'Planets & moons', hooks: ['hidden ocean confirmed', 'atmosphere surprise', 'ring system mystery', 'volcanic moon active', 'subsurface lake'] },
      { label: 'Asteroids & comets', hooks: ['near miss alert', 'deflection test', 'composition surprise', 'mining target', 'origin clue'] },
      { label: 'The Sun', hooks: ['solar storm warning', 'cycle prediction', 'coronal mystery', 'magnetic field flip', 'energy output change'] },
    ]},
    { label: 'Astrophysics', sub: [
      { label: 'Black holes', hooks: ['information paradox', 'closest one found', 'merger detected', 'inside a black hole', 'Hawking radiation proof'] },
      { label: 'Dark matter & energy', hooks: ['73% unknown', 'detection attempt', 'alternative theory', 'mapping the invisible', 'expansion accelerating'] },
    ]},
  ],
  animals_wildlife: [
    { label: 'Animal Abilities', sub: [
      { label: 'Superpowers', hooks: ['impossible ability', 'defies biology', 'scientists baffled', 'evolved solution', 'superhuman sense'] },
      { label: 'Intelligence', hooks: ['tool use documented', 'problem solving', 'emotional capacity', 'communication decoded', 'self-awareness test'] },
    ]},
    { label: 'Nature Stories', sub: [
      { label: 'Survival', hooks: ['against all odds', 'near extinction', 'comeback story', 'adaptation in action', 'last of its kind'] },
      { label: 'Symbiosis', hooks: ['unlikely partners', 'mutual dependence', 'cross-species bond', 'ecosystem role', 'removal catastrophe'] },
    ]},
    { label: 'Ocean Life', sub: [
      { label: 'Deep sea creatures', hooks: ['just discovered', 'alien-like appearance', 'extreme adaptation', 'bioluminescent display', 'crushing depth survivor'] },
      { label: 'Marine behavior', hooks: ['migration mystery', 'pod communication', 'hunting strategy', 'coral intelligence', 'whale culture'] },
    ]},
    { label: 'Animal vs Human', sub: [
      { label: 'Senses & abilities', hooks: ['sees what we can\'t', 'predicts earthquakes', 'navigates magnetically', 'infrared vision', 'echolocation precision'] },
      { label: 'Record holders', hooks: ['fastest on Earth', 'longest migration', 'deepest diver', 'strongest pound-for-pound', 'oldest living'] },
      { label: 'Domestication', hooks: ['wolves to dogs', 'cat chose us', 'still wild inside', 'selective breeding cost', 'feral reversal'] },
    ]},
    { label: 'Conservation', sub: [
      { label: 'Species at risk', hooks: ['functionally extinct', 'poaching crisis', 'habitat shrinking', 'population collapse', 'last one alive'] },
      { label: 'Success stories', hooks: ['pulled from brink', 'rewilding works', 'population recovered', 'breeding program success', 'ecosystem restored'] },
    ]},
  ],
  sports_athletes: [
    { label: 'Athletes', sub: [
      { label: 'Defining moments', hooks: ['career-defining play', 'clutch performance', 'under pressure', 'comeback story', 'record broken'] },
      { label: 'Behind the scenes', hooks: ['training secret', 'diet revealed', 'mental game', 'injury comeback', 'what nobody sees'] },
    ]},
    { label: 'Competition', sub: [
      { label: 'Rivalries', hooks: ['greatest rivalry', 'personal feud', 'head to head stats', 'mutual respect', 'final showdown'] },
      { label: 'Records & stats', hooks: ['impossible stat', 'never broken', 'closest ever', 'most dominant', 'statistical anomaly'] },
    ]},
    { label: 'Sports Science', sub: [
      { label: 'Performance', hooks: ['legal edge', 'altitude training', 'nutrition protocol', 'recovery tech', 'mental visualization'] },
      { label: 'Physics of sport', hooks: ['perfect angle', 'spin explained', 'drag reduction', 'biomechanics secret', 'equipment evolution'] },
    ]},
    { label: 'Sports Business', sub: [
      { label: 'Money in sports', hooks: ['contract breakdown', 'endorsement empire', 'team valuation', 'salary cap hack', 'draft economics'] },
      { label: 'Controversy', hooks: ['doping scandal', 'referee scandal', 'corruption exposed', 'match fixing', 'cover-up revealed'] },
      { label: 'Franchise stories', hooks: ['dynasty built', 'worst trade ever', 'rebuilding success', 'relocation drama', 'expansion impact'] },
    ]},
    { label: 'Underdog Stories', sub: [
      { label: 'Cinderella runs', hooks: ['nobody gave them a chance', 'impossible bracket', 'amateur beats pro', 'smallest team won', 'dream season'] },
      { label: 'Olympic moments', hooks: ['gold medal upset', 'national pride', 'political boycott', 'record shattered', 'emotional podium'] },
    ]},
  ],
  education_learning: [
    { label: 'Misconceptions', sub: [
      { label: 'Things school got wrong', hooks: ['textbook lied', 'oversimplified', 'recently disproven', 'real story', 'updated science'] },
      { label: 'Common mistakes', hooks: ['everyone believes this', 'sounds right but wrong', 'expert disagrees', 'data shows otherwise', 'myth busted'] },
    ]},
    { label: 'Learning', sub: [
      { label: 'Explained simply', hooks: ['in 60 seconds', 'finally makes sense', 'one analogy', 'visual explanation', 'ELI5'] },
      { label: 'Hidden connections', hooks: ['two things connected', 'same principle', 'pattern revealed', 'never noticed', 'mind blown'] },
    ]},
    { label: 'Language & Words', sub: [
      { label: 'Etymology', hooks: ['word origin surprises', 'borrowed from where', 'meaning changed completely', 'dead language trace', 'slang became official'] },
      { label: 'Communication', hooks: ['persuasion technique', 'rhetoric trick', 'argument fallacy', 'framing effect', 'word choice matters'] },
    ]},
    { label: 'Math & Logic', sub: [
      { label: 'Math in real life', hooks: ['probability intuition wrong', 'statistics lie how', 'geometry in nature', 'algorithm decides', 'pattern everywhere'] },
      { label: 'Paradoxes & puzzles', hooks: ['sounds impossible', 'logic breaks down', 'counterintuitive proof', 'unsolved problem', 'elegant solution'] },
      { label: 'Critical thinking', hooks: ['logical fallacy spotted', 'correlation trap', 'survivorship bias', 'sample size matters', 'base rate neglect'] },
    ]},
    { label: 'Systems & Society', sub: [
      { label: 'How things work', hooks: ['everyday thing explained', 'infrastructure hidden', 'supply chain exposed', 'system design genius', 'engineering marvel'] },
      { label: 'Education systems', hooks: ['country comparison', 'outdated curriculum', 'alternative method', 'Finland model', 'self-taught proof'] },
    ]},
  ],
  paranormal_ufo: [
    { label: 'UFO Sightings', sub: [
      { label: 'Mass sightings', hooks: ['hundreds witnessed', 'multiple cameras', 'military confirmed', 'no explanation', 'happened again'] },
      { label: 'Government files', hooks: ['just declassified', 'redacted sections', 'whistleblower testimony', 'Pentagon admits', 'footage released'] },
    ]},
    { label: 'Paranormal', sub: [
      { label: 'Evidence', hooks: ['caught on camera', 'scientific instrument', 'repeated at same location', 'multiple witnesses', 'thermal imaging'] },
      { label: 'Encounters', hooks: ['credible witness', 'military pilot', 'scientist report', 'documented case', 'physical evidence'] },
    ]},
    { label: 'Abductions & Contact', sub: [
      { label: 'Abduction accounts', hooks: ['hypnosis regression', 'matching descriptions', 'physical marks', 'missing time', 'repeat experiencer'] },
      { label: 'Close encounters', hooks: ['landing trace found', 'radiation detected', 'animal reaction', 'electromagnetic effects', 'ground marking'] },
    ]},
    { label: 'Cryptids & Creatures', sub: [
      { label: 'Sighting reports', hooks: ['new footage analyzed', 'trail camera capture', 'sonar reading', 'footprint cast', 'DNA sample tested'] },
      { label: 'Regional legends', hooks: ['indigenous knowledge', 'centuries of sightings', 'geographic pattern', 'habitat theory', 'seasonal appearance'] },
      { label: 'Scientific investigation', hooks: ['zoologist involved', 'expedition mounted', 'environmental DNA', 'species possibility', 'fossil connection'] },
    ]},
    { label: 'Dimensional & Metaphysical', sub: [
      { label: 'Interdimensional theory', hooks: ['portal evidence', 'dimensional bleed', 'physics allows it', 'repeating location', 'witness pattern'] },
      { label: 'Psychic phenomena', hooks: ['remote viewing program', 'precognition study', 'telepathy experiment', 'CIA document', 'university research'] },
    ]},
  ],

  // ── DIY & Crafts ──
  diy_crafts: [
    { label: 'Home Hacks', sub: [
      { label: 'Budget renovations', hooks: ['$5 hack', '$500 look', 'landlord approved', 'no tools needed', 'one-day transform'] },
      { label: 'Furniture flips', hooks: ['dumpster find', 'thrift store gold', 'paint trick', 'hardware swap', 'before and after'] },
      { label: 'Organization', hooks: ['dollar store bins', 'space saver', 'hidden storage', 'garage reveal', 'pantry makeover'] },
    ]},
    { label: 'Creative Projects', sub: [
      { label: 'Resin & epoxy', hooks: ['river table', 'jewelry making', 'clear cast', 'glow in dark', 'first attempt'] },
      { label: 'Woodworking', hooks: ['beginner project', 'power tool guide', 'joint technique', 'finishing secret', 'scrap wood'] },
    ]},
    { label: 'Tool Tips', sub: [
      { label: 'Power tools', hooks: ['drill guide', 'saw technique', 'sander trick', 'router basics', 'safety first'] },
      { label: 'Adhesives & finishes', hooks: ['hot glue wrong', 'epoxy vs super glue', 'stain technique', 'spray paint pro', 'seal everything'] },
    ]},
  ],

  // ── Parenting ──
  parenting: [
    { label: 'Baby & Toddler', sub: [
      { label: 'Sleep training', hooks: ['one weird trick', 'schedule that worked', 'night weaning', 'regression survival', 'contact nap escape'] },
      { label: 'Feeding', hooks: ['baby led weaning', 'picky eater hack', 'meal prep toddler', 'allergy introduction', 'high chair cleanup'] },
      { label: 'Development', hooks: ['milestone myth', 'screen time truth', 'language explosion', 'motor skills game', 'sensory play'] },
    ]},
    { label: 'School Age', sub: [
      { label: 'Homework battles', hooks: ['one sentence fix', 'motivation secret', 'attention span', 'learning style', 'reward system'] },
      { label: 'Social skills', hooks: ['friendship struggles', 'bully response', 'confidence builder', 'empathy teaching', 'boundary setting'] },
    ]},
    { label: 'Parent Self-Care', sub: [
      { label: 'Mental health', hooks: ['burnout signs', 'mom rage truth', 'therapy normalized', 'alone time guilt', 'comparison trap'] },
      { label: 'Relationship', hooks: ['date night hack', 'communication fix', 'co-parenting win', 'division of labor', 'intimacy after kids'] },
    ]},
  ],

  // ── Crypto ──
  crypto: [
    { label: 'Market Analysis', sub: [
      { label: 'On-chain signals', hooks: ['whale alert', 'exchange outflow', 'accumulation pattern', 'dormant wallet', 'network activity'] },
      { label: 'Technical analysis', hooks: ['pattern forming', 'support break', 'volume divergence', 'RSI signal', 'moving average cross'] },
      { label: 'Macro trends', hooks: ['halving effect', 'institutional flow', 'regulation impact', 'ETF movement', 'correlation break'] },
    ]},
    { label: 'Alt Season', sub: [
      { label: 'Layer 1 picks', hooks: ['Ethereum killer', 'Solana update', 'new L1 launch', 'TVL explosion', 'developer activity'] },
      { label: 'DeFi & tokens', hooks: ['yield farming', 'airdrop strategy', 'governance vote', 'protocol revenue', 'token unlock'] },
    ]},
    { label: 'Education', sub: [
      { label: 'Beginner guides', hooks: ['first crypto buy', 'wallet setup', 'seed phrase truth', 'exchange comparison', 'tax basics'] },
      { label: 'Security', hooks: ['scam warning', 'rug pull signs', 'cold storage', 'phishing attack', 'smart contract risk'] },
    ]},
  ],
};

// ─── Wizard Step indicators ───────────────────────────────────────────────────
const STEPS = [
  { num: 1, label: 'Script' },
  { num: 2, label: 'Voice & Audio' },
  { num: 3, label: 'Visuals' },
  { num: 4, label: 'Captions' },
  { num: 5, label: 'Generate' },
];

// ─── Styles (inline, no Tailwind dependency for core layout) ──────────────────
const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#FAFAFA',
    color: '#1a1a1a',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  stepBar: {
    display: 'flex',
    gap: '4px',
    padding: '16px 24px',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E5E7EB',
  },
  stepPill: (active) => ({
    padding: '8px 20px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    backgroundColor: active ? '#111827' : '#F3F4F6',
    color: active ? '#FFFFFF' : '#6B7280',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: 'none',
  }),
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '12px',
    marginTop: '28px',
  },
  sectionSubtitle: {
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '16px',
    marginTop: '-8px',
  },
  nicheGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '8px',
  },
  nicheCard: (selected) => ({
    padding: '12px',
    borderRadius: '8px',
    border: selected ? '2px solid #111827' : '1px solid #E5E7EB',
    backgroundColor: selected ? '#F9FAFB' : '#FFFFFF',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
  }),
  nicheIcon: {
    fontSize: '24px',
    marginBottom: '4px',
  },
  nicheName: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#374151',
  },
  frameworkList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  frameworkCard: (selected) => ({
    padding: '14px 16px',
    borderRadius: '8px',
    border: selected ? '2px solid #111827' : '1px solid #E5E7EB',
    backgroundColor: selected ? '#F9FAFB' : '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }),
  frameworkName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '2px',
  },
  frameworkDesc: {
    fontSize: '12px',
    color: '#6B7280',
    marginBottom: '6px',
  },
  frameworkMeta: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: '#9CA3AF',
  },
  badge: (color) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: color || '#F3F4F6',
    color: '#374151',
  }),
  topicSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  topicCategory: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  },
  topicCategoryLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  topicAngle: (selected) => ({
    padding: '8px 14px',
    borderRadius: '6px',
    border: selected ? '2px solid #111827' : '1px solid #E5E7EB',
    backgroundColor: selected ? '#F0F0F0' : '#FAFAFA',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#374151',
    fontWeight: selected ? 600 : 400,
  }),
  hookChip: (selected) => ({
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '14px',
    fontSize: '12px',
    border: selected ? '2px solid #111827' : '1px solid #D1D5DB',
    backgroundColor: selected ? '#111827' : '#FFFFFF',
    color: selected ? '#FFFFFF' : '#374151',
    cursor: 'pointer',
    margin: '3px',
    fontWeight: selected ? 500 : 400,
  }),
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    marginTop: '8px',
  },
  toggle: (on) => ({
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    backgroundColor: on ? '#111827' : '#D1D5DB',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    flexShrink: 0,
    border: 'none',
  }),
  toggleDot: (on) => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: '2px',
    left: on ? '22px' : '2px',
    transition: 'left 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  }),
  customTopicInput: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: '#FFFFFF',
    outline: 'none',
    marginTop: '8px',
  },
  generateBtn: (enabled) => ({
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: enabled ? '#111827' : '#D1D5DB',
    color: enabled ? '#FFFFFF' : '#9CA3AF',
    fontSize: '15px',
    fontWeight: 600,
    cursor: enabled ? 'pointer' : 'default',
    marginTop: '24px',
    transition: 'all 0.15s ease',
  }),
  scriptPreview: {
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    backgroundColor: '#FFFFFF',
    marginTop: '16px',
    whiteSpace: 'pre-wrap',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#374151',
    minHeight: '200px',
  },
  sceneBeat: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '4px 0',
    fontSize: '12px',
    color: '#6B7280',
  },
  sceneBeatDot: (color) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color || '#9CA3AF',
    flexShrink: 0,
  }),
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ShortsBuilderPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 state
  const [selectedNiche, setSelectedNiche] = useState(null);
  // selectedFramework removed — production engine uses Fichtean Curve + niche blueprints
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedAngle, setSelectedAngle] = useState(null);
  const [selectedHooks, setSelectedHooks] = useState([]);
  const [customTopic, setCustomTopic] = useState('');
  const [creativeMode, setCreativeMode] = useState(false);
  // Brand Mode
  const [brandMode, setBrandMode] = useState(false);
  const [brandProfiles, setBrandProfiles] = useState([]);
  const [selectedBrandProfile, setSelectedBrandProfile] = useState(null);
  const [selectedContentAngle, setSelectedContentAngle] = useState(null);
  const [brandTopics, setBrandTopics] = useState([]);
  const [brandTopicsLoading, setBrandTopicsLoading] = useState(false);
  const [scriptGenerated, setScriptGenerated] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [researchResults, setResearchResults] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [discoverResults, setDiscoverResults] = useState(null);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [selectedResearchTopic, setSelectedResearchTopic] = useState(null);

  // Step 2 state
  const [voiceProvider, setVoiceProvider] = useState('gemini'); // 'gemini' | 'elevenlabs' | 'maya' | 'minimax'
  const [mayaVoiceDesc, setMayaVoiceDesc] = useState(''); // Maya: text description of voice
  const [minimaxVoiceId, setMinimaxVoiceId] = useState(''); // MiniMax: custom voice ID (from clone/design)
  const [voiceCloneUrl, setVoiceCloneUrl] = useState(''); // URL of audio to clone
  const [voiceDesignDesc, setVoiceDesignDesc] = useState(''); // Description for voice design
  const [voiceCloneLoading, setVoiceCloneLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [previewingVoice, setPreviewingVoice] = useState(null);
  const [previewAudioRef] = useState({ current: null });
  const [voiceStyle, setVoiceStyle] = useState(null);
  const [customVoiceStyle, setCustomVoiceStyle] = useState('');
  const [noVoice, setNoVoice] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState('1.15');
  const [voiceoverGenerated, setVoiceoverGenerated] = useState(false);
  const [voiceoverLoading, setVoiceoverLoading] = useState(false);
  // Music & Timing (appears after voiceover)
  const [musicGenerated, setMusicGenerated] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicMood, setMusicMood] = useState('');
  const [musicVolume, setMusicVolume] = useState(15);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [sfxGenerated, setSfxGenerated] = useState(false);
  const [sfxLoading, setSfxLoading] = useState(false);
  // Timing keyframes (word alignment)
  const [timingGenerated, setTimingGenerated] = useState(false); // LEGACY — kept for draft compat
  const [timingLoading, setTimingLoading] = useState(false); // LEGACY
  const [ttsDuration, setTtsDuration] = useState(null); // Actual voiceover duration in seconds

  // Step 1 extra
  const [selectedBrandKit, setSelectedBrandKit] = useState(null);

  // Step 3 state
  const [continuityMode, setContinuityMode] = useState('continuous');
  const [videoGenMode, setVideoGenMode] = useState('i2v');
  const [selectedVideoModel, setSelectedVideoModel] = useState(null);
  const [selectedVisualStyle, setSelectedVisualStyle] = useState(null);
  const [selectedLighting, setSelectedLighting] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [visualIntensity, setVisualIntensity] = useState(6);

  // Step 4 state
  const [captionStyle, setCaptionStyle] = useState('word_pop');
  const [captionPosition, setCaptionPosition] = useState('bottom');
  const [captionColor, setCaptionColor] = useState('white');
  const [captionHighlight, setCaptionHighlight] = useState('yellow');
  const [noCaptions, setNoCaptions] = useState(false);

  // Step 5 state
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generatedClips, setGeneratedClips] = useState([]);
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);

  // Script
  const [script, setScript] = useState(null);

  // API-wired state
  const [brandKits, setBrandKits] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [showDraftList, setShowDraftList] = useState(false);
  const [draftList, setDraftList] = useState([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [voiceoverUrl, setVoiceoverUrl] = useState(null);
  const [musicUrl, setMusicUrl] = useState(null);
  const [sfxUrl, setSfxUrl] = useState(null);
  const [timingBlocks, setTimingBlocks] = useState([]);
  const [selectedImageModel, setSelectedImageModel] = useState('fal_nano_banana');

  // Get topics for selected niche
  const topics = useMemo(() => {
    if (!selectedNiche) return [];
    return TOPIC_SUGGESTIONS[selectedNiche] || DEFAULT_TOPICS;
  }, [selectedNiche]);

  // Load brand kits + brand profiles on mount
  useEffect(() => {
    apiFetch('/api/brand/kit').then(r => r.json()).then(data => {
      if (data.brands) setBrandKits(data.brands);
    }).catch(() => {});
    apiFetch('/api/brands/profiles').then(r => r.json()).then(data => {
      if (data.profiles) setBrandProfiles(data.profiles);
    }).catch(() => {});
  }, []);

  // Auto-default music mood when entering step 2
  useEffect(() => {
    if (currentStep === 2 && selectedNiche && !musicMood) {
      setMusicMood(NICHE_MUSIC_MOODS[selectedNiche] || '');
    }
  }, [currentStep, selectedNiche]);

  // Auto-generate music + SFX after voiceover completes (they're compulsory)
  useEffect(() => {
    if (!voiceoverGenerated || !script || !selectedNiche) return;
    if (musicGenerated && sfxGenerated) return; // Already done

    const autoGenerate = async () => {
      // ── Auto-generate music if not done ──
      if (!musicGenerated && !musicLoading) {
        setMusicLoading(true);
        try {
          const musicDirection = script?.music ? `${script.music.style}. ${script.music.energy_curve}` : NICHE_MUSIC_MOODS[selectedNiche] || '';
          const scriptDuration = ttsDuration
            || (script?.total_word_count ? Math.ceil(script.total_word_count / 2.5) + 5 : null)
            || script?.beats?.reduce((sum, b) => sum + (b.estimated_duration_seconds || 8), 0)
            || 75;
          const targetMusicDuration = Math.max(30, Math.min(180, Math.ceil(scriptDuration)));

          // Check library first
          let foundUrl = null;
          try {
            const searchRes = await apiFetch('/api/audio/library', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'search', type: 'music', niche: selectedNiche, query: musicDirection, limit: 1 }),
            });
            const searchData = await searchRes.json();
            if (searchData.results?.length > 0) {
              foundUrl = searchData.results[0].url;
              apiFetch('/api/audio/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'increment', id: searchData.results[0].id }),
              }).catch(() => {});
            }
          } catch (_) {}

          if (foundUrl) {
            setMusicUrl(foundUrl);
          } else {
            const res = await apiFetch('/api/workbench/music', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ niche: selectedNiche, duration: targetMusicDuration, music_model: 'elevenlabs', music_mood: musicDirection }),
            });
            const data = await res.json();
            if (data.audio_url) {
              setMusicUrl(data.audio_url);
              apiFetch('/api/audio/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save', type: 'music', url: data.audio_url, prompt: musicDirection, niche: selectedNiche, duration: targetMusicDuration, style: script?.music?.style || '', bpm: script?.music?.bpm_range || null }),
              }).catch(() => {});
            }
          }
          setMusicGenerated(true);
          setMusicMood(musicDirection);
        } catch (err) {
          console.error('Auto music generation failed:', err);
        } finally {
          setMusicLoading(false);
        }
      }
    };

    autoGenerate();
  }, [voiceoverGenerated, musicGenerated, script, selectedNiche, ttsDuration]);

  // Auto-generate SFX after music completes
  useEffect(() => {
    if (!musicGenerated || !script?.beats || sfxGenerated || sfxLoading || !sfxEnabled) return;

    const autoGenerateSfx = async () => {
      setSfxLoading(true);
      try {
        const beats = script.beats || [];
        const sfxResults = [];
        let cumulativeTime = 0;

        for (const beat of beats) {
          const cues = beat.sfx_cues || [];
          if (cues.length === 0) {
            cumulativeTime += (beat.estimated_duration_seconds || 5);
            continue;
          }
          const cuePrompt = cues.join(', ') + `, ${NICHES.find(n => n.id === selectedNiche)?.name || ''} style`;
          const sfxDuration = Math.min(beat.estimated_duration_seconds || 4, 6);

          // Check library first
          let sfxUrl = null;
          try {
            const searchRes = await apiFetch('/api/audio/library', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'search', type: 'sfx', niche: selectedNiche, query: cues.join(' '), limit: 1 }),
            });
            const searchData = await searchRes.json();
            if (searchData.results?.length > 0) {
              sfxUrl = searchData.results[0].url;
              apiFetch('/api/audio/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'increment', id: searchData.results[0].id }),
              }).catch(() => {});
            }
          } catch (_) {}

          if (!sfxUrl) {
            const res = await apiFetch('/api/workbench/sfx', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ niche: selectedNiche, duration: sfxDuration, prompt: cuePrompt }),
            });
            const data = await res.json();
            sfxUrl = data.sfx_url || null;
            if (sfxUrl) {
              apiFetch('/api/audio/library', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save', type: 'sfx', url: sfxUrl, prompt: cuePrompt, niche: selectedNiche, beat_type: beat.beat_type, duration: sfxDuration }),
              }).catch(() => {});
            }
          }

          if (sfxUrl) {
            sfxResults.push({ url: sfxUrl, offset: cumulativeTime, duration: sfxDuration, beat: beat.beat_type });
          }
          cumulativeTime += (beat.estimated_duration_seconds || 5);
        }

        setSfxUrl(sfxResults.length > 0 ? sfxResults[0].url : null);
        setScript(prev => ({ ...prev, _sfx_tracks: sfxResults }));
        setSfxGenerated(true);
      } catch (err) {
        console.error('Auto SFX generation failed:', err);
      } finally {
        setSfxLoading(false);
      }
    };

    autoGenerateSfx();
  }, [musicGenerated, sfxGenerated, script?.beats, selectedNiche, sfxEnabled]);

  // ── Save Draft ──────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const fullState = {
        // Config
        selectedNiche, customTopic, selectedHooks, creativeMode, selectedBrandKit,
        voiceProvider, selectedVoice, voiceStyle, customVoiceStyle, voiceSpeed, noVoice,
        musicMood, musicVolume, sfxEnabled,
        continuityMode, videoGenMode, selectedVideoModel, selectedImageModel,
        selectedVisualStyle, selectedLighting, selectedMood, visualIntensity,
        captionStyle, captionPosition, captionHighlight, noCaptions,
        currentStep,
        // Generated assets — these are what cost money and MUST be preserved
        script, voiceoverUrl, musicUrl, sfxUrl, timingBlocks,
        generatedClips, finalVideoUrl: finalVideoUrl || null,
        // Topic & research context
        topic: script?.topic || customTopic || selectedHooks?.join(' + ') || 'Untitled',
      };
      const res = await apiFetch('/api/workbench/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, state: fullState }),
      });
      const data = await res.json();
      if (data.draft_id) {
        setDraftId(data.draft_id);
        setLastAutoSave(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Save draft failed:', err);
    } finally {
      setSavingDraft(false);
    }
  };

  // ── Load Draft ──────────────────────────────────────────────────────────────
  const handleLoadDraft = async (loadDraftId) => {
    try {
      const res = await apiFetch('/api/workbench/load-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: loadDraftId }),
      });
      const data = await res.json();
      if (!data.draft) return;

      const s = data.draft.storyboard_json;
      setDraftId(loadDraftId);
      setShowDraftList(false);

      // Restore config
      if (s.selectedNiche) setSelectedNiche(s.selectedNiche);
      if (s.customTopic) setCustomTopic(s.customTopic);
      if (s.selectedHooks) setSelectedHooks(s.selectedHooks);
      if (s.creativeMode !== undefined) setCreativeMode(s.creativeMode);
      if (s.selectedBrandKit) setSelectedBrandKit(s.selectedBrandKit);
      if (s.voiceProvider) setVoiceProvider(s.voiceProvider);
      if (s.selectedVoice) setSelectedVoice(s.selectedVoice);
      if (s.voiceStyle) setVoiceStyle(s.voiceStyle);
      if (s.customVoiceStyle) setCustomVoiceStyle(s.customVoiceStyle);
      if (s.voiceSpeed) setVoiceSpeed(s.voiceSpeed);
      if (s.noVoice !== undefined) setNoVoice(s.noVoice);
      if (s.musicMood) setMusicMood(s.musicMood);
      if (s.musicVolume !== undefined) setMusicVolume(s.musicVolume);
      if (s.sfxEnabled !== undefined) setSfxEnabled(s.sfxEnabled);
      if (s.continuityMode) setContinuityMode(s.continuityMode);
      if (s.videoGenMode) setVideoGenMode(s.videoGenMode);
      if (s.selectedVideoModel) setSelectedVideoModel(s.selectedVideoModel);
      if (s.selectedImageModel) setSelectedImageModel(s.selectedImageModel);
      if (s.selectedVisualStyle) setSelectedVisualStyle(s.selectedVisualStyle);
      if (s.selectedLighting) setSelectedLighting(s.selectedLighting);
      if (s.selectedMood) setSelectedMood(s.selectedMood);
      if (s.visualIntensity !== undefined) setVisualIntensity(s.visualIntensity);
      if (s.captionStyle) setCaptionStyle(s.captionStyle);
      if (s.captionPosition) setCaptionPosition(s.captionPosition);
      if (s.captionHighlight) setCaptionHighlight(s.captionHighlight);
      if (s.noCaptions !== undefined) setNoCaptions(s.noCaptions);

      // Restore generated assets
      if (s.script) { setScript(s.script); setScriptGenerated(true); }
      if (s.voiceoverUrl || data.draft.voiceover_url) {
        setVoiceoverUrl(s.voiceoverUrl || data.draft.voiceover_url);
        setVoiceoverGenerated(true);
      }
      if (s.musicUrl || data.draft.music_url) {
        setMusicUrl(s.musicUrl || data.draft.music_url);
        setMusicGenerated(true);
      }
      if (s.sfxUrl) { setSfxUrl(s.sfxUrl); setSfxGenerated(true); }
      if (s.timingBlocks) { setTimingBlocks(s.timingBlocks); setTimingGenerated(true); }
      if (s.generatedClips) setGeneratedClips(s.generatedClips);
      if (s.finalVideoUrl || data.draft.final_video_url) {
        setFinalVideoUrl(s.finalVideoUrl || data.draft.final_video_url);
        setGenerationComplete(true);
      }

      // Jump to the step they were on
      if (s.currentStep) setCurrentStep(s.currentStep);
    } catch (err) {
      console.error('Load draft failed:', err);
    }
  };

  // ── Auto-save every 60s when there's meaningful state ─────────────────────
  useEffect(() => {
    if (!script && !voiceoverUrl) return; // Nothing worth saving yet
    const interval = setInterval(() => {
      handleSaveDraft();
    }, 60000);
    return () => clearInterval(interval);
  }, [script, voiceoverUrl, musicUrl, generatedClips, draftId]);

  const handleResearchTopics = async () => {
    setResearchLoading(true);
    setDiscoverResults(null);
    try {
      const res = await apiFetch('/api/campaigns/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: selectedNiche, topic: customTopic || selectedHooks.join(' + '), count: 5 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResearchResults(data.stories || []);
    } catch (err) {
      console.error('Research failed:', err);
    } finally {
      setResearchLoading(false);
    }
  };

  const handleDiscoverTopics = async () => {
    setDiscoverLoading(true);
    setResearchResults(null);
    try {
      const res = await apiFetch('/api/shorts/discover-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche: selectedNiche, count: 8 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDiscoverResults(data.topics || []);
    } catch (err) {
      console.error('Discover failed:', err);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleSelectResearchTopic = (topic) => {
    setSelectedResearchTopic(topic);
    setCustomTopic(topic.title);
    setSelectedHooks([]);
  };

  const handleHookToggle = (hook) => {
    setSelectedHooks(prev =>
      prev.includes(hook) ? prev.filter(h => h !== hook) : [...prev, hook]
    );
  };

  // Niche default music moods
  const NICHE_MUSIC_MOODS = {
    ai_tech_news: 'Futuristic ambient electronic, pulsing synths, tech-forward, driving energy',
    finance_money: 'Confident, clean corporate energy, subtle tension, modern minimal',
    motivation_self_help: 'Inspirational cinematic build, piano and strings, emotionally uplifting',
    scary_horror: 'Dark ambient, low drones, creeping tension, horror atmospherics',
    history_did_you_know: 'Documentary orchestral, thoughtful and measured, period-appropriate hints',
    true_crime: 'Dark investigation, subtle tension, brooding bass, noir atmosphere',
    science_nature: 'Wonder and discovery, gentle orchestral, curious and awe-inspiring',
    relationships_dating: 'Warm acoustic, gentle pop, emotional and intimate',
    health_fitness: 'Upbeat motivational, clean energy, gym-ready tempo',
    gaming_popculture: 'Energetic chiptune-influenced, exciting, playful electronic',
    conspiracy_mystery: 'Deep mystery, layered tension, conspiratorial undertones, building unease',
    business_entrepreneur: 'Confident corporate, clean modern, forward momentum',
    food_cooking: 'Warm, inviting, acoustic and cheerful, kitchen energy',
    travel_adventure: 'Adventurous and expansive, world music hints, uplifting',
    psychology_mindblown: 'Mind-bending, thoughtful electronic, revelation moments, subtle wonder',
    space_cosmos: 'Epic cosmic, vast ambient synths, awe and scale, Interstellar-inspired',
    animals_wildlife: 'Nature documentary, gentle and majestic, organic instruments',
    sports_athletes: 'High energy, adrenaline-pumping, stadium anthem feel',
    education_learning: 'Curious and engaging, friendly tempo, clean and bright',
    paranormal_ufo: 'Eerie ambient, X-Files undertones, otherworldly, unsettling calm',
    diy_crafts: 'Upbeat indie, acoustic guitar, light electronic beats, craft-montage energy',
    parenting: 'Gentle acoustic, soft piano, warm lo-fi, emotional but never saccharine',
    crypto: 'Dark electronic, pulsing bass, cyberpunk undertones, tension-building synths',
  };

  const canGenerate = brandMode
    ? (selectedBrandProfile && customTopic.trim())
    : (selectedNiche && (selectedHooks.length > 0 || customTopic.trim() || selectedResearchTopic));

  const handleGenerateScript = async () => {
    if (!canGenerate) return;
    setScriptLoading(true);
    setScriptGenerated(false);
    setScript(null);
    const niche = NICHES.find(n => n.id === selectedNiche);
    const topicStr = selectedResearchTopic ? selectedResearchTopic.title : (customTopic.trim() || selectedHooks.join(' + '));
    const storyContext = selectedResearchTopic?.story_context || selectedResearchTopic?.description || window.__brandTopicContext || '';

    try {
      // Production engine generates complete production package (Fichtean Curve beats + visuals + SFX)
      const requestBody = {
        niche: selectedNiche,
        topic: topicStr,
        story_context: storyContext,
        creative_mode: creativeMode,
      };
      // Brand mode: pass brand profile and content angle
      if (brandMode && selectedBrandProfile) {
        requestBody.brand_profile_id = selectedBrandProfile.id;
        if (selectedContentAngle) {
          requestBody.content_angle_id = selectedContentAngle.id;
        }
      }
      const res = await apiFetch('/api/campaigns/preview-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // The production_package has the full beat structure with visuals, SFX, music
      const pkg = data.production_package;
      const scriptData = data.script || data;

      if (pkg) {
        // New production engine format — beats with visual prompts
        setScript({
          niche: niche.name,
          topic: topicStr,
          creative: creativeMode,
          storyContext,
          title: pkg.title,
          description: pkg.description,
          hashtags: pkg.hashtags,
          narration_full: pkg.narration_full,
          total_word_count: pkg.total_word_count,
          visual_style: pkg.visual_style,
          music: pkg.music,
          loop_note: pkg.loop_note,
          beats: pkg.beats,
          _production_package: pkg,
        });
      } else {
        // Fallback to legacy format
        const scenes = (scriptData.scenes || []).map((s, i) => ({
          label: s.scene_label || `Scene ${i + 1}`,
          narration: s.narration_segment || '',
          visualDescription: s.visual_prompt || '',
          duration: `${s.duration_seconds || 5}s`,
        }));
        setScript({
          niche: niche.name,
          topic: topicStr,
          creative: creativeMode,
          storyContext,
          narration_full: scriptData.narration_full || scenes.map(s => s.narration).join(' '),
          scenes,
          beats: null,
        });
      }
      setScriptGenerated(true);
    } catch (err) {
      console.error('Script generation failed:', err);
    } finally {
      setScriptLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Shorts Builder</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer',
            }}
            onClick={async () => {
              setShowDraftList(!showDraftList);
              if (!showDraftList) {
                try {
                  const res = await apiFetch('/api/workbench/list-drafts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  });
                  const data = await res.json();
                  setDraftList(data.items || []);
                } catch (err) { console.error('List drafts failed:', err); }
              }
            }}
          >
            {showDraftList ? 'Close' : 'Load Draft'}
          </button>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #111827',
              backgroundColor: savingDraft ? '#F3F4F6' : '#FFFFFF',
              fontSize: '13px',
              fontWeight: 500,
              color: '#111827',
              cursor: savingDraft ? 'not-allowed' : 'pointer',
            }}
            onClick={() => handleSaveDraft()}
            disabled={savingDraft}
          >
            {savingDraft ? 'Saving...' : 'Save Draft'}
          </button>
          {draftId && <span style={{ fontSize: '11px', color: '#059669' }}>Saved{lastAutoSave ? ` ${lastAutoSave}` : ''}</span>}
        </div>
      </div>

      {/* Draft List Dropdown */}
      {showDraftList && (
        <div style={{
          maxWidth: '900px', margin: '0 auto', padding: '0 24px',
        }}>
          <div style={{
            border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: '#FFFFFF',
            padding: '16px', marginBottom: '16px', maxHeight: '300px', overflowY: 'auto',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>
              Recent Drafts
            </div>
            {draftList.length === 0 && (
              <div style={{ fontSize: '13px', color: '#9CA3AF', padding: '12px 0' }}>No drafts saved yet.</div>
            )}
            {draftList.map(d => (
              <div
                key={d.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: '6px', cursor: 'pointer',
                  border: draftId === d.id ? '2px solid #111827' : '1px solid #F3F4F6',
                  backgroundColor: draftId === d.id ? '#F9FAFB' : '#FFFFFF',
                  marginBottom: '6px',
                }}
                onClick={() => handleLoadDraft(d.id)}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                    {d.topic || 'Untitled'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>
                    {d.niche ? NICHES.find(n => n.id === d.niche)?.name : ''} {d.has_video ? '· Video ready' : d.status === 'in_progress' ? '· In progress' : ''}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {new Date(d.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step Bar */}
      <div style={styles.stepBar}>
        {STEPS.map(s => (
          <button
            key={s.num}
            style={styles.stepPill(s.num === currentStep)}
            onClick={() => setCurrentStep(s.num)}
          >
            {s.num}. {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={styles.content}>
        {currentStep === 1 && (
          <>
            {/* ── Brand Mode Toggle — TOP of Step 1 ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '14px 16px', borderRadius: '8px',
              backgroundColor: brandMode ? '#EDE9FE' : '#F9FAFB',
              border: brandMode ? '1px solid #C4B5FD' : '1px solid #E5E7EB',
              marginBottom: '20px',
            }}>
              <button
                style={styles.toggle(brandMode)}
                onClick={() => {
                  const next = !brandMode;
                  setBrandMode(next);
                  if (!next) {
                    setSelectedBrandProfile(null);
                    setSelectedContentAngle(null);
                    setBrandTopics([]);
                  } else {
                    // Clear niche selection — brand profile will set it
                    setSelectedNiche(null);
                    setScript(null);
                    setScriptGenerated(false);
                  }
                }}
              >
                <div style={styles.toggleDot(brandMode)} />
              </button>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: brandMode ? '#5B21B6' : '#111827' }}>
                  Brand Mode {brandMode ? 'ON' : 'OFF'}
                </div>
                <div style={{ fontSize: '12px', color: brandMode ? '#7C3AED' : '#6B7280', marginTop: '2px' }}>
                  {brandMode
                    ? 'Select a brand profile below. The brand is never mentioned — expertise demonstrated through insight quality.'
                    : 'Generate content for a channel. Toggle on to create brand editorial content instead.'}
                </div>
              </div>
            </div>

            {/* ── Brand Mode: Profile + Angle + Topics ── */}
            {brandMode && (
              <div style={{ marginBottom: '20px' }}>
                {/* Brand Profile Selector */}
                <div style={styles.sectionTitle}>Select Brand Profile</div>
                <div style={styles.sectionSubtitle}>The brand's niche, audience, and content strategy are defined in the profile.</div>

                {brandProfiles.length === 0 ? (
                  <div style={{ padding: '20px', borderRadius: '8px', backgroundColor: '#FAFAFA', border: '1px dashed #D1D5DB', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>No brand profiles yet</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Create one in the Brand Profiles section to get started.</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                    {brandProfiles.map(bp => (
                      <div
                        key={bp.id}
                        style={{
                          padding: '14px', borderRadius: '8px', cursor: 'pointer',
                          border: selectedBrandProfile?.id === bp.id ? '2px solid #5B21B6' : '1px solid #E5E7EB',
                          backgroundColor: selectedBrandProfile?.id === bp.id ? '#F5F3FF' : '#FFFFFF',
                        }}
                        onClick={async () => {
                          try {
                            const res = await apiFetch(`/api/brands/profiles/${bp.id}`);
                            const data = await res.json();
                            if (data.profile) {
                              const profile = data.profile;
                              setSelectedBrandProfile(profile);
                              setSelectedContentAngle(null);
                              setBrandTopics([]);
                              // Set niche from the brand profile
                              if (profile.primary_niche) {
                                setSelectedNiche(profile.primary_niche);
                              }
                            }
                          } catch (_) {
                            setSelectedBrandProfile(bp);
                            if (bp.primary_niche) setSelectedNiche(bp.primary_niche);
                          }
                          setTimeout(() => {
                            const el = document.getElementById('brand-angle-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{bp.brand_name}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{bp.brand_domain}</div>
                        <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>
                          Niche: {NICHES.find(n => n.id === bp.primary_niche)?.name || bp.primary_niche}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content Angle Selector */}
                {selectedBrandProfile && (selectedBrandProfile.content_angles || []).length > 0 && (
                  <div id="brand-angle-section" style={{ marginTop: '20px' }}>
                    <div style={styles.sectionTitle}>Content Angle</div>
                    <div style={styles.sectionSubtitle}>Each angle is an emotional lens for storytelling. Auto-rotate balances them by weight.</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <div
                        style={{
                          padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                          border: !selectedContentAngle ? '2px solid #5B21B6' : '1px solid #D1D5DB',
                          backgroundColor: !selectedContentAngle ? '#5B21B6' : '#FFFFFF',
                          color: !selectedContentAngle ? '#FFFFFF' : '#374151',
                        }}
                        onClick={() => setSelectedContentAngle(null)}
                      >
                        Auto-rotate
                      </div>
                      {(selectedBrandProfile.content_angles || []).map(angle => {
                        const driverIcons = { fear: '😨', identity: '🪞', curiosity: '🔍', injustice: '⚖️', wonder: '✨' };
                        const selected = selectedContentAngle?.id === angle.id;
                        return (
                          <div
                            key={angle.id}
                            style={{
                              padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                              border: selected ? '2px solid #5B21B6' : '1px solid #D1D5DB',
                              backgroundColor: selected ? '#5B21B6' : '#FFFFFF',
                              color: selected ? '#FFFFFF' : '#374151',
                            }}
                            onClick={() => setSelectedContentAngle(angle)}
                          >
                            {driverIcons[angle.emotional_driver] || '📌'} {angle.name} <span style={{ opacity: 0.7 }}>({angle.weight}%)</span>
                          </div>
                        );
                      })}
                    </div>
                    {selectedContentAngle && (
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#F5F3FF' }}>
                        <strong>{selectedContentAngle.name}:</strong> {selectedContentAngle.description || selectedContentAngle.lens}
                      </div>
                    )}
                  </div>
                )}

                {/* Generate Brand Topics */}
                {selectedBrandProfile && (
                  <div style={{ marginTop: '20px' }}>
                    <div style={styles.sectionTitle}>Topic Ideas</div>
                    <div style={styles.sectionSubtitle}>AI-generated topics based on the brand's domain, audience pain points, and current industry news.</div>
                    <button
                      style={{
                        padding: '10px 20px', borderRadius: '8px', border: 'none',
                        backgroundColor: '#5B21B6', color: '#FFFFFF', fontSize: '13px',
                        fontWeight: 600, cursor: brandTopicsLoading ? 'not-allowed' : 'pointer',
                        opacity: brandTopicsLoading ? 0.7 : 1,
                      }}
                      disabled={brandTopicsLoading}
                      onClick={async () => {
                        setBrandTopicsLoading(true);
                        try {
                          const res = await apiFetch('/api/brands/generate-topics', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              brand_profile_id: selectedBrandProfile.id,
                              content_angle_id: selectedContentAngle?.id || null,
                              count: 8,
                              include_news: true,
                            }),
                          });
                          const data = await res.json();
                          if (data.topics) setBrandTopics(data.topics);
                          if (data.angle && !selectedContentAngle) {
                            // Show which angle was auto-selected
                            console.log(`Auto-rotated to angle: ${data.angle.name} (${data.angle.emotional_driver})`);
                          }
                        } catch (err) {
                          console.error('Topic generation failed:', err);
                        } finally {
                          setBrandTopicsLoading(false);
                        }
                      }}
                    >
                      {brandTopicsLoading ? 'Generating topics...' : 'Generate Topic Ideas'}
                    </button>

                    {brandTopics.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {brandTopics.map((topic, i) => {
                          const isSelected = customTopic === topic.title;
                          return (
                            <div
                              key={i}
                              style={{
                                padding: '14px', borderRadius: '8px', cursor: 'pointer',
                                border: isSelected ? '2px solid #5B21B6' : '1px solid #E5E7EB',
                                backgroundColor: isSelected ? '#F5F3FF' : '#FFFFFF',
                              }}
                              onClick={() => {
                                setCustomTopic(topic.title);
                                window.__brandTopicContext = topic.story_context;
                                setTimeout(() => {
                                  const el = document.getElementById('generate-script-section');
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                              }}
                            >
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                                {topic.title}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                                {topic.hook_concept}
                              </div>
                              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '6px' }}>
                                <strong>Payoff:</strong> {topic.payoff}
                              </div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                                  backgroundColor: topic.is_evergreen ? '#DCFCE7' : '#FEF3C7',
                                  color: topic.is_evergreen ? '#166534' : '#92400E', fontWeight: 500,
                                }}>
                                  {topic.is_evergreen ? 'Evergreen' : 'Topical'}
                                </span>
                                <span style={{ fontSize: '10px', color: '#A78BFA', fontWeight: 500 }}>
                                  {topic.emotional_driver}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Niche Selection (hidden in Brand Mode — brand profile sets the niche) ── */}
            {!brandMode && (
              <>
                <div style={styles.sectionTitle}>Choose a Niche</div>
                <div style={styles.sectionSubtitle}>This determines your topics, voice style, visual mood, and production direction.</div>
            <div style={styles.nicheGrid}>
              {NICHES.map(n => (
                <div
                  key={n.id}
                  style={styles.nicheCard(selectedNiche === n.id)}
                  onClick={() => {
                    setSelectedNiche(n.id);
                    setExpandedCategory(null);
                    setSelectedAngle(null);
                    setSelectedHooks([]);
                    setScriptGenerated(false);
                    setScript(null);
                    // Auto-scroll to topic section after niche selection
                    setTimeout(() => {
                      const topicSection = document.getElementById('topic-section');
                      if (topicSection) topicSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                >
                  <div style={styles.nicheIcon}>{n.icon}</div>
                  <div style={styles.nicheName}>{n.name}</div>
                </div>
              ))}
            </div>
              </>
            )}

            {/* ── Topic Selection (shown in both modes — brand topics in brand mode, niche topics in channel mode) ── */}
            {selectedNiche && !brandMode && (
              <>
                <div id="topic-section" style={styles.sectionTitle}>Choose a Topic</div>
                <div style={styles.sectionSubtitle}>
                  Select a category, then an angle, then one or more hooks. Or type your own.
                </div>
                <div style={styles.topicSection}>
                  {topics.map((cat, ci) => (
                    <div key={ci}>
                      <div
                        style={styles.topicCategory}
                        onClick={() => setExpandedCategory(expandedCategory === ci ? null : ci)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={styles.topicCategoryLabel}>{cat.label}</span>
                          <span style={{ fontSize: '18px', color: '#9CA3AF' }}>{expandedCategory === ci ? '−' : '+'}</span>
                        </div>
                      </div>
                      {expandedCategory === ci && (
                        <div style={{ paddingLeft: '16px', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {cat.sub.map((angle, ai) => (
                            <div key={ai}>
                              <div
                                style={styles.topicAngle(selectedAngle === `${ci}-${ai}`)}
                                onClick={() => {
                                  setSelectedAngle(`${ci}-${ai}`);
                                  setSelectedHooks([]);
                                }}
                              >
                                {angle.label}
                              </div>
                              {selectedAngle === `${ci}-${ai}` && angle.hooks && (
                                <div style={{ paddingLeft: '12px', paddingTop: '6px', paddingBottom: '4px' }}>
                                  {angle.hooks.map((hook, hi) => (
                                    <span
                                      key={hi}
                                      style={styles.hookChip(selectedHooks.includes(hook))}
                                      onClick={() => handleHookToggle(hook)}
                                    >
                                      {hook}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <input
                  style={styles.customTopicInput}
                  placeholder="Or type your own topic..."
                  value={customTopic}
                  onChange={e => {
                    setCustomTopic(e.target.value);
                    if (selectedResearchTopic) setSelectedResearchTopic(null);
                  }}
                />

                {/* ── Research Topics ── */}
                <div style={styles.sectionTitle}>Find Topics</div>
                <div style={styles.sectionSubtitle}>
                  Two ways to find great topics. Use either or both — then pick one to build your Short around.
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  {/* Research: Real News */}
                  <div style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      Research Real Stories
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px', lineHeight: '1.4' }}>
                      Searches <strong>Google News in real-time</strong> for your niche, then uses GPT to structure each story with an angle, context, and viral potential. Best for <strong>news-driven, factual content</strong> based on things that actually happened.
                    </div>
                    <button
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: '1px solid #111827',
                        backgroundColor: '#FFFFFF',
                        color: '#111827',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                      }}
                      onClick={handleResearchTopics}
                      disabled={researchLoading}
                    >
                      {researchLoading ? 'Searching news...' : 'Find Real Stories'}
                    </button>
                  </div>

                  {/* Discover: AI-Ranked Suggestions */}
                  <div style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      Discover Trending Topics
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px', lineHeight: '1.4' }}>
                      AI scans <strong>multiple trend sources</strong> (Google Trends, Reddit, X, YouTube) and <strong>scores each topic</strong> by trending strength and competition level. Best for <strong>evergreen and viral-potential content</strong> ideas.
                    </div>
                    <button
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: '1px solid #111827',
                        backgroundColor: '#FFFFFF',
                        color: '#111827',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%',
                      }}
                      onClick={handleDiscoverTopics}
                      disabled={discoverLoading}
                    >
                      {discoverLoading ? 'Discovering...' : 'Discover Trending Topics'}
                    </button>
                  </div>
                </div>

                {/* Research Results — Real Stories */}
                {researchResults && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
                      Real Stories (from Google News + GPT)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {researchResults.map((topic, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '8px',
                            border: selectedResearchTopic === topic ? '2px solid #111827' : '1px solid #E5E7EB',
                            backgroundColor: selectedResearchTopic === topic ? '#F9FAFB' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onClick={() => handleSelectResearchTopic(topic)}
                        >
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                            {topic.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                            {topic.summary}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#059669', fontWeight: 500 }}>
                              Angle: {topic.angle}
                            </span>
                            <span style={{ color: '#7C3AED', fontWeight: 500 }}>
                              Viral: {topic.why_viral}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discover Results — AI-Ranked Topics */}
                {discoverResults && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
                      Trending Topics (AI-scored)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {discoverResults.map((topic, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '8px',
                            border: selectedResearchTopic?.title === topic.title ? '2px solid #111827' : '1px solid #E5E7EB',
                            backgroundColor: selectedResearchTopic?.title === topic.title ? '#F9FAFB' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onClick={() => handleSelectResearchTopic({ title: topic.title, summary: topic.summary || topic.description || '', story_context: topic.story_context || topic.summary || topic.description || '' })}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', flex: 1 }}>
                              {topic.title}
                            </div>
                            <div style={{
                              padding: '2px 10px',
                              borderRadius: '10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              backgroundColor: topic.trending_score === 'high' ? '#DCFCE7' : topic.trending_score === 'medium' ? '#FEF3C7' : '#F3F4F6',
                              color: topic.trending_score === 'high' ? '#166534' : topic.trending_score === 'medium' ? '#92400E' : '#6B7280',
                              marginLeft: '12px',
                              whiteSpace: 'nowrap',
                            }}>
                              {topic.trending_score || 'trending'}
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                            {topic.summary || topic.description || ''}
                          </div>
                          {topic.angle && (
                            <div style={{ fontSize: '12px', color: '#059669', marginBottom: '6px', fontWeight: 500 }}>
                              Angle: {topic.angle}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                            <span style={{
                              fontWeight: 500,
                              color: topic.competition_score === 'low' ? '#059669' : topic.competition_score === 'medium' ? '#D97706' : '#DC2626',
                            }}>
                              Competition: {topic.competition_score || topic.competition || '—'}
                            </span>
                            {topic.why_viral && (
                              <span style={{ color: '#7C3AED', fontWeight: 500 }}>
                                {topic.why_viral}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Brand Mode section moved to top of Step 1 — before niche selection ── */}
            {false && selectedNiche && (
              <>
                <div style={styles.sectionTitle}>Brand Mode (OLD LOCATION — REMOVED)</div>
                <div style={styles.toggleRow}>
                  <button
                    style={styles.toggle(brandMode)}
                    onClick={() => {
                      setBrandMode(!brandMode);
                      if (brandMode) {
                        setSelectedBrandProfile(null);
                        setSelectedContentAngle(null);
                        setBrandTopics([]);
                      }
                    }}
                  >
                    <div style={styles.toggleDot(brandMode)} />
                  </button>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                      Brand Content
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      Generate editorial content for a brand. The brand is never mentioned — expertise is demonstrated through the quality of the insight.
                    </div>
                  </div>
                </div>

                {/* Brand Mode — Profile + Angle selection */}
                {brandMode && (
                  <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FAFAFA', marginTop: '12px' }}>
                    {/* Brand Profile Selector */}
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Select Brand Profile</div>
                    {brandProfiles.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#9CA3AF', padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                        No brand profiles yet. Create one in Settings → Brand Profiles.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {brandProfiles.map(bp => (
                          <div
                            key={bp.id}
                            style={{
                              padding: '10px 14px', borderRadius: '6px', cursor: 'pointer',
                              border: selectedBrandProfile?.id === bp.id ? '2px solid #111827' : '1px solid #E5E7EB',
                              backgroundColor: selectedBrandProfile?.id === bp.id ? '#FFFFFF' : '#FAFAFA',
                            }}
                            onClick={async () => {
                              // Load full profile
                              try {
                                const res = await apiFetch(`/api/brands/profiles/${bp.id}`);
                                const data = await res.json();
                                if (data.profile) {
                                  setSelectedBrandProfile(data.profile);
                                  setSelectedContentAngle(null);
                                  setBrandTopics([]);
                                }
                              } catch (_) { setSelectedBrandProfile(bp); }
                            }}
                          >
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{bp.brand_name}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{bp.brand_domain}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content Angle Selector */}
                    {selectedBrandProfile && (selectedBrandProfile.content_angles || []).length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Content Angle</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <div
                            style={{
                              padding: '6px 12px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                              border: !selectedContentAngle ? '2px solid #111827' : '1px solid #D1D5DB',
                              backgroundColor: !selectedContentAngle ? '#111827' : '#FFFFFF',
                              color: !selectedContentAngle ? '#FFFFFF' : '#374151',
                            }}
                            onClick={() => setSelectedContentAngle(null)}
                          >
                            Auto-rotate
                          </div>
                          {(selectedBrandProfile.content_angles || []).map(angle => {
                            const driverIcons = { fear: '😨', identity: '🪞', curiosity: '🔍', injustice: '⚖️', wonder: '✨' };
                            return (
                              <div
                                key={angle.id}
                                style={{
                                  padding: '6px 12px', borderRadius: '16px', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                                  border: selectedContentAngle?.id === angle.id ? '2px solid #111827' : '1px solid #D1D5DB',
                                  backgroundColor: selectedContentAngle?.id === angle.id ? '#111827' : '#FFFFFF',
                                  color: selectedContentAngle?.id === angle.id ? '#FFFFFF' : '#374151',
                                }}
                                onClick={() => setSelectedContentAngle(angle)}
                              >
                                {driverIcons[angle.emotional_driver] || '📌'} {angle.name} ({angle.weight}%)
                              </div>
                            );
                          })}
                        </div>
                        {selectedContentAngle && (
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px', fontStyle: 'italic' }}>
                            {selectedContentAngle.description || selectedContentAngle.lens}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Generate Brand Topics */}
                    {selectedBrandProfile && (
                      <div style={{ marginTop: '16px' }}>
                        <button
                          style={{
                            padding: '8px 16px', borderRadius: '6px', border: 'none',
                            backgroundColor: '#111827', color: '#FFFFFF', fontSize: '12px',
                            fontWeight: 600, cursor: brandTopicsLoading ? 'not-allowed' : 'pointer',
                            opacity: brandTopicsLoading ? 0.7 : 1,
                          }}
                          disabled={brandTopicsLoading}
                          onClick={async () => {
                            setBrandTopicsLoading(true);
                            try {
                              const res = await apiFetch('/api/brands/generate-topics', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  brand_profile_id: selectedBrandProfile.id,
                                  content_angle_id: selectedContentAngle?.id || null,
                                  count: 8,
                                  include_news: true,
                                }),
                              });
                              const data = await res.json();
                              if (data.topics) setBrandTopics(data.topics);
                            } catch (err) {
                              console.error('Topic generation failed:', err);
                            } finally {
                              setBrandTopicsLoading(false);
                            }
                          }}
                        >
                          {brandTopicsLoading ? 'Generating topics...' : 'Generate Topic Ideas'}
                        </button>

                        {/* Brand Topic List */}
                        {brandTopics.length > 0 && (
                          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {brandTopics.map((topic, i) => (
                              <div
                                key={i}
                                style={{
                                  padding: '12px 14px', borderRadius: '6px', cursor: 'pointer',
                                  border: customTopic === topic.title ? '2px solid #111827' : '1px solid #E5E7EB',
                                  backgroundColor: customTopic === topic.title ? '#F9FAFB' : '#FFFFFF',
                                }}
                                onClick={() => {
                                  setCustomTopic(topic.title);
                                  // Store story context for the production engine
                                  setScript(prev => prev ? { ...prev, _brand_story_context: topic.story_context } : null);
                                  // Store it in a way the script generator can access
                                  window.__brandTopicContext = topic.story_context;
                                }}
                              >
                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                                  {topic.title}
                                </div>
                                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                                  {topic.hook_concept}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{
                                    fontSize: '10px', padding: '2px 6px', borderRadius: '8px',
                                    backgroundColor: topic.is_evergreen ? '#DCFCE7' : '#FEF3C7',
                                    color: topic.is_evergreen ? '#166534' : '#92400E',
                                  }}>
                                    {topic.is_evergreen ? 'Evergreen' : 'Topical'}
                                  </span>
                                  <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
                                    {topic.emotional_driver}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Creative Mode Toggle ── */}
            {selectedNiche && (
              <>
                <div style={styles.sectionTitle}>Creative Mode</div>
                <div style={styles.toggleRow}>
                  <button
                    style={styles.toggle(creativeMode)}
                    onClick={() => setCreativeMode(!creativeMode)}
                  >
                    <div style={styles.toggleDot(creativeMode)} />
                  </button>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                      Creative Visual Storytelling
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      Uses vivid, cinematic visual descriptions and narrative techniques — but keeps all facts accurate. No fabrication or hallucination.
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Brand Kit (Optional) ── */}
            {selectedNiche && (
              <>
                <div style={styles.sectionTitle}>Brand Kit (Optional)</div>
                <div style={styles.sectionSubtitle}>
                  Apply brand guidelines to all generation — images, video, voice tone, and captions.
                </div>
                <select
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    color: '#111827',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%236B7280\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                  }}
                  value={selectedBrandKit || ''}
                  onChange={e => setSelectedBrandKit(e.target.value || null)}
                >
                  <option value="">No Brand Kit — generate without brand constraints</option>
                  {brandKits.map(bk => (
                    <option key={bk.id} value={bk.id}>{bk.brand_name} — {bk.taglines?.[0] || bk.style_preset || ''}</option>
                  ))}
                </select>
              </>
            )}

            {/* ── Generate Script Button ── */}
            <div id="generate-script-section"></div>
            {(selectedNiche || (brandMode && selectedBrandProfile)) && (
              <>
                <button
                  style={{
                    ...styles.generateBtn(canGenerate && !scriptLoading),
                    opacity: scriptLoading ? 0.7 : undefined,
                    cursor: scriptLoading ? 'not-allowed' : undefined,
                  }}
                  onClick={handleGenerateScript}
                  disabled={!canGenerate || scriptLoading}
                >
                  {scriptLoading ? 'Generating Production Package...' : 'Generate Script'}
                </button>
                {scriptLoading && (
                  <div style={{
                    textAlign: 'center', padding: '24px', color: '#6B7280', fontSize: '13px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                  }}>
                    <div style={{
                      width: '32px', height: '32px', border: '3px solid #E5E7EB',
                      borderTopColor: '#111827', borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    <div>Building your Fichtean Curve production package...</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      Generating beats, visual prompts, SFX cues, and music direction. This takes 15-30 seconds.
                    </div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}
              </>
            )}

            {/* ── Production Package Preview ── */}
            {script && (
              <>
                {/* Title & Meta */}
                <div style={styles.sectionTitle}>{script.title || 'Generated Script'}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                  {script.niche} → {script.topic}
                  {script.creative ? ' (Creative Mode)' : ''}
                  {script._production_package?.brand_mode && (
                    <span style={{ marginLeft: '8px', padding: '2px 6px', borderRadius: '8px', fontSize: '10px', fontWeight: 600, backgroundColor: '#EDE9FE', color: '#5B21B6' }}>
                      Brand Mode: {script._production_package?.content_angle?.name || 'Auto'}
                    </span>
                  )}
                </div>
                {/* Brand violation warnings */}
                {script._production_package?.brand_violations?.length > 0 && (
                  <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', marginBottom: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', marginBottom: '4px' }}>Brand Compliance Issues</div>
                    {script._production_package.brand_violations.map((v, i) => (
                      <div key={i} style={{ fontSize: '11px', color: '#991B1B', marginBottom: '2px' }}>
                        {v.severity === 'critical' ? '🔴' : '🟡'} {v.message}
                      </div>
                    ))}
                  </div>
                )}
                {script.total_word_count && (
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                    {script.total_word_count} words · ~{Math.round(script.total_word_count / 2.5)}s estimated
                  </div>
                )}
                {script.description && (
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>{script.description}</div>
                )}

                {/* Music Direction */}
                {script.music && (
                  <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400E', marginBottom: '4px' }}>Music Direction</div>
                    <div style={{ fontSize: '12px', color: '#78350F' }}>
                      {script.music.style} · BPM: {script.music.bpm_range}
                    </div>
                    <div style={{ fontSize: '11px', color: '#92400E', marginTop: '4px' }}>{script.music.energy_curve}</div>
                  </div>
                )}

                {/* Visual Style */}
                {script.visual_style && (
                  <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#EDE9FE', border: '1px solid #DDD6FE', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#5B21B6', marginBottom: '4px' }}>Visual Style</div>
                    <div style={{ fontSize: '12px', color: '#6D28D9' }}>{script.visual_style}</div>
                  </div>
                )}

                {/* Beats */}
                <div style={styles.scriptPreview}>
                  {(script.beats || script.scenes || []).map((beat, i) => {
                    const isBeat = !!beat.beat_type;
                    const beatLabel = isBeat
                      ? beat.beat_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                      : (beat.label || `Scene ${i + 1}`);
                    const beatColors = {
                      hook: '#DC2626', context: '#2563EB', escalation_1: '#D97706',
                      escalation_2: '#EA580C', climax: '#7C3AED', kicker: '#059669', buffer: '#6B7280',
                    };
                    const beatColor = isBeat ? (beatColors[beat.beat_type] || '#6B7280') : '#6B7280';

                    return (
                      <div key={i} style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: i < (script.beats || script.scenes || []).length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                        {/* Beat Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
                            fontSize: '11px', fontWeight: 700, color: '#FFFFFF',
                            backgroundColor: beatColor, textTransform: 'uppercase', letterSpacing: '0.5px',
                          }}>
                            {beatLabel}
                          </span>
                          {beat.estimated_duration_seconds && (
                            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>~{beat.estimated_duration_seconds}s</span>
                          )}
                          {isBeat && beat.transition_out && beat.transition_out !== 'hard_cut' && (
                            <span style={{ fontSize: '10px', color: '#D1D5DB', fontStyle: 'italic' }}>
                              → {beat.transition_out.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>

                        {/* Voiceover / Narration */}
                        <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#111827', marginBottom: '10px' }}>
                          {isBeat ? beat.voiceover : beat.narration}
                        </div>

                        {/* Text Overlay */}
                        {isBeat && beat.text_overlay && (
                          <div style={{
                            display: 'inline-block', padding: '4px 12px', borderRadius: '4px',
                            backgroundColor: '#111827', color: '#FFFFFF', fontSize: '13px', fontWeight: 700,
                            marginBottom: '10px',
                          }}>
                            {beat.text_overlay}
                          </div>
                        )}

                        {/* Visual Prompts */}
                        {isBeat && beat.visual_prompts && beat.visual_prompts.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            {beat.visual_prompts.map((vp, vi) => (
                              <div key={vi} style={{
                                padding: '10px 14px', borderRadius: '6px', marginBottom: '6px',
                                backgroundColor: '#F5F3FF', border: '1px solid #EDE9FE',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#7C3AED', textTransform: 'uppercase' }}>
                                    Visual {beat.visual_prompts.length > 1 ? `${vi + 1}/${beat.visual_prompts.length}` : ''} · {vp.duration_hint_seconds}s
                                  </span>
                                  <span style={{ fontSize: '10px', color: '#A78BFA' }}>
                                    {vp.camera_motion}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#5B21B6', lineHeight: '1.5' }}>
                                  {vp.prompt}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Legacy visual description */}
                        {!isBeat && beat.visualDescription && (
                          <div style={{ fontSize: '12px', color: '#7C3AED', fontStyle: 'italic', marginBottom: '8px' }}>
                            {beat.visualDescription}
                          </div>
                        )}

                        {/* SFX Cues */}
                        {isBeat && beat.sfx_cues && beat.sfx_cues.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                            {beat.sfx_cues.map((sfx, si) => (
                              <span key={si} style={{
                                display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                                fontSize: '10px', fontWeight: 500, backgroundColor: '#FEF3C7', color: '#92400E',
                                border: '1px solid #FDE68A',
                              }}>
                                SFX: {sfx}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Music Event */}
                        {isBeat && beat.music_event && (
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
                            fontSize: '10px', fontWeight: 500, backgroundColor: '#DBEAFE', color: '#1E40AF',
                            border: '1px solid #BFDBFE',
                          }}>
                            Music: {beat.music_event}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Loop Note */}
                {script.loop_note && (
                  <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#065F46', marginBottom: '2px' }}>Loop</div>
                    <div style={{ fontSize: '12px', color: '#047857' }}>{script.loop_note}</div>
                  </div>
                )}

                {/* Hashtags */}
                {script.hashtags && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
                    {script.hashtags.map((tag, i) => (
                      <span key={i} style={{ fontSize: '11px', color: '#6B7280' }}>#{tag}</span>
                    ))}
                  </div>
                )}

                <button
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#111827',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '16px',
                  }}
                  onClick={() => { setCurrentStep(2); window.scrollTo(0, 0); }}
                >
                  Continue to Step 2: Voice
                </button>
              </>
            )}
          </>
        )}

        {/* Placeholder for other steps */}
        {currentStep === 2 && (
          <>
            {/* ── No Voice Toggle ── */}
            <div style={styles.toggleRow}>
              <button
                style={styles.toggle(noVoice)}
                onClick={() => setNoVoice(!noVoice)}
              >
                <div style={styles.toggleDot(noVoice)} />
              </button>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                  No Voiceover
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                  Skip voiceover entirely — visuals and music only.
                </div>
              </div>
            </div>

            {!noVoice && (
              <>
                {/* ── Voice Provider ── */}
                <div style={styles.sectionTitle}>Voice Provider</div>
                <div style={styles.sectionSubtitle}>Choose which TTS engine generates your voiceover.</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'maya', name: 'Maya1', desc: 'Describe any voice + 17 emotion tags inline', badge: 'Best' },
                    { id: 'minimax', name: 'MiniMax 2.8', desc: 'Precise pauses, interjections, voice clone/design', badge: 'Pro' },
                    { id: 'gemini', name: 'Gemini TTS', desc: '30 preset voices, natural prosody, style instructions', badge: null },
                    { id: 'elevenlabs', name: 'ElevenLabs', desc: '22 preset voices, expressive, emotional range', badge: null },
                  ].map(p => (
                    <div
                      key={p.id}
                      style={{
                        flex: 1,
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: voiceProvider === p.id ? '2px solid #111827' : '1px solid #E5E7EB',
                        backgroundColor: voiceProvider === p.id ? '#F9FAFB' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                      onClick={() => { setVoiceProvider(p.id); setSelectedVoice(null); }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{p.name}</span>
                        {p.badge && (
                          <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '8px', backgroundColor: '#DCFCE7', color: '#166534' }}>
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>{p.desc}</div>
                    </div>
                  ))}
                </div>

                {/* ── Maya Voice Description ── */}
                {voiceProvider === 'maya' && (
                  <>
                    <div style={styles.sectionTitle}>Describe Your Voice</div>
                    <div style={styles.sectionSubtitle}>
                      Describe age, gender, accent, pitch, pace, tone, intensity. The more specific, the better. Supports inline emotion tags in the script: {'<excited>'}, {'<whisper>'}, {'<sigh>'}, {'<sarcastic>'}, etc.
                    </div>
                    <textarea
                      style={{
                        width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB',
                        fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', minHeight: '80px',
                      }}
                      placeholder="e.g. A 30-year-old male with a warm baritone, slight urgency, conversational and authoritative, like a knowledgeable friend explaining something important"
                      value={mayaVoiceDesc}
                      onChange={e => { setMayaVoiceDesc(e.target.value); setSelectedVoice('maya_custom'); }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {[
                        { label: 'Authoritative Male', value: 'A 35-year-old male narrator with a deep, authoritative baritone. Measured pace, slight intensity, like a documentary narrator who truly cares about the subject.' },
                        { label: 'Warm Female', value: 'A 28-year-old woman with a warm, clear voice. Medium pitch, conversational pace, genuine and empathetic, like a trusted friend sharing something important.' },
                        { label: 'Intense Storyteller', value: 'A male narrator in his 40s with a slightly raspy, low voice. Slow and deliberate delivery, building tension, like a campfire storyteller.' },
                        { label: 'Energetic Young', value: 'A 25-year-old with a bright, energetic voice. Fast pace, high energy, enthusiastic without being obnoxious, like an excited friend who just discovered something wild.' },
                        { label: 'Calm Expert', value: 'A gender-neutral voice, 30s, calm and precise. Medium-low pitch, measured pace, clinical but warm, like a scientist explaining a breakthrough to a curious audience.' },
                      ].map(preset => (
                        <button
                          key={preset.label}
                          style={{
                            padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500,
                            border: mayaVoiceDesc === preset.value ? '2px solid #111827' : '1px solid #D1D5DB',
                            backgroundColor: mayaVoiceDesc === preset.value ? '#F9FAFB' : '#FFFFFF',
                            color: '#374151', cursor: 'pointer',
                          }}
                          onClick={() => { setMayaVoiceDesc(preset.value); setSelectedVoice('maya_custom'); }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* ── MiniMax Voice Selection ── */}
                {voiceProvider === 'minimax' && (
                  <>
                    <div style={styles.sectionTitle}>MiniMax Voice</div>
                    <div style={styles.sectionSubtitle}>
                      Use a preset voice, clone from audio, or design from description. Supports precise pauses {'<#1.5#>'} and interjections (laughs), (sighs).
                    </div>
                    {/* Preset voices */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                      {[
                        { id: 'Wise_Woman', desc: 'Wise, authoritative female' },
                        { id: 'Young_Knight', desc: 'Confident young male' },
                        { id: 'Determined_Man', desc: 'Strong, driven male' },
                        { id: 'Gentle_Woman', desc: 'Soft, caring female' },
                        { id: 'Calm_Woman', desc: 'Composed, steady female' },
                        { id: 'Inspirational_girl', desc: 'Uplifting young female' },
                      ].map(v => (
                        <div
                          key={v.id}
                          style={{
                            padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                            border: selectedVoice === v.id ? '2px solid #111827' : '1px solid #E5E7EB',
                            backgroundColor: selectedVoice === v.id ? '#F9FAFB' : '#FFFFFF',
                          }}
                          onClick={() => { setSelectedVoice(v.id); setMinimaxVoiceId(v.id); }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{v.id.replace(/_/g, ' ')}</div>
                          <div style={{ fontSize: '10px', color: '#6B7280' }}>{v.desc}</div>
                        </div>
                      ))}
                    </div>
                    {/* Clone / Design */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <div style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FAFAFA' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Clone from Audio</div>
                        <input
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '11px' }}
                          placeholder="Paste audio URL (min 10s)..."
                          value={voiceCloneUrl}
                          onChange={e => setVoiceCloneUrl(e.target.value)}
                        />
                        <button
                          style={{
                            marginTop: '6px', padding: '4px 10px', borderRadius: '4px', border: 'none',
                            backgroundColor: '#111827', color: '#FFFFFF', fontSize: '11px', fontWeight: 600,
                            cursor: voiceCloneLoading ? 'not-allowed' : 'pointer', opacity: voiceCloneLoading ? 0.7 : 1,
                          }}
                          disabled={!voiceCloneUrl.trim() || voiceCloneLoading}
                          onClick={async () => {
                            setVoiceCloneLoading(true);
                            try {
                              const res = await apiFetch('/api/workbench/voice-clone', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ audio_url: voiceCloneUrl }),
                              });
                              const data = await res.json();
                              if (data.voice_id) {
                                setMinimaxVoiceId(data.voice_id);
                                setSelectedVoice(data.voice_id);
                              }
                            } catch (err) { console.error('Voice clone failed:', err); }
                            finally { setVoiceCloneLoading(false); }
                          }}
                        >
                          {voiceCloneLoading ? 'Cloning...' : 'Clone Voice'}
                        </button>
                      </div>
                      <div style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FAFAFA' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Design from Description</div>
                        <input
                          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #D1D5DB', fontSize: '11px' }}
                          placeholder="e.g. Confident 35yo woman, British accent..."
                          value={voiceDesignDesc}
                          onChange={e => setVoiceDesignDesc(e.target.value)}
                        />
                        <button
                          style={{
                            marginTop: '6px', padding: '4px 10px', borderRadius: '4px', border: 'none',
                            backgroundColor: '#111827', color: '#FFFFFF', fontSize: '11px', fontWeight: 600,
                            cursor: voiceCloneLoading ? 'not-allowed' : 'pointer', opacity: voiceCloneLoading ? 0.7 : 1,
                          }}
                          disabled={!voiceDesignDesc.trim() || voiceCloneLoading}
                          onClick={async () => {
                            setVoiceCloneLoading(true);
                            try {
                              const res = await apiFetch('/api/workbench/voice-design', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ description: voiceDesignDesc }),
                              });
                              const data = await res.json();
                              if (data.voice_id) {
                                setMinimaxVoiceId(data.voice_id);
                                setSelectedVoice(data.voice_id);
                              }
                            } catch (err) { console.error('Voice design failed:', err); }
                            finally { setVoiceCloneLoading(false); }
                          }}
                        >
                          {voiceCloneLoading ? 'Designing...' : 'Design Voice'}
                        </button>
                      </div>
                    </div>
                    {minimaxVoiceId && minimaxVoiceId !== selectedVoice && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#059669' }}>
                        Custom voice ready: {minimaxVoiceId.slice(0, 20)}...
                      </div>
                    )}
                  </>
                )}

                {/* ── Preset Voice Selection (Gemini / ElevenLabs) ── */}
                {(voiceProvider === 'gemini' || voiceProvider === 'elevenlabs') && (
                  <>
                <div style={styles.sectionTitle}>Choose a Voice</div>
                <div style={styles.sectionSubtitle}>
                  {voiceProvider === 'gemini' ? '30 Gemini TTS voices — click to select.' : '22 ElevenLabs voices via FAL.ai proxy.'}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                }}>
                  {(voiceProvider === 'gemini' ? [
                    { id: 'Kore', desc: 'Strong, firm female' },
                    { id: 'Puck', desc: 'Upbeat, lively male' },
                    { id: 'Charon', desc: 'Calm, professional male' },
                    { id: 'Zephyr', desc: 'Bright, clear female' },
                    { id: 'Aoede', desc: 'Warm, melodic female' },
                    { id: 'Achernar', desc: 'Deep, resonant' },
                    { id: 'Achird', desc: 'Gentle, measured' },
                    { id: 'Algenib', desc: 'Energetic, bright' },
                    { id: 'Algieba', desc: 'Warm, conversational' },
                    { id: 'Alnilam', desc: 'Steady, authoritative' },
                    { id: 'Autonoe', desc: 'Soft, thoughtful' },
                    { id: 'Callirrhoe', desc: 'Clear, articulate' },
                    { id: 'Enceladus', desc: 'Rich, dramatic' },
                    { id: 'Fenrir', desc: 'Bold, commanding' },
                    { id: 'Gacrux', desc: 'Smooth, reassuring' },
                    { id: 'Umbriel', desc: 'Low, mysterious' },
                    { id: 'Schedar', desc: 'Bright, enthusiastic' },
                    { id: 'Sulafat', desc: 'Calm, soothing' },
                  ] : [
                    { id: 'Aria', desc: 'Expressive female' },
                    { id: 'Roger', desc: 'Deep male' },
                    { id: 'Sarah', desc: 'Warm female' },
                    { id: 'Laura', desc: 'Warm female' },
                    { id: 'Charlie', desc: 'Young male' },
                    { id: 'George', desc: 'Deep male' },
                    { id: 'River', desc: 'Neutral' },
                    { id: 'Liam', desc: 'Casual male' },
                    { id: 'Charlotte', desc: 'Young female' },
                    { id: 'Alice', desc: 'Clear female' },
                    { id: 'Brian', desc: 'Warm male' },
                    { id: 'Daniel', desc: 'Professional male' },
                    { id: 'Rachel', desc: 'Smooth female' },
                    { id: 'Adam', desc: 'Strong male' },
                    { id: 'Jessica', desc: 'Bright female' },
                  ]).map(v => (
                    <div
                      key={v.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: selectedVoice === v.id ? '2px solid #111827' : '1px solid #E5E7EB',
                        backgroundColor: selectedVoice === v.id ? '#F9FAFB' : '#FFFFFF',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedVoice(v.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{v.id}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>{v.desc}</div>
                        </div>
                        <button
                          style={{
                            padding: '4px 8px', borderRadius: '4px', border: '1px solid #D1D5DB',
                            backgroundColor: previewingVoice === v.id ? '#111827' : '#F9FAFB',
                            color: previewingVoice === v.id ? '#FFFFFF' : '#6B7280',
                            fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                            minWidth: '32px',
                          }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Stop any currently playing preview
                            if (previewAudioRef.current) {
                              previewAudioRef.current.pause();
                              previewAudioRef.current = null;
                            }
                            if (previewingVoice === v.id) {
                              setPreviewingVoice(null);
                              return;
                            }
                            setPreviewingVoice(v.id);
                            try {
                              const res = await apiFetch('/api/voice/preview', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ voice_id: v.id }),
                              });
                              if (!res.ok) throw new Error('Preview failed');
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const audio = new Audio(url);
                              previewAudioRef.current = audio;
                              audio.onended = () => { setPreviewingVoice(null); URL.revokeObjectURL(url); };
                              audio.play();
                            } catch (err) {
                              console.error('Voice preview failed:', err);
                              setPreviewingVoice(null);
                            }
                          }}
                        >
                          {previewingVoice === v.id ? '■' : '▶'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                  </>
                )}

                {/* ── Voice Style ── */}
                <div style={styles.sectionTitle}>Voice Style</div>
                <div style={styles.sectionSubtitle}>
                  Performance instructions for the TTS engine. The niche default is pre-selected.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {/* Niche-specific style first */}
                  {selectedNiche && (() => {
                    const nicheStyles = {
                      ai_tech_news: { label: 'Tech Authority', value: 'Speak with clear, professional authority. Maintain a steady, engaging pace. Emphasize key insights naturally. Sound knowledgeable and trustworthy.' },
                      finance_money: { label: 'Financial Advisor', value: 'Speak with calm, assured confidence. Use a measured pace that allows numbers and concepts to land clearly. Sound like a financial advisor offering valuable perspective.' },
                      motivation_self_help: { label: 'Mentor', value: 'Speak warmly and conversationally. Vary your pace slightly to emphasize key insights. Sound genuine and relatable, like a trusted mentor.' },
                      scary_horror: { label: 'Suspense', value: 'Speak in a measured, deliberate tone with natural emphasis. Let moments of tension build through pacing and tone shifts. Sound thoughtful and composed.' },
                      history_did_you_know: { label: 'Historian', value: 'Speak with genuine interest and engagement. Maintain a conversational pace with natural emphasis on interesting details. Sound like a knowledgeable friend sharing fascinating stories.' },
                      true_crime: { label: 'Investigator', value: 'Speak with calm, professional authority. Use clear pacing and measured emphasis. Sound objective and informative, presenting facts with appropriate gravity.' },
                      science_nature: { label: 'Science', value: 'Speak with genuine enthusiasm about the subject matter. Maintain clear pacing with natural emphasis on interesting findings. Sound like you find the topic genuinely compelling.' },
                      space_cosmos: { label: 'Cosmic Wonder', value: 'Speak with genuine wonder and clear authority. Maintain steady pacing that allows big ideas to land. Sound knowledgeable and awestruck.' },
                      paranormal_ufo: { label: 'Mysterious', value: 'Speak with measured, thoughtful curiosity. Use steady pacing with calm emphasis on intriguing details. Sound genuinely interested in mysteries while remaining composed.' },
                    };
                    const nicheStyle = nicheStyles[selectedNiche];
                    if (!nicheStyle) return null;
                    return (
                      <span
                        key="niche"
                        style={{
                          ...styles.hookChip(voiceStyle === 'niche'),
                          borderColor: voiceStyle === 'niche' ? '#111827' : '#059669',
                          color: voiceStyle === 'niche' ? '#FFFFFF' : '#059669',
                          backgroundColor: voiceStyle === 'niche' ? '#111827' : '#F0FDF4',
                        }}
                        onClick={() => {
                          setVoiceStyle('niche');
                          setCustomVoiceStyle(nicheStyle.value);
                        }}
                      >
                        {nicheStyle.label} (Niche Default)
                      </span>
                    );
                  })()}
                  {/* Universal presets */}
                  {[
                    { label: 'Documentary', value: 'Speak with clear, authoritative confidence. Maintain steady pacing with natural emphasis. Sound knowledgeable and trustworthy.' },
                    { label: 'Storyteller', value: 'Speak conversationally with natural variation. Use pacing shifts to emphasize key moments. Sound genuinely engaged with the narrative.' },
                    { label: 'News Anchor', value: 'Speak with clear, professional authority. Maintain a steady, confident pace. Sound composed, delivering information with appropriate emphasis.' },
                    { label: 'Whispering', value: 'Speak softly and intimately. Use gentle pacing with occasional emphasis. Sound thoughtful and drawn in.' },
                    { label: 'High Energy', value: 'Speak with genuine enthusiasm and commitment. Maintain an engaging pace with natural emphasis. Sound genuinely invested.' },
                    { label: 'Teacher', value: 'Speak with warmth and engagement. Build ideas from simple to complex with natural pacing. Sound like someone who finds the subject genuinely interesting.' },
                    { label: 'Campfire', value: 'Speak conversationally like sharing a story. Vary your pacing naturally. Sound genuine and present, inviting the listener in.' },
                    { label: 'Podcast Host', value: 'Speak conversationally and directly, like talking to a friend. Use natural pacing and emphasis. Sound genuine and engaged.' },
                  ].map((p, i) => (
                    <span
                      key={i}
                      style={styles.hookChip(voiceStyle === p.label)}
                      onClick={() => {
                        setVoiceStyle(p.label);
                        setCustomVoiceStyle(p.value);
                      }}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
                <textarea
                  style={{
                    ...styles.customTopicInput,
                    minHeight: '80px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Voice style instructions — select a preset above or write your own..."
                  value={customVoiceStyle}
                  onChange={e => {
                    setCustomVoiceStyle(e.target.value);
                    setVoiceStyle('custom');
                  }}
                />

                {/* ── Voice Speed ── */}
                <div style={styles.sectionTitle}>Voice Speed</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['1.0', '1.05', '1.1', '1.15', '1.2', '1.3'].map(s => (
                    <span
                      key={s}
                      style={styles.hookChip(voiceSpeed === s)}
                      onClick={() => setVoiceSpeed(s)}
                    >
                      {s}x{s === '1.15' ? ' (default)' : ''}
                    </span>
                  ))}
                </div>

                {/* ── Generate Voiceover Button ── */}
                <button
                  style={styles.generateBtn(selectedVoice && (voiceStyle || customVoiceStyle))}
                  onClick={async () => {
                    if (!selectedVoice) return;
                    setVoiceoverLoading(true);
                    try {
                      const rawNarration = script?.narration_full || script?.scenes?.map(s => s.narration).join(' ') || '';
                      // Convert [BEAT] markers based on provider
                      let fullNarration;
                      if (voiceProvider === 'minimax') {
                        // MiniMax uses precise pause tags: <#0.8#> for 0.8s pause
                        fullNarration = rawNarration.replace(/\s*\[BEAT\]\s*/g, ' <#0.8#> ').trim();
                      } else if (voiceProvider === 'maya') {
                        // Maya interprets natural pauses from punctuation
                        fullNarration = rawNarration.replace(/\s*\[BEAT\]\s*/g, '... ').trim();
                      } else {
                        // Gemini/ElevenLabs: ellipsis as breath/pause
                        fullNarration = rawNarration.replace(/\s*\[BEAT\]\s*/g, ' ... ').trim();
                      }
                      const res = await apiFetch('/api/workbench/voiceover', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          text: fullNarration,
                          voice: selectedVoice,
                          style_instructions: customVoiceStyle || '',
                          speed: parseFloat(voiceSpeed),
                          provider: voiceProvider,
                          voice_description: voiceProvider === 'maya' ? mayaVoiceDesc : undefined,
                          voice_id: voiceProvider === 'minimax' ? (minimaxVoiceId || selectedVoice) : undefined,
                        }),
                      });
                      const data = await res.json();
                      if (data.error) throw new Error(data.error);
                      setVoiceoverUrl(data.audio_url);
                      if (data.tts_duration) setTtsDuration(data.tts_duration);
                      setVoiceoverGenerated(true);
                    } catch (err) {
                      console.error('Voiceover failed:', err);
                    } finally {
                      setVoiceoverLoading(false);
                    }
                  }}
                  disabled={!selectedVoice || voiceoverLoading}
                >
                  {voiceoverLoading ? 'Generating voiceover...' : 'Generate Voiceover'}
                </button>
              </>
            )}

            {/* ── Voiceover Preview (after generation) ── */}
            {(voiceoverGenerated || noVoice) && (
              <>
                {voiceoverGenerated && (
                  <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #DCFCE7',
                    backgroundColor: '#F0FDF4',
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}>
                    <div style={{ fontSize: '24px' }}>✅</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>Voiceover Generated</div>
                      <div style={{ fontSize: '12px', color: '#15803D' }}>
                        Voice: {selectedVoice} | Style: {voiceStyle || 'Custom'} | Speed: {voiceSpeed}x | Provider: {voiceProvider === 'gemini' ? 'Gemini TTS' : 'ElevenLabs'}
                      </div>
                    </div>
                    {voiceoverUrl && <audio controls src={voiceoverUrl} style={{ marginLeft: 'auto', height: '32px' }} />}
                  </div>
                )}

                {/* ── Timing & Music Section ── */}
                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #E5E7EB' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                    Timing & Music
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
                    Background music, sound effects, and voiceover-to-scene alignment.
                  </div>

                  {/* ── Background Music ── */}
                  <div style={styles.sectionTitle}>Background Music</div>
                  <div style={styles.sectionSubtitle}>
                    Instrumental background track. Pre-filled from your niche — adjust or override.
                  </div>

                  {/* Niche default chip */}
                  {selectedNiche && NICHE_MUSIC_MOODS[selectedNiche] && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: musicMood === NICHE_MUSIC_MOODS[selectedNiche] ? '2px solid #111827' : '1px solid #059669',
                        backgroundColor: musicMood === NICHE_MUSIC_MOODS[selectedNiche] ? '#F9FAFB' : '#F0FDF4',
                        cursor: 'pointer',
                        marginBottom: '8px',
                        fontSize: '13px',
                      }}
                      onClick={() => setMusicMood(NICHE_MUSIC_MOODS[selectedNiche])}
                    >
                      <span style={{ fontWeight: 600, color: '#059669', marginRight: '8px' }}>Niche Default:</span>
                      <span style={{ color: '#374151' }}>{NICHE_MUSIC_MOODS[selectedNiche]}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {[
                      'Ambient & Atmospheric',
                      'Cinematic & Epic',
                      'Upbeat & Energetic',
                      'Dark & Suspenseful',
                      'Chill & Lo-fi',
                      'Inspirational & Uplifting',
                      'Techy & Electronic',
                      'Dramatic & Tense',
                    ].map(mood => (
                      <span
                        key={mood}
                        style={styles.hookChip(musicMood === mood)}
                        onClick={() => setMusicMood(mood)}
                      >
                        {mood}
                      </span>
                    ))}
                  </div>
                  <input
                    style={styles.customTopicInput}
                    placeholder="Or describe the music mood you want..."
                    value={musicMood}
                    onChange={e => setMusicMood(e.target.value)}
                  />

                  {/* Music Volume */}
                  <div style={styles.sectionTitle}>Music Volume</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={musicVolume}
                      onChange={e => setMusicVolume(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#111827' }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', minWidth: '40px' }}>
                      {musicVolume}%
                    </span>
                  </div>

                  {/* Generate Music Button */}
                  <button
                    style={styles.generateBtn(musicMood)}
                    onClick={async () => {
                      if (!musicMood) return;
                      setMusicLoading(true);
                      try {
                        const musicDirection = script?.music ? `${script.music.style}. ${script.music.energy_curve}` : musicMood;

                        // Calculate target duration: prefer actual TTS duration, fall back to script estimate
                        const scriptDuration = ttsDuration
                          || (script?.total_word_count ? Math.ceil(script.total_word_count / 2.5) + 5 : null)
                          || script?.beats?.reduce((sum, b) => sum + (b.estimated_duration_seconds || 8), 0)
                          || 75;
                        const targetMusicDuration = Math.max(30, Math.min(180, Math.ceil(scriptDuration)));

                        // ── Check library first ──
                        let foundUrl = null;
                        try {
                          const searchRes = await apiFetch('/api/audio/library', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'search',
                              type: 'music',
                              niche: selectedNiche,
                              query: musicDirection,
                              limit: 3,
                            }),
                          });
                          const searchData = await searchRes.json();
                          if (searchData.results?.length > 0) {
                            foundUrl = searchData.results[0].url;
                            console.log(`Music reused from library: "${searchData.results[0].prompt?.slice(0, 40)}..."`);
                            apiFetch('/api/audio/library', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'increment', id: searchData.results[0].id }),
                            }).catch(() => {});
                          }
                        } catch (_) { /* library search failed */ }

                        if (foundUrl) {
                          setMusicUrl(foundUrl);
                          setMusicGenerated(true);
                        } else {
                          // ── Generate new music ──
                          const res = await apiFetch('/api/workbench/music', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              niche: selectedNiche,
                              duration: targetMusicDuration,
                              music_model: 'elevenlabs',
                              music_mood: musicDirection,
                            }),
                          });
                          const data = await res.json();
                          if (data.error) throw new Error(data.error);
                          setMusicUrl(data.audio_url);
                          setMusicGenerated(true);

                          // ── Save to library ──
                          if (data.audio_url) {
                            apiFetch('/api/audio/library', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'save',
                                type: 'music',
                                url: data.audio_url,
                                prompt: musicDirection,
                                niche: selectedNiche,
                                duration: targetMusicDuration,
                                style: script?.music?.style || musicMood,
                                bpm: script?.music?.bpm_range || null,
                              }),
                            }).catch(err => console.warn('Music library save failed:', err));
                          }
                        }
                      } catch (err) {
                        console.error('Music generation failed:', err);
                      } finally {
                        setMusicLoading(false);
                      }
                    }}
                    disabled={!musicMood || musicLoading}
                  >
                    {musicLoading ? 'Generating music...' : 'Generate Background Music'}
                  </button>

                  {musicGenerated && (
                    <div style={{
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #DCFCE7',
                      backgroundColor: '#F0FDF4',
                      marginTop: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}>
                      <div style={{ fontSize: '24px' }}>🎵</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>Music Generated</div>
                        <div style={{ fontSize: '12px', color: '#15803D' }}>
                          Mood: {musicMood} | Volume: {musicVolume}%
                        </div>
                      </div>
                      {musicUrl && <audio controls src={musicUrl} style={{ marginLeft: 'auto', height: '32px' }} />}
                    </div>
                  )}

                  {/* ── Voiceover Duration Info ── */}
                  {voiceoverGenerated && ttsDuration && (
                    <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>⏱️</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>Voiceover: {Math.round(ttsDuration)}s</div>
                        <div style={{ fontSize: '11px', color: '#15803D' }}>
                          {script?.total_word_count || '~'} words · Clip durations from production package beats
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Sound Effects — AFTER music, auto-selected by niche ── */}
                  {musicGenerated && (
                    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
                      <div style={styles.sectionTitle}>Sound Effects</div>
                      <div style={styles.sectionSubtitle}>
                        Short impact sounds (3-6s each) placed at scene transitions.
                        Auto-selected based on your niche — separate audio layer from the music.
                      </div>

                      <div style={styles.toggleRow}>
                        <button
                          style={styles.toggle(sfxEnabled)}
                          onClick={() => setSfxEnabled(!sfxEnabled)}
                        >
                          <div style={styles.toggleDot(sfxEnabled)} />
                        </button>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                            Enable Sound Effects
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                            Automatically chosen from a niche-appropriate SFX library. No manual selection needed.
                          </div>
                        </div>
                      </div>

                      {sfxEnabled && (
                        <>
                          {/* Show what the niche SFX palette looks like */}
                          <div style={{ marginTop: '12px', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px' }}>
                              Niche SFX Palette: {NICHES.find(n => n.id === selectedNiche)?.name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5' }}>
                              {(() => {
                                const nicheSfx = {
                                  ai_tech_news: 'Digital glitches, data whooshes, UI clicks, tech risers, electronic sweeps',
                                  finance_money: 'Cash register, coin drops, subtle impacts, stock ticker, clean whooshes',
                                  motivation_self_help: 'Inspirational risers, heartbeat, crowd cheer, impact boom, wind sweep',
                                  scary_horror: 'Deep bass drops, creaking doors, whispers, thunder, heartbeat, static',
                                  history_did_you_know: 'Page turns, clock ticks, dramatic impacts, brass hits, stone scrapes',
                                  true_crime: 'Gavel slam, police radio, camera shutter, door slam, tense stingers',
                                  science_nature: 'Lab bubbles, microscope zoom, nature ambience, discovery chimes, space drones',
                                  space_cosmos: 'Deep space drones, rocket ignition, radio static, cosmic whooshes, gravity wells',
                                  paranormal_ufo: 'UFO hum, radio interference, whispers, electromagnetic pulses, eerie tones',
                                };
                                return nicheSfx[selectedNiche] || 'Whooshes, impacts, risers, sweeps, transitions';
                              })()}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
                              {(script?.scenes?.length || 7) - 1} effects will be placed at scene transitions (3-6s each, intelligently matched to beat type)
                            </div>
                          </div>

                          <button
                            style={{ ...styles.generateBtn(true), marginTop: '12px' }}
                            onClick={async () => {
                              setSfxLoading(true);
                              try {
                                // Generate individual SFX per beat — check library first, generate if no match
                                const beats = script?.beats || [];
                                const sfxResults = [];
                                let cumulativeTime = 0;
                                let reusedCount = 0;
                                let generatedCount = 0;

                                for (const beat of beats) {
                                  const cues = beat.sfx_cues || [];
                                  if (cues.length === 0) {
                                    cumulativeTime += (beat.estimated_duration_seconds || 5);
                                    continue;
                                  }
                                  const cuePrompt = cues.join(', ') + `, ${NICHES.find(n => n.id === selectedNiche)?.name || ''} style`;
                                  const sfxDuration = Math.min(beat.estimated_duration_seconds || 4, 6);

                                  // ── Check library first ──
                                  let sfxUrl = null;
                                  try {
                                    const searchRes = await apiFetch('/api/audio/library', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'search',
                                        type: 'sfx',
                                        niche: selectedNiche,
                                        query: cues.join(' '),
                                        limit: 1,
                                      }),
                                    });
                                    const searchData = await searchRes.json();
                                    if (searchData.results?.length > 0) {
                                      sfxUrl = searchData.results[0].url;
                                      reusedCount++;
                                      console.log(`SFX reused from library: "${cues[0]}" → ${sfxUrl.slice(0, 50)}...`);
                                      // Increment use count
                                      apiFetch('/api/audio/library', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'increment', id: searchData.results[0].id }),
                                      }).catch(() => {});
                                    }
                                  } catch (_) { /* library search failed, generate fresh */ }

                                  // ── Generate if no library match ──
                                  if (!sfxUrl) {
                                    const res = await apiFetch('/api/workbench/sfx', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        niche: selectedNiche,
                                        duration: sfxDuration,
                                        prompt: cuePrompt,
                                      }),
                                    });
                                    const data = await res.json();
                                    sfxUrl = data.sfx_url || null;
                                    generatedCount++;

                                    // ── Save to library for future reuse ──
                                    if (sfxUrl) {
                                      apiFetch('/api/audio/library', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          action: 'save',
                                          type: 'sfx',
                                          url: sfxUrl,
                                          prompt: cuePrompt,
                                          niche: selectedNiche,
                                          beat_type: beat.beat_type,
                                          duration: sfxDuration,
                                        }),
                                      }).catch(err => console.warn('SFX library save failed:', err));
                                    }
                                  }

                                  if (sfxUrl) {
                                    sfxResults.push({
                                      url: sfxUrl,
                                      offset: cumulativeTime,
                                      duration: sfxDuration,
                                      beat: beat.beat_type,
                                    });
                                  }
                                  cumulativeTime += (beat.estimated_duration_seconds || 5);
                                }

                                console.log(`SFX complete: ${reusedCount} reused from library, ${generatedCount} newly generated`);

                                // Store all SFX with their timing offsets
                                setSfxUrl(sfxResults.length > 0 ? sfxResults[0].url : null);
                                setScript(prev => ({ ...prev, _sfx_tracks: sfxResults }));
                                setSfxGenerated(true);
                              } catch (err) {
                                console.error('SFX generation failed:', err);
                              } finally {
                                setSfxLoading(false);
                              }
                            }}
                            disabled={sfxLoading}
                          >
                            {sfxLoading ? 'Generating SFX...' : `Generate ${(script?.beats?.length || script?.scenes?.length || 7)} Sound Effects`}
                          </button>

                          {sfxGenerated && (
                            <div style={{
                              padding: '16px',
                              borderRadius: '8px',
                              border: '1px solid #DCFCE7',
                              backgroundColor: '#F0FDF4',
                              marginTop: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                            }}>
                              <div style={{ fontSize: '24px' }}>💥</div>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>Sound Effects Generated</div>
                                <div style={{ fontSize: '12px', color: '#15803D' }}>
                                  {(script?.scenes?.length || 7) - 1} niche-matched effects at scene transitions (3-6s each)
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Continue to Step 3 */}
                {(musicGenerated && (!sfxEnabled || sfxGenerated)) && (
                  <button
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#111827',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: '24px',
                    }}
                    onClick={() => { setCurrentStep(3); window.scrollTo(0, 0); }}
                  >
                    Continue to Step 3: Visuals
                  </button>
                )}
              </>
            )}
          </>
        )}
        {currentStep === 3 && (
          <>
            {/* ── Scene Continuity Mode ── */}
            <div style={styles.sectionTitle}>Scene Continuity</div>
            <div style={styles.sectionSubtitle}>
              How scenes connect visually. This affects how starting images are created for each scene.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                {
                  id: 'continuous',
                  name: 'Continuous',
                  desc: 'Extract the last frame of each video scene, analyze it, and use it as the starting image for the next scene. Creates seamless visual flow — each scene picks up where the last left off.',
                  badge: 'Seamless transitions',
                },
                {
                  id: 'exciting',
                  name: 'Exciting',
                  desc: 'Generate a fresh starting image for each scene (no frame chaining). Previous scene is still analyzed for narrative continuity, but each scene has its own unique visual composition.',
                  badge: 'Dynamic variety',
                },
              ].map(mode => (
                <div
                  key={mode.id}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: '8px',
                    border: (continuityMode || 'continuous') === mode.id ? '2px solid #111827' : '1px solid #E5E7EB',
                    backgroundColor: (continuityMode || 'continuous') === mode.id ? '#F9FAFB' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                  onClick={() => setContinuityMode(mode.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{mode.name}</span>
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '8px', backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                      {mode.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.4' }}>{mode.desc}</div>
                </div>
              ))}
            </div>

            {/* ── Video Model Selection ── */}
            <div style={styles.sectionTitle}>Video Model</div>
            <div style={styles.sectionSubtitle}>
              Choose how video scenes are generated. This determines what starting images are needed.
            </div>

            {/* Generation Mode */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <div
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: videoGenMode === 'i2v' ? '2px solid #111827' : '1px solid #E5E7EB',
                  backgroundColor: videoGenMode === 'i2v' ? '#F9FAFB' : '#FFFFFF',
                  cursor: 'pointer',
                }}
                onClick={() => setVideoGenMode('i2v')}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '2px' }}>I2V (Image-to-Video)</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Each scene starts from a single keyframe image. The video model animates it based on the scene description.
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: videoGenMode === 'r2v' ? '2px solid #111827' : '1px solid #E5E7EB',
                  backgroundColor: videoGenMode === 'r2v' ? '#F9FAFB' : '#FFFFFF',
                  cursor: 'pointer',
                }}
                onClick={() => setVideoGenMode('r2v')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>R2V (Reference-to-Video)</span>
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '8px', backgroundColor: '#EDE9FE', color: '#6D28D9' }}>Character</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Uses starting image + reference images (@elements) for consistent character/avatar appearance across all scenes.
                </div>
              </div>
            </div>

            {/* Model Dropdown */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(videoGenMode === 'r2v' ? [
                { id: 'fal_kling_o3', name: 'Kling O3 Pro', desc: 'Best R2V quality, multi-shot support' },
                { id: 'fal_veo3', name: 'Veo 3.1', desc: 'Fast, high quality' },
                { id: 'fal_veo3_lite', name: 'Veo 3.1 Lite', desc: '60% cheaper, good quality' },
                { id: 'fal_grok_video', name: 'Grok Video', desc: 'Handles white backgrounds well' },
              ] : [
                { id: 'fal_kling_v3', name: 'Kling V3 Pro', desc: 'Best I2V quality' },
                { id: 'fal_kling_o3', name: 'Kling O3 Pro', desc: 'Latest, high quality' },
                { id: 'fal_veo3', name: 'Veo 3.1', desc: 'Fast, cinematic' },
                { id: 'fal_veo3_lite', name: 'Veo 3.1 Lite', desc: '60% cheaper' },
                { id: 'fal_wan25', name: 'Wan 2.5', desc: 'Good all-rounder' },
                { id: 'fal_pixverse_v6', name: 'PixVerse V6', desc: 'With audio support' },
                { id: 'fal_hailuo', name: 'Hailuo/MiniMax', desc: 'Natural motion' },
                { id: 'fal_grok_video', name: 'Grok Video', desc: 'Versatile' },
                { id: 'wavespeed_wan', name: 'Wavespeed WAN', desc: 'Budget option' },
              ]).map(m => (
                <div
                  key={m.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: selectedVideoModel === m.id ? '2px solid #111827' : '1px solid #E5E7EB',
                    backgroundColor: selectedVideoModel === m.id ? '#F9FAFB' : '#FFFFFF',
                    cursor: 'pointer',
                    minWidth: '140px',
                  }}
                  onClick={() => setSelectedVideoModel(m.id)}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{m.name}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>{m.desc}</div>
                </div>
              ))}
            </div>

            {/* ── Image Model ── */}
            {selectedVideoModel && (
              <>
                <div style={styles.sectionTitle}>Image Model</div>
                <div style={styles.sectionSubtitle}>
                  Generates the starting keyframe image for each scene. LoRA-capable models show LoRA picker when available.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { id: 'fal_nano_banana', name: 'Nano Banana 2', lora: false },
                    { id: 'fal_flux', name: 'FLUX 2 (LoRA)', lora: true },
                    { id: 'fal_klein_4b', name: 'FLUX.2 Klein 4B', lora: true },
                    { id: 'fal_seedream', name: 'SeedDream v4.5', lora: false },
                    { id: 'fal_imagen4', name: 'Imagen 4', lora: false },
                    { id: 'fal_kling_img', name: 'Kling Image v3', lora: false },
                    { id: 'fal_grok', name: 'Grok Imagine', lora: false },
                    { id: 'fal_ideogram', name: 'Ideogram v2', lora: false },
                    { id: 'fal_wan22_t2i', name: 'Wan 2.2 T2I (LoRA)', lora: true },
                  ].map(m => (
                    <div
                      key={m.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: selectedImageModel === m.id ? '2px solid #111827' : '1px solid #E5E7EB',
                        backgroundColor: selectedImageModel === m.id ? '#F9FAFB' : '#FFFFFF',
                        cursor: 'pointer',
                        minWidth: '130px',
                      }}
                      onClick={() => setSelectedImageModel(m.id)}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{m.name}</div>
                      {m.lora && <div style={{ fontSize: '10px', color: '#7C3AED', fontWeight: 500 }}>LoRA support</div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── R2V Reference Images ── */}
            {videoGenMode === 'r2v' && selectedVideoModel && (
              <>
                <div style={styles.sectionTitle}>Character References (@elements)</div>
                <div style={styles.sectionSubtitle}>
                  Upload reference images of your character/avatar. These are passed as @elements to every scene for visual consistency.
                </div>
                <div style={{
                  padding: '24px',
                  borderRadius: '8px',
                  border: '2px dashed #D1D5DB',
                  backgroundColor: '#FAFAFA',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Drop reference images here or click to upload</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>Up to 7 reference images. Front, side, 3/4 angles recommended.</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: 500, color: '#374151', cursor: 'pointer',
                  }}>
                    Upload Files
                  </button>
                  <button style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: 500, color: '#374151', cursor: 'pointer',
                  }}>
                    Import from URL
                  </button>
                  <button style={{
                    flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF', fontSize: '13px', fontWeight: 500, color: '#374151', cursor: 'pointer',
                  }}>
                    Add from Library
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {['Front View', 'Side View', '3/4 View', 'Back View'].map((placeholder, i) => (
                    <div key={i} style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '8px',
                      border: '1px dashed #D1D5DB',
                      backgroundColor: '#F9FAFB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#9CA3AF',
                      textAlign: 'center',
                    }}>
                      {placeholder}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Visual Style ── */}
            {selectedVideoModel && (
              <>
                <div style={styles.sectionTitle}>Visual Style</div>
                <div style={styles.sectionSubtitle}>
                  Applied to all scene image generation. {STYLE_CATEGORIES.reduce((n, c) => n + c.styles.length, 0)} presets available.
                </div>
                {STYLE_CATEGORIES.map((cat, ci) => (
                  <div key={ci} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                      {cat.label}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '6px' }}>
                      {cat.styles.map(style => (
                        <div
                          key={style.value}
                          style={{
                            borderRadius: '8px',
                            border: selectedVisualStyle === style.value ? '3px solid #111827' : '2px solid transparent',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            backgroundColor: '#F3F4F6',
                            transition: 'border-color 0.15s ease',
                          }}
                          onClick={() => setSelectedVisualStyle(style.value)}
                          title={style.promptText?.substring(0, 80)}
                        >
                          <img
                            src={style.thumb}
                            alt={style.label}
                            style={{ width: '100%', height: '80px', objectFit: 'cover', display: 'block' }}
                            loading="lazy"
                          />
                          <div style={{
                            padding: '4px 6px',
                            fontSize: '10px',
                            fontWeight: selectedVisualStyle === style.value ? 700 : 500,
                            color: selectedVisualStyle === style.value ? '#111827' : '#6B7280',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {style.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* ── Mood / Lighting / Intensity ── */}
                <div style={styles.sectionTitle}>Mood & Atmosphere</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px' }}>Lighting</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {['Natural', 'Golden Hour', 'Studio', 'Dramatic', 'Neon', 'Candlelight', 'Overcast'].map(l => (
                        <span key={l} style={styles.hookChip(selectedLighting === l)} onClick={() => setSelectedLighting(l)}>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px' }}>Mood</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {['Energetic', 'Calm', 'Tense', 'Mysterious', 'Uplifting', 'Dark', 'Playful'].map(m => (
                        <span key={m} style={styles.hookChip(selectedMood === m)} onClick={() => setSelectedMood(m)}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px' }}>Intensity</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Subtle</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={visualIntensity}
                      onChange={e => setVisualIntensity(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#111827' }}
                    />
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Intense</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827', minWidth: '30px' }}>{visualIntensity}/10</span>
                  </div>
                </div>
              </>
            )}

            {/* ── Per-Scene Visual Descriptions ── */}
            {selectedVisualStyle && (
              <>
                <div style={styles.sectionTitle}>Scene Visual Descriptions</div>
                <div style={styles.sectionSubtitle}>
                  Each scene's visual direction (from the script). These are combined with your style, mood, and lighting
                  by the Cohesive Prompt Builder (LLM) — not concatenated.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(script?.scenes || [
                    { label: 'Hook' },
                    { label: 'Context' },
                    { label: 'Point 1' },
                    { label: 'Point 2' },
                    { label: 'Point 3' },
                    { label: 'Impact' },
                    { label: 'CTA' },
                  ]).map((scene, i) => (
                    <div key={i} style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%',
                          backgroundColor: '#111827', color: '#FFFFFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, flexShrink: 0,
                        }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                          {scene.label}
                        </span>
                        {i === 0 && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', backgroundColor: '#DBEAFE', color: '#1D4ED8', fontWeight: 600 }}>
                            Starting image generated
                          </span>
                        )}
                        {i > 0 && (continuityMode || 'continuous') === 'continuous' && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>
                            Last frame from scene {i} + analysis
                          </span>
                        )}
                        {i > 0 && continuityMode === 'exciting' && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '8px', backgroundColor: '#FCE7F3', color: '#9D174D', fontWeight: 600 }}>
                            Fresh image + previous scene analysis
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', fontStyle: 'italic' }}>
                        [Visual description from script will appear here — generated by LLM in Step 1]
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Pipeline Summary ── */}
                <div style={{
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#F9FAFB',
                  marginTop: '16px',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                    Generation Pipeline Summary
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.6' }}>
                    <div>Mode: <strong>{videoGenMode === 'r2v' ? 'Reference-to-Video' : 'Image-to-Video'}</strong></div>
                    <div>Continuity: <strong>{(continuityMode || 'continuous') === 'continuous' ? 'Continuous (frame chaining)' : 'Exciting (fresh images per scene)'}</strong></div>
                    <div>Model: <strong>{selectedVideoModel || 'Not selected'}</strong></div>
                    <div>Image Model: <strong>{selectedImageModel || '—'}</strong></div>
                    <div>Style: <strong>{selectedVisualStyle || 'Not selected'}</strong> | Lighting: <strong>{selectedLighting || 'Not set'}</strong> | Mood: <strong>{selectedMood || 'Not set'}</strong></div>
                    <div>Prompt method: <strong>Cohesive Prompt Builder (LLM-assembled, not concatenated)</strong></div>
                    {videoGenMode === 'r2v' && <div>References: <strong>@elements passed to every scene</strong></div>}
                  </div>
                </div>

                {/* ── Continue to Step 4 ── */}
                <button
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: selectedVideoModel && selectedVisualStyle ? '#111827' : '#D1D5DB',
                    color: selectedVideoModel && selectedVisualStyle ? '#FFFFFF' : '#9CA3AF',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: selectedVideoModel && selectedVisualStyle ? 'pointer' : 'default',
                    marginTop: '24px',
                  }}
                  onClick={() => {
                    if (selectedVideoModel && selectedVisualStyle) {
                      setCurrentStep(4);
                      window.scrollTo(0, 0);
                    }
                  }}
                >
                  Continue to Step 4: Generate
                </button>
              </>
            )}
          </>
        )}
        {currentStep === 4 && (
          <>
            {/* ── No Captions Toggle ── */}
            <div style={styles.toggleRow}>
              <button
                style={styles.toggle(noCaptions)}
                onClick={() => setNoCaptions(!noCaptions)}
              >
                <div style={styles.toggleDot(noCaptions)} />
              </button>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>No Captions</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                  Skip captions/subtitles entirely.
                </div>
              </div>
            </div>

            {!noCaptions && (
              <>
                {/* ── Caption Style ── */}
                <div style={styles.sectionTitle}>Caption Style</div>
                <div style={styles.sectionSubtitle}>
                  How captions appear on screen. Uses FAL auto-subtitle engine.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { id: 'word_pop', name: 'Word Pop', desc: 'Bold single words, yellow highlight, Montserrat', font: 'Montserrat', highlight: 'yellow', words: 1 },
                    { id: 'karaoke_glow', name: 'Karaoke Glow', desc: 'Glowing single words, green highlight, Poppins', font: 'Poppins', highlight: 'green', words: 1 },
                    { id: 'word_highlight', name: 'Subtle Highlight', desc: '3-word groups, purple highlight, clean', font: 'Montserrat', highlight: 'purple', words: 3 },
                    { id: 'news_ticker', name: 'News Ticker', desc: '6-word lines, red highlight, dark background bar', font: 'Oswald', highlight: 'red', words: 6 },
                  ].map(style => (
                    <div
                      key={style.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: captionStyle === style.id ? '2px solid #111827' : '1px solid #E5E7EB',
                        backgroundColor: captionStyle === style.id ? '#F9FAFB' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                      onClick={() => {
                        setCaptionStyle(style.id);
                        setCaptionHighlight(style.highlight);
                      }}
                    >
                      {/* Mini preview */}
                      <div style={{
                        width: '120px',
                        height: '60px',
                        borderRadius: '6px',
                        backgroundColor: '#111827',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        paddingBottom: '8px',
                        flexShrink: 0,
                      }}>
                        <span style={{
                          fontFamily: style.font,
                          fontSize: style.words > 3 ? '9px' : '12px',
                          fontWeight: 700,
                          color: '#FFFFFF',
                          padding: style.id === 'news_ticker' ? '2px 6px' : '0',
                          backgroundColor: style.id === 'news_ticker' ? 'rgba(0,0,0,0.6)' : 'transparent',
                          borderRadius: '2px',
                        }}>
                          <span style={{ color: style.highlight }}>
                            {style.words === 1 ? 'WORD' : style.words === 3 ? 'three word group' : 'full sentence of caption text'}
                          </span>
                        </span>
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{style.name}</div>
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{style.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Caption Position ── */}
                <div style={styles.sectionTitle}>Position</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['top', 'center', 'bottom'].map(pos => (
                    <span
                      key={pos}
                      style={styles.hookChip(captionPosition === pos)}
                      onClick={() => setCaptionPosition(pos)}
                    >
                      {pos.charAt(0).toUpperCase() + pos.slice(1)}
                    </span>
                  ))}
                </div>

                {/* ── Caption Colors ── */}
                <div style={styles.sectionTitle}>Highlight Color</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { name: 'Yellow', color: '#EAB308' },
                    { name: 'Green', color: '#22C55E' },
                    { name: 'Purple', color: '#A855F7' },
                    { name: 'Red', color: '#EF4444' },
                    { name: 'Blue', color: '#3B82F6' },
                    { name: 'White', color: '#FFFFFF' },
                    { name: 'Orange', color: '#F97316' },
                  ].map(c => (
                    <div
                      key={c.name}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: c.color,
                        border: captionHighlight === c.name.toLowerCase() ? '3px solid #111827' : '2px solid #E5E7EB',
                        cursor: 'pointer',
                      }}
                      onClick={() => setCaptionHighlight(c.name.toLowerCase())}
                      title={c.name}
                    />
                  ))}
                </div>

                {/* ── Caption Preview ── */}
                <div style={{
                  marginTop: '16px',
                  padding: '20px',
                  borderRadius: '8px',
                  backgroundColor: '#111827',
                  textAlign: 'center',
                  position: 'relative',
                  height: '160px',
                  display: 'flex',
                  alignItems: captionPosition === 'top' ? 'flex-start' : captionPosition === 'center' ? 'center' : 'flex-end',
                  justifyContent: 'center',
                  paddingTop: captionPosition === 'top' ? '20px' : '0',
                  paddingBottom: captionPosition === 'bottom' ? '20px' : '0',
                }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: '18px',
                    color: '#FFFFFF',
                    padding: captionStyle === 'news_ticker' ? '4px 12px' : '0',
                    backgroundColor: captionStyle === 'news_ticker' ? 'rgba(0,0,0,0.6)' : 'transparent',
                    borderRadius: '4px',
                    textShadow: captionStyle !== 'news_ticker' ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                  }}>
                    This is how your <span style={{ color: captionHighlight }}>{captionStyle === 'word_pop' ? 'CAPTIONS' : 'captions will'}</span> look
                  </div>
                </div>
              </>
            )}

            {/* Continue to Step 5 */}
            <button
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#111827',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '24px',
              }}
              onClick={() => { setCurrentStep(5); window.scrollTo(0, 0); }}
            >
              Continue to Step 5: Generate
            </button>
          </>
        )}

        {currentStep === 5 && (
          <>
            {/* ── Configuration Summary ── */}
            <div style={styles.sectionTitle}>Configuration Summary</div>
            <div style={styles.sectionSubtitle}>Review everything before generating.</div>

            <div style={{
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              fontSize: '13px',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#6B7280', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Script</div>
                <div style={{ color: '#111827' }}>Niche: <strong>{NICHES.find(n => n.id === selectedNiche)?.name || '—'}</strong></div>
                <div style={{ color: '#111827' }}>Structure: <strong>Fichtean Curve ({script?.beats?.length || 0} beats)</strong></div>
                <div style={{ color: '#111827' }}>Topic: <strong>{script?.topic || customTopic || '—'}</strong></div>
                <div style={{ color: '#111827' }}>Creative Mode: <strong>{creativeMode ? 'On' : 'Off'}</strong></div>
                <div style={{ color: '#111827' }}>Brand Kit: <strong>{selectedBrandKit || 'None'}</strong></div>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#6B7280', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Voice & Audio</div>
                <div style={{ color: '#111827' }}>Voice: <strong>{noVoice ? 'No voiceover' : `${selectedVoice || '—'} (${voiceProvider})`}</strong></div>
                <div style={{ color: '#111827' }}>Style: <strong>{voiceStyle || 'Custom'}</strong></div>
                <div style={{ color: '#111827' }}>Speed: <strong>{voiceSpeed}x</strong></div>
                <div style={{ color: '#111827' }}>Music: <strong>{musicMood || '—'}</strong> at {musicVolume}%</div>
                <div style={{ color: '#111827' }}>SFX: <strong>{sfxEnabled ? 'On (auto-niche)' : 'Off'}</strong></div>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#6B7280', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visuals</div>
                <div style={{ color: '#111827' }}>Continuity: <strong>{continuityMode === 'exciting' ? 'Exciting' : 'Continuous'}</strong></div>
                <div style={{ color: '#111827' }}>Mode: <strong>{videoGenMode === 'r2v' ? 'R2V (Character)' : 'I2V'}</strong></div>
                <div style={{ color: '#111827' }}>Model: <strong>{selectedVideoModel || '—'}</strong></div>
                <div style={{ color: '#111827' }}>Style: <strong>{selectedVisualStyle || '—'}</strong></div>
                <div style={{ color: '#111827' }}>Lighting: <strong>{selectedLighting || '—'}</strong> | Mood: <strong>{selectedMood || '—'}</strong></div>
              </div>
              <div>
                <div style={{ fontWeight: 600, color: '#6B7280', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Captions</div>
                <div style={{ color: '#111827' }}>Style: <strong>{noCaptions ? 'No captions' : captionStyle}</strong></div>
                <div style={{ color: '#111827' }}>Position: <strong>{captionPosition}</strong></div>
                <div style={{ color: '#111827' }}>Highlight: <strong>{captionHighlight}</strong></div>
              </div>
            </div>

            {/* ── Scenes Overview ── */}
            <div style={styles.sectionTitle}>Scenes ({script?.scenes?.length || 7})</div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px' }}>
              {(script?.scenes || Array.from({ length: 7 }, (_, i) => ({ label: `Scene ${i + 1}` }))).map((scene, i) => (
                <div key={i} style={{
                  minWidth: '100px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  textAlign: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎬</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#111827' }}>{scene.label}</div>
                  <div style={{ fontSize: '10px', color: '#9CA3AF' }}>5-6s</div>
                </div>
              ))}
            </div>

            {/* ── Generate Button ── */}
            {!generationComplete && (
              <button
                style={{
                  width: '100%',
                  padding: '18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: generating ? '#6B7280' : '#111827',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: generating ? 'default' : 'pointer',
                  marginTop: '24px',
                  transition: 'all 0.15s ease',
                }}
                onClick={async () => {
                  if (generating) return;
                  setGenerating(true);
                  setGenerationProgress({ step: 'Starting pipeline...', pct: 0 });
                  setGeneratedClips([]);
                  setFinalVideoUrl(null);

                  // Build scenes from beats' visual prompts (new engine) or legacy scenes
                  let scenes = [];
                  if (script?.beats) {
                    // New production engine: flatten beats into scenes (one per visual prompt)
                    for (const beat of script.beats) {
                      for (let vi = 0; vi < (beat.visual_prompts || []).length; vi++) {
                        const vp = beat.visual_prompts[vi];
                        scenes.push({
                          label: `${beat.beat_type}${beat.visual_prompts.length > 1 ? `_${vi + 1}` : ''}`,
                          narration: vi === 0 ? beat.voiceover : '',
                          visualDescription: vp.prompt,
                          camera: vp.camera_motion,
                          duration: `${vp.duration_hint_seconds || 5}s`,
                        });
                      }
                    }
                  } else {
                    scenes = script?.scenes || [];
                  }
                  const totalScenes = scenes.length;
                  const clips = [];
                  let previousSceneAnalysis = null;
                  let lastFrameUrl = null;

                  // Get the selected visual style promptText
                  let stylePromptText = '';
                  for (const cat of STYLE_CATEGORIES) {
                    const found = cat.styles.find(s => s.value === selectedVisualStyle);
                    if (found) { stylePromptText = found.promptText; break; }
                  }

                  // Get brand kit data if selected
                  let brandStyleGuide = null;
                  if (selectedBrandKit) {
                    const bk = brandKits.find(b => b.id === selectedBrandKit);
                    if (bk) {
                      brandStyleGuide = {
                        brand_name: bk.brand_name, visual_style_notes: bk.visual_style_notes,
                        mood_atmosphere: bk.mood_atmosphere, lighting_prefs: bk.lighting_prefs,
                        composition_style: bk.composition_style, ai_prompt_rules: bk.ai_prompt_rules,
                        preferred_elements: bk.preferred_elements, prohibited_elements: bk.prohibited_elements,
                        colors: bk.colors,
                      };
                    }
                  }

                  try {
                    for (let i = 0; i < totalScenes; i++) {
                      const scene = scenes[i];
                      const pctBase = Math.round((i / totalScenes) * 85);

                      // ── Step 1: Build cohesive prompt ──
                      setGenerationProgress({ step: `Scene ${i + 1}/${totalScenes}: Building prompt...`, pct: pctBase });
                      const promptRes = await apiFetch('/api/prompt/build-cohesive', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          tool: 'shorts',
                          description: scene.visualDescription || scene.narration,
                          style: stylePromptText,
                          cameraDirection: scene.camera,
                          mood: selectedMood,
                          lighting: selectedLighting,
                          brandStyleGuide,
                          targetModel: selectedVideoModel,
                          previousSceneAnalysis: i > 0 ? previousSceneAnalysis : undefined,
                          nicheMood: NICHE_MUSIC_MOODS[selectedNiche],
                          sceneIndex: i,
                          totalScenes,
                          continuityMode: continuityMode || 'continuous',
                          characterReferences: script?.character_references || script?._production_package?.character_references || null,
                        }),
                      });
                      const promptData = await promptRes.json();
                      if (promptData.error) throw new Error(`Prompt build failed: ${promptData.error}`);
                      const cohesivePrompt = promptData.prompt;

                      // ── Step 2: Generate or chain starting image ──
                      let startImageUrl;
                      if (i === 0 || continuityMode === 'exciting') {
                        // Generate fresh starting image
                        setGenerationProgress({ step: `Scene ${i + 1}/${totalScenes}: Generating image...`, pct: pctBase + 3 });
                        const frameRes = await apiFetch('/api/workbench/generate-frame', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            prompt: cohesivePrompt,
                            narration: scene.narration,
                            image_model: selectedImageModel || 'fal_nano_banana',
                            aspect_ratio: '9:16',
                            scene_index: i,
                            frame_type: 'start',
                            niche: selectedNiche,
                            visual_style_prompt: stylePromptText,
                          }),
                        });
                        const frameData = await frameRes.json();
                        if (frameData.error) throw new Error(`Image gen failed scene ${i + 1}: ${frameData.error}`);
                        startImageUrl = frameData.image_url;
                      } else {
                        // Continuous mode: use last frame from previous scene
                        startImageUrl = lastFrameUrl;
                      }

                      // ── Step 3: Generate video clip ──
                      setGenerationProgress({ step: `Scene ${i + 1}/${totalScenes}: Generating video...`, pct: pctBase + 8 });
                      const clipDuration = parseInt(scene.duration) || 6;
                      const clipBody = {
                        mode: videoGenMode === 'r2v' ? 'r2v' : 'i2v',
                        video_model: selectedVideoModel || 'fal_veo3',
                        start_frame_url: startImageUrl,
                        motion_prompt: cohesivePrompt,
                        duration: clipDuration,
                        aspect_ratio: '9:16',
                        scene_index: i,
                        video_style: stylePromptText,
                        // Pass character references for vision analysis consistency
                        character_references: script?.character_references || script?._production_package?.character_references || null,
                      };

                      const clipRes = await apiFetch('/api/workbench/generate-clip', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(clipBody),
                      });
                      const clipData = await clipRes.json();
                      if (clipData.error) throw new Error(`Video gen failed scene ${i + 1}: ${clipData.error}`);

                      // Save clip to Supabase immediately (safety net — FAL CDN URLs expire)
                      let savedClipUrl = clipData.video_url;
                      try {
                        const saveRes = await apiFetch('/api/library/save', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            url: clipData.video_url,
                            folder: 'pipeline/clips',
                            filename: `scene_${i + 1}_${Date.now()}.mp4`,
                          }),
                        });
                        const saveData = await saveRes.json();
                        if (saveData.public_url) savedClipUrl = saveData.public_url;
                      } catch (saveErr) {
                        console.warn(`Clip ${i + 1} Supabase save failed (using FAL URL):`, saveErr);
                      }

                      clips.push({
                        url: savedClipUrl,
                        duration: clipData.actual_duration || clipDuration,
                      });
                      setGeneratedClips([...clips]);

                      // Auto-save after each clip (preserves progress if window closes)
                      try {
                        await apiFetch('/api/workbench/save-draft', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            draft_id: draftId,
                            state: {
                              selectedNiche, customTopic, selectedHooks, creativeMode, selectedBrandKit,
                              voiceProvider, selectedVoice, voiceStyle, customVoiceStyle, voiceSpeed, noVoice,
                              musicMood, musicVolume, sfxEnabled, continuityMode, videoGenMode,
                              selectedVideoModel, selectedImageModel, selectedVisualStyle,
                              selectedLighting, selectedMood, visualIntensity,
                              captionStyle, captionPosition, captionHighlight, noCaptions,
                              currentStep: 5, script, voiceoverUrl, musicUrl, sfxUrl, timingBlocks,
                              generatedClips: [...clips],
                              topic: script?.topic || customTopic || 'Untitled',
                            },
                          }),
                        }).then(r => r.json()).then(d => { if (d.draft_id && !draftId) setDraftId(d.draft_id); });
                      } catch (_) { /* non-blocking */ }

                      // ── Step 4: Use last frame + vision analysis from clip response ──
                      // generate-clip already extracts last frame and runs vision analysis
                      if (i < totalScenes - 1) {
                        // Last frame from generate-clip (already extracted + uploaded to Supabase)
                        if (clipData.last_frame_url) {
                          lastFrameUrl = clipData.last_frame_url;
                          console.log(`Scene ${i + 1}: Last frame from clip response → ${lastFrameUrl.slice(0, 60)}...`);
                        } else {
                          console.warn(`Scene ${i + 1}: No last_frame_url in clip response — next scene will generate fresh image`);
                          lastFrameUrl = null;
                        }

                        // Vision analysis from generate-clip (already analyzed via GPT-4 vision)
                        if (clipData.vision_analysis) {
                          previousSceneAnalysis = clipData.vision_analysis;
                          console.log(`Scene ${i + 1}: Vision analysis from clip response (${previousSceneAnalysis.length} chars)`);
                        } else {
                          // Fallback: run Gemini analysis separately
                          setGenerationProgress({ step: `Scene ${i + 1}/${totalScenes}: Gemini analyzing for continuity...`, pct: pctBase + 14 });
                          try {
                            const analysisRes = await apiFetch('/api/analyze/scene-continuity', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                video_url: savedClipUrl,
                                scene_label: scene.label,
                                next_scene_label: scenes[i + 1]?.label || 'Next scene',
                                narration: scene.narration,
                              }),
                            });
                            const analysisData = await analysisRes.json();
                            previousSceneAnalysis = analysisData.analysis || '';
                            console.log(`Scene ${i + 1}: Gemini fallback analysis complete (${previousSceneAnalysis.length} chars)`);
                          } catch (analysisErr) {
                            console.warn('Scene analysis failed (non-fatal):', analysisErr);
                            previousSceneAnalysis = `Previous scene "${scene.label}": ${scene.narration}`;
                          }
                        }
                      }
                    }

                    // ── Assembly ──
                    setGenerationProgress({ step: 'Assembling final video...', pct: 88 });
                    const assembleRes = await apiFetch('/api/workbench/assemble', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        clips,
                        voiceover_url: voiceoverUrl,
                        music_url: musicUrl || null,
                        music_volume: musicVolume / 100,
                        sfx_url: sfxUrl || null,
                        sfx_volume: 0.3,
                        sfx_tracks: script?._sfx_tracks || null,
                        // Build music events from production package beats
                        music_events: (() => {
                          const beats = script?.beats || script?._production_package?.beats || [];
                          const events = [];
                          let cumulativeTime = 0;
                          for (const beat of beats) {
                            if (beat.music_event && beat.music_event !== '') {
                              const action = beat.music_event === 'bass_drop' ? 'bass_drop'
                                : beat.music_event === 'dropout' ? 'dropout'
                                : beat.music_event === 'riser' ? 'riser'
                                : beat.music_event === 'texture_change' ? 'texture_change'
                                : beat.music_event === 'sfx_bridge' ? 'duck'
                                : null;
                              if (action) events.push({ time: cumulativeTime, action });
                            }
                            cumulativeTime += (beat.estimated_duration_seconds || beat.word_count / 2.5 || 8);
                          }
                          return events.length > 0 ? events : null;
                        })(),
                        tts_duration: ttsDuration || null,
                        voice_speed: parseFloat(voiceSpeed),
                        caption_config: noCaptions ? null : {
                          font_name: captionStyle === 'news_ticker' ? 'Oswald' : captionStyle === 'karaoke_glow' ? 'Poppins' : 'Montserrat',
                          font_size: captionStyle === 'news_ticker' ? 90 : captionStyle === 'karaoke_glow' ? 120 : 110,
                          font_weight: 'bold',
                          font_color: 'white',
                          highlight_color: captionHighlight,
                          stroke_width: captionStyle === 'news_ticker' ? 2 : 4,
                          stroke_color: 'black',
                          background_color: captionStyle === 'news_ticker' ? 'black' : 'none',
                          background_opacity: captionStyle === 'news_ticker' ? 0.6 : 0,
                          position: captionPosition,
                          y_offset: captionPosition === 'top' ? 50 : 75,
                          words_per_subtitle: captionStyle === 'news_ticker' ? 6 : captionStyle === 'word_highlight' ? 3 : 1,
                          enable_animation: captionStyle !== 'news_ticker',
                        },
                      }),
                    });
                    const assembleData = await assembleRes.json();
                    if (assembleData.error) throw new Error(`Assembly failed: ${assembleData.error}`);

                    setFinalVideoUrl(assembleData.video_url);
                    setGenerationProgress({ step: 'Complete!', pct: 100 });
                    setGenerationComplete(true);
                  } catch (err) {
                    console.error('Generation pipeline failed:', err);
                    setGenerationProgress({ step: `Error: ${err.message}`, pct: 0 });
                  } finally {
                    setGenerating(false);
                  }
                }}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Short'}
              </button>
            )}

            {/* ── Progress ── */}
            {generating && generationProgress && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>{generationProgress.step}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{generationProgress.pct}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${generationProgress.pct}%`,
                    backgroundColor: '#111827',
                    borderRadius: '3px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            )}

            {/* ── Completion ── */}
            {generationComplete && (
              <>
                <div style={{
                  padding: '24px',
                  borderRadius: '8px',
                  border: '1px solid #DCFCE7',
                  backgroundColor: '#F0FDF4',
                  marginTop: '24px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>
                    Short Generated Successfully
                  </div>
                  <div style={{ fontSize: '13px', color: '#15803D' }}>
                    {script?.scenes?.length || 7} scenes | {selectedVideoModel} | {selectedVisualStyle} | {captionStyle}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  {finalVideoUrl && (
                    <video
                      controls
                      src={finalVideoUrl}
                      style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', marginBottom: '12px', backgroundColor: '#000' }}
                    />
                  )}
                  <button
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#111827',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    onClick={async () => {
                      if (!finalVideoUrl) return;
                      try {
                        await apiFetch('/api/library/save', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ url: finalVideoUrl, type: 'video', tags: ['shorts', selectedNiche] }),
                        });
                      } catch (err) { console.error('Save to library failed:', err); }
                    }}
                  >
                    Save to Library
                  </button>
                </div>

                <button
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '2px solid #7C3AED',
                    backgroundColor: '#F5F3FF',
                    color: '#7C3AED',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '8px',
                  }}
                  onClick={async () => {
                    const template = {
                      type: 'shorts_builder_template',
                      niche: selectedNiche,
                      creativeMode,
                      brandKit: selectedBrandKit,
                      voiceProvider,
                      voice: selectedVoice,
                      voiceStyle,
                      customVoiceStyle,
                      voiceSpeed,
                      noVoice,
                      musicMood,
                      musicVolume,
                      sfxEnabled,
                      continuityMode,
                      videoGenMode,
                      videoModel: selectedVideoModel,
                      imageModel: selectedImageModel,
                      visualStyle: selectedVisualStyle,
                      lighting: selectedLighting,
                      mood: selectedMood,
                      visualIntensity,
                      captionStyle: noCaptions ? null : captionStyle,
                      captionPosition,
                      captionHighlight,
                      noCaptions,
                    };
                    try {
                      const res = await apiFetch('/api/workbench/save-draft', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          draft_id: null,
                          state: { ...template, is_flow_template: true, template_name: `${NICHES.find(n => n.id === selectedNiche)?.name || ''} — Fichtean Curve Template` },
                        }),
                      });
                      const data = await res.json();
                      if (data.draft_id) {
                        setDraftId(data.draft_id);
                      }
                    } catch (err) {
                      console.error('Save template failed:', err);
                    }
                  }}
                >
                  Save Configuration as Flow Template
                </button>

                <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'center', marginTop: '8px' }}>
                  Saving as a Flow template lets you re-run this exact configuration with different topics automatically.
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
