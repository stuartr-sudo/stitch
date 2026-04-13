import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { composeLinkedInSatori } from '../lib/composeLinkedInSatori.js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';
import { generateSocialPosts } from '../lib/socialProductionEngine.js';

export default async function handler(req, res) {
  const { postId } = req.params;
  if (!postId) return res.status(400).json({ error: 'postId is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch post + verify ownership
    const { data: post, error: postErr } = await supabase
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .eq('user_id', req.user.id)
      .single();

    if (postErr || !post) return res.status(404).json({ error: 'Post not found' });

    // Fetch parent topic
    const { data: topic, error: topicErr } = await supabase
      .from('social_topics')
      .select('*')
      .eq('id', post.topic_id)
      .single();

    if (topicErr || !topic) return res.status(404).json({ error: 'Associated topic not found' });

    const { style_overrides, regenerate_image } = req.body || {};
    const updateFields = {};

    // Fetch brand context if topic has a brand_kit_id
    let brandContext = null;
    let logoUrl = null;
    if (topic.brand_kit_id) {
      const { data: brand } = await supabase
        .from('brand_kit')
        .select('brand_name, tagline, industry, target_audience, logo_url')
        .eq('id', topic.brand_kit_id)
        .single();
      if (brand) {
        brandContext = {
          brand_name: brand.brand_name,
          industry: brand.industry,
          target_audience: brand.target_audience,
          tagline: brand.tagline,
        };
        logoUrl = brand.logo_url;
      }
    }

    // Regenerate text: call production engine and pick matching structure
    const engineResult = await generateSocialPosts({
      topic,
      content: topic.full_content || '',
      platform: topic.platform,
      brandContext,
      username: req.user.email,
    });

    // Pick the post that matches the existing structure, or first one
    const matched = engineResult.posts.find(p => p.structure_used === post.post_style)
      || engineResult.posts[0];

    updateFields.content = matched.body;
    updateFields.excerpt = matched.image_hook;
    updateFields.post_style = matched.structure_used;
    updateFields.driver_used = matched.driver_used || null;
    updateFields.status = 'generated';

    if (style_overrides) {
      updateFields.style_overrides = { ...(post.style_overrides || {}), ...style_overrides };
    }

    // Optionally regenerate image
    if (regenerate_image) {
      const keys = await getUserKeys(req.user.id, req.user.email);

      if (keys.falKey) {
        try {
          const imagePrompt = matched.image_prompt
            || `Professional editorial photograph for social media post about: ${topic.source_title || 'content'}. No text, no logos.`;

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
            let baseImageUrl = null;
            const requestId = falData.request_id;

            if (requestId) {
              for (let i = 0; i < 30; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const statusRes = await fetch(
                  `https://queue.fal.run/fal-ai/nano-banana-2/requests/${requestId}/status`,
                  { headers: { Authorization: `Key ${keys.falKey}` } }
                );
                const statusData = await statusRes.json();
                if (statusData.status === 'COMPLETED') {
                  const resultRes = await fetch(
                    `https://queue.fal.run/fal-ai/nano-banana-2/requests/${requestId}`,
                    { headers: { Authorization: `Key ${keys.falKey}` } }
                  );
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
              const storedBase = await uploadUrlToSupabase(baseImageUrl, supabase, 'social')
                .catch(() => baseImageUrl);
              updateFields.base_image_url = storedBase;

              // Compose branded overlay
              try {
                const composedBuffer = await composeLinkedInSatori({
                  backgroundImageUrl: baseImageUrl,
                  logoUrl: logoUrl || null,
                  hookText: updateFields.excerpt || post.excerpt || '',
                  canvasW: 1080,
                  canvasH: 1350,
                });

                const ts = Date.now();
                const rand = Math.random().toString(36).slice(2, 8);
                const { data: upload, error: uploadErr } = await supabase.storage
                  .from('media')
                  .upload(`social/composed-${ts}-${rand}.png`, composedBuffer, {
                    contentType: 'image/png',
                    upsert: false,
                  });

                if (!uploadErr) {
                  const { data: publicUrl } = supabase.storage.from('media').getPublicUrl(upload.path);
                  updateFields.featured_image_url = publicUrl.publicUrl;
                }
              } catch (composeErr) {
                console.warn('[social/regenerate-post] Satori composition failed:', composeErr.message);
              }
            }
          }

          logCost({
            username: req.user.email,
            category: 'fal',
            operation: 'social_regenerate_image',
            model: 'nano-banana-2',
          }).catch(() => {});

        } catch (imgErr) {
          console.warn('[social/regenerate-post] Image regeneration failed:', imgErr.message);
        }
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('social_posts')
      .update(updateFields)
      .eq('id', postId)
      .select()
      .single();

    if (updateErr) return res.status(500).json({ error: updateErr.message });
    return res.json({ success: true, post: updated });
  } catch (err) {
    console.error('[social/regenerate-post] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
