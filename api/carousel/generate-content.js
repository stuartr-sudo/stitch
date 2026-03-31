import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { scrapeArticle } from '../lib/pipelineHelpers.js';
import { fetchUrlContent, resolveExaKey } from '../lib/newsjackScorer.js';
import { logCost } from '../lib/costLogger.js';
import { getPostFormat } from '../lib/postFormatTemplates.js';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const SynthesisSchema = {
  type: 'object',
  properties: {
    thesis: { type: 'string', description: 'The ONE core argument or insight this carousel will make (1 sentence)' },
    angle: { type: 'string', description: 'The specific angle/framing — why should someone care right now? (1 sentence)' },
    hook_options: {
      type: 'array',
      items: { type: 'string' },
      description: '3 punchy hook lines (3-8 words each) that would stop a scroll',
    },
    story_beats: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          beat: { type: 'string', description: 'What this story beat reveals (1 sentence)' },
          evidence: { type: 'string', description: 'The specific fact/stat/quote that proves it' },
          source: { type: 'string' },
        },
        required: ['beat', 'evidence', 'source'],
        additionalProperties: false,
      },
      description: '5-8 sequential story beats that build on each other. NOT a random list — each must follow from the previous.',
    },
    narrative_arc: { type: 'string', description: 'The story in 2-3 sentences: what tension opens it, what insight resolves it, what action closes it' },
    visual_world: { type: 'string', description: 'A consistent SCENE SETTING for all slide backgrounds — describe the physical environment, not the artistic style. E.g. "kitchen countertop with herbs and cutting boards, warm morning window light, shallow depth of field". 1-2 sentences.' },
    cta_direction: { type: 'string', description: 'What should the reader do after reading? Be specific.' },
  },
  required: ['thesis', 'angle', 'hook_options', 'story_beats', 'narrative_arc', 'visual_world', 'cta_direction'],
  additionalProperties: false,
};

const SlideItemSchema = {
  type: 'object',
  properties: {
    slide_type: { type: 'string', enum: ['hook', 'story', 'conclusion'] },
    headline: { type: 'string', description: 'The main bold text. 3-10 words.' },
    body_text: { type: 'string', description: 'Supporting detail. 1-2 sentences for story/conclusion slides. Empty string for hook.' },
    image_prompt: { type: 'string', description: 'Scene description for background image. 20-40 words. Physical objects + camera angle only.' },
    transition_note: { type: 'string', description: 'Internal note: why does this slide follow the previous one?' },
  },
  required: ['slide_type', 'headline', 'body_text', 'image_prompt', 'transition_note'],
  additionalProperties: false,
};

const CarouselOutputSchema = {
  type: 'object',
  properties: {
    slides: { type: 'array', items: SlideItemSchema },
    caption_text: { type: 'string', description: 'The social media post caption. This EXPANDS on the slides with more detail — not a summary.' },
  },
  required: ['slides', 'caption_text'],
  additionalProperties: false,
};

// ─── Platform config ──────────────────────────────────────────────────────────

const PLATFORM_GUIDANCE = {
  instagram: { slideRange: '6-10', textDensity: 'medium — punchy headlines, 1-2 sentence bodies max', ratioNote: 'portrait 4:5 or square 1:1', captionLength: '150-250 words with hashtags' },
  linkedin: { slideRange: '6-10', textDensity: 'higher — more text per slide is acceptable, professionals read more', ratioNote: 'square 1:1', captionLength: '200-400 words, professional tone, end with a question' },
  tiktok: { slideRange: '5-8', textDensity: 'minimal — big bold text, 5-8 words per slide max', ratioNote: 'vertical 9:16', captionLength: '50-100 words, casual tone' },
  facebook: { slideRange: '5-8', textDensity: 'medium', ratioNote: 'square 1:1', captionLength: '100-200 words' },
};

// ─── Quality rules ────────────────────────────────────────────────────────────

