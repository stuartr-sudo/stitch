/**
 * POST /api/prompt/build-cohesive
 *
 * Accepts structured creative inputs from any tool (Imagineer, Edit, Turnaround,
 * Storyboard) and uses GPT to build a single cohesive image generation prompt.
 *
 * Body: {
 *   tool: 'imagineer' | 'edit' | 'turnaround' | 'storyboard' | 'jumpstart',
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
    // Storyboard-specific fields
    cameraDirection,
    videoStylePrompt,
    colorGrade,
    // Shorts-specific fields
    previousSceneAnalysis,
    nicheMood,
    sceneIndex,
    totalScenes,
    continuityMode,       // 'continuous' or 'exciting'
    characterReferences,  // array of { id, description, role } from production package
    // Model-aware prompt optimization
    targetModel,
    // Prompt template support
    template,
    templateVariables,
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
  if (cameraDirection) sections.push(`CAMERA DIRECTION: ${cameraDirection}`);
  if (videoStylePrompt) sections.push(`VIDEO STYLE / CINEMATOGRAPHY: ${videoStylePrompt}`);
  if (colorGrade) sections.push(`COLOR GRADE: ${colorGrade}`);
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

  // Shorts-specific context
  if (previousSceneAnalysis) sections.push(`PREVIOUS SCENE ANALYSIS (from Gemini video understanding):\n${previousSceneAnalysis}`);
  if (nicheMood) sections.push(`NICHE VISUAL MOOD: ${nicheMood}`);
  if (sceneIndex != null && totalScenes) sections.push(`SCENE POSITION: Scene ${sceneIndex + 1} of ${totalScenes}`);

  if (targetModel) sections.push(`TARGET VIDEO MODEL: ${targetModel}`);

  // Resolve prompt template sections and merge into context.
  // Template sections provide structured defaults; explicit user inputs above take priority.
  if (template && template.sections) {
    const vars = templateVariables || {};
    const resolvedSections = {};
    for (const [key, value] of Object.entries(template.sections)) {
      if (typeof value === 'string') {
        resolvedSections[key] = value.replace(/\{\{(\w+)\}\}/g, (match, varKey) => {
          return vars[varKey] !== undefined ? vars[varKey] : match;
        });
      }
    }

    const templateParts = [];
    if (resolvedSections.camera && !cameraAngle && !cameraDirection) {
      templateParts.push(`CAMERA (from template): ${resolvedSections.camera}`);
    }
    if (resolvedSections.subject && !description) {
      templateParts.push(`SUBJECT (from template): ${resolvedSections.subject}`);
    }
    if (resolvedSections.environment) {
      templateParts.push(`ENVIRONMENT (from template): ${resolvedSections.environment}`);
    }
    if (resolvedSections.motion) {
      templateParts.push(`MOTION (from template): ${resolvedSections.motion}`);
    }
    if (resolvedSections.style && !style) {
      templateParts.push(`STYLE (from template): ${resolvedSections.style}`);
    }

    if (templateParts.length > 0) {
      sections.push(`PROMPT TEMPLATE DIRECTIONS:\n${templateParts.join('\n')}`);
    }
  }

  const systemPrompt = getSystemPrompt(tool, targetModel);

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

function getModelGuidance(targetModel) {
  if (!targetModel) return '';
  const m = targetModel.toLowerCase();
  if (m.includes('kling')) {
    return `\n\nMODEL-SPECIFIC OPTIMIZATION (Kling):
- Structure the prompt in this order: CAMERA → SUBJECT → ACTION → ENVIRONMENT → LIGHTING → TEXTURE
- Kling responds well to explicit camera descriptions (e.g., "medium tracking shot", "slow push-in", "deliberate 360° orbit")
- Describe the subject's action in present continuous tense ("is walking", "is reaching for")
- Include environmental atmosphere details (steam, dust, rain) for realism
- For dialogue scenes, describe speaking actions and emotions explicitly`;
  }
  if (m.includes('veo')) {
    return `\n\nMODEL-SPECIFIC OPTIMIZATION (Veo 3.1):
- Lead with the overall scene description and mood
- Veo excels with cinematic language: "establishing shot", "dolly zoom", "rack focus"
- Describe lighting conditions in photographic terms (golden hour, rim lighting, motivated lighting)
- Include subtle motion details — Veo handles nuanced micro-movements well
- Avoid overly complex multi-character interactions in a single shot`;
  }
  if (m.includes('wan')) {
    return `\n\nMODEL-SPECIFIC OPTIMIZATION (Wan):
- Keep prompts concise and action-focused
- Wan works best with clear single-subject actions
- Describe the primary motion explicitly
- Simple, direct scene descriptions outperform complex narratives`;
  }
  return '';
}

function getSystemPrompt(tool, targetModel) {
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

  if (tool === 'jumpstart') {
    return `You are an expert AI video prompt engineer. Your job is to take structured creative inputs and produce a single, cohesive, highly detailed prompt for an AI video generator.

Rules:
- Output ONLY the prompt text — no preamble, no explanation, no quotes
- Weave all elements together naturally into flowing, cinematic descriptive text
- Describe the SCENE: environment, characters, action, movement, lighting, atmosphere
- Describe the CAMERA: movement, angle, framing, transitions
- Describe the MOOD: emotional tone, pacing, energy
- Be extremely specific with visual details (colors, materials, lighting, composition)
- The prompt describes what happens to the START IMAGE — the AI will animate it
- If a visual style is provided, apply that aesthetic to every visual detail
- If a video/motion style direction is provided, integrate its cinematography naturally
- Do NOT use copyrighted brand names (Pixar, Disney, DreamWorks, Cocomelon, Studio Ghibli, etc.) — describe the visual style characteristics instead
- Keep the prompt under 200 words — concise but vivid
- Do NOT include any "AVOID:" or negative prompt section — video models handle negatives separately
- Focus entirely on what the scene SHOULD look like and how it should MOVE${getModelGuidance(targetModel)}`;
  }

  if (tool === 'shorts') {
    let modeInstructions = '';
    if (previousSceneAnalysis && continuityMode === 'continuous') {
      modeInstructions = `
CONTINUOUS MODE — FULL VISUAL CONTINUITY:
- The previous scene analysis describes what the last frame looked like
- Maintain visual continuity: same environment, same lighting direction, same color temperature, same characters in consistent appearance
- The current scene's visual prompt tells you WHAT HAPPENS NEXT in the same visual space
- Think of it as the next shot in a continuous camera movement`;
    } else if (previousSceneAnalysis && continuityMode === 'exciting') {
      modeInstructions = `
EXCITING MODE — FRESH COMPOSITION, CONSISTENT CHARACTERS:
- Generate a completely fresh image — new composition, new environment, new angle
- The ONLY thing to carry from the previous scene analysis is CHARACTER APPEARANCE — if the same person appears, they must look the same (same clothing, hair, build, skin tone, etc.)
- Everything else (background, lighting, color grade, framing) should be driven entirely by the current scene's visual prompt and the global visual style`;
    }

    return `You are an expert AI image prompt engineer specializing in short-form video scene imagery. Your job is to take structured creative inputs and produce a single, cohesive, highly detailed prompt for generating a STARTING IMAGE for a 3-8 second video scene.

CRITICAL — CHARACTER REFERENCE BLOCKS:
If the visual description contains a character reference block in the format [role: physical description], you MUST preserve that block EXACTLY as written in your output prompt. Do not paraphrase, summarize, or rephrase character descriptions — identical wording across scenes is what produces consistent characters in AI image generation. Enhance the scene composition, lighting, and style AROUND the character block, but treat the character description itself as IMMUTABLE.

Rules:
- Output ONLY the prompt text — no preamble, no explanation, no quotes
- Weave all elements together naturally into flowing descriptive text
- The visual prompt's PRIMARY SUBJECT must depict what the voiceover is saying — not just the mood or vibe
- This image will be animated into a video clip — describe a SINGLE MOMENT, not a sequence
- Be extremely specific with visual details: colors, materials, lighting temperature, composition, depth of field
- Camera direction is provided — integrate it naturally (lens, angle, movement starting point, lighting setup)
${modeInstructions}
${previousSceneAnalysis ? `- PREVIOUS SCENE ANALYSIS is provided — use it for continuity as described above
  - ADVANCE the narrative — don't repeat what was in the previous scene, show the NEXT moment
  - Use specific details from the analysis (character positions, props, environment state)` : ''}
- If a brand style guide is provided, align visual elements with brand colors, preferred elements, and composition style
- If a visual style preset is provided, apply that aesthetic to every visual detail
- Do NOT use copyrighted brand names (Pixar, Disney, DreamWorks, etc.) — describe visual characteristics instead
- Keep the prompt under 200 words — concise but vivid
- Do NOT include any "AVOID:" or negative prompt section
- The image should feel like a single frame from a professionally shot short-form video${getModelGuidance(targetModel)}`;
  }

  if (tool === 'storyboard') {
    return `You are an expert AI video prompt engineer. Your job is to take structured creative inputs and produce a single, cohesive, highly detailed prompt for an AI video generator (Google Veo 3.1).

Rules:
- Output ONLY the prompt text — no preamble, no explanation, no quotes
- Weave all elements together naturally into flowing, cinematic descriptive text
- Describe the SCENE: environment, characters, action, movement, lighting, atmosphere
- Describe the CAMERA: movement, angle, framing, transitions
- Describe the MOOD: emotional tone, pacing, energy
- Be extremely specific with visual details (colors, materials, lighting, composition)
- Do NOT use copyrighted brand names (Pixar, Disney, DreamWorks, Cocomelon, Sarah and Duck, Bluey, Peppa Pig, Paw Patrol, Studio Ghibli, Nickelodeon, etc.) — describe the visual style characteristics instead (e.g., "soft watercolor 2D animation" not "Sarah and Duck style")
- Keep the prompt under 300 words — concise but vivid
- If a video style direction is provided, integrate its cinematography naturally
- Do NOT include any "AVOID:" or negative prompt section — video models handle negatives separately
- Focus entirely on what the scene SHOULD look like, not what to avoid${getModelGuidance(targetModel)}`;
  }

  return base; // imagineer default
}
