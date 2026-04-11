import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { resolveExaKey } from '../lib/newsjackScorer.js';
import { logCost } from '../lib/costLogger.js';

/**
 * POST /api/intelligence/search
 * Multi-source competitor ad research pipeline.
 *
 * Sources (all run in parallel):
 *   1. Meta Ad Library — Firecrawl scrape of facebook.com/ads/library (real ads)
 *   2. Exa neural search — marketing analysis articles about the competitor
 *   3. SerpAPI — campaign news + ad analysis + Google Ads transparency
 *   4. RAG knowledge base — existing intel from Doubleclicker's knowledge corpus
 *
 * Results merge, dedupe, then GPT-4.1-mini structures into ad card format.
 */

// ── Source 1: Meta Ad Library via Firecrawl ─────────────────────────────────

async function searchMetaAdLibrary(query, firecrawlKey) {
  if (!firecrawlKey) return [];

  const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(query)}`;

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${firecrawlKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      waitFor: 8000,
      actions: [
        { type: 'wait', milliseconds: 5000 },
        { type: 'scroll', direction: 'down' },
        { type: 'wait', milliseconds: 3000 },
      ],
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    console.warn(`[intelligence/search] Meta Ad Library scrape failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const markdown = data?.data?.markdown || '';
  if (!markdown || markdown.length < 500) return [];

  // Parse real ads from the scraped markdown
  return parseMetaAdLibrary(markdown, query);
}

/**
 * Parse Meta Ad Library scraped markdown into structured ad objects.
 * Each ad block follows the pattern:
 *   Library ID: {id}
 *   Started running on {date}
 *   [Advertiser](facebook.com/...)
 *   **Sponsored**
 *   {ad copy}
 *   {CTA}](landing_url)
 */
function parseMetaAdLibrary(markdown, query) {
  const ads = [];
  const sections = markdown.split(/Library ID:\s*/);

  for (let i = 1; i < sections.length && ads.length < 20; i++) {
    const section = sections[i];
    try {
      // Library ID
      const idMatch = section.match(/^(\d+)/);
      const libraryId = idMatch ? idMatch[1] : null;

      // Start date
      const dateMatch = section.match(/Started running on\s+(.+?)(?:\n|$)/);
      const startedRunning = dateMatch ? dateMatch[1].trim() : null;

      // Advertiser name — look for [Name](facebook.com/...)
      const advertiserMatch = section.match(/\[([^\]]+)\]\(https?:\/\/(?:www\.)?facebook\.com\/[^)]+\)/);
      const advertiser = advertiserMatch ? advertiserMatch[1] : null;

      // Ad copy — text after **Sponsored** until the next link/CTA
      const sponsoredIdx = section.indexOf('**Sponsored**');
      let adCopy = '';
      if (sponsoredIdx > -1) {
        const afterSponsored = section.slice(sponsoredIdx + 13).trim();
        // Get text until the next image or link pattern
        const copyEnd = afterSponsored.search(/\[!\[|^\[.*\]\(http/m);
        adCopy = (copyEnd > -1 ? afterSponsored.slice(0, copyEnd) : afterSponsored.slice(0, 800))
          .replace(/\\\\/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      }

      // Landing page URL — look for CTA links (Learn more, Shop now, etc.)
      const landingMatch = section.match(/(?:Learn more|Shop now|Sign up|Get offer|Book now|Download|Watch more|Contact us)\]\((https?:\/\/[^)]+)\)/i);
      const landingPageUrl = landingMatch ? landingMatch[1] : null;

      // Image URL — fbcdn URLs
      const imageMatch = section.match(/(https:\/\/scontent[^)"\s]+\.(?:jpg|png|webp))/);
      const imageUrl = imageMatch ? imageMatch[1] : null;

      // CTA text
      const ctaMatch = section.match(/(Learn more|Shop now|Sign up|Get offer|Book now|Download|Watch more|Contact us)\]/i);
      const cta = ctaMatch ? ctaMatch[1] : null;

      // Only keep ads that have meaningful content
      if (!adCopy && !advertiser) continue;

      ads.push({
        title: advertiser ? `${advertiser} — Meta Ad` : `Meta Ad ${libraryId || i}`,
        source_url: `https://www.facebook.com/ads/library/?id=${libraryId || ''}`,
        platform: 'Meta',
        advertiser: advertiser || query,
        ad_format: section.includes('video') ? 'video' : section.includes('carousel') ? 'carousel' : 'image',
        ad_copy: adCopy.slice(0, 500),
        landing_page_url: landingPageUrl,
        description: adCopy.slice(0, 150),
        cta,
        data_source: 'meta_ad_library',
        library_id: libraryId,
        started_running: startedRunning,
        image_url: imageUrl,
      });
    } catch (err) {
      // Skip unparseable sections
      continue;
    }
  }

  return ads;
}

// ── Source 2: Exa Neural Search ─────────────────────────────────────────────

async function searchExa(query, exaKey) {
  if (!exaKey) return [];

  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'x-api-key': exaKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `${query} advertising campaign strategy ads marketing`,
      num_results: 8,
      use_autoprompt: true,
      type: 'neural',
      include_domains: [
        'adage.com', 'adweek.com', 'marketingweek.com',
        'hubspot.com', 'neilpatel.com', 'searchengineland.com',
        'socialmediaexaminer.com', 'marketingdive.com',
      ],
      contents: { text: { max_characters: 800 } },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.warn(`[intelligence/search] Exa search failed: ${res.status}`);
    return [];
  }

  const data = await res.json();
  return (data.results || []).map(r => ({
    title: r.title || '',
    source_url: r.url || '',
    snippet: (r.text || '').slice(0, 300),
    platform: 'Web',
    data_source: 'exa',
  }));
}

