/**
 * Storyboard Voiceover Generator
 *
 * Generates speech audio from dialogue text for each scene.
 * Supports multiple TTS providers via FAL.ai:
 *
 *   - ElevenLabs Eleven-v3: Best quality, word timestamps, 20+ voices
 *   - ElevenLabs Multilingual v2: 29 languages, great for localization
 *   - ElevenLabs Turbo v2.5: Low latency, 32 languages
 *   - Kokoro: Cheapest ($0.02/1K chars), good for draft previews
 *   - MiniMax Speech 02 HD: Emotion control, 300+ voices, 30+ languages
 *
 * The voiceover audio serves two purposes:
 *   1. Master clock — TTS duration drives scene duration (instead of guessing)
 *   2. Lipsync input — audio is fed to lipsync models after video generation
 *
 * Pipeline:
 *   Script (Stage 1) → Dialogue per scene → TTS → Audio URLs + durations
 *   → Informs scene duration → Video generation → Lipsync → Assembly
 */

import { pollFalQueue, uploadUrlToSupabase } from './pipelineHelpers.js';

const FAL_BASE = 'https://queue.fal.run';

// ── TTS Model Registry ──────────────────────────────────────────────────────

export const TTS_MODELS = {
  'elevenlabs-v3': {
    label: 'ElevenLabs Eleven-v3',
    description: 'Best quality — natural prosody, word timestamps',
    endpoint: 'fal-ai/elevenlabs/tts/eleven-v3',
    costPer1kChars: 0.05,
    supportsTimestamps: true,
    supportsSpeed: true,
    defaultVoice: 'Rachel',
  },
  'elevenlabs-multilingual': {
    label: 'ElevenLabs Multilingual v2',
    description: '29 languages — best for localization',
    endpoint: 'fal-ai/elevenlabs/tts/multilingual-v2',
    costPer1kChars: 0.05,
    supportsTimestamps: true,
    supportsSpeed: true,
    defaultVoice: 'Aria',
  },
  'elevenlabs-turbo': {
    label: 'ElevenLabs Turbo v2.5',
    description: 'Low latency — 32 languages, fast generation',
    endpoint: 'fal-ai/elevenlabs/tts/turbo-v2.5',
    costPer1kChars: 0.05,
    supportsTimestamps: true,
    supportsSpeed: true,
    defaultVoice: 'Rachel',
  },
  'kokoro': {
    label: 'Kokoro TTS',
    description: 'Budget-friendly — great for draft previews',
    endpoint: 'fal-ai/kokoro/american-english',
    costPer1kChars: 0.02,
    supportsTimestamps: false,
    supportsSpeed: false,
    defaultVoice: 'af_heart',
  },
  'minimax': {
    label: 'MiniMax Speech 02 HD',
    description: 'Premium — 300+ voices, emotion control, 30+ languages',
    endpoint: 'fal-ai/minimax-tts/v2',
    costPer1kChars: 0.10,
    supportsTimestamps: false,
    supportsSpeed: true,
    defaultVoice: 'English_calm_woman',
  },
};

// ── Available Voices (ElevenLabs) ───────────────────────────────────────────

export const ELEVENLABS_VOICES = [
  { id: 'Rachel', label: 'Rachel', gender: 'female', age: 'young', style: 'calm, narration' },
  { id: 'Aria', label: 'Aria', gender: 'female', age: 'young', style: 'expressive, warm' },
  { id: 'Sarah', label: 'Sarah', gender: 'female', age: 'young', style: 'soft, gentle' },
  { id: 'Laura', label: 'Laura', gender: 'female', age: 'adult', style: 'professional' },
  { id: 'Charlotte', label: 'Charlotte', gender: 'female', age: 'adult', style: 'warm, authoritative' },
  { id: 'Alice', label: 'Alice', gender: 'female', age: 'adult', style: 'British, clear' },
  { id: 'Matilda', label: 'Matilda', gender: 'female', age: 'adult', style: 'warm, friendly' },
  { id: 'Jessica', label: 'Jessica', gender: 'female', age: 'young', style: 'energetic' },
  { id: 'Lily', label: 'Lily', gender: 'female', age: 'young', style: 'British, gentle' },
  { id: 'Roger', label: 'Roger', gender: 'male', age: 'adult', style: 'confident, deep' },
  { id: 'Charlie', label: 'Charlie', gender: 'male', age: 'young', style: 'casual, Australian' },
  { id: 'George', label: 'George', gender: 'male', age: 'adult', style: 'British, warm' },
  { id: 'Callum', label: 'Callum', gender: 'male', age: 'adult', style: 'deep, transatlantic' },
  { id: 'River', label: 'River', gender: 'nonbinary', age: 'young', style: 'calm, American' },
  { id: 'Liam', label: 'Liam', gender: 'male', age: 'young', style: 'articulate, American' },
  { id: 'Will', label: 'Will', gender: 'male', age: 'young', style: 'friendly' },
  { id: 'Eric', label: 'Eric', gender: 'male', age: 'adult', style: 'friendly, American' },
  { id: 'Chris', label: 'Chris', gender: 'male', age: 'adult', style: 'casual' },
  { id: 'Brian', label: 'Brian', gender: 'male', age: 'adult', style: 'deep, American' },
  { id: 'Daniel', label: 'Daniel', gender: 'male', age: 'adult', style: 'British, authoritative' },
  { id: 'Bill', label: 'Bill', gender: 'male', age: 'senior', style: 'documentary' },
];

