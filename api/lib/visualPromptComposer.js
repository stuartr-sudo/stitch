/**
 * Visual Prompt Composer V3 — Coherent prompt assembly with motion style lock.
 *
 * Takes a scene direction (from sceneDirector.js), visual style config,
 * AND video style preset, and produces:
 *   1. A SINGLE COHERENT image generation prompt
 *   2. A motion prompt that ALWAYS includes the video style preset DNA
 *
 * KEY CHANGES FROM V2:
 * - V2 had a stub composeVideoPrompt() that ignored video style presets
 * - V3 injects the video style preset into every motion prompt
 * - V3 builds motion prompts that combine scene-specific motion with
 *   the global cinematographic identity
 * - V3 properly deduplicates style elements already present in the
 *   scene director's output
 *
 * No LLM calls — pure deterministic composition with intelligent merging.
 */

import { getVisualStyleSuffix } from './visualStyles.js';
import { getVideoStylePrompt } from './videoStylePresets.js';

/**
 * Check if a prompt already contains a concept (fuzzy match).
 */
function promptContains(prompt, concept) {
  const lower = prompt.toLowerCase();
  const terms = concept.toLowerCase().split(/\s+/);
  if (terms.length === 1) return lower.includes(terms[0]);
  // For multi-word concepts, check if any significant word (>4 chars) appears
  return terms.some(t => t.length > 4 && lower.includes(t));
}

/**
 * Merge a clause into a prompt naturally (comma-separated, not period-separated).
 */
function mergeClause(base, clause) {
  if (!clause || promptContains(base, clause)) return base;
  const trimmed = base.replace(/\.\s*$/, '');
  return `${trimmed}, ${clause}`;
}

/**
 * Extract the essential style DNA from a video style preset prompt.
 * Takes the full verbose preset (e.g., 200 words for "cinematic") and
 * extracts the 3-4 most distinctive clauses for motion prompt injection.
 * 
 * This prevents bloated motion prompts while keeping the style locked.
 */
function extractMotionStyleDNA(videoStylePrompt) {
  if (!videoStylePrompt) return '';

  // Split on commas and take the most distinctive clauses
  const clauses = videoStylePrompt.split(',').map(c => c.trim()).filter(Boolean);

  // Prioritize clauses that describe camera movement, lighting quality, and motion feel
  const motionKeywords = ['camera', 'movement', 'motion', 'handheld', 'gimbal', 'dolly', 'tracking',
    'shake', 'drift', 'pan', 'zoom', 'push', 'pull', 'crane', 'steadicam', 'stabiliz',
    'slow', 'fast', 'smooth', 'snap', 'whip', '24fps', 'motion blur', 'speed'];
  const lightingKeywords = ['lighting', 'light', 'shadow', 'illuminat', 'glow', 'backlit', 'rim'];
  const aestheticKeywords = ['aesthetic', 'feel', 'energy', 'atmosphere', 'mood', 'quality', 'style',
    'grain', 'film', 'color', 'grade', 'tone', 'palette'];

  const isRelevant = (clause) => {
    const lower = clause.toLowerCase();
    return [...motionKeywords, ...lightingKeywords, ...aestheticKeywords]
      .some(kw => lower.includes(kw));
  };

  const relevant = clauses.filter(isRelevant);

  // Take up to 5 most relevant clauses, or fall back to first 4 clauses
  const selected = relevant.length >= 3 ? relevant.slice(0, 5) : clauses.slice(0, 4);
  return selected.join(', ');
}

/**
 * Compose the final image generation prompt for a keyframe.
 *
 * Produces a SINGLE FLOWING DESCRIPTION suitable for image generation models.
 *
 * @param {object} params
 * @param {object} params.sceneDirection - { imagePrompt, motionHint, continuity_anchors }
 * @param {string} [params.visualStyle] - Visual style key (from visualStyles.js)
 * @param {string} [params.visualStylePrompt] - Custom visual style text
 * @param {string} [params.videoStyle] - Video style key (from videoStylePresets.js)
 * @param {object} [params.frameworkDefaults] - { lightingDefault, colorPaletteDefault, cameraDefault }
 * @param {string} [params.aspectRatio] - '9:16' | '16:9' | '1:1'
 * @param {Array} [params.loraConfigs] - LoRA configs with trigger words
 * @param {boolean} [params.isFirstScene]
 * @param {boolean} [params.frameChain] - Whether this is in a continuity chain
 * @param {string} [params.visualAnalysis] - Visual analysis of the previous frame
 * @returns {{ imagePrompt: string, motionPrompt: string, negativePrompt: string }}
 */
