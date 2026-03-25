import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { scoreTopics, resolveExaKey } from '../lib/newsjackScorer.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Resolve API keys
    const keys = await getUserKeys(req.user.id, req.user.email);
    const serpKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
    if (!serpKey) return res.status(500).json({ error: 'SerpAPI key not configured' });

    // Search Google News via SerpAPI
    const serpUrl = `https://serpapi.com/search.json?engine=google_news&q=${encodeURIComponent(query)}&api_key=${serpKey}`;
    const serpRes = await fetch(serpUrl);
    if (!serpRes.ok) return res.status(502).json({ error: `SerpAPI returned ${serpRes.status}` });

    const serpData = await serpRes.json();
    const rawArticles = (serpData.news_results || []).slice(0, 10);

    const articles = rawArticles.map(a => ({
      headline: a.title || a.headline || '',
      snippet: a.snippet || a.description || '',
      url: a.link || a.url || '',
      source_domain: a.source?.name || new URL(a.link || a.url || 'https://unknown').hostname,
    }));

    if (articles.length === 0) return res.json({ success: true, topics: [] });

    // Log SerpAPI cost
    logCost({ username: req.user.email, category: 'serpapi', operation: 'linkedin_search' }).catch(() => {});

    // Score topics
    const scored = keys.openaiKey
      ? await scoreTopics(articles, {}, keys.openaiKey, req.user.email)
      : articles.map(a => ({ ...a, score: null, angle: null }));

    // Insert into linkedin_topics (skip duplicates via ON CONFLICT)
    const rows = scored.map(t => ({
      user_id: req.user.id,
      url: t.url,
      headline: t.headline,
      snippet: t.snippet,
      source_domain: t.source_domain || articles.find(a => a.url === t.url)?.source_domain,
      relevance_score: t.score,
      suggested_angle: t.angle,
    }));

    const { data: inserted, error } = await supabase
      .from('linkedin_topics')
      .upsert(rows, { onConflict: 'user_id,url', ignoreDuplicates: true })
      .select();

    if (error) console.warn('[linkedin/search] Insert error:', error.message);

    return res.json({ success: true, topics: scored });
  } catch (err) {
    console.error('[linkedin/search] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
