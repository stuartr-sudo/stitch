/**
 * LoRA Training Background Poller
 *
 * Polls FAL.ai for any LoRA training jobs that are still in 'training' status.
 * This ensures training results are captured even if the user closes their browser.
 * Runs server-side on a 60s interval, independent of frontend polling.
 *
 * On completion:
 *   1. Downloads the .safetensors file from FAL CDN (temporary URL)
 *   2. Uploads it to Supabase permanent storage (media/lora-models/)
 *   3. Updates brand_loras with permanent URL + status 'ready'
 *   4. Updates linked visual_subjects if applicable
 */
import { createClient } from '@supabase/supabase-js';
import { getTrainingModel } from './trainingModelRegistry.js';

const POLL_INTERVAL_MS = 60_000; // 60 seconds
const MAX_TRAINING_AGE_HOURS = 24; // Stop polling jobs older than 24h (likely failed silently)

let isPolling = false;

export function startLoraPoller() {
  console.log(`[LoRA Poller] Started — checking every ${POLL_INTERVAL_MS / 1000}s`);
  // Run immediately once, then on interval
  pollTrainingJobs();
  setInterval(pollTrainingJobs, POLL_INTERVAL_MS);
}

async function pollTrainingJobs() {
  if (isPolling) return; // Prevent overlapping runs
  isPolling = true;

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all LoRAs still in 'training' status
    const cutoff = new Date(Date.now() - MAX_TRAINING_AGE_HOURS * 60 * 60 * 1000).toISOString();
    const { data: pendingLoras, error } = await supabase
      .from('brand_loras')
      .select('id, user_id, fal_request_id, training_model, created_at')
      .eq('status', 'training')
      .gt('created_at', cutoff)
      .order('created_at', { ascending: true });

    if (error || !pendingLoras?.length) {
      isPolling = false;
      return;
    }

    console.log(`[LoRA Poller] Checking ${pendingLoras.length} pending training job(s)`);

    for (const lora of pendingLoras) {
      try {
        await checkAndFinalizeTraining(supabase, lora);
      } catch (err) {
        console.warn(`[LoRA Poller] Error checking ${lora.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[LoRA Poller] Poll cycle error:', err.message);
  } finally {
    isPolling = false;
  }
}

async function checkAndFinalizeTraining(supabase, lora) {
  const { id, user_id, fal_request_id, training_model } = lora;

  // Resolve the user's FAL key
  const falKey = await resolveUserFalKey(supabase, user_id);
  if (!falKey) {
    console.warn(`[LoRA Poller] No FAL key for user ${user_id}, skipping ${id}`);
    return;
  }

  // Look up the model's FAL endpoint
  const model = getTrainingModel(training_model);
  const endpoint = model?.endpoint || 'fal-ai/flux-lora-fast-training';

  // Check status on FAL
  const statusUrl = `https://queue.fal.run/${endpoint}/requests/${fal_request_id}/status`;
  const statusRes = await fetch(statusUrl, {
    headers: { 'Authorization': `Key ${falKey}` },
  });

  if (!statusRes.ok) return; // Transient error, will retry next cycle

  const statusData = await statusRes.json();

  if (statusData.status === 'COMPLETED') {
    console.log(`[LoRA Poller] Training complete for "${id}" — fetching result`);

    // Fetch full result
    const resultUrl = `https://queue.fal.run/${endpoint}/requests/${fal_request_id}`;
    const resultRes = await fetch(resultUrl, {
      headers: { 'Authorization': `Key ${falKey}` },
    });
    const resultData = await resultRes.json();

    // Extract model URL via registry or fallback
    let modelUrl = model ? model.parseResult(resultData) : null;
    if (!modelUrl) {
      modelUrl = resultData.diffusers_lora_file?.url
        || resultData.lora_file?.url
        || resultData.output?.url
        || null;

      // Deep scan for .safetensors URL
      if (!modelUrl) {
        const match = JSON.stringify(resultData).match(/https?:\/\/[^"]+\.safetensors[^"]*/);
        if (match) modelUrl = match[0];
      }
    }

    if (!modelUrl) {
      console.error(`[LoRA Poller] No model URL in result for ${id}`);
      await supabase.from('brand_loras').update({ status: 'failed' }).eq('id', id);
      await updateLinkedSubject(supabase, id, 'failed');
      return;
    }

    // Try to upload to permanent Supabase storage
    let permanentUrl = modelUrl;
    try {
      console.log(`[LoRA Poller] Uploading model to permanent storage for ${id}...`);
      const modelResponse = await fetch(modelUrl);
      if (modelResponse.ok) {
        const modelBuffer = Buffer.from(await modelResponse.arrayBuffer());
        const fileName = `lora-${id}-${Date.now()}.safetensors`;
        const filePath = `lora-models/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, modelBuffer, {
            contentType: 'application/octet-stream',
            upsert: false,
          });
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
          permanentUrl = publicUrl;
          console.log(`[LoRA Poller] Saved permanently: ${permanentUrl}`);
        } else {
          console.warn(`[LoRA Poller] Supabase upload failed (keeping FAL URL): ${uploadError.message}`);
        }
      }
    } catch (uploadErr) {
      console.warn(`[LoRA Poller] Upload error (keeping FAL URL): ${uploadErr.message}`);
    }

    // Update DB
    await supabase
      .from('brand_loras')
      .update({ fal_model_url: permanentUrl, status: 'ready', updated_at: new Date().toISOString() })
      .eq('id', id);

    await updateLinkedSubject(supabase, id, 'ready', permanentUrl);
    console.log(`[LoRA Poller] LoRA ${id} finalized — status: ready`);

  } else if (statusData.status === 'FAILED') {
    console.log(`[LoRA Poller] Training FAILED for ${id}`);
    await supabase.from('brand_loras').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', id);
    await updateLinkedSubject(supabase, id, 'failed');
  }
  // IN_PROGRESS or IN_QUEUE — do nothing, will check again next cycle
}

async function updateLinkedSubject(supabase, loraId, status, modelUrl) {
  const { data: loraRecord } = await supabase
    .from('brand_loras')
    .select('visual_subject_id, trigger_word')
    .eq('id', loraId)
    .single();

  if (loraRecord?.visual_subject_id) {
    const update = { training_status: status };
    if (modelUrl) {
      update.lora_url = modelUrl;
      update.lora_trigger_word = loraRecord.trigger_word;
      update.brand_lora_id = loraId;
    }
    await supabase
      .from('visual_subjects')
      .update(update)
      .eq('id', loraRecord.visual_subject_id);
  }
}

async function resolveUserFalKey(supabase, userId) {
  // Check user_api_keys table first
  const { data: userKeys } = await supabase
    .from('user_api_keys')
    .select('fal_key')
    .eq('user_id', userId)
    .maybeSingle();

  if (userKeys?.fal_key) return userKeys.fal_key;

  // Check if user is owner (falls back to env var)
  const { data: user } = await supabase.auth.admin.getUserById(userId);
  if (user?.user?.email === process.env.OWNER_EMAIL) {
    return process.env.FAL_KEY || null;
  }

  return null;
}
