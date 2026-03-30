/**
 * Storyboard Visual Director — Stage 2 of 2
 *
 * Takes locked narrative beats (from Stage 1) and transforms them into
 * model-specific video generation prompts. This replaces BOTH:
 * - The visual prompt generation in generate-scenes.js
 * - The per-scene cohesive prompt builder calls
 *
 * The Visual Director structurally enforces:
 * - Visual style (from 123 presets or builder pills)
 * - Motion style (from 86 cinematography presets)
 * - Brand rules (prohibited/preferred elements)
 * - Model-specific prompt architecture (Veo vs Kling vs Grok)
 * - Continuity context from previous scene
 *
 * This is ONE LLM call that produces ALL scene prompts at once, informed by
 * the narrative beats. No more 7 GPT calls (1 script + 6 cohesive builders).
 * Total: 2 GPT calls for any storyboard (Stage 1 + Stage 2).
 */

import { z } from 'zod';
import { getModelTemplate, usesElementSyntax, sanitizePromptForModel, buildNegativePrompt } from './storyboardModelTemplates.js';

// ── Zod Schema for Visual Director Output ───────────────────────────────────

const VisualSceneSchema = z.object({
  sceneNumber: z.number(),
  visualPrompt: z.string().describe('Complete video generation prompt — model-ready'),
  motionPrompt: z.string().describe('Camera movement and action description'),
  negativeHints: z.string().nullable().describe('Scene-specific things to avoid (appended to standard negative prompt)'),
  previewImagePrompt: z.string().describe('Shorter prompt (50-80 words) optimized for generating a static preview image of this scene'),
  cameraAngle: z.string(),
  durationSeconds: z.number(),
  continuityNote: z.string().describe('How this scene visually connects to the next — for frame chaining context'),
});

const VisualDirectorOutputSchema = z.object({
  scenes: z.array(VisualSceneSchema),
  styleConsistencyNote: z.string().describe('Summary of the visual style rules applied across all scenes'),
});

export { VisualDirectorOutputSchema, VisualSceneSchema };

// ── System Prompt Builder ───────────────────────────────────────────────────

/**
 * Build the Stage 2 system prompt.
 * This prompt focuses on VISUAL EXECUTION — turning narrative beats into
 * prompts that video generation models can render.
 */
