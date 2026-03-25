/**
 * Script Generator — GPT-powered topic-to-narration script for faceless shorts.
 *
 * Takes a niche + optional topic and generates a complete narrated script
 * with per-scene breakdown, visual prompts, and motion prompts.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';

// ── Zod schema for structured script output ──────────────────────────────────

const ScriptSceneSchema = z.object({
  role: z.string(),
  narration_segment: z.string().describe('What the voiceover says during this scene (15-25 words)'),
  visual_prompt: z.string().describe('Vivid AI image generation prompt describing exactly what to show'),
  motion_prompt: z.string().describe('Camera movement: slow pan, zoom in, drift left, etc.'),
  duration_seconds: z.number().describe('Target duration matching the template scene'),
  overlay_text: z.string().nullable().describe('On-screen text overlay for this scene (null if none)'),
  scene_label: z.string().nullable().describe('Framework beat name for this scene'),
});

const ShortsScriptSchema = z.object({
  title: z.string().max(100).describe('Attention-grabbing title for the video'),
  description: z.string().max(500).describe('Platform description optimized for search/discovery'),
  hashtags: z.array(z.string()).max(15).describe('Relevant hashtags without # prefix'),
  narration_full: z.string().describe('Complete voiceover text, all scenes concatenated naturally'),
  scenes: z.array(ScriptSceneSchema),
  music_mood: z.string().describe('Background music mood/genre description'),
  scene_1_image_description: z.string().describe('Detailed visual description for generating the Scene 1 image. Describe the specific subject, setting, lighting, color palette, mood, and composition. This will be used as an AI image generation prompt.'),
});

/**
 * Generate a narrated script for a faceless short.
 *
 * @param {object} params
 * @param {string} params.niche - Niche key (e.g. 'ai_tech_news')
 * @param {string} [params.topic] - Optional specific topic (auto-generated if omitted)
 * @param {object} params.nicheTemplate - Template from shortsTemplates.js
 * @param {object} params.keys - { openaiKey }
 * @param {string} [params.brandUsername] - For cost logging
 * @returns {Promise<object>} Parsed ShortsScriptSchema result
 */
