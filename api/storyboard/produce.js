/**
 * Storyboard Production Pipeline
 *
 * POST /api/storyboard/projects/:id/produce
 *
 * Creates a background job that generates all video clips, audio, and
 * assembles the final video. Responds immediately — the client polls
 * /production-status for progress.
 *
 * Pipeline steps:
 *   1. TTS — generate voiceover for frames with dialogue
 *   2. Video — sequential generation with frame chaining (model-aware)
 *   3. Lipsync — apply lip sync to frames with dialogue + video
 *   4. Music — generate background music track
 *   5. Assembly — compose all clips + audio into final video
 *   6. Captions — burn subtitles into final video
 *
 * Each step checkpoints to storyboard_jobs.step_results so the pipeline
 * can recover from failures and retry individual frames.
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';
import {
  animateImageV2,
  generateImageV2,
  MediaGenerationError,
} from '../lib/mediaGenerator.js';
import {
  pollFalQueue,
  uploadUrlToSupabase,
  extractLastFrame,
  extractFirstFrame,
  assembleShort,
  generateMusic,
  buildMusicPrompt,
} from '../lib/pipelineHelpers.js';
import { burnCaptions } from '../lib/captionBurner.js';
import { generateSpeech, generateStoryboardVoiceover } from '../lib/storyboardVoiceover.js';
import { applyStoryboardLipsync } from '../lib/storyboardLipsync.js';
import { VIDEO_MODELS, veoDuration } from '../lib/modelRegistry.js';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── Model Strategy Dispatch ─────────────────────────────────────────────────

/**
 * Determine the generation strategy for a model.
 * Returns: 'i2v' | 'r2v-element' | 'r2v-flat' | 'r2v-grok' | 'flf'
 */
function getModelStrategy(modelId) {
  const strategies = {
    'veo3-fast': 'i2v',
    'seedance-pro': 'i2v',
    'kling-video': 'i2v',
    'grok-imagine': 'i2v',
    'wavespeed-wan': 'i2v',
    'kling-r2v-pro': 'r2v-element',
    'kling-r2v-standard': 'r2v-element',
    'veo3': 'r2v-flat',
    'grok-r2v': 'r2v-grok',
    'veo3-first-last': 'flf',
  };
  return strategies[modelId] || 'i2v';
}

/**
 * Map frontend model IDs to modelRegistry keys for animateImageV2.
 */
function getRegistryKey(modelId) {
  const map = {
    'veo3-fast': 'fal_veo3',
    'seedance-pro': null, // Not in registry — use direct FAL call
    'kling-video': 'fal_kling',
    'grok-imagine': 'fal_grok_video',
    'wavespeed-wan': 'wavespeed_wan',
    'kling-r2v-pro': 'fal_kling_o3',
    'kling-r2v-standard': 'fal_kling_o3',
    'veo3': 'fal_veo3',
    'grok-r2v': 'fal_grok_video',
    'veo3-first-last': 'fal_veo3',
  };
  return map[modelId];
}

// ── Scene Video Generation (per strategy) ───────────────────────────────────

/**
 * Generate a video clip for a single frame.
 * Dispatches to the appropriate strategy based on model.
 *
 * @returns {{ videoUrl: string, lastFrameUrl: string|null }}
 */
