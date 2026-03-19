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
      description,
      numScenes = 4,
      style = 'cinematic',
      defaultDuration = 5,
      overallMood = '',
      sceneGuides = [],
      elements = [],
      hasStartFrame = false,
      startFrameDescription = '',
    } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Missing story description' });
    }

    console.log(`[Storyboard] Generating ${numScenes} scenes for: "${description.substring(0, 80)}..." (${elements.length} elements, ${sceneGuides.length} guides, style: "${style?.substring(0, 60)}")`);

    const openai = new OpenAI({ apiKey: openaiKey });

    // Build element descriptions for the prompt
    let elementInstructions = '';
    const activeElements = elements.filter(el => el.description);
    if (activeElements.length > 0) {
      elementInstructions = activeElements.map(el =>
        `@Element${el.index}: ${el.description}`
      ).join('\n');
    }

    // Build per-scene guide instructions
    const hasGuides = sceneGuides.some(g => g.action || g.environment || g.actionType);
    let sceneGuideInstructions = '';
    if (hasGuides) {
      sceneGuideInstructions = sceneGuides.map(g => {
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

    const systemPrompt = `You are an expert AI video prompt engineer. Your job is to write detailed visual prompts that AI video generation models can render into beautiful footage.

STORY OVERVIEW: ${description}
${overallMood ? `OVERALL MOOD: ${overallMood}` : ''}
VISUAL STYLE TO APPLY TO EVERY SCENE: ${style}
DEFAULT DURATION PER SCENE: ${defaultDuration} seconds
${elementInstructions ? `CHARACTER/OBJECT ELEMENTS — use the EXACT @ElementN placeholder names in every visualPrompt:\n${elementInstructions}` : ''}
${hasStartFrame && startFrameDescription ? `STARTING SCENE IMAGE ANALYSIS — ALL scenes must take place in this exact environment:\n${startFrameDescription}` : ''}
${sceneGuideInstructions ? `\nPER-SCENE DIRECTIONS FROM THE USER — follow these exactly for each scene:\n${sceneGuideInstructions}` : ''}

PROMPT WRITING RULES:

1. Write each visualPrompt as a single flowing paragraph of 60-100 words. Describe what the camera sees naturally — the subject, their action, expression, the environment, and lighting.

2. Follow the user's per-scene directions EXACTLY — use their specified environment, action, expression, lighting, camera angle, and camera movement for each scene. Expand on their direction with visual detail but do NOT change what they specified.

3. Weave the visual style naturally into each description.

4. The end of scene N must visually match the start of scene N+1 — same environment, same lighting.

5. @Element placeholders: You MUST use them exactly as listed. Describe what the character is doing and their expression.

6. NEVER include: text, words, typography, watermarks, logos, or UI elements.

7. If a start frame scene analysis is provided, ALL scenes must take place in that same environment.`;

    const userPrompt = `Write ${numScenes} scene prompts based on the story overview and per-scene directions provided.

Each visualPrompt must be a natural flowing paragraph of 60-100 words. Follow the per-scene directions exactly — the user has specified what happens, where, the lighting, camera angle, and camera movement for each scene. Expand their direction into a rich visual description but do not deviate from what they specified.`;

    const completion = await openai.chat.completions.parse({
      model: 'gpt-5-mini',
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
        model: 'gpt-5-mini',
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
