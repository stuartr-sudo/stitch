/**
 * 3D Viewer — Poll for generation result
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

  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured.' });
  }

  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  try {
    // Check queue status
    const statusResponse = await fetch(
      `https://queue.fal.run/fal-ai/hunyuan-3d/v3.1/pro/image-to-3d/requests/${requestId}/status`,
      { headers: { 'Authorization': `Key ${FAL_KEY}` } }
    );

    // 404 can mean completed — fetch result directly
    if (!statusResponse.ok && statusResponse.status !== 404) {
      const errorText = await statusResponse.text();
      console.error('[3DViewer] Poll error:', statusResponse.status, errorText);
      return res.status(200).json({ status: 'processing', requestId });
    }

    let status = 'processing';
    let queuePosition = null;

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      status = statusData.status?.toLowerCase() || 'processing';
      queuePosition = statusData.queue_position;

      if (status !== 'completed') {
        return res.status(200).json({
          status: status === 'in_queue' ? 'queued' : 'processing',
          requestId,
          queuePosition,
        });
      }
    }

    // Fetch the actual result
    const resultResponse = await fetch(
      `https://queue.fal.run/fal-ai/hunyuan-3d/v3.1/pro/image-to-3d/requests/${requestId}`,
      { headers: { 'Authorization': `Key ${FAL_KEY}` } }
    );

    if (!resultResponse.ok) {
      const errorText = await resultResponse.text();
      console.error('[3DViewer] Result fetch error:', errorText);
      return res.status(200).json({ status: 'failed', error: 'Failed to retrieve result' });
    }

    const data = await resultResponse.json();

    // Get GLB URL
    const glbUrl = data.model_glb?.url || data.model_urls?.glb;
    if (!glbUrl) {
      return res.status(200).json({ status: 'failed', error: 'No 3D model in result' });
    }

    // Upload GLB to Supabase for permanent URL
    const permanentGlbUrl = await uploadGlbToSupabase(glbUrl, req.user.id);
    const thumbnailUrl = data.thumbnail?.url || null;

    return res.status(200).json({
      status: 'completed',
      requestId,
      glbUrl: permanentGlbUrl,
      thumbnailUrl,
      modelUrls: data.model_urls || null,
    });

  } catch (error) {
    console.error('[3DViewer] Result error:', error);
    return res.status(500).json({ status: 'failed', error: error.message });
  }
}
