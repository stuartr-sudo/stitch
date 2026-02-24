/**
 * POST /api/article/from-url
 *
 * Autonomous article → video pipeline.
 * When a writing_structure is provided, ALL matching templates for the brand run in parallel.
 * Each template generates its own draft under a single campaign.
 *
 * Auth: webhook secret (no JWT — designed for server-to-server calls from Doubleclicker)
 *
 * Body: {
 *   url?: string,
 *   content?: string,
 *   brand_username: string,
 *   writing_structure?: string,  // e.g. 'BRAND-LISTICLE' — triggers all matching templates
 *   platforms?: string[],        // optional override — ignored when template.platforms is set
 *   output_type?: string,        // 'video' | 'static' | 'both' — default: template's own output_type
 *   user_template_id?: string,   // run one specific template by ID
 * }
 *
 * Response: { success, jobId, status, poll_url }
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { matchTemplate, groupPlatformsByRatio, VIDEO_TEMPLATES } from '../lib/videoTemplates.js';
import { generateImage, animateImage, generateMusic, scrapeArticle, extractLastFrame, analyzeFrameContinuity, concatVideos } from '../lib/pipelineHelpers.js';
import { VISUAL_STYLE_PRESETS, getStyleSuffix } from '../lib/stylePresets.js';
import { logCost } from '../lib/costLogger.js';
import { WorkflowEngine } from '../lib/workflowEngine.js';
import { withRetry } from '../lib/retryHelper.js';
import { selectVariantPresets } from '../lib/variantGenerator.js';
import { calculateNextPublishSlot } from '../lib/campaignHelpers.js';

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

const SceneSchema = z.object({
  role: z.string(),
  headline: z.string().max(60),
  voiceover: z.string().max(120),
  visual_prompt: z.string(),
  motion_prompt: z.string(),
  overlay_style: z.enum(['bold_white', 'minimal_dark', 'gradient_overlay']),
  position: z.enum(['top_safe', 'center', 'bottom_safe']),
  duration_seconds: z.number(),
});

const StoryboardSchema = z.object({
  campaign_name: z.string(),
  hook_headline: z.string(),
  cta_text: z.string(),
  music_mood: z.string(),
  scenes: z.array(SceneSchema),
});

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret && req.headers['x-webhook-secret'] !== webhookSecret) {
    return res.status(401).json({ error: 'Unauthorized — invalid webhook secret' });
  }

  const {
    url,
    content: rawContent,
    brand_username,
    writing_structure,
    article_title: articleTitleOverride,
    platforms: platformsOverride,
    output_type: outputTypeOverride,
    user_template_id,
    ab_variants: enableVariants,
    _autonomous_config: autonomousConfig,
  } = req.body;

  if (!brand_username) return res.status(400).json({ error: 'Missing brand_username' });
  if (!url && !rawContent) return res.status(400).json({ error: 'Missing url or content' });

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

  // ── Find which templates to run ───────────────────────────────────────────
  let templatesToRun = [];

  if (user_template_id) {
    // Explicit single template
    const { data: ut } = await supabase
      .from('user_templates')
      .select('*')
      .eq('id', user_template_id)
      .eq('user_id', userId)
      .single();
    if (ut) templatesToRun = [ut];
  } else if (writing_structure) {
    // Find templates for this writing_structure that are either brand-specific (exact match)
    // or brand-agnostic (null = runs for all brands). Brand-specific templates take priority.
    const { data: userTemplates } = await supabase
      .from('user_templates')
      .select('*')
      .eq('user_id', userId)
      .contains('applicable_writing_structures', [writing_structure])
      .or(`brand_username.eq.${brand_username},brand_username.is.null`)
      .order('brand_username', { nullsFirst: false }); // brand-specific first

    templatesToRun = userTemplates || [];
    console.log(`[pipeline] Writing structure "${writing_structure}" matched ${templatesToRun.length} template(s)`);
  }

  // If no templates matched, use auto-match (one built-in template, determined after article analysis)
  const useAutoMatch = templatesToRun.length === 0;

  // ── Create job record ─────────────────────────────────────────────────────
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .insert({
      user_id: userId,
      type: 'article_to_video',
      status: 'processing',
      current_step: 'scraping',
      total_steps: useAutoMatch ? 4 : 2 + templatesToRun.length,
      completed_steps: 0,
      input_json: { url, brand_username, writing_structure, templates_count: templatesToRun.length },
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
    templates_matched: templatesToRun.length,
  });

  // ── Background pipeline ───────────────────────────────────────────────────
  runPipeline({ job, userId, brandKit, keys, url, rawContent, articleTitleOverride, platformsOverride, outputTypeOverride, templatesToRun, useAutoMatch, writing_structure, enableVariants: enableVariants || autonomousConfig?.ab_variants, autonomousConfig, supabase })
    .catch(async (err) => {
      console.error('[article/from-url] Pipeline error:', err);
      await supabase.from('jobs').update({ status: 'failed', error: err.message, workflow_state: 'failed' }).eq('id', job.id);
    });
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

async function runPipeline({ job, userId, brandKit, keys, url, rawContent, articleTitleOverride, platformsOverride, outputTypeOverride, templatesToRun, useAutoMatch, writing_structure, enableVariants, autonomousConfig, supabase }) {
  const jobId = job.id;
  const updateJob = (patch) => supabase.from('jobs').update(patch).eq('id', jobId);
  const brand_username = brandKit.brand_username;

  // Initialize workflow engine for step tracking
  const wf = new WorkflowEngine(jobId, supabase);
  await wf.loadState();

  // Step 1: Scrape article (skip if already completed on resume)
  let truncated;
  if (!wf.hasCompleted('scrape')) {
    await updateJob({ current_step: 'scraping', completed_steps: 0 });

    let articleMarkdown = rawContent || '';
    if (!articleMarkdown && url) {
      articleMarkdown = await withRetry(
        () => scrapeArticle(url, process.env.FIRECRAWL_API_KEY),
        { maxAttempts: 2, baseDelayMs: 3000, onRetry: (a, e) => console.warn(`[pipeline] Scrape retry ${a}: ${e.message}`) }
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

  // Step 2: Analyse article
  let analysis;
  if (!wf.hasCompleted('analyze_article')) {
    await updateJob({ current_step: 'analysing_article', completed_steps: 1 });

    if (!keys.openaiKey) throw new Error('OpenAI API key required');
    const openai = new OpenAI({ apiKey: keys.openaiKey });

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
      logCost({ username: brand_username, category: 'openai', operation: 'article_analysis', model: 'gpt-4.1-mini', input_tokens: analysisCompletion.usage.prompt_tokens, output_tokens: analysisCompletion.usage.completion_tokens });
    }

    await wf.transition('analyze_article', { analysis });
  } else {
    analysis = wf.getStepResult('analyze_article')?.analysis;
  }

  if (wf.isPaused) return;

  // Step 3: Match templates
  if (!wf.hasCompleted('match_templates')) {
    if (useAutoMatch) {
      const templateKey = matchTemplate(analysis);
      const builtIn = VIDEO_TEMPLATES[templateKey];
      templatesToRun = [{
        id: `builtin:${templateKey}`,
        name: builtIn.name,
        scenes: builtIn.scenes.map(s => ({ ...s, duration_seconds: s.duration })),
        music_mood: builtIn.music_mood,
        voice_pacing: builtIn.voice_pacing,
        output_type: 'both',
        model_preferences: {},
        platforms: platformsOverride || ['tiktok', 'instagram_reels', 'youtube_shorts'],
        is_builtin: true,
      }];
    }
    await wf.transition('match_templates', { count: templatesToRun.length });
  }

  if (wf.isPaused) return;

  // Step 4: Create campaign
  let campaign;
  if (!wf.hasCompleted('create_campaign')) {
    await updateJob({ current_step: 'creating_campaign', completed_steps: 2 });

    const { data: newCampaign } = await supabase.from('campaigns').insert({
      user_id: userId,
      name: articleTitleOverride || analysis.title || `Campaign ${new Date().toLocaleDateString()}`,
      article_title: articleTitleOverride || analysis.title,
      platform: (templatesToRun[0]?.platforms?.[0]) || 'tiktok',
      source_url: url || null,
      status: 'processing',
      writing_structure: writing_structure || null,
      brand_username: brandKit.brand_username || null,
      total_drafts: templatesToRun.length,
      completed_drafts: 0,
    }).select().single();

    if (!newCampaign) throw new Error('Failed to create campaign');
    campaign = newCampaign;

    await wf.transition('create_campaign', { campaign_id: campaign.id });
  } else {
    const campId = wf.getStepResult('create_campaign')?.campaign_id;
    if (campId) {
      const { data } = await supabase.from('campaigns').select('*').eq('id', campId).single();
      campaign = data;
    }
    if (!campaign) throw new Error('Campaign not found on resume');
  }

  if (wf.isPaused) return;

  // Step 5: Generate assets — run each template in parallel
  if (!wf.hasCompleted('generate_assets')) {
    const openai = new OpenAI({ apiKey: keys.openaiKey });
    const brandContext = buildBrandContext(brandKit);

    const templateResults = await Promise.allSettled(
      templatesToRun.map((template, idx) =>
        runTemplateForArticle({
          template, analysis, truncated, campaign, userId, brandKit, brandContext,
          keys, openai, platformsOverride, outputTypeOverride, supabase, jobId,
          templateIndex: idx, totalTemplates: templatesToRun.length,
        })
      )
    );

    const successful = templateResults.filter(r => r.status === 'fulfilled').length;
    const failed = templateResults.filter(r => r.status === 'rejected').length;
    const successfulDraftIds = templateResults
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    if (failed > 0) {
      templateResults.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[pipeline] Template ${templatesToRun[i]?.name} failed:`, r.reason?.message);
      });
    }

    await wf.transition('generate_assets', { successful, failed, draftIds: successfulDraftIds });

    // A/B Variant generation — spawn additional drafts with contrasting style presets
    if (enableVariants && successful > 0) {
      const originalPreset = templatesToRun[0]?.visual_style_preset || 'cinematic';
      const variantPresets = selectVariantPresets(originalPreset, 2);
      const variantGroupId = crypto.randomUUID();

      // Tag original drafts with variant group
      for (const draftId of successfulDraftIds) {
        await supabase.from('ad_drafts')
          .update({ variant_group_id: variantGroupId, variant_label: 'original', style_preset_applied: originalPreset })
          .eq('id', draftId);
      }

      // Generate variant drafts
      for (const variantPreset of variantPresets) {
        console.log(`[pipeline] Generating A/B variant with preset "${variantPreset}"`);
        try {
          const variantResults = await Promise.allSettled(
            templatesToRun.map((template) =>
              runTemplateForArticle({
                template: { ...template, visual_style_preset: variantPreset },
                analysis, truncated, campaign, userId, brandKit,
                brandContext: buildBrandContext(brandKit),
                keys, openai, platformsOverride, outputTypeOverride, supabase, jobId,
                variantGroupId, variantLabel: `variant_${variantPreset}`,
              })
            )
          );
          const variantDraftIds = variantResults.filter(r => r.status === 'fulfilled').map(r => r.value);
          for (const draftId of variantDraftIds) {
            await supabase.from('ad_drafts')
              .update({ variant_group_id: variantGroupId, variant_label: `variant_${variantPreset}`, style_preset_applied: variantPreset })
              .eq('id', draftId);
          }
        } catch (varErr) {
          console.error(`[pipeline] Variant "${variantPreset}" failed:`, varErr.message);
        }
      }
    }
  }

  if (wf.isPaused) return;

  // Finalize — update campaign and job status
  const assetResult = wf.getStepResult('generate_assets') || {};
  const successful = assetResult.successful || 0;
  const failed = assetResult.failed || 0;

  await supabase.from('campaigns').update({
    status: successful > 0 ? 'ready' : 'failed',
    completed_drafts: successful,
  }).eq('id', campaign.id);

  // Autonomous: auto-schedule drafts if config says so
  if (autonomousConfig?.auto_publish && successful > 0) {
    const publishAt = calculateNextPublishSlot(autonomousConfig);
    await supabase.from('ad_drafts')
      .update({
        publish_status: 'scheduled',
        scheduled_for: publishAt.toISOString(),
      })
      .eq('campaign_id', campaign.id)
      .eq('generation_status', 'ready')
      .eq('publish_status', 'draft');
    console.log(`[autonomous] Auto-scheduled campaign ${campaign.id} for ${publishAt.toISOString()}`);
  }

  await wf.transition('finalize', { campaign_id: campaign.id });

  await updateJob({
    status: 'completed',
    current_step: 'done',
    completed_steps: 2 + templatesToRun.length,
    workflow_state: 'completed',
    output_json: {
      campaign_id: campaign.id,
      templates_run: templatesToRun.length,
      templates_succeeded: successful,
      templates_failed: failed,
      article_title: analysis.title,
    },
  });

  console.log(`[pipeline] Job ${jobId} complete — campaign ${campaign.id} — ${successful}/${templatesToRun.length} drafts succeeded`);
}

/** Re-entry point for retry endpoint — loads job from DB and runs pipeline */
export async function runPipelineFromJob(job, supabase) {
  const { data: brandKit } = await supabase.from('brand_kit').select('*').eq('brand_username', job.input_json?.brand_username).single();
  if (!brandKit) throw new Error('Brand not found');

  const { data: userKeys } = await supabase.from('user_api_keys').select('fal_key, wavespeed_key, openai_key').eq('user_id', job.user_id).maybeSingle();
  const keys = {
    falKey: userKeys?.fal_key || process.env.FAL_KEY,
    wavespeedKey: userKeys?.wavespeed_key || process.env.WAVESPEED_KEY || process.env.WAVESPEED_API_KEY,
    openaiKey: userKeys?.openai_key || process.env.OPENAI_API_KEY,
  };

  // Re-fetch templates
  let templatesToRun = [];
  const { writing_structure, url } = job.input_json || {};
  if (writing_structure) {
    const { data: ut } = await supabase.from('user_templates').select('*').eq('user_id', job.user_id).contains('applicable_writing_structures', [writing_structure]);
    templatesToRun = ut || [];
  }

  await runPipeline({
    job, userId: job.user_id, brandKit, keys, url,
    rawContent: null, articleTitleOverride: null, platformsOverride: null, outputTypeOverride: null,
    templatesToRun, useAutoMatch: templatesToRun.length === 0, writing_structure, supabase,
  });
}

