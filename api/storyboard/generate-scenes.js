/**
 * Storyboard Scene Generator — AI-powered scene breakdown for multi-scene video sequences.
 * Uses GPT-5-mini with Zod structured output to decompose a story concept into
 * individual scenes with visual prompts, motion prompts, and camera directions.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

function buildBrandStyleContext(bsg) {
  if (!bsg) return '';
  const parts = [];
  if (bsg.brand_name) parts.push(`Brand: ${bsg.brand_name}`);
  if (bsg.visual_style_notes) parts.push(`Visual Style: ${bsg.visual_style_notes}`);
  if (bsg.mood_atmosphere) parts.push(`Mood/Atmosphere: ${bsg.mood_atmosphere}`);
  if (bsg.lighting_prefs) parts.push(`Lighting: ${bsg.lighting_prefs}`);
  if (bsg.composition_style) parts.push(`Composition: ${bsg.composition_style}`);
  if (bsg.ai_prompt_rules) parts.push(`AI Prompt Rules: ${bsg.ai_prompt_rules}`);
  if (bsg.preferred_elements) parts.push(`Include: ${bsg.preferred_elements}`);
  if (bsg.prohibited_elements) parts.push(`Exclude: ${bsg.prohibited_elements}`);
  if (parts.length === 0) return '';
  return `\nBRAND STYLE GUIDE — ensure visual consistency with these brand guidelines:\n${parts.join('\n')}`;
}

const StoryboardSceneSchema = z.object({
  sceneNumber: z.number().describe('Sequential scene number starting from 1'),
  visualPrompt: z.string().describe('Detailed AI video generation prompt describing exactly what to show — environment, characters, actions, lighting, mood'),
  motionPrompt: z.string().describe('Camera movement and action: slow pan, zoom in, tracking shot, etc.'),
  durationSeconds: z.number().describe('Scene duration in seconds (3-10)'),
  cameraAngle: z.string().describe('Camera angle: wide, medium, close-up, bird-eye, low-angle, over-shoulder, etc.'),
  narrativeNote: z.string().describe('Brief note on what happens story-wise in this scene'),
});

const StoryboardSchema = z.object({
  title: z.string().max(100).describe('Title for the storyboard sequence'),
  scenes: z.array(StoryboardSceneSchema),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { openaiKey } = await getUserKeys(req.user.id, req.user.email);

    if (!openaiKey) {
      return res.status(400).json({ error: 'OpenAI API key not configured. Please add it in API Keys settings.' });
    }

    const {
      // Story & Mood (Step 1)
      storyboardName,
      desiredLength = 60,           // Total target length in seconds (replaces numScenes)
      defaultDuration = 5,          // Hint for per-scene duration
      overallMood,
      aspectRatio = '16:9',

      // Visual Style (Step 2)
      style = 'cinematic',
      visualStylePrompt,            // Full prompt text from getPromptText()
      builderStyle,                 // Manual style pill
      builderLighting,              // Manual lighting pill
      builderColorGrade,            // Manual color grade pill

      // Video Style (Step 3)
      videoStylePrompt,             // Full ~150-word cinematography prompt from video style preset

      // Model (Step 4)
      globalModel,                  // e.g. 'veo3', 'kling-r2v-pro', 'seedance-pro'
      modelDurationConstraints,     // { min, max, allowed[] } — valid durations for chosen model

      // Starting Image (Step 5a)
      hasStartFrame,
      startFrameDescription,        // From describe-scene analysis

      // Characters (Step 5b)
      elements,                     // @Element descriptions for Kling R2V
      veoReferenceCount,            // Number of Veo reference images (for prompt awareness)

      // Scene Direction Pills (Step 5c)
      sceneDirection,               // { environment: [], action: [], expression: [], lighting: [], camera: [] }

      // Brand
      props,
      negativePrompt,
      brandStyleGuide,

      // Legacy compat
      description,
      storyBeats,
      numScenes,
      sceneGuides,
    } = req.body;

    const storyBeatsArr = storyBeats || [];
    const elementsArr = elements || [];
    const propsArr = props || [];
    const sceneGuidesArr = sceneGuides || [];

    if (!description && storyBeatsArr.length === 0) {
      return res.status(400).json({ error: 'Missing story description or story beats' });
    }

    // Determine target scene count from desired length or legacy numScenes
    let targetSceneCount;
    if (numScenes) {
      targetSceneCount = numScenes;
    } else {
      const avgDuration = modelDurationConstraints?.allowed
        ? modelDurationConstraints.allowed[Math.floor(modelDurationConstraints.allowed.length / 2)]
        : defaultDuration;
      targetSceneCount = Math.max(1, Math.min(12, Math.round(desiredLength / avgDuration)));
    }

    // If no explicit description but we have beats, construct one
    const effectiveDescription = description || storyBeatsArr.map(b => b.summary).join('. ');

    // Build story beats context from conversational story builder
    let storyBeatContext = '';
    if (storyBeatsArr.length > 0) {
      storyBeatContext = storyBeatsArr.map(beat =>
        `Scene ${beat.sceneNumber}: ${beat.summary} (Setting: ${beat.setting}, Action: ${beat.keyAction}, Emotion: ${beat.emotion})`
      ).join('\n');
    }

    console.log(`[Storyboard] Generating ${targetSceneCount} scenes for: "${effectiveDescription.substring(0, 80)}..." (${elementsArr.length} elements, ${sceneGuidesArr.length} guides, ${storyBeatsArr.length} beats, style: "${style?.substring(0, 60)}", desiredLength: ${desiredLength}s, model: ${globalModel || 'default'})`);

    const openai = new OpenAI({ apiKey: openaiKey });

    // Build element descriptions for the prompt
    let elementInstructions = '';
    const activeElements = elementsArr.filter(el => el.description);
    if (activeElements.length > 0) {
      elementInstructions = activeElements.map(el =>
        `@Element${el.index}: ${el.description}`
      ).join('\n');
    }

    // Build per-scene guide instructions (legacy sceneGuides)
    const hasGuides = sceneGuidesArr.some(g => g.action || g.environment || g.actionType);
    let sceneGuideInstructions = '';
    if (hasGuides) {
      sceneGuideInstructions = sceneGuidesArr.map(g => {
        const parts = [`Scene ${g.sceneNumber}:`];
        if (g.action) parts.push(`Action: ${g.action}`);
        if (g.environment) parts.push(`Setting: ${g.environment}`);
        if (g.environmentDetail) parts.push(`(${g.environmentDetail})`);
        if (g.actionType) parts.push(`Movement: ${g.actionType}`);
        if (g.expression) parts.push(`Expression: ${g.expression}`);
        if (g.lighting) parts.push(`Lighting: ${g.lighting}`);
        if (g.cameraAngle) parts.push(`Angle: ${g.cameraAngle}`);
        if (g.cameraMovement) parts.push(`Camera: ${g.cameraMovement}`);
        return parts.join(' | ');
      }).join('\n');
    }

    // Build scene direction block from pill selections
    let sceneDirectionBlock = '';
    if (sceneDirection) {
      const dirParts = [];
      if (sceneDirection.environment?.length) dirParts.push(`Environment: ${sceneDirection.environment.join(', ')}`);
      if (sceneDirection.action?.length) dirParts.push(`Action: ${sceneDirection.action.join(', ')}`);
      if (sceneDirection.expression?.length) dirParts.push(`Expression: ${sceneDirection.expression.join(', ')}`);
      if (sceneDirection.lighting?.length) dirParts.push(`Lighting: ${sceneDirection.lighting.join(', ')}`);
      if (sceneDirection.camera?.length) dirParts.push(`Camera: ${sceneDirection.camera.join(', ')}`);
      if (dirParts.length > 0) {
        sceneDirectionBlock = `SCENE DIRECTION PREFERENCES — apply these across scenes:\n${dirParts.join('\n')}`;
      }
    }

    // Build visual style block
    const styleLines = [];
    if (visualStylePrompt) styleLines.push(`Visual Style: ${visualStylePrompt}`);
    else if (style) styleLines.push(`Visual Style: ${style}`);
    if (builderStyle) styleLines.push(`Style Modifier: ${builderStyle}`);
    if (builderLighting) styleLines.push(`Lighting: ${builderLighting}`);
    if (builderColorGrade) styleLines.push(`Color Grade: ${builderColorGrade}`);
    const styleBlock = styleLines.length > 0 ? styleLines.join('\n') : '';

    // Build model duration context
    let durationContext = '';
    if (modelDurationConstraints) {
      const parts = [];
      if (modelDurationConstraints.allowed?.length) parts.push(`allowed durations: ${modelDurationConstraints.allowed.join('s, ')}s`);
      else {
        if (modelDurationConstraints.min) parts.push(`min: ${modelDurationConstraints.min}s`);
        if (modelDurationConstraints.max) parts.push(`max: ${modelDurationConstraints.max}s`);
      }
      if (parts.length > 0) durationContext = `MODEL DURATION CONSTRAINTS — each scene durationSeconds must be one of the allowed values: ${parts.join(', ')}`;
    }

    const systemPrompt = `You are an expert AI video prompt engineer. Your job is to write detailed visual prompts that AI video generation models can render into beautiful footage.

STORY CONTEXT:
Story: ${effectiveDescription}
${storyboardName ? `Title: ${storyboardName}` : ''}
${overallMood ? `Overall Mood: ${overallMood}` : ''}
Aspect Ratio: ${aspectRatio}
${globalModel ? `Target Model: ${globalModel}` : ''}
${storyBeatContext ? `\nSTORY BEATS FROM CREATIVE SESSION — follow these beats closely:\n${storyBeatContext}` : ''}

${hasStartFrame && startFrameDescription ? `START FRAME ANALYSIS — ALL scenes must take place in this exact environment:\n${startFrameDescription}\n` : ''}
${elementInstructions ? `CHARACTER/OBJECT ELEMENTS — use the EXACT @ElementN placeholder names in every visualPrompt:\n${elementInstructions}\n` : ''}
${veoReferenceCount ? `VEO REFERENCE IMAGES: ${veoReferenceCount} reference image(s) provided. Describe characters/objects in terms consistent with visual reference.\n` : ''}
${sceneDirectionBlock ? `${sceneDirectionBlock}\n` : ''}
${sceneGuideInstructions ? `PER-SCENE DIRECTIONS FROM THE USER — follow these exactly:\n${sceneGuideInstructions}\n` : ''}

VISUAL STYLE — apply consistently across all scenes:
${styleBlock || `Style: ${style}`}
${videoStylePrompt ? `\nCINEMATOGRAPHY DIRECTION:\n${videoStylePrompt}` : ''}

${propsArr?.length > 0 ? `PROPS & ACCESSORIES to include naturally in scenes: ${propsArr.join(', ')}\n` : ''}
${negativePrompt ? `THINGS TO AVOID in all scenes: ${negativePrompt}\n` : ''}
${brandStyleGuide ? buildBrandStyleContext(brandStyleGuide) : ''}
${durationContext ? `\n${durationContext}\n` : ''}

PROMPT WRITING RULES:

1. Write each visualPrompt as a single flowing paragraph of 60-100 words. Describe what the camera sees naturally — the subject, their action, expression, the environment, and lighting.

2. Follow the user's per-scene directions EXACTLY — use their specified environment, action, expression, lighting, camera angle, and camera movement for each scene. Expand on their direction with visual detail but do NOT change what they specified.

3. Weave the visual style and cinematography direction naturally into each description.

4. The end of scene N must visually match the start of scene N+1 — same environment, same lighting conditions.

5. @Element placeholders: You MUST use them exactly as listed. Describe what the character is doing and their expression.

6. NEVER include: text, words, typography, watermarks, logos, or UI elements in any visualPrompt.

7. If a start frame analysis is provided, ALL scenes must take place in that same environment.

8. Each scene's durationSeconds must respect the model duration constraints if provided.`;

    const userPrompt = `Write exactly ${targetSceneCount} scene prompts for a ${desiredLength}-second video based on the story overview and directions provided.

Each visualPrompt must be a natural flowing paragraph of 60-100 words. Weave in the visual style, cinematography direction, and any per-scene directions. Maintain visual continuity so each scene flows into the next.`;

    const completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(StoryboardSchema, 'storyboard'),
    });

    const result = completion.choices[0].message.parsed;

    if (completion.usage && req.user?.email) {
      logCost({
        username: req.user.email.split('@')[0],
        category: 'openai',
        operation: 'storyboard_scene_generation',
        model: 'gpt-4.1-mini-2025-04-14',
        input_tokens: completion.usage.prompt_tokens,
        output_tokens: completion.usage.completion_tokens,
      });
    }

    console.log(`[Storyboard] Generated "${result.title}" — ${result.scenes.length} scenes`);

    return res.status(200).json({
      success: true,
      title: result.title,
      scenes: result.scenes,
    });

  } catch (error) {
    console.error('[Storyboard] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
