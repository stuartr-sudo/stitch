/**
 * Topic Discovery — research-powered topic suggestions with dual-axis scoring.
 *
 * Input: niche + framework → Output: ranked topics with trending + competition scores.
 * Process: SearchAPI web search (4 queries/niche) → LLM synthesis with scoring.
 * Graceful fallback to GPT-only mode if no SearchAPI key or search fails.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';

// ── Niche → 4 search queries (breaking, viral, controversy, human impact) ────
// NOTE: currentYear is computed per-call (not module-level) to avoid stale cache after year rollover
function getNicheSearchQueries() {
  const currentYear = new Date().getFullYear();
  return {
  ai_tech_news: [`AI breakthrough news this week ${currentYear}`, 'AI surprising development most people don\'t know', `AI controversy debate ${currentYear}`, 'AI changing everyday life real story'],
  finance_money: [`stock market news this week ${currentYear}`, 'money fact most people get wrong', `financial controversy scandal ${currentYear}`, 'money changing someone\'s life real story'],
  motivation: [`motivational comeback story ${currentYear}`, 'self improvement secret most people miss', `motivation debate hustle culture ${currentYear}`, 'life transformation real story inspiring'],
  horror_creepy: [`creepy unexplained event ${currentYear}`, 'scariest true story nobody talks about', `paranormal controversy evidence ${currentYear}`, 'terrifying experience real person story'],
  history_era: [`history discovery new finding ${currentYear}`, 'bizarre history fact nobody knows', `historical controversy revisionist ${currentYear}`, 'history changed someone life real story'],
  crime_mystery: [`unsolved crime breakthrough ${currentYear}`, 'true crime case most people never heard of', `criminal justice controversy ${currentYear}`, 'crime victim survivor real story'],
  science_nature: [`science discovery breakthrough ${currentYear}`, 'science fact that sounds fake but is real', `scientific controversy debate ${currentYear}`, 'nature phenomenon affecting real people'],
  dating_relationships: [`relationship trend ${currentYear}`, 'dating psychology fact most people get wrong', `relationship controversy debate ${currentYear}`, 'love story extraordinary real couple'],
  fitness_health: [`health discovery study ${currentYear}`, 'fitness myth debunked surprising', `health controversy diet ${currentYear}`, 'health transformation real person story'],
  gaming: [`gaming news this week ${currentYear}`, 'video game secret nobody found', `gaming controversy drama ${currentYear}`, 'gaming changed someone life real story'],
  conspiracy: [`declassified government secret ${currentYear}`, 'conspiracy theory that turned out true', `conspiracy controversy evidence ${currentYear}`, 'unexplained event witnessed real people'],
  business_startup: [`startup news funding ${currentYear}`, 'business strategy nobody talks about', `business scandal controversy ${currentYear}`, 'entrepreneur success story unexpected'],
  food_cooking: [`food trend ${currentYear}`, 'food science fact most people don\'t know', `food industry controversy scandal ${currentYear}`, 'cooking changed someone life real story'],
  travel: [`travel destination trending ${currentYear}`, 'travel secret hidden gem nobody visits', `tourism controversy overtourism ${currentYear}`, 'travel experience life changing real story'],
  psychology: [`psychology study finding ${currentYear}`, 'human behavior fact most people get wrong', `psychology controversy debate ${currentYear}`, 'psychology insight changed real person life'],
  space_cosmos: [`space discovery NASA ${currentYear}`, 'cosmic mystery scientists can\'t explain', `space exploration controversy ${currentYear}`, 'space event affecting earth real impact'],
  animals_nature: [`animal discovery species ${currentYear}`, 'animal ability superpower nobody knows about', `wildlife conservation controversy ${currentYear}`, 'animal rescued saved real story'],
  sports: [`sports news this week ${currentYear}`, 'sports record statistic most people don\'t know', `sports controversy scandal ${currentYear}`, 'athlete comeback against all odds real story'],
  education: [`education change policy ${currentYear}`, 'school fact most people get wrong', `education system controversy ${currentYear}`, 'education changed someone life real story'],
    paranormal_ufo: [`UFO sighting report ${currentYear}`, 'paranormal event documented evidence nobody talks about', `UFO disclosure controversy ${currentYear}`, 'paranormal experience real person testimony'],
  };
}

// ── Schema ───────────────────────────────────────────────────────────────────
const TopicDiscoverySchema = z.object({
  topics: z.array(z.object({
    title: z.string().describe('Compelling, click-worthy title for a 60-second short'),
    summary: z.string().describe('1-2 sentence summary of the story'),
    angle: z.string().describe('The specific hook or angle for a short-form video'),
    why_viral: z.string().describe('Why this topic will perform well on shorts platforms'),
    story_context: z.string().describe('Detailed paragraph with all key facts, names, dates — enough for a script writer to work from without additional research'),
    trending_score: z.enum(['high', 'medium', 'low']).describe('How trending: high=last 48hrs major outlets, medium=this week, low=older/niche'),
    competition_score: z.enum(['high', 'medium', 'low']).describe('Content saturation: high=widely covered on shorts, medium=some coverage, low=under-covered'),
  })),
});

// ── SearchAPI web search ─────────────────────────────────────────────────────
/**
 * Fire all 4 SearchAPI queries for a niche in parallel.
 * Returns condensed article snippets or null on failure.
 */
