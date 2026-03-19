/**
 * POST /api/prompt/build-cohesive
 *
 * Accepts structured creative inputs from any tool (Imagineer, Edit, Turnaround,
 * Storyboard) and uses GPT to build a single cohesive image generation prompt.
 *
 * Body: {
 *   tool: 'imagineer' | 'edit' | 'turnaround' | 'storyboard',
 *   description: string,           // subject or character description
 *   style: string,                 // artistic style text
 *   props: string[],               // prop labels
 *   negativePrompt: string,        // combined negative prompt string
 *   brandStyleGuide: {             // from brand kit
 *     brand_name, visual_style_notes, mood_atmosphere, lighting_prefs,
 *     composition_style, ai_prompt_rules, preferred_elements, prohibited_elements, colors
 *   },
 *   referenceDescription: string,  // AI-analyzed description of reference image
 *   // Tool-specific fields:
 *   subjectType: string,           // imagineer: person, object, landscape, etc.
 *   lighting: string,              // imagineer: lighting style
 *   cameraAngle: string,           // imagineer: camera angle
 *   colorPalette: string,          // imagineer: color palette
 *   mood: string,                  // imagineer: mood
 *   elementsToInclude: string,     // imagineer: extra elements
 *   editStrength: number,          // edit: how creative vs faithful
 *   hasReference: boolean,         // turnaround: whether reference image is used
 * }
 */

