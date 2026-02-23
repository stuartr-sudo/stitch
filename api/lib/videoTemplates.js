/**
 * Video Template Library
 * Defines scene structures for different article/content types.
 * Each template maps to a storyboard blueprint that the pipeline fills in.
 */

export const TEMPLATE_TYPES = {
  LISTICLE: 'listicle',
  PRODUCT_REVIEW: 'product_review',
  HOW_TO: 'how_to',
  NEWS: 'news',
  COMPARISON: 'comparison',
  TESTIMONIAL: 'testimonial',
};

// Scene roles within a video
export const SCENE_ROLES = {
  HOOK: 'hook',           // First 0-3s — grab attention
  PROBLEM: 'problem',     // Establish the pain point
  SOLUTION: 'solution',   // Present the answer
  PROOF: 'proof',         // Evidence / demonstration
  POINT: 'point',         // A single list item
  STEP: 'step',           // A how-to step
  COMPARISON: 'comparison', // Before vs After / A vs B
  CTA: 'cta',             // Call to action finale
};

/**
 * Template definitions.
 * scene_count: how many scenes to generate
 * scenes: blueprint with role, duration, and overlay style guidance
 * music_mood: hint for Beatoven music generation
 * voice_pacing: hint for voiceover pacing
 */
export const VIDEO_TEMPLATES = {
  [TEMPLATE_TYPES.LISTICLE]: {
    name: 'Listicle',
    description: 'Top N tips/reasons/ways — quick cuts with numbered overlays',
    scene_count: 5,
    total_duration_seconds: 30,
    scenes: [
      { role: SCENE_ROLES.HOOK,     duration: 3,  overlay_style: 'bold_white',       position: 'center',      hint: 'Attention-grabbing hook with the number (e.g. "5 things you didn\'t know about X")' },
      { role: SCENE_ROLES.POINT,    duration: 5,  overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: 'Point 1 with numbered headline' },
      { role: SCENE_ROLES.POINT,    duration: 5,  overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: 'Point 2 with numbered headline' },
      { role: SCENE_ROLES.POINT,    duration: 5,  overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: 'Point 3 — the most surprising or valuable one' },
      { role: SCENE_ROLES.CTA,      duration: 4,  overlay_style: 'bold_white',       position: 'center',      hint: 'Brand CTA with tagline' },
    ],
    music_mood: 'upbeat energetic background music, modern trending',
    voice_pacing: 'fast, punchy, enthusiastic',
  },

  [TEMPLATE_TYPES.PRODUCT_REVIEW]: {
    name: 'Product Review',
    description: 'Problem → Solution → Proof → CTA flow',
    scene_count: 5,
    total_duration_seconds: 30,
    scenes: [
      { role: SCENE_ROLES.HOOK,     duration: 3,  overlay_style: 'bold_white',       position: 'top_safe',    hint: 'Relatable pain point question to hook viewer' },
      { role: SCENE_ROLES.PROBLEM,  duration: 4,  overlay_style: 'minimal_dark',     position: 'bottom_safe', hint: 'Show the problem the product solves' },
      { role: SCENE_ROLES.SOLUTION, duration: 6,  overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: 'Product reveal and key benefit showcase' },
      { role: SCENE_ROLES.PROOF,    duration: 6,  overlay_style: 'minimal_dark',     position: 'bottom_safe', hint: 'Result, testimonial quote, or before/after visual' },
      { role: SCENE_ROLES.CTA,      duration: 4,  overlay_style: 'bold_white',       position: 'center',      hint: 'Offer, discount, or urgency CTA' },
    ],
    music_mood: 'confident uplifting background music, brand-friendly',
    voice_pacing: 'conversational, builds trust, clear benefit language',
  },

  [TEMPLATE_TYPES.HOW_TO]: {
    name: 'How-To / Tutorial',
    description: 'Step-by-step instructional format',
    scene_count: 5,
    total_duration_seconds: 35,
    scenes: [
      { role: SCENE_ROLES.HOOK,     duration: 3,  overlay_style: 'bold_white',       position: 'center',      hint: 'Promise the outcome ("Learn how to X in 3 steps")' },
      { role: SCENE_ROLES.STEP,     duration: 6,  overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: 'Step 1 — the setup or first action' },
      { role: SCENE_ROLES.STEP,     duration: 6,  overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: 'Step 2 — the key technique or middle action' },
      { role: SCENE_ROLES.STEP,     duration: 6,  overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: 'Step 3 — the finishing step and result reveal' },
      { role: SCENE_ROLES.CTA,      duration: 4,  overlay_style: 'bold_white',       position: 'center',      hint: 'Encourage to try it + brand link' },
    ],
    music_mood: 'calm instructional background music, focus-friendly',
    voice_pacing: 'clear, steady, educational, reassuring',
  },

  [TEMPLATE_TYPES.NEWS]: {
    name: 'News / Announcement',
    description: 'Breaking news or product announcement format',
    scene_count: 4,
    total_duration_seconds: 20,
    scenes: [
      { role: SCENE_ROLES.HOOK,     duration: 3,  overlay_style: 'bold_white',       position: 'top_safe',    hint: 'Breaking headline or announcement hook' },
      { role: SCENE_ROLES.POINT,    duration: 5,  overlay_style: 'minimal_dark',     position: 'bottom_safe', hint: 'Key detail 1 — the what and why it matters' },
      { role: SCENE_ROLES.POINT,    duration: 5,  overlay_style: 'minimal_dark',     position: 'bottom_safe', hint: 'Key detail 2 — context or impact' },
      { role: SCENE_ROLES.CTA,      duration: 4,  overlay_style: 'bold_white',       position: 'center',      hint: 'Where to find more / link to article' },
    ],
    music_mood: 'neutral professional background music, news-style',
    voice_pacing: 'authoritative, clear, concise, journalistic',
  },

  [TEMPLATE_TYPES.COMPARISON]: {
    name: 'Comparison / Before-After',
    description: 'A vs B or Before vs After format',
    scene_count: 4,
    total_duration_seconds: 25,
    scenes: [
      { role: SCENE_ROLES.HOOK,      duration: 3,  overlay_style: 'bold_white',       position: 'center',      hint: 'Teaser: "Which is better? We tested both."' },
      { role: SCENE_ROLES.COMPARISON,duration: 7,  overlay_style: 'minimal_dark',     position: 'bottom_safe', hint: 'Option A / Before state — honest representation' },
      { role: SCENE_ROLES.COMPARISON,duration: 7,  overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: 'Option B / After state — the clear winner' },
      { role: SCENE_ROLES.CTA,       duration: 4,  overlay_style: 'bold_white',       position: 'center',      hint: 'Verdict + CTA to the winning option' },
    ],
    music_mood: 'suspenseful then triumphant background music',
    voice_pacing: 'analytical, fair, then decisive',
  },

  [TEMPLATE_TYPES.TESTIMONIAL]: {
    name: 'Testimonial / Social Proof',
    description: 'Customer story or quote-driven format',
    scene_count: 4,
    total_duration_seconds: 25,
    scenes: [
      { role: SCENE_ROLES.HOOK,     duration: 3,  overlay_style: 'bold_white',       position: 'center',      hint: 'Relatable problem the customer had' },
      { role: SCENE_ROLES.PROOF,    duration: 7,  overlay_style: 'gradient_overlay', position: 'bottom_safe', hint: 'Customer quote or result highlight (big number or transformation)' },
      { role: SCENE_ROLES.SOLUTION, duration: 6,  overlay_style: 'minimal_dark',     position: 'bottom_safe', hint: 'Brand or product that made the difference' },
      { role: SCENE_ROLES.CTA,      duration: 4,  overlay_style: 'bold_white',       position: 'center',      hint: 'Join them — social proof CTA' },
    ],
    music_mood: 'warm emotional background music, inspirational',
    voice_pacing: 'warm, personal, authentic, conversational',
  },
};

