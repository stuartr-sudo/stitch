/**
 * POST /api/workbench/generate-ideas
 *
 * AI-powered bulk idea generator — creates 10-20 video concepts for a given niche.
 * Each idea has a title, hook, angle, category, and ready-to-use topic string.
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { SHORTS_TEMPLATES } from '../lib/shortsTemplates.js';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

const IdeaSchema = z.object({
  ideas: z.array(z.object({
    title: z.string().describe('Compelling video title (under 60 chars)'),
    hook: z.string().describe('Opening hook line that grabs attention'),
    angle: z.string().describe('Unique angle or perspective'),
    topic: z.string().describe('Full topic string to pass to script generator'),
    category: z.string().describe('Topic category from the niche funnel'),
  }))
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, count = 10, context } = req.body;
  if (!niche) return res.status(400).json({ error: 'niche is required' });

  const template = SHORTS_TEMPLATES[niche];
  if (!template) return res.status(400).json({ error: `Unknown niche: ${niche}` });

  const clampedCount = Math.max(5, Math.min(20, count));

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured' });

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  // Build example topics from SHORTS_TEMPLATES niche context
  const nicheSceneHints = template.scenes.map(s => s.hint).join('; ');

  const systemPrompt = `You are a viral video content strategist specializing in ${template.name} short-form videos (YouTube Shorts, TikTok, Reels).

Niche context: ${template.description}
Scene structure hints: ${nicheSceneHints}
Voice/tone: ${template.voice_pacing}
Visual mood: ${template.visual_mood}

Generate ${clampedCount} unique, high-potential video ideas for this niche. Each idea should:
- Have a compelling, specific title (not generic — include numbers, names, or surprising claims)
- Start with a hook that creates an information gap or emotional reaction
- Offer a unique angle that differentiates from typical content in this space
- Include a ready-to-use topic string that combines category + angle + hook direction
- Be categorized into a relevant topic area

Focus on ideas that:
- Would stop a viewer mid-scroll
- Have debate/comment potential
- Cover timely or evergreen high-interest subjects
- Vary in approach (mix of stats, stories, controversies, how-tos, predictions)

${context ? `Additional context from the creator: ${context}` : ''}

Do NOT use clichés like "you won't believe", "mind-blowing", "game-changer", "buckle up", or "what if I told you".`;

  try {
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate ${clampedCount} viral video ideas for the ${template.name} niche.` },
      ],
      response_format: zodResponseFormat(IdeaSchema, 'video_ideas'),
      temperature: 0.9,
    });

    const result = completion.choices[0].message.parsed;
    return res.json({ ideas: result.ideas });
  } catch (err) {
    console.error('[generate-ideas] OpenAI error:', err.message);
    return res.status(500).json({ error: 'Failed to generate ideas' });
  }
}
