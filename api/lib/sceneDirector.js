/**
 * Scene Director V3 — Identity-locked keyframe generation.
 *
 * KEY CHANGE FROM V2:
 * - V2 mentioned style as optional suggestions → GPT invented its own per scene
 * - V3 establishes a VISUAL IDENTITY CONTRACT and MOTION IDENTITY CONTRACT
 *   that are presented as hard constraints, not suggestions
 * - Video style preset (from videoStylePresets.js) is now injected as a
 *   binding motion directive
 * - A "style DNA" block is generated first, then referenced by every keyframe
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
 *   → Visual STYLE stays locked (same lighting feel, color grade, lens choice)
 *   → Output: scene keyframes for independent I2V generation
 *
 * Runs AFTER TTS timing is known (block aligner output).
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';
import { getVideoStylePrompt } from './videoStylePresets.js';

// ── Zod schemas ─────────────────────────────────────────────────────────────

const SingleKeyframeSchema = z.object({
  imagePrompt: z.string().describe('Complete AI image generation prompt. One flowing sentence. Must conform EXACTLY to the Visual Identity Contract. Include: subject with specific pose/expression, exact setting with named elements, lighting direction and color temperature in Kelvin (MUST match contract), camera angle with focal length in mm (MUST match contract), color palette with specific tones (MUST match contract), mood. NO action verbs, NO motion, NO text/typography. This describes a FROZEN MOMENT.'),
  motionHint: z.string().describe('What happens between this keyframe and the next. MUST conform to the Motion Identity Contract: same camera movement vocabulary, same speed feel, same energy level. Include: camera movement type and speed, subject action, background changes. Empty string for the last keyframe.'),
  continuity_anchors: z.string().describe('3-5 specific visual elements that MUST persist across adjacent keyframes: e.g., "red scarf on left shoulder, brick wall with green graffiti tag, warm 3200K tungsten key light from right"'),
});

const IndependentSceneSchema = z.object({
  imagePrompt: z.string().describe('Complete AI image generation prompt for this scene. One flowing sentence. Subject and setting may vary per scene, but lighting quality, color grade, lens choice, and overall aesthetic MUST match the Visual Identity Contract exactly.'),
  motionHint: z.string().describe('Camera and subject motion during this scene clip. MUST match the Motion Identity Contract: same movement vocabulary and energy.'),
});

const ContinuousKeyframesSchema = z.object({
  keyframes: z.array(SingleKeyframeSchema),
});

const IndependentScenesSchema = z.object({
  scenes: z.array(IndependentSceneSchema),
});

// ── Identity Contract Builder ───────────────────────────────────────────────

/**
 * Build the Visual Identity Contract — a hard-locked description of the
 * visual treatment that EVERY scene must follow. This replaces the old
 * "suggestions" approach with a binding contract.
 */
function buildVisualIdentityContract(framework, visualStyle, visualStylePrompt, visualDirections) {
  const sceneDefaults = framework?.sceneDefaults || {};
  const parts = [];

  // Lighting lock
  if (sceneDefaults.lightingDefault) {
    parts.push(`LIGHTING: ${sceneDefaults.lightingDefault}`);
  } else {
    parts.push('LIGHTING: You must define ONE specific lighting setup (direction, source type, Kelvin temperature) and use it in EVERY keyframe. Do NOT vary the lighting between scenes.');
  }

  // Color palette lock
  if (sceneDefaults.colorPaletteDefault) {
    parts.push(`COLOR PALETTE: ${sceneDefaults.colorPaletteDefault}`);
  } else {
    parts.push('COLOR PALETTE: You must define ONE specific palette (3-4 named colors with approximate hex values) and use it in EVERY keyframe. Do NOT introduce new colors between scenes.');
  }

  // Camera/lens lock
  if (sceneDefaults.cameraDefault) {
    parts.push(`CAMERA/LENS: ${sceneDefaults.cameraDefault}`);
  } else {
    parts.push('CAMERA/LENS: You must define ONE focal length range (e.g., 35-50mm) and aperture, and stay within it for EVERY keyframe. Do NOT switch between wide and telephoto between scenes.');
  }

  // Visual style injection
  if (visualStylePrompt) {
    parts.push(`AESTHETIC: ${visualStylePrompt}`);
  } else if (visualStyle) {
    parts.push(`AESTHETIC: Every frame must look like it belongs in the same ${visualStyle} production. Same grain, same render quality, same artistic treatment.`);
  }

  // Director notes
  if (visualDirections) {
    parts.push(`DIRECTOR NOTES: ${visualDirections}`);
  }

  return parts.join('\n');
}

/**
 * Build the Motion Identity Contract — locks the motion/cinematography
 * feel using the video style preset prompt.
 */
