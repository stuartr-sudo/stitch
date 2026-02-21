import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, duration_seconds = 10, model = 'beatoven/music-generation', lyrics } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    const falKey = keys.falKey || process.env.FAL_KEY;
    if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

    let requestBody;

    if (model === 'fal-ai/minimax-music/v2') {
      if (!lyrics) return res.status(400).json({ error: 'MiniMax Music v2 requires lyrics' });
      requestBody = { prompt, lyrics_prompt: lyrics };
    } else if (model === 'beatoven/music-generation') {
      requestBody = { prompt, duration: duration_seconds, refinement: 100, creativity: 16 };
    } else if (model === 'beatoven/sound-effect-generation') {
      requestBody = { prompt, duration: duration_seconds };
    } else if (model === 'fal-ai/elevenlabs/music') {
      const musicLengthMs = Math.max(3000, Math.min(600000, duration_seconds * 1000));
      requestBody = { prompt, music_length_ms: musicLengthMs, force_instrumental: true };
    } else {
      return res.status(400).json({ error: `Unknown model: ${model}` });
    }

    const response = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        error: `Fal.ai generation failed: ${errorText.substring(0, 200)}` 
      });
    }

    const data = await response.json();

    // Fal returns data.audio.url for all supported models
    const audioUrl = data.audio?.url;

    if (!audioUrl) throw new Error("No audio URL returned from Fal.ai");

    // Download from Fal and upload to Supabase
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      console.error('[Music] Failed to download audio from Fal:', audioResponse.status);
      return res.status(200).json({ success: true, audioUrl });
    }
    const audioArrayBuffer = await audioResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    const contentType = audioResponse.headers.get('content-type') || 'audio/mpeg';
    const ext = contentType.includes('wav') ? 'wav' : contentType.includes('flac') ? 'flac' : 'mp3';
    const fileName = `fal-audio-${Date.now()}.${ext}`;
    const filePath = `audio/${fileName}`;

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, audioBuffer, { contentType, upsert: false });

    if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

    return res.status(200).json({ success: true, audioUrl: publicUrl });

  } catch (error) {
    console.error('[Music Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}
