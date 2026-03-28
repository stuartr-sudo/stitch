/**
 * Scene Director V2 — Continuity-aware keyframe generation.
 *
 * TWO MODES based on framework.frameChain:
 *
 * frameChain: true (story/continuous)
 *   → N+1 keyframes generated in batches with overlap context
 *   → Each batch sees previous keyframe's prompt for consistency
 *   → Continuity anchors track specific visual elements across scenes
 *   → Output: boundary keyframes for FLF video generation
 *
 * frameChain: false (fast-paced/independent)
 *   → N keyframes generated (one per scene, NOT boundaries)
 *   → Each is independently art-directed — different subject, angle, setting allowed
 *   → No I2I chain needed — each scene gets independent T2I
 *   → Output: scene keyframes for independent I2V generation
 *
 * Runs AFTER TTS timing is known (block aligner output).
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';

// ── Zod schemas ─────────────────────────────────────────────────────────────

const SingleKeyframeSchema = z.object({
  imagePrompt: z.string().describe('Complete AI image generation prompt. One flowing sentence. Include: subject with specific pose/expression, exact setting with named elements, lighting direction and color temperature in Kelvin, camera angle with focal length in mm, color palette with specific tones, mood. NO action verbs, NO motion, NO text/typography. This describes a FROZEN MOMENT.'),
  motionHint: z.string().describe('What happens between this keyframe and the next. Include: camera movement type and speed, subject action, background changes. Empty string for the last keyframe.'),
  continuity_anchors: z.string().describe('3-5 specific visual elements that MUST persist across adjacent keyframes: e.g., "red scarf on left shoulder, brick wall with green graffiti tag, warm 3200K tungsten key light from right"'),
});

const IndependentSceneSchema = z.object({
  imagePrompt: z.string().describe('Complete AI image generation prompt for this scene. One flowing sentence. Include: subject, setting, lighting with color temperature, camera angle with focal length, color palette, mood. This scene is visually INDEPENDENT from others.'),
  motionHint: z.string().describe('Camera and subject motion during this scene clip.'),
});

const ContinuousKeyframesSchema = z.object({
  keyframes: z.array(SingleKeyframeSchema),
});

const IndependentScenesSchema = z.object({
  scenes: z.array(IndependentSceneSchema),
});

// ── Continuous/story mode ───────────────────────────────────────────────────

async function generateContinuousKeyframes({
  narrative, alignedBlocks, framework, visualStyle,
  visualStylePrompt, visualDirections, keys, brandUsername,
}) {
  const openai = new OpenAI({ apiKey: keys.openaiKey });
  const sceneDefaults = framework?.sceneDefaults || {};
  const sceneCount = alignedBlocks.length;
  const keyframeCount = sceneCount + 1;

  const keyframes = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Generate in batches of 3 with 1 overlap for context continuity
  const BATCH_SIZE = 3;

  for (let batchStart = 0; batchStart < keyframeCount; batchStart += BATCH_SIZE - 1) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, keyframeCount);
    const batchCount = batchEnd - batchStart;

    const prevKeyframe = batchStart > 0 ? keyframes[batchStart - 1] : null;
    const prevContext = prevKeyframe
      ? `\nPREVIOUS KEYFRAME (keyframe ${batchStart - 1}):\nImage: "${prevKeyframe.imagePrompt}"\nAnchors: ${prevKeyframe.continuity_anchors}\n\nYou MUST maintain these anchors in keyframe ${batchStart}. Same character, same setting elements, same lighting style. Only composition, camera angle, and subject state evolve.`
      : '';

    const relevantScenes = [];
    for (let k = batchStart; k < batchEnd; k++) {
      if (k > 0 && k - 1 < sceneCount) {
        relevantScenes.push(`Keyframe ${k} = end of scene ${k} / start of scene ${k + 1}\n  Scene ${k} narration: "${alignedBlocks[k - 1].narration}"`);
      }
      if (k < sceneCount) {
        relevantScenes.push(`Keyframe ${k} = start of scene ${k + 1}\n  Scene ${k + 1} narration: "${alignedBlocks[k].narration}"`);
      }
    }

    const systemPrompt = `You are a cinematographer planning keyframe images for a ${sceneCount}-scene video. Generate ${batchCount} keyframes (keyframes ${batchStart} through ${batchEnd - 1}).

CONCEPT: Keyframes are BOUNDARY images between scenes. The video model interpolates motion between adjacent keyframes.
- Keyframe 0 = opening frame
- Keyframe N = end of scene N / start of scene N+1
- Keyframe ${sceneCount} = closing frame

VISUAL IDENTITY (apply to ALL keyframes):
- Lighting: ${sceneDefaults.lightingDefault || 'not specified — you decide and be SPECIFIC about direction, source, and Kelvin temperature'}
- Color palette: ${sceneDefaults.colorPaletteDefault || 'not specified — you decide and be SPECIFIC with hex-range tones'}
- Camera style: ${sceneDefaults.cameraDefault || 'not specified — you decide and be SPECIFIC with focal length in mm'}
${visualDirections ? `- Director notes: ${visualDirections}` : ''}
${visualStylePrompt ? `- Visual style: ${visualStylePrompt}` : ''}

${prevContext}

SCENES CONTEXT:
${relevantScenes.join('\n')}

FULL NARRATION: "${narrative.narration_full}"

IMAGE PROMPT FORMAT:
Write each imagePrompt as ONE flowing description, not a list of attributes. Example:
"A weathered fisherman in a dark blue peacoat stands at the bow of a wooden trawler, hands gripping the salt-stained railing, dawn light at 4500K breaking through low fog from camera-left, shot at 35mm with shallow depth of field, muted steel blues and amber highlights, the harbor's red lighthouse visible soft in the background"

NOT like this (bad):
"A person on a boat. Dramatic lighting. Cinematic composition. Blue color palette."

ABSOLUTE BANS:
- No text, words, typography, UI elements, watermarks, logos in any image prompt
- No action verbs (running, jumping, grabbing) — these are STILL images
- No vague descriptions ("something interesting", "a beautiful scene")
- No meta-instructions ("high quality", "detailed", "4K") — describe the SCENE`;

    const completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate keyframes ${batchStart} through ${batchEnd - 1} (${batchCount} keyframes).` },
      ],
      response_format: zodResponseFormat(ContinuousKeyframesSchema, 'continuous_keyframes'),
      temperature: 0.8,
    });

    if (completion.usage) {
      totalInputTokens += completion.usage.prompt_tokens;
      totalOutputTokens += completion.usage.completion_tokens;
    }

    const result = completion.choices[0].message.parsed;

    // Skip overlap keyframe on subsequent batches
    const startIdx = batchStart > 0 ? 1 : 0;
    for (let i = startIdx; i < result.keyframes.length && keyframes.length < keyframeCount; i++) {
      keyframes.push(result.keyframes[i]);
    }

    console.log(`[sceneDirector] Batch ${batchStart}-${batchEnd - 1}: generated ${result.keyframes.length} keyframes (kept ${result.keyframes.length - startIdx})`);
  }

  // Pad/trim
  while (keyframes.length < keyframeCount) {
    const last = keyframes[keyframes.length - 1];
    keyframes.push({
      imagePrompt: last?.imagePrompt || 'Cinematic scene with dramatic lighting at 85mm, shallow depth of field',
      motionHint: '',
      continuity_anchors: last?.continuity_anchors || '',
    });
  }
  if (keyframes.length > keyframeCount) keyframes.length = keyframeCount;
  keyframes[keyframes.length - 1].motionHint = '';

  if (brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_scene_direction_continuous',
      model: 'gpt-4.1-mini',
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
    });
  }

  console.log(`[sceneDirector] Continuous mode: ${keyframes.length} keyframes for ${sceneCount} scenes`);
  return { keyframes, sceneCount, mode: 'continuous' };
}

// ── Independent/fast-paced mode ─────────────────────────────────────────────

async function generateIndependentScenes({
  narrative, alignedBlocks, framework, visualStyle,
  visualStylePrompt, visualDirections, keys, brandUsername,
}) {
  const openai = new OpenAI({ apiKey: keys.openaiKey });
  const sceneDefaults = framework?.sceneDefaults || {};
  const sceneCount = alignedBlocks.length;

  const sceneContext = alignedBlocks.map((block, i) =>
    `Scene ${i + 1}${block.frameworkLabel ? ` "${block.frameworkLabel}"` : ''} [${block.frameworkBeat || 'scene'}] (${block.clipDuration}s): "${block.narration}"`
  ).join('\n\n');

  const systemPrompt = `You are a visual director for a fast-paced short video with ${sceneCount} independent scenes. Each scene is its own visual world — different subject, angle, and setting are fine.

Generate ONE image prompt and ONE motion hint per scene.

VISUAL STYLE (consistent across all even though content varies):
- Lighting: ${sceneDefaults.lightingDefault || 'decide and be SPECIFIC per scene'}
- Color palette: ${sceneDefaults.colorPaletteDefault || 'decide and be SPECIFIC per scene'}
- Camera: ${sceneDefaults.cameraDefault || 'decide and be SPECIFIC per scene'}
${visualDirections ? `- Director notes: ${visualDirections}` : ''}
${visualStylePrompt ? `- Visual style: ${visualStylePrompt}` : ''}

SCENES:
${sceneContext}

FULL NARRATION: "${narrative.narration_full}"

IMAGE PROMPT FORMAT:
Write each as ONE flowing description. Each scene should visually represent its narration in the most compelling, specific way possible.

Example for a "Top 5" item about a specific animal:
"A mantis shrimp coiled on a coral ledge, its iridescent clubs folded against its thorax, bioluminescent blue-green light reflecting off its compound eyes, macro lens at 100mm f/2.8, shallow depth of field with blurred coral reef backdrop in warm amber, the shrimp's segmented body catching a shaft of underwater sunlight from above-right"

NOT: "An interesting underwater creature in a colorful ocean setting"

MOTION HINTS:
For fast-paced content, motion should be dynamic: quick push-ins, snap zooms, dramatic reveals.

ABSOLUTE BANS:
- No text, words, typography, UI elements, watermarks, logos
- No action verbs in image prompts (these are STILL frames)
- No vague descriptions
- No meta-instructions (high quality, detailed, etc.)`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${sceneCount} independent scene image prompts.` },
    ],
    response_format: zodResponseFormat(IndependentScenesSchema, 'independent_scenes'),
    temperature: 0.9,
  });

  const result = completion.choices[0].message.parsed;

  while (result.scenes.length < sceneCount) {
    result.scenes.push({
      imagePrompt: 'Cinematic composition with dramatic side lighting at 50mm, rich color palette',
      motionHint: 'Smooth push-in with subtle parallax',
    });
  }
  if (result.scenes.length > sceneCount) result.scenes.length = sceneCount;

  // Convert to keyframe format for pipeline compatibility
  const keyframes = result.scenes.map(s => ({
    imagePrompt: s.imagePrompt,
    motionHint: s.motionHint,
    continuity_anchors: '',
  }));

  // Add final empty keyframe for array compat
  keyframes.push({
    imagePrompt: keyframes[keyframes.length - 1]?.imagePrompt || '',
    motionHint: '',
    continuity_anchors: '',
  });

  if (brandUsername && completion.usage) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_scene_direction_independent',
      model: 'gpt-4.1-mini',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  console.log(`[sceneDirector] Independent mode: ${result.scenes.length} scene prompts for ${sceneCount} scenes`);
  return { keyframes, sceneCount, mode: 'independent' };
}

// ── Visual feedback helper ──────────────────────────────────────────────────

/**
 * Refine a keyframe's image prompt based on visual analysis of the generated image.
 * Deterministic string composition — no LLM call.
 */
export function refinePromptWithVisualFeedback(visualAnalysis, originalPrompt, nextPrompt, continuityAnchors) {
  const continuityPrefix = continuityAnchors
    ? `Maintaining visual continuity: ${continuityAnchors}. `
    : '';
  const visualPrefix = visualAnalysis
    ? `Continuing from previous frame: ${visualAnalysis.slice(0, 200)}. `
    : '';
  return `${continuityPrefix}${visualPrefix}${nextPrompt}`;
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate keyframe/scene image prompts.
 * Automatically selects continuous or independent mode based on framework.frameChain.
 * API-compatible with the original directScenes().
 */
export async function directScenes({
  narrative, alignedBlocks, framework, visualStyle,
  visualStylePrompt, videoStyle, visualDirections,
  keys, brandUsername,
}) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required');

  const isContinuous = framework?.frameChain !== false;

  if (isContinuous) {
    return generateContinuousKeyframes({
      narrative, alignedBlocks, framework, visualStyle,
      visualStylePrompt, visualDirections, keys, brandUsername,
    });
  } else {
    return generateIndependentScenes({
      narrative, alignedBlocks, framework, visualStyle,
      visualStylePrompt, visualDirections, keys, brandUsername,
    });
  }
}
