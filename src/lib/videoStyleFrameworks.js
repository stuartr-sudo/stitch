/**
 * Frontend mirror of api/lib/videoStyleFrameworks.js.
 * Display data only — no pipeline config. Keep in sync with backend when adding frameworks.
 *
 * Badges are derived from pipeline properties:
 *   frameChain    → 'Frame Chain'
 *   ttsMode       → 'Single TTS' | 'Per-Scene TTS'
 *   transitionType → 'Crossfade' | 'Hard Cut'
 */

function deriveBadges({ frameChain, ttsMode, transitionType }) {
  const badges = [];
  if (frameChain) badges.push('Frame Chain');
  badges.push(ttsMode === 'single' ? 'Single TTS' : 'Per-Scene TTS');
  badges.push(transitionType === 'crossfade' ? 'Crossfade' : 'Hard Cut');
  return badges;
}

export const FRAMEWORK_CARDS = [
  {
    id: 'personal_journey',
    name: 'Personal Journey',
    category: 'story',
    description: 'First-person narrative arc following a transformative experience with emotional beats.',
    thumb: '/assets/frameworks/personal-journey.jpg',
    hook: 'How I went from [A] to [B]',
    supportedDurations: [60, 90],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'cinematic', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: true, ttsMode: 'single', transitionType: 'crossfade' }),
  },
  {
    id: 'origin_story',
    name: 'Origin Story',
    category: 'story',
    description: 'The humble beginnings and rise of a brand, person, or idea — told with building energy.',
    thumb: '/assets/frameworks/origin-story.jpg',
    hook: 'How [brand/person/thing] started in a [humble place]',
    supportedDurations: [60, 90],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'documentary', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: true, ttsMode: 'single', transitionType: 'crossfade' }),
  },
  {
    id: 'mini_documentary',
    name: 'Mini Documentary',
    category: 'story',
    description: 'Authoritative deep-dive into a subject with cold open hook and measured narrative pacing.',
    thumb: '/assets/frameworks/mini-documentary.jpg',
    hook: 'The untold story of [X]',
    supportedDurations: [60, 90],
    defaults: { visualStyle: 'documentary', videoStylePreset: 'documentary', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: true, ttsMode: 'single', transitionType: 'crossfade' }),
  },
  {
    id: 'day_in_the_life',
    name: 'Day in the Life',
    category: 'story',
    description: 'Casual first-person walkthrough of a typical day with timestamp anchors and vlog energy.',
    thumb: '/assets/frameworks/day-in-the-life.jpg',
    hook: 'A day in the life of a [profession]',
    supportedDurations: [45, 60],
    defaults: { visualStyle: 'photorealistic', videoStylePreset: 'vlog_bts', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: true, ttsMode: 'single', transitionType: 'crossfade' }),
  },
  {
    id: 'before_after',
    name: 'Before & After',
    category: 'story',
    description: 'Transformation reveal with building tension and a satisfying visual payoff.',
    thumb: '/assets/frameworks/before-after.jpg',
    hook: 'Watch [X] transform from [A] to [B]',
    supportedDurations: [30, 45],
    defaults: { visualStyle: 'photorealistic', videoStylePreset: 'commercial', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: true, ttsMode: 'single', transitionType: 'crossfade' }),
  },
  {
    id: 'explainer_story',
    name: 'Explainer Story',
    category: 'story',
    description: 'Curiosity-driven explanation that subverts common assumptions with a satisfying reveal.',
    thumb: '/assets/frameworks/explainer-story.jpg',
    hook: 'Why [X] is the way it is',
    supportedDurations: [45, 60],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'cinematic', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: true, ttsMode: 'single', transitionType: 'crossfade' }),
  },
  {
    id: 'emotional_tribute',
    name: 'Emotional Tribute',
    category: 'story',
    description: 'Slow, warm tribute to a person, place, or era — heavy on feeling and visual beauty.',
    thumb: '/assets/frameworks/emotional-tribute.jpg',
    hook: 'A tribute to [X]',
    supportedDurations: [45, 60],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'cinematic', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: true, ttsMode: 'single', transitionType: 'crossfade' }),
  },
  {
    id: 'top_x_countdown',
    name: 'Top X Countdown',
    category: 'fast_paced',
    description: 'Ranked list with energetic pacing — each item gets its own punchy scene.',
    thumb: '/assets/frameworks/top-x-countdown.jpg',
    hook: "Top 5 [X] you've never heard of",
    supportedDurations: [30, 45, 60],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'tiktok_reels', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: false, ttsMode: 'per_scene', transitionType: 'hard_cut' }),
  },
  {
    id: 'everything_you_need_to_know',
    name: 'Everything You Need to Know',
    category: 'fast_paced',
    description: 'Dense information delivery — explain a topic completely in under a minute.',
    thumb: '/assets/frameworks/everything-you-need-to-know.jpg',
    hook: 'Everything you need to know about [X] in 60 seconds',
    supportedDurations: [30, 60],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'tiktok_reels', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: false, ttsMode: 'per_scene', transitionType: 'hard_cut' }),
  },
  {
    id: 'myth_busting',
    name: 'Myth Busting',
    category: 'fast_paced',
    description: 'Debunk popular misconceptions with confident energy and a clear alternative.',
    thumb: '/assets/frameworks/myth-busting.jpg',
    hook: '3 myths about [X] that are completely wrong',
    supportedDurations: [30, 45, 60],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'commercial', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: false, ttsMode: 'per_scene', transitionType: 'hard_cut' }),
  },
  {
    id: 'comparison_versus',
    name: 'Comparison / Versus',
    category: 'fast_paced',
    description: 'Head-to-head matchup between two options, ending with a decisive verdict.',
    thumb: '/assets/frameworks/comparison-versus.jpg',
    hook: '[X] vs [Y] - which one actually wins?',
    supportedDurations: [30, 45],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'commercial', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: false, ttsMode: 'per_scene', transitionType: 'hard_cut' }),
  },
  {
    id: 'did_you_know',
    name: 'Did You Know',
    category: 'fast_paced',
    description: 'Surprising facts delivered with conspiratorial energy — each one lands with weight.',
    thumb: '/assets/frameworks/did-you-know.jpg',
    hook: "What you didn't know about [X]",
    supportedDurations: [30, 60],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'tiktok_reels', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: false, ttsMode: 'per_scene', transitionType: 'hard_cut' }),
  },
  {
    id: 'challenge_experiment',
    name: 'Challenge / Experiment',
    category: 'story',
    description: 'First-person challenge or experiment with timestamp anchors and personal outcome reveal.',
    thumb: '/assets/frameworks/challenge-experiment.jpg',
    hook: "I tried [X] for 30 days - here's what happened",
    supportedDurations: [45, 60],
    defaults: { visualStyle: 'photorealistic', videoStylePreset: 'vlog_bts', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: true, ttsMode: 'single', transitionType: 'crossfade' }),
  },
  {
    id: 'history_timeline',
    name: 'History / Timeline',
    category: 'fast_paced',
    description: 'Fast chronological sweep through an era or evolution with year-stamped scenes.',
    thumb: '/assets/frameworks/history-timeline.jpg',
    hook: 'The entire history of [X] in 60 seconds',
    supportedDurations: [60, 90],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'documentary', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: false, ttsMode: 'per_scene', transitionType: 'hard_cut' }),
  },
  {
    id: 'hot_take',
    name: 'Hot Take',
    category: 'fast_paced',
    description: 'Bold opinion delivered with confidence — makes viewers react and share.',
    thumb: '/assets/frameworks/hot-take.jpg',
    hook: 'The most overrated [X] and what to use instead',
    supportedDurations: [30, 45],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'tiktok_reels', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: false, ttsMode: 'per_scene', transitionType: 'hard_cut' }),
  },
  {
    id: 'how_it_works',
    name: 'How It Works',
    category: 'story',
    description: 'Clear, teacher-like walkthrough of a mechanism or process with visual anchors.',
    thumb: '/assets/frameworks/how-it-works.jpg',
    hook: 'How [X] actually works',
    supportedDurations: [45, 60],
    defaults: { visualStyle: 'cinematic', videoStylePreset: 'corporate', imageModel: 'fal_nano_banana', videoModel: 'fal_veo3' },
    badges: deriveBadges({ frameChain: true, ttsMode: 'single', transitionType: 'crossfade' }),
  },
];

export function getFrameworkCard(id) {
  return FRAMEWORK_CARDS.find(f => f.id === id) || null;
}

export function getFrameworksByCategory(category) {
  return FRAMEWORK_CARDS.filter(f => f.category === category);
}
