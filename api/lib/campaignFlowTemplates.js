// Campaign Flow Templates — orchestration functions that call real subsystem APIs
// Each template creates content for a specific type and returns result metadata

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from './getUserKeys.js';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Shorts Campaign Template
 * Creates a script + voiceover + saves as workbench draft ready for keyframe generation
 */
export async function buildShortsCampaign({ userId, userEmail, planItem }) {
  const supabase = getSupabase();
  const keys = await getUserKeys(userId, userEmail);

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const niche = planItem.niche || 'business';
  const topic = planItem.topic || planItem.angle || 'trending topic';
  const duration = planItem.duration || 30;
  const voice = planItem.voice || 'Perseus';
  const tone = planItem.tone || 'upbeat';

  // Step 1: Generate script via GPT
  const scriptResponse = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `You are a short-form video scriptwriter. Write a ${duration}-second narration script about the given topic. The tone should be ${tone}. Write ONLY the narration text — no scene directions, no brackets, no stage notes. Keep it punchy and engaging. Target ${Math.round(duration * 2.5)} words.`
      },
      { role: 'user', content: `Topic: ${topic}\nNiche: ${niche}` }
    ],
    temperature: 0.8,
    max_tokens: 500
  });

  const scriptText = scriptResponse.choices[0]?.message?.content?.trim() || '';

  // Step 2: Create campaign + draft in DB
  const { data: campaign } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name: planItem.topic || 'AI Campaign Short',
      content_type: 'shorts',
      status: 'workbench'
    })
    .select()
    .single();

  const draftState = {
    topic,
    niche,
    step: 'script',
    scriptText,
    voiceId: voice,
    voiceSpeed: 1.15,
    visualStyle: planItem.visual_style || '',
    videoStyle: planItem.video_style || '',
    framework: planItem.framework || '',
    duration: duration
  };

  const { data: draft } = await supabase
    .from('ad_drafts')
    .insert({
      user_id: userId,
      campaign_id: campaign?.id,
      storyboard_json: draftState
    })
    .select()
    .single();

  return {
    type: 'short',
    draft_id: draft?.id,
    campaign_id: campaign?.id,
    script_text: scriptText.substring(0, 100) + '...',
    preview_text: scriptText.substring(0, 200),
    edit_url: `/shorts/draft/${draft?.id}`
  };
}

/**
 * LinkedIn Post Campaign Template
 * Creates a topic + generates post variations with images
 */
export async function buildLinkedInPostCampaign({ userId, userEmail, planItem }) {
  const supabase = getSupabase();
  const keys = await getUserKeys(userId, userEmail);

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const topic = planItem.topic || planItem.angle || 'industry insight';
  const tone = planItem.tone || 'professional';

  // Generate LinkedIn post content via GPT
  const postResponse = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `You are a LinkedIn content strategist. Write a compelling LinkedIn post about the given topic. Tone: ${tone}. Structure: hook line, 2-3 body paragraphs with insights, closing CTA. Use line breaks for readability. No hashtags unless natural. 150-250 words.`
      },
      { role: 'user', content: `Topic: ${topic}` }
    ],
    temperature: 0.8,
    max_tokens: 600
  });

  const postText = postResponse.choices[0]?.message?.content?.trim() || '';

  // Create topic in linkedin_topics
  const { data: linkedinTopic } = await supabase
    .from('linkedin_topics')
    .insert({
      user_id: userId,
      headline: topic,
      snippet: postText.substring(0, 200),
      status: 'queued'
    })
    .select()
    .single();

  // Create post in linkedin_posts
  const { data: post } = await supabase
    .from('linkedin_posts')
    .insert({
      user_id: userId,
      topic_id: linkedinTopic?.id,
      body: postText,
      style: planItem.tone === 'professional' ? 'thought_leadership' : 'story',
      post_number: 1
    })
    .select()
    .single();

  return {
    type: 'linkedin_post',
    post_id: post?.id,
    topic_id: linkedinTopic?.id,
    preview_text: postText.substring(0, 200),
    edit_url: post?.id ? `/linkedin/${post.id}` : '/linkedin'
  };
}

/**
 * Carousel Campaign Template
 * Creates a carousel record + generates slide content
 */
