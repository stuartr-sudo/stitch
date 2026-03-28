/**
 * 3D Viewer — Poll for Hunyuan3D v2 generation result (Wavespeed)
 */
import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';

async function uploadGlbToSupabase(glbUrl, userId) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[3DViewer] ⚠️ Supabase not configured — GLB stored on temporary CDN URL that WILL expire:', glbUrl);
    return glbUrl;
  }

  try {
    const response = await fetch(glbUrl);
    if (!response.ok) {
      console.warn('[3DViewer] ⚠️ Failed to download GLB from CDN — URL may expire:', glbUrl);
      return glbUrl;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = `3d/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.glb`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.storage.from('media').upload(fileName, buffer, {
      contentType: 'model/gltf-binary',
    });
    if (error) {
      console.error('[3DViewer] ⚠️ GLB upload to Supabase FAILED — returning temporary CDN URL:', error.message);
      return glbUrl;
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error('[3DViewer] ⚠️ GLB upload failed — returning temporary CDN URL:', err.message);
    return glbUrl;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wavespeedKey: WAVESPEED_KEY } = await getUserKeys(req.user.id, req.user.email);

  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  try {
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

  } catch (error) {
    console.error('[3DViewer] Result error:', error);
    return res.status(500).json({ status: 'failed', error: error.message });
  }
}
