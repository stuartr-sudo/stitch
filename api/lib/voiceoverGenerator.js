/**
 * ElevenLabs Text-to-Speech via FAL.ai proxy.
 *
 * Uses fal-ai/elevenlabs/tts/eleven-v3 so we only need a FAL key,
 * no separate ElevenLabs subscription required.
 *
 * The generated audio is uploaded to Supabase storage and its
 * public URL is returned.
 */

import { pollFalQueue } from './pipelineHelpers.js';

// Map legacy ElevenLabs voice IDs to FAL-compatible voice names.
// FAL only supports: Aria, Roger, Sarah, Laura, Charlie, George, Callum,
// River, Liam, Charlotte, Alice, Matilda, Will, Jessica, Eric, Chris,
// Brian, Daniel, Lily, Bill, Rachel, Adam.
// Legacy names that don't exist on FAL are mapped to similar FAL voices.
const VOICE_ID_TO_NAME = {
  'pNInz6obpgDQGcFmaJgB': 'Adam',       // Adam → Adam (exists on FAL)
  '21m00Tcm4TlvDq8ikWAM': 'Rachel',      // Rachel → Rachel (exists on FAL)
  'EXAVITQu4vr4xnSDxMaL': 'Laura',       // Bella → Laura (similar warm female)
  'ErXwobaYiN019PkySvjV': 'Brian',        // Antoni → Brian (similar warm male)
  'MF3mGyEYCl7XYWbV9V6O': 'Charlotte',    // Elli → Charlotte (similar young female)
  'TxGEqnHWrfWFTfGW9XjX': 'Charlie',      // Josh → Charlie (similar young male)
  'VR6AewLTigWG4xSOukaG': 'George',       // Arnold → George (similar deep male)
  'AZnzlk1XvdvUeBnXmlld': 'Alice',        // Domi → Alice (similar female)
  'jBpfuIE2acCO8z3wKNLl': 'Lily',         // Gigi → Lily (similar female)
  'yoZ06aMxZJJ28mfd3POQ': 'Liam',         // Sam → Liam (similar male)
  '2EiwWnXFnvU5JabPnv8n': 'Roger',        // Clyde → Roger (similar deep male)
  'onwK4e9ZLuTAKqWW03F9': 'Daniel',       // Daniel → Daniel (exists on FAL)
};

/**
 * Resolve a voice identifier to a FAL voice name.
 * Accepts: FAL voice name ("Aria"), legacy ElevenLabs ID, or falls back to "Rachel".
 */
function resolveVoiceName(voiceId) {
  if (!voiceId) return 'Rachel';
  // If it's already a known FAL voice name, use it directly
  const falVoices = ['Aria','Roger','Sarah','Laura','Charlie','George','Callum','River','Liam','Charlotte','Alice','Matilda','Will','Jessica','Eric','Chris','Brian','Daniel','Lily','Bill','Rachel','Adam'];
  if (falVoices.includes(voiceId)) return voiceId;
  // Try legacy ID mapping
  return VOICE_ID_TO_NAME[voiceId] || 'Rachel';
}

/**
 * Generate voiceover audio from text using FAL.ai ElevenLabs TTS.
 *
 * @param {string} text - The narration text to convert to speech
 * @param {object} keys - { falKey }
 * @param {object} supabase - Supabase client
 * @param {object} [options]
 * @param {string} [options.voiceId='Rachel'] - Voice name or legacy ElevenLabs ID
 * @param {number} [options.stability=0.5] - Voice stability (0-1)
 * @returns {Promise<string>} Public URL of the generated MP3
 */
export async function generateVoiceover(text, keys, supabase, options = {}) {
  const {
    voiceId = 'Rachel',
    stability = 0.5,
  } = options;

  const falKey = keys.falKey;
  if (!falKey) throw new Error('FAL API key required for voiceover generation');
  if (!text?.trim()) throw new Error('Text is required for voiceover generation');

  const voice = resolveVoiceName(voiceId);
  console.log(`[voiceover] Generating TTS via FAL: ${text.length} chars, voice=${voice}`);

  // Submit to FAL queue
  const submitRes = await fetch('https://queue.fal.run/fal-ai/elevenlabs/tts/eleven-v3', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice,
      stability,
    }),
  });

  if (!submitRes.ok) {
    const errorText = await submitRes.text();
    throw new Error(`FAL TTS submit failed (${submitRes.status}): ${errorText}`);
  }

  const { request_id } = await submitRes.json();
  console.log(`[voiceover] FAL TTS queued: ${request_id}`);

  // Poll for completion
  const result = await pollFalQueue(request_id, 'fal-ai/elevenlabs/tts/eleven-v3', falKey, 60, 2000);

  const audioUrl = result?.audio?.url;
  if (!audioUrl) throw new Error('FAL TTS returned no audio URL');

  console.log(`[voiceover] TTS complete, downloading from FAL...`);

  // Download and re-upload to Supabase
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`Failed to download TTS audio: ${audioRes.status}`);

  const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
  console.log(`[voiceover] TTS audio: ${audioBuffer.length} bytes`);

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
