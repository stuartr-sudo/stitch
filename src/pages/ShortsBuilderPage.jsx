/**
 * ShortsBuilderPage — Clean rebuild of the Shorts creation tool.
 * Step-by-step wizard that produces Shorts and saves as Flows templates.
 *
 * WIREFRAME MODE: All data is static/dummy. No API connections yet.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { STYLE_CATEGORIES } from '@/lib/stylePresets';

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
      { label: 'Reasoning & Intelligence', hooks: ['beyond human level', 'caught cheating', 'real-world testing', 'surprise benchmark', 'OpenAI leak'] },
      { label: 'Creative AI', hooks: ['fooling experts', 'original compositions', 'replacing artists', 'viral generation', 'AI vs human blind test'] },
      { label: 'Robotics', hooks: ['learning emotions', 'warehouse takeover', 'humanoid progress', 'Boston Dynamics update', 'home robots coming'] },
      { label: 'Medical AI', hooks: ['outperforming doctors', 'drug discovery', 'predicting illness', 'cancer detection', 'surgery AI'] },
    ]},
    { label: 'AI & Jobs', sub: [
      { label: 'White-collar disruption', hooks: ['lawyers affected', 'coding obsolete', 'finance automation', 'consultants replaced', 'AI managers'] },
      { label: 'Creative industries', hooks: ['Hollywood impact', 'music generation', 'photography dying', 'voice actors gone', 'AI directors'] },
      { label: 'New careers', hooks: ['prompt engineering', 'AI training', 'human oversight', 'AI auditor', 'data curator'] },
    ]},
    { label: 'AI Ethics & Safety', sub: [
      { label: 'Deepfakes', hooks: ['caught on camera', 'political impact', 'impossible to detect', 'identity theft', 'celebrity chaos'] },
      { label: 'Surveillance', hooks: ['facial recognition', 'predictive policing', 'mass tracking', 'social scoring', 'privacy dead'] },
      { label: 'Existential Risk', hooks: ['researchers warning', 'alignment problem', 'containment failure', 'rogue AI scenario', 'kill switch debate'] },
    ]},
    { label: 'Tech Giants', sub: [
      { label: 'OpenAI', hooks: ['internal drama', 'secret projects', 'power struggle', 'GPT-5 rumors', 'Altman moves'] },
      { label: 'Google', hooks: ['falling behind', 'search dying', 'Gemini controversy', 'DeepMind breakthrough', 'antitrust'] },
      { label: 'Apple & Meta', hooks: ['secret labs', 'pivot strategy', 'hardware play', 'Vision Pro', 'Zuckerberg AI bet'] },
    ]},
  ],
  finance_money: [
    { label: 'Wealth Building', sub: [
      { label: 'Investing', hooks: ['beating the market', 'hidden strategies', 'common mistakes', 'Warren Buffett method', 'index fund truth'] },
      { label: 'Real Estate', hooks: ['house hacking', 'rent vs buy', 'passive income', 'market crash coming', 'first property'] },
    ]},
    { label: 'Money Myths', sub: [
      { label: 'Debt myths', hooks: ['good vs bad', 'credit score trap', 'minimum payment scam', 'student loan truth', 'mortgage hack'] },
      { label: 'Wealth myths', hooks: ['self-made myth', 'luck factor', 'rich mindset', 'generational wealth', 'millionaire habits'] },
    ]},
  ],
  scary_horror: [
    { label: 'Haunted Places', sub: [
      { label: 'Abandoned buildings', hooks: ['documented evidence', 'still active', 'sealed forever', 'police called', 'caught on camera'] },
      { label: 'Cursed locations', hooks: ['pattern of deaths', 'locals avoid', 'caught on camera', 'government warning', 'still happening'] },
    ]},
    { label: 'Unexplained Events', sub: [
      { label: 'Mass disappearances', hooks: ['without trace', 'overnight vanishing', 'official cover-up', '400 people gone', 'no bodies found'] },
      { label: 'Time anomalies', hooks: ['documented cases', 'witness accounts', 'scientific study', 'missing time', 'aged overnight'] },
    ]},
  ],
};

// Placeholder for niches without detailed suggestions yet
const DEFAULT_TOPICS = [
  { label: 'Trending Now', sub: [
    { label: 'Latest developments', hooks: ['breaking news', 'just announced', 'nobody saw this coming', 'confirmed today', 'leaked footage'] },
    { label: 'Viral stories', hooks: ['went viral', 'millions watched', 'internet reacts', 'you won\'t believe', 'caught on camera'] },
  ]},
  { label: 'Evergreen', sub: [
    { label: 'Beginner guides', hooks: ['complete breakdown', 'explained simply', 'what they don\'t tell you', 'step by step', 'ultimate guide'] },
    { label: 'Deep dives', hooks: ['the full story', 'hidden truth', 'investigation reveals', 'years later', 'inside look'] },
  ]},
];

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
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedAngle, setSelectedAngle] = useState(null);
  const [selectedHooks, setSelectedHooks] = useState([]);
  const [customTopic, setCustomTopic] = useState('');
  const [creativeMode, setCreativeMode] = useState(false);
  const [scriptGenerated, setScriptGenerated] = useState(false);
  const [researchResults, setResearchResults] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [discoverResults, setDiscoverResults] = useState(null);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [selectedResearchTopic, setSelectedResearchTopic] = useState(null);

  // Step 2 state
  const [voiceProvider, setVoiceProvider] = useState('gemini'); // 'gemini' | 'elevenlabs'
  const [selectedVoice, setSelectedVoice] = useState(null);
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
  const [timingGenerated, setTimingGenerated] = useState(false);
  const [timingLoading, setTimingLoading] = useState(false);

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

  // Dummy script for wireframe
  const [script, setScript] = useState(null);

  // Filter frameworks by selected niche
  const availableFrameworks = useMemo(() => {
    if (!selectedNiche) return [];
    return FRAMEWORKS.filter(f =>
      f.niches === null || f.niches.includes(selectedNiche)
    );
  }, [selectedNiche]);

  // Get topics for selected niche
  const topics = useMemo(() => {
    if (!selectedNiche) return [];
    return TOPIC_SUGGESTIONS[selectedNiche] || DEFAULT_TOPICS;
  }, [selectedNiche]);

  // Dummy research results per niche (wireframe only)
  const DUMMY_RESEARCH = {
    ai_tech_news: [
      { title: 'GPT-5 Benchmark Results Leaked — Surpasses Human Expert Performance', summary: 'Internal benchmark data from OpenAI shows GPT-5 scoring above 95th percentile human experts across law, medicine, and engineering exams.', angle: 'The gap between AI and human experts just closed', why_viral: 'Directly impacts every knowledge worker — triggers fear and fascination', story_context: 'OpenAI internal benchmarks leaked April 2026 showing GPT-5 surpassing 95th percentile human performance on bar exam, medical boards, and engineering certification tests.' },
      { title: 'Google DeepMind\'s Robot Learns to Cook by Watching YouTube', summary: 'A new multimodal robotics system can replicate recipes after watching cooking videos, handling ingredients with human-like dexterity.', angle: 'Robots are learning skills the same way we do', why_viral: 'Visual demonstration of AI capability people can relate to — cooking is universal', story_context: 'Google DeepMind published paper April 2026 demonstrating RT-3 robot learning full cooking recipes from YouTube videos with 87% success rate on novel dishes.' },
      { title: 'China Bans AI-Generated News Anchors After Deepfake Scandal', summary: 'Chinese state media issues emergency ban after AI news anchor was used to broadcast fabricated government policy announcement.', angle: 'When AI news anchors go rogue — and governments panic', why_viral: 'Geopolitical implications + deepfake fear + regulation debate', story_context: 'Chinese State Council issued emergency directive banning AI news anchors after Xinhua AI anchor broadcast fabricated policy about property tax reform, causing market panic.' },
      { title: 'Meta\'s New AI Can Generate Full 3D Worlds From Text Descriptions', summary: 'Meta AI releases WorldGen — a system that creates explorable 3D environments from natural language, targeting VR content creation.', angle: 'Type a description, walk through a world — this changes everything', why_viral: 'Visual spectacle + gaming/VR crossover audience + creator economy angle', story_context: 'Meta AI released WorldGen April 2026, generating explorable 3D environments from text prompts in under 60 seconds, with physics simulation and lighting.' },
      { title: 'AI Discovers New Antibiotic That Kills Drug-Resistant Superbugs', summary: 'MIT researchers use AI to identify a novel compound effective against MRSA and other antibiotic-resistant bacteria.', angle: 'AI just solved a problem that\'s killed millions', why_viral: 'Life-or-death stakes + clear positive AI narrative + scientific breakthrough', story_context: 'MIT published in Nature April 2026: AI system screened 12 million compounds, identified halicin-2 effective against MRSA, VRE, and carbapenem-resistant Enterobacteriaceae in mouse trials.' },
    ],
    finance_money: [
      { title: 'The $50/Month Investment Strategy That Outperformed Hedge Funds', summary: 'A simple dollar-cost averaging approach into broad market ETFs has beaten 92% of hedge funds over the last 20 years.', angle: 'Wall Street doesn\'t want you to know this is enough', why_viral: 'Accessible to everyone + contrarian to "you need money to make money" narrative', story_context: 'S&P Dow Jones SPIVA report 2026 confirms: 92% of US large-cap hedge funds underperformed the S&P 500 over 20 years. $50/month DCA since 2006 = $28,400 invested, now worth $67,200.' },
      { title: 'Hidden Bank Fee Exposed — Americans Losing $300/Year Without Knowing', summary: 'Consumer Financial Protection Bureau investigation reveals systematic hidden maintenance fees across major US banks.', angle: 'Check your bank statement right now — you\'re probably being charged', why_viral: 'Personal financial impact + outrage fuel + actionable (people will check)', story_context: 'CFPB April 2026 investigation found Chase, BofA, Wells Fargo charging average $24.99/month "account maintenance" fees to 42 million accounts, often waivable but not disclosed.' },
    ],
    scary_horror: [
      { title: 'The Hotel Room That Nobody Can Stay In Past 3AM', summary: 'Room 428 at a historic European hotel has been sealed shut after every guest for 30 years reported identical experiences at 3AM.', angle: '30 years of identical reports — and they sealed it forever', why_viral: 'Mystery + specific detail (room number, time) creates authenticity', story_context: 'Grand Hotel Norrland, Sweden, sealed Room 428 in 2024 after consistent guest reports since 1994: all describe waking at 3:07AM to sound of dripping, room temperature drops, and figure standing in corner.' },
      { title: 'Search Team Finds Camera With 200 Photos From Missing Hikers', summary: 'A camera recovered from a trail in Panama contains 200+ photos taken in complete darkness over 3 nights by hikers who vanished in 2014.', angle: 'Why did they take 200 photos in total darkness?', why_viral: 'Real mystery + visual evidence exists + unsolved case', story_context: 'Kris Kremers and Lisanne Froon disappeared in Panama 2014. Camera found with 90 normal photos, then 200+ flash photos in pitch darkness over 3 nights. Only bone fragments ever recovered.' },
    ],
  };

  // Dummy discover results (ranked AI-scored suggestions)
  const DUMMY_DISCOVER = {
    ai_tech_news: [
      { title: 'AI Agents Are Now Hiring Other AI Agents', trending: 92, competition: 'Low', source: 'Google Trends + Reddit', description: 'Autonomous AI agents are beginning to delegate tasks to other specialized AI agents, creating emergent hierarchies without human input.' },
      { title: 'The 3-Minute AI Video That Fooled Hollywood', trending: 88, competition: 'Medium', source: 'YouTube Trends + X/Twitter', description: 'A fully AI-generated short film was submitted to a festival under a fake director name and made it to the final round before being discovered.' },
      { title: 'Why AI Companies Are Buying Nuclear Power Plants', trending: 85, competition: 'Low', source: 'Google News + SearchAPI', description: 'Microsoft, Google, and Amazon are all acquiring or contracting nuclear power facilities to meet the enormous energy demands of AI data centers.' },
      { title: 'The Country That Banned AI Homework — And What Happened Next', trending: 79, competition: 'Very Low', source: 'Reddit + Google Scholar', description: 'Denmark banned AI-assisted homework in all public schools for one semester. Student performance data is now in — and the results are surprising.' },
      { title: 'AI Can Now Detect Lies Better Than Any Human', trending: 76, competition: 'Medium', source: 'PubMed + Google Trends', description: 'New multimodal AI system analyzes micro-expressions, voice patterns, and language simultaneously — outperforming FBI-trained interrogators in controlled tests.' },
    ],
    finance_money: [
      { title: 'The ETF That\'s Quietly Beating the S&P by 40%', trending: 91, competition: 'Low', source: 'Google Trends + Reddit/investing', description: 'A relatively unknown equal-weight ETF has outperformed the S&P 500 by 40% over 3 years with less volatility, but most retail investors have never heard of it.' },
      { title: 'Why Gen Z Is Rejecting Traditional Banking', trending: 84, competition: 'Medium', source: 'X/Twitter + Google Trends', description: '38% of 18-25 year olds now use fintech-only banking with no traditional bank account. The implications for the banking industry are massive.' },
      { title: 'The $1 Coffee Rule That Built a $2M Portfolio', trending: 78, competition: 'Very Low', source: 'TikTok Trends + Reddit', description: 'A simple micro-investing strategy tied to daily coffee purchases has gone viral — and the math actually checks out over a 20-year horizon.' },
    ],
    scary_horror: [
      { title: 'The Abandoned Mall Where Security Cameras Still Record', trending: 89, competition: 'Low', source: 'Reddit/nosleep + YouTube', description: 'A shuttered mall in Ohio still has functioning security cameras. Urban explorers discovered recent footage showing movement in stores that have been locked for 8 years.' },
      { title: 'The Sound That Makes Everyone Leave a Room', trending: 82, competition: 'Low', source: 'Google Trends + Reddit/science', description: 'Researchers accidentally discovered a specific infrasound frequency that triggers intense feelings of dread in 94% of test subjects, causing them to leave the room within minutes.' },
    ],
  };

  const handleResearchTopics = () => {
    // WIREFRAME: Show dummy research results (real news stories)
    setResearchLoading(true);
    setDiscoverResults(null); // Clear other results
    setTimeout(() => {
      const results = DUMMY_RESEARCH[selectedNiche] || DUMMY_RESEARCH.ai_tech_news;
      setResearchResults(results);
      setResearchLoading(false);
    }, 1500);
  };

  const handleDiscoverTopics = () => {
    // WIREFRAME: Show dummy discover results (AI-ranked suggestions)
    setDiscoverLoading(true);
    setResearchResults(null); // Clear other results
    setTimeout(() => {
      const results = DUMMY_DISCOVER[selectedNiche] || DUMMY_DISCOVER.ai_tech_news;
      setDiscoverResults(results);
      setDiscoverLoading(false);
    }, 1200);
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
  };

  const canGenerate = selectedNiche && selectedFramework && (selectedHooks.length > 0 || customTopic.trim() || selectedResearchTopic);

  const handleGenerateScript = () => {
    if (!canGenerate) return;
    // WIREFRAME: Show dummy script
    const fw = FRAMEWORKS.find(f => f.id === selectedFramework);
    const niche = NICHES.find(n => n.id === selectedNiche);
    const topicStr = selectedResearchTopic ? selectedResearchTopic.title : (customTopic.trim() || selectedHooks.join(' + '));
    const storyContext = selectedResearchTopic ? selectedResearchTopic.story_context : null;

    setScript({
      niche: niche.name,
      framework: fw.name,
      topic: topicStr,
      creative: creativeMode,
      storyContext,
      scenes: fw.scenes.map((scene, i) => ({
        label: scene.label,
        camera: scene.camera,
        narration: storyContext
          ? `[Scene ${i + 1}: ${scene.label}] — Based on real story: "${topicStr}". Context: ${storyContext}. ${creativeMode ? 'Creative visual storytelling with factual accuracy.' : 'Standard factual delivery.'}`
          : `[Scene ${i + 1}: ${scene.label}] — Narration for "${topicStr}" will be generated here. ${creativeMode ? 'Creative visual storytelling with factual accuracy.' : 'Standard factual delivery.'}`,
        visualDescription: `[Visual: ${scene.label} — ${scene.camera}. Style and mood will be composed by the Cohesive Prompt Builder from your visual settings.]`,
        duration: `${5 + Math.round(Math.random())}s`,
      })),
    });
    setScriptGenerated(true);
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
          >
            Load Draft
          </button>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #111827',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 500,
              color: '#111827',
              cursor: 'pointer',
            }}
          >
            Save Draft
          </button>
          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>WIREFRAME</span>
        </div>
      </div>

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
            {/* ── Niche Selection ── */}
            <div style={styles.sectionTitle}>Choose a Niche</div>
            <div style={styles.sectionSubtitle}>This determines your frameworks, topics, voice style, and visual mood.</div>
            <div style={styles.nicheGrid}>
              {NICHES.map(n => (
                <div
                  key={n.id}
                  style={styles.nicheCard(selectedNiche === n.id)}
                  onClick={() => {
                    setSelectedNiche(n.id);
                    setSelectedFramework(null);
                    setExpandedCategory(null);
                    setSelectedAngle(null);
                    setSelectedHooks([]);
                    setScriptGenerated(false);
                    setScript(null);
                  }}
                >
                  <div style={styles.nicheIcon}>{n.icon}</div>
                  <div style={styles.nicheName}>{n.name}</div>
                </div>
              ))}
            </div>

            {/* ── Framework Selection ── */}
            {selectedNiche && (
              <>
                <div style={styles.sectionTitle}>Choose a Framework</div>
                <div style={styles.sectionSubtitle}>
                  This defines the structure, pacing, scene beats, and duration of your Short.
                </div>
                <div style={styles.frameworkList}>
                  {availableFrameworks.map(f => (
                    <div
                      key={f.id}
                      style={styles.frameworkCard(selectedFramework === f.id)}
                      onClick={() => {
                        setSelectedFramework(f.id);
                        setScriptGenerated(false);
                        setScript(null);
                      }}
                    >
                      <div style={styles.frameworkName}>{f.name}</div>
                      <div style={styles.frameworkDesc}>{f.description}</div>
                      <div style={styles.frameworkMeta}>
                        <span>{f.duration}</span>
                        <span>{f.sceneCount}</span>
                        <span style={styles.badge(f.category === 'avatar' ? '#EDE9FE' : null)}>
                          {f.category}
                        </span>
                      </div>
                      {selectedFramework === f.id && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #E5E7EB' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px' }}>Scene Beats:</div>
                          {f.scenes.map((s, i) => (
                            <div key={i} style={styles.sceneBeat}>
                              <div style={styles.sceneBeatDot('#111827')} />
                              <span style={{ fontWeight: 500, color: '#374151' }}>{s.label}</span>
                              <span style={{ fontSize: '10px', color: '#9CA3AF', marginLeft: '4px' }}>— {s.camera}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Topic Selection ── */}
            {selectedFramework && (
              <>
                <div style={styles.sectionTitle}>Choose a Topic</div>
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
                          onClick={() => handleSelectResearchTopic({ title: topic.title, summary: topic.description, story_context: topic.description })}
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
                              backgroundColor: topic.trending >= 85 ? '#DCFCE7' : topic.trending >= 75 ? '#FEF3C7' : '#F3F4F6',
                              color: topic.trending >= 85 ? '#166534' : topic.trending >= 75 ? '#92400E' : '#6B7280',
                              marginLeft: '12px',
                              whiteSpace: 'nowrap',
                            }}>
                              {topic.trending}% trending
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
                            {topic.description}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                            <span style={{
                              fontWeight: 500,
                              color: topic.competition === 'Very Low' ? '#059669' : topic.competition === 'Low' ? '#10B981' : '#D97706',
                            }}>
                              Competition: {topic.competition}
                            </span>
                            <span style={{ color: '#9CA3AF' }}>
                              Source: {topic.source}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Creative Mode Toggle ── */}
            {selectedFramework && (
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
            {selectedFramework && (
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
                  <option value="bk_sewo">SEWO — Tech brand, blue/white, modern clean</option>
                  <option value="bk_assureful">Assureful — Insurance, green/navy, professional</option>
                  <option value="bk_client">Client Brand — Custom brand kit</option>
                </select>
              </>
            )}

            {/* ── Generate Script Button ── */}
            {selectedFramework && (
              <button
                style={styles.generateBtn(canGenerate)}
                onClick={handleGenerateScript}
                disabled={!canGenerate}
              >
                Generate Script
              </button>
            )}

            {/* ── Script Preview ── */}
            {script && (
              <>
                <div style={styles.sectionTitle}>Generated Script</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                  {script.niche} → {script.framework} → {script.topic}
                  {script.creative ? ' (Creative Mode)' : ''}
                </div>
                <div style={styles.scriptPreview}>
                  {script.scenes.map((scene, i) => (
                    <div key={i} style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: i < script.scenes.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#111827' }}>
                          Scene {i + 1}: {scene.label} ({scene.duration})
                        </span>
                        <span style={{ fontSize: '10px', color: '#9CA3AF', fontStyle: 'italic' }}>
                          {scene.camera}
                        </span>
                      </div>
                      <div style={{ marginBottom: '6px' }}>{scene.narration}</div>
                      <div style={{ fontSize: '12px', color: '#7C3AED', fontStyle: 'italic' }}>
                        {scene.visualDescription}
                      </div>
                    </div>
                  ))}
                </div>
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
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'gemini', name: 'Gemini TTS', desc: '30 voices, natural prosody, style instructions', badge: 'Recommended' },
                    { id: 'elevenlabs', name: 'ElevenLabs', desc: '22 voices, expressive, emotional range', badge: null },
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

                {/* ── Voice Selection ── */}
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
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{v.id}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{v.desc}</div>
                    </div>
                  ))}
                </div>

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
                  onClick={() => {
                    if (!selectedVoice) return;
                    setVoiceoverLoading(true);
                    setTimeout(() => {
                      setVoiceoverLoading(false);
                      setVoiceoverGenerated(true);
                    }, 2000);
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
                    <div style={{
                      marginLeft: 'auto',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      color: '#374151',
                    }}>
                      ▶ Play Preview
                    </div>
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
                    onClick={() => {
                      setMusicLoading(true);
                      setTimeout(() => {
                        setMusicLoading(false);
                        setMusicGenerated(true);
                      }, 1500);
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
                      <div style={{
                        marginLeft: 'auto',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D5DB',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        color: '#374151',
                      }}>
                        ▶ Play Preview
                      </div>
                    </div>
                  )}

                  {/* ── Timing Keyframes (word alignment) — comes BEFORE SFX ── */}
                  {musicGenerated && (
                    <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
                      <div style={styles.sectionTitle}>Timing Alignment</div>
                      <div style={styles.sectionSubtitle}>
                        Aligns voiceover to scene beats using word-level timestamps (Whisper).
                        Scenes are optimized to 5-6s each — shorter scenes mean tighter edits and fewer errors.
                      </div>

                      <button
                        style={styles.generateBtn(true)}
                        onClick={() => {
                          setTimingLoading(true);
                          setTimeout(() => {
                            setTimingLoading(false);
                            setTimingGenerated(true);
                          }, 1800);
                        }}
                        disabled={timingLoading}
                      >
                        {timingLoading ? 'Aligning timing...' : 'Generate Timing Keyframes'}
                      </button>

                      {timingGenerated && (
                        <>
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
                            <div style={{ fontSize: '24px' }}>⏱️</div>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534' }}>Timing Aligned</div>
                              <div style={{ fontSize: '12px', color: '#15803D' }}>
                                Word timestamps extracted, blocks aligned to scene beats, durations optimized (5-6s per scene).
                              </div>
                            </div>
                          </div>

                          {/* Timing preview — 5-6s scenes */}
                          <div style={{ marginTop: '12px', padding: '14px 16px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
                              Scene Timing Preview:
                            </div>
                            {(script?.scenes || [
                              { label: 'Hook' },
                              { label: 'Context' },
                              { label: 'Point 1' },
                              { label: 'Point 2' },
                              { label: 'Point 3' },
                              { label: 'Impact' },
                              { label: 'CTA' },
                            ]).map((scene, i, arr) => {
                              const dur = 5 + Math.round(Math.random()); // 5-6s per scene
                              const start = i * 5.5;
                              return (
                                <div key={i} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '5px 0',
                                  borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                                }}>
                                  <div style={{ fontSize: '11px', color: '#9CA3AF', width: '50px', fontFamily: 'monospace' }}>
                                    {String(Math.floor(start / 60)).padStart(1, '0')}:{String(Math.floor(start % 60)).padStart(2, '0')}
                                  </div>
                                  <div style={{
                                    flex: 1,
                                    height: '8px',
                                    borderRadius: '4px',
                                    backgroundColor: '#E5E7EB',
                                    position: 'relative',
                                    overflow: 'hidden',
                                  }}>
                                    <div style={{
                                      position: 'absolute',
                                      left: 0,
                                      top: 0,
                                      height: '100%',
                                      width: `${Math.min(dur / 6 * 100, 100)}%`,
                                      backgroundColor: '#111827',
                                      borderRadius: '4px',
                                    }} />
                                  </div>
                                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#374151', minWidth: '80px' }}>
                                    {scene.label}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#9CA3AF', minWidth: '30px' }}>
                                    {dur}s
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Sound Effects — AFTER timing, auto-selected by niche ── */}
                  {timingGenerated && (
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
                            onClick={() => {
                              setSfxLoading(true);
                              setTimeout(() => {
                                setSfxLoading(false);
                                setSfxGenerated(true);
                              }, 1500);
                            }}
                            disabled={sfxLoading}
                          >
                            {sfxLoading ? 'Generating SFX...' : `Generate ${(script?.scenes?.length || 7) - 1} Sound Effects`}
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
                {(timingGenerated && (!sfxEnabled || sfxGenerated)) && (
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
                <div style={{ color: '#111827' }}>Framework: <strong>{FRAMEWORKS.find(f => f.id === selectedFramework)?.name || '—'}</strong></div>
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
                onClick={() => {
                  if (generating) return;
                  setGenerating(true);
                  setGenerationProgress({ step: 'Starting pipeline...', pct: 0 });
                  // Simulate generation progress
                  const steps = [
                    { step: 'Generating starting images...', pct: 10 },
                    { step: 'Scene 1: Generating video clip...', pct: 20 },
                    { step: 'Scene 2: Extracting last frame + generating video...', pct: 35 },
                    { step: 'Scene 3: Generating video clip...', pct: 50 },
                    { step: 'Scene 4: Generating video clip...', pct: 65 },
                    { step: 'Scene 5: Generating video clip...', pct: 75 },
                    { step: 'Burning captions...', pct: 85 },
                    { step: 'Assembling final video with FFmpeg...', pct: 92 },
                    { step: 'Uploading to library...', pct: 98 },
                  ];
                  steps.forEach((s, i) => {
                    setTimeout(() => setGenerationProgress(s), (i + 1) * 1500);
                  });
                  setTimeout(() => {
                    setGenerating(false);
                    setGenerationComplete(true);
                  }, steps.length * 1500 + 500);
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
                  <button
                    style={{
                      flex: 1,
                      padding: '14px',
                      borderRadius: '8px',
                      border: '1px solid #111827',
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ▶ Preview Video
                  </button>
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
