/**
 * Visual Prompt Composer — deterministic prompt assembly.
 *
 * Takes a scene direction (from sceneDirector.js) and visual style config,
 * and produces the final image generation prompt and video motion prompt.
 *
 * No LLM calls — this is pure string composition with rules.
 */

import { getVisualStyleSuffix } from './visualStyles.js';
import { getVideoStylePrompt } from './videoStylePresets.js';

/**
 * Compose the final image generation prompt for a keyframe.
 *
 * Works with the keyframe schema from sceneDirector.js:
 *   { imagePrompt: string, motionHint: string }
 *
 * Enriches the scene director's imagePrompt with:
 * - LoRA trigger words
 * - Framework scene defaults (lighting, color palette, camera)
 * - Visual style suffix
 * - Format/quality tokens
 *
 * @param {object} params
 * @param {object} params.sceneDirection - Keyframe from sceneDirector: { imagePrompt, motionHint }
 * @param {string} [params.visualStyle] - Visual style key (e.g., 'cinematic_photo')
 * @param {string} [params.visualStylePrompt] - Custom visual style prompt text (overrides key lookup)
 * @param {object} [params.frameworkDefaults] - framework.sceneDefaults: { lightingDefault, colorPaletteDefault, cameraDefault }
 * @param {string} [params.aspectRatio] - '9:16' | '16:9' | '1:1'
 * @param {Array} [params.loraConfigs] - LoRA trigger words to prepend
 * @param {boolean} [params.isFirstScene] - Unused in keyframe mode (kept for API compat)
 * @param {boolean} [params.frameChain] - Unused in keyframe mode (kept for API compat)
 * @returns {{ imagePrompt: string, motionPrompt: string }}
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
}) {
  const parts = [];

  // 1. LoRA trigger words first
  const triggerWords = loraConfigs
    .map(c => c.triggerWord)
    .filter(Boolean);
  if (triggerWords.length > 0) {
    parts.push(triggerWords.join(', '));
  }

  // 2. Core image prompt from scene director (keyframe imagePrompt)
  // The scene director already produces hyper-specific prompts with subject, pose,
  // setting, lighting, camera angle — we ADD framework defaults only if the
  // director's prompt doesn't already cover them.
  if (sceneDirection.imagePrompt) {
    parts.push(sceneDirection.imagePrompt);
  }

  // 3. Framework defaults — append only if not already present in imagePrompt
  const prompt = (sceneDirection.imagePrompt || '').toLowerCase();
  if (frameworkDefaults?.lightingDefault && !prompt.includes('light')) {
    parts.push(frameworkDefaults.lightingDefault);
  }
  if (frameworkDefaults?.colorPaletteDefault && !prompt.includes('palette') && !prompt.includes('color')) {
    parts.push(frameworkDefaults.colorPaletteDefault);
  }
  // Camera default NOT added — the scene director's imagePrompt includes camera angle

  // 4. Visual style suffix (from the 14 visual styles in visualStyles.js)
  const styleSuffix = visualStylePrompt
    ? `, ${visualStylePrompt}`
    : getVisualStyleSuffix(visualStyle);
  if (styleSuffix) {
    parts.push(styleSuffix.replace(/^,\s*/, '')); // Remove leading comma+space
  }

  // 5. Format and quality tokens
  const formatStr = `Vertical ${aspectRatio} format, cinematic composition, no text or words in image`;
  parts.push(formatStr);

  const imagePrompt = parts.filter(Boolean).join('. ');

  // Motion prompt: keyframe's motionHint (what happens between this keyframe and the next)
  // Used as the video generation prompt for first-last-frame or I2V
  const motionPrompt = sceneDirection.motionHint || '';

  return { imagePrompt, motionPrompt };
}

/**
 * Compose the full prompt string for video generation (I2V).
 * Combines the image context with motion direction.
 *
 * @param {string} imagePrompt - From composePrompts().imagePrompt
 * @param {string} motionPrompt - From composePrompts().motionPrompt
 * @returns {string} Combined prompt for animateImageV2
 */
export function composeVideoPrompt(imagePrompt, motionPrompt) {
  return [imagePrompt, motionPrompt].filter(Boolean).join('. ');
}
