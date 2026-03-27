/**
 * Topic Discovery — research-powered hook suggestions.
 *
 * Input: niche + framework → Output: ranked hook suggestions with source URLs.
 * Process: web search for trending content → LLM synthesis with framework hook pattern.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';

// Niche → search query mapping for web research
const NICHE_SEARCH_QUERIES = {
  ai_tech_news: ['latest AI breakthroughs 2026', 'trending AI tools this week', 'AI news reddit'],
  finance_money: ['personal finance trending topics', 'money mistakes reddit', 'stock market news today'],
  motivation: ['motivational stories trending', 'self improvement reddit', 'life changing moments'],
  horror_creepy: ['creepiest true stories', 'unexplained mysteries reddit', 'scariest places on earth'],
  history_era: ['history facts nobody knows', 'forgotten history reddit', 'historical mysteries unsolved'],
  crime_mystery: ['unsolved crimes trending', 'true crime stories reddit', 'cold case breakthroughs'],
  science_nature: ['science discoveries this week', 'nature facts mind blowing', 'science reddit TIL'],
  dating_relationships: ['dating advice trending', 'relationship psychology reddit', 'attachment theory'],
  fitness_health: ['fitness myths debunked', 'health hacks reddit', 'workout science new research'],
  gaming: ['gaming lore hidden details', 'easter eggs reddit gaming', 'game theory trending'],
  conspiracy: ['conspiracy theories evidence', 'unexplained events reddit', 'government secrets declassified'],
  business_startup: ['startup stories viral', 'business breakdown reddit', 'entrepreneur lessons'],
  food_cooking: ['food science facts', 'cooking hacks trending', 'food history reddit'],
  travel: ['hidden travel gems 2026', 'travel hacks reddit', 'most dangerous places to visit'],
  psychology: ['psychology facts trending', 'social experiments reddit', 'cognitive biases'],
  space_cosmos: ['space discoveries 2026', 'cosmic mysteries reddit', 'NASA news this week'],
  animals_nature: ['animal superpowers facts', 'nature is metal reddit', 'animal intelligence research'],
  sports: ['sports history greatest moments', 'athlete stories reddit', 'sports statistics mind blowing'],
  education: ['things school never taught', 'education facts reddit', 'learning science research'],
  paranormal_ufo: ['UFO sightings 2026', 'paranormal evidence reddit', 'unexplained phenomena'],
};

const HookSuggestionSchema = z.object({
  suggestions: z.array(z.object({
    topic: z.string().describe('Specific, compelling topic (e.g., "Lake Natron — the lake that turns animals to stone")'),
    hookLine: z.string().describe('Opening hook sentence that stops the scroll'),
    angle: z.string().describe('Narrative angle (e.g., "mystery-reveal with scientific explanation")'),
    whyItWorks: z.string().describe('Why this topic will perform well — engagement signals, emotional triggers'),
    estimatedViralPotential: z.enum(['high', 'medium', 'low']).describe('Based on engagement signals from research'),
  })),
});

/**
 * Discover trending topics and generate ranked hook suggestions.
 *
 * @param {object} params
 * @param {string} params.niche - Niche key
 * @param {object} [params.framework] - Framework object (for hook pattern guidance)
 * @param {number} [params.count=5] - Number of suggestions
 * @param {string[]} [params.excludeTopics=[]] - Topics to avoid
 * @param {object} params.keys - { openaiKey }
 * @param {string} [params.brandUsername] - For cost logging
 * @returns {Promise<Array>} Ranked hook suggestions
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

  // ── Step 1: Gather search context ──────────────────────────────────────
  const searchQueries = NICHE_SEARCH_QUERIES[niche] || [`${niche} trending topics`, `${niche} reddit`];
  const searchContext = searchQueries.join('; ');

  // ── Step 2: LLM synthesis ─────────────────────────────────────────────
  const hookPattern = framework?.narrative?.hookPattern || 'mystery-reveal';
  const hookExamples = framework?.narrative?.hookExamples || framework?.hookExamples || [];

  const excludeBlock = excludeTopics.length > 0
    ? `\nAVOID these already-used topics:\n${excludeTopics.map(t => `- ${t}`).join('\n')}`
    : '';

  const systemPrompt = `You are a viral content researcher. Generate ${count} specific, research-backed topic suggestions for ${niche} short-form video content.

HOOK PATTERN: ${hookPattern}
${hookExamples.length > 0 ? `HOOK EXAMPLES (match this style):\n${hookExamples.map(h => `  - "${h}"`).join('\n')}` : ''}

SEARCH CONTEXT (use these as starting points for topic ideas):
${searchContext}

Each suggestion must be:
1. SPECIFIC — not vague like "money tips". Instead: "Why keeping $1000 in savings is actually losing you $47/year to inflation"
2. HOOK-FIRST — the hookLine must create an information gap that makes viewers NEED to know the answer
3. VERIFIABLE — based on real facts, events, or phenomena (not made-up scenarios)
4. STORY-CAPABLE — can be told in 30-90 seconds with a clear narrative arc
5. FRESH — not the same overused topics everyone has already covered

For estimatedViralPotential:
- "high": Combines strong emotional trigger + surprising fact + broad appeal
- "medium": Good topic but either niche or less surprising
- "low": Decent content but predictable or hard to make visually interesting
${excludeBlock}`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} viral topic suggestions for ${niche} content.` },
    ],
    response_format: zodResponseFormat(HookSuggestionSchema, 'hook_suggestions'),
    temperature: 1.0, // High creativity for diverse suggestions
  });

  const result = completion.choices[0].message.parsed;

  if (completion.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_topic_discovery',
      model: 'gpt-4.1-mini',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  // Sort by viral potential
  const potentialOrder = { high: 0, medium: 1, low: 2 };
  const sorted = result.suggestions.sort((a, b) =>
    (potentialOrder[a.estimatedViralPotential] || 2) - (potentialOrder[b.estimatedViralPotential] || 2)
  );

  console.log(`[topicDiscovery] Generated ${sorted.length} suggestions for ${niche} (${sorted.filter(s => s.estimatedViralPotential === 'high').length} high potential)`);

  return sorted;
}