async function generateFrameVideo(frame, config, prevLastFrame, keys, supabase) {
  const strategy = getModelStrategy(config.model);
  let startImage = prevLastFrame || config.startFrameUrl || frame.start_frame_url || frame.preview_image_url;

  // If no start image exists, generate one via T2I from the visual prompt
  if (!startImage && frame.visual_prompt) {
    console.log(`[Producer] Frame ${frame.frame_number}: No start image — generating via T2I`);
    try {
      startImage = await generateImageV2(
        config.imageModel || 'fal_nano_banana',
        frame.visual_prompt,
        config.aspectRatio || '16:9',
        keys, supabase
      );
      console.log(`[Producer] Frame ${frame.frame_number}: T2I start image generated`);
    } catch (err) {
      console.warn(`[Producer] Frame ${frame.frame_number}: T2I failed:`, err.message);
    }
  }

  if (!startImage && strategy !== 'r2v-flat' && strategy !== 'r2v-grok') {
    throw new Error(`Frame ${frame.frame_number}: No start image available`);
  }

  const prompt = frame.visual_prompt || '';
  const duration = frame.duration_seconds || config.frameInterval || 4;
  const aspectRatio = config.aspectRatio || '16:9';

  let videoUrl;

  switch (strategy) {
    case 'i2v': {
      // Standard Image-to-Video via modelRegistry
      const registryKey = getRegistryKey(config.model);
      if (registryKey) {
        videoUrl = await animateImageV2(
          registryKey, startImage, prompt, aspectRatio, duration, keys, supabase,
          { generate_audio: false }
        );
      } else {
        // Seedance — not in registry, call FAL directly
        videoUrl = await generateSeedanceVideo(startImage, prompt, duration, aspectRatio, keys, supabase);
      }
      break;
    }

    case 'r2v-element': {
      // Kling O3 R2V with @Element system
      const tier = config.model === 'kling-r2v-pro' ? 'pro' : 'standard';
      videoUrl = await generateKlingR2V(startImage, prompt, duration, aspectRatio, tier, config, keys, supabase);
      break;
    }

    case 'r2v-flat': {
      // Veo 3.1 R2V with image_urls array
      videoUrl = await generateVeoR2V(startImage, prompt, duration, aspectRatio, config, keys, supabase);
      break;
    }

    case 'r2v-grok': {
      // Grok R2V with reference_image_urls
      videoUrl = await generateGrokR2V(startImage, prompt, duration, aspectRatio, config, keys, supabase);
      break;
    }

    case 'flf': {
      // Veo 3.1 First-Last-Frame — needs a generated end keyframe
      videoUrl = await generateFLF(startImage, prompt, duration, aspectRatio, config, frame, keys, supabase);
      break;
    }

    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }

  // Extract last frame for chaining to next scene
  let lastFrameUrl = null;
  try {
    lastFrameUrl = await extractLastFrame(videoUrl, duration, keys.falKey);
    console.log(`[Producer] Frame ${frame.frame_number}: last frame extracted`);
  } catch (err) {
    console.warn(`[Producer] Frame ${frame.frame_number}: last frame extraction failed:`, err.message);
  }

  return { videoUrl, lastFrameUrl };
}

// ── Strategy Implementations ────────────────────────────────────────────────

async function generateSeedanceVideo(imageUrl, prompt, duration, aspectRatio, keys, supabase) {
  const res = await fetch('https://queue.fal.run/fal-ai/bytedance/seedance/v1.5/pro/image-to-video', {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt, image_url: imageUrl,
      duration: String(Math.min(Math.max(duration, 4), 12)),
      aspect_ratio: aspectRatio, generate_audio: false, camera_fixed: false,
    }),
  });
  if (!res.ok) throw new Error(`Seedance submit failed: ${await res.text()}`);
  const data = await res.json();
  if (data.video?.url) return uploadUrlToSupabase(data.video.url, supabase, 'pipeline/videos');
  const output = await pollFalQueue(data.response_url || data.request_id, 'fal-ai/bytedance/seedance/v1.5/pro/image-to-video', keys.falKey, 120, 4000);
  const url = output?.video?.url;
  if (!url) throw new Error('No video URL from Seedance');
  return uploadUrlToSupabase(url, supabase, 'pipeline/videos');
}