/**
 * Match article analysis to the most appropriate template.
 * @param {object} analysis - { article_type, tone, has_product, has_steps, has_comparison, has_quotes }
 * @returns {string} template key
 */
export function matchTemplate(analysis) {
  const { article_type, has_product, has_steps, has_comparison, has_quotes } = analysis;

  // Explicit article type wins if we trust it
  if (article_type === 'listicle') return TEMPLATE_TYPES.LISTICLE;
  if (article_type === 'how_to' || article_type === 'tutorial') return TEMPLATE_TYPES.HOW_TO;
  if (article_type === 'comparison') return TEMPLATE_TYPES.COMPARISON;
  if (article_type === 'news' || article_type === 'announcement') return TEMPLATE_TYPES.NEWS;
  if (article_type === 'review') return TEMPLATE_TYPES.PRODUCT_REVIEW;
  if (article_type === 'testimonial' || article_type === 'case_study') return TEMPLATE_TYPES.TESTIMONIAL;

  // Fallback: infer from signals
  if (has_steps) return TEMPLATE_TYPES.HOW_TO;
  if (has_comparison) return TEMPLATE_TYPES.COMPARISON;
  if (has_quotes) return TEMPLATE_TYPES.TESTIMONIAL;
  if (has_product) return TEMPLATE_TYPES.PRODUCT_REVIEW;

  return TEMPLATE_TYPES.LISTICLE; // safest default
}

/**
 * Get platform aspect ratios for a list of platform keys.
 * Groups platforms by unique aspect ratio to avoid duplicate renders.
 * @param {string[]} platforms - e.g. ['tiktok', 'instagram_reels', 'youtube_video']
 * @returns {{ ratio: string, platforms: string[] }[]}
 */
export function groupPlatformsByRatio(platforms) {
  const PLATFORM_RATIOS = {
    tiktok: '9:16',
    instagram_reels: '9:16',
    instagram_feed: '1:1',
    instagram_story: '9:16',
    facebook_feed: '1:1',
    facebook_reels: '9:16',
    youtube_video: '16:9',
    youtube_shorts: '9:16',
    linkedin_feed: '1:1',
    pinterest: '2:3',
  };

  const groups = {};
  for (const p of platforms) {
    const ratio = PLATFORM_RATIOS[p] || '9:16';
    if (!groups[ratio]) groups[ratio] = [];
    groups[ratio].push(p);
  }

  return Object.entries(groups).map(([ratio, plats]) => ({ ratio, platforms: plats }));
}
