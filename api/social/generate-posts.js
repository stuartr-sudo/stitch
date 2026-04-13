import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { composeLinkedInSatori } from '../lib/composeLinkedInSatori.js';
import { uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';
import { generateSocialPosts } from '../lib/socialProductionEngine.js';

export default async function handler(req, res) {
  const { topicId } = req.params;
  if (!topicId) return res.status(400).json({ error: 'topicId is required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch topic + verify ownership
    const { data: topic, error: topicErr } = await supabase
      .from('social_topics')
      .select('*')
      .eq('id', topicId)
      .eq('user_id', req.user.id)
      .single();

    if (topicErr || !topic) return res.status(404).json({ error: 'Topic not found' });

    // Fetch brand context if brand_kit_id is set
    let brandContext = null;
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
          logo_url: brand.logo_url,
        };
      }
    }

    // Generate posts via production engine
    const engineResult = await generateSocialPosts({
      topic,
      content: topic.full_content || '',
      platform: topic.platform,
      brandContext,
      username: req.user.email,
    });

    const keys = await getUserKeys(req.user.id, req.user.email);

    // Insert post rows immediately (before image generation)
    const posts = [];
    for (const postData of engineResult.posts) {
      const { data: post, error: postErr } = await supabase
        .from('social_posts')
        .insert({
          user_id: req.user.id,
          username: req.user.email,
          topic_id: topicId,
          platform: topic.platform,
          content: postData.body,
          excerpt: postData.image_hook,
          post_style: postData.structure_used,
          driver_used: postData.driver_used || null,
          brand_kit_id: topic.brand_kit_id || null,
          status: 'generating',
        })
        .select()
        .single();

      if (!postErr && post) {
        post._image_prompt = postData.image_prompt;
        post._image_hook = postData.image_hook;
        posts.push(post);
      }
    }

    // Return immediately — image generation happens in background
    res.json({ success: true, generating: true, posts });

    // ── Background: generate images for each post ──────────────────────
    if (!keys.falKey) {
      // No FAL key — mark posts as generated without images
      for (const post of posts) {
        await supabase.from('social_posts')
          .update({ status: 'generated' })
          .eq('id', post.id);
      }
      await supabase.from('social_topics')
        .update({ status: 'generated' })
        .eq('id', topicId);
      return;
    }

    for (const post of posts) {
      try {
        // Generate base image via Nano Banana 2
        const imagePrompt = post._image_prompt
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

        if (!falRes.ok) {
          console.warn('[social/generate-posts] FAL queue submit failed:', falRes.status);
          await supabase.from('social_posts').update({ status: 'generated' }).eq('id', post.id);
          continue;
        }

        const falData = await falRes.json();
        let baseImageUrl = null;
        const requestId = falData.request_id;

        if (requestId) {
          // Poll for result
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

        logCost({
          username: req.user.email,
          category: 'fal',
          operation: 'social_base_image',
          model: 'nano-banana-2',
        }).catch(() => {});

        // Upload base image to Supabase (FAL CDN URLs expire)
        let storedBaseImageUrl = null;
        if (baseImageUrl) {
          try {
            storedBaseImageUrl = await uploadUrlToSupabase(baseImageUrl, supabase, 'social');
          } catch (err) {
            console.warn('[social/generate-posts] Base image upload failed:', err.message);
            storedBaseImageUrl = baseImageUrl;
          }
        }

        // Compose branded overlay via Satori
        let composedImageUrl = null;
        if (baseImageUrl) {
          try {
            const composedBuffer = await composeLinkedInSatori({
              backgroundImageUrl: baseImageUrl,
              logoUrl: brandContext?.logo_url || null,
              hookText: post._image_hook || topic.source_title?.slice(0, 50) || '',
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
              composedImageUrl = publicUrl.publicUrl;
            }
          } catch (err) {
            console.warn('[social/generate-posts] Satori composition failed:', err.message);
          }
        }

        // Update post with image URLs
        await supabase.from('social_posts')
          .update({
            base_image_url: storedBaseImageUrl,
            featured_image_url: composedImageUrl,
            status: 'generated',
          })
          .eq('id', post.id);

      } catch (imgErr) {
        console.warn('[social/generate-posts] Image generation failed for post:', post.id, imgErr.message);
        await supabase.from('social_posts').update({ status: 'generated' }).eq('id', post.id);
      }
    }

    // Update topic status
    await supabase.from('social_topics')
      .update({ status: 'generated' })
      .eq('id', topicId);

  } catch (err) {
    console.error('[social/generate-posts] Error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
  }
}