function buildMotionIdentityContract(videoStyle, framework) {
  const videoStylePrompt = getVideoStylePrompt(videoStyle);
  const parts = [];

  if (videoStylePrompt) {
    parts.push(`MOTION STYLE: ${videoStylePrompt}`);
    parts.push('Every motionHint you write MUST feel like it belongs in this specific cinematographic style. Use the same camera movement vocabulary, the same energy level, the same visual language across ALL scenes.');
  } else if (framework?.category === 'fast_paced') {
    parts.push('MOTION STYLE: Dynamic and energetic. Quick push-ins, snap zooms, whip pans. Every scene should feel punchy and kinetic.');
  } else {
    parts.push('MOTION STYLE: Define ONE consistent camera movement vocabulary (e.g., "slow dolly, gentle drift, smooth rack focus") and use ONLY those movements across all scenes. Do NOT mix handheld with gimbal, or slow with fast, between scenes.');
  }

  return parts.join('\n');
}

// ── Continuous/story mode ───────────────────────────────────────────────────

async function generateContinuousKeyframes({
  narrative, alignedBlocks, framework, visualStyle,
  visualStylePrompt, videoStyle, visualDirections, keys, brandUsername,
}) {
  const openai = new OpenAI({ apiKey: keys.openaiKey });
  const sceneCount = alignedBlocks.length;
  const keyframeCount = sceneCount + 1;

  const visualContract = buildVisualIdentityContract(framework, visualStyle, visualStylePrompt, visualDirections);
  const motionContract = buildMotionIdentityContract(videoStyle, framework);

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
      ? `\nPREVIOUS KEYFRAME (keyframe ${batchStart - 1}) — maintain exact same visual treatment:\nImage: "${prevKeyframe.imagePrompt}"\nAnchors: ${prevKeyframe.continuity_anchors}\n\nYou MUST carry forward these anchors. Same character appearance, same lighting quality, same color temperature, same lens. Only composition, camera angle, and subject pose evolve.`
      : '';

    const relevantScenes = [];
    for (let k = batchStart; k < batchEnd; k++) {
      if (k > 0 && k - 1 < sceneCount) {
        relevantScenes.push(`Keyframe ${k} = end of scene ${k} / start of scene ${k + 1}\n  Scene ${k} narration: "${alignedBlocks[k - 1].narration}"\n  Scene ${k} beat: ${alignedBlocks[k - 1].frameworkBeat || 'scene'}`);
      }
      if (k < sceneCount) {
        relevantScenes.push(`Keyframe ${k} = start of scene ${k + 1}\n  Scene ${k + 1} narration: "${alignedBlocks[k].narration}"\n  Scene ${k + 1} beat: ${alignedBlocks[k].frameworkBeat || 'scene'}`);
      }
    }

    const systemPrompt = `You are a cinematographer planning keyframe images for a ${sceneCount}-scene video. Generate ${batchCount} keyframes (keyframes ${batchStart} through ${batchEnd - 1}).

CONCEPT: Keyframes are BOUNDARY images between scenes. The video model interpolates motion between adjacent keyframes.
- Keyframe 0 = opening frame
- Keyframe N = end of scene N / start of scene N+1
- Keyframe ${sceneCount} = closing frame

═══════════════════════════════════════════════════════════════
VISUAL IDENTITY CONTRACT — BINDING FOR ALL KEYFRAMES
These are NOT suggestions. Every keyframe MUST match this contract.
If a keyframe deviates from this contract, the video will look broken.
═══════════════════════════════════════════════════════════════
${visualContract}
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
MOTION IDENTITY CONTRACT — BINDING FOR ALL MOTION HINTS
Every motionHint must use ONLY this movement vocabulary.
═══════════════════════════════════════════════════════════════
${motionContract}
═══════════════════════════════════════════════════════════════

${prevContext}

SCENES CONTEXT:
${relevantScenes.join('\n')}

FULL NARRATION: "${narrative.narration_full}"

HOW TO WRITE IMAGE PROMPTS:
Write each imagePrompt as ONE flowing sentence that EMBEDS the contract elements naturally. The lighting, color palette, lens, and aesthetic from the contract must be WOVEN INTO the description, not appended as a list.

Example of a GOOD prompt (notice how style is embedded):
"A weathered fisherman in a dark blue peacoat grips the salt-stained railing of a wooden trawler, dawn light at 4500K breaking through low fog from camera-left casting long amber shadows across the wet deck, shot at 35mm f/2.0 with shallow depth of field, muted steel blues and warm honey highlights on his weathered face, the harbor's red lighthouse soft in the distant background"

Example of a BAD prompt (style bolted on as afterthought):
"A person on a boat. Dramatic lighting. Cinematic composition. Blue color palette. 35mm lens."

Another BAD prompt (style completely absent):
"A fisherman stands on his boat looking at the sea with a thoughtful expression"

CONSISTENCY TEST: If I shuffle your keyframes randomly, I should NOT be able to tell which scene each came from based on lighting, color, or lens choice — they should all look like frames from the SAME film.

ABSOLUTE BANS:
- No text, words, typography, UI elements, watermarks, logos in any image prompt
- No action verbs (running, jumping, grabbing) — these are STILL images
- No vague descriptions ("something interesting", "a beautiful scene", "dramatic atmosphere")
- No meta-instructions ("high quality", "detailed", "4K", "professional") — describe the SCENE, not the quality
- No contradicting the Visual Identity Contract (different lighting, different palette, different lens)`;

    const completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate keyframes ${batchStart} through ${batchEnd - 1} (${batchCount} keyframes). Remember: every keyframe must match the Visual Identity Contract exactly.` },
      ],
      response_format: zodResponseFormat(ContinuousKeyframesSchema, 'continuous_keyframes'),
      temperature: 0.7, // Lowered from 0.8 for more consistency
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
  visualStylePrompt, videoStyle, visualDirections, keys, brandUsername,
}) {
  const openai = new OpenAI({ apiKey: keys.openaiKey });
  const sceneCount = alignedBlocks.length;

  const visualContract = buildVisualIdentityContract(framework, visualStyle, visualStylePrompt, visualDirections);
  const motionContract = buildMotionIdentityContract(videoStyle, framework);

  const sceneContext = alignedBlocks.map((block, i) =>
    `Scene ${i + 1}${block.frameworkLabel ? ` "${block.frameworkLabel}"` : ''} [${block.frameworkBeat || 'scene'}] (${block.clipDuration}s): "${block.narration}"`
  ).join('\n\n');

  const systemPrompt = `You are a visual director for a fast-paced short video with ${sceneCount} independent scenes. Each scene can have a DIFFERENT SUBJECT, but the VISUAL TREATMENT must be identical across all scenes.

Think of it like a magazine editorial: every photo has a different subject, but they were all shot by the same photographer with the same camera, same lighting setup, same color grade, same artistic eye.

═══════════════════════════════════════════════════════════════
VISUAL IDENTITY CONTRACT — BINDING FOR ALL SCENES
These are NOT suggestions. Every scene MUST match this visual treatment.
Subjects and settings change. Style does NOT.
═══════════════════════════════════════════════════════════════
${visualContract}
═══════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════
MOTION IDENTITY CONTRACT — BINDING FOR ALL MOTION HINTS
Every scene's motion must use ONLY this movement vocabulary.
═══════════════════════════════════════════════════════════════
${motionContract}
═══════════════════════════════════════════════════════════════

SCENES:
${sceneContext}

FULL NARRATION: "${narrative.narration_full}"

HOW TO WRITE IMAGE PROMPTS:
Write each as ONE flowing description. The subject and setting should visually represent the narration in the most compelling, specific way. But the lighting quality, color temperature, color palette, lens choice, and overall aesthetic MUST be the same across every scene — embedded naturally into each prompt, not appended.

Example: If the contract says "warm 3200K tungsten key light, amber and honey tones, 50mm f/2.0"
- Scene about ocean: "A massive blue whale breaching through dark Atlantic swells, warm 3200K tungsten-toned grading on the spray and foam, amber and honey highlights catching the cascading water droplets, shot at 50mm f/2.0 with shallow depth of field softening the distant horizon into a warm golden haze"
- Scene about space: "The International Space Station floating against the curved blue edge of Earth, warm 3200K amber tone grading the metallic solar panels, honey gold reflections across the station's hull contrasting the deep blue atmosphere below, captured at 50mm f/2.0 equivalent with the Earth's edge soft in the background"

Notice: DIFFERENT subjects, SAME visual language.

BAD example (style changes between scenes):
- Scene 1: "warm golden sunset lighting, amber tones, 50mm" 
- Scene 2: "cool blue moonlight, teal and cyan palette, 24mm wide angle"  ← VIOLATION

MOTION HINTS:
Every scene's motionHint must use the same movement vocabulary from the Motion Identity Contract. Do NOT mix slow dolly with handheld shake, or calm with frenetic, between scenes.

ABSOLUTE BANS:
- No text, words, typography, UI elements, watermarks, logos
- No action verbs in image prompts (these are STILL frames)
- No vague descriptions ("an interesting scene", "something dramatic")
- No meta-instructions ("high quality", "detailed", "professional")
- No violating the Visual or Motion Identity Contracts`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${sceneCount} independent scene image prompts. Every scene must match the Visual Identity Contract. Different subjects, same visual DNA.` },
    ],
    response_format: zodResponseFormat(IndependentScenesSchema, 'independent_scenes'),
    temperature: 0.8, // Lowered from 0.9 for consistency
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
      visualStylePrompt, videoStyle, visualDirections, keys, brandUsername,
    });
  } else {
    return generateIndependentScenes({
      narrative, alignedBlocks, framework, visualStyle,
      visualStylePrompt, videoStyle, visualDirections, keys, brandUsername,
    });
  }
}
