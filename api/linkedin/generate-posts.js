import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { fetchUrlContent, resolveExaKey } from '../lib/newsjackScorer.js';
import { composeImage } from '../lib/composeImage.js';
import { composeLinkedInSatori } from '../lib/composeLinkedInSatori.js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';
import { getPostFormat } from '../lib/postFormatTemplates.js';

const ANTI_SLOP = `RULES (violating any = rejection):
- First line MUST be under 200 characters
- NO filler: "In today's world", "Let's dive in", "Here's the thing"
- NO hedging: "might", "could potentially", "it's possible"
- NO AI clichés: "landscape", "navigate", "leverage", "robust", "delve", "tapestry"
- NO emojis, NO hashtags, NO markdown formatting
- Every sentence must add new information — no repetition
- Be specific: use real names, real numbers, real places
- Write like a sharp human, not a language model`;

const STYLE_PROMPTS = {
  contrarian: `Write a LinkedIn post using the Contrarian Insight style. Make a bold claim that challenges conventional thinking about this topic, then explain why the common take is wrong. 150-250 words.\n\n${ANTI_SLOP}`,
  story: `Write a LinkedIn post using the Story-Led style. Open with a vivid scene — a specific person, place, or moment. Tell a mini narrative that draws the reader in. 150-250 words.\n\n${ANTI_SLOP}`,
  data: `Write a LinkedIn post using the Data/Stat Punch style. Lead with a surprising number or concrete fact from the source material. 100-200 words.\n\n${ANTI_SLOP}`,
};

/** Strip UTM params and return clean domain/path for source attribution */
function cleanSourceUrl(url) {
  try {
    const u = new URL(url);
    // Strip UTM and tracking params
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
        u.searchParams.delete(key);
      }
    }
    const path = u.pathname === '/' ? '' : u.pathname;
    const search = u.search || '';
    return `${u.hostname.replace(/^www\./, '')}${path}${search}`;
  } catch {
    return url;
  }
}

