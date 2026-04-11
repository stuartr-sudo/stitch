/**
 * POST /api/longform/:action
 *
 * Longform Video Workbench — chapter-based 3-15 minute video creation.
 * Same architecture as workbench.js but with chapter structure.
 *
 * Actions:
 *   research        — GPT-4.1 topic research
 *   script          — Generate structured longform script with chapters
 *   voiceover       — Generate voiceover per chapter
 *   timing          — Whisper timestamps + block alignment per chapter
 *   music           — Generate background music
 *   generate-frame  — Generate a single image (T2I or I2I)
 *   generate-clip   — Generate a single video clip (FLF or I2V)
 *   assemble        — Chapter-by-chapter assembly, then concatenate
 *   save-draft / load-draft / list-drafts — Draft persistence
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { generateGeminiVoiceover } from '../lib/voiceoverGenerator.js';
import { getWordTimestamps } from '../lib/getWordTimestamps.js';
import { alignBlocks } from '../lib/blockAligner.js';
import { generateImageV2, animateImageV2 } from '../lib/mediaGenerator.js';
import { VIDEO_MODELS, veoDuration } from '../lib/modelRegistry.js';
import {
  generateMusic as genMusic, assembleShort, buildMusicPrompt,
  uploadUrlToSupabase, pollFalQueue, extractLastFrame, analyzeFrameContinuity,
} from '../lib/pipelineHelpers.js';
import { SHORTS_TEMPLATES } from '../lib/shortsTemplates.js';
import { burnCaptions } from '../lib/captionBurner.js';
import { composeVideoPrompt } from '../lib/visualPromptComposer.js';
import { logCost } from '../lib/costLogger.js';
import OpenAI from 'openai';

const FLF_MODELS = ['fal_veo3', 'fal_veo3_lite', 'fal_kling_v3', 'fal_kling_o3'];

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const action = req.url.split('/').pop().split('?')[0];
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const keys = await getUserKeys(req.user.id, req.user.email);

  try {
    switch (action) {

      // ─── Research ─────────────────────────────────────────────────
      case 'research': {
        const { topic, niche } = req.body;
        if (!topic?.trim()) return res.status(400).json({ error: 'topic required' });

        const openai = new OpenAI({ apiKey: keys.openaiKey });
        const nicheLabel = niche || 'general';

        const completion = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages: [
            {
              role: 'system',
              content: `You are a research assistant for longform video content (5-15 minutes). Given a topic and niche, provide deep research including key points, suggested chapter structure, and recommended duration. Return JSON.`,
            },
            {
              role: 'user',
              content: `Research this topic for a longform ${nicheLabel} video:\n\nTopic: ${topic.trim()}\nNiche: ${nicheLabel}\n\nReturn a JSON object with:\n- research_summary (string, 2-3 paragraphs of background research)\n- key_points (array of 5-8 important points to cover)\n- suggested_chapters (array of objects with "title" and "description" fields, 3-8 chapters)\n- suggested_duration_minutes (number, recommended video length in minutes)\n\nReturn ONLY valid JSON, no markdown.`,
            },
          ],
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
        logCost({ username: req.user.email, category: 'openai', operation: 'longform_research', model: 'gpt-4.1', metadata: { topic: topic.slice(0, 100) } });

        return res.json(result);
      }

      // ─── Script ───────────────────────────────────────────────────
      case 'script': {
        const { niche, topic, research, duration_minutes = 5, num_chapters = 4 } = req.body;
        if (!topic?.trim()) return res.status(400).json({ error: 'topic required' });

        const openai = new OpenAI({ apiKey: keys.openaiKey });
        const nicheTemplate = niche && SHORTS_TEMPLATES[niche] ? SHORTS_TEMPLATES[niche] : null;
        const targetSeconds = duration_minutes * 60;
        // ~2.5 words per second for natural narration pace
        const targetWords = Math.round(targetSeconds * 2.5);
        const scenesPerChapter = Math.max(2, Math.round(targetSeconds / (num_chapters * 15)));

        const completion = await openai.chat.completions.create({
          model: 'gpt-4.1',
          messages: [
            {
              role: 'system',
              content: `You are a professional scriptwriter for longform video content. Write engaging, well-paced scripts with clear chapter structure. Each scene should have narration (what the narrator says) and visual direction (what appears on screen).

${nicheTemplate ? `Niche voice style: ${nicheTemplate.voice_pacing}` : ''}
${nicheTemplate ? `Visual mood: ${nicheTemplate.visual_mood}` : ''}

Target total duration: ${targetSeconds} seconds (~${targetWords} words total).
Target chapters: ${num_chapters} with ~${scenesPerChapter} scenes each.
Each scene should be 10-20 seconds of narration.

Return ONLY valid JSON.`,
            },
            {
              role: 'user',
              content: `Write a longform video script for:\n\nTopic: ${topic.trim()}\nNiche: ${niche || 'general'}\n${research ? `Research context: ${research.slice(0, 1500)}` : ''}\n\nReturn JSON:\n{\n  "title": "Video Title",\n  "chapters": [\n    {\n      "title": "Chapter 1: ...",\n      "scenes": [\n        { "scene_number": 1, "narration": "...", "visual_direction": "...", "duration_seconds": 15 }\n      ]\n    }\n  ],\n  "total_duration_seconds": ${targetSeconds}\n}`,
            },
          ],
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
        logCost({ username: req.user.email, category: 'openai', operation: 'longform_script', model: 'gpt-4.1', metadata: { chapters: result.chapters?.length || 0 } });

        return res.json(result);
      }

      // ─── Voiceover ────────────────────────────────────────────────
      case 'voiceover': {
        const { text, voice = 'Charon', style_instructions, speed = 1.0, chapter_index } = req.body;
        if (!text?.trim()) return res.status(400).json({ error: 'text required' });

        let baseStyle = style_instructions || 'Speak in a warm, professional documentary tone with good pacing for longer content.';
        let pacingPrefix = '';
        if (speed >= 1.3) {
          pacingPrefix = 'Speak at a brisk, fast pace with high energy. Keep sentences flowing quickly with minimal pauses between phrases. ';
        } else if (speed >= 1.15) {
          pacingPrefix = 'Speak at an uptempo, lively pace. Keep momentum between sentences with short pauses. ';
        } else if (speed >= 1.05) {
          pacingPrefix = 'Speak at a slightly quick, engaging pace. ';
        }
        const finalStyle = pacingPrefix + baseStyle;

        const audioUrl = await generateGeminiVoiceover(text, keys, supabase, {
          voice,
          model: 'gemini-2.5-flash-tts',
          styleInstructions: finalStyle,
        });

        logCost({ username: req.user.email, category: 'fal', operation: 'longform_voiceover', model: 'gemini-2.5-flash-tts', metadata: { character_count: text.length, chapter_index } });

        return res.json({ audio_url: audioUrl, speed, chapter_index });
      }

      // ─── Timing (Whisper + Block Aligner) ─────────────────────────
      case 'timing': {
        const { audio_url, video_model = 'fal_veo3', voice_speed = 1.0, chapter_index } = req.body;
        if (!audio_url) return res.status(400).json({ error: 'audio_url required' });

        const { words, totalDuration: rawDuration } = await getWordTimestamps(audio_url, keys.falKey);
        const effectiveDuration = rawDuration / voice_speed;
        const effectiveWords = words.map(w => ({
          ...w,
          start: w.start / voice_speed,
          end: w.end / voice_speed,
        }));

        let blocks;
        if (effectiveWords.length > 0) {
          const alignment = alignBlocks(effectiveWords, effectiveDuration, video_model, null);
          blocks = alignment.blocks;
        } else {
          blocks = [{ clipDuration: effectiveDuration, startTime: 0, endTime: effectiveDuration, narration: '' }];
        }

        logCost({ username: req.user.email, category: 'fal', operation: 'longform_whisper', model: 'whisper-v3', metadata: { word_count: words.length, chapter_index } });

        return res.json({ blocks, tts_duration: effectiveDuration, raw_tts_duration: rawDuration, voice_speed, word_count: words.length, chapter_index });
      }

      // ─── Music ────────────────────────────────────────────────────
      case 'music': {
        const { niche, duration = 300, music_model = 'elevenlabs' } = req.body;
        const nicheMood = niche && SHORTS_TEMPLATES[niche] ? SHORTS_TEMPLATES[niche].music_mood : null;
        const prompt = buildMusicPrompt(nicheMood || 'cinematic background score for a longform documentary video');
        const validModels = ['elevenlabs', 'minimax', 'fal_lyria2', 'suno'];
        const selectedModel = validModels.includes(music_model) ? music_model : 'elevenlabs';
        const audioUrl = await genMusic(prompt, duration, keys, supabase, selectedModel);
        if (!audioUrl) return res.status(500).json({ error: 'Music generation failed' });
        logCost({ username: req.user.email, category: 'fal', operation: 'longform_music', model: selectedModel, metadata: { duration } });
        return res.json({ audio_url: audioUrl });
      }

      // ─── Generate Frame ───────────────────────────────────────────
      case 'generate-frame': {
        const {
          prompt, narration, visual_style, visual_style_prompt, video_style,
          image_model = 'fal_nano_banana', aspect_ratio = '16:9',
          reference_image_url, scene_index, frame_type, vision_context, niche,
          characters = [],
        } = req.body;

        if (!prompt && !narration) return res.status(400).json({ error: 'prompt or narration required' });

        let imageUrl;
        const effectivePrompt = prompt || narration;

        const nicheTemplate = niche && SHORTS_TEMPLATES[niche] ? SHORTS_TEMPLATES[niche] : null;
        const nicheMood = nicheTemplate?.visual_mood || null;

        const charDescriptions = characters
          .filter(c => c.description)
          .map(c => `CHARACTER "${c.name}": ${c.description}`)
          .join('\n');

        // LLM prompt synthesis (same pattern as workbench.js)
        const openai = new OpenAI({ apiKey: keys.openaiKey });
        const sections = [];
        if (charDescriptions) sections.push(`CHARACTERS IN THIS SCENE (must appear as described):\n${charDescriptions}`);
        if (nicheMood) sections.push(`ATMOSPHERE & MOOD (CRITICAL — this defines the overall tone): ${nicheMood}`);
        sections.push(`NARRATION/SCENE CONTEXT: ${effectivePrompt}`);
        if (visual_style_prompt) sections.push(`VISUAL STYLE: ${visual_style_prompt}`);
        if (video_style) sections.push(`VIDEO/MOTION STYLE: ${video_style}`);
        if (vision_context) sections.push(`CONTINUITY FROM PREVIOUS SCENE: ${vision_context.slice(0, 300)}`);
        if (frame_type === 'end') sections.push(`FRAME TYPE: End frame — show the conclusion/result of the action described.`);
        else if (frame_type === 'start') sections.push(`FRAME TYPE: Start frame — show the beginning/setup of the action described.`);

        let finalPrompt;
        const llmMessages = [
          { role: 'system', content: `You are a visual prompt engineer for AI image generation. Synthesize ALL inputs into a single vivid image generation prompt (2-4 sentences).

PRIORITY ORDER:
1. ATMOSPHERE & MOOD — this is the VISUAL UNDERTONE. It defines color palette, lighting, and emotional tone. Every image must feel like it belongs in this genre.
2. NARRATION — extract ONLY the visual elements implied by the story (setting, characters, objects, environment).
3. VISUAL STYLE — artistic rendering approach.
4. CONTINUITY — match previous scene's look if provided.

Rules:
- Describe ONLY what should be VISIBLE — people, objects, environment, lighting, composition, colors, mood.
- The mood/atmosphere must permeate every visual choice (lighting, color grading, composition).
- Never include narration text, dialogue, or abstract concepts.
- Output the prompt only, no explanation.` },
          { role: 'user', content: sections.join('\n\n') },
        ];

        try {
          const llmRes = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: llmMessages,
            max_tokens: 300,
          });
          finalPrompt = (llmRes.choices[0]?.message?.content || '').trim();
          console.log(`[longform/generate-frame] LLM prompt (${finalPrompt.length} chars): ${finalPrompt.slice(0, 200)}...`);
        } catch (err) {
          console.warn(`[longform/generate-frame] LLM prompt synthesis failed, retrying: ${err.message}`);
          try {
            const retryRes = await openai.chat.completions.create({ model: 'gpt-4.1-nano', messages: llmMessages, max_tokens: 200 });
            finalPrompt = (retryRes.choices[0]?.message?.content || '').trim();
          } catch (retryErr) {
            console.error(`[longform/generate-frame] Both LLM calls failed: ${retryErr.message}`);
            finalPrompt = effectivePrompt;
          }
        }

        if (reference_image_url && frame_type === 'start' && scene_index > 0 && !req.body.use_as_i2i) {
          imageUrl = reference_image_url;
        } else if (reference_image_url) {
          console.log(`[longform/generate-frame] I2I mode: ref=${reference_image_url.slice(-40)}`);
          const i2iRes = await fetch('https://fal.run/fal-ai/nano-banana-2/edit', {
            method: 'POST',
            headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_urls: [reference_image_url],
              prompt: finalPrompt,
              aspect_ratio: aspect_ratio,
              resolution: '1K',
              num_images: 1,
            }),
          });
          if (!i2iRes.ok) throw new Error(`I2I failed: ${await i2iRes.text()}`);
          const i2iData = await i2iRes.json();
          imageUrl = i2iData.images?.[0]?.url;
          if (!imageUrl) throw new Error('No image from I2I');
          imageUrl = await uploadUrlToSupabase(imageUrl, supabase, 'pipeline/longform');
        } else {
          imageUrl = await generateImageV2(image_model, finalPrompt, aspect_ratio, keys, supabase, {
            originalAspectRatio: aspect_ratio,
          });
        }

        let visionAnalysis = null;
        if (frame_type === 'end' || frame_type === 'single') {
          try {
            visionAnalysis = await analyzeFrameContinuity(imageUrl, openai);
          } catch (err) {
            console.warn(`[longform] Vision analysis failed: ${err.message}`);
          }
        }

        logCost({ username: req.user.email, category: 'fal', operation: 'longform_frame', model: image_model, metadata: { image_count: 1 } });

        return res.json({ image_url: imageUrl, vision_analysis: visionAnalysis });
      }

      // ─── Generate Clip ────────────────────────────────────────────
      case 'generate-clip': {
        const {
          mode, video_model = 'fal_veo3', start_frame_url, end_frame_url,
          motion_prompt = 'Smooth cinematic movement', camera_config, video_style,
          duration = 6, aspect_ratio = '16:9', scene_index,
        } = req.body;

        if (!start_frame_url) return res.status(400).json({ error: 'start_frame_url required' });

        let videoUrl;
        let actualDuration = null;
        let lastFrameUrl = null;
        let visionAnalysis = null;

        const fullPrompt = composeVideoPrompt('', motion_prompt, { videoStyle: video_style, isFLF: mode === 'flf', cameraConfig: camera_config });

        if (mode === 'flf') {
          if (!end_frame_url) return res.status(400).json({ error: 'end_frame_url required for FLF mode' });

          const isVeo = video_model === 'fal_veo3' || video_model === 'fal_veo3_lite';
          const veoDur = (d) => d <= 4 ? '4s' : d <= 6 ? '6s' : '8s';
          const klingDur = (d) => String(Math.max(3, Math.min(15, Math.round(d))));

          let endpoint, body;
          if (isVeo) {
            const isLite = video_model === 'fal_veo3_lite';
            endpoint = isLite
              ? 'fal-ai/veo3.1/lite/first-last-frame-to-video'
              : 'fal-ai/veo3.1/fast/first-last-frame-to-video';
            body = {
              prompt: fullPrompt,
              first_frame_url: start_frame_url,
              last_frame_url: end_frame_url,
              aspect_ratio: aspect_ratio,
              duration: veoDur(duration),
              resolution: '720p',
              generate_audio: false,
              safety_tolerance: '6',
              auto_fix: true,
            };
          } else {
            const model = VIDEO_MODELS?.[video_model];
            endpoint = model?.endpoint || 'fal-ai/kling-video/o3/pro/image-to-video';
            const isV3 = video_model === 'fal_kling_v3';
            body = {
              prompt: fullPrompt,
              ...(isV3 ? { start_image_url: start_frame_url } : { image_url: start_frame_url }),
              end_image_url: end_frame_url,
              aspect_ratio: aspect_ratio,
              duration: klingDur(duration),
              generate_audio: false,
            };
          }

          const submitRes = await fetch(`https://queue.fal.run/${endpoint}`, {
            method: 'POST',
            headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!submitRes.ok) throw new Error(`FLF submit failed: ${await submitRes.text()}`);
          const queueData = await submitRes.json();
          const result = await pollFalQueue(queueData.response_url || queueData.request_id, endpoint, keys.falKey, 150, 4000);
          videoUrl = result?.video?.url;
          if (!videoUrl) throw new Error('No video URL from FLF');
          videoUrl = await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/longform');

        } else {
          // I2V mode
          videoUrl = await animateImageV2(video_model, start_frame_url, fullPrompt, aspect_ratio, duration, keys, supabase, {
            generate_audio: false,
          });

          try {
            lastFrameUrl = await extractLastFrame(videoUrl, duration, keys.falKey);
            if (lastFrameUrl) {
              lastFrameUrl = await uploadUrlToSupabase(lastFrameUrl, supabase, 'pipeline/longform');
              const openai = new OpenAI({ apiKey: keys.openaiKey });
              visionAnalysis = await analyzeFrameContinuity(lastFrameUrl, openai);
            }
          } catch (err) {
            console.warn(`[longform] Last frame extraction failed: ${err.message}`);
          }
        }

        actualDuration = duration;

        logCost({ username: req.user.email, category: 'fal', operation: 'longform_clip', model: video_model, metadata: { video_count: 1, mode } });

        return res.json({
          video_url: videoUrl,
          actual_duration: actualDuration,
          last_frame_url: lastFrameUrl,
          vision_analysis: visionAnalysis,
        });
      }

      // ─── Assemble ─────────────────────────────────────────────────
      case 'assemble': {
        const {
          chapters, // [{ clips: [{url, duration}], voiceover_url }]
          music_url, music_volume = 0.12,
          voice_speed = 1.0, caption_config,
        } = req.body;

        if (!chapters?.length) return res.status(400).json({ error: 'chapters required' });

        // Assemble each chapter individually
        const chapterVideoUrls = [];
        for (let i = 0; i < chapters.length; i++) {
          const ch = chapters[i];
          if (!ch.clips?.length) continue;

          const videoUrls = ch.clips.map(c => c.url);
          const clipDurations = ch.clips.map(c => c.duration);
          const chapterDuration = clipDurations.reduce((a, b) => a + b, 0);

          // Assemble chapter clips + chapter voiceover via assembleShort
          const chapterUrl = await assembleShort(
            videoUrls,
            ch.voiceover_url || null,
            null, // no per-chapter music — music goes on the final concatenation
            keys.falKey,
            supabase,
            clipDurations,
            0, // no music volume per chapter
            ch.tts_duration || chapterDuration,
          );
          chapterVideoUrls.push({ url: chapterUrl, duration: chapterDuration });
          console.log(`[longform/assemble] Chapter ${i + 1}/${chapters.length} assembled: ${chapterUrl.slice(-40)}`);
        }

        if (chapterVideoUrls.length === 0) {
          return res.status(400).json({ error: 'No chapters with clips to assemble' });
        }

        // Concatenate all chapter videos + music into final longform video
        let finalUrl;
        if (chapterVideoUrls.length === 1) {
          // Single chapter — add music directly
          finalUrl = await assembleShort(
            [chapterVideoUrls[0].url],
            null, // voiceover already baked in
            music_url || null,
            keys.falKey,
            supabase,
            [chapterVideoUrls[0].duration],
            music_volume,
          );
        } else {
          // Multiple chapters — concatenate then add music
          const allUrls = chapterVideoUrls.map(c => c.url);
          const allDurations = chapterVideoUrls.map(c => c.duration);
          finalUrl = await assembleShort(
            allUrls,
            null, // voiceover already baked into chapter videos
            music_url || null,
            keys.falKey,
            supabase,
            allDurations,
            music_volume,
          );
        }

        // Burn captions if configured
        const uncaptionedUrl = finalUrl;
        if (caption_config) {
          try {
            finalUrl = await burnCaptions(finalUrl, caption_config, keys.falKey, supabase);
          } catch (err) {
            console.warn(`[longform] Caption burn failed, using uncaptioned: ${err.message}`);
          }
        }

        logCost({ username: req.user.email, category: 'fal', operation: 'longform_assemble', model: 'ffmpeg-compose', metadata: { chapter_count: chapters.length } });

        return res.json({ video_url: finalUrl, uncaptioned_url: uncaptionedUrl });
      }

      // ─── Save Draft ──────────────────────────────────────────────
      case 'save-draft': {
        const { draft_id, state } = req.body;
        if (!state) return res.status(400).json({ error: 'state required' });

        if (draft_id) {
          const { error } = await supabase.from('longform_drafts')
            .update({
              state,
              title: state.topic || state.title || 'Untitled',
              niche: state.niche || null,
              current_step: state.currentStep || 0,
              status: state.finalVideoUrl ? 'complete' : 'draft',
              updated_at: new Date().toISOString(),
            })
            .eq('id', draft_id)
            .eq('user_id', req.user.id);
          if (error) throw new Error(`Save failed: ${error.message}`);
          return res.json({ draft_id });
        }

        // Create new
        const { data: draft, error: draftErr } = await supabase.from('longform_drafts').insert({
          user_id: req.user.id,
          title: state.topic || 'Untitled Longform',
          niche: state.niche || null,
          state,
          current_step: state.currentStep || 0,
          status: 'draft',
        }).select('id').single();
        if (draftErr) throw new Error(`Draft create failed: ${draftErr.message}`);

        return res.json({ draft_id: draft.id });
      }

      // ─── Load Draft ──────────────────────────────────────────────
      case 'load-draft': {
        const draftId = req.method === 'GET'
          ? new URL(req.url, 'http://localhost').searchParams.get('id')
          : req.body?.draft_id;
        if (!draftId) return res.status(400).json({ error: 'draft_id required' });

        const { data: draft, error } = await supabase.from('longform_drafts')
          .select('*')
          .eq('id', draftId)
          .eq('user_id', req.user.id)
          .single();
        if (error || !draft) return res.status(404).json({ error: 'Draft not found' });

        return res.json({ draft });
      }

      // ─── List Drafts ─────────────────────────────────────────────
      case 'list-drafts': {
        const { data: drafts, error } = await supabase.from('longform_drafts')
          .select('id, title, niche, current_step, status, created_at, updated_at')
          .eq('user_id', req.user.id)
          .order('updated_at', { ascending: false })
          .limit(20);
        if (error) throw new Error(`List failed: ${error.message}`);

        return res.json({ drafts: drafts || [] });
      }

      default:
        return res.status(404).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error(`[longform/${action}] Error:`, err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