// ── Core TTS Generation ─────────────────────────────────────────────────────

/**
 * Generate speech audio from text using the specified TTS model.
 *
 * @param {string} text - Dialogue/narration text to convert
 * @param {object} options
 * @param {string} options.model - TTS model key from TTS_MODELS
 * @param {string} options.voice - Voice name/ID
 * @param {number} options.speed - Speech speed (0.7-1.2, default 1.0)
 * @param {number} options.stability - Voice stability (0-1, default 0.5)
 * @param {string} options.falKey - FAL API key
 * @param {object} options.supabase - Supabase client for upload
 * @returns {Promise<{ audioUrl, durationSeconds, timestamps, charCount }>}
 */
export async function generateSpeech(text, options = {}) {
  const {
    model = 'elevenlabs-v3',
    voice,
    speed = 1.0,
    stability = 0.5,
    falKey,
    supabase,
  } = options;

  if (!falKey) throw new Error('FAL key required for TTS');
  if (!text?.trim()) throw new Error('No text to synthesize');

  const modelConfig = TTS_MODELS[model] || TTS_MODELS['elevenlabs-v3'];
  const effectiveVoice = voice || modelConfig.defaultVoice;
  const charCount = text.length;

  console.log(`[Voiceover] Generating: "${text.substring(0, 60)}..." (${charCount} chars, model: ${model}, voice: ${effectiveVoice})`);

  // Build request body based on model family
  let body;
  if (model.startsWith('elevenlabs')) {
    body = {
      text,
      voice: effectiveVoice,
      stability,
      similarity_boost: 0.75,
      timestamps: modelConfig.supportsTimestamps,
      apply_text_normalization: 'auto',
    };
    if (modelConfig.supportsSpeed && speed !== 1.0) {
      body.speed = Math.max(0.7, Math.min(1.2, speed));
    }
  } else if (model === 'kokoro') {
    body = { text, voice: effectiveVoice };
  } else if (model === 'minimax') {
    body = { text, voice_id: effectiveVoice };
    if (speed !== 1.0) body.speed = speed;
  } else {
    body = { text, voice: effectiveVoice };
  }

  const res = await fetch(`${FAL_BASE}/${modelConfig.endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS failed (${model}): ${errText.substring(0, 200)}`);
  }

  const queueData = await res.json();

  // Some models return audio directly
  let audioUrl = queueData?.audio?.url;
  let timestamps = queueData?.timestamps || null;

  if (!audioUrl && queueData.request_id) {
    const output = await pollFalQueue(
      queueData.response_url || queueData.request_id,
      modelConfig.endpoint,
      falKey,
      120,
      2000
    );
    audioUrl = output?.audio?.url;
    timestamps = output?.timestamps || null;
  }

  if (!audioUrl) throw new Error('TTS returned no audio URL');

  // Measure audio duration by fetching headers or from timestamps
  let durationSeconds = null;
  if (timestamps?.length > 0) {
    // Use last timestamp end time
    const lastTimestamp = timestamps[timestamps.length - 1];
    durationSeconds = lastTimestamp.end || lastTimestamp.time || null;
  }

  if (!durationSeconds) {
    // Estimate from character count — ~150 words/min, ~5 chars/word = ~750 chars/min
    // Adjusted by speed factor
    durationSeconds = Math.round((charCount / 750) * 60 / speed);
  }

  // Upload to Supabase for persistence
  if (supabase) {
    try {
      audioUrl = await uploadUrlToSupabase(audioUrl, supabase, 'pipeline/voiceover');
    } catch (err) {
      console.warn('[Voiceover] Upload failed, using original URL:', err.message);
    }
  }

  console.log(`[Voiceover] Generated: ${durationSeconds}s, ${audioUrl.substring(0, 80)}`);

  return {
    audioUrl,
    durationSeconds,
    timestamps,
    charCount,
    voice: effectiveVoice,
    model,
    estimatedCost: (charCount / 1000) * modelConfig.costPer1kChars,
  };
}

