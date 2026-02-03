/**
 * Edit Image API - AI Image Editing with multiple models
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  const FAL_KEY = process.env.FAL_KEY;

  if (!WAVESPEED_API_KEY) {
    return res.status(500).json({ error: 'Missing API key configuration' });
  }

  try {
    const { images, prompt, model = 'wavespeed-nano-ultra', outputSize = '2560' } = req.body;

    if (!images || images.length === 0) {
      return res.status(400).json({ error: 'Missing images' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    console.log('[Edit Image] Model:', model, 'Images:', images.length);

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
          resolution: outputSize.includes('4096') ? '4k' : '2k',
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
