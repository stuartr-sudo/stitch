import { getUserKeys } from '../lib/getUserKeys.js';

/**
 * Extract a frame (first, middle, or last) from a video using fal.ai's ffmpeg API.
 * Used for scene chaining in Storyboard: last frame of scene N → start frame for scene N+1.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
  if (!FAL_KEY) {
    return res.status(400).json({ error: 'Fal.ai API key not configured.' });
  }

  try {
    const { videoUrl, frameType = 'last' } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Missing videoUrl' });
    }

    console.log(`[ExtractFrame] Extracting ${frameType} frame from:`, videoUrl.substring(0, 80));

    const response = await fetch('https://fal.run/fal-ai/ffmpeg-api/extract-frame', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        frame_type: frameType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ExtractFrame] Error (${response.status}):`, errorText.substring(0, 200));
      return res.status(response.status).json({ error: `Frame extraction failed: ${errorText.substring(0, 200)}` });
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url;

    if (imageUrl) {
      console.log('[ExtractFrame] Got frame:', imageUrl.substring(0, 80));
      return res.status(200).json({ success: true, imageUrl });
    }

    // May be queued
    if (data.request_id) {
      // Poll for result
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const statusRes = await fetch(
          `https://queue.fal.run/fal-ai/ffmpeg-api/extract-frame/requests/${data.request_id}/status`,
          { headers: { 'Authorization': `Key ${FAL_KEY}` } }
        );
        const status = await statusRes.json();

        if (status.status === 'COMPLETED') {
          const resultRes = await fetch(
            `https://queue.fal.run/fal-ai/ffmpeg-api/extract-frame/requests/${data.request_id}`,
            { headers: { 'Authorization': `Key ${FAL_KEY}` } }
          );
          const result = await resultRes.json();
          const url = result.images?.[0]?.url;
          if (url) {
            console.log('[ExtractFrame] Got frame (queued):', url.substring(0, 80));
            return res.status(200).json({ success: true, imageUrl: url });
          }
        }
        if (status.status === 'FAILED') break;
      }
    }

    console.error('[ExtractFrame] Unexpected response:', JSON.stringify(data).substring(0, 200));
    return res.status(500).json({ error: 'Frame extraction failed — no image returned' });

  } catch (error) {
    console.error('[ExtractFrame] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
