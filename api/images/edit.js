import { getUserKeys } from '../lib/getUserKeys.js';

/**
 * Edit Image API - AI Image Editing with multiple models
 */

// Simplify aspect ratio to one of the allowed values
function getSimplifiedAspectRatio(width, height) {
  const allowedRatios = ['1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
  
  if (!width || !height) return undefined;
  
  const ratio = width / height;
  
  let closest = allowedRatios[0];
  const [fw, fh] = allowedRatios[0].split(':').map(Number);
  let closestDiff = Math.abs(fw / fh - ratio);
  
  for (const allowed of allowedRatios) {
    const [w, h] = allowed.split(':').map(Number);
    const diff = Math.abs(w / h - ratio);
    if (diff < closestDiff) {
      closest = allowed;
      closestDiff = diff;
    }
  }
  
  return closest;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { falKey: FAL_KEY, wavespeedKey: WAVESPEED_API_KEY } = await getUserKeys(req.user.id, req.user.email);
  
  // Fallback to environment variables if not found in database
  if (!WAVESPEED_API_KEY) {
    WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  }
  if (!FAL_KEY) {
    FAL_KEY = process.env.FAL_KEY;
  }
  
  if (!WAVESPEED_API_KEY && !FAL_KEY) {
    return res.status(400).json({ error: 'API keys not configured. Please add them in API Keys settings.' });
  }

  try {
    const { images, prompt, model = 'wavespeed-nano-ultra', outputSize = '1920x1080' } = req.body;

    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'Missing images' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // Parse dimensions from outputSize (e.g., "1920x1080" or "3840x2160")
    const [width, height] = outputSize.split('x').map(Number);
    const maxDim = Math.max(width || 1920, height || 1080);
    
    // nano-banana-pro/edit-ultra only accepts '4k' or '8k'
    const resolution = maxDim >= 7680 ? '8k' : '4k';
    
    // Get simplified aspect ratio that matches Wavespeed API requirements
    const aspectRatio = getSimplifiedAspectRatio(width, height);

    console.log('[Edit Image] Model:', model, 'Size:', outputSize, 'Resolution:', resolution);

    let response;
    let endpoint;

    if (model === 'wavespeed-nano-ultra') {
      endpoint = 'https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit-ultra';
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: images,
          prompt: prompt,
          resolution: resolution,
          aspect_ratio: aspectRatio,
        }),
      });
    } else if (model === 'wavespeed-qwen') {
      endpoint = 'https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen-image/edit-2511';
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: images,
          prompt: prompt,
        }),
      });
    } else if (model === 'fal-flux' && FAL_KEY) {
      endpoint = 'https://fal.run/fal-ai/flux-2-pro/edit';
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: images[0],
          prompt: prompt,
        }),
      });
    } else {
      return res.status(400).json({ error: 'Invalid model or missing API key' });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Edit Image] API Error:', errorText);
      return res.status(response.status).json({ error: 'API error', details: errorText });
    }

    const data = await response.json();
    const imageUrl = data.outputs?.[0] || data.data?.outputs?.[0] || data.image?.url;

    if (imageUrl) {
      return res.status(200).json({ success: true, imageUrl, status: 'completed' });
    }

    const requestId = data.id || data.request_id || data.data?.id;
    if (requestId) {
      return res.status(200).json({ success: true, requestId, status: 'processing' });
    }

    return res.status(500).json({ error: 'Unexpected response format' });

  } catch (error) {
    console.error('[Edit Image] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
