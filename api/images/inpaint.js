/**
 * Inpaint API - AI Object Removal/Replacement
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  if (!WAVESPEED_API_KEY) {
    return res.status(500).json({ error: 'Missing API key configuration' });
  }

  try {
    const { image_url, mask_url, prompt, useProUltra = false } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: 'Missing image_url' });
    }
    if (!mask_url) {
      return res.status(400).json({ error: 'Missing mask_url' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    console.log('[Inpaint] Processing with Pro Ultra:', useProUltra);

    const endpoint = useProUltra 
      ? 'https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit-ultra'
      : 'https://api.wavespeed.ai/api/v3/google/nano-banana/edit';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: image_url,
        mask: mask_url,
        prompt: prompt,
        resolution: useProUltra ? '4k' : '2k',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Inpaint] API Error:', errorText);
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

    return res.status(500).json({ error: 'Unexpected response format' });

  } catch (error) {
    console.error('[Inpaint] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