const ANTI_SLOP = `HARD RULES — violating any means the output is rejected:
- ZERO filler phrases: "In today's world", "Let's dive in", "Here's the thing", "Did you know", "It's no secret"
- ZERO hedging: "might", "could potentially", "it's possible that"
- ZERO AI clichés: "landscape", "navigate", "leverage", "robust", "delve", "tapestry", "game-changer", "game changer", "change the game", "revolutionize", "unlock", "supercharge", "empower", "elevate", "seamless", "cutting-edge", "next-level", "harness"
- ZERO emojis in slide text (captions can have them sparingly)
- ZERO em dashes (—) — use hyphens (-) instead. This is a strict formatting rule.
- ZERO repetition — if you said it on slide 3, don't rephrase it on slide 5
- Every single line must contain a SPECIFIC claim, name, number, or concrete detail
- If you can't be specific, cut the slide entirely — fewer good slides beats more mediocre ones`;

const IMAGE_PROMPT_RULES = `IMAGE PROMPT CONSISTENCY — CRITICAL:
- ALL image prompts must describe the EXACT SAME physical environment: the visual_world from the brief
- Vary ONLY: camera angle (close-up, wide, overhead, eye-level), focus point, and minor compositional shifts
- Do NOT introduce new locations, objects, or settings between slides
- Think of it as ONE photo shoot in ONE location — you're just moving the camera
- NEVER include artistic style, medium, or aesthetic directions (no "watercolor", "cinematic", "illustration")
- NEVER describe text, overlays, UI elements, or typography
- NEVER use abstract concepts ("innovation", "growth", "success") — only physical, filmable things
- Keep prompts 20-40 words, starting with the environment, ending with the camera angle`;

// ─── Stage 1: Research Synthesis ──────────────────────────────────────────────

async function synthesizeResearch(client, content, topic, brandContext, platform, formatTemplate) {
  const platformInfo = PLATFORM_GUIDANCE[platform] || PLATFORM_GUIDANCE.instagram;
  const slideRange = formatTemplate
    ? `${formatTemplate.slideStructure.minSlides}-${formatTemplate.slideStructure.maxSlides}`
    : platformInfo.slideRange;

  const systemPrompt = `You are a research analyst preparing a creative brief for a carousel content writer.

Your job: read the raw research material and extract ONE compelling story from it.

CRITICAL: You are NOT writing the carousel. You are preparing a focused brief so that the writer (in the next step) has clean, specific material to work with.

Rules:
- Pick ONE thesis. Not three. Not a survey of the topic. ONE argument.
- The story_beats must be SEQUENTIAL — each beat builds on the previous one. Think: Setup → Tension → Evidence → Evidence → Insight → Resolution. NOT a random list of facts.
- Extract SPECIFIC facts with real numbers, names, dates, places. If the research doesn't contain specifics, say so — don't invent them.
- The hook_options should be provocative, curiosity-driven, and SHORT (3-8 words). They should make someone stop scrolling.
- The visual_world must describe a concrete PHYSICAL ENVIRONMENT — not an artistic style. Not "warm watercolor illustration" but "kitchen countertop next to a window, herb pots, cutting boards, morning sunlight". The artistic style is controlled separately. Describe only the setting, objects, and lighting.
- The narrative_arc should have genuine tension: what's the problem/surprise/contradiction that makes this worth reading?
${formatTemplate ? `\nPOST FORMAT: ${formatTemplate.label}\n${formatTemplate.synthesisPrompt}` : ''}

Platform: ${platform} (${platformInfo.ratioNote})
Target slide count: ${slideRange}`;

  const userMsg = content
    ? `Here is the raw research material. Extract one focused story from it:\n\n${content.slice(0, 10000)}${topic ? `\n\nThe user's intended topic focus: ${topic}` : ''}`
    : `The user wants a carousel about: ${topic}\n\nYou don't have research articles — work from your knowledge. Be specific with real facts, stats, and names. If you're not confident in a specific number, flag it as approximate.`;

  const fullUserMsg = brandContext
    ? `${userMsg}\n\nBRAND CONTEXT (adapt tone and angle to fit this brand):\n${brandContext}`
    : userMsg;

  const completion = await client.chat.completions.parse({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: fullUserMsg },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'research_synthesis',
        schema: SynthesisSchema,
        strict: true,
      },
    },
    temperature: 0.6,
    max_tokens: 2000,
  });

  return {
    synthesis: completion.choices[0]?.message?.parsed,
    usage: completion.usage,
  };
}

