/**
 * Lens API - Image Angle Adjustment using FAL.ai
 */
import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';

async function uploadDataUrlToSupabase(dataUrl) {
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
    const fileName = `lens/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.storage.from('media').upload(fileName, buffer, { contentType });
    if (error) { console.error('[Lens] Supabase upload error:', error); return null; }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error('[Lens] Data URL upload failed:', err);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { falKey: FAL_KEY, wavespeedKey: WAVESPEED_API_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY && !WAVESPEED_API_KEY) {
    return res.status(400).json({ error: 'API keys not configured. Please add them in API Keys settings.' });
  }

  try {
    let {
      image_url,
      horizontal_angle = 0,
      vertical_angle = 0,
      zoom = 0
    } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: 'Missing image_url' });
    }

    // Data URLs can't be processed by FAL — upload to Supabase first
    if (image_url.startsWith('data:')) {
      console.log('[Lens] Converting data URL to hosted URL...');
      const hostedUrl = await uploadDataUrlToSupabase(image_url);
      if (!hostedUrl) {
        return res.status(400).json({ error: 'Failed to upload image. Please use a URL or library image instead.' });
      }
      image_url = hostedUrl;
    }

    console.log('[Lens] Adjusting angles - H:', horizontal_angle, 'V:', vertical_angle, 'Zoom:', zoom);

    // Try FAL.ai first
    if (FAL_KEY) {
      const response = await fetch('https://fal.run/fal-ai/qwen-image-edit-2511-multiple-angles', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_urls: [image_url],
          horizontal_angle: horizontal_angle,
          vertical_angle: vertical_angle,
          zoom: zoom,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.images?.[0]?.url || data.image?.url || data.output;

        if (imageUrl) {
          return res.status(200).json({ success: true, imageUrl, status: 'completed' });
        }

        const requestId = data.request_id;
        if (requestId) {
          return res.status(200).json({ success: true, requestId, status: 'processing' });
        }
      } else {
        const errorText = await response.text();
        console.error('[Lens] FAL API Error:', response.status, errorText);
      }
    }

    // Fallback to Wavespeed with a prompt-based approach
    if (WAVESPEED_API_KEY) {
      const anglePrompt = `Adjust the viewing angle: rotate ${horizontal_angle} degrees horizontally, ${vertical_angle} degrees vertically, zoom level ${zoom}`;
      
      const response = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-2511', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: [image_url],
          prompt: anglePrompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Lens] API Error:', errorText);
        return res.status(response.status).json({ error: 'API error', details: errorText });
      }

      const data = await response.json();
      const imageUrl = data.outputs?.[0] || data.data?.outputs?.[0];

      if (imageUrl) {
        return res.status(200).json({ success: true, imageUrl, status: 'completed' });
      }

      const requestId = data.id || data.request_id || data.data?.id;
      if (requestId) {
        return res.status(200).json({ success: true, requestId, status: 'processing' });
      }
    }

    return res.status(500).json({ error: 'Failed to process image' });

  } catch (error) {
    console.error('[Lens] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
