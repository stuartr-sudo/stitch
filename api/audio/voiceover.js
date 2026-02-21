import { getUserKeys } from '../lib/getUserKeys.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, text, model, provider = 'huggingface' } = req.body;
    const inputText = text || prompt;

    if (!inputText) return res.status(400).json({ error: 'Missing text or prompt' });

    const keys = await getUserKeys(req.user.id, req.user.email);

    // Hugging Face Parler TTS
    if (provider === 'huggingface') {
      const hfKey = keys.huggingfaceKey || process.env.HUGGINGFACE_API_KEY;
      if (!hfKey) return res.status(400).json({ error: 'HuggingFace API key not configured.' });

      const description = 'A professional female marketing voice, clear and energetic.';
      const response = await fetch('https://api-inference.huggingface.co/models/parler-tts/parler-tts-mini-v1', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${hfKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: inputText, parameters: { description } }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: 'HuggingFace TTS failed', details: errorText });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const fileName = `voice-${Date.now()}.flac`;
      const filePath = `audio/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, buffer, { contentType: 'audio/flac', upsert: false });

      if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
      return res.status(200).json({ success: true, audioUrl: publicUrl });
    }

    // Fallback / other providers: mock for now
    const mockAudioUrl = 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=chill-abstract-intention-110855.mp3';
    return res.status(200).json({ audioUrl: mockAudioUrl, status: 'completed' });
  } catch (error) {
    console.error('[API/audio/voiceover] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
