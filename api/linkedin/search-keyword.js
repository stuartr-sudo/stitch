import { getUserKeys } from '../lib/getUserKeys.js';
import { scoreTopics } from '../lib/newsjackScorer.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query is required' });

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const serpKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
    if (!serpKey) return res.status(500).json({ error: 'SerpAPI key not configured' });

    // Search Google News via SerpAPI — limit to past week for freshness
    const serpUrl = `https://serpapi.com/search.json?engine=google_news&q=${encodeURIComponent(query)}&tbs=qdr:w&api_key=${serpKey}`;
    const serpRes = await fetch(serpUrl);
    if (!serpRes.ok) return res.status(502).json({ error: `SerpAPI returned ${serpRes.status}` });

    const serpData = await serpRes.json();
    const rawArticles = (serpData.news_results || []).slice(0, 10);

    const articles = rawArticles.map(a => ({
      headline: a.title || a.headline || '',
      snippet: a.snippet || a.description || '',
      url: a.link || a.url || '',
      source_domain: a.source?.name || new URL(a.link || a.url || 'https://unknown').hostname,
      published_at: a.date ? new Date(a.date).toISOString() : null,
    }));

    if (articles.length === 0) return res.json({ success: true, results: [] });

    logCost({ username: req.user.email, category: 'serpapi', operation: 'linkedin_search' }).catch(() => {});

    // Score but do NOT insert into DB — return as previews
    const scored = keys.openaiKey
      ? await scoreTopics(articles, {}, keys.openaiKey, req.user.email)
      : articles.map(a => ({ ...a, score: null, angle: null }));

    const results = scored.map(t => {
      const original = articles.find(a => a.url === t.url);
      return {
        headline: t.headline,
        snippet: t.snippet,
        url: t.url,
        source_domain: t.source_domain || original?.source_domain,
        relevance_score: t.score,
        suggested_angle: t.angle,
        published_at: original?.published_at || null,
      };
    });

    return res.json({ success: true, results });
  } catch (err) {
    console.error('[linkedin/search-keyword] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
