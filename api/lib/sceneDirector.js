/**
 * Scene Director — Stage 2 of two-stage script generation.
 *
 * Generates keyframe image prompts for scene BOUNDARIES, not scene interiors.
 * N scenes = N+1 keyframes. Each keyframe is a frozen moment in time.
 *
 * Keyframe[i] = end of scene i = start of scene i+1
 * This enables parallel first-last-frame video generation with guaranteed continuity.
 *
 * Runs AFTER TTS timing is known (block aligner output).
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';

// ── Zod schema ──────────────────────────────────────────────────────────────

const KeyframeSchema = z.object({
  imagePrompt: z.string().describe('Hyper-specific AI image generation prompt for this frozen moment. Include: subject, pose/position, setting, lighting direction + color temp, camera angle, focal length, mood, color palette. Must be a STILL image — no motion, no action verbs.'),
  motionHint: z.string().describe('What happens BETWEEN this keyframe and the next — camera movement and subject action. Used as the video generation prompt.'),
});

const KeyframeDirectionsSchema = z.object({
  keyframes: z.array(KeyframeSchema),
});

/**
 * Generate keyframe image prompts for scene boundaries.
 *
 * @param {object} params
 * @param {object} params.narrative - Output from narrativeGenerator.js
 * @param {Array} params.alignedBlocks - Output from blockAligner.js (N scenes)
 * @param {object} [params.framework] - Full framework object
 * @param {string} [params.visualStyle] - Visual style key
 * @param {string} [params.visualStylePrompt] - Custom visual style prompt text
 * @param {string} [params.videoStyle] - Video style preset key
 * @param {string} [params.visualDirections] - User-provided visual directions
 * @param {object} params.keys - { openaiKey }
 * @param {string} [params.brandUsername] - For cost logging
 * @returns {Promise<{
 *   keyframes: Array<{ imagePrompt: string, motionHint: string }>,
 *   sceneCount: number,
 * }>}
 */
export async function directScenes({
  narrative,
  alignedBlocks,
  framework,
  visualStyle,
  visualStylePrompt,
  videoStyle,
  visualDirections,
  keys,
  brandUsername,
}) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required for scene direction');

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const sceneDefaults = framework?.sceneDefaults || {};
  const sceneCount = alignedBlocks.length;
  const keyframeCount = sceneCount + 1; // N scenes = N+1 boundary keyframes

  // Build scene context showing what narration happens between each keyframe pair
  const sceneContext = alignedBlocks.map((block, i) => {
    return `Scene ${i + 1}${block.frameworkLabel ? ` "${block.frameworkLabel}"` : ''} (${block.clipDuration}s):
  Between keyframe ${i} → keyframe ${i + 1}
  Narration: "${block.narration}"`;
  }).join('\n\n');

  const systemPrompt = `You are a visual director for short-form video. You must generate ${keyframeCount} KEYFRAME IMAGE PROMPTS — one for each scene boundary.

CONCEPT: For ${sceneCount} scenes, there are ${keyframeCount} boundary moments:
- Keyframe 0: Opening image (start of scene 1)
- Keyframe 1: Transition image (end of scene 1 / start of scene 2)
- Keyframe 2: Transition image (end of scene 2 / start of scene 3)
...
- Keyframe ${sceneCount}: Closing image (end of scene ${sceneCount})

Each keyframe is a FROZEN MOMENT — a still image, not an action. The video model will interpolate motion between keyframe pairs.

FRAMEWORK DEFAULTS (use unless overriding):
- Lighting: ${sceneDefaults.lightingDefault || 'cinematic, natural lighting'}
- Color palette: ${sceneDefaults.colorPaletteDefault || 'rich, balanced color grading'}
- Camera: ${sceneDefaults.cameraDefault || 'medium shot, 50mm lens'}

KEYFRAME IMAGE PROMPT RULES:
- Each imagePrompt is a standalone AI image generation prompt for a STILL IMAGE.
- Describe a frozen moment: subject pose, exact position, setting, lighting, camera angle, focal length, mood, color palette.
- Be hyper-specific. "Close-up of weathered hands resting on a crystal sphere, warm golden light from below illuminating deep wrinkles, shallow depth of field at 85mm, dark moody background with teal fog"
- NOT action: "hands grabbing and lifting" — that's motion, not a still frame.
- NEVER vague: "A person in a room" or "something interesting" produces garbage.
- NEVER text, words, typography, UI elements, watermarks.
- All keyframes must maintain VISUAL CONSISTENCY — same setting, same characters, same color palette, same lighting style. Only the composition, camera angle, and subject state should evolve.

MOTION HINT RULES:
- motionHint describes what happens BETWEEN this keyframe and the NEXT one.
- Include both camera movement and subject action.
- Example: "Camera slowly pushes in while the subject turns to face the light, sphere begins to glow brighter"
- The LAST keyframe's motionHint should be empty string "" (nothing follows it).

${visualDirections ? `USER VISUAL DIRECTIONS (incorporate into all keyframes):\n${visualDirections}\n` : ''}
${visualStylePrompt ? `VISUAL STYLE (apply to all keyframes): ${visualStylePrompt}\n` : ''}`;

  const userPrompt = `Generate ${keyframeCount} keyframe image prompts for this ${sceneCount}-scene video.

Title: "${narrative.title}"
Full narration: "${narrative.narration_full}"

SCENES (each scene happens BETWEEN two adjacent keyframes):
${sceneContext}

Generate exactly ${keyframeCount} keyframes.`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(KeyframeDirectionsSchema, 'keyframe_directions'),
  });

  const result = completion.choices[0].message.parsed;

  // Ensure correct keyframe count (pad or trim)
  while (result.keyframes.length < keyframeCount) {
    const lastKf = result.keyframes[result.keyframes.length - 1];
    result.keyframes.push({
      imagePrompt: lastKf?.imagePrompt || 'Cinematic scene, dramatic lighting, shallow depth of field',
      motionHint: '',
    });
  }
  if (result.keyframes.length > keyframeCount) {
    result.keyframes.length = keyframeCount;
  }

  // Ensure last keyframe has empty motionHint
  result.keyframes[result.keyframes.length - 1].motionHint = '';

  if (completion.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_scene_direction',
      model: 'gpt-4.1-mini',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  console.log(`[sceneDirector] Generated ${result.keyframes.length} keyframes for ${sceneCount} scenes`);

  return {
    keyframes: result.keyframes,
    sceneCount,
  };
}
