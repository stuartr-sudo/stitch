/**
 * POST /api/batch/create
 *
 * Body: { niche, topics: [{ title, story_context }], config: { voice, voiceSpeed, visualStyle, duration, videoModel, framework, captionConfig } }
 * Returns: { batch_id, job_count }
 */

import { createClient } from '@supabase/supabase-js';
import { processNextBatchJob } from '../lib/batchProcessor.js';

const MAX_TOPICS = 10;

/**
 * Build TTS style_instructions from voiceSpeed.
 * The pipeline expects style_instructions (a pre-built string), not a raw speed number.
 * This mirrors the logic in the workbench voiceover action.
 */
function buildStyleInstructions(voiceSpeed = 1.15) {
  if (voiceSpeed >= 1.3) return 'Speak at a brisk, energetic pace. Keep delivery crisp. Do not drag words out.';
  if (voiceSpeed >= 1.15) return 'Speak at an uptempo conversational pace. Keep energy up. Do not drag words out.';
  if (voiceSpeed >= 1.05) return 'Speak slightly quicker than normal. Keep delivery crisp. Do not drag words out.';
  return 'Speak at a natural conversational pace. Do not drag words out.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, topics, config } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!niche) return res.status(400).json({ error: 'niche is required' });
  if (!Array.isArray(topics) || topics.length === 0) return res.status(400).json({ error: 'topics must be a non-empty array' });
  if (topics.length > MAX_TOPICS) return res.status(400).json({ error: `Maximum ${MAX_TOPICS} topics per batch` });
  if (!config) return res.status(400).json({ error: 'config is required' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  // ── Create batch row ─────────────────────────────────────────────────────────
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .insert({
      user_id: userId,
      niche,
      status: 'running',
      config,
      total_items: topics.length,
      completed_items: 0,
      failed_items: 0,
    })
    .select('id')
    .single();

  if (batchError || !batch) {
    console.error('[batch/create] Failed to create batch:', batchError?.message);
    return res.status(500).json({ error: 'Failed to create batch' });
  }

  const batchId = batch.id;

  // ── Create campaign + job for each topic ─────────────────────────────────────
  const createdCampaignIds = [];
  try {
    for (const topic of topics) {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: userId,
          name: topic.title,
          content_type: 'shorts',
          status: 'generating',
        })
        .select('id')
        .single();

      if (campaignError || !campaign) {
        throw new Error(`Failed to create campaign for topic "${topic.title}": ${campaignError?.message}`);
      }
      createdCampaignIds.push(campaign.id);

      // Build job input — mirrors what shortsPipeline expects
      const voiceSpeed = config.voiceSpeed || 1.15;
      const jobInput = {
        campaign_id: campaign.id,
        niche,
        topic: topic.title,
        story_context: topic.story_context || '',
        brand_username: userEmail,
        gemini_voice: config.voice || 'Kore',
        style_instructions: buildStyleInstructions(voiceSpeed),
        voice_speed: voiceSpeed,
        visual_style: config.visualStyle || 'cinematic_realism',
        video_length_preset: parseInt(config.duration) || 30,
        video_model: config.videoModel || 'veo-31-fast',
        framework: config.framework || null,
        caption_config: config.captionConfig || { preset: 'word_pop' },
        enable_background_music: true,
      };

      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: userId,
          batch_id: batchId,
          type: 'shorts_batch',
          status: 'pending',
          current_step: 'queued',
          total_steps: 10,
          completed_steps: 0,
          input_json: jobInput,
        });

      if (jobError) {
        throw new Error(`Failed to create job for topic "${topic.title}": ${jobError.message}`);
      }
    }
  } catch (err) {
    // Cleanup: delete batch and any campaigns created so far
    await Promise.all([
      supabase.from('batches').delete().eq('id', batchId),
      createdCampaignIds.length > 0
        ? supabase.from('campaigns').delete().in('id', createdCampaignIds)
        : Promise.resolve(),
    ]);
    console.error('[batch/create] Cleanup after error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  // ── Fire dispatcher (non-blocking) ───────────────────────────────────────────
  processNextBatchJob(batchId, supabase).catch(err =>
    console.error('[batch/create] processNextBatchJob error:', err.message)
  );

  console.log(`[batch/create] Batch ${batchId} created with ${topics.length} jobs for user ${userId}`);
  return res.json({ batch_id: batchId, job_count: topics.length });
}
