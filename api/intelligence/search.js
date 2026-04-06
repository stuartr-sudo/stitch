import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query, platforms, formats } = req.body;
  if (!query) return res.status(400).json({ error: 'query required (competitor name, URL, or ad URL)' });

  const userId = req.user.id;

  try {
    const keys = await getUserKeys(userId, req.user.email);
    const openai = new OpenAI({ apiKey: keys.openaiKey });

    const platformFilter = platforms?.length && !platforms.includes('all')
      ? `on ${platforms.join(', ')}`
      : 'across Meta, Google, LinkedIn, TikTok, and the web';

    const formatFilter = formats?.length
      ? `Focus on ${formats.join(', ')} ad formats.`
      : '';

    const response = await openai.responses.create({
      model: 'gpt-4.1',
      tools: [{ type: 'web_search_preview' }],
      input: `Research the competitor "${query}" and find 10-15 of their current or recent paid advertisements ${platformFilter}. ${formatFilter}

Search these sources in order:
1. Meta Ad Library (facebook.com/ads/library) — search for the brand name
2. Google Ads Transparency Center (adstransparency.google.com)
3. LinkedIn Ad Library if applicable
4. TikTok Creative Center (ads.tiktok.com/business/creativecenter)
5. General web search for marketing case studies, ad examples, ad breakdowns

For each ad found, provide:
- title: A descriptive title for the ad
- source_url: The URL where the ad can be found
- platform: Which platform (Meta, Google, LinkedIn, TikTok, Web)
- advertiser: The brand or company name
- ad_format: image, video, or carousel
- ad_copy: The primary ad copy/text (headline + body if visible)
- landing_page_url: The destination URL if visible
- description: A 1-2 sentence summary of the ad's angle
- estimated_engagement: High, Medium, or Low based on visible signals
- why_its_winning: One sentence on why this ad works

Return results as a JSON array. Focus on REAL ads, not hypothetical ones.`,
    });

    const text = response.output
      .filter(o => o.type === 'message')
      .flatMap(o => o.content)
      .filter(c => c.type === 'output_text')
      .map(c => c.text)
      .join('');

    let results = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) results = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[intelligence/search] JSON parse error:', e.message);
    }

    await logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'intelligence_search',
      model: 'gpt-4.1',
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
      metadata: { query, platforms, formats, result_count: results.length },
    });

    return res.json({ results });
  } catch (err) {
    console.error('[intelligence/search] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
