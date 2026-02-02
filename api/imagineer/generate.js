/**
 * Imagineer - AI Image Generation API
 * Uses Wavespeed Google Nano Banana Pro
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  if (!WAVESPEED_API_KEY) {
    console.error('[Imagineer] Missing WAVESPEED_API_KEY');
    return res.status(500).json({ error: 'Missing API key configuration' });
  }

  try {
    const { prompt, style, dimensions = '16:9' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    console.log('[Imagineer] Generating image with prompt:', prompt);

    // Build enhanced prompt
    let enhancedPrompt = prompt;
    if (style) {
      enhancedPrompt = `${prompt}, ${style} style`;
    }

    const response = await fetch('https://api.wavespeed.ai/api/v3/google/nano-banana-pro/text-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        aspect_ratio: dimensions,
        num_images: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Imagineer] API Error:', errorText);
      return res.status(response.status).json({ 
        error: 'Wavespeed API error', 
        details: errorText 
      });
    }

    const data = await response.json();
    console.log('[Imagineer] Response:', data);

    const imageUrl = data.outputs?.[0] || data.data?.outputs?.[0];
    
    if (imageUrl) {
      return res.status(200).json({
        success: true,
        imageUrl: imageUrl,
        status: 'completed',
      });
    }

    // If async, return request ID
    const requestId = data.id || data.request_id || data.data?.id;
    if (requestId) {
      return res.status(200).json({
        success: true,
        requestId: requestId,
        status: data.status || 'processing',
      });
    }

    return res.status(500).json({ error: 'Unexpected API response format' });

  } catch (error) {
    console.error('[Imagineer] Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
