/**
 * POST /api/brand/extract-url
 *
 * Accepts a website URL, scrapes it via Firecrawl, and uses GPT to
 * extract structured brand information that auto-fills the Brand Kit form.
 *
 * Body: { url: string }
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';

const BrandExtractSchema = z.object({
  brand_name: z.string(),
  brand_username: z.string(),
  blurb: z.string(),
  website: z.string(),
  target_market: z.string(),
  brand_personality: z.string(),
  brand_voice_detail: z.string(),
  voice_style: z.enum(['professional', 'energetic', 'casual', 'luxury', 'playful']),
  content_style_rules: z.string(),
  preferred_elements: z.string(),
  prohibited_elements: z.string(),
  taglines: z.array(z.string()),
  colors: z.array(z.string()),
  style_preset: z.enum(['modern', 'minimal', 'bold', 'luxury', 'playful', 'corporate']),
  visual_style_notes: z.string(),
  mood_atmosphere: z.string(),
  lighting_prefs: z.string(),
  composition_style: z.string(),
  ai_prompt_rules: z.string(),
  logo_url: z.string(),
});

const SYSTEM_PROMPT = `You are a brand identity analyst. Extract detailed brand guidelines from the provided website content.

Return ALL fields as completely as possible. If information is not present in the content, provide a reasonable empty string — never fabricate data.

Field guidance:
- brand_name: The official brand name
- brand_username: A lowercase slug suitable as a username (no spaces, only a-z, 0-9, hyphens, underscores)
- blurb: A 1-2 sentence brand description / elevator pitch
- website: The brand's website URL
- target_market: Who the brand serves (demographics, psychographics, market segments)
- brand_personality: Brand character traits (e.g., "innovative, trustworthy, approachable")
- brand_voice_detail: Detailed description of how the brand communicates (tone, language style, formality level)
- voice_style: Best-fit category from the enum options
- content_style_rules: Rules for creating content (dos and don'ts, formatting preferences)
- preferred_elements: Visual or content elements the brand favors
- prohibited_elements: Things to avoid (colors, words, imagery, etc.)
- taglines: Array of brand taglines, slogans, or key phrases
- colors: Array of hex color codes (e.g., ["#FF5733", "#2C666E"]) — extract from any color specifications, CSS variables, or brand color mentions
- style_preset: Best-fit visual style category
- visual_style_notes: Description of the brand's visual identity (photography style, illustration style, etc.)
- mood_atmosphere: The emotional feel the brand aims for in visuals
- lighting_prefs: Preferred lighting style for photography/video
- composition_style: Layout and composition preferences
- ai_prompt_rules: Any specific instructions for AI-generated content
- logo_url: URL of brand logo if found in the page content (otherwise empty string)`;

const MAX_CONTENT_LENGTH = 50000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body;
  if (!url || (typeof url !== 'string')) {
    return res.status(400).json({ error: 'Provide a valid URL' });
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).json({ error: 'URL must start with http:// or https://' });
  }

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    return res.status(500).json({ error: 'Firecrawl API key not configured' });
  }

  try {
    // 1. Scrape the URL via Firecrawl
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
      const errBody = await scrapeRes.text().catch(() => '');
      console.error('[brand/extract-url] Firecrawl error:', scrapeRes.status, errBody);
      return res.status(500).json({ error: `Failed to scrape URL (${scrapeRes.status})` });
    }

    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData?.data?.markdown;

    if (!markdown || !markdown.trim()) {
      return res.status(500).json({ error: 'Could not extract content from this URL' });
    }

    // 2. Truncate to prevent token blowout
    const content = markdown.slice(0, MAX_CONTENT_LENGTH);

    // 3. Extract brand data via GPT
    const keys = await getUserKeys(req.user.id, req.user.email);
    const openaiKey = keys.openaiKey || process.env.OPENAI_API_KEY;
    if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

    const openai = new OpenAI({ apiKey: openaiKey });

    const completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract all brand guidelines, identity information, visual style specifications, voice & tone rules, color palette, and any other relevant brand data from this website content.\n\nURL: ${url}\n\n${content}`,
        },
      ],
      response_format: zodResponseFormat(BrandExtractSchema, 'brand_extract'),
    });

    const extracted = completion.choices[0].message.parsed;

    // Ensure the website field is populated with the input URL if GPT missed it
    if (!extracted.website) extracted.website = url;

    return res.json({ success: true, extracted });
  } catch (err) {
    console.error('[brand/extract-url]', err);
    if (err.name === 'TimeoutError') {
      return res.status(500).json({ error: 'Timed out scraping URL — the site may be too slow or unreachable' });
    }
    return res.status(500).json({ error: err.message });
  }
}