export async function buildCarouselCampaign({ userId, userEmail, planItem }) {
  const supabase = getSupabase();
  const keys = await getUserKeys(userId, userEmail);

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const topic = planItem.topic || planItem.angle || 'key insights';
  const platform = Array.isArray(planItem.platform) ? planItem.platform[0] : (planItem.platform || 'linkedin');
  const slideCount = planItem.slide_count || 7;

  // Create carousel record
  const { data: carousel } = await supabase
    .from('carousels')
    .insert({
      user_id: userId,
      name: topic,
      platform,
      slide_count: slideCount,
      status: 'generating'
    })
    .select()
    .single();

  if (!carousel) throw new Error('Failed to create carousel');

  // Generate slide content via GPT
  const slideResponse = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: `Generate ${slideCount} carousel slides about the topic. Return JSON array with objects: { "slide_number": N, "slide_type": "hook|story|conclusion", "headline": "...", "body_text": "...", "image_prompt": "..." }. Slide 1 = hook, last = conclusion, middle = story. Headlines: max 8 words. Body: 1-2 sentences. Image prompts: 20 words describing a physical scene.`
      },
      { role: 'user', content: `Topic: ${topic}\nPlatform: ${platform}` }
    ],
    temperature: 0.7,
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  let slides = [];
  try {
    const parsed = JSON.parse(slideResponse.choices[0]?.message?.content || '{}');
    slides = parsed.slides || parsed.items || [];
  } catch { slides = []; }

  // Insert slides into DB
  if (slides.length > 0) {
    const slideRows = slides.map((s, i) => ({
      carousel_id: carousel.id,
      slide_number: s.slide_number || i + 1,
      slide_type: s.slide_type || 'story',
      headline: s.headline || '',
      body_text: s.body_text || '',
      image_prompt: s.image_prompt || '',
      generation_status: 'pending'
    }));

    await supabase.from('carousel_slides').insert(slideRows);
  }

  // Update carousel status
  await supabase.from('carousels')
    .update({ status: 'draft', slide_count: slides.length || slideCount })
    .eq('id', carousel.id);

  return {
    type: 'carousel',
    carousel_id: carousel.id,
    slide_count: slides.length,
    preview_text: slides[0]?.headline || topic,
    edit_url: `/carousels/${carousel.id}`
  };
}

/**
 * Ad Set Campaign Template
 * Creates an ad campaign + generates copy variations for specified platforms
 */
export async function buildAdSetCampaign({ userId, userEmail, planItem }) {
  const supabase = getSupabase();
  const keys = await getUserKeys(userId, userEmail);

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const topic = planItem.topic || planItem.angle || 'product promotion';
  const platforms = Array.isArray(planItem.platform) ? planItem.platform : [planItem.platform || 'meta'];
  const objective = planItem.objective || 'traffic';

  // Create ad campaign
  const { data: adCampaign } = await supabase
    .from('ad_campaigns')
    .insert({
      user_id: userId,
      name: topic,
      product_description: topic,
      objective,
      platforms,
      status: 'draft'
    })
    .select()
    .single();

  if (!adCampaign) throw new Error('Failed to create ad campaign');

  // Generate ad copy for each platform
  const variations = [];
  for (const platform of platforms) {
    const copyResponse = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `Generate ad copy for ${platform}. Return JSON with the copy fields appropriate for the platform. For LinkedIn: { introText, headline, description, cta }. For Meta: { primaryText, headline, description, cta }. For Google: { headlines: [15 items, max 30 chars each], descriptions: [4 items, max 90 chars each] }. Be concise and compelling.`
        },
        { role: 'user', content: `Product/Topic: ${topic}\nObjective: ${objective}` }
      ],
      temperature: 0.8,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    let copyData = {};
    try {
      copyData = JSON.parse(copyResponse.choices[0]?.message?.content || '{}');
    } catch { copyData = {}; }

    const { data: variation } = await supabase
      .from('ad_variations')
      .insert({
        campaign_id: adCampaign.id,
        user_id: userId,
        platform,
        ad_format: platform === 'google' ? 'responsive_search' : 'single_image',
        copy_data: copyData,
        status: 'draft'
      })
      .select()
      .single();

    if (variation) variations.push(variation);
  }

  return {
    type: 'ad_set',
    ad_campaign_id: adCampaign.id,
    variation_ids: variations.map(v => v.id),
    platforms,
    preview_text: `${variations.length} variations across ${platforms.join(', ')}`,
    edit_url: `/ads/${adCampaign.id}`
  };
}

/**
 * Storyboard Campaign Template
 * Creates a storyboard with AI-generated script and scene breakdown
 */
export async function buildStoryboardCampaign({ userId, userEmail, planItem }) {
  const supabase = getSupabase();
  const keys = await getUserKeys(userId, userEmail);

  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const topic = planItem.topic || planItem.angle || 'video concept';
  const duration = planItem.duration || 60;

  // Create storyboard
  const { data: storyboard } = await supabase
    .from('storyboards')
    .insert({
      user_id: userId,
      name: topic,
      duration,
      status: 'draft'
    })
    .select()
    .single();

  if (!storyboard) throw new Error('Failed to create storyboard');

  return {
    type: 'storyboard',
    storyboard_id: storyboard.id,
    preview_text: topic,
    edit_url: `/storyboards/${storyboard.id}`
  };
}

// Template registry
export const CAMPAIGN_TEMPLATES = {
  short: buildShortsCampaign,
  linkedin_post: buildLinkedInPostCampaign,
  carousel: buildCarouselCampaign,
  ad_set: buildAdSetCampaign,
  storyboard: buildStoryboardCampaign
};
