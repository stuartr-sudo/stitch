import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

const SceneSchema = z.object({
  id: z.string(),
  type: z.enum(['image_to_video', 'text_to_image']),
  duration_seconds: z.number(),
  visual_prompt: z.string(),
  voiceover_text: z.string(),
  text_overlay: z.object({
    headline: z.string(),
    position: z.enum(['top_safe', 'center', 'bottom_safe']),
    style: z.enum(['bold_white', 'minimal_dark', 'gradient_overlay']),
  }),
});

const StoryboardSchema = z.object({
  campaign_name: z.string(),
  platform: z.string(),
  duration_seconds: z.number(),
  scenes: z.array(SceneSchema),
  cta: z.object({ text: z.string(), url: z.string().optional() }),
  voiceover_script: z.string(),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret && req.headers['x-webhook-secret'] !== webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { url, user_id, platform = 'tiktok' } = req.body;
  if (!url || !user_id) return res.status(400).json({ error: 'Missing url or user_id' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: job } = await supabase
    .from('jobs')
    .insert({
      user_id,
      type: 'blog_to_ad',
      status: 'processing',
      current_step: 'scraping',
      total_steps: 3,
      completed_steps: 0,
      input_json: { url, platform },
    })
    .select()
    .single();

  res.json({ success: true, jobId: job.id, status: 'processing' });

  try {
    // Step 1: Scrape with Firecrawl
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    const scrapeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formats: ['markdown'] }),
    });
    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData.data?.markdown || '';

    await supabase.from('jobs').update({ completed_steps: 1, current_step: 'generating_storyboard' }).eq('id', job.id);

    // Step 2: Generate storyboard with GPT-4o-mini
    const { data: userKeys } = await supabase
      .from('user_api_keys')
      .select('openai_key')
      .eq('user_id', user_id)
      .maybeSingle();

    const openaiKey = userKeys?.openai_key || process.env.OPENAI_API_KEY;
    const openai = new OpenAI({ apiKey: openaiKey });

    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a creative director for short-form video ads. Given a blog post or product page, create a 15-second video ad storyboard for ${platform}. Output a storyboard with 3-5 scenes: hook (first 3 seconds to grab attention), body (show the product/value), and CTA (call to action). Each scene needs a visual_prompt for AI image generation, voiceover_text, and text_overlay.`,
        },
        {
          role: 'user',
          content: `Create a ${platform} video ad storyboard from this content:\n\n${markdown.substring(0, 4000)}`,
        },
      ],
      response_format: zodResponseFormat(StoryboardSchema, 'storyboard'),
    });

    const storyboard = completion.choices[0].message.parsed;

    await supabase.from('jobs').update({ completed_steps: 2, current_step: 'creating_campaign' }).eq('id', job.id);

    // Step 3: Create campaign + draft
    const { data: campaign } = await supabase
      .from('campaigns')
      .insert({ user_id, name: storyboard.campaign_name, platform, source_url: url, status: 'draft' })
      .select()
      .single();

    await supabase.from('ad_drafts').insert({
      campaign_id: campaign.id,
      user_id,
      storyboard_json: storyboard,
      generation_status: 'draft',
    });

    await supabase.from('jobs').update({
      status: 'completed',
      completed_steps: 3,
      current_step: 'done',
      output_json: { campaign_id: campaign.id, storyboard },
    }).eq('id', job.id);

  } catch (err) {
    console.error('[Webhook] Error:', err);
    await supabase.from('jobs').update({ status: 'failed', error: err.message }).eq('id', job.id);
  }
}
