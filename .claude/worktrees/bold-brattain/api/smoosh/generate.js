/**
 * Smoosh API - Canvas Composition with AI Enhancement
 */
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wavespeedKey: WAVESPEED_API_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!WAVESPEED_API_KEY) {
    return res.status(400).json({ error: 'Wavespeed API key not configured. Please add it in API Keys settings.' });
  }

  try {
    const { image, prompt, width = 1080, height = 1080 } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Missing image' });
    }

    console.log('[Smoosh] Processing canvas:', width, 'x', height);

    const response = await fetch('https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: [image],
        prompt: prompt || 'A seamless, professional composition',
        resolution: '2k',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Smoosh] API Error:', errorText);
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
    console.error('[Smoosh] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
