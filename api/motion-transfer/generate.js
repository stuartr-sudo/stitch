import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
    if (!FAL_KEY) return res.status(400).json({ error: 'FAL API key not configured.' });

    const { image, video, character_orientation, prompt, negative_prompt, keep_original_sound } = req.body;

    if (!image || !video) {
      return res.status(400).json({ error: 'Both image and video are required' });
    }

    const endpoint = 'fal-ai/wan/v2.2-14b/animate/move';
    const response = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: image,
        video_url: video,
        prompt: prompt || '',
        negative_prompt: negative_prompt || '',
        resolution: '1K',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[MotionTransfer] Submit error:', errText.substring(0, 300));
      return res.status(502).json({ error: 'Failed to start motion transfer' });
    }

    const data = await response.json();
    return res.json({
      predictionId: data.request_id,
      statusUrl: data.status_url,
      responseUrl: data.response_url,
    });
  } catch (error) {
    console.error('[MotionTransfer] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
