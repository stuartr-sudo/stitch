/**
 * 3D Viewer — Generate 3D model from images
 * Wavespeed Hunyuan3D v2 Multi-View — front+back+left required, optional prompt for material guidance
 */
import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';
import { logCost } from '../lib/costLogger.js';

async function uploadDataUrlToSupabase(dataUrl, folder = 'viewer3d') {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

  try {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return null;

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.storage.from('media').upload(fileName, buffer, { contentType });
    if (error) { console.error('[3DViewer] Supabase upload error:', error); return null; }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error('[3DViewer] Data URL upload failed:', err);
    return null;
  }
}

async function ensureHostedUrl(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return await uploadDataUrlToSupabase(url);
  return url;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wavespeedKey: WAVESPEED_KEY } = await getUserKeys(req.user.id, req.user.email);

  try {
    if (!WAVESPEED_KEY) {
      return res.status(400).json({ error: 'Wavespeed API key not configured.' });
    }

    const frontUrl = await ensureHostedUrl(req.body.front_image_url);
    const backUrl = await ensureHostedUrl(req.body.back_image_url);
    const leftUrl = await ensureHostedUrl(req.body.left_image_url);

    if (!frontUrl || !backUrl || !leftUrl) {
      return res.status(400).json({ error: 'Hunyuan3D requires front, back, and left images.' });
    }

    const body = {
      front_image_url: frontUrl,
      back_image_url: backUrl,
      left_image_url: leftUrl,
      num_inference_steps: 50,
      guidance_scale: 7.5,
      octree_resolution: 256,
      textured_mesh: true,
    };

    // Pass prompt for material/texture guidance if provided
    if (req.body.prompt) {
      body.prompt = req.body.prompt;
    }

    console.log('[3DViewer] Submitting to Wavespeed Hunyuan3D v2 Multi-View', body.prompt ? `with prompt: "${body.prompt}"` : '(no prompt)');

    const response = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/hunyuan3d-v2-multi-view', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[3DViewer] Wavespeed submit error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Failed to submit generation', details: errorText });
    }

    const data = await response.json();
    const requestId = data.data?.id;

    if (!requestId) {
      return res.status(500).json({ error: 'No request ID returned from Wavespeed' });
    }

    logCost(req.user.email, 'wavespeed', 'hunyuan3d-v2-multi-view', 0.30, { requestId });

    return res.status(200).json({ success: true, requestId, provider: 'wavespeed', status: 'processing' });

  } catch (error) {
    console.error('[3DViewer] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
