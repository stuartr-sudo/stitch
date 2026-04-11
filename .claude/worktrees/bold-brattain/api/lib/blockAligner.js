/**
 * Block Aligner — snap TTS word timestamps to video-model-valid clip durations.
 *
 * Given word-level timestamps from Whisper and a video model's duration constraints,
 * computes scene "blocks" where each block:
 * 1. Has a duration that the video model can actually produce (e.g., 4s/6s/8s for Veo)
 * 2. Splits at word boundaries (never mid-word)
 * 3. Covers the entire TTS audio with minimal drift
 *
 * The output feeds into sceneDirector.js which generates visual prompts per block.
 */

import { MODEL_DURATIONS } from './durationSolver.js';

/**
 * Get valid clip durations for a model, sorted descending (prefer longer clips).
 */
function getValidDurations(modelKey) {
  const config = MODEL_DURATIONS[modelKey];
  if (!config) return [5, 8]; // safe fallback

  switch (config.type) {
    case 'discrete':
      return [...config.values].sort((a, b) => b - a);
    case 'range': {
      const vals = [];
      for (let d = config.max; d >= config.min; d--) vals.push(d);
      return vals;
    }
    case 'fixed':
      return [config.value];
  }
}

/**
 * Find the word index whose start time is closest to targetTime.
 * Searches forward from startIdx for efficiency.
 *
 * @param {Array<{ word, start, end }>} words
 * @param {number} targetTime - seconds
 * @param {number} startIdx - search from this index
 * @returns {number} word index
 */
function findNearestWordBoundary(words, targetTime, startIdx = 0) {
  let bestIdx = startIdx;
  let bestDist = Infinity;

  for (let i = startIdx; i < words.length; i++) {
    const dist = Math.abs(words[i].start - targetTime);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
    // Once we've passed the target, we won't find anything closer
    if (words[i].start > targetTime + 2) break;
  }

  return bestIdx;
}

/**
 * @typedef {object} AlignedBlock
 * @property {number} clipDuration - Video clip duration (model-valid)
 * @property {number} startTime - TTS start time (seconds)
 * @property {number} endTime - TTS end time (seconds)
 * @property {number} startWordIdx - First word index in this block
 * @property {number} endWordIdx - Last word index in this block (inclusive)
 * @property {string} narration - Concatenated words for this block
 * @property {string|null} frameworkLabel - Framework scene label (if available)
 * @property {string|null} frameworkBeat - Framework beat type (if available)
 */

/**
 * Align TTS word timestamps to model-valid clip durations.
 *
 * Strategy: greedily allocate the longest valid clip duration that fits the remaining
 * audio, snapping the split point to the nearest word boundary.
 *
 * @param {Array<{ word: string, start: number, end: number }>} words - Whisper timestamps
 * @param {number} totalDuration - Total TTS audio duration (seconds)
 * @param {string} modelKey - Video model key (e.g., 'fal_veo3', 'fal_kling_v3')
 * @param {Array<{ label: string, beat: string }>} [frameworkScenes] - Optional framework hints
 * @returns {{
 *   blocks: AlignedBlock[],
 *   totalClipDuration: number,
 *   drift: number,
 * }}
 */
export function alignBlocks(words, totalDuration, modelKey, frameworkScenes = null) {
  const validDurations = getValidDurations(modelKey);
  const maxClip = validDurations[0];
  const minClip = validDurations[validDurations.length - 1];

  const blocks = [];
  let currentTime = 0;
  let currentWordIdx = 0;
  let blockIdx = 0;

  while (currentTime < totalDuration - 0.5 && currentWordIdx < words.length) {
    const remaining = totalDuration - currentTime;

    // If remaining is less than min clip, extend the previous block
    if (remaining < minClip && blocks.length > 0) {
      const lastBlock = blocks[blocks.length - 1];
      lastBlock.endTime = totalDuration;
      lastBlock.endWordIdx = words.length - 1;
      lastBlock.narration = words.slice(lastBlock.startWordIdx).map(w => w.word).join(' ');
      break;
    }

    // Pick longest valid duration that fits
    let clipDuration = minClip;
    for (const d of validDurations) {
      if (d <= remaining + 1.0) { // 1s tolerance — video can be slightly longer than remaining audio
        clipDuration = d;
        break;
      }
    }

    const targetEndTime = currentTime + clipDuration;
    const endWordIdx = findNearestWordBoundary(words, targetEndTime, currentWordIdx + 1);

    // Ensure we advance at least one word
    const actualEndWordIdx = Math.max(endWordIdx, currentWordIdx + 1);
    const actualEndTime = actualEndWordIdx < words.length
      ? words[actualEndWordIdx].start
      : totalDuration;

    // Get framework hints if available
    const fwScene = frameworkScenes?.[blockIdx]
      || frameworkScenes?.[Math.min(blockIdx, (frameworkScenes?.length || 1) - 1)]
      || null;

    blocks.push({
      clipDuration,
      startTime: currentTime,
      endTime: actualEndTime,
      startWordIdx: currentWordIdx,
      endWordIdx: actualEndWordIdx - 1,
      narration: words.slice(currentWordIdx, actualEndWordIdx).map(w => w.word).join(' '),
      frameworkLabel: fwScene?.label || null,
      frameworkBeat: fwScene?.beat || null,
    });

    currentTime = actualEndTime;
    currentWordIdx = actualEndWordIdx;
    blockIdx++;
  }

  // Handle trailing words
  if (currentWordIdx < words.length && blocks.length > 0) {
    const lastBlock = blocks[blocks.length - 1];
    lastBlock.endTime = totalDuration;
    lastBlock.endWordIdx = words.length - 1;
    lastBlock.narration = words.slice(lastBlock.startWordIdx).map(w => w.word).join(' ');
  }

  const totalClipDuration = blocks.reduce((sum, b) => sum + b.clipDuration, 0);
  const drift = Math.abs(totalClipDuration - totalDuration);

  console.log(`[blockAligner] ${blocks.length} blocks, total clip duration ${totalClipDuration}s for ${totalDuration.toFixed(1)}s TTS (drift: ${drift.toFixed(1)}s)`);

  return { blocks, totalClipDuration, drift };
}
