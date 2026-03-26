/**
 * 3D Viewer — Poll for generation result
 * Supports both FAL (Meshy) and Wavespeed (Hunyuan3D v2) providers
 */
import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';

async function uploadGlbToSupabase(glbUrl, userId) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return glbUrl;

  try {
    const response = await fetch(glbUrl);
    if (!response.ok) return glbUrl;

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = `3d/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.glb`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.storage.from('media').upload(fileName, buffer, {
      contentType: 'model/gltf-binary',
    });
    if (error) { console.error('[3DViewer] GLB upload error:', error); return glbUrl; }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error('[3DViewer] GLB upload failed:', err);
    return glbUrl;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { falKey: FAL_KEY, wavespeedKey: WAVESPEED_KEY } = await getUserKeys(req.user.id, req.user.email);

  const { requestId, provider, statusUrl, responseUrl } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  try {
    if (provider === 'wavespeed') {
      // --- Wavespeed polling ---
      if (!WAVESPEED_KEY) {
        return res.status(400).json({ error: 'Wavespeed API key not configured.' });
      }

      const pollResponse = await fetch(
        `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
        { headers: { 'Authorization': `Bearer ${WAVESPEED_KEY}` } }
      );

      if (!pollResponse.ok) {
        console.error('[3DViewer] Wavespeed poll error:', pollResponse.status);
        return res.status(200).json({ status: 'processing', requestId });
      }

      const result = await pollResponse.json();
      const data = result.data || result;
      const status = data.status;

      if (status === 'completed') {
        // Wavespeed returns model_mesh.url or outputs array
        const glbUrl = data.model_mesh?.url || data.outputs?.[0];
        if (!glbUrl) {
          return res.status(200).json({ status: 'failed', error: 'No 3D model in result' });
        }
        const permanentGlbUrl = await uploadGlbToSupabase(glbUrl, req.user.id);
        return res.status(200).json({
          status: 'completed',
          requestId,
          glbUrl: permanentGlbUrl,
          thumbnailUrl: null,
        });
      } else if (status === 'failed') {
        return res.status(200).json({ status: 'failed', error: data.error || 'Generation failed' });
      } else {
        return res.status(200).json({ status: 'processing', requestId });
      }

    } else {
      // --- FAL (Meshy) polling ---
      if (!FAL_KEY) {
        return res.status(400).json({ error: 'FAL API key not configured.' });
      }

      // Step 1: Check status via status URL
      const checkStatusUrl = statusUrl || `https://queue.fal.run/fal-ai/meshy/v5/multi-image-to-3d/requests/${requestId}/status`;
      const statusResponse = await fetch(checkStatusUrl, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
      });

      if (!statusResponse.ok) {
        console.error('[3DViewer] FAL status error:', statusResponse.status);
        return res.status(200).json({ status: 'processing', requestId });
      }

      const statusData = await statusResponse.json();

      if (statusData.status === 'IN_QUEUE') {
        return res.status(200).json({
          status: 'queued',
          requestId,
          queuePosition: statusData.queue_position || null,
        });
      }
      if (statusData.status === 'IN_PROGRESS') {
        return res.status(200).json({ status: 'processing', requestId });
      }
      if (statusData.status === 'FAILED') {
        return res.status(200).json({ status: 'failed', error: statusData.error || 'Generation failed' });
      }

      // Step 2: Status is COMPLETED — fetch the result
      const resultUrl = responseUrl || `https://queue.fal.run/fal-ai/meshy/v5/multi-image-to-3d/requests/${requestId}`;
      const resultResponse = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
      });

      if (!resultResponse.ok) {
        const errorText = await resultResponse.text();
        console.error('[3DViewer] FAL result error:', resultResponse.status, errorText);
        return res.status(200).json({ status: 'failed', error: 'Failed to retrieve result' });
      }

      const data = await resultResponse.json();

      // Extract GLB
      const glbUrl = data.model_glb?.url || data.model_urls?.glb?.url || data.model_urls?.glb;
      if (!glbUrl) {
        return res.status(200).json({ status: 'failed', error: 'No 3D model in result' });
      }

      const permanentGlbUrl = await uploadGlbToSupabase(glbUrl, req.user.id);
      const thumbnailUrl = data.thumbnail?.url || null;

      return res.status(200).json({
        status: 'completed',
        requestId,
        glbUrl: permanentGlbUrl,
        thumbnailUrl,
        modelUrls: data.model_urls || null,
      });
    }

  } catch (error) {
    console.error('[3DViewer] Result error:', error);
    return res.status(500).json({ status: 'failed', error: error.message });
  }
}