/** Clean post body: strip emojis, markdown, fix camelCase joins, fix punctuation spacing */
function cleanPostBody(body) {
  let text = body;
  // Strip emojis
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, '');
  // Strip markdown bold/italic
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  // Strip hashtags
  text = text.replace(/#\w+/g, '');
  // Fix camelCase joins (e.g. "riskManagement" → "risk Management")
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  // Fix missing space after period (e.g. "fact.The" → "fact. The")
  text = text.replace(/\.([A-Z])/g, '. $1');
  // Clean up extra whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

export default async function handler(req, res) {
  const {
    topic_id, template_index,
    style_preset, brand_kit_id, carousel_style,
    style_overrides, post_format, writing_style,
  } = req.body || {};
  const formatTemplate = post_format ? getPostFormat(post_format) : null;
  if (!topic_id) return res.status(400).json({ error: 'topic_id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch topic + verify ownership
    const { data: topic, error: topicErr } = await supabase
      .from('linkedin_topics')
      .select('*')
      .eq('id', topic_id)
      .eq('user_id', req.user.id)
      .single();

    if (topicErr || !topic) return res.status(404).json({ error: 'Topic not found' });

    // Exa enrichment: fetch full content if missing OR too short (<500 chars)
    let content = topic.full_content;
    if (!content || content.length < 500) {
      const exaKey = await resolveExaKey(req.user.id);
      const fetched = await fetchUrlContent(topic.url, exaKey);
      if (fetched && fetched.length > (content?.length || 0)) {
        content = fetched;
        await supabase.from('linkedin_topics').update({ full_content: content }).eq('id', topic_id);
      }
    }

    // Resolve keys
    const keys = await getUserKeys(req.user.id, req.user.email);
    if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });

    const client = new OpenAI({ apiKey: keys.openaiKey });

    // Fetch config for CTA and brand context
    const { data: config } = await supabase
      .from('linkedin_config')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    const { data: brand } = await supabase
      .from('brand_kit')
      .select('brand_name, tagline, industry, target_audience, logo_url')
      .eq('user_id', req.user.id)
      .maybeSingle();

    const brandContext = [
      brand?.brand_name ? `Brand: ${brand.brand_name}` : null,
      brand?.industry ? `Industry: ${brand.industry}` : null,
      brand?.target_audience ? `Audience: ${brand.target_audience}` : null,
    ].filter(Boolean).join('\n');

    const userMessage = `Source article: ${topic.headline}\nURL: ${topic.url}\n\nArticle content:\n${content || topic.snippet || '(no content available)'}\n\n${brandContext ? `Brand context:\n${brandContext}` : ''}`;

    // Determine post number and template
    const { data: maxNum } = await supabase
      .from('linkedin_posts')
      .select('post_number')
      .eq('user_id', req.user.id)
      .not('post_number', 'is', null)
      .order('post_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const postNumber = (maxNum?.post_number || 0) + 1;
    const tplIndex = template_index != null ? template_index : (postNumber - 1) % 6;

    // Determine which styles to generate
    // When a post format is specified, generate format-specific variations
    // When a specific writing_style is chosen (not 'all'), generate only that style
    let styles;
    if (formatTemplate) {
      // Format mode: generate 3 variations using the format's LinkedIn prompt
      styles = ['format_v1', 'format_v2', 'format_v3'];
    } else if (writing_style && writing_style !== 'all') {
      styles = [writing_style];
    } else {
      styles = ['contrarian', 'story', 'data'];
    }

    const results = await Promise.allSettled(
      styles.map(async (style) => {
        let systemPrompt;
        if (formatTemplate) {
          // Use format-specific LinkedIn prompt with anti-slop rules
          systemPrompt = `${formatTemplate.linkedinPrompt}\n\n${ANTI_SLOP}`;
        } else {
          systemPrompt = STYLE_PROMPTS[style];
        }

        const completion = await client.chat.completions.create({
          model: 'gpt-4.1',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: formatTemplate ? 0.85 : 0.8,
          max_tokens: 1000,
        });

        const usage = completion.usage;
        logCost({
          username: req.user.email,
          category: 'openai',
          operation: 'linkedin_generation',
          model: 'gpt-4.1',
          input_tokens: usage?.prompt_tokens || 0,
          output_tokens: usage?.completion_tokens || 0,
        }).catch(() => {});

        let body = completion.choices[0]?.message?.content?.trim() || '';
        body = cleanPostBody(body);

        // Append source as plain text (not hyperlinked)
        body += `\n\nsrc: ${cleanSourceUrl(topic.url)}`;

        // Append CTA if configured (this one IS a hyperlink)
        if (config?.linkedin_cta_text && config?.linkedin_cta_url) {
          body += `\n${config.linkedin_cta_text} → ${config.linkedin_cta_url}`;
        }

        return { style, body };
      })
    );

    // Generate excerpt via gpt-5-mini — pull a compelling insight from the full article
    let excerpt = '';
    try {
      const excerptSource = content || topic.snippet || topic.headline || '';
      const excerptCompletion = await client.chat.completions.create({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: 'Extract the single most compelling or surprising 6-12 word phrase from this article that would make someone stop scrolling. It should capture a key insight, not just restate the headline. Use sentence case (capitalize only the first word and proper nouns). Return only the phrase, no quotation marks.' },
          { role: 'user', content: `Headline: ${topic.headline}\n\nArticle:\n${excerptSource.slice(0, 2000)}` },
        ],
        temperature: 0.3,
        max_tokens: 50,
      });
      excerpt = excerptCompletion.choices[0]?.message?.content?.trim() || '';
      // Strip any quotation marks the model may have added
      excerpt = excerpt.replace(/^["'\u201C\u201D\u2018\u2019]+|["'\u201C\u201D\u2018\u2019]+$/g, '');
      logCost({
        username: req.user.email,
        category: 'openai',
        operation: 'linkedin_excerpt',
        model: 'gpt-5-mini',
        input_tokens: excerptCompletion.usage?.prompt_tokens || 0,
        output_tokens: excerptCompletion.usage?.completion_tokens || 0,
      }).catch(() => {});
    } catch (err) {
      console.warn('[linkedin/generate-posts] Excerpt generation failed:', err.message);
      excerpt = topic.headline?.slice(0, 80) || '';
    }

    // Generate base image via FAL Nano Banana 2
    let squareImageUrl = null;
    let storedBaseImageUrl = null;
    if (keys.falKey) {
      try {
        // Build image prompt — inject style_preset promptText if provided
        let imagePrompt = `Professional editorial photograph for LinkedIn post about: ${topic.headline}. Clean, modern, business context. No text, no logos.`;
        if (style_preset) {
          imagePrompt = `${style_preset}. LinkedIn post about: ${topic.headline}. No text, no logos.`;
        }

        const falRes = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
          method: 'POST',
          headers: {
            Authorization: `Key ${keys.falKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: imagePrompt,
            image_size: 'square_hd',
            num_images: 1,
          }),
        });

        if (falRes.ok) {
          const falData = await falRes.json();
          let baseImageUrl = null;
          const requestId = falData.request_id;
          if (requestId) {
            for (let i = 0; i < 30; i++) {
              await new Promise(r => setTimeout(r, 2000));
              const statusRes = await fetch(`https://queue.fal.run/fal-ai/nano-banana-2/requests/${requestId}/status`, {
                headers: { Authorization: `Key ${keys.falKey}` },
              });
              const statusData = await statusRes.json();
              if (statusData.status === 'COMPLETED') {
                const resultRes = await fetch(`https://queue.fal.run/fal-ai/nano-banana-2/requests/${requestId}`, {
                  headers: { Authorization: `Key ${keys.falKey}` },
                });
                const resultData = await resultRes.json();
                baseImageUrl = resultData.images?.[0]?.url;
                break;
              }
              if (statusData.status === 'FAILED') break;
            }
          } else if (falData.images?.[0]?.url) {
            baseImageUrl = falData.images[0].url;
          }

          logCost({
            username: req.user.email,
            category: 'fal',
            operation: 'linkedin_base_image',
            model: 'nano-banana-2',
          }).catch(() => {});

          // Upload base image to Supabase for persistence (FAL CDN URLs expire)
          if (baseImageUrl) {
            try {
              storedBaseImageUrl = await uploadUrlToSupabase(baseImageUrl, supabase, 'linkedin');
            } catch (err) {
              console.warn('[linkedin/generate-posts] Base image upload failed:', err.message);
              storedBaseImageUrl = baseImageUrl; // fallback to FAL URL
            }
          }

          // Compose branded square image using Satori compositor
          const effectiveCarouselStyle = carousel_style || 'bold_editorial';
          if (baseImageUrl) {
            try {
              const composedBuffer = await composeLinkedInSatori({
                backgroundImageUrl: baseImageUrl,
                logoUrl: brand?.logo_url,
                excerpt,
                seriesTitle: config?.series_title || 'INDUSTRY WATCH',
                postNumber,
                carouselStyle: effectiveCarouselStyle,
                templateIndex: tplIndex,
                styleOverrides: style_overrides,
              });

              const ts = Date.now();
              const rand = Math.random().toString(36).slice(2, 8);
              const { data: upload, error: uploadErr } = await supabase.storage
                .from('media')
                .upload(`linkedin/composed-sq-${ts}-${rand}.png`, composedBuffer, { contentType: 'image/png', upsert: false });

              if (!uploadErr) {
                const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(upload.path);
                squareImageUrl = publicUrl.publicUrl;
              }
            } catch (err) {
              console.warn('[linkedin/generate-posts] Satori composition failed, falling back to legacy:', err.message);
              // Fallback to legacy composeImage if Satori fails
              if (brand?.logo_url) {
                try {
                  const squareBuffer = await composeImage({
                    image_url: baseImageUrl,
                    logo_url: brand.logo_url,
                    series_title: config?.series_title || 'INDUSTRY WATCH',
                    post_number: postNumber,
                    excerpt,
                    template_index: tplIndex,
                    format: 'square',
                  });
                  const ts2 = Date.now();
                  const rand2 = Math.random().toString(36).slice(2, 8);
                  const { data: upload2, error: uploadErr2 } = await supabase.storage
                    .from('media')
                    .upload(`linkedin/composed-sq-${ts2}-${rand2}.png`, squareBuffer, { contentType: 'image/png', upsert: false });
                  if (!uploadErr2) {
                    const { data: publicUrl2 } = supabase.storage.from('media').getPublicUrl(upload2.path);
                    squareImageUrl = publicUrl2.publicUrl;
                  }
                } catch (fallbackErr) {
                  console.warn('[linkedin/generate-posts] Legacy fallback also failed:', fallbackErr.message);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[linkedin/generate-posts] Base image generation failed:', err.message);
      }
    }

    // Insert successful posts
    const posts = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { style, body } = result.value;
        const { data: post, error: postErr } = await supabase
          .from('linkedin_posts')
          .insert({
            user_id: req.user.id,
            topic_id,
            style,
            body,
            excerpt,
            post_number: postNumber,
            template_index: tplIndex,
            featured_image_square: squareImageUrl,
            base_image_url: storedBaseImageUrl,
            carousel_style: carousel_style || 'bold_editorial',
            style_preset: style_preset || null,
            brand_kit_id: brand_kit_id || null,
            post_format: post_format || null,
            style_overrides: style_overrides || {},
          })
          .select()
          .single();

        if (!postErr && post) posts.push(post);
      }
    }

    // Update topic status
    await supabase.from('linkedin_topics').update({ status: 'generated' }).eq('id', topic_id);

    return res.json({ success: true, posts });
  } catch (err) {
    console.error('[linkedin/generate-posts] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
