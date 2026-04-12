/**
 * Script Generator — backward-compat wrapper + topic generator.
 *
 * generateScript() now delegates to narrativeGenerator (Stage 1 of the V3 pipeline).
 * generateTopics() is unchanged.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';
import { generateNarrative } from './narrativeGenerator.js';

/**
 * Backward-compat wrapper — calls narrativeGenerator and maps output to old format.
 * Used by: api/campaigns/preview-script.js
 */
export async function generateScript({ niche, topic, nicheTemplate, keys, brandUsername, storyContext, creativeMode, visualDirections, targetDurationSeconds, framework, frameworkGuidance, lockedDurations = null, frameChain = true }) {
  const narrative = await generateNarrative({
    niche, topic, nicheTemplate, framework,
    frameworkGuidance,
    targetDurationSeconds, storyContext, creativeMode,
    keys, brandUsername,
  });

  // Map narrative output to old ShortsScriptSchema format
  return {
    title: narrative.title,
    description: narrative.description,
    hashtags: narrative.hashtags,
    narration_full: narrative.narration_full,
    scenes: narrative.scenes.map(s => ({
      role: s.scene_label || 'scene',
      narration_segment: s.narration_segment,
      visual_prompt: '',  // Not generated in Stage 1 — preview-script only needs narration
      motion_prompt: '',
      duration_seconds: s.duration_seconds,
      overlay_text: s.overlay_text,
      scene_label: s.scene_label,
    })),
    music_mood: narrative.music_mood,
    scene_1_image_description: '',  // Not generated in Stage 1
  };
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
