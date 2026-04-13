import { createClient } from '@supabase/supabase-js';
import { scrapeArticle } from '../lib/pipelineHelpers.js';
import { fetchUrlContent, resolveExaKey } from '../lib/newsjackScorer.js';
import { logCost } from '../lib/costLogger.js';
import { generateCarouselContent } from '../lib/carouselProductionEngine.js';

// ─── Research gathering ──────────────────────────────────────────────────────

async function gatherResearch(topic, userId, userEmail) {
  const searchApiKey = process.env.SEARCHAPI_KEY || process.env.SERP_API_KEY;
  if (!searchApiKey) return null;

  console.log(`[carousel/generate-content] Researching topic: "${topic}"`);

  const [newsRes, organicRes] = await Promise.allSettled([
    fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams({
      engine: 'google_news', q: topic, api_key: searchApiKey, num: 5,
    })}`).then(r => r.json()),
    fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams({
      engine: 'google', q: topic, api_key: searchApiKey, num: 5,
    })}`).then(r => r.json()),
  ]);

  const articles = [];
  if (newsRes.status === 'fulfilled' && newsRes.value.news_results) {
    for (const item of newsRes.value.news_results.slice(0, 3)) {
      articles.push({ title: item.title, snippet: item.snippet || item.description || '', url: item.link || item.url });
    }
  }
  if (organicRes.status === 'fulfilled' && organicRes.value.organic_results) {
    for (const item of organicRes.value.organic_results.slice(0, 3)) {
      if (!articles.some(a => a.url === item.link)) {
        articles.push({ title: item.title, snippet: item.snippet || '', url: item.link });
      }
    }
  }

  if (articles.length === 0) return null;

  const scrapeResults = await Promise.allSettled(
    articles.slice(0, 3).map(async (art) => {
      try {
        const exaKey = await resolveExaKey(userId);
        const scraped = await fetchUrlContent(art.url, exaKey);
        return scraped ? scraped.slice(0, 3000) : '';
      } catch { return ''; }
    })
  );

  const formattedArticles = articles.map((art, i) => {
    const scraped = scrapeResults[i]?.status === 'fulfilled' ? scrapeResults[i].value : '';
    return `SOURCE ${i + 1}: "${art.title}"\nURL: ${art.url}\nSummary: ${art.snippet}\n${scraped ? `Full text excerpt:\n${scraped}` : '(full text unavailable)'}`;
  }).join('\n\n---\n\n');

  logCost({ username: userEmail, category: 'searchapi', operation: 'carousel_research' }).catch(() => {});

  return `RESEARCH RESULTS FOR: "${topic}"\n${articles.length} sources found.\n\n${formattedArticles}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'carousel id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: carousel, error: cErr } = await supabase
    .from('carousels')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (cErr || !carousel) return res.status(404).json({ error: 'Carousel not found' });

  // ── Gather content ──
  let content = carousel.source_content;
  const { topic, bullet_points, slide_count } = req.body || {};

  if (carousel.source_url && (!content || content.length < 200)) {
    try {
      const exaKey = await resolveExaKey(req.user.id);
      content = await fetchUrlContent(carousel.source_url, exaKey);
      if (!content || content.length < 200) {
        content = await scrapeArticle(carousel.source_url, process.env.FIRECRAWL_API_KEY);
      }
      if (content) {
        await supabase.from('carousels').update({ source_content: content }).eq('id', id);
      }
    } catch (err) {
      console.warn('[carousel/generate-content] Scrape failed:', err.message);
    }
  }

  if (!content && topic) {
    try {
      content = await gatherResearch(topic, req.user.id, req.user.email);
    } catch (err) {
      console.warn('[carousel/generate-content] Research failed:', err.message);
    }
  }

  if (content && bullet_points) {
    content += `\n\nUSER'S KEY POINTS (prioritize these):\n${bullet_points}`;
  } else if (!content && topic) {
    content = `Topic: ${topic}${bullet_points ? `\n\nKey points the user wants covered:\n${bullet_points}` : ''}`;
  } else if (!content && !topic) {
    return res.status(400).json({ error: 'No source_url or topic provided.' });
  }

  // ── Fetch brand context ──
  let brandContext = null;
  if (carousel.brand_kit_id) {
    const { data: brand } = await supabase
      .from('brand_kit')
      .select('*')
      .eq('id', carousel.brand_kit_id)
      .single();

    if (brand) {
      brandContext = {
        brand_name: brand.brand_name,
        blurb: brand.blurb,
        brand_voice_detail: brand.brand_voice_detail,
        content_style_rules: brand.content_style_rules,
        preferred_elements: brand.preferred_elements,
        prohibited_elements: brand.prohibited_elements,
        target_market: brand.target_market,
      };
    }
  }

  // ── Fetch brand profile for deep brand mode ──
  let brandProfile = null;
  if (carousel.brand_kit_id) {
    const { data: profile } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('brand_kit_id', carousel.brand_kit_id)
      .single();
    if (profile) brandProfile = profile;
  }

  try {
    console.log(`[carousel/generate-content] Generating carousel content for ${id} via production engine...`);

    const result = await generateCarouselContent({
      content,
      topic: topic || carousel.title,
      platform: carousel.platform,
      slideCount: slide_count ? parseInt(slide_count, 10) : null,
      stylePreset: carousel.style_preset || null,
      brandContext,
      brandProfile,
      contentAngle: null,
      username: req.user.email,
    });

    if (!result?.slides?.length) {
      return res.status(500).json({ error: 'Content generation failed — no slides produced' });
    }

    console.log(`[carousel/generate-content] ${result.slides.length} slides generated. Arc: ${result.narrative_strategy?.arc_type}, Driver: ${result.narrative_strategy?.driver}`);

    // ── Save to DB ──
    await supabase.from('carousel_slides').delete().eq('carousel_id', id);

    const slideRows = result.slides.map((slide, i) => ({
      carousel_id: id,
      slide_number: i + 1,
      slide_type: slide.slide_type,
      headline: slide.headline,
      body_text: slide.body_text,
      stat_value: '',
      stat_label: '',
      cta_text: '',
      image_prompt: slide.image_prompt || '',
      generation_status: 'pending',
    }));

    const { data: slides, error: insertErr } = await supabase
      .from('carousel_slides')
      .insert(slideRows)
      .select();

    if (insertErr) return res.status(500).json({ error: insertErr.message });

    // Save visual_world + narrative metadata on the carousel
    await supabase
      .from('carousels')
      .update({
        slide_count: result.slides.length,
        caption_text: result.caption_text,
        visual_world: result.visual_world,
        narrative_strategy: result.narrative_strategy || null,
        status: 'draft',
      })
      .eq('id', id);

    return res.json({
      success: true,
      slides: slides.sort((a, b) => a.slide_number - b.slide_number),
      caption_text: result.caption_text,
      narrative_strategy: result.narrative_strategy,
      visual_world: result.visual_world,
      image_hook: result.image_hook,
      brand_violations: result.brand_violations,
    });
  } catch (err) {
    console.error('[carousel/generate-content] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
