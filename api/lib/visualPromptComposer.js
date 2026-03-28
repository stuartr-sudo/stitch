/**
 * Visual Prompt Composer V2 — Coherent prompt assembly.
 *
 * Takes a scene direction (from sceneDirector.js) and visual style config,
 * and produces a SINGLE COHERENT image generation prompt.
 *
 * KEY CHANGE FROM V1:
 * - V1 joined fragments with periods: "Subject. Lighting. Style. Format." → garbage
 * - V2 produces a flowing description with clauses, commas, and natural language
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
 * Compose the final image generation prompt for a keyframe.
 *
 * Produces a SINGLE FLOWING DESCRIPTION suitable for image generation models.
 *
 * @param {object} params
 * @param {object} params.sceneDirection - { imagePrompt, motionHint, continuity_anchors }
 * @param {string} [params.visualStyle] - Visual style key
 * @param {string} [params.visualStylePrompt] - Custom visual style text
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
    if (frameworkDefaults.lightingDefault && !promptContains(imagePrompt, 'light') && !promptContains(imagePrompt, 'illuminat')) {
      imagePrompt = mergeClause(imagePrompt, frameworkDefaults.lightingDefault);
    }
    if (frameworkDefaults.colorPaletteDefault && !promptContains(imagePrompt, 'palette') && !promptContains(imagePrompt, 'color') && !promptContains(imagePrompt, 'tones')) {
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

  const motionPrompt = sceneDirection.motionHint || '';

  return { imagePrompt, motionPrompt, negativePrompt };
}

/**
 * Compose prompts for INDEPENDENT (non-continuous) scenes.
 */
export function composeIndependentPrompt({
  sceneDirection,
  visualStyle,
  visualStylePrompt,
  frameworkDefaults,
  aspectRatio = '9:16',
  loraConfigs = [],
}) {
  return composePrompts({
    sceneDirection,
    visualStyle,
    visualStylePrompt,
    frameworkDefaults,
    aspectRatio,
    loraConfigs,
    isFirstScene: false,
    frameChain: false,
    visualAnalysis: null,
  });
}

/**
 * Compose the full prompt for video generation (I2V or FLF).
 *
 * @param {string} imageContext - Brief description of what's in the frame
 * @param {string} motionPrompt - What should happen during the clip
 * @param {object} [options]
 * @param {boolean} [options.isFLF] - Is this for a first-last-frame model?
 * @returns {string}
 */
export function composeVideoPrompt(imageContext, motionPrompt, options = {}) {
  if (!motionPrompt) return imageContext || 'Smooth cinematic movement';

  if (options.isFLF) {
    // FLF: motion prompt is primary, both images already provided
    return motionPrompt;
  }

  // I2V: combine scene description with motion
  if (!imageContext) return motionPrompt;
  return `${motionPrompt}. Scene context: ${imageContext.slice(0, 200)}`;
}
