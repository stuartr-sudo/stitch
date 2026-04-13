import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { fetchUrlContent, resolveExaKey } from '../lib/newsjackScorer.js';
import { composeLinkedInSatori } from '../lib/composeLinkedInSatori.js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';
import { generateLinkedInPosts } from '../lib/linkedinProductionEngine.js';

/** Strip UTM params and return clean domain/path for source attribution */
function cleanSourceUrl(url) {
  try {
    const u = new URL(url);
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
  // Replace em dashes and en dashes with plain hyphens
  text = text.replace(/[\u2013\u2014]/g, ' - ');
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
    style_overrides, post_format,
  } = req.body || {};
  if (!topic_id) return res.status(400).json({ error: 'topic_id is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ── Fetch topic + verify ownership ──────────────────────────────────
    const { data: topic, error: topicErr } = await supabase
      .from('linkedin_topics')
      .select('*')
      .eq('id', topic_id)
      .eq('username', req.user.email)
      .single();

    if (topicErr || !topic) return res.status(404).json({ error: 'Topic not found' });

    // ── Exa enrichment: fetch full content if missing or short ──────────
    let content = topic.full_content;
    if (!content || content.length < 500) {
      const exaKey = await resolveExaKey(req.user.id);
      const fetched = await fetchUrlContent(topic.source_url, exaKey);
      if (fetched && fetched.length > (content?.length || 0)) {
        content = fetched;
        await supabase.from('linkedin_topics').update({ full_content: content }).eq('id', topic_id);
      }
    }

    // ── Resolve keys + config + brand ───────────────────────────────────
    const keys = await getUserKeys(req.user.id, req.user.email);

    const { data: config } = await supabase
      .from('linkedin_config')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    const brandQuery = supabase
      .from('brand_kit')
      .select('brand_name, tagline, industry, target_audience, logo_url')
      .eq('user_id', req.user.id);
    if (brand_kit_id) brandQuery.eq('id', brand_kit_id);
    const { data: brand } = await brandQuery.maybeSingle();

    // ── Generate posts via LinkedIn Production Engine (Claude) ──────────
    const engineResult = await generateLinkedInPosts({
      topic,
      content,
      brandContext: brand ? {
        brand_name: brand.brand_name,
        industry: brand.industry,
        target_audience: brand.target_audience,
        tagline: brand.tagline,
      } : null,
      postFormat: post_format || null,
      username: req.user.email,
    });

    // ── Determine post number and template index ────────────────────────
    const { data: maxNum } = await supabase
      .from('linkedin_posts')
      .select('post_number')
      .eq('username', req.user.email)
      .not('post_number', 'is', null)
      .order('post_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const postNumber = (maxNum?.post_number || 0) + 1;
    const tplIndex = template_index != null ? template_index : (postNumber - 1) % 6;

    // ── Generate base image via Nano Banana 2 ───────────────────────────
    // Use the first post's image_prompt from the engine (or fallback)
    let baseImageUrl = null;
    let storedBaseImageUrl = null;

    if (keys.falKey) {
      try {
        // Use the engine-generated image prompt (much better than generic)
        let imagePrompt = engineResult.posts[0]?.image_prompt
          || `Professional editorial photograph for LinkedIn post about: ${topic.source_title}. No text, no logos.`;

        // Inject visual style preset if provided
        if (style_preset) {
          imagePrompt = `${style_preset}. ${imagePrompt}`;
        }

        const falRes = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
          method: 'POST',
          headers: {
            Authorization: `Key ${keys.falKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: imagePrompt,
            image_size: 'portrait_4_3',
            num_images: 1,
          }),
        });

        if (falRes.ok) {
          const falData = await falRes.json();
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

          // Upload base image to Supabase (FAL CDN URLs expire)
          if (baseImageUrl) {
            try {
              storedBaseImageUrl = await uploadUrlToSupabase(baseImageUrl, supabase, 'linkedin');
            } catch (err) {
              console.warn('[linkedin/generate-posts] Base image upload failed:', err.message);
              storedBaseImageUrl = baseImageUrl;
            }
          }
        }
      } catch (err) {
        console.warn('[linkedin/generate-posts] Base image generation failed:', err.message);
      }
    }

    // ── Compose branded images per post (each gets its own hook text) ───
    const effectiveCarouselStyle = carousel_style || 'bold_editorial';

    async function composeImageForPost(postData) {
      if (!baseImageUrl) return null;
      try {
        const composedBuffer = await composeLinkedInSatori({
          backgroundImageUrl: baseImageUrl,
          logoUrl: brand?.logo_url,
          hookText: postData.image_hook || topic.source_title?.slice(0, 50),
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
          .upload(`linkedin/composed-sq-${ts}-${rand}.png`, composedBuffer, {
            contentType: 'image/png',
            upsert: false,
          });

        if (!uploadErr) {
          const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(upload.path);
          return publicUrl.publicUrl;
        }
      } catch (err) {
        console.warn('[linkedin/generate-posts] Satori composition failed:', err.message);
      }
      return null;
    }

    // ── Process each post: clean text, compose image, insert to DB ──────
    const posts = [];
    for (const postData of engineResult.posts) {
      // Clean the body text (safety net — engine should output clean text)
      let body = cleanPostBody(postData.body);

      // Append source attribution
      body += `\n\nsrc: ${cleanSourceUrl(topic.source_url)}`;

      // Append CTA if configured
      if (config?.linkedin_cta_text && config?.linkedin_cta_url) {
        body += `\n${config.linkedin_cta_text} → ${config.linkedin_cta_url}`;
      }

      // Compose branded image with this post's image_hook
      const squareImageUrl = await composeImageForPost(postData);

      // Insert to DB
      const { data: post, error: postErr } = await supabase
        .from('linkedin_posts')
        .insert({
          username: req.user.email,
          topic_id,
          post_style: postData.structure_used,
          content: body,
          excerpt: postData.image_hook,
          post_number: postNumber,
          template_index: tplIndex,
          featured_image_square: squareImageUrl,
          base_image_url: storedBaseImageUrl,
          carousel_style: effectiveCarouselStyle,
          style_preset: style_preset || null,
          brand_kit_id: brand_kit_id || null,
          post_format: post_format || null,
          style_overrides: style_overrides || {},
        })
        .select()
        .single();

      if (!postErr && post) {
        // Attach engine metadata for frontend display
        post._driver_used = postData.driver_used;
        post._structure_used = postData.structure_used;
        posts.push(post);
      }
    }

    // ── Update topic status ─────────────────────────────────────────────
    await supabase.from('linkedin_topics').update({ status: 'generated' }).eq('id', topic_id);

    return res.json({
      success: true,
      posts,
      topic_analysis: engineResult.topic_analysis,
    });
  } catch (err) {
    console.error('[linkedin/generate-posts] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
