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
      characterDescription = '',
    } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Missing story description' });
    }

    console.log(`[Storyboard] Generating ${numScenes} scenes for: "${description.substring(0, 80)}..."`);

    const openai = new OpenAI({ apiKey: openaiKey });

    const systemPrompt = `You are a professional storyboard artist and video director. Break down the user's concept into a sequence of ${numScenes} scenes for AI video generation.

STYLE: ${style}
DEFAULT DURATION PER SCENE: ${defaultDuration} seconds
${cameraPreferences ? `CAMERA PREFERENCES: ${cameraPreferences}` : ''}
${characterDescription ? `CHARACTER DESCRIPTION (use @Element as placeholder in visual prompts when referring to this character): ${characterDescription}` : ''}

CRITICAL RULES:
- Each scene's visualPrompt must be a vivid, specific AI video generation prompt
- If a character description was provided, reference the character as @Element in visual prompts
- Visual prompts should describe the scene as if directing a cinematographer — include lighting, mood, environment, actions
- Motion prompts should describe camera movements and on-screen motion
- Scenes should flow naturally — the end of one scene should connect visually to the start of the next
- Vary camera angles for visual interest unless the user specified preferences
- Each scene duration should be between 3 and 10 seconds
- Total sequence should tell a cohesive visual story
- Do NOT include text, words, or typography in visual prompts`;

    const userPrompt = `Create a ${numScenes}-scene storyboard for: ${description}`;

    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(StoryboardSchema, 'storyboard'),
      temperature: 0.8,
    });

    const result = completion.choices[0].message.parsed;

    if (completion.usage && req.user?.email) {
      logCost({
        username: req.user.email.split('@')[0],
        category: 'openai',
        operation: 'storyboard_scene_generation',
        model: 'gpt-4o-mini',
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