export function buildVisualDirectorSystemPrompt(inputs) {
  const {
    modelId,
    narrativeBeats,       // From Stage 1
    visualStylePrompt,    // From getPromptText(styleKey) — 40-80 word style description
    builderStyle,         // Manual style pill (e.g., "Minimalist")
    builderLighting,      // Manual lighting pill (e.g., "Golden Hour")
    builderColorGrade,    // Manual color grade pill (e.g., "Warm")
    motionStylePrompt,    // From video style preset — ~150 word cinematography direction
    startFrameDescription, // Vision analysis of start frame image
    locationDescription,  // User-provided detailed location/setting description
    characterDescriptions, // Element descriptions or natural character descriptions
    brandStyleGuide,
    aspectRatio,
    sceneDirection,       // Lighting and camera pills from scene direction
    previousSceneContinuity, // Vision analysis of previous scene's last frame (for regeneration)
  } = inputs;

  const template = getModelTemplate(modelId);
  const sections = [];

  // ── Role ──
  sections.push(`You are an expert AI video prompt engineer. You write prompts that ${template.label} renders into beautiful, cinematic footage.

Your job is to take narrative beats (the STORY has already been written) and transform each one into a detailed, model-ready video generation prompt.

You are writing for ${template.label} (${template.family} family, ${template.mode} mode).
Target prompt length: ${template.promptLength.target} words per scene (min ${template.promptLength.min}, max ${template.promptLength.max}).`);

  // ── Model-Specific Instructions ──
  if (template.characterRefStyle === 'element') {
    sections.push(`MODEL: Kling R2V — @Element System
- You MUST reference characters using @Element1, @Element2, etc.
- Place @Element references at the START of each visualPrompt
- Format: "@Element1 [action description], [scene context]"
- The @Element images are provided separately — describe what the character DOES, not what they look like`);
  } else if (template.characterRefStyle === 'natural') {
    sections.push(`MODEL: ${template.label} — Natural Character Descriptions
- Reference images are provided separately as image_urls
- Describe characters naturally in the scene — what they look like, what they're wearing, what they're doing
- Do NOT use @Element syntax
- Be consistent with character descriptions across all scenes`);
  } else {
    sections.push(`MODEL: ${template.label} — Image-to-Video
- The start frame image defines the visual foundation
- Describe what HAPPENS to the scene — how it animates from the start frame
- Focus on motion, action, and camera movement`);
  }

  // ── Visual Style (STRUCTURAL, not optional) ──
  const styleComponents = [];

  if (visualStylePrompt) {
    styleComponents.push(`MASTER VISUAL STYLE (apply to EVERY scene):\n${visualStylePrompt}`);
  }

  if (builderStyle) styleComponents.push(`Style modifier: ${builderStyle}`);
  if (builderLighting) styleComponents.push(`Lighting direction: ${builderLighting}`);
  if (builderColorGrade) styleComponents.push(`Color grade: ${builderColorGrade}`);

  if (styleComponents.length > 0) {
    sections.push(`VISUAL STYLE — these are STRUCTURAL requirements, not suggestions. Every scene must reflect this style:\n${styleComponents.join('\n')}`);
  }

  // ── Motion/Cinematography Style (STRUCTURAL) ──
  if (motionStylePrompt) {
    sections.push(`CINEMATOGRAPHY DIRECTION — apply this motion style across all scenes:\n${motionStylePrompt}`);
  }

  // ── Location / Setting (STRUCTURAL) ──
  if (locationDescription) {
    sections.push(`PRIMARY LOCATION — this is the anchor environment for the entire sequence. Every scene's visual prompt must reflect this location (or areas within/near it). Weave location-specific details (architecture, vegetation, ground surface, signage, atmosphere) into each visualPrompt:\n${locationDescription}`);
  }

  // ── Scene Direction from pills (lighting + camera) ──
  if (sceneDirection) {
    const cameraPills = sceneDirection.camera || [];
    const lightingPills = sceneDirection.lighting || [];
    if (cameraPills.length > 0 || lightingPills.length > 0) {
      const dirParts = [];
      if (lightingPills.length) dirParts.push(`Lighting preferences: ${lightingPills.join(', ')}`);
      if (cameraPills.length) dirParts.push(`Camera preferences: ${cameraPills.join(', ')}`);
      sections.push(`SCENE DIRECTION PREFERENCES — use these as the default for scenes where they fit:\n${dirParts.join('\n')}`);
    }
  }

  // ── Start Frame Context ──
  if (startFrameDescription) {
    sections.push(`START FRAME ANALYSIS — Scene 1 must match this environment exactly. Subsequent scenes should maintain visual continuity with this foundation:\n${startFrameDescription}`);
  }

  // ── Character/Element Descriptions ──
  if (characterDescriptions?.length > 0) {
    if (template.characterRefStyle === 'element') {
      const elemText = characterDescriptions.map((desc, i) =>
        `@Element${i + 1}: ${desc}`
      ).join('\n');
      sections.push(`CHARACTER ELEMENTS — use these exact @Element references:\n${elemText}`);
    } else if (template.characterRefStyle === 'natural') {
      sections.push(`CHARACTER REFERENCES (reference images provided separately):\n${characterDescriptions.join('\n')}`);
    }
  }

  // ── Brand Compliance (HARD RULES) ──
  if (brandStyleGuide) {
    const rules = [];
    if (brandStyleGuide.visual_style_notes) rules.push(`Visual style must align with: ${brandStyleGuide.visual_style_notes}`);
    if (brandStyleGuide.lighting_prefs) rules.push(`Lighting must follow: ${brandStyleGuide.lighting_prefs}`);
    if (brandStyleGuide.composition_style) rules.push(`Composition: ${brandStyleGuide.composition_style}`);
    if (brandStyleGuide.ai_prompt_rules) rules.push(`MANDATORY PROMPT RULES: ${brandStyleGuide.ai_prompt_rules}`);
    if (brandStyleGuide.preferred_elements) rules.push(`MUST appear in prompts where relevant: ${brandStyleGuide.preferred_elements}`);
    if (brandStyleGuide.prohibited_elements) rules.push(`NEVER include these in ANY prompt: ${brandStyleGuide.prohibited_elements}`);
    if (rules.length > 0) {
      sections.push(`BRAND COMPLIANCE — HARD RULES (violations will cause client rejection):\n${rules.join('\n')}`);
    }
  }

  // ── Continuity Context ──
  if (previousSceneContinuity) {
    sections.push(`CONTINUITY FROM PREVIOUS SCENE — the previous scene ended with this visual state. Scene 1 must continue from this exact state:\n${previousSceneContinuity}`);
  }

  // ── Narrative Beats (from Stage 1) ──
  const beatsText = narrativeBeats.map(beat => {
    const parts = [`Scene ${beat.sceneNumber} [${beat.beatType}]:`,
      `Story: ${beat.narrativeMoment}`,
      `Setting: ${beat.setting}`,
      `Action: ${beat.characterAction}`,
      `Emotion: ${beat.characterEmotion}`,
      `Pacing: ${beat.pacingNote}`,
      `Duration: ${beat.durationSeconds}s`,
      `Transition to next: ${beat.transitionNote}`,
    ];
    if (beat.dialogue) parts.push(`Dialogue: "${beat.dialogue}"`);
    return parts.join('\n  ');
  }).join('\n\n');

  sections.push(`NARRATIVE BEATS TO VISUALIZE:\n${beatsText}`);

  // ── Model-Specific Vocabulary ──
  const vocab = template.effectiveVocabulary;
  if (vocab) {
    sections.push(`EFFECTIVE VOCABULARY for ${template.label} — use these terms (the model responds well to them):
Camera: ${vocab.camera.join(', ')}
Lighting: ${vocab.lighting.join(', ')}
Motion: ${vocab.motion.join(', ')}
Atmosphere: ${vocab.atmosphere.join(', ')}`);
  }

  // ── Content Policy ──
  if (template.contentPolicyAvoid?.length > 0) {
    sections.push(`CONTENT POLICY — NEVER include these terms (will cause model rejection):\n${template.contentPolicyAvoid.join(', ')}`);
  }

  // ── Output Rules ──
  sections.push(`PROMPT WRITING RULES:

1. Each visualPrompt must be a SINGLE FLOWING PARAGRAPH of ${template.promptLength.min}-${template.promptLength.max} words. No bullet points, no numbered lists, no line breaks within the prompt.

2. Every visualPrompt MUST include:
   - The visual style (from the master style above) woven naturally into the description
   - Specific lighting description (not just "natural light" — specify direction, quality, color temperature)
   - Camera framing and movement
   - Character action and expression
   - Environment details with specific materials, colors, and textures

3. The motionPrompt should be a concise 15-30 word camera direction using vocabulary from the effective vocabulary list.

4. Scene N's ending must visually match Scene N+1's beginning. Use the continuityNote to specify: same location? same lighting? character walks to new location?

5. The previewImagePrompt is a SHORTER version (50-80 words) optimized for static image generation. It should capture the key visual moment of the scene without motion/camera descriptions.

6. NEVER include: text, words, typography, watermarks, logos, UI elements, or copyrighted brand names.

7. DO NOT include "AVOID:" sections in the visualPrompt — negative prompts are handled separately.

8. ${template.characterRefStyle === 'element' ? 'ALWAYS start visualPrompt with @Element references.' : 'Describe characters naturally without @Element syntax.'}`);

  return sections.join('\n\n');
}

