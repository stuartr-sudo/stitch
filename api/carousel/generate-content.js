import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { scrapeArticle } from '../lib/pipelineHelpers.js';
import { fetchUrlContent, resolveExaKey } from '../lib/newsjackScorer.js';
import { logCost } from '../lib/costLogger.js';

const SlideSchema = z.object({
  slide_type: z.enum(['hook', 'content', 'stat', 'quote', 'cta', 'image_focus']),
  headline: z.string(),
  body_text: z.string().optional().default(''),
  stat_value: z.string().optional().default(''),
  stat_label: z.string().optional().default(''),
  cta_text: z.string().optional().default(''),
  image_prompt: z.string(),
});

const CarouselContentSchema = z.object({
  slides: z.array(SlideSchema).min(3).max(20),
  caption_text: z.string(),
});

const PLATFORM_GUIDANCE = {
  instagram: { maxSlides: 20, textDensity: 'medium', ratioNote: 'portrait 4:5 or square 1:1' },
  linkedin: { maxSlides: 20, textDensity: 'higher — more text per slide is fine', ratioNote: 'square 1:1' },
  tiktok: { maxSlides: 35, textDensity: 'lower — big bold text, fewer words', ratioNote: 'vertical 9:16' },
  facebook: { maxSlides: 10, textDensity: 'medium', ratioNote: 'square 1:1' },
};

