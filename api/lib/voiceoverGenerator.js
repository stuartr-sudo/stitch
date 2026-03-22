/**
 * ElevenLabs Text-to-Speech integration for voiceover generation.
 *
 * Calls the ElevenLabs API directly (not through FAL) to access
 * all voice models, voice IDs, and advanced settings.
 *
 * The generated audio is uploaded to Supabase storage and its
 * public URL is returned.
 */

/**
 * Generate voiceover audio from text using ElevenLabs TTS.
 *
 * @param {string} text - The narration text to convert to speech
 * @param {object} keys - { elevenlabsKey }
 * @param {object} supabase - Supabase client
 * @param {object} [options]
 * @param {string} [options.voiceId='pNInz6obpgDQGcFmaJgB'] - ElevenLabs voice ID (default: Adam)
 * @param {string} [options.modelId='eleven_multilingual_v2'] - TTS model
 * @param {number} [options.stability=0.5] - Voice stability (0-1)
 * @param {number} [options.similarityBoost=0.75] - Voice similarity boost (0-1)
 * @param {number} [options.style=0.0] - Style exaggeration (0-1)
 * @param {boolean} [options.useSpeakerBoost=true] - Speaker boost for clarity
 * @returns {Promise<string>} Public URL of the generated MP3
 */
export async function generateVoiceover(text, keys, supabase, options = {}) {
  const {
    voiceId = 'pNInz6obpgDQGcFmaJgB',
    modelId = 'eleven_multilingual_v2',
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.0,
    useSpeakerBoost = true,
  } = options;

  const elevenlabsKey = keys.elevenlabsKey;
  if (!elevenlabsKey) throw new Error('ElevenLabs API key required for voiceover generation');
  if (!text?.trim()) throw new Error('Text is required for voiceover generation');

  console.log(`[voiceover] Generating TTS: ${text.length} chars, voice=${voiceId}, model=${modelId}`);

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': elevenlabsKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errorText}`);
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  console.log(`[voiceover] TTS complete: ${audioBuffer.length} bytes`);

  // Upload to Supabase storage
  const fileName = `pipeline/voiceover/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: false });

  if (uploadError) throw new Error(`Voiceover upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
  console.log(`[voiceover] Uploaded to ${publicUrl}`);
  return publicUrl;
}

/**
 * Generate word-level timestamps from an audio URL using FAL Whisper.
 *
 * @param {string} audioUrl - Public URL of the audio to transcribe
 * @param {string} falKey - FAL API key
 * @returns {Promise<{ text: string, words: Array<{ word: string, start: number, end: number }> }>}
 */
export async function generateTimestamps(audioUrl, falKey) {
  if (!falKey) throw new Error('FAL API key required for Whisper timestamps');

  console.log(`[voiceover] Generating word timestamps via Whisper...`);

  const res = await fetch('https://fal.run/fal-ai/whisper', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      task: 'transcribe',
      chunk_level: 'word',
      version: '3',
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Whisper transcription failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();

  // Normalize word timestamps — Whisper returns { word, timestamp: [start, end] }
  const words = (data.chunks || []).map(chunk => ({
    word: (chunk.text || '').trim(),
    start: chunk.timestamp?.[0] ?? 0,
    end: chunk.timestamp?.[1] ?? 0,
  })).filter(w => w.word.length > 0);

  console.log(`[voiceover] Whisper returned ${words.length} words, total text: ${(data.text || '').length} chars`);

  return {
    text: data.text || '',
    words,
  };
}

/**
 * Map word timestamps to scene boundaries.
 * Each scene gets the words whose start time falls within its time range.
 *
 * @param {Array<{ word, start, end }>} words - Word-level timestamps
 * @param {Array<{ role, duration_seconds }>} scenes - Scene definitions with durations
 * @returns {Array<{ sceneIndex, role, words: Array<{ word, start, end }>, startTime, endTime }>}
 */
export function mapWordsToScenes(words, scenes) {
  const result = [];
  let sceneStart = 0;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneEnd = sceneStart + scene.duration_seconds;

    const sceneWords = words.filter(w => w.start >= sceneStart && w.start < sceneEnd);

    result.push({
      sceneIndex: i,
      role: scene.role,
      words: sceneWords,
      startTime: sceneStart,
      endTime: sceneEnd,
    });

    sceneStart = sceneEnd;
  }

  return result;
}
