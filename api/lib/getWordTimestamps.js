/**
 * Word Timestamp Extractor — get word-level timing from TTS audio.
 *
 * Wraps the existing Whisper integration (voiceoverGenerator.generateTimestamps)
 * with a focused interface for the block aligner.
 */

import { generateTimestamps } from './voiceoverGenerator.js';

/**
 * Extract word-level timestamps from a TTS audio URL.
 *
 * @param {string} audioUrl - Public URL of the TTS audio (MP3)
 * @param {string} falKey - FAL API key
 * @returns {Promise<{
 *   words: Array<{ word: string, start: number, end: number }>,
 *   totalDuration: number,
 *   wordCount: number,
 * }>}
 */
export async function getWordTimestamps(audioUrl, falKey) {
  if (!audioUrl) throw new Error('Audio URL required for timestamp extraction');
  if (!falKey) throw new Error('FAL key required for Whisper');

  console.log(`[getWordTimestamps] Extracting word timestamps from TTS audio...`);

  const result = await generateTimestamps(audioUrl, falKey);

  const words = result.words || [];
  const totalDuration = words.length > 0
    ? words[words.length - 1].end
    : 0;

  console.log(`[getWordTimestamps] ${words.length} words, total duration ${totalDuration.toFixed(1)}s`);

  return {
    words,
    totalDuration,
    wordCount: words.length,
  };
}
