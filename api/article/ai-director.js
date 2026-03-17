/**
 * POST /api/article/ai-director
 *
 * AI Creative Director — parallel pipeline that generates video ads WITHOUT templates.
 * GPT designs the entire storyboard from scratch: scene count, narrative arc, durations,
 * visual direction, everything. Guided only by article content, brand guidelines, and platform.
 *
 * Uses the same infrastructure as the template pipeline (same helpers, same tables, same storage)
 * but operates as a completely independent code path.
 *
 * Auth: webhook secret or JWT (supports both server-to-server and studio UI calls)
 *
 * Body: {
 *   url?: string,              // article URL to scrape
 *   content?: string,          // or raw article text
 *   brand_username: string,
 *   platforms?: string[],      // default: ['tiktok', 'instagram_reels', 'youtube_shorts']
 *   output_type?: string,      // 'video' | 'static' | 'both' (default: 'both')
 *   style_preset?: string,     // optional visual style lock (ugc, cinematic, etc.)
 *   lora_config?: object[],    // optional LoRA overrides [{lora_id, source, scale}]
 *   duration_target?: number,  // target total seconds (default: 30, range 15-60)
 * }
 *
 * Response: { success, jobId, status, poll_url }
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { groupPlatformsByRatio } from '../lib/videoTemplates.js';
import {
  generateImage, animateImage, generateMusic, scrapeArticle,
  extractLastFrame, analyzeFrameContinuity, concatVideos,
  enhancePromptForPipeline,
} from '../lib/pipelineHelpers.js';
import { VISUAL_STYLE_PRESETS, getStyleSuffix } from '../lib/stylePresets.js';
import { logCost } from '../lib/costLogger.js';
import { WorkflowEngine } from '../lib/workflowEngine.js';
import { withRetry } from '../lib/retryHelper.js';

// ── Zod schemas ──────────────────────────────────────────────────────────────

const ArticleAnalysisSchema = z.object({
  title: z.string(),
  article_type: z.enum(['listicle', 'how_to', 'tutorial', 'comparison', 'review', 'news', 'announcement', 'testimonial', 'case_study', 'other']),
  tone: z.enum(['professional', 'energetic', 'casual', 'luxury', 'playful']),
  has_product: z.boolean(),
  has_steps: z.boolean(),
  has_comparison: z.boolean(),
  has_quotes: z.boolean(),
  key_topic: z.string(),
  main_benefit: z.string(),
  target_audience: z.string(),
});

const DynamicSceneSchema = z.object({
  role: z.string(),
  headline: z.string().max(60),
  voiceover: z.string().max(120),
  visual_prompt: z.string(),
  motion_prompt: z.string(),
  overlay_style: z.enum(['bold_white', 'minimal_dark', 'gradient_overlay', 'none']),
  position: z.enum(['top_safe', 'center', 'bottom_safe']),
  duration_seconds: z.number().min(2).max(10),
  image_model_hint: z.enum(['photorealistic', 'graphic', 'artistic', 'default']).optional(),
});

const DynamicStoryboardSchema = z.object({
  campaign_name: z.string(),
  creative_rationale: z.string(),
  hook_headline: z.string(),
  cta_text: z.string(),
  music_mood: z.string(),
  recommended_style_preset: z.enum([
    'ugc', 'testimonial', 'cinematic', 'product_demo',
    'lifestyle', 'bold_punchy', 'minimal', 'documentary',
  ]).optional(),
  scenes: z.array(DynamicSceneSchema).min(3).max(8),
});

const QualityGateSchema = z.object({
  scores: z.object({
    relevance: z.number().min(1).max(10),
    brand_consistency: z.number().min(1).max(10),
    hook_strength: z.number().min(1).max(10),
    narrative_flow: z.number().min(1).max(10),
    cta_clarity: z.number().min(1).max(10),
  }),
  average_score: z.number(),
  pass: z.boolean(),
  feedback: z.string().optional(),
});

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: webhook secret OR JWT (from studio UI)
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const hasWebhookAuth = webhookSecret && req.headers['x-webhook-secret'] === webhookSecret;
  const hasJwtAuth = !!req.user?.id; // set by authenticateToken middleware

  if (!hasWebhookAuth && !hasJwtAuth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    url,
    content: rawContent,
    brand_username,
    platforms = ['tiktok', 'instagram_reels', 'youtube_shorts'],
    output_type = 'both',
    style_preset: stylePresetOverride,
    lora_config: loraConfigOverride,
    duration_target = 30,
  } = req.body;

  if (!brand_username) return res.status(400).json({ error: 'Missing brand_username' });
  if (!url && !rawContent) return res.status(400).json({ error: 'Missing url or content' });

  const clampedDuration = Math.max(15, Math.min(60, duration_target));

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Look up brand kit
  const { data: brandKit, error: brandErr } = await supabase
    .from('brand_kit')
    .select('*')
    .eq('brand_username', brand_username)
    .single();

  if (brandErr || !brandKit) {
    return res.status(404).json({ error: `Brand not found: ${brand_username}` });
  }

  const userId = brandKit.user_id;

  // Fetch SEWO brand guidelines + image style
  const { data: sewoGuidelines } = await supabase
    .from('brand_guidelines')
    .select('voice_and_tone, target_market, brand_personality, content_style_rules, preferred_elements, prohibited_elements, ai_instructions_override')
    .eq('user_name', brand_username)
    .order('updated_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: sewoImageStyle } = await supabase
    .from('brand_image_styles')
    .select('visual_style, color_palette, mood_and_atmosphere, composition_style, lighting_preferences, subject_guidelines, preferred_elements, prohibited_elements, ai_prompt_instructions')
    .eq('user_name', brand_username)
    .order('updated_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  brandKit._sewoGuidelines = sewoGuidelines || null;
  brandKit._sewoImageStyle = sewoImageStyle || null;

  // Get API keys
  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('fal_key, wavespeed_key, openai_key')
    .eq('user_id', userId)
    .maybeSingle();

  const keys = {
    falKey: userKeys?.fal_key || process.env.FAL_KEY,
    wavespeedKey: userKeys?.wavespeed_key || process.env.WAVESPEED_KEY || process.env.WAVESPEED_API_KEY,
    openaiKey: userKeys?.openai_key || process.env.OPENAI_API_KEY,
  };

  if (!keys.openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

  // Create job record
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      type: 'ai_director',
      status: 'processing',
      current_step: 'scraping',
      total_steps: 6,
      completed_steps: 0,
      input_json: { url, brand_username, platforms, output_type, duration_target: clampedDuration, style_preset: stylePresetOverride },
      workflow_state: 'running',
    })
    .select()
    .single();

  if (jobErr) return res.status(500).json({ error: 'Failed to create job' });

  res.json({
    success: true,
    jobId: job.id,
    status: 'processing',
    poll_url: `/api/jobs/public-status?jobId=${job.id}`,
    mode: 'ai_director',
  });

  // ── Background pipeline ───────────────────────────────────────────────────
  runAiDirectorPipeline({
    job, userId, brandKit, keys, url, rawContent, platforms, output_type,
    stylePresetOverride, loraConfigOverride, clampedDuration, supabase,
  }).catch(async (err) => {
    console.error('[ai-director] Pipeline error:', err);
    await supabase.from('jobs').update({
      status: 'failed', error: err.message, workflow_state: 'failed',
    }).eq('id', job.id);
  });
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

async function runAiDirectorPipeline({
  job, userId, brandKit, keys, url, rawContent, platforms, output_type,
  stylePresetOverride, loraConfigOverride, clampedDuration, supabase,
}) {
  const jobId = job.id;
  const updateJob = (patch) => supabase.from('jobs').update(patch).eq('id', jobId);
  const brand_username = brandKit.brand_username;

  const wf = new WorkflowEngine(jobId, supabase);
  await wf.loadState();

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  // ── Step 1: Scrape ──────────────────────────────────────────────────────
  let truncated;
  if (!wf.hasCompleted('scrape')) {
    await updateJob({ current_step: 'scraping', completed_steps: 0 });

    let articleMarkdown = rawContent || '';
    if (!articleMarkdown && url) {
      articleMarkdown = await withRetry(
        () => scrapeArticle(url, process.env.FIRECRAWL_API_KEY),
        { maxAttempts: 2, baseDelayMs: 3000, onRetry: (a, e) => console.warn(`[ai-director] Scrape retry ${a}: ${e.message}`) },
      );
    }

    if (!articleMarkdown || articleMarkdown.length < 100) {
      await wf.failStep('scrape', new Error('Could not extract usable content from article'));
      throw new Error('Could not extract usable content from article');
    }

    const looksLikeHtml = /<(h[1-6]|p|div|section|article|strong|em)\b/i.test(articleMarkdown);
    const plainText = looksLikeHtml
      ? articleMarkdown.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : articleMarkdown;
    truncated = plainText.slice(0, 20000);

    await wf.transition('scrape', { truncated });
  } else {
    truncated = wf.getStepResult('scrape')?.truncated || '';
  }

  if (wf.isPaused) return;

  // ── Step 2: Analyse article ──────────────────────────────────────────────
  let analysis;
  if (!wf.hasCompleted('analyze_article')) {
    await updateJob({ current_step: 'analysing_article', completed_steps: 1 });

    const analysisCompletion = await openai.beta.chat.completions.parse({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: 'Analyze this article and return structured metadata about its type, tone, and key content signals.' },
        { role: 'user', content: `Article content:\n\n${truncated}` },
      ],
      response_format: zodResponseFormat(ArticleAnalysisSchema, 'analysis'),
    });

    analysis = analysisCompletion.choices[0].message.parsed;

    if (analysisCompletion.usage) {
      logCost({ username: brand_username, category: 'openai', operation: 'ai_director_analysis', model: 'gpt-5-mini', input_tokens: analysisCompletion.usage.prompt_tokens, output_tokens: analysisCompletion.usage.completion_tokens });
    }

    await wf.transition('analyze_article', { analysis });
  } else {
    analysis = wf.getStepResult('analyze_article')?.analysis;
  }

  if (wf.isPaused) return;

  // ── Step 3: Dynamic storyboard ───────────────────────────────────────────
  let storyboard;
  if (!wf.hasCompleted('dynamic_storyboard')) {
    await updateJob({ current_step: 'designing_storyboard', completed_steps: 2 });

    const brandContext = buildBrandContext(brandKit);
    const platformList = platforms.join(', ');

    const storyboardCompletion = await openai.beta.chat.completions.parse({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are a senior creative director specialising in short-form video ads. Your job is to design the optimal video ad storyboard for an article, given a brand and target platform.

You decide EVERYTHING — scene count, narrative arc, duration per scene, visual direction, motion direction, text overlays. You are NOT constrained by any template. Design the best possible ad.

Rules:
- 3-8 scenes, total duration ~${clampedDuration}s
- First scene MUST hook the viewer in ≤3 seconds — make it irresistible
- Last scene MUST have a clear CTA
- Each scene duration: 2-10 seconds
- Headlines max 60 chars, punchy and direct
- Voiceover max 120 chars, natural spoken language
- visual_prompt: vivid AI image generation description — specific enough to produce a great image
- motion_prompt: subtle realistic camera movement (pan, zoom, drift, handheld shake)
- Choose the narrative arc that BEST fits this specific content — don't default to a generic pattern
- creative_rationale: explain WHY you chose this structure (2-3 sentences)

Brand context:
${brandContext}

Target platforms: ${platformList}
Platform norms: Short-form vertical video, fast cuts, immediate hook, clear value proposition`,
        },
        {
          role: 'user',
          content: `Design a video ad storyboard for this article.

Article Analysis:
- Type: ${analysis.article_type}
- Tone: ${analysis.tone}
- Key topic: ${analysis.key_topic}
- Main benefit: ${analysis.main_benefit}
- Target audience: ${analysis.target_audience}
- Has product: ${analysis.has_product}
- Has steps: ${analysis.has_steps}
- Has comparison: ${analysis.has_comparison}
- Has quotes: ${analysis.has_quotes}

Article content:
${truncated}`,
        },
      ],
      response_format: zodResponseFormat(DynamicStoryboardSchema, 'storyboard'),
    });

    storyboard = storyboardCompletion.choices[0].message.parsed;

    if (storyboardCompletion.usage) {
      logCost({ username: brand_username, category: 'openai', operation: 'ai_director_storyboard', model: 'gpt-5-mini', input_tokens: storyboardCompletion.usage.prompt_tokens, output_tokens: storyboardCompletion.usage.completion_tokens });
    }

    // ── Quality gate ─────────────────────────────────────────────────────
    const gateCompletion = await openai.beta.chat.completions.parse({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: `You are a quality reviewer for video ad storyboards. Score this storyboard 1-10 on five criteria. Set pass=true if average ≥ 7, false otherwise. If failing, provide specific feedback for improvement.`,
        },
        {
          role: 'user',
          content: `Brand: ${brandKit.brand_name || brand_username}
Article topic: ${analysis.key_topic}
Target audience: ${analysis.target_audience}

Storyboard:
${JSON.stringify(storyboard, null, 2)}`,
        },
      ],
      response_format: zodResponseFormat(QualityGateSchema, 'quality_gate'),
    });

    const gate = gateCompletion.choices[0].message.parsed;

    if (gateCompletion.usage) {
      logCost({ username: brand_username, category: 'openai', operation: 'ai_director_quality_gate', model: 'gpt-5-mini', input_tokens: gateCompletion.usage.prompt_tokens, output_tokens: gateCompletion.usage.completion_tokens });
    }

    // If quality gate fails, regenerate once with feedback
    if (!gate.pass && gate.feedback) {
      console.log(`[ai-director] Quality gate failed (avg ${gate.average_score}). Regenerating with feedback.`);

      const retryCompletion = await openai.beta.chat.completions.parse({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: `You are a senior creative director. Your previous storyboard was reviewed and needs improvement.

Feedback from quality review:
${gate.feedback}

Scores: relevance=${gate.scores.relevance}, brand=${gate.scores.brand_consistency}, hook=${gate.scores.hook_strength}, flow=${gate.scores.narrative_flow}, CTA=${gate.scores.cta_clarity}

Fix the issues and produce an improved storyboard. Same rules as before:
- 3-8 scenes, total ~${clampedDuration}s
- First scene hooks in ≤3s, last scene has CTA
- Headlines max 60 chars, voiceover max 120 chars

Brand context:
${buildBrandContext(brandKit)}`,
          },
          {
            role: 'user',
            content: `Article Analysis: ${JSON.stringify(analysis)}

Previous storyboard (improve this):
${JSON.stringify(storyboard, null, 2)}`,
          },
        ],
        response_format: zodResponseFormat(DynamicStoryboardSchema, 'storyboard'),
      });

      storyboard = retryCompletion.choices[0].message.parsed;

      if (retryCompletion.usage) {
        logCost({ username: brand_username, category: 'openai', operation: 'ai_director_storyboard_retry', model: 'gpt-5-mini', input_tokens: retryCompletion.usage.prompt_tokens, output_tokens: retryCompletion.usage.completion_tokens });
      }
    }

    await wf.transition('dynamic_storyboard', { storyboard, quality_gate: gate });
  } else {
    storyboard = wf.getStepResult('dynamic_storyboard')?.storyboard;
  }

  if (wf.isPaused) return;

  // ── Step 4: Create campaign + draft ─────────────────────────────────────
  let campaign, draft;
  if (!wf.hasCompleted('create_campaign')) {
    await updateJob({ current_step: 'creating_campaign', completed_steps: 3 });

    const { data: newCampaign } = await supabase.from('campaigns').insert({
      user_id: userId,
      name: storyboard.campaign_name || analysis.title || `AI Director ${new Date().toLocaleDateString()}`,
      article_title: analysis.title,
      platform: platforms[0] || 'tiktok',
      source_url: url || null,
      status: 'processing',
      brand_username: brand_username,
      total_drafts: 1,
      completed_drafts: 0,
    }).select().single();

    if (!newCampaign) throw new Error('Failed to create campaign');
    campaign = newCampaign;

    const { data: newDraft } = await supabase.from('ad_drafts').insert({
      campaign_id: campaign.id,
      user_id: userId,
      template_id: 'ai_director',
      template_name: 'AI Director',
      output_type,
      platforms,
      storyboard_json: { ...storyboard, analysis, platforms, mode: 'ai_director' },
      generation_status: 'generating',
      assets_json: [],
      style_preset_applied: stylePresetOverride || storyboard.recommended_style_preset || null,
    }).select().single();

    if (!newDraft) throw new Error('Failed to create draft');
    draft = newDraft;

    await wf.transition('create_campaign', { campaign_id: campaign.id, draft_id: draft.id });
  } else {
    const stepResult = wf.getStepResult('create_campaign');
    const { data: c } = await supabase.from('campaigns').select('*').eq('id', stepResult.campaign_id).single();
    const { data: d } = await supabase.from('ad_drafts').select('*').eq('id', stepResult.draft_id).single();
    campaign = c;
    draft = d;
    if (!campaign || !draft) throw new Error('Campaign or draft not found on resume');
  }

  if (wf.isPaused) return;

  // ── Step 5: Generate assets ─────────────────────────────────────────────
  if (!wf.hasCompleted('generate_assets')) {
    await updateJob({ current_step: 'generating_assets', completed_steps: 4 });

    const wantVideo = output_type === 'video' || output_type === 'both';
    const wantStatic = output_type === 'static' || output_type === 'both';
    const ratioGroups = groupPlatformsByRatio(platforms);

    // Resolve style
    const activePreset = stylePresetOverride || storyboard.recommended_style_preset || null;
    const styleSuffix = getStyleSuffix(activePreset);
    const sewoSuffix = brandKit._sewoImageStyle?.ai_prompt_instructions
      ? `, ${brandKit._sewoImageStyle.ai_prompt_instructions}`
      : '';

    // Resolve LoRA configs
    const loraConfigs = loraConfigOverride
      ? await resolveLoraOverrides(loraConfigOverride, brandKit, supabase)
      : await resolveBrandLoras(brandKit, supabase);

    if (loraConfigs.length) {
      console.log(`[ai-director] ${loraConfigs.length} LoRA(s) attached`);
    }

    // Map image_model_hint to actual model IDs
    const hintToModel = (hint) => {
      if (!hint || hint === 'default') return loraConfigs.length ? 'fal_flux' : undefined;
      if (hint === 'photorealistic') return 'fal_seedream';
      if (hint === 'graphic') return 'fal_ideogram';
      if (hint === 'artistic') return 'fal_flux';
      return undefined;
    };

    const allRatioAssets = [];
    const sceneInputsJson = [];

    for (const { ratio, platforms: groupPlatforms } of ratioGroups) {
      console.log(`[ai-director] Generating ${ratio} assets (sequential frame-chain)`);

      const sceneAssets = [];
      let prevFrameUrl = null;
      let prevFrameAnalysis = null;

      for (let sceneIdx = 0; sceneIdx < storyboard.scenes.length; sceneIdx++) {
        const scene = storyboard.scenes[sceneIdx];
        const isFirstScene = sceneIdx === 0;

        // ── Image ─────────────────────────────────────────────────────────
        let imageUrl = null;
        try {
          if (isFirstScene || !prevFrameUrl) {
            const sceneModel = hintToModel(scene.image_model_hint);
            const basePrompt = wantStatic && !wantVideo
              ? `${scene.visual_prompt}, with bold text overlay reading "${scene.headline}", ${scene.overlay_style.replace(/_/g, ' ')} style`
              : scene.visual_prompt;
            const enhancedPrompt = enhancePromptForPipeline(basePrompt, scene.role, sceneModel);
            imageUrl = await withRetry(
              () => generateImage(`${enhancedPrompt}${styleSuffix}${sewoSuffix}`, ratio, keys, supabase, sceneModel, loraConfigs),
              { maxAttempts: 3, baseDelayMs: 3000, onRetry: (a, e) => console.warn(`[ai-director] Scene ${sceneIdx} image retry ${a}: ${e.message}`) },
            );
          } else {
            imageUrl = prevFrameUrl;
          }
        } catch (imgErr) {
          console.error(`[ai-director] Scene ${sceneIdx} image failed:`, imgErr.message);
          sceneAssets.push({ scene, imageUrl: null, videoUrl: null });
          continue;
        }

        // ── Video ─────────────────────────────────────────────────────────
        let videoUrl = null;
        if (wantVideo && imageUrl) {
          try {
            const continuityNote = prevFrameAnalysis
              ? ` Maintain visual continuity from previous scene: ${prevFrameAnalysis}`
              : '';
            const motionPrompt = `${scene.motion_prompt || scene.visual_prompt}${continuityNote}`;

            videoUrl = await withRetry(
              () => animateImage(imageUrl, motionPrompt, ratio, Math.min(scene.duration_seconds || 5, 5), keys, supabase, undefined, loraConfigs),
              { maxAttempts: 2, baseDelayMs: 5000, onRetry: (a, e) => console.warn(`[ai-director] Scene ${sceneIdx} video retry ${a}: ${e.message}`) },
            );

            if (sceneIdx < storyboard.scenes.length - 1 && videoUrl && keys.falKey) {
              prevFrameUrl = await extractLastFrame(videoUrl, scene.duration_seconds || 5, keys.falKey);
              prevFrameAnalysis = await analyzeFrameContinuity(prevFrameUrl, openai);
              console.log(`[ai-director] Scene ${sceneIdx} → frame extracted & analyzed for continuity`);
            }
          } catch (vidErr) {
            console.error(`[ai-director] Scene ${sceneIdx} video failed:`, vidErr.message);
          }
        }

        sceneAssets.push({ scene, imageUrl, videoUrl });

        sceneInputsJson[sceneIdx] = {
          scene_index: sceneIdx,
          visual_prompt: scene.visual_prompt,
          motion_prompt: scene.motion_prompt,
          image_model_hint: scene.image_model_hint || null,
          lora_config: loraConfigs.length ? loraConfigs : null,
          style_suffix: `${styleSuffix}${sewoSuffix}` || '',
        };
      }

      allRatioAssets.push({ ratio, platforms: groupPlatforms, scenes: sceneAssets });
    }

    // Music
    let musicUrl = null;
    const totalSecs = storyboard.scenes.reduce((s, sc) => s + (sc.duration_seconds || 5), 0);
    musicUrl = await generateMusic(
      storyboard.music_mood || 'upbeat background music',
      Math.min(120, totalSecs + 5),
      keys, supabase,
    );

    // Concat videos
    const finalVideosByRatio = {};
    if (wantVideo && keys.falKey) {
      for (const { ratio, scenes: ratioScenes } of allRatioAssets) {
        const clips = ratioScenes.map(a => a.videoUrl).filter(Boolean);
        if (clips.length === 0) continue;
        try {
          const finalUrl = await concatVideos(clips, musicUrl, keys.falKey, supabase);
          finalVideosByRatio[ratio] = finalUrl;
          console.log(`[ai-director] Concatenated ${clips.length} clips (${ratio}) → ${finalUrl}`);
        } catch (concatErr) {
          console.error(`[ai-director] Concat failed (${ratio}):`, concatErr.message);
        }
      }
    }

    // Build timelines
    const timelinesByRatio = buildTimelines(allRatioAssets, musicUrl);

    // Save draft
    const successfulScenes = allRatioAssets[0]?.scenes.filter(s => s.imageUrl || s.videoUrl).length || 0;

    await supabase.from('ad_drafts').update({
      generation_status: successfulScenes > 0 ? 'ready' : 'failed',
      assets_json: allRatioAssets,
      static_assets_json: extractStaticAssets(allRatioAssets),
      music_url: musicUrl,
      timelines_json: timelinesByRatio,
      final_videos_json: finalVideosByRatio,
      captions_json: buildCaptionsJson(storyboard),
      scene_inputs_json: sceneInputsJson,
    }).eq('id', draft.id);

    await wf.transition('generate_assets', { successful_scenes: successfulScenes, total_scenes: storyboard.scenes.length });
  }

  if (wf.isPaused) return;

  // ── Step 6: Finalize ────────────────────────────────────────────────────
  const assetResult = wf.getStepResult('generate_assets') || {};

  await supabase.from('campaigns').update({
    status: assetResult.successful_scenes > 0 ? 'ready' : 'failed',
    completed_drafts: assetResult.successful_scenes > 0 ? 1 : 0,
  }).eq('id', campaign.id);

  await wf.transition('finalize', { campaign_id: campaign.id, draft_id: draft.id });

  await updateJob({
    status: 'completed',
    current_step: 'done',
    completed_steps: 6,
    workflow_state: 'completed',
    output_json: {
      campaign_id: campaign.id,
      draft_id: draft.id,
      mode: 'ai_director',
      scenes_generated: assetResult.successful_scenes,
      scenes_total: assetResult.total_scenes,
      creative_rationale: storyboard.creative_rationale,
    },
  });

  console.log(`[ai-director] Job ${jobId} complete — campaign ${campaign.id} — ${assetResult.successful_scenes}/${assetResult.total_scenes} scenes`);
}

// ── LoRA resolution helpers ──────────────────────────────────────────────────

async function resolveLoraOverrides(loraConfig, brandKit, supabase) {
  const configs = [];
  for (const entry of loraConfig) {
    if (entry.source === 'prebuilt') {
      const { data: lib } = await supabase.from('lora_library').select('*').eq('id', entry.lora_id).maybeSingle();
      if (lib) configs.push({ loraUrl: lib.hf_repo_id, triggerWord: lib.recommended_trigger_word || null, scale: entry.scale ?? lib.default_scale });
    } else {
      const { data: lora } = await supabase.from('brand_loras').select('fal_model_url, trigger_word').eq('id', entry.lora_id).eq('status', 'ready').maybeSingle();
      if (lora?.fal_model_url) configs.push({ loraUrl: lora.fal_model_url, triggerWord: lora.trigger_word || null, scale: entry.scale ?? 1.0 });
    }
  }
  return configs;
}

async function resolveBrandLoras(brandKit, supabase) {
  const configs = [];
  if (!brandKit.default_loras?.length) return configs;

  for (const entry of brandKit.default_loras) {
    if (entry.source === 'prebuilt') {
      const { data: lib } = await supabase.from('lora_library').select('*').eq('id', entry.lora_id).maybeSingle();
      if (lib) configs.push({ loraUrl: lib.hf_repo_id, triggerWord: lib.recommended_trigger_word || null, scale: entry.scale ?? lib.default_scale });
    } else {
      const { data: lora } = await supabase.from('brand_loras').select('fal_model_url, trigger_word').eq('id', entry.lora_id).eq('status', 'ready').maybeSingle();
      if (lora?.fal_model_url) configs.push({ loraUrl: lora.fal_model_url, triggerWord: lora.trigger_word || null, scale: entry.scale ?? 1.0 });
    }
  }
  return configs;
}

// ── Shared helpers (same as from-url.js) ─────────────────────────────────────

function buildBrandContext(brandKit) {
  const lines = [];
  if (brandKit.brand_name) lines.push(`Brand name: ${brandKit.brand_name}`);
  if (brandKit.voice_style) lines.push(`Voice/tone: ${brandKit.voice_style}`);
  if (brandKit.style_preset) lines.push(`Visual style: ${brandKit.style_preset}`);
  if (brandKit.colors?.length) lines.push(`Colors: ${brandKit.colors.join(', ')}`);
  if (brandKit.taglines?.length) lines.push(`Taglines: ${brandKit.taglines.join(' | ')}`);

  const gl = brandKit._sewoGuidelines;
  if (gl) {
    if (gl.voice_and_tone) lines.push(`Brand voice (detailed): ${gl.voice_and_tone}`);
    if (gl.target_market) lines.push(`Target market: ${gl.target_market}`);
    if (gl.brand_personality) lines.push(`Brand personality: ${gl.brand_personality}`);
    if (gl.content_style_rules) lines.push(`Content style rules: ${gl.content_style_rules}`);
    if (gl.preferred_elements) lines.push(`Preferred elements: ${gl.preferred_elements}`);
    if (gl.prohibited_elements) lines.push(`AVOID: ${gl.prohibited_elements}`);
    if (gl.ai_instructions_override) lines.push(`Custom AI instructions: ${gl.ai_instructions_override}`);
  }

  const is = brandKit._sewoImageStyle;
  if (is) {
    if (is.visual_style) lines.push(`Image visual style: ${is.visual_style}`);
    if (is.color_palette) lines.push(`Image color palette: ${is.color_palette}`);
    if (is.mood_and_atmosphere) lines.push(`Image mood: ${is.mood_and_atmosphere}`);
    if (is.composition_style) lines.push(`Image composition: ${is.composition_style}`);
    if (is.lighting_preferences) lines.push(`Lighting: ${is.lighting_preferences}`);
    if (is.subject_guidelines) lines.push(`Subject guidelines: ${is.subject_guidelines}`);
    if (is.preferred_elements) lines.push(`Image preferred elements: ${is.preferred_elements}`);
    if (is.prohibited_elements) lines.push(`Image AVOID: ${is.prohibited_elements}`);
    if (is.ai_prompt_instructions) lines.push(`AI image prompt prefix: ${is.ai_prompt_instructions}`);
  }

  return lines.join('\n') || 'No brand guidelines configured';
}

function buildTimelines(ratioAssets, musicUrl) {
  const FPS = 30;
  const timelines = {};

  for (const group of ratioAssets) {
    const items = [];
    let cursor = 0;

    for (let i = 0; i < group.scenes.length; i++) {
      const { scene, imageUrl, videoUrl } = group.scenes[i];
      const durationFrames = Math.round((scene.duration_seconds || 5) * FPS);

      if (videoUrl || imageUrl) {
        items.push({
          id: `${videoUrl ? 'video' : 'image'}-${group.ratio}-${i}`,
          type: 'video',
          url: videoUrl || imageUrl,
          title: scene.headline,
          startAt: cursor,
          durationInFrames: durationFrames,
          trackIndex: 0,
        });
      }

      if (scene.headline) {
        items.push({
          id: `text-${group.ratio}-${i}`,
          type: 'text',
          content: scene.headline,
          style: scene.overlay_style,
          position: scene.position,
          startAt: cursor,
          durationInFrames: durationFrames,
          trackIndex: 1,
        });
      }

      cursor += durationFrames;
    }

    if (musicUrl) {
      items.push({ id: `music-${group.ratio}`, type: 'audio', url: musicUrl, title: 'Background Music', startAt: 0, durationInFrames: cursor, trackIndex: 2 });
    }

    for (const platform of group.platforms) {
      timelines[platform] = { ratio: group.ratio, items, totalFrames: cursor };
    }
  }

  return timelines;
}

function extractStaticAssets(ratioAssets) {
  const statics = [];
  for (const group of ratioAssets) {
    for (const { scene, imageUrl } of group.scenes) {
      if (imageUrl) statics.push({ ratio: group.ratio, platforms: group.platforms, imageUrl, headline: scene.headline });
    }
  }
  return statics;
}

function buildCaptionsJson(storyboard) {
  return storyboard.scenes.map((s, i) => ({
    index: i, role: s.role, headline: s.headline, voiceover: s.voiceover, duration_seconds: s.duration_seconds,
  }));
}