// ── Source 3: SerpAPI (searchapi.io) ────────────────────────────────────────

async function searchSerp(query, platforms, serpKey) {
  if (!serpKey) return [];

  const allPlatforms = !platforms?.length || platforms.includes('All');

  // Build targeted queries
  const queries = [
    { engine: 'google_news', q: `"${query}" advertising campaign`, label: 'news' },
    { engine: 'google', q: `"${query}" ad examples analysis marketing strategy`, label: 'analysis' },
  ];

  if (allPlatforms || platforms.includes('Google')) {
    queries.push({ engine: 'google', q: `site:adstransparency.google.com "${query}"`, label: 'google_transparency' });
  }

  const results = [];

  const promises = queries.map(async (sq) => {
    try {
      const params = new URLSearchParams({
        engine: sq.engine,
        q: sq.q,
        api_key: serpKey,
        num: '8',
      });
      const res = await fetch(`https://www.searchapi.io/api/v1/search?${params}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return [];
      const data = await res.json();

      const items = sq.engine === 'google_news'
        ? (data.news_results || [])
        : (data.organic_results || []);

      return items.slice(0, 8).map(r => ({
        title: r.title || '',
        source_url: r.link || r.url || '',
        snippet: r.snippet || r.description || '',
        platform: sq.label === 'google_transparency' ? 'Google' : 'Web',
        data_source: 'serp',
        serp_type: sq.label,
      }));
    } catch (err) {
      console.warn(`[intelligence/search] SerpAPI ${sq.label} failed:`, err.message);
      return [];
    }
  });

  const settled = await Promise.allSettled(promises);
  for (const r of settled) {
    if (r.status === 'fulfilled') results.push(...r.value);
  }

  return results;
}

// ── Source 4: RAG Knowledge Base ────────────────────────────────────────────

async function searchRAG(query, supabase) {
  try {
    const { data, error } = await supabase
      .rpc('rag_lexical_search', {
        p_user_name: '',  // Search across all users — we'll filter by relevance
        p_domain: '',
        p_query: query,
        p_k: 10,
      })
      .select('chunk_id, rank, score');

    // rag_lexical_search requires user_name and domain — fall back to direct text search
    if (error) {
      const { data: chunks, error: directErr } = await supabase
        .from('knowledge_chunks')
        .select('id, content, url, heading, user_name, domain')
        .textSearch('content_tsv', query, { type: 'websearch' })
        .order('created_at', { ascending: false })
        .limit(10);

      if (directErr || !chunks?.length) return [];

      return chunks.map(c => ({
        title: c.heading || `Knowledge: ${c.domain}`,
        source_url: c.url || '',
        snippet: (c.content || '').slice(0, 300),
        platform: 'Knowledge Base',
        data_source: 'knowledge_base',
        is_existing_intel: true,
        rag_domain: c.domain,
        rag_user: c.user_name,
      }));
    }

    // If RPC worked, fetch the actual chunk content
    if (!data?.length) return [];
    const chunkIds = data.map(d => d.chunk_id);
    const { data: chunks } = await supabase
      .from('knowledge_chunks')
      .select('id, content, url, heading, user_name, domain')
      .in('id', chunkIds);

    return (chunks || []).map(c => ({
      title: c.heading || `Knowledge: ${c.domain}`,
      source_url: c.url || '',
      snippet: (c.content || '').slice(0, 300),
      platform: 'Knowledge Base',
      data_source: 'knowledge_base',
      is_existing_intel: true,
      rag_domain: c.domain,
      rag_user: c.user_name,
    }));
  } catch (err) {
    console.warn('[intelligence/search] RAG search failed:', err.message);
    return [];
  }
}

// ── Main Handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, platforms, formats } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });

  const userId = req.user.id;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const keys = await getUserKeys(userId, req.user.email);
    const openai = new OpenAI({ apiKey: keys.openaiKey });
    const serpKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
    const exaKey = await resolveExaKey(userId);
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;

    const allPlatforms = !platforms?.length || platforms.includes('All');
    const wantMeta = allPlatforms || platforms.includes('Meta');

    console.log(`[intelligence/search] Query: "${query}" | Platforms: ${platforms || 'All'} | Sources: meta=${wantMeta && !!firecrawlKey}, exa=${!!exaKey}, serp=${!!serpKey}, rag=true`);

    // Run all sources in parallel
    const startTime = Date.now();
    const [metaResult, exaResult, serpResult, ragResult] = await Promise.allSettled([
      wantMeta ? searchMetaAdLibrary(query, firecrawlKey) : Promise.resolve([]),
      searchExa(query, exaKey),
      searchSerp(query, platforms, serpKey),
      searchRAG(query, supabase),
    ]);

    const elapsed = Date.now() - startTime;

    // Collect results by source
    const metaAds = metaResult.status === 'fulfilled' ? metaResult.value : [];
    const exaResults = exaResult.status === 'fulfilled' ? exaResult.value : [];
    const serpResults = serpResult.status === 'fulfilled' ? serpResult.value : [];
    const ragResults = ragResult.status === 'fulfilled' ? ragResult.value : [];

    console.log(`[intelligence/search] Results: meta=${metaAds.length}, exa=${exaResults.length}, serp=${serpResults.length}, rag=${ragResults.length} (${elapsed}ms)`);

    // Log costs per source
    if (metaAds.length) logCost({ username: req.user.email, category: 'firecrawl', operation: 'intelligence_meta_scrape', metadata: { query, count: metaAds.length } }).catch(() => {});
    if (exaResults.length) logCost({ username: req.user.email, category: 'exa', operation: 'intelligence_exa_search', metadata: { query, count: exaResults.length } }).catch(() => {});
    if (serpResults.length) logCost({ username: req.user.email, category: 'serpapi', operation: 'intelligence_serp_search', metadata: { query, count: serpResults.length } }).catch(() => {});

    // Meta Ad Library results are already structured — use them directly
    // Exa + SerpAPI + RAG results need GPT structuring
    const unstructuredResults = [...exaResults, ...serpResults];

    let structuredFromGPT = [];
    if (unstructuredResults.length > 0) {
      const rawContext = unstructuredResults.slice(0, 20).map((r, i) =>
        `[${i + 1}] Source: ${r.data_source} | ${r.title}\n    URL: ${r.source_url}\n    ${r.snippet}`
      ).join('\n\n');

      const formatFilter = formats?.length ? `Focus on ${formats.join(', ')} ad formats.` : '';

      const completion = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `You are a competitive ad research analyst. Structure these search results about "${query}" into ad intelligence cards. Only include results that provide actual insight about the competitor's advertising strategy, campaigns, or marketing approach. Skip generic/irrelevant results. ${formatFilter}

For each relevant result, output:
{ "title": "descriptive title", "source_url": "URL", "platform": "Meta|Google|LinkedIn|TikTok|Web", "advertiser": "${query}", "ad_format": "image|video|carousel|article", "ad_copy": "key text or quote from the result", "landing_page_url": "if visible", "description": "1-2 sentence summary", "estimated_engagement": "High|Medium|Low", "why_its_winning": "strategic insight", "data_source": "exa or serp" }

Return JSON: { "results": [...] }`,
          },
          { role: 'user', content: rawContext },
        ],
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });

      logCost({
        username: req.user.email,
        category: 'openai',
        operation: 'intelligence_search_structure',
        model: 'gpt-4.1-mini',
        input_tokens: completion.usage?.prompt_tokens || 0,
        output_tokens: completion.usage?.completion_tokens || 0,
      }).catch(() => {});

      try {
        const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
        structuredFromGPT = Array.isArray(parsed) ? parsed : (parsed.results || parsed.ads || []);
      } catch (e) {
        console.error('[intelligence/search] GPT parse error:', e.message);
      }
    }

    // RAG results — add as-is with knowledge badge
    const ragCards = ragResults.map(r => ({
      title: r.title,
      source_url: r.source_url,
      platform: 'Knowledge Base',
      advertiser: query,
      ad_format: 'article',
      ad_copy: r.snippet,
      description: r.snippet,
      data_source: 'knowledge_base',
      is_existing_intel: true,
    }));

    // Merge: Meta ads first (real data), then GPT-structured, then RAG
    const allResults = [...metaAds, ...structuredFromGPT, ...ragCards];

    // Dedupe by source_url
    const seenUrls = new Set();
    const deduped = allResults.filter(r => {
      if (!r.source_url || seenUrls.has(r.source_url)) return !r.source_url ? true : false;
      seenUrls.add(r.source_url);
      return true;
    });

    return res.json({
      results: deduped,
      sources: {
        meta_ads: metaAds.length,
        exa: exaResults.length,
        serp: serpResults.length,
        rag: ragResults.length,
      },
    });
  } catch (err) {
    console.error('[intelligence/search] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
