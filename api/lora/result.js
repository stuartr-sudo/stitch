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

    if (loraId) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

      if (modelUrl) {
        // Update the brand_loras record
        await supabase
          .from('brand_loras')
          .update({ fal_model_url: modelUrl, status: 'ready' })
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
              lora_url: modelUrl,
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

    return res.json({ success: true, status: 'completed', modelUrl, requestId });
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
