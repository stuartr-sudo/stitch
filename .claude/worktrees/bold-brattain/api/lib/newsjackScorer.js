/**
 * Newsjack Scorer + Exa Content Fetcher
 *
 * scoreTopics()    — Score an array of articles for brand relevance and newsjack potential.
 * fetchUrlContent() — Fetch full article text via Exa API with HTML-strip fallback.
 * resolveExaKey()  — Resolve Exa API key: linkedin_config row → EXA_API_KEY env var.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { createClient } from '@supabase/supabase-js';
import { logCost } from './costLogger.js';

// ---------------------------------------------------------------------------
// Exa key resolver
// ---------------------------------------------------------------------------

/**
 * Resolve the Exa API key for a given user.
 * Checks linkedin_config.exa_api_key first, falls back to process.env.EXA_API_KEY.
 *
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
export async function resolveExaKey(userId) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data } = await supabase
      .from('linkedin_config')
      .select('exa_api_key')
      .eq('user_id', userId)
      .maybeSingle();
    return data?.exa_api_key || process.env.EXA_API_KEY || null;
  } catch (err) {
    console.warn('[newsjackScorer] resolveExaKey error:', err.message);
    return process.env.EXA_API_KEY || null;
  }
}

// ---------------------------------------------------------------------------
// Content fetcher
// ---------------------------------------------------------------------------

/**
 * Fetch full article text for a URL.
 * Primary: Exa /contents API (structured extraction, up to 5000 chars).
 * Fallback: direct fetch + basic HTML tag stripping.
 *
 * @param {string} url
 * @param {string|null} exaKey
 * @returns {Promise<string>} Extracted text (may be empty string on failure)
 */
export async function fetchUrlContent(url, exaKey) {
  // --- Exa primary ---
  if (exaKey) {
    try {
      const res = await fetch('https://api.exa.ai/contents', {
        method: 'POST',
        headers: {
          'x-api-key': exaKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: [url],
          text: { maxCharacters: 5000 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.results?.[0]?.text;
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } else {
        console.warn('[newsjackScorer] Exa returned', res.status, 'for', url);
      }
    } catch (err) {
      console.warn('[newsjackScorer] Exa fetch failed:', err.message);
    }
  }

  // --- Fallback: direct fetch + HTML strip ---
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StitchBot/1.0)' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return '';

    const html = await res.text();
    // Strip HTML tags and collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 5000);

    return text;
  } catch (err) {
    console.warn('[newsjackScorer] Direct fetch fallback failed for', url, err.message);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const ScoredTopicSchema = z.object({
  topics: z.array(
    z.object({
      url: z.string(),
      score: z.number().min(1).max(10),
      angle: z.string(),
    })
  ),
});

/**
 * Score an array of articles for newsjack potential relative to a brand's context.
 *
 * @param {Array<{ headline: string, snippet: string, url: string }>} articles
 * @param {object} brandContext - Fields from linkedin_config: industry, target_audience,
 *   brand_voice, posting_goals, keywords, etc.
 * @param {string} openaiKey - Caller must resolve via getUserKeys()
 * @param {string} [userEmail] - Used for cost logging
 * @returns {Promise<Array<{ url: string, score: number, angle: string }>>}
 */
export async function scoreTopics(articles, brandContext, openaiKey, userEmail = null) {
  if (!articles || articles.length === 0) return [];
  if (!openaiKey) throw new Error('openaiKey is required for scoreTopics');

  const client = new OpenAI({ apiKey: openaiKey });

  // Build a compact brand summary for the prompt
  const brandSummary = [
    brandContext?.industry ? `Industry: ${brandContext.industry}` : null,
    brandContext?.target_audience ? `Target audience: ${brandContext.target_audience}` : null,
    brandContext?.brand_voice ? `Brand voice: ${brandContext.brand_voice}` : null,
    brandContext?.posting_goals ? `Posting goals: ${brandContext.posting_goals}` : null,
    brandContext?.keywords?.length
      ? `Key topics/keywords: ${Array.isArray(brandContext.keywords) ? brandContext.keywords.join(', ') : brandContext.keywords}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const articlesText = articles
    .map(
      (a, i) =>
        `[${i + 1}] URL: ${a.url}\nHeadline: ${a.headline}\nSnippet: ${a.snippet || '(no snippet)'}`
    )
    .join('\n\n');

  const systemPrompt = `You are an expert LinkedIn content strategist. You evaluate news articles for their "newsjacking" potential — the ability for a brand to publish a timely, relevant LinkedIn post that rides the wave of a trending story.

Score each article from 1–10 based on four factors (weighted equally):
1. **Brand relevance** — How directly does this story relate to the brand's industry, audience, or expertise?
2. **Timeliness** — Is this a fresh, breaking, or rapidly developing story that warrants a timely opinion?
3. **Newsjack potential** — Can the brand add genuine value, a unique angle, or a contrarian take that feels authentic rather than opportunistic?
4. **Engagement potential** — Is this the kind of topic that sparks conversation, debate, or strong reactions among the target audience?

For each article, also suggest a specific angle the brand should take — a one-sentence framing that positions their expertise relative to this news.

Be direct and opinionated. A score of 1–3 means weak fit. 4–6 means moderate. 7–9 means strong. 10 means exceptional — rare.`;

  const userPrompt = `Brand context:\n${brandSummary || '(no brand context provided)'}\n\nArticles to score:\n${articlesText}\n\nReturn scores and angles for all ${articles.length} article(s).`;

  const completion = await client.chat.completions.parse({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(ScoredTopicSchema, 'scored_topics'),
    temperature: 0.3,
  });

  const usage = completion.usage;
  if (userEmail) {
    logCost({
      username: userEmail,
      category: 'openai',
      operation: 'linkedin_scoring',
      model: 'gpt-4.1-mini',
      input_tokens: usage?.prompt_tokens || 0,
      output_tokens: usage?.completion_tokens || 0,
    }).catch(() => {});
  }

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed?.topics) return [];

  // Re-map back to input article order and merge with GPT output (keyed by url)
  const byUrl = Object.fromEntries(parsed.topics.map((t) => [t.url, t]));

  return articles.map((a) => {
    const scored = byUrl[a.url];
    return {
      url: a.url,
      headline: a.headline,
      snippet: a.snippet,
      score: scored?.score ?? null,
      angle: scored?.angle ?? null,
    };
  });
}
