import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';

const pollForQueueResult = async (requestIdOrUrl, model, falKey, maxRetries = 120, retryDelay = 2000) => {
  const pollUrl = requestIdOrUrl.startsWith?.('http')
    ? requestIdOrUrl
    : `https://queue.fal.run/${model}/requests/${requestIdOrUrl}`;
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const statusResponse = await fetch(pollUrl, {
        method: 'GET',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      });
      if (!statusResponse.ok) {
        lastError = new Error(`Queue status check failed: ${await statusResponse.text()}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      const result = await statusResponse.json();
      const audioUrl = result.output?.audio?.url || result.audio?.url;
      if (audioUrl) return audioUrl;
      if (i < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, retryDelay));
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  throw lastError || new Error('Queue polling timeout');
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    prompt,
    duration_seconds = 90,
    model = 'fal-ai/minimax-music/v2',
    lyrics,
    musicLengthMs,
  } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const falKey = keys.falKey || process.env.FAL_KEY;
    if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

    let requestBody;
    let endpoint;
    let needsQueuePolling = false;

    if (model === 'fal-ai/minimax-music/v2') {
      requestBody = { prompt: prompt.slice(0, 300), lyrics_prompt: lyrics || '[Instrumental]' };
      endpoint = `https://queue.fal.run/${model}`;
      needsQueuePolling = true;
    } else if (model === 'fal-ai/elevenlabs/music') {
      const finalMusicLengthMs = musicLengthMs || Math.max(3000, Math.min(600000, duration_seconds * 1000));
      if (finalMusicLengthMs < 3000 || finalMusicLengthMs > 600000) {
        return res.status(400).json({ error: 'Music length must be between 3000ms and 600000ms' });
      }
      requestBody = { prompt, music_length_ms: finalMusicLengthMs, force_instrumental: true };
      endpoint = `https://fal.run/${model}`;
    } else {
      return res.status(400).json({ error: `Unknown model: ${model}. Use 'fal-ai/minimax-music/v2' or 'fal-ai/elevenlabs/music'.` });
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: `Fal.ai generation failed: ${errorText.substring(0, 200)}` });
    }

    const data = await response.json();
    let audioUrl;

    if (needsQueuePolling) {
      const requestId = data.request_id;
      if (!requestId) throw new Error('No request_id returned from queue');
      audioUrl = await pollForQueueResult(data.response_url || requestId, model, falKey);
    } else {
      audioUrl = data.audio?.url;
    }

    if (!audioUrl) throw new Error("No audio URL returned from Fal.ai");

    // Download from Fal and upload to Supabase
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      console.error('[Music] Failed to download audio from Fal:', audioResponse.status);
      return res.status(200).json({ success: true, audioUrl });
    }
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
    const ext = contentType.includes('wav') ? 'wav' : contentType.includes('flac') ? 'flac' : 'mp3';
    const filePath = `audio/fal-audio-${Date.now()}.${ext}`;

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error: uploadError } = await supabase.storage.from('media').upload(filePath, audioBuffer, { contentType, upsert: false });
    if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
    return res.status(200).json({ success: true, audioUrl: publicUrl });

  } catch (error) {
    console.error('[Music Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}