async function generateKlingR2V(startImage, prompt, duration, aspectRatio, tier, config, keys, supabase) {
  // Build elements from storyboard config
  const elements = (config.elements || []).filter(el => el.refs?.length > 0 || el.referenceImageUrls?.length > 0);
  const requestElements = elements.map(el => ({
    frontal_image_url: el.frontalImageUrl || el.refs?.[el.frontalIndex || 0] || el.refs?.[0],
    reference_image_urls: (el.referenceImageUrls || el.refs || []).slice(0, 3),
  }));

  // Fallback: if no elements configured, use start image as single element
  if (requestElements.length === 0 && startImage) {
    requestElements.push({ frontal_image_url: startImage, reference_image_urls: [startImage] });
  }

  const body = {
    prompt: prompt.includes('@Element') ? prompt : `@Element1 ${prompt}`,
    start_image_url: startImage,
    elements: requestElements,
    duration: String(Math.max(3, Math.min(15, Math.round(duration)))),
    aspect_ratio: aspectRatio,
    generate_audio: false,
  };

  const res = await fetch(`https://fal.run/fal-ai/kling-video/o3/${tier}/reference-to-video`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Kling R2V ${tier} failed: ${(await res.text()).substring(0, 200)}`);
  const data = await res.json();
  if (data.video?.url) return uploadUrlToSupabase(data.video.url, supabase, 'pipeline/videos');
  const output = await pollFalQueue(data.response_url || data.request_id, `fal-ai/kling-video/o3/${tier}/reference-to-video`, keys.falKey, 150, 4000);
  if (!output?.video?.url) throw new Error('No video URL from Kling R2V');
  return uploadUrlToSupabase(output.video.url, supabase, 'pipeline/videos');
}

async function generateVeoR2V(startImage, prompt, duration, aspectRatio, config, keys, supabase) {
  const refImages = [...(config.veoReferenceImages || [])];
  if (startImage && !refImages.includes(startImage)) refImages.unshift(startImage);

  // Strip brand names and AVOID: sections (Veo content policy)
  let cleanPrompt = prompt
    .replace(/\b(Pixar|Disney|DreamWorks|Cocomelon|Studio Ghibli|Ghibli|Nickelodeon|Cartoon Network)\b/gi, '')
    .replace(/\s*AVOID:\s*.*/i, '')
    .replace(/@Element\d+/g, '')
    .replace(/\s{2,}/g, ' ').trim();

  const body = {
    prompt: cleanPrompt,
    image_urls: refImages.slice(0, 5),
    aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
    duration: veoDuration(duration),
    resolution: config.resolution || '720p',
    generate_audio: false,
    auto_fix: true, safety_tolerance: '6',
  };

  const res = await fetch('https://queue.fal.run/fal-ai/veo3.1/reference-to-video', {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Veo R2V failed: ${(await res.text()).substring(0, 200)}`);
  const data = await res.json();
  const output = await pollFalQueue(data.response_url || data.request_id, 'fal-ai/veo3.1/reference-to-video', keys.falKey, 150, 4000);
  const url = output?.video?.url;
  if (!url) throw new Error('No video URL from Veo R2V');
  return uploadUrlToSupabase(url, supabase, 'pipeline/videos');
}

