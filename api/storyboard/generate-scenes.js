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

PROMPT ENGINEERING RULES — follow these exactly:

1. VISUAL PROMPT FORMAT: Each visualPrompt must read like a cinematographer's shot description. Include ALL of these in every prompt:
   - SUBJECT: Exactly what/who is in frame, their appearance, pose, expression, clothing, position in frame
   - ACTION: Precisely what is happening — specific body movements, gestures, interactions
   - ENVIRONMENT: Detailed setting — ground surface, surroundings, background elements, weather, time of day
   - LIGHTING: Specific lighting setup — direction, quality, color temperature, shadows (e.g., "warm golden-hour sunlight from camera-left casting long shadows", not just "nice lighting")
   - COLOR PALETTE: Dominant colors in the scene
   - DEPTH & COMPOSITION: Foreground/midground/background layers, depth of field, framing

2. MOTION PROMPT: Be specific about camera movement with technical terms:
   - BAD: "camera follows character"
   - GOOD: "smooth tracking shot at waist height, dollying left-to-right at walking pace, slight parallax on background buildings"

3. STYLE ENFORCEMENT: Weave the visual style description naturally into every visualPrompt. Don't just append it — describe the scene AS IF it exists in that style. For example, if the style is "3D rendered kids animation", describe "smooth rounded 3D character with large expressive eyes and soft subsurface skin shading" not just "a character".

4. SCENE CONTINUITY: The final frame of scene N must match the opening frame of scene N+1. Describe the same environment, lighting, and character position at transition points.

5. PROMPT LENGTH: Each visualPrompt should be 100-200 words. Short prompts produce generic, flat results. Be extremely lavish with visual detail.

6. MATERIAL & TEXTURE DETAIL: Always describe surface qualities — fur texture, fabric weave, skin shading, ground surface material, reflection qualities, translucency. For 3D styles describe: subsurface scattering, ambient occlusion, rim lighting, specular highlights on surfaces. For realistic styles describe: skin pores, fabric threads, dust particles, lens characteristics.

7. DEPTH & ATMOSPHERE: Describe atmospheric perspective — haze, dust motes in light beams, bokeh in background, heat shimmer, fog layers. Describe at least 3 depth layers (foreground detail, midground subject, background environment).

8. NEVER include: text, words, typography, watermarks, logos, UI elements, or letterboxing in visual prompts.

9. If @Element placeholders are listed above, you MUST use them (e.g., "@Element1 rides a green scooter") — never replace them with generic descriptions. When referencing @Element characters, still describe their pose, expression, and what they're physically doing in rich detail.`;

    const userPrompt = `Write ${numScenes} hyper-detailed AI video generation prompts for this story concept: ${description}

CRITICAL: Each visualPrompt must be 100-200 words of pure visual description. Describe exactly what the camera sees: the lighting direction and color temperature, surface textures and materials, atmospheric effects, depth layers, character expressions and body language, environmental details like ground surface, sky conditions, and background elements. These prompts are fed directly to an AI video model — vague or narrative descriptions produce flat, lifeless, generic output. The more specific visual detail you provide, the better the result.`;

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