async function searchNicheArticles(niche) {
  const apiKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
  if (!apiKey) {
    console.log('[topicDiscovery] No SearchAPI key found, falling back to GPT-only');
    return null;
  }

  const queries = getNicheSearchQueries()[niche];
  if (!queries) {
    console.log(`[topicDiscovery] No search queries for niche "${niche}", falling back to GPT-only`);
    return null;
  }

  const results = await Promise.allSettled(
    queries.map(async (q) => {
      const params = new URLSearchParams({
        api_key: apiKey,
        engine: 'google_news',
        q,
        num: '10',
        tbs: 'qdr:w',
      });
      const resp = await fetch(`https://www.searchapi.io/api/v1/search?${params}`);
      if (!resp.ok) {
        console.log(`[topicDiscovery] SearchAPI ${resp.status} for query: ${q}`);
        return [];
      }
      const data = await resp.json();
      // Extract organic/news results
      const articles = (data.organic_results || data.news_results || []).slice(0, 10);
      return articles.map(a => ({
        title: a.title || '',
        snippet: a.snippet || a.description || '',
        source: a.source || a.displayed_link || '',
        date: a.date || '',
      }));
    })
  );

  // Flatten fulfilled results
  const allArticles = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(a => a.title); // skip empty

  if (allArticles.length === 0) {
    console.log('[topicDiscovery] SearchAPI returned no usable articles, falling back to GPT-only');
    return null;
  }

  console.log(`[topicDiscovery] SearchAPI returned ${allArticles.length} articles across ${results.filter(r => r.status === 'fulfilled').length}/4 queries`);
  return allArticles;
}

// ── Composite score for sorting ──────────────────────────────────────────────
function compositeScore(topic) {
  const trendingWeight = { high: 3, medium: 2, low: 1 };
  const competitionWeight = { high: 1, medium: 2, low: 3 }; // low competition = better
  return (trendingWeight[topic.trending_score] || 1) + (competitionWeight[topic.competition_score] || 1);
}

// ── Main function ────────────────────────────────────────────────────────────
/**
 * Discover trending topics and generate ranked suggestions with dual-axis scoring.
 *
 * @param {object} params
 * @param {string} params.niche - Niche key
 * @param {object} [params.framework] - Framework object (for hook pattern guidance)
 * @param {number} [params.count=5] - Number of suggestions
 * @param {string[]} [params.excludeTopics=[]] - Topics to avoid
 * @param {object} params.keys - { openaiKey }
 * @param {string} [params.brandUsername] - For cost logging
 * @returns {Promise<{ topics: Array, source: string, queryCount: number }>}
 */
