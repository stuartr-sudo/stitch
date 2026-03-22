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
});

const ShortsScriptSchema = z.object({
  title: z.string().max(100).describe('Attention-grabbing title for the video'),
  description: z.string().max(500).describe('Platform description optimized for search/discovery'),
  hashtags: z.array(z.string()).max(15).describe('Relevant hashtags without # prefix'),
  narration_full: z.string().describe('Complete voiceover text, all scenes concatenated naturally'),
  scenes: z.array(ScriptSceneSchema),
  music_mood: z.string().describe('Background music mood/genre description'),
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
export async function generateScript({ niche, topic, nicheTemplate, keys, brandUsername, storyContext }) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required for script generation');

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const sceneStructure = nicheTemplate.scenes
    .map((s, i) => `Scene ${i + 1} [${s.role}] (${s.duration}s): ${s.hint}`)
    .join('\n');

  const totalWords = Math.round(nicheTemplate.total_duration_seconds * 2.7); // ~2.7 words/sec for natural speech

  const systemPrompt = `${nicheTemplate.script_system_prompt}

TEMPLATE STRUCTURE (${nicheTemplate.scenes.length} scenes, ${nicheTemplate.total_duration_seconds}s total):
${sceneStructure}

VOICE PACING: ${nicheTemplate.voice_pacing}

CRITICAL RULES:
- Total narration must be ${totalWords - 15} to ${totalWords + 15} words (for ${nicheTemplate.total_duration_seconds} seconds at natural pace)
- Each scene's narration_segment must match its target duration (~2.7 words per second)
- narration_full = all narration_segments joined naturally (this is what gets spoken)
- visual_prompt: Write vivid, specific AI image prompts (no text overlays, no words in images)
- visual_prompt should describe cinematic scenes, environments, close-ups, or symbolic imagery
- motion_prompt: Subtle camera movements only (slow pan, gentle zoom, drift)
- NEVER include text, words, letters, numbers, or typography in visual_prompts
- Every sentence must earn its place — zero filler words`;

  const storyContextBlock = storyContext
    ? `\n\nREAL STORY CONTEXT (use this as the basis for the script):\n${storyContext}`
    : '';

  const userPrompt = topic
    ? `Create a ${nicheTemplate.total_duration_seconds}-second ${nicheTemplate.name} short about: ${topic}${storyContextBlock}`
    : `Create a ${nicheTemplate.total_duration_seconds}-second ${nicheTemplate.name} short about a trending or fascinating topic in this niche. Pick something specific and surprising.${storyContextBlock}`;

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
