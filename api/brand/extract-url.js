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
  // Content Strategy fields (for Brand Mode)
  brand_domain: z.string().describe('What the brand sells or does. 1-2 sentences.'),
  brand_expertise: z.string().describe('What the brand knows deeply. Comma-separated areas of knowledge derived from the website content.'),
  target_viewer: z.string().describe('Who should feel personally addressed by video content from this brand.'),
  target_viewer_pain_points: z.array(z.string()).describe('3-5 specific problems the target audience faces, inferred from the website messaging and value proposition.'),
  emotional_endpoint: z.string().describe('What a viewer should FEEL after watching content from this brand. One sentence starting with "I need to..." or "I should..."'),
  primary_niche: z.enum([
    'ai_tech_news', 'finance_money', 'motivation_self_help', 'scary_horror',
    'history_did_you_know', 'true_crime', 'science_nature', 'relationships_dating',
    'health_fitness', 'gaming_popculture', 'conspiracy_mystery', 'business_entrepreneur',
    'food_cooking', 'travel_adventure', 'psychology_mindblown', 'space_cosmos',
    'animals_wildlife', 'sports_athletes', 'education_learning', 'paranormal_ufo',
    'diy_crafts', 'parenting', 'crypto',
  ]).describe('The niche blueprint that best matches this brand for visual style, pacing, and music.'),
  tone_override: z.string().describe('How this brand should sound in video narration. Describe the voice personality in 1-2 sentences.'),
  suggested_content_angles: z.array(z.object({
    name: z.string().describe('Short name for this angle, e.g. "The Hidden Risk"'),
    emotional_driver: z.enum(['fear', 'identity', 'curiosity', 'injustice', 'wonder']),
    lens: z.string().describe('What stories does this angle tell?'),
    endpoint: z.string().describe('What should the viewer feel after watching?'),
    hook_patterns: z.array(z.string()).describe('3 example hook lines for this angle'),
    weight: z.number().describe('Suggested percentage weight 0-100. All angles should sum to ~100.'),
  })).describe('3-5 suggested content angles based on the brand domain. Each angle is a different emotional lens for storytelling.'),
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
- logo_url: URL of brand logo if found in the page content (otherwise empty string)

CONTENT STRATEGY FIELDS (for automated short-form video creation):
- brand_domain: What this brand sells or does. 1-2 clear sentences derived from the website's hero section and value proposition.
- brand_expertise: Comma-separated areas of deep knowledge this brand has, inferred from their content, services, blog, FAQ, etc.
- target_viewer: Who should feel personally addressed by video content. Infer from the website's target audience, customer testimonials, pricing page, etc.
- target_viewer_pain_points: 3-5 SPECIFIC problems the audience faces. Don't be generic — infer from the website's messaging, objection handling, FAQ, and case studies. Each pain point should be a specific belief or gap in the audience's understanding.
- emotional_endpoint: What a viewer should feel after watching brand content. Start with "I need to..." or "I should..." — this is the feeling the brand wants to create.
- primary_niche: Which content niche best fits this brand's visual and editorial style.
- tone_override: How the brand should sound in voiceover narration. Derive from the website's copy tone.
- suggested_content_angles: 3-5 content angles, each with a different emotional driver (fear, identity, curiosity, injustice, wonder). Each angle should be grounded in the brand's actual domain — not generic. Include specific hook patterns that reference the brand's industry.`;

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