export async function discoverTopics({
  niche,
  framework,
  count = 5,
  excludeTopics = [],
  keys,
  brandUsername,
}) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required for topic discovery');

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  // ── Step 1: Web search for real articles ─────────────────────────────────
  const articles = await searchNicheArticles(niche);
  const hasArticles = articles && articles.length > 0;
  const queryCount = hasArticles ? (getNicheSearchQueries()[niche]?.length || 0) : 0;

  // ── Step 2: Build prompt based on mode ───────────────────────────────────
  const hookPattern = framework?.narrative?.hookPattern || 'mystery-reveal';
  const hookExamples = framework?.narrative?.hookExamples || framework?.hookExamples || [];

  const excludeBlock = excludeTopics.length > 0
    ? `\nAVOID these already-used topics:\n${excludeTopics.map(t => `- ${t}`).join('\n')}`
    : '';

  let articlesBlock = '';
  if (hasArticles) {
    // Condense articles into a reference block for the LLM
    const articleSummaries = articles.slice(0, 30).map((a, i) =>
      `${i + 1}. "${a.title}" — ${a.snippet}${a.source ? ` (${a.source})` : ''}${a.date ? ` [${a.date}]` : ''}`
    ).join('\n');
    articlesBlock = `\nREAL ARTICLES FROM WEB SEARCH (use these as source material — cite real facts, names, dates):\n${articleSummaries}\n\nYou MUST ground your topics in these real articles. Extract specific facts, names, and events. Do not invent stories.`;
  }

  const today = new Date().toISOString().split('T')[0];
  const systemPrompt = `You are a viral content researcher specializing in short-form video. Today's date is ${today}. Generate ${count} specific, research-backed topic suggestions for ${niche} content.

HOOK PATTERN: ${hookPattern}
${hookExamples.length > 0 ? `HOOK EXAMPLES (match this style):\n${hookExamples.map(h => `  - "${h}"`).join('\n')}` : ''}
${articlesBlock}

Each topic must be:
1. SPECIFIC — not vague like "money tips". Instead: "Why keeping $1000 in savings is actually losing you $47/year to inflation"
2. HOOK-FIRST — the title must create an information gap that makes viewers NEED to know
3. VERIFIABLE — based on real facts, events, or phenomena${hasArticles ? ' from the provided articles' : ''}
4. STORY-CAPABLE — can be told in 30-90 seconds with a clear narrative arc
5. FRESH — not the same overused topics everyone has already covered

SCORING GUIDELINES:
- trending_score: "high" = breaking in last 48 hours across major outlets, "medium" = trending this week or recurring interest, "low" = older, evergreen, or niche
- competition_score: "high" = widely covered on TikTok/YouTube Shorts/Reels already, "medium" = some creators have covered it, "low" = under-covered opportunity

story_context must contain ALL facts needed to write a script — names, dates, statistics, outcomes. A script writer should be able to work from this alone.
${excludeBlock}`;

  // ── Step 3: LLM call ─────────────────────────────────────────────────────
  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} viral topic suggestions for ${niche} short-form video content.${hasArticles ? ' Base your suggestions on the real articles provided.' : ''}` },
    ],
    response_format: zodResponseFormat(TopicDiscoverySchema, 'topic_discovery'),
    temperature: 1.0, // High creativity for diverse suggestions
  });

  const result = completion.choices[0].message.parsed;

  if (completion.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_topic_discovery',
      model: 'gpt-4.1-mini-2025-04-14',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  // ── Step 4: Sort by composite score (high trending + low competition first) ──
  const sorted = result.topics.sort((a, b) => compositeScore(b) - compositeScore(a));

  const source = hasArticles ? 'searchapi_plus_gpt' : 'gpt_only';
  const highTrending = sorted.filter(t => t.trending_score === 'high').length;
  const lowComp = sorted.filter(t => t.competition_score === 'low').length;
  console.log(`[topicDiscovery] Generated ${sorted.length} topics for ${niche} (${source}, ${highTrending} high-trending, ${lowComp} low-competition)`);

  return { topics: sorted, source, queryCount };
}
