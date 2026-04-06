import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const LandingPageAnalysis = z.object({
  page_structure: z.array(z.object({
    section: z.string(),
    content: z.string(),
  })).describe('Top-to-bottom section breakdown of the page'),
  copy_analysis: z.object({
    headline: z.string().describe('Headline approach and effectiveness'),
    subhead: z.string().describe('Supporting copy analysis'),
    cta: z.string().describe('CTA text and friction removal tactics'),
  }),
  conversion_tactics: z.array(z.string()).describe('Conversion tactics used (e.g., Social Proof, Sticky CTA, Urgency Timer)'),
  design_patterns: z.string().describe('Layout, visual hierarchy, UX patterns description'),
  technical: z.object({
    load_time: z.string().describe('Estimated load speed assessment'),
    mobile: z.string().describe('Mobile responsiveness status'),
    tracking_pixels: z.array(z.string()).describe('Detected tracking (Meta, Google, etc.)'),
    ab_test_indicators: z.string().describe('Any signs of A/B testing'),
  }),
  opportunities: z.array(z.string()).describe('Specific opportunities to beat this landing page — actionable gaps'),
});

const MAX_CONTENT_LENGTH = 50000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const userId = req.user.id;

  try {
    const keys = await getUserKeys(userId, req.user.email);
    const openai = new OpenAI({ apiKey: keys.openai });
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;

    if (!firecrawlKey) {
      return res.status(500).json({ error: 'FIRECRAWL_API_KEY not configured' });
    }

    // Scrape landing page via Firecrawl (same pattern as api/brand/extract-url.js)
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firecrawlKey}`,
      },
      body: JSON.stringify({ url, formats: ['markdown'] }),
      signal: AbortSignal.timeout(30000),
    });

    if (!scrapeRes.ok) {
      const errText = await scrapeRes.text();
      console.error('[intelligence/analyze-landing] Firecrawl error:', errText);
      return res.status(502).json({ error: 'Failed to scrape landing page' });
    }

    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData?.data?.markdown;

    if (!markdown) {
      return res.status(422).json({ error: 'No content extracted from page' });
    }

    const content = markdown.slice(0, MAX_CONTENT_LENGTH);

    // Analyze via GPT-4.1 with structured output
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      response_format: zodResponseFormat(LandingPageAnalysis, 'landing_page_analysis'),
      messages: [
        {
          role: 'system',
          content: `You are a landing page conversion expert and competitive analyst. Analyze landing pages for their conversion effectiveness, copy strategy, design patterns, and technical implementation. Be extremely specific about what works and what doesn't. For opportunities, frame each as an actionable way a competitor could beat this page (e.g., "They use generic social proof ('1M+ users') — beat them with specific named testimonials and results").`,
        },
        {
          role: 'user',
          content: `Analyze this competitor's landing page.\n\nURL: ${url}\n\nPage content:\n${content}`,
        },
      ],
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    await logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'intelligence_analyze_landing',
      model: 'gpt-4.1',
      input_tokens: completion.usage?.prompt_tokens,
      output_tokens: completion.usage?.completion_tokens,
      metadata: { url },
    });

    return res.json({ analysis });
  } catch (err) {
    console.error('[intelligence/analyze-landing] error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
