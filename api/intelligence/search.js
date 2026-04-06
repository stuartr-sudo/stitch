import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

/**
 * POST /api/intelligence/search
 * Multi-source competitor ad search.
 * Step 1: SerpAPI Google search for competitor ads across ad libraries
 * Step 2: GPT-4.1 structures the raw results into actionable ad cards
 */

// Build targeted search queries for different ad platforms
function buildSearchQueries(query, platforms) {
  const queries = [];
  const allPlatforms = !platforms?.length || platforms.includes('All');

  if (allPlatforms || platforms.includes('Meta')) {
    queries.push({ q: `"${query}" site:facebook.com/ads/library`, platform: 'Meta' });
    queries.push({ q: `"${query}" ads Meta Facebook Instagram marketing`, platform: 'Meta' });
  }
  if (allPlatforms || platforms.includes('Google')) {
    queries.push({ q: `"${query}" site:adstransparency.google.com`, platform: 'Google' });
    queries.push({ q: `"${query}" Google Ads examples marketing campaign`, platform: 'Google' });
  }
  if (allPlatforms || platforms.includes('LinkedIn')) {
    queries.push({ q: `"${query}" LinkedIn ads sponsored content marketing`, platform: 'LinkedIn' });
  }
  if (allPlatforms || platforms.includes('TikTok')) {
    queries.push({ q: `"${query}" TikTok ads creative center marketing`, platform: 'TikTok' });
  }
  if (allPlatforms || platforms.includes('Web')) {
    queries.push({ q: `"${query}" best ads marketing campaign analysis breakdown`, platform: 'Web' });
  }

  // Always include a general search
  if (!queries.some(q => q.platform === 'Web')) {
    queries.push({ q: `"${query}" advertising campaign examples analysis`, platform: 'Web' });
  }

  return queries;
}

async function serpSearch(query, serpKey) {
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=10&api_key=${serpKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    console.error(`[intelligence/search] SerpAPI error: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return (data.organic_results || []).map(r => ({
    title: r.title || '',
    url: r.link || '',
    snippet: r.snippet || '',
    source: r.displayed_link || '',
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, platforms, formats } = req.body;
  if (!query) return res.status(400).json({ error: 'query required (competitor name, URL, or ad URL)' });

  const userId = req.user.id;
  const serpKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;

  if (!serpKey) {
    return res.status(500).json({ error: 'SERP_API_KEY not configured' });
  }

  try {
    const keys = await getUserKeys(userId, req.user.email);
    const openai = new OpenAI({ apiKey: keys.openaiKey });

    // Step 1: Run targeted SerpAPI searches in parallel
    const searchQueries = buildSearchQueries(query, platforms);
    const searchPromises = searchQueries.map(sq =>
      serpSearch(sq.q, serpKey).then(results => results.map(r => ({ ...r, platform: sq.platform })))
    );
    const searchResults = await Promise.allSettled(searchPromises);

    // Flatten and dedupe by URL
    const allResults = [];
    const seenUrls = new Set();
    for (const result of searchResults) {
      if (result.status !== 'fulfilled') continue;
      for (const r of result.value) {
        if (seenUrls.has(r.url)) continue;
        seenUrls.add(r.url);
        allResults.push(r);
      }
    }

    logCost({
      username: req.user.email,
      category: 'serpapi',
      operation: 'intelligence_search',
      metadata: { query, platforms, query_count: searchQueries.length, raw_results: allResults.length },
    }).catch(() => {});

    if (!allResults.length) {
      return res.json({ results: [] });
    }

    // Step 2: GPT structures the raw search results into ad cards
    const formatFilter = formats?.length ? `Focus on ${formats.join(', ')} ad formats.` : '';

    const rawContext = allResults.slice(0, 30).map((r, i) =>
      `[${i + 1}] ${r.platform} | ${r.title}\n    URL: ${r.url}\n    ${r.snippet}`
    ).join('\n\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are a competitive ad research analyst. Given raw search results about a competitor's advertising, extract and structure them into a JSON array of ad objects. Only include results that are ACTUALLY about the competitor's ads (not random articles). ${formatFilter}

For each relevant result, output:
{ "title": "descriptive title", "source_url": "URL", "platform": "Meta|Google|LinkedIn|TikTok|Web", "advertiser": "brand name", "ad_format": "image|video|carousel|unknown", "ad_copy": "any ad copy visible in the snippet", "landing_page_url": "destination URL if visible", "description": "1-2 sentence summary of the ad angle", "estimated_engagement": "High|Medium|Low", "why_its_winning": "one sentence on why this works" }

Return ONLY the JSON array. If a result isn't about an actual ad, skip it. Aim for 5-15 results.`,
        },
        {
          role: 'user',
          content: `Competitor: "${query}"\n\nRaw search results:\n${rawContext}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'intelligence_search_structure',
      model: 'gpt-4.1-mini',
      input_tokens: completion.usage?.prompt_tokens || 0,
      output_tokens: completion.usage?.completion_tokens || 0,
      metadata: { query },
    }).catch(() => {});

    let results = [];
    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      results = Array.isArray(parsed) ? parsed : (parsed.results || parsed.ads || []);
    } catch (e) {
      console.error('[intelligence/search] GPT parse error:', e.message);
    }

    return res.json({ results });
  } catch (err) {
    console.error('[intelligence/search] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
