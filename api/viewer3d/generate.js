/**
 * 3D Viewer — Generate 3D model from image(s) via Hunyuan 3D Pro
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured.' });
  }

  try {
    let {
      front_image_url,
      back_image_url,
      left_image_url,
      right_image_url,
      top_image_url,
      bottom_image_url,
      left_front_image_url,
      right_front_image_url,
    } = req.body;

    if (!front_image_url) {
      return res.status(400).json({ error: 'Front image is required.' });
    }

    // Upload any data URLs to Supabase
    const imageFields = {
      input_image_url: front_image_url,
      back_image_url,
      left_image_url,
      right_image_url,
      top_image_url,
      bottom_image_url,
      left_front_image_url,
      right_front_image_url,
    };

    for (const [key, value] of Object.entries(imageFields)) {
      if (value && value.startsWith('data:')) {
        const hostedUrl = await uploadDataUrlToSupabase(value);
        if (!hostedUrl) {
          return res.status(400).json({ error: `Failed to upload ${key}. Use a URL or library image.` });
        }
        imageFields[key] = hostedUrl;
      }
    }

    // Remove undefined/null optional fields
    const body = { generate_type: 'Normal', enable_pbr: false };
    for (const [key, value] of Object.entries(imageFields)) {
      if (value) body[key] = value;
    }

    console.log('[3DViewer] Submitting to Hunyuan 3D Pro with', Object.keys(body).filter(k => k.endsWith('_url')).length, 'images');

    // Submit to FAL queue
    const response = await fetch('https://queue.fal.run/fal-ai/hunyuan-3d/v3.1/pro/image-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[3DViewer] FAL queue submit error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Failed to submit generation', details: errorText });
    }

    const data = await response.json();
    const requestId = data.request_id;

    if (!requestId) {
      return res.status(500).json({ error: 'No request ID returned from FAL' });
    }

    // Log cost
    logCost(req.user.email, 'fal', 'hunyuan-3d-pro', 0.375, { requestId });

    return res.status(200).json({ success: true, requestId, status: 'processing' });

  } catch (error) {
    console.error('[3DViewer] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
