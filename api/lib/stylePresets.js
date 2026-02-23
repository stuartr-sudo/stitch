/**
 * Visual Style Presets — locked visual guidelines per template.
 *
 * Each preset defines lighting, camera, color grade, and mood descriptors.
 * The `prompt_suffix` is appended to every scene's visual_prompt before
 * hitting the image generation API, ensuring the AI stays on-style.
 *
 * Used by:
 *   - api/article/from-url.js  (pipeline injection)
 *   - src/pages/TemplatesPage.jsx  (mirrored client-side for the selector UI)
 */

export const VISUAL_STYLE_PRESETS = {
  ugc: {
    label: 'UGC',
    description: 'Authentic, handheld, real-person feel',
    lighting: 'Natural window light or outdoor available light',
    camera: 'Handheld close-up, slight imperfection, 35mm f/1.8',
    color_grade: 'Warm natural tones, no heavy grading',
    mood: 'Authentic, relatable, unpolished',
    prompt_suffix:
      'authentic UGC video style, shot on iPhone handheld camera, available natural light, slightly imperfect framing, real environment background, candid feel, warm natural colors, 35mm lens',
  },

  testimonial: {
    label: 'Testimonial',
    description: 'Direct-to-camera, trust-building',
    lighting: 'Soft box studio lighting, minimal shadows',
    camera: 'Tripod, medium close-up portrait, centered',
    color_grade: 'Clean, slightly warm, accurate skin tones',
    mood: 'Trustworthy, conversational, direct',
    prompt_suffix:
      'talking-head testimonial style, person facing camera, clean neutral background, professional soft box lighting, portrait framing, warm approachable tone, shallow depth of field, studio quality',
  },

  cinematic: {
    label: 'Cinematic',
    description: 'Dramatic, film-quality look',
    lighting: 'Dramatic directional lighting or golden hour',
    camera: 'Anamorphic wide angle, cinematic composition',
    color_grade: 'Teal shadows, warm highlights, film grain',
    mood: 'Epic, dramatic, premium',
    prompt_suffix:
      'cinematic photography, anamorphic lens flare, dramatic moody lighting, shallow depth of field, teal and orange color grade, film grain, high production value, epic wide composition',
  },

  product_demo: {
    label: 'Product Demo',
    description: 'Clean product focus, studio quality',
    lighting: 'Bright studio soft box, minimal shadows',
    camera: 'Overhead or 3/4 angle, sharp product focus',
    color_grade: 'Clean, accurate colors, high contrast',
    mood: 'Professional, aspirational, product-focused',
    prompt_suffix:
      'product photography on clean white or neutral background, professional studio lighting soft box, minimal shadow, 3/4 angle commercial photography, crisp sharp product detail, high contrast clean look',
  },

  lifestyle: {
    label: 'Lifestyle',
    description: 'Aspirational, real-world context',
    lighting: 'Golden hour warm sunlight or window light',
    camera: 'Wide to medium, environmental context',
    color_grade: 'Warm golden tones, slightly overexposed',
    mood: 'Aspirational, joyful, authentic lifestyle',
    prompt_suffix:
      'lifestyle photography, golden hour warm sunlight, outdoor or beautiful interior, aspirational aesthetic, person in real-life context, warm golden tones, environmental storytelling, relatable moment',
  },

  bold_punchy: {
    label: 'Bold & Punchy',
    description: 'High contrast, graphic, eye-catching',
    lighting: 'High contrast, dramatic or colorful',
    camera: 'Dynamic close crops, diagonal composition',
    color_grade: 'Saturated, high contrast, vivid',
    mood: 'Energetic, bold, impossible to ignore',
    prompt_suffix:
      'bold graphic visual style, high contrast vivid saturated colors, striking dynamic composition, eye-catching visual impact, strong geometric framing, punchy energetic aesthetic',
  },

  minimal: {
    label: 'Minimal',
    description: 'Clean, restrained, premium',
    lighting: 'Soft diffused even lighting, no harsh shadows',
    camera: 'Centered, symmetrical, generous negative space',
    color_grade: 'Desaturated neutrals, monochromatic accents',
    mood: 'Premium, calm, sophisticated',
    prompt_suffix:
      'minimalist aesthetic, clean white or light gray background, generous negative space, restrained muted color palette, soft diffused even lighting, Scandinavian design sensibility, premium understated quality',
  },

  documentary: {
    label: 'Documentary',
    description: 'Raw, authentic, story-driven',
    lighting: 'Available light, natural, imperfect',
    camera: 'Observational framing, candid angles',
    color_grade: 'Desaturated, muted film-like tones',
    mood: 'Authentic, serious, real-world',
    prompt_suffix:
      'documentary photography style, candid real moment, available natural light, slight film grain, desaturated muted tones, journalistic framing, honest unposed composition, slice of life',
  },
};

/**
 * Return the prompt suffix for a given preset key, or '' if not found.
 * @param {string|null} presetKey
 * @returns {string}
 */
export function getStyleSuffix(presetKey) {
  if (!presetKey || !VISUAL_STYLE_PRESETS[presetKey]) return '';
  return `, ${VISUAL_STYLE_PRESETS[presetKey].prompt_suffix}`;
}