export function composePrompts({
  sceneDirection,
  visualStyle,
  visualStylePrompt,
  videoStyle,
  frameworkDefaults,
  aspectRatio = '9:16',
  loraConfigs = [],
  isFirstScene = false,
  frameChain = false,
  visualAnalysis = null,
}) {
  let imagePrompt = sceneDirection.imagePrompt || '';

  // 1. LoRA trigger words — prepend naturally
  const triggerWords = loraConfigs.map(c => c.triggerWord).filter(Boolean);
  if (triggerWords.length > 0) {
    imagePrompt = `${triggerWords.join(', ')}, ${imagePrompt}`;
  }

  // 2. Framework defaults — ONLY add if the director's prompt is missing them
  if (frameworkDefaults) {
    if (frameworkDefaults.lightingDefault && !promptContains(imagePrompt, 'light') && !promptContains(imagePrompt, 'illuminat') && !promptContains(imagePrompt, 'kelvin') && !promptContains(imagePrompt, '000K')) {
      imagePrompt = mergeClause(imagePrompt, frameworkDefaults.lightingDefault);
    }
    if (frameworkDefaults.colorPaletteDefault && !promptContains(imagePrompt, 'palette') && !promptContains(imagePrompt, 'color') && !promptContains(imagePrompt, 'tones') && !promptContains(imagePrompt, '#')) {
      imagePrompt = mergeClause(imagePrompt, frameworkDefaults.colorPaletteDefault);
    }
    if (frameworkDefaults.cameraDefault && !promptContains(imagePrompt, 'mm') && !promptContains(imagePrompt, 'lens') && !promptContains(imagePrompt, 'focal')) {
      imagePrompt = mergeClause(imagePrompt, frameworkDefaults.cameraDefault);
    }
  }

  // 3. Visual style — append as a style modifier clause
  const styleSuffix = visualStylePrompt || getVisualStyleSuffix(visualStyle);
  if (styleSuffix) {
    const cleanSuffix = styleSuffix.replace(/^[,.\s]+/, '').replace(/[,.\s]+$/, '');
    if (cleanSuffix && !promptContains(imagePrompt, cleanSuffix.split(',')[0])) {
      imagePrompt = mergeClause(imagePrompt, cleanSuffix);
    }
  }

  // 4. Visual continuity from previous frame analysis
  if (visualAnalysis && frameChain) {
    const shortAnalysis = visualAnalysis.slice(0, 150).replace(/\.\s*$/, '');
    imagePrompt = `Continuing from: ${shortAnalysis}. ${imagePrompt}`;
  }

  // 5. Continuity anchors (for chain mode)
  if (sceneDirection.continuity_anchors && frameChain) {
    const anchors = sceneDirection.continuity_anchors;
    if (anchors && !promptContains(imagePrompt, anchors.split(',')[0])) {
      imagePrompt = mergeClause(imagePrompt, `maintaining: ${anchors}`);
    }
  }

  // 6. Format constraint — add once at the end
  const orientationMap = {
    '9:16': 'vertical portrait',
    '16:9': 'horizontal landscape',
    '1:1': 'square',
    '4:3': 'standard',
    '3:4': 'portrait',
  };
  const orientation = orientationMap[aspectRatio] || 'vertical portrait';
  imagePrompt = `${imagePrompt.replace(/[.\s]+$/, '')}. ${orientation} composition, no text or words in image`;

  // 7. Negative prompt
  const negativePrompt = 'blurry, distorted, low quality, watermark, text artifacts, extra limbs, deformed, duplicate, cropped, words, letters, typography, UI elements, logos, signatures';

  // 8. Motion prompt — NOW includes video style preset DNA
  const motionPrompt = composeVideoPrompt(
    '', // imageContext not needed when motionHint is present
    sceneDirection.motionHint || '',
    { videoStyle, isFLF: frameChain }
  );

  return { imagePrompt, motionPrompt, negativePrompt };
}

/**
 * Compose prompts for INDEPENDENT (non-continuous) scenes.
 */
export function composeIndependentPrompt({
  sceneDirection,
  visualStyle,
  visualStylePrompt,
  videoStyle,
  frameworkDefaults,
  aspectRatio = '9:16',
  loraConfigs = [],
}) {
  return composePrompts({
    sceneDirection,
    visualStyle,
    visualStylePrompt,
    videoStyle,
    frameworkDefaults,
    aspectRatio,
    loraConfigs,
    isFirstScene: false,
    frameChain: false,
    visualAnalysis: null,
  });
}

// ── Camera Control Vocabulary ─────────────────────────────────────────────────

