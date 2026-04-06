/**
 * POST /api/workbench/repurpose
 *
 * Generate platform-specific metadata for a completed Short.
 * Optionally re-crops the video to 16:9 landscape for YouTube.
 *
 * Body: { draft_id, platforms: ['youtube_shorts', 'tiktok', 'instagram_reels', 'youtube_landscape'] }
 */

import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { pollFalQueue, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { logCost } from '../lib/costLogger.js';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

const PLATFORM_LABELS = {
  youtube_shorts: 'YouTube Shorts',
  tiktok: 'TikTok',
  instagram_reels: 'Instagram Reels',
  youtube_landscape: 'YouTube Landscape',
};

const PlatformMetadataSchema = z.object({
  youtube_shorts: z.object({
    title: z.string().describe('Title under 100 characters, attention-grabbing'),
    description: z.string().describe('Description with hashtags including #Shorts'),
    hashtags: z.array(z.string()).describe('5-10 relevant hashtags'),
  }).optional(),
  tiktok: z.object({
    caption: z.string().describe('Caption under 2200 chars, hook-first format, trendy'),
    hashtags: z.array(z.string()).describe('8-15 trending TikTok hashtags'),
  }).optional(),
  instagram_reels: z.object({
    caption: z.string().describe('Caption under 2200 chars, emoji-rich, engaging'),
    hashtags: z.array(z.string()).describe('Up to 30 relevant Instagram hashtags'),
  }).optional(),
  youtube_landscape: z.object({
    title: z.string().describe('Full SEO-optimized YouTube title'),
    description: z.string().describe('Full SEO description with timestamps and links section'),
    tags: z.array(z.string()).describe('10-20 SEO tags for YouTube'),
  }).optional(),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { draft_id, platforms } = req.body;
  if (!draft_id) return res.status(400).json({ error: 'draft_id required' });
  if (!platforms?.length) return res.status(400).json({ error: 'platforms array required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const keys = await getUserKeys(req.user.id, req.user.email);

  // Load the draft
  const { data: draft, error: draftErr } = await supabase
    .from('ad_drafts')
    .select('*')
    .eq('id', draft_id)
    .single();

  if (draftErr || !draft) return res.status(404).json({ error: 'Draft not found' });

  const state = draft.storyboard_json || {};
  const script = state.script || '';
  const niche = state.niche || '';
  const topic = state.topic || '';
  const finalVideoUrl = state.finalVideoUrl || '';

  if (!script.trim()) return res.status(400).json({ error: 'Draft has no script — assemble a video first' });

  // Filter to only requested platforms that we support
  const validPlatforms = platforms.filter(p => PLATFORM_LABELS[p]);
  if (!validPlatforms.length) return res.status(400).json({ error: 'No valid platforms specified' });

  try {
    // Generate metadata via GPT
    const openai = new OpenAI({ apiKey: keys.OPENAI_API_KEY });

    // Build a schema with only the requested platforms
    const platformInstructions = validPlatforms.map(p => {
      switch (p) {
        case 'youtube_shorts': return '- youtube_shorts: Title (< 100 chars, attention-grabbing), description with hashtags (include #Shorts at end), 5-10 relevant hashtags';
        case 'tiktok': return '- tiktok: Caption (< 2200 chars, hook-first — lead with the most shocking/interesting line, trendy casual tone), 8-15 trending TikTok hashtags';
        case 'instagram_reels': return '- instagram_reels: Caption (< 2200 chars, emoji-rich, line breaks for readability, call-to-action), up to 30 relevant Instagram hashtags';
        case 'youtube_landscape': return '- youtube_landscape: Full SEO title, detailed description (include a brief summary, key points, and a "Subscribe" CTA), 10-20 SEO tags';
        default: return '';
      }
    }).join('\n');

    const completion = await openai.chat.completions.parse({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are a social media content strategist. Generate platform-specific metadata for a short-form video being repurposed across platforms. Each platform has different conventions and audiences. Optimize for each platform's algorithm and culture.`
        },
        {
          role: 'user',
          content: `Generate metadata for the following platforms:\n${platformInstructions}\n\nVideo details:\n- Niche: ${niche}\n- Topic: ${topic}\n- Script: ${script.slice(0, 2000)}\n\nOnly include the platforms listed above. Make each version feel native to that platform.`
        }
      ],
      response_format: zodResponseFormat(PlatformMetadataSchema, 'platform_metadata'),
      temperature: 0.8,
    });

    const metadata = completion.choices[0].message.parsed;
    logCost({ username: req.user.email, category: 'openai', operation: 'repurpose_metadata', model: 'gpt-4.1-mini', metadata: { platforms: validPlatforms } });

    // Build repurposed versions array
    const repurposed = [];

    for (const platform of validPlatforms) {
      const platformMeta = metadata[platform];
      if (!platformMeta) continue;

      const version = {
        platform,
        label: PLATFORM_LABELS[platform],
        ...platformMeta,
        video_url: finalVideoUrl,
        aspect_ratio: '9:16',
        created_at: new Date().toISOString(),
      };

      // For landscape, re-crop the video to 16:9 with blurred background fill
      if (platform === 'youtube_landscape' && finalVideoUrl) {
        try {
          const landscapeUrl = await createLandscapeVersion(finalVideoUrl, keys, supabase, req.user);
          if (landscapeUrl) {
            version.video_url = landscapeUrl;
            version.aspect_ratio = '16:9';
          }
        } catch (err) {
          console.error('Landscape conversion failed:', err.message);
          // Keep original vertical video as fallback
        }
      }

      repurposed.push(version);
    }

    // Save repurposed versions back to draft
    const updatedState = { ...state, repurposed };
    const { error: updateErr } = await supabase
      .from('ad_drafts')
      .update({ storyboard_json: updatedState })
      .eq('id', draft_id);

    if (updateErr) console.error('Failed to save repurposed versions:', updateErr.message);

    return res.json({ repurposed });
  } catch (err) {
    console.error('Repurpose error:', err);
    return res.status(500).json({ error: err.message || 'Repurpose failed' });
  }
}

/**
 * Create a 16:9 landscape version from a 9:16 vertical video.
 * Uses blurred + scaled background fill behind the centered original.
 */
async function createLandscapeVersion(videoUrl, keys, supabase, user) {
  const falKey = keys.FAL_KEY;
  if (!falKey) throw new Error('FAL_KEY required for landscape conversion');

  // Use FAL ffmpeg compose to create 16:9 with blurred background
  const submitRes = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/compose', {
    method: 'POST',
    headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: [
        { type: 'video', url: videoUrl },
      ],
      filters: [
        // Create blurred background layer scaled to 16:9
        { name: 'scale', inputs: '0:v', options: '1920:1080', outputs: 'bg_scaled' },
        { name: 'boxblur', inputs: 'bg_scaled', options: '30:5', outputs: 'bg_blur' },
        // Scale the original to fit height of 1080
        { name: 'scale', inputs: '0:v', options: '-1:1080', outputs: 'fg' },
        // Overlay centered
        { name: 'overlay', inputs: ['bg_blur', 'fg'], options: '(W-w)/2:(H-h)/2', outputs: 'out' },
      ],
      output_options: '-map [out] -map 0:a?',
      output_format: 'mp4',
    }),
  });

  if (!submitRes.ok) {
    const errBody = await submitRes.text();
    throw new Error(`FFmpeg submit failed: ${submitRes.status} ${errBody}`);
  }

  const submitData = await submitRes.json();
  const requestId = submitData.request_id;

  // Poll for result
  const result = await pollFalQueue('fal-ai/ffmpeg-api/compose', requestId, falKey);
  const outputUrl = result?.video?.url || result?.output?.url || result?.url;
  if (!outputUrl) throw new Error('No output URL from landscape conversion');

  // Upload to Supabase for persistence
  const permanentUrl = await uploadUrlToSupabase(outputUrl, supabase, user.id, 'pipeline/finals');
  logCost({ username: user.email, category: 'fal', operation: 'repurpose_landscape', model: 'ffmpeg-api/compose' });

  return permanentUrl;
}
