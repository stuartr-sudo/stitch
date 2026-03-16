/**
 * Bria Video Erase — Prompt-based object removal from video
 * API: bria/video/erase/prompt (fal.ai)
 * Max 5 seconds video, prompt describes what to remove
 */
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { video_url, prompt, preserve_audio = true, auto_trim = true } = req.body;

    if (!video_url) {
      return res.status(400).json({ error: 'Missing video_url' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt — describe what to remove' });
    }

    const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
    if (!FAL_KEY) {
      return res.status(400).json({ error: 'FAL API key not configured. Please add it in API Keys settings.' });
    }

    console.log('[Bria Erase] Submitting prompt-based erase...');
    console.log('[Bria Erase] Settings:', { prompt, preserve_audio, auto_trim });

    const requestBody = {
      video_url,
      prompt,
      preserve_audio,
      auto_trim,
    };

    const submitResponse = await fetch('https://queue.fal.run/bria/video/erase/prompt', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('[Bria Erase] Error:', errorText);
      return res.status(500).json({ error: 'Bria Erase API error: ' + errorText.substring(0, 200) });
    }

    const data = await submitResponse.json();
    console.log('[Bria Erase] Response:', JSON.stringify(data).substring(0, 500));

    // May complete synchronously
    if (data.video?.url) {
      return res.status(200).json({ success: true, videoUrl: data.video.url, status: 'completed' });
    }

    const requestId = data.request_id || data.requestId;
    if (requestId) {
      return res.status(200).json({ success: true, requestId, model: 'bria-erase', status: 'processing' });
    }

    return res.status(500).json({ error: 'Unexpected response from Bria Erase API' });

  } catch (error) {
    console.error('[Bria Erase] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