const MOVEMENT_PROMPTS = {
  static: 'locked-off static camera, no movement',
  pan_left: 'smooth pan from right to left',
  pan_right: 'smooth pan from left to right',
  tilt_up: 'smooth upward tilt revealing the scene above',
  tilt_down: 'smooth downward tilt revealing the scene below',
  dolly_in: 'dolly push forward toward the subject',
  dolly_out: 'dolly pull backward away from the subject',
  orbit_left: 'orbiting arc movement circling left around the subject',
  orbit_right: 'orbiting arc movement circling right around the subject',
  tracking: 'tracking shot following the subject laterally',
  crane_up: 'crane shot rising upward with parallax',
  crane_down: 'crane shot descending downward with parallax',
  zoom_in: 'slow lens zoom pushing in on the subject',
  zoom_out: 'slow lens zoom pulling out to reveal the scene',
  handheld: 'handheld camera with natural organic sway',
  whip_pan: 'fast whip pan with motion blur',
};

const SPEED_MODIFIERS = {
  very_slow: 'glacially slow, barely perceptible',
  slow: 'gentle and deliberate',
  medium: 'smooth and steady',
  fast: 'swift and dynamic',
};

const ANGLE_PROMPTS = {
  eye_level: 'eye-level perspective, neutral and intimate',
  low_angle: 'low-angle shot looking up, conveying power and scale',
  high_angle: 'high-angle shot looking down, emphasizing vulnerability',
  dutch: 'tilted Dutch angle creating tension and unease',
  birds_eye: "overhead bird's eye view from directly above",
  worms_eye: "worm's eye view from ground level looking up, monumental scale",
};

const FRAMING_PROMPTS = {
  extreme_wide: 'extreme wide shot establishing full environment',
  wide: 'wide shot showing subject in environment',
  medium: 'medium shot from waist up',
  close_up: 'close-up shot capturing detail and emotion',
  extreme_close_up: 'extreme close-up on specific detail',
};

/**
 * Build a natural-language camera direction prompt from structured config.
 *
 * @param {object} cameraConfig - { movement, speed, angle, framing, customMotion }
 * @returns {string} Camera direction text ready for video generation prompts
 */
export function buildCameraPrompt(cameraConfig) {
  if (!cameraConfig) return '';
  if (cameraConfig.customMotion) return cameraConfig.customMotion;

  const parts = [];

  // Movement + speed
  const movementText = MOVEMENT_PROMPTS[cameraConfig.movement];
  const speedText = SPEED_MODIFIERS[cameraConfig.speed];
  if (movementText) {
    if (speedText && cameraConfig.movement !== 'static') {
      parts.push(`${speedText} ${movementText}`);
    } else {
      parts.push(movementText);
    }
  }

  // Angle
  const angleText = ANGLE_PROMPTS[cameraConfig.angle];
  if (angleText) parts.push(angleText);

  // Framing
  const framingText = FRAMING_PROMPTS[cameraConfig.framing];
  if (framingText) parts.push(framingText);

  return parts.join(', ') || '';
}

/**
 * Compose the full prompt for video generation (I2V or FLF).
 *
 * V3 CHANGE: Now integrates the video style preset prompt into every
 * video generation call, ensuring motion consistency across all scenes.
 *
 * @param {string} imageContext - Brief description of what's in the frame
 * @param {string} motionPrompt - Scene-specific motion from sceneDirector
 * @param {object} [options]
 * @param {string} [options.videoStyle] - Video style key from videoStylePresets.js
 * @param {boolean} [options.isFLF] - Is this for a first-last-frame model?
 * @param {object} [options.cameraConfig] - Structured camera config { movement, speed, angle, framing, customMotion }
 * @returns {string}
 */
export function composeVideoPrompt(imageContext, motionPrompt, options = {}) {
  const { videoStyle, isFLF, cameraConfig } = options;

  // If structured camera config provided, it replaces the motion prompt
  const cameraDirection = buildCameraPrompt(cameraConfig);
  if (cameraDirection) {
    motionPrompt = cameraDirection;
  }

  // Get the video style preset's motion DNA
  const fullVideoStylePrompt = getVideoStylePrompt(videoStyle);
  const motionDNA = extractMotionStyleDNA(fullVideoStylePrompt);

  // Scene-specific motion from the director
  const sceneMotion = motionPrompt || '';

  if (isFLF) {
    // FLF: Both images already provided, motion prompt drives the interpolation.
    // Combine scene-specific motion with the global motion style DNA.
    if (sceneMotion && motionDNA) {
      // Scene motion first (specific), then style DNA (global feel)
      return `${sceneMotion}. Style: ${motionDNA}`;
    }
    if (sceneMotion) return sceneMotion;
    if (motionDNA) return motionDNA;
    return 'Smooth cinematic movement';
  }

  // I2V: combine scene description with motion and style DNA
  const parts = [];
  if (sceneMotion) parts.push(sceneMotion);
  if (motionDNA) parts.push(motionDNA);
  if (imageContext) parts.push(`Scene context: ${imageContext.slice(0, 200)}`);

  return parts.join('. ') || 'Smooth cinematic movement';
}
