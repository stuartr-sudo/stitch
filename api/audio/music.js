import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, duration_seconds = 10, provider = 'huggingface', model = 'hf-musicgen', lyrics } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    const keys = await getUserKeys(req.user.id, req.user.email);

    // ==========================================
    // FAL.AI PROVIDER LOGIC
    // ==========================================
    if (provider === 'fal') {
      const falKey = keys.falKey || process.env.FAL_KEY;
      if (!falKey) return res.status(400).json({ error: 'Fal.ai API key not configured.' });

      // Build model-specific payload
      let requestBody;

      if (model === 'fal-ai/minimax-music/v2') {
        const lyricsText = lyrics || '[Instrumental]';
        requestBody = { prompt, lyrics_prompt: lyricsText };
      } else if (model === 'beatoven/music-generation') {
        requestBody = { prompt, duration: duration_seconds };
      } else if (model === 'beatoven/sound-effect-generation') {
        requestBody = { prompt, duration: duration_seconds };
      } else {
        // ElevenLabs and any other fal model
        requestBody = { prompt };
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

      // Fal usually returns data.audio.url, data.audio_file.url, or data.url
      const audioUrl = data.audio?.url || data.audio_file?.url || data.url;

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
    }

    // ==========================================
    // HUGGING FACE PROVIDER LOGIC
    // ==========================================
    const hfKey = keys.huggingfaceKey || process.env.HUGGINGFACE_API_KEY;
    if (!hfKey) return res.status(400).json({ error: 'HuggingFace API key not configured.' });

    const response = await fetch('https://api-inference.huggingface.co/models/facebook/musicgen-medium', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: Math.round(duration_seconds * 50) },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: 'MusicGen failed', details: errorText });
    }

    // Upload HuggingFace buffer to Supabase
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const fileName = `music-${Date.now()}.flac`;
    const filePath = `audio/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, buffer, {
        contentType: 'audio/flac',
        upsert: false,
      });

    if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

    return res.status(200).json({ success: true, audioUrl: publicUrl });

  } catch (error) {
    console.error('[Music Error]:', error);
    return res.status(500).json({ error: error.message });
  }
}