// ── Per-template runner ───────────────────────────────────────────────────────

async function runTemplateForArticle({
  template, analysis, truncated, campaign, userId, brandKit, brandContext, keys, openai,
  platformsOverride, outputTypeOverride, supabase, jobId,
  variantGroupId, variantLabel,
}) {
  const modelPrefs = template.model_preferences || {};
  const outputType = outputTypeOverride || template.output_type || 'both';
  const wantVideo = outputType === 'video' || outputType === 'both';
  const wantStatic = outputType === 'static' || outputType === 'both';
  const platforms = platformsOverride || template.platforms || ['tiktok', 'instagram_reels', 'youtube_shorts'];
  const ratioGroups = groupPlatformsByRatio(platforms);

  console.log(`[pipeline] Running template "${template.name}" for campaign ${campaign.id}`);

  // Fetch the visual subject (LoRA) assigned to this template, if any.
  // The trigger word is prepended to every image prompt; the LoRA URL is passed to FAL models.
  let loraConfig = null;
  if (template.avatar_id) {
    const { data: subject } = await supabase
      .from('visual_subjects')
      .select('name, lora_url, lora_trigger_word')
      .eq('id', template.avatar_id)
      .maybeSingle();
    if (subject?.lora_url) {
      loraConfig = { triggerWord: subject.lora_trigger_word || null, loraUrl: subject.lora_url };
      console.log(`[pipeline] Visual subject "${subject.name}" (LoRA) attached to template`);
    }
  }

  // Normalize scenes (built-in templates use 'duration', user templates use 'duration_seconds')
  const templateScenes = (template.scenes || []).map(s => ({
    ...s,
    duration_seconds: s.duration_seconds || s.duration || 5,
  }));

  // Resolve visual style preset
  const stylePreset = template.visual_style_preset
    ? VISUAL_STYLE_PRESETS[template.visual_style_preset]
    : null;
  const styleSuffix = getStyleSuffix(template.visual_style_preset);

  const styleGuideBlock = stylePreset
    ? `\nVisual Style Preset — "${stylePreset.label}" (LOCKED — every visual_prompt must match this style):
- Lighting: ${stylePreset.lighting}
- Camera: ${stylePreset.camera}
- Color grade: ${stylePreset.color_grade}
- Mood: ${stylePreset.mood}
Write visual_prompts that strictly follow this style. Do not deviate.`
    : '';

  // Generate storyboard for this template
  const storyboardCompletion = await openai.beta.chat.completions.parse({
    model: 'gpt-5-mini',
    messages: [
      {
        role: 'system',
        content: `You are a creative director for short-form video ads.
Using the article content and brand guidelines, create a ${templateScenes.reduce((s, sc) => s + (sc.duration_seconds || 5), 0)}-second video storyboard in the "${template.name}" format.

Brand guidelines:
${brandContext}

Template structure (${templateScenes.length} scenes):
${templateScenes.map((s, i) => `Scene ${i + 1} [${s.role}] (${s.duration_seconds}s): ${s.hint || s.role}`).join('\n')}
${styleGuideBlock}
Rules:
- Headlines max 60 chars, punchy and direct
- Voiceovers max 120 chars, natural spoken language
- visual_prompt: vivid AI image generation description, include brand colors
- motion_prompt: subtle camera movement (pan, zoom, drift)
- Voice style: ${brandKit.voice_style || 'professional'}
- Brand colors: ${(brandKit.colors || []).slice(0, 3).join(', ') || 'not specified'}`,
      },
      { role: 'user', content: `Article:\n\n${truncated}\n\nAnalysis: ${JSON.stringify(analysis)}` },
    ],
    response_format: zodResponseFormat(StoryboardSchema, 'storyboard'),
  });

  const storyboard = storyboardCompletion.choices[0].message.parsed;

  // Log cost for storyboard generation
  if (storyboardCompletion.usage) {
    logCost({ username: brandKit.brand_username, category: 'openai', operation: 'storyboard_generation', model: 'gpt-4.1-mini', input_tokens: storyboardCompletion.usage.prompt_tokens, output_tokens: storyboardCompletion.usage.completion_tokens });
  }

  // Create draft record
  const draftInsert = {
    campaign_id: campaign.id,
    user_id: userId,
    template_id: String(template.id),
    template_name: template.name,
    output_type: outputType,
    platforms,
    storyboard_json: { ...storyboard, template: template.id, analysis, platforms },
    generation_status: 'generating',
    assets_json: [],
    style_preset_applied: template.visual_style_preset || null,
  };
  if (variantGroupId) {
    draftInsert.variant_group_id = variantGroupId;
    draftInsert.variant_label = variantLabel || 'original';
  }
  const { data: draft } = await supabase.from('ad_drafts').insert(draftInsert).select().single();

  if (!draft) throw new Error(`Failed to create draft for template "${template.name}"`);

  // Generate assets per ratio group — sequential per scene for frame continuity.
  // Scene 0: fresh image generated from visual_prompt.
  // Scene 1+: the extracted last frame of the previous clip is used directly as the
  //           seed image (no new image generation call). The frame is also analyzed
  //           via GPT-4o-mini vision so the motion prompt can reference exact lighting,
  //           color, and composition details for maximum continuity.
  const allRatioAssets = [];
  const sceneInputsJson = []; // Track generation params per scene for regeneration

  for (const { ratio, platforms: groupPlatforms } of ratioGroups) {
    console.log(`[pipeline] [${template.name}] Generating ${ratio} assets (sequential frame-chain)`);

    const sceneAssets = [];
    let prevFrameUrl = null;      // extracted last frame of previous clip
    let prevFrameAnalysis = null; // GPT-4o-mini description of that frame

    for (let sceneIdx = 0; sceneIdx < storyboard.scenes.length; sceneIdx++) {
      const scene = storyboard.scenes[sceneIdx];
      const isFirstScene = sceneIdx === 0;

      // ── Image: fresh gen for scene 0, extracted frame for scene 1+ ─────────
      let imageUrl = null;
      try {
        if (isFirstScene || !prevFrameUrl) {
          const basePrompt = wantStatic && !wantVideo
            ? `${scene.visual_prompt}, with bold text overlay reading "${scene.headline}", ${scene.overlay_style.replace(/_/g, ' ')} style`
            : scene.visual_prompt;
          imageUrl = await withRetry(
            () => generateImage(`${basePrompt}${styleSuffix}`, ratio, keys, supabase, modelPrefs.image_model, loraConfig),
            { maxAttempts: 3, baseDelayMs: 3000, onRetry: (a, e) => console.warn(`[pipeline] [${template.name}] Scene ${sceneIdx} image retry ${a}: ${e.message}`) }
          );
        } else {
          imageUrl = prevFrameUrl;
        }
      } catch (imgErr) {
        console.error(`[pipeline] [${template.name}] Scene ${sceneIdx} image failed after retries:`, imgErr.message);
        sceneAssets.push({ scene, imageUrl: null, videoUrl: null });
        continue;
      }

      // ── Video: animate the image, then extract + analyze the last frame ─────
      let videoUrl = null;
      if (wantVideo && imageUrl) {
        try {
          // Append frame analysis as a continuity note so the animator knows
          // what visual elements (lighting, palette, subject) to preserve.
          const continuityNote = prevFrameAnalysis
            ? ` Maintain visual continuity from previous scene: ${prevFrameAnalysis}`
            : '';
          const motionPrompt = `${scene.motion_prompt || scene.visual_prompt}${continuityNote}`;

          videoUrl = await withRetry(
            () => animateImage(imageUrl, motionPrompt, ratio, Math.min(scene.duration_seconds || 5, 5), keys, supabase, modelPrefs.video_model),
            { maxAttempts: 2, baseDelayMs: 5000, onRetry: (a, e) => console.warn(`[pipeline] [${template.name}] Scene ${sceneIdx} video retry ${a}: ${e.message}`) }
          );

          // Extract + analyze last frame for the next scene (skip on final scene).
          // No fallback — if extraction fails the template fails: broken continuity is worse than no video.
          if (sceneIdx < storyboard.scenes.length - 1 && videoUrl && keys.falKey) {
            prevFrameUrl = await extractLastFrame(videoUrl, scene.duration_seconds || 5, keys.falKey);
            prevFrameAnalysis = await analyzeFrameContinuity(prevFrameUrl, openai);
            console.log(`[pipeline] [${template.name}] Scene ${sceneIdx} → frame extracted & analyzed for continuity`);
          }
        } catch (vidErr) {
          console.error(`[pipeline] [${template.name}] Scene ${sceneIdx} video gen failed:`, vidErr.message);
        }
      }

      sceneAssets.push({ scene, imageUrl, videoUrl });

      // Record exact generation inputs for scene-level regeneration (Feature #14)
      if (!sceneInputsJson[sceneIdx]) {
        sceneInputsJson[sceneIdx] = {
          scene_index: sceneIdx,
          visual_prompt: scene.visual_prompt,
          motion_prompt: scene.motion_prompt,
          image_model: modelPrefs.image_model || null,
          video_model: modelPrefs.video_model || null,
          lora_config: loraConfig || null,
          style_suffix: styleSuffix || '',
        };
      }
    }

    allRatioAssets.push({ ratio, platforms: groupPlatforms, scenes: sceneAssets });
  }

  // Music
  let musicUrl = null;
  if (modelPrefs.music_model !== 'none') {
    const totalSecs = storyboard.scenes.reduce((s, sc) => s + (sc.duration_seconds || 5), 0);
    musicUrl = await generateMusic(storyboard.music_mood || template.music_mood || 'upbeat background music', Math.min(120, totalSecs + 5), keys, supabase, modelPrefs.music_model);
  }

  // Concatenate scene clips into one final video per ratio group.
  // Uses fal-ai/ffmpeg-api to stitch all clips in order and mix in music.
  // Only runs when video output is requested and a falKey is available.
  const finalVideosByRatio = {};
  if (wantVideo && keys.falKey) {
    for (const { ratio, scenes: ratioScenes } of allRatioAssets) {
      const clips = ratioScenes.map(a => a.videoUrl).filter(Boolean);
      if (clips.length === 0) continue;
      try {
        const finalUrl = await concatVideos(clips, musicUrl, keys.falKey, supabase);
        finalVideosByRatio[ratio] = finalUrl;
        console.log(`[pipeline] [${template.name}] Concatenated ${clips.length} clips (${ratio}) → ${finalUrl}`);
      } catch (concatErr) {
        console.error(`[pipeline] [${template.name}] Concat failed (${ratio}):`, concatErr.message);
      }
    }
  }

  // Assemble timelines (Remotion-compatible blueprint — still useful for previews)
  const timelinesByRatio = buildTimelines(allRatioAssets, musicUrl);

  // Save final draft
  await supabase.from('ad_drafts').update({
    generation_status: 'ready',
    assets_json: allRatioAssets,
    static_assets_json: wantStatic ? extractStaticAssets(allRatioAssets) : [],
    music_url: musicUrl,
    timelines_json: timelinesByRatio,
    final_videos_json: finalVideosByRatio,
    captions_json: buildCaptionsJson(storyboard),
    scene_inputs_json: sceneInputsJson,
  }).eq('id', draft.id);

  // Increment campaign completed count
  await supabase.rpc('increment_campaign_completed_drafts', { campaign_id: campaign.id });

  console.log(`[pipeline] Template "${template.name}" done — draft ${draft.id}`);
  return draft.id;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildBrandContext(brandKit) {
  const lines = [];
  if (brandKit.brand_name) lines.push(`Brand name: ${brandKit.brand_name}`);
  if (brandKit.voice_style) lines.push(`Voice/tone: ${brandKit.voice_style}`);
  if (brandKit.style_preset) lines.push(`Visual style: ${brandKit.style_preset}`);
  if (brandKit.colors?.length) lines.push(`Colors: ${brandKit.colors.join(', ')}`);
  if (brandKit.taglines?.length) lines.push(`Taglines: ${brandKit.taglines.join(' | ')}`);
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
  // Return the first image per scene per ratio group for static output
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

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