async function generateGrokR2V(startImage, prompt, duration, aspectRatio, config, keys, supabase) {
  const refImages = [...(config.veoReferenceImages || [])];
  if (startImage && !refImages.includes(startImage)) refImages.unshift(startImage);

  const body = {
    prompt,
    reference_image_urls: refImages.slice(0, 7),
    duration: Math.max(1, Math.min(10, Math.round(duration))),
    aspect_ratio: aspectRatio === 'auto' ? '16:9' : aspectRatio,
    resolution: config.resolution || '720p',
  };

  const res = await fetch('https://fal.run/xai/grok-imagine-video/reference-to-video', {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Grok R2V failed: ${(await res.text()).substring(0, 200)}`);
  const data = await res.json();
  if (data.video?.url) return uploadUrlToSupabase(data.video.url, supabase, 'pipeline/videos');
  const output = await pollFalQueue(data.response_url || data.request_id, 'xai/grok-imagine-video/reference-to-video', keys.falKey, 120, 4000);
  if (!output?.video?.url) throw new Error('No video URL from Grok R2V');
  return uploadUrlToSupabase(output.video.url, supabase, 'pipeline/videos');
}

async function generateFLF(startImage, prompt, duration, aspectRatio, config, frame, keys, supabase) {
  // FLF needs a last-frame keyframe image. Generate it from the visual prompt.
  const imageModel = config.imageModel || 'fal_nano_banana';
  const endFramePrompt = frame.visual_prompt
    ? `End state of scene: ${frame.visual_prompt}. Final moment, still composition.`
    : prompt;

  let endFrameUrl;
  try {
    endFrameUrl = await generateImageV2(imageModel, endFramePrompt, aspectRatio, keys, supabase);
  } catch (err) {
    console.warn(`[Producer] FLF end frame generation failed, using start image:`, err.message);
    endFrameUrl = startImage; // Fallback — will produce a loop-like video
  }

  const body = {
    prompt,
    first_frame_url: startImage,
    last_frame_url: endFrameUrl,
    aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
    duration: veoDuration(duration),
    resolution: config.resolution || '720p',
    generate_audio: false,
    auto_fix: true, safety_tolerance: '6',
  };

  const res = await fetch('https://fal.run/fal-ai/veo3.1/fast/first-last-frame-to-video', {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Veo FLF failed: ${(await res.text()).substring(0, 200)}`);
  const data = await res.json();
  if (data.video?.url) return uploadUrlToSupabase(data.video.url, supabase, 'pipeline/videos');
  const output = await pollFalQueue(data.response_url || data.request_id, 'fal-ai/veo3.1/fast/first-last-frame-to-video', keys.falKey, 150, 4000);
  if (!output?.video?.url) throw new Error('No video URL from Veo FLF');
  return uploadUrlToSupabase(output.video.url, supabase, 'pipeline/videos');
}

// ── Pipeline Runner ─────────────────────────────────────────────────────────

async function runProductionPipeline(jobId, storyboard, frames, keys) {
  const supabase = getSupabase();
  const config = {
    model: storyboard.global_model || 'veo3-fast',
    imageModel: storyboard.image_model || 'fal_nano_banana',
    aspectRatio: storyboard.aspect_ratio || '16:9',
    resolution: storyboard.resolution || '720p',
    frameInterval: storyboard.frame_interval || 4,
    startFrameUrl: storyboard.start_frame_url,
    elements: storyboard.elements || [],
    veoReferenceImages: storyboard.veo_reference_images || [],
    // Audio
    ttsModel: storyboard.tts_model || 'elevenlabs-v3',
    voice: storyboard.voice || 'Rachel',
    ttsSpeed: storyboard.tts_speed || 1.0,
    lipsyncModel: storyboard.lipsync_model || 'none',
    contentType: storyboard.content_type || 'cartoon',
    musicMood: storyboard.music_mood,
    musicVolume: storyboard.music_volume || 0.15,
    captionStyle: storyboard.caption_style || 'none',
  };

  const updateJob = async (updates) => {
    await supabase.from('storyboard_jobs').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', jobId);
  };

  const updateFrame = async (frameId, updates) => {
    await supabase.from('storyboard_frames').update(updates).eq('id', frameId);
  };

  const updateStoryboard = async (updates) => {
    await supabase.from('storyboards').update(updates).eq('id', storyboard.id);
  };

  try {
    // ── STEP 1: TTS ──
    const scenesWithDialogue = frames.filter(f => f.dialogue?.trim());
    if (scenesWithDialogue.length > 0) {
      await updateJob({ current_step: 'tts', step_results: { tts: { done: false } } });
      console.log(`[Producer] Step 1: TTS for ${scenesWithDialogue.length} frames`);

      const voResult = await generateStoryboardVoiceover(
        frames.map(f => ({ sceneNumber: f.frame_number, dialogue: f.dialogue })),
        { model: config.ttsModel, voice: config.voice, speed: config.ttsSpeed, falKey: keys.falKey, supabase }
      );

      // Save audio URLs to frames
      for (const r of voResult.results) {
        const frame = frames.find(f => f.frame_number === r.sceneNumber);
        if (frame && r.audioUrl) {
          await updateFrame(frame.id, { audio_url: r.audioUrl, tts_duration: r.durationSeconds });
          frame.audio_url = r.audioUrl;
          frame.tts_duration = r.durationSeconds;
        }
      }

      await updateJob({ step_results: { tts: { done: true, totalDuration: voResult.totalDuration } } });
      console.log(`[Producer] TTS complete: ${voResult.scenesWithAudio} frames, ${voResult.totalDuration?.toFixed(1)}s`);
    }

    // ── STEP 2: Video Generation (sequential with frame chaining) ──
    await updateJob({ current_step: 'video' });
    console.log(`[Producer] Step 2: Video generation (${frames.length} frames, model: ${config.model}, strategy: ${getModelStrategy(config.model)})`);

    let prevLastFrame = null;
    const completedFrames = [];
    const failedFrames = [];

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];

      // Skip already-done frames (for retry/resume)
      if (frame.generation_status === 'done' && frame.video_url) {
        prevLastFrame = frame.last_frame_url;
        completedFrames.push(frame.frame_number);
        continue;
      }

      await updateJob({ current_frame: frame.frame_number });
      await updateFrame(frame.id, { generation_status: 'generating', generation_attempt: (frame.generation_attempt || 0) + 1 });

      try {
        const { videoUrl, lastFrameUrl } = await generateFrameVideo(frame, config, prevLastFrame, keys, supabase);

        await updateFrame(frame.id, {
          video_url: videoUrl,
          last_frame_url: lastFrameUrl,
          generation_status: 'done',
          generation_error: null,
        });

        frame.video_url = videoUrl;
        frame.last_frame_url = lastFrameUrl;
        prevLastFrame = lastFrameUrl;
        completedFrames.push(frame.frame_number);

        console.log(`[Producer] Frame ${frame.frame_number}/${frames.length} done: ${videoUrl.substring(0, 80)}`);

        // Checkpoint
        await updateJob({
          step_results: {
            tts: { done: true },
            video: { done: false, completed: completedFrames, failed: failedFrames, current: frame.frame_number },
          },
        });

      } catch (err) {
        console.error(`[Producer] Frame ${frame.frame_number} failed:`, err.message);
        await updateFrame(frame.id, {
          generation_status: 'error',
          generation_error: err.message,
        });
        failedFrames.push(frame.frame_number);

        // Continue with next frame — use start image as fallback for chaining
        prevLastFrame = config.startFrameUrl;
      }
    }

    await updateJob({
      step_results: {
        tts: { done: true },
        video: { done: true, completed: completedFrames, failed: failedFrames },
      },
    });

    if (completedFrames.length === 0) {
      throw new Error('All frames failed video generation');
    }

    console.log(`[Producer] Video complete: ${completedFrames.length} done, ${failedFrames.length} failed`);

    // ── STEP 3: Lipsync ──
    if (config.lipsyncModel && config.lipsyncModel !== 'none') {
      const lipsyncEligible = frames.filter(f => f.video_url && f.audio_url);
      if (lipsyncEligible.length > 0) {
        await updateJob({ current_step: 'lipsync' });
        console.log(`[Producer] Step 3: Lipsync for ${lipsyncEligible.length} frames`);

        try {
          const lsResult = await applyStoryboardLipsync(
            lipsyncEligible.map(f => ({
              sceneNumber: f.frame_number,
              videoUrl: f.video_url,
              audioUrl: f.audio_url,
            })),
            { model: config.lipsyncModel, contentType: config.contentType, falKey: keys.falKey, supabase }
          );

          for (const r of lsResult.results) {
            if (r.lipsyncVideoUrl) {
              const frame = frames.find(f => f.frame_number === r.sceneNumber);
              if (frame) {
                await updateFrame(frame.id, { lipsync_video_url: r.lipsyncVideoUrl });
                frame.lipsync_video_url = r.lipsyncVideoUrl;
              }
            }
          }

          console.log(`[Producer] Lipsync complete: ${lsResult.stats.processed} processed`);
        } catch (err) {
          console.warn(`[Producer] Lipsync failed (non-fatal):`, err.message);
        }
      }
    }

    // ── STEP 4: Music ──
    let musicUrl = storyboard.music_url;
    if (config.musicMood?.trim() && !musicUrl) {
      await updateJob({ current_step: 'music' });
      console.log(`[Producer] Step 4: Music generation`);

      try {
        const totalDuration = frames.reduce((s, f) => s + (f.duration_seconds || 4), 0);
        musicUrl = await generateMusic(
          buildMusicPrompt(config.musicMood),
          totalDuration,
          keys,
          supabase,
          'beatoven'
        );
        if (musicUrl) {
          await updateStoryboard({ music_url: musicUrl });
          console.log(`[Producer] Music generated: ${musicUrl.substring(0, 80)}`);
        }
      } catch (err) {
        console.warn(`[Producer] Music failed (non-fatal):`, err.message);
      }
    }

    // ── STEP 5: Assembly ──
    await updateJob({ current_step: 'assembly' });
    console.log(`[Producer] Step 5: Assembly`);

    // Use lipsync video if available, otherwise raw video
    const videoUrls = frames
      .filter(f => f.video_url)
      .map(f => f.lipsync_video_url || f.video_url);
    const clipDurations = frames
      .filter(f => f.video_url)
      .map(f => f.tts_duration || f.duration_seconds || 4);

    // Build voiceover URL (first frame's audio, or null)
    const firstAudio = frames.find(f => f.audio_url)?.audio_url;

    let assembledUrl;
    if (firstAudio) {
      // Use assembleShort which handles voiceover + music mixing
      assembledUrl = await assembleShort(
        videoUrls, firstAudio, musicUrl, keys.falKey, supabase,
        clipDurations, config.musicVolume
      );
    } else {
      // No voiceover — simple concat with optional music
      const { concatVideos } = await import('../lib/pipelineHelpers.js');
      assembledUrl = await concatVideos(videoUrls, musicUrl, keys.falKey, supabase);
    }

    console.log(`[Producer] Assembled: ${assembledUrl.substring(0, 80)}`);

    // ── STEP 6: Captions ──
    let captionedUrl = null;
    if (config.captionStyle && config.captionStyle !== 'none' && firstAudio) {
      await updateJob({ current_step: 'captions' });
      console.log(`[Producer] Step 6: Captions (style: ${config.captionStyle})`);

      try {
        captionedUrl = await burnCaptions(assembledUrl, config.captionStyle, keys.falKey, supabase);
        console.log(`[Producer] Captioned: ${captionedUrl.substring(0, 80)}`);
      } catch (err) {
        console.warn(`[Producer] Captions failed (non-fatal):`, err.message);
      }
    }

    // ── DONE ──
    const finalUrl = captionedUrl || assembledUrl;
    await updateJob({
      status: 'complete',
      current_step: null,
      assembled_url: assembledUrl,
      captioned_url: captionedUrl,
      completed_at: new Date().toISOString(),
      step_results: {
        tts: { done: true },
        video: { done: true, completed: completedFrames, failed: failedFrames },
        lipsync: { done: true },
        music: { done: true, url: musicUrl },
        assembly: { done: true, url: assembledUrl },
        captions: { done: true, url: captionedUrl },
      },
    });

    await updateStoryboard({
      production_status: 'complete',
      assembled_url: assembledUrl,
      captioned_url: captionedUrl,
    });

    console.log(`[Producer] ✅ Production complete for "${storyboard.name}": ${finalUrl.substring(0, 80)}`);

  } catch (err) {
    console.error(`[Producer] ❌ Fatal error:`, err);
    await updateJob({ status: 'failed', error: err.message });
    await updateStoryboard({ production_status: 'failed' });
  }
}

