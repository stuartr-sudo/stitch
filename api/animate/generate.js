import { getUserKeys } from '../lib/getUserKeys.js';

const ANIMATE_ENDPOINTS = {
  move: 'fal-ai/wan/v2.2-14b/animate/move',
  replace: 'fal-ai/wan/v2.2-14b/animate/replace',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      video_url,
      image_url,
      mode = 'move',
      resolution = '480p',
      guidance_scale = 1,
      num_inference_steps = 6,
    } = req.body;

    if (!video_url) return res.status(400).json({ error: 'Missing video_url' });
    if (!image_url) return res.status(400).json({ error: 'Missing image_url' });

    const endpoint = ANIMATE_ENDPOINTS[mode];
    if (!endpoint) return res.status(400).json({ error: 'Invalid mode. Use "move" or "replace".' });

    const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
    if (!FAL_KEY) {
      return res.status(400).json({ error: 'Fal.ai API key not configured. Please add it in API Keys settings.' });
    }

    console.log('[Animate] Submitting job | Mode:', mode, '| Resolution:', resolution);

    const response = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url,
        image_url,
        resolution,
        guidance_scale,
        num_inference_steps,
        enable_safety_checker: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Animate] API Error:', errorText);
      return res.status(response.status).json({ error: 'Animate API error', details: errorText });
    }

    const data = await response.json();
    console.log('[Animate] Queue response:', JSON.stringify(data).substring(0, 300));

    const requestId = data.request_id;
    if (requestId) {
      return res.status(200).json({
        success: true,
        requestId,
        mode,
        status: data.status || 'IN_QUEUE',
      });
    }

    if (data.video?.url) {
      return res.status(200).json({
        success: true,
        status: 'completed',
        videoUrl: data.video.url,
      });
    }

    return res.status(500).json({ error: 'Unexpected API response format' });
  } catch (error) {
    console.error('[Animate] Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
