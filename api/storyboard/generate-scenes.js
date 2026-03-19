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
      cameraPreferences = '',
      characterDescription = '', // Legacy single character
      elements = [],             // New multi-element format: [{ index: 1, description: '...' }, ...]
      hasStartFrame = false,
    } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Missing story description' });
    }

    console.log(`[Storyboard] Generating ${numScenes} scenes for: "${description.substring(0, 80)}..." (${elements.length} elements, style: "${style?.substring(0, 60)}")`);

    const openai = new OpenAI({ apiKey: openaiKey });

    // Build element descriptions for the prompt
    let elementInstructions = '';
    const activeElements = elements.filter(el => el.description);
    if (activeElements.length > 0) {
      elementInstructions = activeElements.map(el =>
        `@Element${el.index}: ${el.description}`
      ).join('\n');
    } else if (characterDescription) {
      // Legacy single-character fallback
      elementInstructions = `@Element1: ${characterDescription}`;
    }

    const systemPrompt = `You are an expert AI video prompt engineer. Your job is to write extremely detailed, hyper-specific visual prompts that AI video generation models can render into beautiful footage.

VISUAL STYLE TO APPLY TO EVERY SCENE: ${style}
DEFAULT DURATION PER SCENE: ${defaultDuration} seconds
${cameraPreferences ? `CAMERA PREFERENCES: ${cameraPreferences}` : ''}
${elementInstructions ? `CHARACTER/OBJECT ELEMENTS — use the EXACT @ElementN placeholder names in every visualPrompt where that character/object appears:\n${elementInstructions}` : ''}
${hasStartFrame ? 'NOTE: A starting scene image has been provided. Scene 1 should describe what happens NEXT from that exact visual — same environment, same lighting, same composition continuing forward.' : ''}

PROMPT WRITING RULES:

1. Write each visualPrompt as a single flowing paragraph — NOT with labeled sections like "SUBJECT:" or "ACTION:". Write naturally as if describing a shot to a cinematographer. Example: "@Element1 rides a blue skateboard along a sunlit suburban sidewalk, golden-hour light from camera-left casting warm shadows, picket fences and pastel houses softly blurred in the background, leaves scattered on the concrete path."

2. Each visualPrompt should be 60-100 words. Concise but specific — include the subject, what they're doing, the environment, and the lighting/mood. Don't pad with technical jargon.

3. CAMERA/MOTION: Be specific — "smooth tracking shot at waist height following the subject" not "camera follows character".

4. STYLE: Weave the visual style naturally into the description. For 3D animation styles, describe characters as "smooth rounded 3D character with large expressive eyes" not just "a character".

5. SCENE CONTINUITY: The end of scene N must match the start of scene N+1 — same environment, same lighting, same character position.

6. @Element placeholders: You MUST use them exactly as listed above. Describe what the character is doing, their expression, and body language.

7. NEVER include: text, words, typography, watermarks, logos, or UI elements.

8. CRITICAL: The start_image_url provides the scene environment. Your prompt must describe the character WITHIN that same environment — do not describe a different location.`;

    const userPrompt = `Write ${numScenes} scene prompts for: ${description}

Each visualPrompt should be a natural flowing paragraph of 60-100 words describing what the camera sees. Keep it concise and direct — describe the character, their action, the environment, and the lighting. Do NOT use labeled sections like "SUBJECT:" or "ACTION:". These prompts go to an AI video model that works best with natural descriptions, not structured templates.`;

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