// ── HTTP Handler ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = getSupabase();

  // Extract storyboard ID from URL
  const urlParts = (req.url || '').split('/');
  const projectsIdx = urlParts.indexOf('projects');
  const storyboardId = projectsIdx >= 0 ? urlParts[projectsIdx + 1] : req.body?.storyboardId;

  if (!storyboardId) return res.status(400).json({ error: 'Storyboard ID required' });

  // Load storyboard
  const { data: storyboard, error: sbErr } = await supabase
    .from('storyboards')
    .select('*')
    .eq('id', storyboardId)
    .eq('user_id', userId)
    .single();

  if (sbErr || !storyboard) return res.status(404).json({ error: 'Storyboard not found' });

  // Check not already producing
  if (storyboard.production_status === 'producing') {
    return res.status(409).json({ error: 'Production already running' });
  }

  // Load frames
  const { data: frames } = await supabase
    .from('storyboard_frames')
    .select('*')
    .eq('storyboard_id', storyboardId)
    .order('frame_number', { ascending: true });

  if (!frames?.length) return res.status(400).json({ error: 'No frames' });

  // Validate: at least some frames have visual prompts
  const scriptedFrames = frames.filter(f => f.visual_prompt);
  if (scriptedFrames.length === 0) {
    return res.status(400).json({ error: 'No frames have visual prompts — generate the script first' });
  }

  // Get API keys
  const keys = await getUserKeys(userId, req.user.email);
  if (!keys.falKey && !keys.wavespeedKey) {
    return res.status(400).json({ error: 'No API keys configured' });
  }

  // Create job
  const { data: job, error: jobErr } = await supabase
    .from('storyboard_jobs')
    .insert({
      storyboard_id: storyboardId,
      user_id: userId,
      status: 'running',
      current_step: 'tts',
      total_frames: frames.length,
      config: {
        model: storyboard.global_model,
        imageModel: storyboard.image_model,
        aspectRatio: storyboard.aspect_ratio,
        resolution: storyboard.resolution,
        voice: storyboard.voice,
        ttsModel: storyboard.tts_model,
        lipsyncModel: storyboard.lipsync_model,
        captionStyle: storyboard.caption_style,
        musicMood: storyboard.music_mood,
      },
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (jobErr) return res.status(500).json({ error: 'Failed to create job: ' + jobErr.message });

  // Update storyboard status
  await supabase.from('storyboards').update({ production_status: 'producing' }).eq('id', storyboardId);

  // Respond immediately
  console.log(`[Producer] Starting production for "${storyboard.name}" (job ${job.id})`);
  res.json({ success: true, job: { id: job.id, status: 'running' } });

  // Run pipeline in background
  runProductionPipeline(job.id, storyboard, frames, keys).catch(err => {
    console.error(`[Producer] Unhandled error:`, err);
  });
}