// ── User Prompt ─────────────────────────────────────────────────────────────

export function buildVisualDirectorUserPrompt(sceneCount) {
  return `Transform the ${sceneCount} narrative beats above into ${sceneCount} model-ready video generation prompts.

Each visualPrompt must be a single flowing paragraph that weaves together the narrative action, visual style, lighting, camera work, and atmosphere. The prompts should read like a cinematographer's shot description — specific, vivid, and technically precise.

Maintain perfect visual continuity between consecutive scenes.`;
}

// ── Post-Processing ─────────────────────────────────────────────────────────

/**
 * Post-process Visual Director output to enforce model-specific rules.
 * Call this after the LLM generates the visual prompts.
 *
 * @param {object[]} scenes - Array of scene objects from the LLM
 * @param {string} modelId - The target video generation model
 * @param {object} [brandStyleGuide] - Brand rules for compliance check
 * @returns {object[]} Processed scenes with sanitized prompts
 */
export function postProcessVisualScenes(scenes, modelId, brandStyleGuide = null) {
  const template = getModelTemplate(modelId);

  return scenes.map(scene => {
    let prompt = scene.visualPrompt;

    // 1. Sanitize for model content policy
    prompt = sanitizePromptForModel(prompt, modelId);

    // 2. Enforce prompt length
    const wordCount = prompt.split(/\s+/).length;
    if (wordCount > template.promptLength.max * 1.2) {
      // Truncate to target length at sentence boundary
      const sentences = prompt.split(/\. /);
      let truncated = '';
      for (const sentence of sentences) {
        const test = truncated ? `${truncated}. ${sentence}` : sentence;
        if (test.split(/\s+/).length > template.promptLength.max) break;
        truncated = test;
      }
      prompt = truncated || prompt.split(/\s+/).slice(0, template.promptLength.max).join(' ');
    }

    // 3. Brand compliance check — warn on prohibited elements
    let brandWarnings = [];
    if (brandStyleGuide?.prohibited_elements) {
      const prohibited = brandStyleGuide.prohibited_elements.split(',').map(s => s.trim().toLowerCase());
      for (const term of prohibited) {
        if (term && prompt.toLowerCase().includes(term)) {
          brandWarnings.push(`Prohibited term "${term}" found in scene ${scene.sceneNumber}`);
          // Remove the prohibited term
          prompt = prompt.replace(new RegExp(term, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
        }
      }
    }

    // 4. Build negative prompt
    const negativePrompt = buildNegativePrompt(modelId, scene.negativeHints);

    return {
      ...scene,
      visualPrompt: prompt,
      negativePrompt,
      brandWarnings: brandWarnings.length > 0 ? brandWarnings : undefined,
    };
  });
}

// ── Continuity Analyzer Prompt ──────────────────────────────────────────────

/**
 * Build a lightweight vision analysis prompt for scene continuity.
 * Used between scene generations: analyze the last frame of scene N
 * to inject continuity context into scene N+1's prompt.
 *
 * This is cheaper than describe-scene.js (50 words vs 150 words, gpt-4.1-mini).
 */
export const CONTINUITY_ANALYSIS_PROMPT = `Describe this video frame for visual continuity in under 50 words. Cover: subject position, lighting direction and color, environment state, camera angle. Use specific visual terms suitable for AI video generation prompts. Return ONLY the description.`;

// ── Merge Function ──────────────────────────────────────────────────────────

/**
 * Merge Stage 1 narrative beats with Stage 2 visual prompts into
 * the final scene array that the wizard uses for generation.
 */
export function mergeNarrativeAndVisual(narrativeBeats, visualScenes) {
  return visualScenes.map((visual, i) => {
    const narrative = narrativeBeats[i] || {};
    return {
      id: `scene-${Date.now()}-${i}`,
      sceneNumber: visual.sceneNumber || i + 1,
      // From Stage 2
      visualPrompt: visual.visualPrompt,
      motionPrompt: visual.motionPrompt,
      negativePrompt: visual.negativePrompt,
      previewImagePrompt: visual.previewImagePrompt,
      cameraAngle: visual.cameraAngle,
      durationSeconds: visual.durationSeconds,
      continuityNote: visual.continuityNote,
      // From Stage 1
      narrativeNote: narrative.narrativeMoment || '',
      beatType: narrative.beatType || '',
      emotionalTone: narrative.emotionalTone || '',
      dialogue: narrative.dialogue || '',
      setting: narrative.setting || '',
      pacingNote: narrative.pacingNote || '',
      // Generation state
      status: 'pending',
      videoUrl: null,
      lastFrameUrl: null,
      startFrameUrl: null,
      // Brand compliance
      brandWarnings: visual.brandWarnings || undefined,
    };
  });
}
