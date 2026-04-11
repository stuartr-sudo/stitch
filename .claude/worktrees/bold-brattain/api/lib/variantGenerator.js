/**
 * A/B Variant Generator — selects contrasting style presets for variant drafts.
 *
 * Given the original preset, returns 2 alternative presets that provide
 * maximum visual contrast for A/B testing.
 */

import { VISUAL_STYLE_PRESETS } from './stylePresets.js';

const PRESET_KEYS = Object.keys(VISUAL_STYLE_PRESETS);

// Hand-picked contrast pairs for maximum visual differentiation
const CONTRAST_MAP = {
  ugc:          ['cinematic', 'bold_punchy'],
  cinematic:    ['ugc', 'minimal'],
  product_demo: ['lifestyle', 'bold_punchy'],
  lifestyle:    ['product_demo', 'cinematic'],
  bold_punchy:  ['minimal', 'cinematic'],
  minimal:      ['bold_punchy', 'lifestyle'],
  testimonial:  ['cinematic', 'ugc'],
  documentary:  ['cinematic', 'bold_punchy'],
};

/**
 * Select variant presets that contrast with the original.
 * @param {string} originalPreset - The preset key used by the original draft
 * @param {number} count - How many variants to generate (default 2)
 * @returns {string[]} Array of preset keys for variant generation
 */
export function selectVariantPresets(originalPreset, count = 2) {
  const candidates = CONTRAST_MAP[originalPreset]
    || PRESET_KEYS.filter(k => k !== originalPreset);
  return candidates.slice(0, count);
}
