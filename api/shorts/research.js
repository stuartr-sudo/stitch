/**
 * POST /api/shorts/research
 *
 * Find story ideas for a given niche using OpenAI's training data.
 *
 * NOTE: GPT does not have real-time web access, so stories come from training data.
 * TODO: Integrate Tavily (https://tavily.com) for real-time story sourcing.
 *       Tavily provides a search API designed for LLM agents that returns
 *       clean, structured news/article content. Replace the GPT-only approach
 *       below with a Tavily search → GPT summarization pipeline for
 *       genuinely current stories.
 *
 * Body: {
 *   niche: string,
 *   brand_username: string,
 *   count?: number,         // number of story ideas (default: 5)
 * }
 *
 * Response: { stories: Array<{ title, summary, angle, why_viral, story_context }> }
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getShortsTemplate } from '../lib/shortsTemplates.js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';
import { logCost } from '../lib/costLogger.js';

const StorySchema = z.object({
  stories: z.array(z.object({
    title: z.string().describe('Compelling story title for this piece of content'),
    summary: z.string().describe('2-3 sentence summary of the story or event'),
    angle: z.string().describe('The specific angle or hook for a short-form video'),
    why_viral: z.string().describe('Why this story will perform well on shorts platforms'),
    story_context: z.string().describe('Detailed context paragraph that can be passed to the script generator — include all key facts, names, dates, and the narrative arc'),
  })),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, brand_username, count = 5 } = req.body;

  if (!brand_username || !niche) {
    return res.status(400).json({ error: 'Missing niche or brand_username' });
  }

  const nicheTemplate = getShortsTemplate(niche);
  if (!nicheTemplate) {
    return res.status(400).json({ error: `Unknown niche: ${niche}` });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const userId = await resolveUserIdFromBrand(brand_username, supabase, req.user?.id);
  if (!userId) return res.status(404).json({ error: 'Brand not found' });

  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('openai_key')
    .eq('user_id', userId)
    .maybeSingle();

  const openaiKey = userKeys?.openai_key || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    const completion = await openai.chat.completions.parse({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are a viral content researcher finding compelling story ideas for ${nicheTemplate.name} short-form videos.

Your job is to surface specific, real-feeling stories that would make excellent 60-second vertical videos.
Focus on: historical events, documented cases, real people, verifiable facts, and well-known narratives.

For each story:
- Be SPECIFIC: real names, dates, places — not "a man in the 1980s"
- Pick stories with a clear narrative arc: setup → conflict → resolution
- Prioritize counterintuitive angles: the thing most people don't know
- The story_context field should be rich enough that a script writer could use it without any additional research`,
        },
        {
          role: 'user',
          content: `Find ${count} compelling story ideas for a ${nicheTemplate.name} short-form video channel.

Each story should be:
- Self-contained in 60 seconds
- Based on real events or well-documented cases
- Have a surprising or counterintuitive element
- Relevant to the ${nicheTemplate.name} niche

Provide rich story_context for each so a script writer has all the facts they need.`,
        },
      ],
      response_format: zodResponseFormat(StorySchema, 'story_ideas'),
      temperature: 0.9,
    });

    const result = completion.choices[0].message.parsed;

    if (completion.usage && brand_username) {
      logCost({
        username: brand_username,
        category: 'openai',
        operation: 'shorts_story_research',
        model: 'gpt-5-mini',
        input_tokens: completion.usage.prompt_tokens,
        output_tokens: completion.usage.completion_tokens,
      });
    }

    return res.json({ stories: result.stories, niche });
  } catch (err) {
    console.error('[shorts/research] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