// ── Batch Generation (Full Storyboard) ──────────────────────────────────────

/**
 * Generate voiceover for all scenes with dialogue.
 * Returns per-scene audio URLs and durations.
 * Scenes without dialogue are skipped.
 *
 * @param {object[]} scenes - Array of { sceneNumber, dialogue }
 * @param {object} options - { model, voice, speed, falKey, supabase }
 * @returns {Promise<object[]>} Array of { sceneNumber, audioUrl, durationSeconds, ... }
 */
export async function generateStoryboardVoiceover(scenes, options = {}) {
  const results = [];
  let totalDuration = 0;
  let totalCost = 0;

  for (const scene of scenes) {
    if (!scene.dialogue?.trim()) {
      results.push({
        sceneNumber: scene.sceneNumber,
        audioUrl: null,
        durationSeconds: null,
        skipped: true,
        reason: 'No dialogue',
      });
      continue;
    }

    try {
      // Use per-scene voice override if provided, otherwise fall back to global
      const sceneOptions = scene.voice ? { ...options, voice: scene.voice } : options;
      const result = await generateSpeech(scene.dialogue, sceneOptions);
      totalDuration += result.durationSeconds || 0;
      totalCost += result.estimatedCost || 0;

      results.push({
        sceneNumber: scene.sceneNumber,
        ...result,
        skipped: false,
      });
    } catch (err) {
      console.error(`[Voiceover] Scene ${scene.sceneNumber} failed:`, err.message);
      results.push({
        sceneNumber: scene.sceneNumber,
        audioUrl: null,
        durationSeconds: null,
        skipped: false,
        error: err.message,
      });
    }
  }

  console.log(`[Voiceover] Batch complete: ${results.filter(r => r.audioUrl).length}/${scenes.length} scenes, ${totalDuration.toFixed(1)}s total, ~$${totalCost.toFixed(3)}`);

  return {
    results,
    totalDuration,
    totalCost,
    scenesWithAudio: results.filter(r => r.audioUrl).length,
    scenesSkipped: results.filter(r => r.skipped).length,
    scenesFailed: results.filter(r => r.error).length,
  };
}

/**
 * Concatenate per-scene audio clips into a single continuous narration track.
 * Inserts silence gaps between scenes based on scene duration vs audio duration.
 *
 * @param {object[]} sceneAudioResults - From generateStoryboardVoiceover
 * @param {object[]} scenes - Full scene data with durationSeconds
 * @param {string} falKey
 * @param {object} supabase
 * @returns {Promise<string>} URL of the concatenated narration audio
 */
export async function concatenateNarration(sceneAudioResults, scenes, falKey, supabase) {
  const audioTracks = [];
  let currentTimestamp = 0;

  for (let i = 0; i < scenes.length; i++) {
    const audioResult = sceneAudioResults.find(r => r.sceneNumber === scenes[i].sceneNumber);
    const sceneDuration = (scenes[i].durationSeconds || 5) * 1000; // ms

    if (audioResult?.audioUrl) {
      audioTracks.push({
        url: audioResult.audioUrl,
        timestamp: currentTimestamp,
        duration: (audioResult.durationSeconds || 5) * 1000,
      });
    }

    currentTimestamp += sceneDuration;
  }

  if (audioTracks.length === 0) return null;

  const totalDurationSec = currentTimestamp / 1000;

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/compose`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tracks: [{ id: 'narration', type: 'audio', keyframes: audioTracks }],
      duration: totalDurationSec,
    }),
  });

  if (!res.ok) throw new Error(`Audio concatenation failed: ${await res.text()}`);
  const queueData = await res.json();

  const output = await pollFalQueue(
    queueData.response_url || queueData.request_id,
    'fal-ai/ffmpeg-api/compose',
    falKey,
    60,
    2000
  );

  const audioUrl = output?.audio_url || output?.audio?.url || output?.output_url;
  if (!audioUrl) throw new Error('No audio URL from concatenation');

  if (supabase) {
    return await uploadUrlToSupabase(audioUrl, supabase, 'pipeline/voiceover');
  }
  return audioUrl;
}
