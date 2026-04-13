import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';
import { composeLinkedInSatori } from '../lib/composeLinkedInSatori.js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { generateLinkedInPosts } from '../lib/linkedinProductionEngine.js';

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
      // Fetch brand context if post has a brand_kit_id
      let brandContext = null;
      if (post.brand_kit_id) {
        const { data: brand } = await supabase
          .from('brand_kit')
          .select('brand_name, industry, target_market, tagline')
          .eq('id', post.brand_kit_id)
          .single();
        if (brand) {
          brandContext = {
            brand_name: brand.brand_name,
            industry: brand.industry,
            target_audience: brand.target_market,
            tagline: brand.tagline,
          };
        }
      }

      const content = topic.full_content || topic.source_summary || '';

      // Generate 3 posts via the production engine, then pick the best match
      const result = await generateLinkedInPosts({
        topic,
        content,
        brandContext,
        username: req.user.email,
      });

      // Pick the post that matches the existing structure, or first one
      const existingStructure = post.post_style;
      const matched = result.posts.find(p => p.structure_used === existingStructure) || result.posts[0];

      let finalBody = matched.body || '';

      // Append source as plain text
      if (topic.source_url) {
        finalBody += `\n\nsrc: ${cleanSourceUrl(topic.source_url)}`;
      }

      if (config?.linkedin_cta_text && config?.linkedin_cta_url) {
        finalBody += `\n${config.linkedin_cta_text} → ${config.linkedin_cta_url}`;
      }

      updateFields.content = finalBody;
      updateFields.excerpt = matched.image_hook;
      updateFields.post_style = matched.structure_used;
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
            image_size: 'portrait_4_3',
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
              hookText: updateFields.excerpt || post.excerpt || '',
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
