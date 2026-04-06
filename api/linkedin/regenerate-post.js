import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';
import { composeLinkedInSatori } from '../lib/composeLinkedInSatori.js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';

const ANTI_SLOP = `RULES (violating any = rejection):
- First line MUST be under 200 characters
- NO filler: "In today's world", "Let's dive in", "Here's the thing"
- NO hedging: "might", "could potentially", "it's possible"
- NO AI clichés: "landscape", "navigate", "leverage", "robust", "delve", "tapestry"
- NO emojis, NO hashtags, NO markdown formatting, NO em dashes (—)
- Every sentence must add new information — no repetition
- Be specific: use real names, real numbers, real places
- Write like a sharp human, not a language model`;

function cleanSourceUrl(url) {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') u.searchParams.delete(key);
    }
    const path = u.pathname === '/' ? '' : u.pathname;
    return `${u.hostname.replace(/^www\./, '')}${path}${u.search || ''}`;
  } catch { return url; }
}

function cleanPostBody(body) {
  let text = body;
  text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, '');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/#\w+/g, '');
  // Replace em dashes and en dashes with plain hyphens
  text = text.replace(/[\u2013\u2014]/g, ' - ');
  text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
  text = text.replace(/\.([A-Z])/g, '. $1');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

const STYLE_PROMPTS = {
  contrarian: `Write a LinkedIn post using the Contrarian Insight style. Make a bold claim that challenges conventional thinking about this topic, then explain why the common take is wrong. 150-250 words.\n\n${ANTI_SLOP}`,
  story: `Write a LinkedIn post using the Story-Led style. Open with a vivid scene — a specific person, place, or moment. Tell a mini narrative that draws the reader in. 150-250 words.\n\n${ANTI_SLOP}`,
  data: `Write a LinkedIn post using the Data/Stat Punch style. Lead with a surprising number or concrete fact from the source material. 100-200 words.\n\n${ANTI_SLOP}`,
};

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch existing post
    const { data: post, error: postErr } = await supabase
      .from('linkedin_posts')
      .select('*, linkedin_topics(*)')
      .eq('id', req.params.id)
      .eq('username', req.user.email)
      .single();

    if (postErr || !post) return res.status(404).json({ error: 'Post not found' });

    const topic = post.linkedin_topics;
    if (!topic) return res.status(404).json({ error: 'Associated topic not found' });

    const keys = await getUserKeys(req.user.id, req.user.email);

    // Merge style overrides if provided
    const { style_overrides, regenerate_image } = req.body || {};
    const updateFields = {};
    if (style_overrides) {
      updateFields.style_overrides = { ...(post.style_overrides || {}), ...style_overrides };
    }

    // Fetch config for CTA (needed for both text regen and image regen)
    const { data: config } = await supabase
      .from('linkedin_config')
      .select('linkedin_cta_text, linkedin_cta_url, series_title')
      .eq('user_id', req.user.id)
      .maybeSingle();

    // Only regenerate text when NOT doing an image-only regeneration
    if (!regenerate_image) {
      if (!keys.openaiKey) return res.status(500).json({ error: 'OpenAI key not configured' });

      const client = new OpenAI({ apiKey: keys.openaiKey });
      const content = topic.full_content || topic.source_summary || '';

      const completion = await client.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          { role: 'system', content: STYLE_PROMPTS[post.post_style] },
          { role: 'user', content: `Source article: ${topic.source_title}\nURL: ${topic.source_url}\n\nArticle content:\n${content}` },
        ],
        temperature: 0.9,
        max_tokens: 1000,
      });

      logCost({
        username: req.user.email,
        category: 'openai',
        operation: 'linkedin_generation',
        model: 'gpt-4.1',
        input_tokens: completion.usage?.prompt_tokens || 0,
        output_tokens: completion.usage?.completion_tokens || 0,
      }).catch(() => {});

      let finalBody = completion.choices[0]?.message?.content?.trim() || '';

      // Clean post body
      finalBody = cleanPostBody(finalBody);

      // Append source as plain text
      if (topic.source_url) {
        finalBody += `\n\nsrc: ${cleanSourceUrl(topic.source_url)}`;
      }

      if (config?.linkedin_cta_text && config?.linkedin_cta_url) {
        finalBody += `\n${config.linkedin_cta_text} → ${config.linkedin_cta_url}`;
      }

      updateFields.content = finalBody;
      updateFields.status = 'generated';
    }

    // Optionally regenerate image with new style
    if (regenerate_image && keys.falKey) {
      try {
        // Generate new base image
        const falRes = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
          method: 'POST',
          headers: {
            Authorization: `Key ${keys.falKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: `Professional editorial photograph for LinkedIn post about: ${topic.source_title}. Clean, modern, business context. No text, no logos.`,
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

          if (baseImageUrl) {
            const storedBase = await uploadUrlToSupabase(baseImageUrl, supabase, 'linkedin').catch(() => baseImageUrl);
            updateFields.base_image_url = storedBase;

            // Fetch brand for composition — use post's brand_kit_id if set
            const brandQ = supabase.from('brand_kit').select('logo_url').eq('user_id', req.user.id);
            if (post.brand_kit_id) brandQ.eq('id', post.brand_kit_id);
            const { data: brand } = await brandQ.maybeSingle();

            const composedBuffer = await composeLinkedInSatori({
              backgroundImageUrl: baseImageUrl,
              logoUrl: brand?.logo_url,
              excerpt: post.excerpt || '',
              seriesTitle: config?.series_title || 'INDUSTRY WATCH',
              postNumber: post.post_number || 1,
              carouselStyle: post.carousel_style || 'bold_editorial',
              templateIndex: post.template_index || 0,
              styleOverrides: updateFields.style_overrides || post.style_overrides || {},
            });

            const ts = Date.now();
            const rand = Math.random().toString(36).slice(2, 8);
            const { data: upload, error: uploadErr } = await supabase.storage
              .from('media')
              .upload(`linkedin/composed-sq-${ts}-${rand}.png`, composedBuffer, { contentType: 'image/png', upsert: false });

            if (!uploadErr) {
              const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(upload.path);
              updateFields.featured_image_square = publicUrl.publicUrl;
            }
          }
        }

        logCost({
          username: req.user.email,
          category: 'fal',
          operation: 'linkedin_regenerate_image',
          model: 'nano-banana-2',
        }).catch(() => {});
      } catch (imgErr) {
        console.warn('[linkedin/regenerate-post] Image regeneration failed:', imgErr.message);
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('linkedin_posts')
      .update(updateFields)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message });
    return res.json({ success: true, post: updated });
  } catch (err) {
    console.error('[linkedin/regenerate-post] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
