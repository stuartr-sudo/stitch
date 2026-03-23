/**
 * POST /api/shorts/research
 *
 * Find real trending stories for a given niche using SearchAPI (Google News)
 * then structure them with GPT for the shorts pipeline.
 *
 * Flow: SearchAPI (real-time news) → GPT (structure & angle) → response
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

// Search queries per niche for finding trending stories
const currentYear = new Date().getFullYear();
const NICHE_SEARCH_QUERIES = {
  ai_tech_news: ['AI breakthrough news today', `new AI technology ${currentYear}`, 'artificial intelligence latest developments'],
  finance_money: ['stock market surprising news', 'money saving strategy viral', 'finance news unexpected'],
  motivation_self_help: ['incredible comeback story', 'against all odds success story', 'inspirational true story viral'],
  scary_horror: ['unexplained mystery real', 'creepy true story', 'paranormal event documented'],
  history_did_you_know: ['bizarre history fact', 'historical event most people dont know', 'strange true history'],
  true_crime: ['unsolved mystery case', 'true crime shocking twist', 'cold case breakthrough'],
  science_nature: ['mind-blowing science discovery', 'nature phenomenon unexplained', 'scientific breakthrough surprising'],
  relationships_dating: ['relationship psychology study', 'dating trend research', 'love story extraordinary'],
  health_fitness: ['health myth debunked study', 'fitness discovery surprising', 'nutrition science new finding'],
  gaming_popculture: ['gaming easter egg discovered', 'pop culture hidden detail', 'video game secret revealed'],
  conspiracy_mystery: ['conspiracy theory evidence', 'government secret declassified', 'unexplained phenomenon recent'],
  business_entrepreneur: ['startup story unexpected', 'business strategy unconventional success', 'entrepreneur breakthrough story'],
};

async function searchRealStories(niche, nicheName, topic) {
  const searchApiKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
  if (!searchApiKey) {
    console.warn('[shorts/research] No SEARCHAPI_KEY or SERP_API_KEY — falling back to GPT-only');
    return null;
  }

  // If user provided a specific topic, use it directly as the search query
  // The topic comes in as "Category — Angle — Hook" from the 3-level funnel
  let query;
  if (topic && topic.trim()) {
    // Strip the " — " separators and build a focused search query
    const topicParts = topic.split(/\s*—\s*/).filter(Boolean);
    query = topicParts.join(' ') + ' news';
  } else {
    const queries = NICHE_SEARCH_QUERIES[niche] || [`${nicheName} trending story`, `${nicheName} viral news`];
    query = queries[Math.floor(Math.random() * queries.length)];
  }

  try {
    const url = new URL('https://www.searchapi.io/api/v1/search');
    url.searchParams.set('api_key', searchApiKey);
    url.searchParams.set('engine', 'google_news');
    url.searchParams.set('q', query);
    url.searchParams.set('num', '10');

    console.log(`[shorts/research] SearchAPI query: "${query}"`);

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text();
      console.warn(`[shorts/research] SearchAPI returned ${response.status}: ${text.slice(0, 200)}`);
      return null;
    }

    const data = await response.json();
    const articles = data.news_results || data.organic_results || [];

    if (articles.length === 0) {
      console.warn('[shorts/research] SearchAPI returned no results');
      return null;
    }

    // Extract clean article summaries for GPT
    return articles.slice(0, 8).map(a => ({
      title: a.title || '',
      snippet: a.snippet || a.description || '',
      source: a.source?.name || a.source || '',
      link: a.link || '',
      date: a.date || a.published_date || '',
    })).filter(a => a.title);
  } catch (err) {
    console.warn('[shorts/research] SearchAPI fetch failed:', err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, topic, brand_username, count = 5 } = req.body;

  if (!niche) {
    return res.status(400).json({ error: 'Missing niche' });
  }

  const nicheTemplate = getShortsTemplate(niche);
  if (!nicheTemplate) {
    return res.status(400).json({ error: `Unknown niche: ${niche}` });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const userId = brand_username
    ? await resolveUserIdFromBrand(brand_username, supabase, req.user?.id)
    : req.user?.id;
  if (!userId) return res.status(404).json({ error: 'User not found' });

  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('openai_key')
    .eq('user_id', userId)
    .maybeSingle();

  const openaiKey = userKeys?.openai_key || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    // Step 1: Search for real trending stories via SearchAPI
    const realArticles = await searchRealStories(niche, nicheTemplate.name, topic);
    const hasRealArticles = realArticles && realArticles.length > 0;

    // Step 2: Use GPT to structure stories (with real articles as context if available)
    // Build a topic focus instruction if the user selected specific topics
    const topicFocus = topic && topic.trim()
      ? `\n\nIMPORTANT: The user specifically wants stories about "${topic.replace(/\s*—\s*/g, ' → ')}". Every story MUST be directly related to this topic. Do NOT return generic ${nicheTemplate.name} stories — stay tightly focused on the user's chosen topic.`
      : '';

    const systemPrompt = hasRealArticles
      ? `You are a viral content researcher for ${nicheTemplate.name} short-form videos.

You have been given REAL trending news articles. Your job is to pick the ${count} most compelling ones and transform them into viral short-form video concepts.

For each story:
- Use the REAL facts from the articles — do NOT make up information
- Find the most surprising or counterintuitive angle
- The story_context field should include all key facts, names, dates from the article
- Make the title punchy and click-worthy for 60-second vertical videos${topicFocus}`
      : `You are a viral content researcher finding compelling story ideas for ${nicheTemplate.name} short-form videos.

Your job is to surface specific, real stories that would make excellent 60-second vertical videos.
Focus on: historical events, documented cases, real people, verifiable facts, and well-known narratives.

For each story:
- Be SPECIFIC: real names, dates, places — not "a man in the 1980s"
- Pick stories with a clear narrative arc: setup → conflict → resolution
- Prioritize counterintuitive angles: the thing most people don't know
- The story_context field should be rich enough that a script writer could use it without any additional research${topicFocus}`;

    const topicClause = topic && topic.trim()
      ? ` specifically about "${topic.replace(/\s*—\s*/g, ' → ')}"`
      : '';

    const userPrompt = hasRealArticles
      ? `Here are real trending articles in the ${nicheTemplate.name} space:

${realArticles.map((a, i) => `${i + 1}. "${a.title}" (${a.source}, ${a.date})\n   ${a.snippet}`).join('\n\n')}

Transform the ${count} best stories into viral short-form video concepts${topicClause}. Each should work as a self-contained 60-second video with a clear hook, narrative arc, and surprising element.${topicClause ? ' Discard any articles that are not related to the topic.' : ''}`
      : `Find ${count} compelling story ideas for a ${nicheTemplate.name} short-form video channel${topicClause}.

Each story should be:
- Self-contained in 60 seconds
- Based on real events or well-documented cases
- Have a surprising or counterintuitive element${topicClause ? `\n- Directly related to ${topic.replace(/\s*—\s*/g, ' / ')}` : `\n- Relevant to the ${nicheTemplate.name} niche`}

Provide rich story_context for each so a script writer has all the facts they need.`;

    console.log(`[shorts/research] Generating ${count} stories for topic="${topic || '(none)'}" (real articles: ${hasRealArticles ? realArticles.length : 'none'})`);

    const completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(StorySchema, 'story_ideas'),
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

    return res.json({
      stories: result.stories,
      niche,
      source: hasRealArticles ? 'searchapi_plus_gpt' : 'gpt_only',
    });
  } catch (err) {
    console.error('[shorts/research] Error:', err);
    return res.status(500).json({ error: err.message || 'Story research failed' });
  }
}
