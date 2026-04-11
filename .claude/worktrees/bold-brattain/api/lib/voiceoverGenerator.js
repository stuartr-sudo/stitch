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

// Gemini TTS voices via fal-ai/gemini-tts
export const GEMINI_VOICES = [
  { id: 'Kore', label: 'Kore', description: 'Strong, firm female' },
  { id: 'Puck', label: 'Puck', description: 'Upbeat, lively male' },
  { id: 'Charon', label: 'Charon', description: 'Calm, professional male' },
  { id: 'Zephyr', label: 'Zephyr', description: 'Bright, clear female' },
  { id: 'Aoede', label: 'Aoede', description: 'Warm, melodic female' },
  { id: 'Achernar', label: 'Achernar', description: 'Deep, resonant' },
  { id: 'Achird', label: 'Achird', description: 'Gentle, measured' },
  { id: 'Algenib', label: 'Algenib', description: 'Energetic, bright' },
  { id: 'Algieba', label: 'Algieba', description: 'Warm, conversational' },
  { id: 'Alnilam', label: 'Alnilam', description: 'Steady, authoritative' },
  { id: 'Autonoe', label: 'Autonoe', description: 'Soft, thoughtful' },
  { id: 'Callirrhoe', label: 'Callirrhoe', description: 'Clear, articulate' },
  { id: 'Despina', label: 'Despina', description: 'Light, airy' },
  { id: 'Enceladus', label: 'Enceladus', description: 'Rich, dramatic' },
  { id: 'Erinome', label: 'Erinome', description: 'Crisp, professional' },
  { id: 'Fenrir', label: 'Fenrir', description: 'Bold, commanding' },
  { id: 'Gacrux', label: 'Gacrux', description: 'Smooth, reassuring' },
  { id: 'Iapetus', label: 'Iapetus', description: 'Neutral, versatile' },
  { id: 'Laomedeia', label: 'Laomedeia', description: 'Melodious, flowing' },
  { id: 'Leda', label: 'Leda', description: 'Quiet, intimate' },
  { id: 'Orus', label: 'Orus', description: 'Strong, grounded' },
  { id: 'Pulcherrima', label: 'Pulcherrima', description: 'Elegant, refined' },
  { id: 'Rasalgethi', label: 'Rasalgethi', description: 'Deep, sonorous' },
  { id: 'Sadachbia', label: 'Sadachbia', description: 'Cheerful, warm' },
  { id: 'Sadaltager', label: 'Sadaltager', description: 'Measured, precise' },
  { id: 'Schedar', label: 'Schedar', description: 'Bright, enthusiastic' },
  { id: 'Sulafat', label: 'Sulafat', description: 'Calm, soothing' },
  { id: 'Umbriel', label: 'Umbriel', description: 'Low, mysterious' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix', description: 'Clear, confident' },
  { id: 'Zubenelgenubi', label: 'Zubenelgenubi', description: 'Animated, expressive' },
];

const GEMINI_TTS_ENDPOINT = 'fal-ai/gemini-tts';

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
export function resolveVoiceName(voiceId) {
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

  const submitData = await submitRes.json();
  const request_id = submitData.request_id;
  // Use response_url from FAL (full path) to avoid 2-segment truncation in pollFalQueue
  const responseUrl = submitData.response_url
    || `https://queue.fal.run/fal-ai/elevenlabs/tts/eleven-v3/requests/${request_id}`;
  console.log(`[voiceover] FAL TTS queued: ${request_id}`);

  // Poll for completion — pass full URL to bypass model path truncation
  const result = await pollFalQueue(responseUrl, 'fal-ai/elevenlabs/tts/eleven-v3', falKey, 60, 2000);

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
 * Generate voiceover using Gemini TTS via FAL.
 * @param {string} text - Narration text
 * @param {object} keys - { falKey }
 * @param {object} supabase - Supabase client
 * @param {object} options - { voice, model, styleInstructions }
 * @returns {Promise<string>} Public URL of generated MP3
 */
export async function generateGeminiVoiceover(text, keys, supabase, options = {}) {
  const {
    voice = 'Kore',
    model = 'gemini-2.5-flash-tts',
    styleInstructions = 'Say the following in a warm, conversational tone',
  } = options;

  const falKey = keys.falKey;
  if (!falKey) throw new Error('FAL API key required for Gemini TTS voiceover generation');
  if (!text?.trim()) throw new Error('Text is required for Gemini TTS voiceover generation');

  console.log(`[Gemini TTS] Generating voiceover: voice=${voice}, model=${model}, text length=${text.length}`);

  const body = {
    prompt: text,
    style_instructions: styleInstructions,
    voice,
    model,
    language_code: 'English (US)',
    temperature: 1,
    output_format: 'mp3',
  };

  // Submit to FAL queue
  const submitRes = await fetch(`https://queue.fal.run/${GEMINI_TTS_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const err = await submitRes.text();
    throw new Error(`Gemini TTS submit failed (${submitRes.status}): ${err}`);
  }

  const submitData = await submitRes.json();
  const request_id = submitData.request_id;
  // Use response_url from FAL (full path) to avoid 2-segment truncation in pollFalQueue
  const responseUrl = submitData.response_url
    || `https://queue.fal.run/${GEMINI_TTS_ENDPOINT}/requests/${request_id}`;
  console.log(`[Gemini TTS] Queued: request_id=${request_id}`);

  // Poll for completion
  const result = await pollFalQueue(responseUrl, GEMINI_TTS_ENDPOINT, falKey, 120, 2000);

  if (!result?.audio?.url) {
    throw new Error('Gemini TTS returned no audio URL');
  }

  console.log(`[Gemini TTS] Complete, downloading from FAL...`);

  // Download and re-upload to Supabase
  const audioRes = await fetch(result.audio.url);
  if (!audioRes.ok) throw new Error(`Failed to download Gemini TTS audio: ${audioRes.status}`);

  const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
  console.log(`[Gemini TTS] Audio: ${audioBuffer.length} bytes`);

  const fileName = `pipeline/voiceover/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
  const { error: uploadError } = await supabase.storage
    .from('media')
    .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: false });

  if (uploadError) throw new Error(`Gemini TTS voiceover upload failed: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
  console.log(`[Gemini TTS] Uploaded to ${publicUrl}`);
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

  // 90-second timeout for Whisper (synchronous endpoint, can be slow for long audio)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

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
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

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
