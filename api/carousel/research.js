import { getUserKeys } from '../lib/getUserKeys.js';
import { scrapeArticle } from '../lib/pipelineHelpers.js';
import { fetchUrlContent, resolveExaKey } from '../lib/newsjackScorer.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ success: false, error: 'topic is required' });
    }

    const userId = req.user.id;
    const userEmail = req.user.email;
    const keys = await getUserKeys(userId, userEmail);

    const searchApiKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
    if (!searchApiKey) {
      return res.status(500).json({ success: false, error: 'No SearchAPI key configured' });
    }

    // Run Google News + organic search in parallel
    const [newsRes, organicRes] = await Promise.allSettled([
      fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams({
        engine: 'google_news',
        q: topic,
        api_key: searchApiKey,
        num: 5
      })}`).then(r => r.json()),
      fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams({
        engine: 'google',
        q: topic,
        api_key: searchApiKey,
        num: 5
      })}`).then(r => r.json()),
    ]);

    // Collect articles from both search types
    const articles = [];

    if (newsRes.status === 'fulfilled' && newsRes.value.news_results) {
      for (const item of newsRes.value.news_results.slice(0, 5)) {
        articles.push({
          title: item.title,
          url: item.link || item.url,
          snippet: item.snippet || item.description || '',
          source: item.source?.name || 'News',
          type: 'news',
        });
      }
    }

    if (organicRes.status === 'fulfilled' && organicRes.value.organic_results) {
      for (const item of organicRes.value.organic_results.slice(0, 5)) {
        // Skip duplicates by URL
        if (articles.some(a => a.url === item.link)) continue;
        articles.push({
          title: item.title,
          url: item.link,
          snippet: item.snippet || '',
          source: item.displayed_link || item.source || 'Web',
          type: 'organic',
        });
      }
    }

    if (articles.length === 0) {
      return res.json({
        success: true,
        research: {
          articles: [],
          compiled_brief: `No search results found for topic: "${topic}"`,
        },
      });
    }

    // Scrape top 5 articles for full content
    const top5 = articles.slice(0, 5);
    const scrapeResults = await Promise.allSettled(
      top5.map(async (article) => {
        try {
          // Try scrapeArticle first (Firecrawl)
          const content = await scrapeArticle(article.url, process.env.FIRECRAWL_API_KEY);
          return { ...article, content: content || '' };
        } catch {
          try {
            // Fall back to fetchUrlContent (Exa)
            const exaKey = await resolveExaKey(userId);
            const content = await fetchUrlContent(article.url, exaKey);
            return { ...article, content: content || '' };
          } catch {
            return { ...article, content: '' };
          }
        }
      })
    );

    // Merge scraped content back into articles
    const enrichedArticles = scrapeResults.map((result, i) => {
      if (result.status === 'fulfilled') return result.value;
      return { ...top5[i], content: '' };
    });

    // Update original articles with scraped content
    for (const enriched of enrichedArticles) {
      const idx = articles.findIndex(a => a.url === enriched.url);
      if (idx !== -1) {
        articles[idx].content = enriched.content;
      }
    }

    // Compile research brief
    const briefParts = [`Research Brief: "${topic}"\n`];
    for (const article of articles) {
      briefParts.push(`--- ${article.title} (${article.source}) ---`);
      briefParts.push(`URL: ${article.url}`);
      if (article.snippet) briefParts.push(`Summary: ${article.snippet}`);
      if (article.content) {
        // Truncate long content to keep the brief manageable
        const trimmed = article.content.length > 2000
          ? article.content.slice(0, 2000) + '...'
          : article.content;
        briefParts.push(`Content:\n${trimmed}`);
      }
      briefParts.push('');
    }

    const compiled_brief = briefParts.join('\n');

    // Log the search API cost
    await logCost({
      userId,
      username: userEmail,
      category: 'searchapi',
      model: 'google_news+organic',
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0.01,
      description: `Carousel research: "${topic}"`,
    }).catch(() => {});

    return res.json({
      success: true,
      research: {
        articles,
        compiled_brief,
      },
    });
  } catch (err) {
    console.error('[carousel/research] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