import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    tool = 'imagineer',
    description,
    style,
    props,
    negativePrompt,
    brandStyleGuide,
    referenceDescription,
    subjectType,
    lighting,
    cameraAngle,
    colorPalette,
    mood,
    elementsToInclude,
    editStrength,
    hasReference,
  } = req.body;

  if (!description && !referenceDescription) {
    return res.status(400).json({ error: 'At least description or referenceDescription is required' });
  }

  const { openaiKey } = await getUserKeys(req.user.id, req.user.email);
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured.' });

  const openai = new OpenAI({ apiKey: openaiKey });

  // Build the structured context for the LLM
  const sections = [];

  sections.push(`TOOL: ${tool}`);

  if (tool === 'imagineer') {
    sections.push(`PURPOSE: Generate a high-quality text-to-image prompt for an AI image generator.`);
  } else if (tool === 'edit') {
    sections.push(`PURPOSE: Generate a high-quality image editing prompt. The AI will modify an existing image based on this prompt.`);
    if (editStrength != null) sections.push(`EDIT STRENGTH: ${editStrength} (${editStrength < 0.4 ? 'subtle changes' : editStrength < 0.7 ? 'moderate changes' : 'creative reimagining'})`);
  } else if (tool === 'turnaround') {
    sections.push(`PURPOSE: Generate a character turnaround sheet prompt. The output is a 4×6 grid of 24 character poses.`);
  } else if (tool === 'storyboard') {
    sections.push(`PURPOSE: Generate a scene description for AI video generation. Must capture environment, action, and mood.`);
  }

  if (description) sections.push(`DESCRIPTION: ${description}`);
  if (referenceDescription) sections.push(`REFERENCE IMAGE ANALYSIS: ${referenceDescription}`);
  if (subjectType) sections.push(`SUBJECT TYPE: ${subjectType}`);
  if (style) sections.push(`ARTISTIC STYLE: ${style}`);
  if (lighting) sections.push(`LIGHTING: ${lighting}`);
  if (cameraAngle) sections.push(`CAMERA ANGLE: ${cameraAngle}`);
  if (colorPalette) sections.push(`COLOR PALETTE: ${colorPalette}`);
  if (mood) sections.push(`MOOD: ${mood}`);
  if (elementsToInclude) sections.push(`ELEMENTS TO INCLUDE: ${elementsToInclude}`);
  if (props?.length > 0) sections.push(`PROPS & ACCESSORIES: ${props.join(', ')}`);
  if (negativePrompt) sections.push(`THINGS TO AVOID: ${negativePrompt}`);
  if (hasReference) sections.push(`HAS REFERENCE IMAGE: yes — recreate the exact character from the reference`);

  // Brand style guide context
  if (brandStyleGuide) {
    const bsg = [];
    if (brandStyleGuide.brand_name) bsg.push(`Brand: ${brandStyleGuide.brand_name}`);
    if (brandStyleGuide.visual_style_notes) bsg.push(`Visual Style: ${brandStyleGuide.visual_style_notes}`);
    if (brandStyleGuide.mood_atmosphere) bsg.push(`Mood/Atmosphere: ${brandStyleGuide.mood_atmosphere}`);
    if (brandStyleGuide.lighting_prefs) bsg.push(`Lighting Preferences: ${brandStyleGuide.lighting_prefs}`);
    if (brandStyleGuide.composition_style) bsg.push(`Composition: ${brandStyleGuide.composition_style}`);
    if (brandStyleGuide.ai_prompt_rules) bsg.push(`AI Prompt Rules: ${brandStyleGuide.ai_prompt_rules}`);
    if (brandStyleGuide.preferred_elements) bsg.push(`Preferred Elements: ${brandStyleGuide.preferred_elements}`);
    if (brandStyleGuide.prohibited_elements) bsg.push(`Prohibited Elements: ${brandStyleGuide.prohibited_elements}`);
    if (brandStyleGuide.colors?.length > 0) bsg.push(`Brand Colors: ${JSON.stringify(brandStyleGuide.colors)}`);
    if (bsg.length > 0) sections.push(`BRAND STYLE GUIDE:\n${bsg.join('\n')}`);
  }

  const systemPrompt = getSystemPrompt(tool);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sections.join('\n\n') },
      ],
      max_tokens: 800,
    });

    const prompt = (response.choices[0]?.message?.content || '').trim();
    console.log(`[build-cohesive] Tool: ${tool} | Prompt length: ${prompt.length}`);

    if (!prompt) {
      return res.status(500).json({ error: 'LLM returned empty prompt' });
    }

    return res.json({ success: true, prompt });
  } catch (err) {
    console.error('[build-cohesive] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

function getSystemPrompt(tool) {
  const base = `You are an expert AI image prompt engineer. Your job is to take structured creative inputs and produce a single, cohesive, highly detailed prompt for an AI image generator.

Rules:
- Output ONLY the prompt text — no preamble, no explanation, no quotes
- Weave all elements together naturally into flowing descriptive text
- Be extremely specific with visual details (colors, materials, lighting, composition)
- If a brand style guide is provided, ensure the visual style aligns with it
- If props are listed, incorporate them naturally (character holding, wearing, or interacting with them)
- If negative/avoidance items are listed, end with "AVOID: [items]" as the final line
- If a reference image analysis is provided, use those details as the primary visual description`;

  if (tool === 'turnaround') {
    return `${base}

TURNAROUND SHEET SPECIFIC:
- The output is a 4×6 grid character model sheet (24 cells)
- Include turnaround-specific terms: "character reference sheet, model sheet, turnaround sheet, multiple poses and angles"
- Describe the 6 rows: Row 1 (front/3-4 front/side/back), Row 2 (3-4 back/neutral/determined/joyful), Row 3 (walk cycles), Row 4 (dynamic/action), Row 5 (still poses), Row 6 (detail close-ups)
- Ensure consistent character across all cells`;
  }

  if (tool === 'edit') {
    return `${base}

IMAGE EDITING SPECIFIC:
- The prompt tells the AI how to modify an existing image
- Focus on what should change or be enhanced, not what already exists
- Keep the prompt focused and directive`;
  }

  if (tool === 'storyboard') {
    return `${base}

STORYBOARD / VIDEO SCENE SPECIFIC:
- The prompt describes a scene for AI video generation
- Include environment, character action, camera angle, and mood
- Be cinematic and descriptive of motion and timing`;
  }

  return base; // imagineer default
}
