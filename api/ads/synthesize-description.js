// api/ads/synthesize-description.js
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const SYSTEM_PROMPT = `You are a marketing strategist. Given information about a product/service (from a webpage and/or brand kit), write a cohesive product/service description suitable for generating advertising campaigns.

Requirements:
- Write natural prose, 2-3 paragraphs max
- Focus on what the product/service IS and its value proposition
- If brand voice/personality data is provided, match that tone
- Do NOT list raw data fields or bullet points
- Do NOT fabricate features not present in the source material
- Write as if describing the product to an ad copywriter who needs full context`;

export default async function handler(req, res) {
  const { url, brand_kit_id } = req.body;

  // Validate: at least one source required
  const hasUrl = url && typeof url === 'string' && url.trim();
  const hasBrandKit = brand_kit_id && typeof brand_kit_id === 'string' && brand_kit_id.trim();

  if (!hasUrl && !hasBrandKit) {
    return res.status(400).json({ success: false, error: 'Provide a URL or select a Brand Kit' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const keys = await getUserKeys(req.user.id, req.user.email);
  const openaiKey = keys.openaiKey || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ success: false, error: 'OpenAI API key required' });

  try {
    const sources = [];

    // 1. Scrape URL if provided
    if (hasUrl) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return res.status(400).json({ success: false, error: 'URL must start with http:// or https://' });
      }

      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlKey) {
        return res.status(500).json({ success: false, error: 'URL scraping not configured' });
      }

      const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firecrawlKey}`,
        },
        body: JSON.stringify({ url: url.trim(), formats: ['markdown'] }),
        signal: AbortSignal.timeout(30000),
      });

      if (!scrapeRes.ok) {
        console.error('[ads/synthesize] Firecrawl error:', scrapeRes.status);
        return res.json({ success: false, error: 'Could not access URL' });
      }

      const scrapeData = await scrapeRes.json();
      const markdown = scrapeData?.data?.markdown;

      if (markdown && markdown.trim()) {
        sources.push(`## Webpage Content (from ${url})\n\n${markdown.slice(0, 30000)}`);
      } else {
        sources.push(`## Webpage Content (from ${url})\n\n[Limited content found — page may be JavaScript-heavy or restricted]`);
      }
    }

    // 2. Fetch Brand Kit if provided
    if (hasBrandKit) {
      const { data: brand, error: brandErr } = await supabase
        .from('brand_kit')
        .select('*')
        .eq('id', brand_kit_id)
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (brandErr || !brand) {
        return res.json({ success: false, error: 'Brand kit not found' });
      }

      const brandLines = [
        '## Brand Kit Data',
        brand.brand_name ? `Brand Name: ${brand.brand_name}` : null,
        brand.blurb ? `Description: ${brand.blurb}` : null,
        brand.website ? `Website: ${brand.website}` : null,
        brand.taglines?.length ? `Taglines: ${brand.taglines.join('; ')}` : null,
        brand.target_market ? `Target Market: ${brand.target_market}` : null,
        brand.brand_personality ? `Brand Personality: ${brand.brand_personality}` : null,
        brand.brand_voice_detail ? `Voice Detail: ${brand.brand_voice_detail}` : null,
        brand.voice_style ? `Voice Style: ${brand.voice_style}` : null,
        brand.content_style_rules ? `Content Style Rules: ${brand.content_style_rules}` : null,
        brand.preferred_elements ? `Preferred Elements: ${brand.preferred_elements}` : null,
        brand.prohibited_elements ? `Prohibited Elements: ${brand.prohibited_elements}` : null,
        brand.colors?.length ? `Colors: ${brand.colors.join(', ')}` : null,
        brand.style_preset ? `Style Preset: ${brand.style_preset}` : null,
        brand.visual_style_notes ? `Visual Style: ${brand.visual_style_notes}` : null,
        brand.mood_atmosphere ? `Mood/Atmosphere: ${brand.mood_atmosphere}` : null,
        brand.lighting_prefs ? `Lighting: ${brand.lighting_prefs}` : null,
        brand.composition_style ? `Composition: ${brand.composition_style}` : null,
        brand.ai_prompt_rules ? `AI Prompt Rules: ${brand.ai_prompt_rules}` : null,
      ].filter(Boolean).join('\n');

      sources.push(brandLines);
    }

    // 3. LLM synthesis
    const openai = new OpenAI({ apiKey: openaiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Synthesize a cohesive product/service description from these sources:\n\n${sources.join('\n\n')}` },
      ],
    });

    const description = completion.choices[0]?.message?.content?.trim();
    if (!description) {
      return res.json({ success: false, error: 'Failed to generate description' });
    }

    logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'ads_synthesize_description',
      model: 'gpt-4.1-mini',
      prompt_tokens: completion.usage?.prompt_tokens,
      completion_tokens: completion.usage?.completion_tokens,
      metadata: { has_url: !!hasUrl, has_brand_kit: !!hasBrandKit },
    }).catch(() => {});

    return res.json({ success: true, description });
  } catch (err) {
    console.error('[ads/synthesize-description]', err);
    if (err.name === 'TimeoutError') {
      return res.json({ success: false, error: 'URL took too long to load' });
    }
    return res.json({ success: false, error: 'Failed to generate description' });
  }
}