export async function generateScript({ niche, topic, nicheTemplate, keys, brandUsername, storyContext, visualDirections, targetDurationSeconds, framework }) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required for script generation');
  if (!nicheTemplate) throw new Error(`No template found for niche "${niche}". Cannot generate script.`);

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  let scenes = nicheTemplate.scenes;
  let effectiveDuration = nicheTemplate.total_duration_seconds;

  // Determine scene count — framework-driven takes priority over legacy mapping
  let targetSceneCount;
  if (framework) {
    const frameworkScenes = framework.sceneStructure[targetDurationSeconds]
      || framework.sceneStructure[framework.supportedDurations[0]];
    targetSceneCount = frameworkScenes.length;
    effectiveDuration = targetDurationSeconds || framework.supportedDurations[0];
    // Build scenes array from framework structure
    scenes = frameworkScenes.map(s => ({
      role: s.label,
      hint: s.beat,
      duration: Math.round((s.durationRange[0] + s.durationRange[1]) / 2),
    }));
  } else if (targetDurationSeconds) {
    // Legacy fallback
    const sceneCounts = { 15: 3, 30: 3, 45: 4, 60: 5, 90: 7 };
    if (sceneCounts[targetDurationSeconds]) {
      targetSceneCount = sceneCounts[targetDurationSeconds];
      effectiveDuration = targetDurationSeconds;
      scenes = nicheTemplate.scenes.slice(0, targetSceneCount);
      const perScene = Math.round(effectiveDuration / targetSceneCount);
      scenes = scenes.map(s => ({ ...s, duration: perScene }));
    }
  }

  const sceneStructure = scenes
    .map((s, i) => `Scene ${i + 1} [${s.role}] (${s.duration}s): ${s.hint}`)
    .join('\n');

  const totalWords = Math.round(effectiveDuration * 2.7); // ~2.7 words/sec for natural speech

  // Build framework-specific prompt block
  let frameworkBlock = '';
  if (framework) {
    const frameworkScenes = framework.sceneStructure[targetDurationSeconds]
      || framework.sceneStructure[framework.supportedDurations[0]];

    const sceneGuide = frameworkScenes.map((s, i) =>
      `Scene ${i + 1} "${s.label}" (${s.durationRange[0]}-${s.durationRange[1]}s): ${s.beat}` +
      (s.overlayText ? ` — overlay text template: ${s.overlayText}` : '')
    ).join('\n');

    frameworkBlock = `

VIDEO STYLE FRAMEWORK: ${framework.name}
Category: ${framework.category === 'story' ? 'Narrative/Story (flowing, connected scenes)' : 'Fast-Paced/List (independent, punchy scenes)'}
TTS Pacing: ${framework.ttsPacing}
Text Overlays: ${framework.textOverlays === 'required' ? 'REQUIRED — each scene MUST have overlay_text' : framework.textOverlays === 'optional' ? 'Optional — add overlay_text where it enhances clarity' : 'None — leave overlay_text null'}
${framework.overlayStyle ? `Overlay Style: ${framework.overlayStyle}` : ''}

SCENE STRUCTURE (follow this exactly):
${sceneGuide}

Write narration that matches this pacing: ${framework.ttsPacing}
${framework.category === 'fast_paced' ? 'Each scene should be self-contained and punchy. No flowery transitions between scenes.' : 'Scenes should flow naturally into each other like a continuous story.'}
- For each scene, set scene_label to the scene label name (e.g. "${frameworkScenes[0]?.label}")
- overlay_text: ${framework.textOverlays === 'required' ? 'REQUIRED for every scene — write concise on-screen text (3-7 words) that reinforces the narration' : framework.textOverlays === 'optional' ? 'Add where it enhances clarity; leave null otherwise' : 'Set to null for all scenes'}`;
  }

  const systemPrompt = `${nicheTemplate.script_system_prompt}

TEMPLATE STRUCTURE (${scenes.length} scenes, ${effectiveDuration}s total):
${sceneStructure}

VOICE PACING: ${framework ? framework.ttsPacing : nicheTemplate.voice_pacing}
${frameworkBlock}

CRITICAL RULES:
- Total narration must be ${totalWords - 15} to ${totalWords + 15} words (for ${effectiveDuration} seconds at natural pace)
- Each scene's narration_segment must match its target duration (~2.7 words per second)
- narration_full = all narration_segments joined naturally (this is what gets spoken)
- visual_prompt: Write vivid, specific AI image prompts (no text overlays, no words in images)
- visual_prompt should describe cinematic scenes, environments, close-ups, or symbolic imagery
- motion_prompt: Subtle camera movements only (slow pan, gentle zoom, drift)
- NEVER include text, words, letters, numbers, or typography in visual_prompts
- Every sentence must earn its place -- zero filler words
- NEVER use emdashes or endashes (no -- or - characters used as dashes). Use commas, periods, or semicolons instead.
- FORBIDDEN cliche phrases (never use these): "buckle up", "let's dive in", "here's the thing", "what if I told you", "game-changer", "mind-blowing", "insane", "literally", "absolutely", "at the end of the day"
- Write like a sharp, knowledgeable creator talking to a friend. Be specific, not generic.
- scene_1_image_description: Write a rich, detailed image generation prompt for the first scene. Include specific subject, setting, lighting, color palette, mood, and composition.`;

  const storyContextBlock = storyContext
    ? `\n\nREAL STORY CONTEXT (use this as the basis for the script):\n${storyContext}`
    : '';

  const visualDirectionsBlock = visualDirections && visualDirections.length > 0
    ? `\n\nVISUAL DIRECTIONS (incorporate these into scene visual_prompts):\n${visualDirections.join(', ')}`
    : '';

  const userPrompt = topic
    ? `Create a ${effectiveDuration}-second ${nicheTemplate.name} short about: ${topic}${storyContextBlock}${visualDirectionsBlock}`
    : `Create a ${effectiveDuration}-second ${nicheTemplate.name} short about a trending or fascinating topic in this niche. Pick something specific and surprising.${storyContextBlock}${visualDirectionsBlock}`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(ShortsScriptSchema, 'shorts_script'),
  });

  const script = completion.choices[0].message.parsed;

  // Log cost
  if (completion.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_script_generation',
      model: 'gpt-5-mini',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  console.log(`[scriptGenerator] Script generated: "${script.title}" — ${script.narration_full.split(/\s+/).length} words, ${script.scenes.length} scenes`);

  return script;
}

/**
 * Generate a batch of topic ideas for a niche.
 *
 * @param {object} params
 * @param {string} params.niche - Niche key
 * @param {string} params.nicheName - Human-readable niche name
 * @param {number} [params.count=10] - Number of topics
 * @param {string[]} [params.excludeTopics=[]] - Topics to avoid duplicating
 * @param {object} params.keys - { openaiKey }
 * @param {string} [params.brandUsername] - For cost logging
 * @returns {Promise<Array<{ title: string, hook_idea: string }>>}
 */
export async function generateTopics({ niche, nicheName, count = 10, excludeTopics = [], keys, brandUsername }) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required');

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const TopicsSchema = z.object({
    topics: z.array(z.object({
      title: z.string().describe('Specific, compelling topic title'),
      hook_idea: z.string().describe('Opening hook line that would stop the scroll'),
    })),
  });

  const excludeBlock = excludeTopics.length > 0
    ? `\nAVOID these already-used topics:\n${excludeTopics.map(t => `- ${t}`).join('\n')}`
    : '';

  const completion = await openai.chat.completions.parse({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: `Generate ${count} unique, viral-worthy topic ideas for ${nicheName} short-form video content.

Each topic must be:
- SPECIFIC (not vague like "money tips" — instead "Why keeping $1000 in savings is actually losing you money")
- ATTENTION-GRABBING (would make someone stop scrolling)
- STORY-CAPABLE (can be told in 60 seconds with a narrative arc)
- UNIQUE (not overdone trending topics everyone's already seen)
${excludeBlock}`,
      },
    ],
    response_format: zodResponseFormat(TopicsSchema, 'topics'),
    temperature: 1.0, // Maximum creativity for diverse topics
  });

  const result = completion.choices[0].message.parsed;

  if (completion.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_topic_generation',
      model: 'gpt-5-mini',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  return result.topics;
}