const ANTI_SLOP = `RULES (violating any = rejection):
- NO filler: "In today's world", "Let's dive in", "Here's the thing"
- NO hedging: "might", "could potentially", "it's possible"
- NO AI clichés: "landscape", "navigate", "leverage", "robust", "delve", "tapestry"
- NO emojis in slide text
- Every line must add value — no repetition
- Be specific: use real names, real numbers, real places
- Write like a sharp human, not a language model`;

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'carousel id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Fetch carousel
  const { data: carousel, error: cErr } = await supabase
    .from('carousels')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (cErr || !carousel) return res.status(404).json({ error: 'Carousel not found' });

  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });

  const client = new OpenAI({ apiKey: keys.openaiKey });

  // Get content — from source_url or manual topic from request body
  let content = carousel.source_content;
  const { topic, bullet_points } = req.body || {};

  if (carousel.source_url && (!content || content.length < 200)) {
    // Try to scrape the URL
    try {
      const exaKey = await resolveExaKey(req.user.id);
      content = await fetchUrlContent(carousel.source_url, exaKey);
      if (!content || content.length < 200) {
        content = await scrapeArticle(carousel.source_url, process.env.FIRECRAWL_API_KEY);
      }
      // Cache the scraped content
      if (content) {
        await supabase.from('carousels').update({ source_content: content }).eq('id', id);
      }
    } catch (err) {
      console.warn('[carousel/generate-content] Scrape failed:', err.message);
    }
  }

  // Fetch brand kit if linked
  let brandContext = '';
  if (carousel.brand_kit_id) {
    const { data: brand } = await supabase
      .from('brand_kit')
      .select('*')
      .eq('id', carousel.brand_kit_id)
      .single();

    if (brand) {
      brandContext = [
        brand.brand_name ? `Brand: ${brand.brand_name}` : null,
        brand.blurb ? `About: ${brand.blurb}` : null,
        brand.brand_voice_detail ? `Voice: ${brand.brand_voice_detail}` : null,
        brand.content_style_rules ? `Style rules: ${brand.content_style_rules}` : null,
        brand.preferred_elements ? `Include: ${brand.preferred_elements}` : null,
        brand.prohibited_elements ? `Avoid: ${brand.prohibited_elements}` : null,
        brand.target_market ? `Audience: ${brand.target_market}` : null,
      ].filter(Boolean).join('\n');
    }
  }

  const platformInfo = PLATFORM_GUIDANCE[carousel.platform] || PLATFORM_GUIDANCE.instagram;

  const systemPrompt = `You are a carousel content strategist. Create a slide-by-slide carousel plan.

OUTPUT FORMAT: JSON matching the schema exactly.

CAROUSEL STRUCTURE:
- Slide 1 MUST be type "hook" — a bold, attention-grabbing statement (3-8 words max)
- Middle slides (3-7): mix of "content", "stat", "quote", and "image_focus" types
- Last slide MUST be type "cta" — a clear call to action
- Total: ${platformInfo.maxSlides > 10 ? '5-12' : '5-8'} slides

SLIDE TYPE GUIDELINES:
- hook: Short, punchy headline only (no body_text). This stops the scroll.
- content: headline (key point, max 8 words) + body_text (1-2 sentences expanding on it)
- stat: stat_value (the number, e.g. "73%", "$2.4M", "10x") + stat_label (what the stat means) + headline (optional context)
- quote: headline contains the quote text (a memorable line from the source)
- image_focus: headline is a short caption; the AI image is the star
- cta: cta_text (the call to action) + headline (supporting context)

IMAGE PROMPTS:
- Each slide needs an image_prompt describing a relevant, professional background image
- Keep prompts visual and concrete (objects, scenes, lighting)
- Don't describe text or overlays — only the background image content
- Each prompt should feel cohesive with the carousel's visual theme

CAPTION:
- Generate a caption_text for the social media post (150-300 words for LinkedIn, 50-150 for others)
- Include key takeaways and a call to engage

PLATFORM: ${carousel.platform} (${platformInfo.ratioNote})
TEXT DENSITY: ${platformInfo.textDensity}

${ANTI_SLOP}`;

  // If topic mode (no URL content), do web research first
  if (!content && topic) {
    try {
      const searchApiKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
      if (searchApiKey) {
        console.log(`[carousel/generate-content] Researching topic: "${topic}"`);
        const [newsRes, organicRes] = await Promise.allSettled([
          fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams({
            engine: 'google_news', q: topic, api_key: searchApiKey, num: 5
          })}`).then(r => r.json()),
          fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams({
            engine: 'google', q: topic, api_key: searchApiKey, num: 5
          })}`).then(r => r.json()),
        ]);

        const researchArticles = [];
        if (newsRes.status === 'fulfilled' && newsRes.value.news_results) {
          for (const item of newsRes.value.news_results.slice(0, 3)) {
            researchArticles.push({ title: item.title, snippet: item.snippet || item.description || '', url: item.link || item.url });
          }
        }
        if (organicRes.status === 'fulfilled' && organicRes.value.organic_results) {
          for (const item of organicRes.value.organic_results.slice(0, 3)) {
            if (!researchArticles.some(a => a.url === item.link)) {
              researchArticles.push({ title: item.title, snippet: item.snippet || '', url: item.link });
            }
          }
        }

        // Try to scrape top 3 for deeper content
        if (researchArticles.length > 0) {
          const scrapeResults = await Promise.allSettled(
            researchArticles.slice(0, 3).map(async (art) => {
              try {
                const exaKey = await resolveExaKey(req.user.id);
                const scraped = await fetchUrlContent(art.url, exaKey);
                return scraped ? scraped.slice(0, 2000) : '';
              } catch { return ''; }
            })
          );

          const researchBrief = researchArticles.map((art, i) => {
            const scraped = scrapeResults[i]?.status === 'fulfilled' ? scrapeResults[i].value : '';
            return `--- ${art.title} ---\n${art.snippet}\n${scraped}`;
          }).join('\n\n');

          content = `RESEARCH ON "${topic}":\n\n${researchBrief}`;
          console.log(`[carousel/generate-content] Research gathered ${researchArticles.length} sources, ${content.length} chars`);
        }

        logCost({ username: req.user.email, category: 'searchapi', operation: 'carousel_research' }).catch(() => {});
      }
    } catch (err) {
      console.warn('[carousel/generate-content] Research failed, falling back to topic-only:', err.message);
    }
  }

  let userMessage;
  if (content) {
    userMessage = `Create a carousel from this content:\n\n${content.slice(0, 8000)}`;
    if (topic) userMessage += `\n\nTopic focus: ${topic}`;
  } else if (topic) {
    userMessage = `Create a carousel about: ${topic}${bullet_points ? `\n\nKey points:\n${bullet_points}` : ''}`;
  } else {
    return res.status(400).json({ error: 'No source_url or topic provided. Set source_url on the carousel or pass topic in the request body.' });
  }

  if (brandContext) {
    userMessage += `\n\nBRAND CONTEXT:\n${brandContext}`;
  }

  try {
    const completion = await client.chat.completions.parse({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'carousel_content',
          schema: {
            type: 'object',
            properties: {
              slides: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    slide_type: { type: 'string', enum: ['hook', 'content', 'stat', 'quote', 'cta', 'image_focus'] },
                    headline: { type: 'string' },
                    body_text: { type: 'string' },
                    stat_value: { type: 'string' },
                    stat_label: { type: 'string' },
                    cta_text: { type: 'string' },
                    image_prompt: { type: 'string' },
                  },
                  required: ['slide_type', 'headline', 'image_prompt'],
                  additionalProperties: false,
                },
              },
              caption_text: { type: 'string' },
            },
            required: ['slides', 'caption_text'],
            additionalProperties: false,
          },
          strict: true,
        },
      },
      temperature: 0.7,
      max_tokens: 4000,
    });

    logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'carousel_content_generation',
      model: 'gpt-4.1',
      input_tokens: completion.usage?.prompt_tokens || 0,
      output_tokens: completion.usage?.completion_tokens || 0,
    }).catch(() => {});

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed?.slides?.length) {
      return res.status(500).json({ error: 'Failed to generate carousel content' });
    }

    // Delete existing slides for this carousel (fresh generation)
    await supabase.from('carousel_slides').delete().eq('carousel_id', id);

    // Insert new slides
    const slideRows = parsed.slides.map((slide, i) => ({
      carousel_id: id,
      slide_number: i + 1,
      slide_type: slide.slide_type,
      headline: slide.headline || '',
      body_text: slide.body_text || '',
      stat_value: slide.stat_value || '',
      stat_label: slide.stat_label || '',
      cta_text: slide.cta_text || '',
      image_prompt: slide.image_prompt || '',
      generation_status: 'pending',
    }));

    const { data: slides, error: insertErr } = await supabase
      .from('carousel_slides')
      .insert(slideRows)
      .select();

    if (insertErr) return res.status(500).json({ error: insertErr.message });

    // Update carousel metadata
    await supabase
      .from('carousels')
      .update({
        slide_count: parsed.slides.length,
        caption_text: parsed.caption_text,
        status: 'draft',
      })
      .eq('id', id);

    return res.json({
      success: true,
      slides: slides.sort((a, b) => a.slide_number - b.slide_number),
      caption_text: parsed.caption_text,
    });
  } catch (err) {
    console.error('[carousel/generate-content] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
