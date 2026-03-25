import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { getUserKeys } from '../lib/getUserKeys.js';
import { composeImage } from '../lib/composeImage.js';
import { publishToLinkedIn } from '../lib/linkedinPublisher.js';
import { logCost } from '../lib/costLogger.js';

export default async function handler(req, res) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Fetch post + verify ownership
    const { data: post, error: postErr } = await supabase
      .from('linkedin_posts')
      .select('*, linkedin_topics(headline, url)')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (postErr || !post) return res.status(404).json({ error: 'Post not found' });
    if (!['generated', 'approved'].includes(post.status)) {
      return res.status(400).json({ error: `Cannot publish post with status: ${post.status}` });
    }

    // Fetch config for LinkedIn token and series title
    const { data: config } = await supabase
      .from('linkedin_config')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (!config?.linkedin_access_token) {
      return res.status(400).json({ error: 'LinkedIn access token not configured. Go to Settings.' });
    }

    // Assign post number
    const { data: maxNum } = await supabase
      .from('linkedin_posts')
      .select('post_number')
      .eq('user_id', req.user.id)
      .eq('status', 'published')
      .order('post_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const postNumber = (maxNum?.post_number || 0) + 1;
    const templateIndex = (postNumber - 1) % 6;

    const keys = await getUserKeys(req.user.id, req.user.email);

    // Generate excerpt via GPT-4.1 mini
    let excerpt = '';
    if (keys.openaiKey) {
      try {
        const client = new OpenAI({ apiKey: keys.openaiKey });
        const excerptCompletion = await client.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: 'Extract the single most compelling 6-12 word quote from this LinkedIn post. Return only the quote, no punctuation marks around it.' },
            { role: 'user', content: post.body },
          ],
          temperature: 0.3,
          max_tokens: 50,
        });
        excerpt = excerptCompletion.choices[0]?.message?.content?.trim() || '';
        logCost({
          username: req.user.email,
          category: 'openai',
          operation: 'linkedin_excerpt',
          model: 'gpt-4.1-mini',
          input_tokens: excerptCompletion.usage?.prompt_tokens || 0,
          output_tokens: excerptCompletion.usage?.completion_tokens || 0,
        }).catch(() => {});
      } catch (err) {
        console.warn('[linkedin/publish] Excerpt generation failed:', err.message);
        excerpt = post.body.split('.')[0]?.trim().slice(0, 80) || '';
      }
    } else {
      excerpt = post.body.split('.')[0]?.trim().slice(0, 80) || '';
    }

    // Generate base image via FAL Nano Banana 2
    let baseImageUrl = null;
    if (keys.falKey) {
      try {
        const falRes = await fetch('https://queue.fal.run/fal-ai/nano-banana-2', {
          method: 'POST',
          headers: {
            Authorization: `Key ${keys.falKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: `Professional editorial illustration for: ${post.body.slice(0, 100)}`,
            image_size: 'square_hd',
            num_images: 1,
          }),
        });

        if (falRes.ok) {
          const falData = await falRes.json();
          // Queue response — poll for result
          const requestId = falData.request_id;
          if (requestId) {
            // Poll for result
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
        }
      } catch (err) {
        console.warn('[linkedin/publish] Base image generation failed:', err.message);
      }
    }

    // Compose branded images
    let squareUrl = null;
    let landscapeUrl = null;

    if (baseImageUrl) {
      const { data: brand } = await supabase
        .from('brand_kit')
        .select('logo_url')
        .eq('user_id', req.user.id)
        .maybeSingle();

      const logoUrl = brand?.logo_url;

      if (logoUrl) {
        const seriesTitle = config?.series_title || 'INDUSTRY WATCH';

        try {
          const [squareBuffer, landscapeBuffer] = await Promise.all([
            composeImage({ image_url: baseImageUrl, logo_url: logoUrl, series_title: seriesTitle, post_number: postNumber, excerpt, template_index: templateIndex, format: 'square' }),
            composeImage({ image_url: baseImageUrl, logo_url: logoUrl, series_title: seriesTitle, post_number: postNumber, excerpt, template_index: templateIndex, format: 'landscape' }),
          ]);

          const ts = Date.now();
          const rand = Math.random().toString(36).slice(2, 8);

          // Upload both to Supabase storage
          const [sqUpload, lsUpload] = await Promise.all([
            supabase.storage.from('media').upload(`linkedin/composed-sq-${ts}-${rand}.png`, squareBuffer, { contentType: 'image/png', upsert: false }),
            supabase.storage.from('media').upload(`linkedin/composed-ls-${ts}-${rand}.png`, landscapeBuffer, { contentType: 'image/png', upsert: false }),
          ]);

          if (!sqUpload.error) {
            const { data: sqPublic } = supabase.storage.from('media').getPublicUrl(sqUpload.data.path);
            squareUrl = sqPublic.publicUrl;
          }
          if (!lsUpload.error) {
            const { data: lsPublic } = supabase.storage.from('media').getPublicUrl(lsUpload.data.path);
            landscapeUrl = lsPublic.publicUrl;
          }
        } catch (err) {
          console.warn('[linkedin/publish] Image composition failed:', err.message);
        }
      }
    }

    // Publish to LinkedIn — use landscape image if available
    const linkedinResult = await publishToLinkedIn({
      accessToken: config.linkedin_access_token,
      body: post.body,
      imageUrl: landscapeUrl || null,
    });

    // Update post with results
    const updateFields = {
      post_number: postNumber,
      template_index: templateIndex,
      excerpt,
      featured_image_square: squareUrl,
      featured_image_landscape: landscapeUrl,
      status: linkedinResult.success ? 'published' : 'failed',
      published_linkedin_id: linkedinResult.linkedinPostId || null,
      error_message: linkedinResult.error || null,
    };

    const { data: updated, error: updateErr } = await supabase
      .from('linkedin_posts')
      .update(updateFields)
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateErr) console.error('[linkedin/publish] Update error:', updateErr.message);

    return res.json({
      success: linkedinResult.success,
      post: updated || { ...post, ...updateFields },
      images: { square: squareUrl, landscape: landscapeUrl },
      linkedin: linkedinResult,
    });
  } catch (err) {
    console.error('[linkedin/publish] Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
