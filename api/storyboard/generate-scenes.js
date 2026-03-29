/**
 * Storyboard Scene Generator v2 — Two-Stage Script Generation
 *
 * Stage 1: Narrative Generator
 *   Input: story concept, mood, brand rules, narrative style, scene direction
 *   Output: structured narrative beats (what happens, where, emotional arc)
 *
 * Stage 2: Visual Director
 *   Input: narrative beats + visual style + motion style + model template
 *   Output: model-ready video generation prompts (150-250 words each)
 *
 * This replaces:
 * - The old monolithic generate-scenes.js (single GPT call doing everything)
 * - The per-scene cohesive prompt builder calls (build-cohesive.js with tool='storyboard')
 *
 * Total LLM calls: 2 (down from 7 for a 6-scene storyboard)
 * Total cost: ~$0.02-0.03 (vs ~$0.04-0.05 with old approach)
 *
 * Drop-in replacement: same request body, same response shape.
 */

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

import {
  buildNarrativeSystemPrompt,
  buildNarrativeUserPrompt,
  calculateSceneCount,
  NarrativeArcSchema,
} from '../lib/storyboardNarrativeGenerator.js';

import {
  buildVisualDirectorSystemPrompt,
  buildVisualDirectorUserPrompt,
  postProcessVisualScenes,
  mergeNarrativeAndVisual,
  VisualDirectorOutputSchema,
} from '../lib/storyboardVisualDirector.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { openaiKey } = await getUserKeys(req.user.id, req.user.email);
    if (!openaiKey) {
      return res.status(400).json({ error: 'OpenAI API key not configured.' });
    }

    const {
      // Step 1: Project & Brand
      storyboardName,
      desiredLength = 60,
      defaultDuration = 5,
      aspectRatio = '16:9',
      clientBrief,
      brandStyleGuide,

      // Step 2: Story
      overallMood,
      narrativeStyle = 'entertaining',  // NEW — maps to NARRATIVE_ARCS
      targetAudience,                    // NEW — children, teens, adults, etc.
      storyBeats,                        // From conversational story builder (if used)
      hasDialogue = false,               // NEW — whether to generate dialogue per scene

      // Step 3: Look & Feel
      style = 'cinematic',
      visualStylePrompt,        // From getPromptText(style)
      builderStyle,
      builderLighting,
      builderColorGrade,
      videoStylePrompt,         // From video/motion style preset

      // Step 4: Characters & Scene
      hasStartFrame,
      startFrameDescription,
      elements,                 // Kling @Element descriptions
      veoReferenceCount,
      sceneDirection,
      props,
      negativePrompt,

      // Step 6: Audio & Model
      globalModel,
      modelDurationConstraints,

      // Legacy compat
      description,
      numScenes,
      sceneGuides,
    } = req.body;

    // Resolve inputs
    const effectiveDescription = description || storyboardName || '';
    if (!effectiveDescription) {
      return res.status(400).json({ error: 'Missing story description or storyboard name' });
    }

    const durationConstraints = modelDurationConstraints || getDurationConstraints(globalModel);
    const targetSceneCount = numScenes || calculateSceneCount(desiredLength, durationConstraints, narrativeStyle);

    // Build character descriptions for the visual director
    const activeElements = (elements || []).filter(el => el.description);
    const characterDescriptions = activeElements.map(el => el.description);

    const openai = new OpenAI({ apiKey: openaiKey });

    console.log(`[Storyboard v2] Starting two-stage generation: "${effectiveDescription.substring(0, 80)}..." (${targetSceneCount} scenes, ${narrativeStyle} arc, model: ${globalModel || 'default'})`);

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 1: NARRATIVE GENERATOR
    // ═══════════════════════════════════════════════════════════════════════

    console.log(`[Storyboard v2] Stage 1: Narrative generation...`);

    const narrativeInputs = {
      storyOverview: effectiveDescription,
      storyboardName,
      overallMood,
      narrativeStyle,
      targetAudience,
      desiredLength,
      targetSceneCount,
      durationConstraints,
      sceneDirection,
      brandStyleGuide,
      clientBrief,
      hasDialogue,
      storyBeats: storyBeats || [],
    };

    const narrativeSystemPrompt = buildNarrativeSystemPrompt(narrativeInputs);
    const narrativeUserPrompt = buildNarrativeUserPrompt(narrativeInputs);

    const stage1Completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: narrativeSystemPrompt },
        { role: 'user', content: narrativeUserPrompt },
      ],
      response_format: zodResponseFormat(NarrativeArcSchema, 'narrative_arc'),
    });

    const narrativeArc = stage1Completion.choices[0].message.parsed;

    if (stage1Completion.usage && req.user?.email) {
      logCost({
        username: req.user.email.split('@')[0],
        category: 'openai',
        operation: 'storyboard_stage1_narrative',
        model: 'gpt-4.1-mini-2025-04-14',
        input_tokens: stage1Completion.usage.prompt_tokens,
        output_tokens: stage1Completion.usage.completion_tokens,
      });
    }

    console.log(`[Storyboard v2] Stage 1 complete: "${narrativeArc.title}" — ${narrativeArc.beats.length} beats, logline: "${narrativeArc.logline}"`);

    // ═══════════════════════════════════════════════════════════════════════
    // STAGE 2: VISUAL DIRECTOR
    // ═══════════════════════════════════════════════════════════════════════

    console.log(`[Storyboard v2] Stage 2: Visual direction for ${globalModel || 'default'}...`);

    const visualInputs = {
      modelId: globalModel || 'veo3-fast',
      narrativeBeats: narrativeArc.beats,
      visualStylePrompt: visualStylePrompt || undefined,
      builderStyle,
      builderLighting,
      builderColorGrade,
      motionStylePrompt: videoStylePrompt || undefined,
      startFrameDescription: hasStartFrame ? startFrameDescription : undefined,
      characterDescriptions: characterDescriptions.length > 0 ? characterDescriptions : undefined,
      brandStyleGuide,
      aspectRatio,
      sceneDirection,
    };

    const visualSystemPrompt = buildVisualDirectorSystemPrompt(visualInputs);
    const visualUserPrompt = buildVisualDirectorUserPrompt(narrativeArc.beats.length);

    const stage2Completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: visualSystemPrompt },
        { role: 'user', content: visualUserPrompt },
      ],
      response_format: zodResponseFormat(VisualDirectorOutputSchema, 'visual_director'),
    });

    const visualOutput = stage2Completion.choices[0].message.parsed;

    if (stage2Completion.usage && req.user?.email) {
      logCost({
        username: req.user.email.split('@')[0],
        category: 'openai',
        operation: 'storyboard_stage2_visual',
        model: 'gpt-4.1-mini-2025-04-14',
        input_tokens: stage2Completion.usage.prompt_tokens,
        output_tokens: stage2Completion.usage.completion_tokens,
      });
    }

    console.log(`[Storyboard v2] Stage 2 complete: ${visualOutput.scenes.length} visual prompts generated`);

    // ═══════════════════════════════════════════════════════════════════════
    // POST-PROCESSING
    // ═══════════════════════════════════════════════════════════════════════

    // Apply model-specific sanitization and brand compliance
    const processedScenes = postProcessVisualScenes(
      visualOutput.scenes,
      globalModel || 'veo3-fast',
      brandStyleGuide
    );

    // Merge narrative beats with visual prompts into final scene array
    const finalScenes = mergeNarrativeAndVisual(narrativeArc.beats, processedScenes);

    // Log any brand warnings
    const allWarnings = finalScenes.flatMap(s => s.brandWarnings || []);
    if (allWarnings.length > 0) {
      console.warn(`[Storyboard v2] Brand compliance warnings:`, allWarnings);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RESPONSE (same shape as old generate-scenes.js)
    // ═══════════════════════════════════════════════════════════════════════

    return res.status(200).json({
      success: true,
      title: narrativeArc.title,
      logline: narrativeArc.logline,
      narrativeStyle: narrativeArc.narrativeStyle,
      overallEmotionalArc: narrativeArc.overallEmotionalArc,
      styleConsistencyNote: visualOutput.styleConsistencyNote,
      scenes: finalScenes.map(s => ({
        // Fields the wizard expects (backward compatible)
        sceneNumber: s.sceneNumber,
        visualPrompt: s.visualPrompt,
        motionPrompt: s.motionPrompt,
        durationSeconds: s.durationSeconds,
        cameraAngle: s.cameraAngle,
        narrativeNote: s.narrativeNote,
        // New fields from two-stage pipeline
        negativePrompt: s.negativePrompt,
        previewImagePrompt: s.previewImagePrompt,
        continuityNote: s.continuityNote,
        beatType: s.beatType,
        emotionalTone: s.emotionalTone,
        dialogue: s.dialogue,
        setting: s.setting,
        pacingNote: s.pacingNote,
        brandWarnings: s.brandWarnings,
      })),
      brandWarnings: allWarnings.length > 0 ? allWarnings : undefined,
    });

  } catch (error) {
    console.error('[Storyboard v2] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ── Duration Constraints Fallback ───────────────────────────────────────────

function getDurationConstraints(modelId) {
  const constraints = {
    'veo3': { min: 4, max: 8, allowed: [4, 6, 8] },
    'veo3-fast': { min: 4, max: 8, allowed: [4, 6, 8] },
    'veo3-first-last': { min: 8, max: 8, allowed: [8] },
    'kling-r2v-pro': { min: 5, max: 10, allowed: [5, 10] },
    'kling-r2v-standard': { min: 5, max: 10, allowed: [5, 10] },
    'kling-video': { min: 5, max: 10, allowed: [5, 10] },
    'kling-o3-v2v-pro': { min: 3, max: 15, allowed: [3, 5, 8, 10, 15] },
    'kling-o3-v2v-standard': { min: 3, max: 15, allowed: [3, 5, 8, 10, 15] },
    'seedance-pro': { min: 4, max: 12, allowed: [4, 6, 8, 10, 12] },
    'grok-imagine': { min: 5, max: 15, allowed: [5, 8, 10, 15] },
    'grok-r2v': { min: 1, max: 10, allowed: [4, 6, 8, 10] },
    'wavespeed-wan': { min: 5, max: 8, allowed: [5, 8] },
  };
  return constraints[modelId] || { min: 5, max: 8, allowed: [5, 8] };
}
