/**
 * Trip - Lucy Restyle API Endpoint
 * Text-guided video editing using Decart's Lucy-Restyle model
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  if (!WAVESPEED_API_KEY) {
    console.error('[Trip Restyle] Missing WAVESPEED_API_KEY');
    return res.status(500).json({ error: 'Missing API key configuration' });
  }

  try {
    const { videoUrl, prompt } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    console.log('[Trip Restyle] Requesting restyle for:', videoUrl);
    console.log('[Trip Restyle] Prompt:', prompt);

    const response = await fetch('https://api.wavespeed.ai/api/v3/decart/lucy-restyle', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video: videoUrl,
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Trip Restyle] API Error:', errorText);
      return res.status(response.status).json({ 
        error: 'Wavespeed API error', 
        details: errorText 
      });
    }

    const submitData = await response.json();
    console.log('[Trip Restyle] Job submitted:', submitData.id || submitData.data?.id);

    const resultUrl = submitData.outputs?.[0] || submitData.data?.outputs?.[0];
    if (submitData.status === 'completed' && resultUrl) {
      return res.status(200).json({
        success: true,
        status: 'completed',
        videoUrl: resultUrl
      });
    }

    return res.status(200).json({
      success: true,
      status: submitData.status || 'processing',
      requestId: submitData.id || submitData.data?.id,
    });

  } catch (error) {
    console.error('[Trip Restyle] Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
