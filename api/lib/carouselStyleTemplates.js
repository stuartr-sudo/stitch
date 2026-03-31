/**
 * Carousel Style Templates
 *
 * Each template defines how text is laid out on carousel slides.
 * The VISUAL STYLE (image aesthetic) comes from StyleGrid / stylePresets.js.
 * The CAROUSEL STYLE controls text position, scrim, typography.
 *
 * Shared between frontend (selector) and backend (composeSlide).
 */

export const CAROUSEL_STYLE_TEMPLATES = [
  {
    value: 'bold_editorial',
    label: 'Bold Editorial',
    description: 'Large bold headlines at the bottom with a gradient scrim',
    layout: {
      textAlign: 'left',
      textPosition: 'bottom',
      scrimType: 'bottom_gradient',
      scrimOpacity: 0.75,
      scrimCoverage: 0.55,
      headlineSizeRatio: 0.055,
      bodySizeRatio: 0.03,
      headlineWeight: 'bold',
      bodyWeight: 'normal',
      headlineStyle: 'normal',
      margin: 0.08,
    },
  },
  {
    value: 'minimal_center',
    label: 'Minimal Center',
    description: 'Centered text with a light full-screen overlay',
    layout: {
      textAlign: 'center',
      textPosition: 'center',
      scrimType: 'full_overlay',
      scrimOpacity: 0.4,
      scrimCoverage: 1.0,
      headlineSizeRatio: 0.05,
      bodySizeRatio: 0.028,
      headlineWeight: 'bold',
      bodyWeight: 'normal',
      headlineStyle: 'normal',
      margin: 0.12,
    },
  },
  {
    value: 'dark_cinematic',
    label: 'Dark Cinematic',
    description: 'Heavy bottom scrim, large text, dramatic contrast',
    layout: {
      textAlign: 'left',
      textPosition: 'bottom',
      scrimType: 'bottom_gradient',
      scrimOpacity: 0.85,
      scrimCoverage: 0.65,
      headlineSizeRatio: 0.06,
      bodySizeRatio: 0.032,
      headlineWeight: 'bold',
      bodyWeight: 'normal',
      headlineStyle: 'normal',
      margin: 0.07,
    },
  },
  {
    value: 'magazine',
    label: 'Magazine',
    description: 'Italic headlines centered with quotation-style framing',
    layout: {
      textAlign: 'center',
      textPosition: 'center',
      scrimType: 'full_overlay',
      scrimOpacity: 0.5,
      scrimCoverage: 1.0,
      headlineSizeRatio: 0.048,
      bodySizeRatio: 0.026,
      headlineWeight: 'bold',
      headlineStyle: 'italic',
      bodyWeight: 'normal',
      margin: 0.1,
    },
  },
  {
    value: 'clean_bottom',
    label: 'Clean Bottom Bar',
    description: 'Solid dark bar at the bottom, clean text on top',
    layout: {
      textAlign: 'left',
      textPosition: 'bottom',
      scrimType: 'solid_bar',
      scrimOpacity: 0.88,
      scrimCoverage: 0.35,
      headlineSizeRatio: 0.042,
      bodySizeRatio: 0.026,
      headlineWeight: 'bold',
      bodyWeight: 'normal',
      headlineStyle: 'normal',
      margin: 0.06,
    },
  },
  {
    value: 'top_text',
    label: 'Top Headline',
    description: 'Text at the top with gradient scrim, image dominates below',
    layout: {
      textAlign: 'left',
      textPosition: 'top',
      scrimType: 'top_gradient',
      scrimOpacity: 0.7,
      scrimCoverage: 0.45,
      headlineSizeRatio: 0.048,
      bodySizeRatio: 0.028,
      headlineWeight: 'bold',
      bodyWeight: 'normal',
      headlineStyle: 'normal',
      margin: 0.08,
    },
  },
  {
    value: 'text_only',
    label: 'Text Only',
    description: 'No background image, solid dark background with centered text',
    layout: {
      textAlign: 'center',
      textPosition: 'center',
      scrimType: 'full_overlay',
      scrimOpacity: 0.95,
      scrimCoverage: 1.0,
      headlineSizeRatio: 0.055,
      bodySizeRatio: 0.03,
      headlineWeight: 'bold',
      bodyWeight: 'normal',
      headlineStyle: 'normal',
      margin: 0.1,
    },
  },
  {
    value: 'side_strip',
    label: 'Side Strip',
    description: 'Dark strip on the left side, text vertically centered',
    layout: {
      textAlign: 'left',
      textPosition: 'center',
      scrimType: 'left_strip',
      scrimOpacity: 0.82,
      scrimCoverage: 0.55,
      headlineSizeRatio: 0.045,
      bodySizeRatio: 0.026,
      headlineWeight: 'bold',
      bodyWeight: 'normal',
      headlineStyle: 'normal',
      margin: 0.06,
    },
  },
];

export function getCarouselTemplate(value) {
  return CAROUSEL_STYLE_TEMPLATES.find(t => t.value === value) || CAROUSEL_STYLE_TEMPLATES[0];
}
