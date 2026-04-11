import { createClient } from '@supabase/supabase-js';
import { getUserKeys } from '../lib/getUserKeys.js';
import { getTrainingModel } from '../lib/trainingModelRegistry.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { requestId, loraId, statusUrl, responseUrl, endpoint, model: modelId } = req.body;
  if (!requestId) return res.status(400).json({ error: 'Missing requestId' });

  const activeEndpoint = endpoint || 'fal-ai/flux-lora-fast-training';

  const { falKey } = await getUserKeys(req.user.id, req.user.email);
  if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

  const headers = { 'Authorization': `Key ${falKey}` };

  const checkUrl = statusUrl
    ? `${statusUrl}?logs=1`
    : `https://queue.fal.run/${activeEndpoint}/requests/${requestId}/status?logs=1`;

  const statusResponse = await fetch(checkUrl, { headers });
  if (!statusResponse.ok) {
    return res.status(statusResponse.status).json({ error: 'Failed to check training status' });
  }

  const statusData = await statusResponse.json();

  if (statusData.status === 'COMPLETED') {
    const resultUrl = responseUrl || `https://queue.fal.run/${activeEndpoint}/requests/${requestId}`;
    const resultResponse = await fetch(resultUrl, { headers });
    const resultData = await resultResponse.json();

    console.log('[LoRA Result] Full fal.ai response keys:', Object.keys(resultData));
    console.log('[LoRA Result] Full fal.ai response:', JSON.stringify(resultData).substring(0, 2000));

    // Use registry's parseResult if modelId provided, otherwise fall back to generic extraction
    const registryModel = modelId ? getTrainingModel(modelId) : null;
    let modelUrl = registryModel
      ? registryModel.parseResult(resultData)
      : null;

    // Broad fallback: try every known result field pattern across all FAL training endpoints
    if (!modelUrl) {
      modelUrl = resultData.diffusers_lora_file?.url
        || resultData.lora_file?.url
        || resultData.config_file?.url
        || resultData.output?.url
        || resultData.lora_url
        || resultData.model_url
        || resultData.weights_url
        || null;

      // Deep scan: search for any .safetensors URL in the entire response
      if (!modelUrl) {
        const responseStr = JSON.stringify(resultData);
        const safetensorsMatch = responseStr.match(/https?:\/\/[^"]+\.safetensors[^"]*/);
        if (safetensorsMatch) {
          modelUrl = safetensorsMatch[0];
          console.log('[LoRA Result] Found model URL via deep scan:', modelUrl);
        }
      }
    }

    if (!modelUrl) {
      console.error('[LoRA Result] Could not extract model URL from response. Model:', modelId, 'Keys:', Object.keys(resultData));
    }

    // Wan 2.2 dual-transformer: also extract the high-noise LoRA
    let highNoiseUrl = registryModel?.parseHighNoiseLora?.(resultData) ?? null;

    let permanentUrl = modelUrl; // default to FAL URL, will be overwritten if Supabase upload succeeds

    if (loraId) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      if (modelUrl) {
        // Upload .safetensors to Supabase for permanent storage (FAL CDN URLs expire)
        try {
          console.log('[LoRA Result] Uploading model to permanent storage...');
          const modelResponse = await fetch(modelUrl);
          if (modelResponse.ok) {
            const modelBuffer = Buffer.from(await modelResponse.arrayBuffer());
            const fileName = `lora-${loraId}-${Date.now()}.safetensors`;
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
              console.log('[LoRA Result] Model saved permanently:', permanentUrl);
            } else {
              console.warn('[LoRA Result] Supabase upload failed, keeping FAL URL:', uploadError.message);
            }
          }
        } catch (uploadErr) {
          console.warn('[LoRA Result] Failed to upload model to permanent storage:', uploadErr.message);
        }

        // Upload high-noise LoRA to permanent storage (Wan 2.2 dual-transformer)
        let permanentHighNoiseUrl = highNoiseUrl;
        if (highNoiseUrl) {
          try {
            console.log('[LoRA Result] Uploading high-noise LoRA to permanent storage...');
            const hnResponse = await fetch(highNoiseUrl);
            if (hnResponse.ok) {
              const hnBuffer = Buffer.from(await hnResponse.arrayBuffer());
              const hnFileName = `lora-${loraId}-high-${Date.now()}.safetensors`;
              const hnFilePath = `lora-models/${hnFileName}`;
              const { error: hnUploadError } = await supabase.storage
                .from('media')
                .upload(hnFilePath, hnBuffer, {
                  contentType: 'application/octet-stream',
                  upsert: false,
                });
              if (!hnUploadError) {
                const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(hnFilePath);
                permanentHighNoiseUrl = publicUrl;
                console.log('[LoRA Result] High-noise LoRA saved:', permanentHighNoiseUrl);
              } else {
                console.warn('[LoRA Result] High-noise upload failed:', hnUploadError.message);
              }
            }
          } catch (hnErr) {
            console.warn('[LoRA Result] High-noise upload error:', hnErr.message);
          }
        }

        // Update the brand_loras record with permanent URL(s)
        const updatePayload = { fal_model_url: permanentUrl, status: 'ready' };
        if (permanentHighNoiseUrl) updatePayload.high_noise_lora_url = permanentHighNoiseUrl;
        await supabase
          .from('brand_loras')
          .update(updatePayload)
          .eq('id', loraId);

        // Auto-update linked visual subject if one exists
        const { data: loraRecord } = await supabase
          .from('brand_loras')
          .select('visual_subject_id, trigger_word')
          .eq('id', loraId)
          .single();

        if (loraRecord?.visual_subject_id) {
          await supabase
            .from('visual_subjects')
            .update({
              lora_url: permanentUrl,
              lora_trigger_word: loraRecord.trigger_word,
              brand_lora_id: loraId,
              training_status: 'ready',
            })
            .eq('id', loraRecord.visual_subject_id);
        }
      } else {
        // Training completed but no model URL — mark as failed
        await supabase
          .from('brand_loras')
          .update({ status: 'failed' })
          .eq('id', loraId);

        const { data: loraRecord } = await supabase
          .from('brand_loras')
          .select('visual_subject_id')
          .eq('id', loraId)
          .single();

        if (loraRecord?.visual_subject_id) {
          await supabase
            .from('visual_subjects')
            .update({ training_status: 'failed' })
            .eq('id', loraRecord.visual_subject_id);
        }
      }
    }

    return res.json({ success: true, status: 'completed', modelUrl: permanentUrl || modelUrl, requestId });
  }

  if (statusData.status === 'FAILED') {
    if (loraId) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await supabase.from('brand_loras').update({ status: 'failed' }).eq('id', loraId);

      const { data: loraRecord } = await supabase
        .from('brand_loras')
        .select('visual_subject_id')
        .eq('id', loraId)
        .single();

      if (loraRecord?.visual_subject_id) {
        await supabase
          .from('visual_subjects')
          .update({ training_status: 'failed' })
          .eq('id', loraRecord.visual_subject_id);
      }
    }

    return res.json({ success: false, status: 'failed', requestId });
  }

  return res.json({
    success: true,
    status: 'training',
    requestId,
    queuePosition: statusData.queue_position ?? null,
  });
}
