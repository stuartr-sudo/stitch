/**
 * Lens API - Image Angle Adjustment using FAL.ai
 */
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { falKey: FAL_KEY, wavespeedKey: WAVESPEED_API_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY && !WAVESPEED_API_KEY) {
    return res.status(400).json({ error: 'API keys not configured. Please add them in API Keys settings.' });
  }

  try {
    const { 
      image_url, 
      horizontal_angle = 0, 
      vertical_angle = 0, 
      zoom = 0 
    } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: 'Missing image_url' });
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
          image_url: image_url,
          horizontal_angle: horizontal_angle,
          vertical_angle: vertical_angle,
          zoom: zoom,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.image?.url || data.images?.[0]?.url || data.output;

        if (imageUrl) {
          return res.status(200).json({ success: true, imageUrl, status: 'completed' });
        }

        const requestId = data.request_id;
        if (requestId) {
          return res.status(200).json({ success: true, requestId, status: 'processing' });
        }
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
