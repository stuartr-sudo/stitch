/**
 * JumpStart Extend - Video Extension API
 * Uses Bytedance Seedance 1.5 Pro
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;
  if (!WAVESPEED_API_KEY) {
    console.error('[JumpStart Extend] Missing WAVESPEED_API_KEY');
    return res.status(500).json({ error: 'Missing API key configuration' });
  }

  try {
    const { 
      videoUrl, 
      prompt, 
      duration = 5, 
      resolution = '720p',
      generate_audio = true,
      camera_fixed = false,
      seed = -1
    } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl' });
    }

    console.log('[JumpStart Extend] Requesting extension for:', videoUrl);

    const response = await fetch('https://api.wavespeed.ai/api/v3/bytedance/seedance-v1.5-pro/video-extend-fast', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt || "",
        video: videoUrl,
        duration: parseInt(duration),
        resolution,
        generate_audio,
        camera_fixed,
        seed
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JumpStart Extend] API Error:', errorText);
      return res.status(response.status).json({ 
        error: 'Wavespeed API error', 
        details: errorText 
      });
    }

    const submitData = await response.json();
    console.log('[JumpStart Extend] Job submitted:', submitData.id || submitData.data?.id);

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
    console.error('[JumpStart Extend] Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