// ─── Stage 2: Slide Writing ───────────────────────────────────────────────────

async function writeSlides(client, synthesis, platform, brandContext, slideCount, formatTemplate) {
  const platformInfo = PLATFORM_GUIDANCE[platform] || PLATFORM_GUIDANCE.instagram;
  const slideTarget = slideCount
    ? `exactly ${slideCount}`
    : formatTemplate
      ? `${formatTemplate.slideStructure.minSlides}-${formatTemplate.slideStructure.maxSlides}`
      : platformInfo.slideRange;

  const systemPrompt = `You are an expert carousel copywriter. You receive a creative brief and write the actual slide-by-slide content.

YOUR BRIEF:
- Thesis: ${synthesis.thesis}
- Angle: ${synthesis.angle}
- Narrative arc: ${synthesis.narrative_arc}
- Scene setting: ${synthesis.visual_world}
- CTA direction: ${synthesis.cta_direction}

STORY BEATS (use these in order — they ARE the story):
${synthesis.story_beats.map((b, i) => `${i + 1}. ${b.beat}\n   Evidence: ${b.evidence} [source: ${b.source}]`).join('\n')}

HOOK OPTIONS (pick the best one or combine):
${synthesis.hook_options.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

THERE ARE ONLY 3 SLIDE TYPES — every slide looks the same, just different content:

1. "hook" (Slide 1 only):
   - headline: The scroll-stopping hook. 3-8 words MAX. Use one of the hook options above.
   - body_text: Empty string "". The hook has no body.

2. "story" (All middle slides):
   - headline: The key claim or point of this beat. Max 10 words.
   - body_text: The specific evidence, fact, or detail. 1-2 sentences.
   - Each story slide is ONE beat advancing the narrative. NOT a random fact.

3. "conclusion" (Final slide only):
   - headline: The takeaway or call-to-action. Max 8 words.
   - body_text: What should the reader do or think differently? 1 sentence.

STORY FLOW (CRITICAL):
- This is ONE story told across slides: Setup → Tension → Evidence → Insight → Resolution
- Each slide must EARN the next swipe. The reader should think "wait, tell me more"
- Use the transition_note to explain (to yourself) WHY this slide follows the previous one
- Good: "the hook sets up curiosity → this slide reveals the surprising answer → this slide shows the proof → this slide shows the consequence → this slide tells them what to do"
- BAD: random fact, random fact, random fact (no connective tissue)

IMAGE PROMPTS:
- ALL prompts describe the SAME environment: "${synthesis.visual_world}"
- Each slide shows a DIFFERENT angle or detail of this SAME location
- Slide 1: wide establishing shot. Slide 2: medium shot. Slide 3: close-up detail. Etc.
- NEVER introduce new locations. NEVER add style words. Physical objects + camera angle only.
- 20-40 words per prompt.

PLATFORM: ${platform}
- Text density: ${platformInfo.textDensity}
- Slide count: ${slideTarget} slides total

CAPTION (caption_text):
- The caption is NOT a summary of the slides — it EXPANDS on them.
- Include details, context, and nuance that didn't fit on slides.
- Think of slides as the trailer, caption as the article.
- ${platformInfo.captionLength}
- ${platform === 'linkedin' ? 'Professional but human tone. No hashtag spam — 3 max. End with an engaging question.' : ''}
- ${platform === 'instagram' ? 'Include 5-10 relevant hashtags at the end.' : ''}

${formatTemplate ? `\nPOST FORMAT RULES (${formatTemplate.label}):\n${formatTemplate.writingPrompt}` : ''}

${ANTI_SLOP}

${IMAGE_PROMPT_RULES}`;

  const completion = await client.chat.completions.parse({
    model: 'gpt-4.1',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Write the carousel now. Remember: ${synthesis.thesis}` },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'carousel_content',
        schema: CarouselOutputSchema,
        strict: true,
      },
    },
    temperature: 0.7,
    max_tokens: 4000,
  });

  return {
    output: completion.choices[0]?.message?.parsed,
    usage: completion.usage,
  };
}

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

  const keys = await getUserKeys(req.user.id, req.user.email);
  if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });

  const client = new OpenAI({ apiKey: keys.openaiKey });

  // ── Gather content ──
  let content = carousel.source_content;
  const { topic, bullet_points, slide_count, post_format } = req.body || {};
  const formatTemplate = post_format ? getPostFormat(post_format) : null;

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

  try {
    // ── STAGE 1: Research Synthesis ──
    console.log(`[carousel/generate-content] Stage 1: Synthesizing research for carousel ${id}...`);
    const { synthesis, usage: synthUsage } = await synthesizeResearch(
      client, content, topic, brandContext, carousel.platform, formatTemplate
    );

    if (!synthesis?.thesis) {
      return res.status(500).json({ error: 'Research synthesis failed — no thesis generated' });
    }

    console.log(`[carousel/generate-content] Stage 1 complete. Thesis: "${synthesis.thesis.slice(0, 80)}..."`);
    console.log(`[carousel/generate-content] Visual world: "${synthesis.visual_world.slice(0, 80)}..."`);

    logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'carousel_synthesis',
      model: 'gpt-4.1',
      input_tokens: synthUsage?.prompt_tokens || 0,
      output_tokens: synthUsage?.completion_tokens || 0,
    }).catch(() => {});

    // ── STAGE 2: Slide Writing ──
    console.log(`[carousel/generate-content] Stage 2: Writing slides...`);
    const { output, usage: writeUsage } = await writeSlides(
      client, synthesis, carousel.platform, brandContext, slide_count, formatTemplate
    );

    if (!output?.slides?.length) {
      return res.status(500).json({ error: 'Slide generation failed — no slides produced' });
    }

    console.log(`[carousel/generate-content] Stage 2 complete. ${output.slides.length} slides generated.`);

    logCost({
      username: req.user.email,
      category: 'openai',
      operation: 'carousel_slide_writing',
      model: 'gpt-4.1',
      input_tokens: writeUsage?.prompt_tokens || 0,
      output_tokens: writeUsage?.completion_tokens || 0,
    }).catch(() => {});

    // ── Save to DB ──
    await supabase.from('carousel_slides').delete().eq('carousel_id', id);

    // Strip em dashes from all text
    const stripEmDash = (s) => (s || '').replace(/—/g, ' - ').replace(/ {2,}/g, ' ').trim();

    const slideRows = output.slides.map((slide, i) => ({
      carousel_id: id,
      slide_number: i + 1,
      slide_type: slide.slide_type,
      headline: stripEmDash(slide.headline),
      body_text: stripEmDash(slide.body_text),
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

    // Save visual_world on the carousel for image consistency
    await supabase
      .from('carousels')
      .update({
        slide_count: output.slides.length,
        caption_text: stripEmDash(output.caption_text),
        visual_world: synthesis.visual_world,
        post_format: post_format || null,
        status: 'draft',
      })
      .eq('id', id);

    return res.json({
      success: true,
      slides: slides.sort((a, b) => a.slide_number - b.slide_number),
      caption_text: output.caption_text,
      synthesis: {
        thesis: synthesis.thesis,
        angle: synthesis.angle,
        visual_world: synthesis.visual_world,
      },
    });
  } catch (err) {
    console.error('[carousel/generate-content] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
