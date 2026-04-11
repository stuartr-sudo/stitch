/**
 * Assembly Validator — pre-assembly timing validation.
 *
 * Checks that video clips, TTS audio, and music are temporally aligned
 * before the FFmpeg assembly step. Catches drift early.
 */

/**
 * Validate that all assembly components are temporally aligned.
 *
 * @param {object} params
 * @param {Array<{ clipDuration: number, videoUrl: string|null }>} params.sceneResults - Per-scene results
 * @param {number} params.ttsAudioDuration - Measured TTS audio duration (seconds)
 * @param {number|null} params.musicDuration - Music track duration (null if no music)
 * @param {number} [params.maxDrift=2.0] - Maximum acceptable drift (seconds) before warning
 * @param {number} [params.criticalDrift=5.0] - Drift threshold for recommending clip regeneration
 * @returns {{
 *   valid: boolean,
 *   totalClipDuration: number,
 *   ttsAudioDuration: number,
 *   drift: number,
 *   issues: string[],
 *   recommendation: string|null,
 * }}
 */
export function validateAssemblyTiming({
  sceneResults,
  ttsAudioDuration,
  musicDuration = null,
  maxDrift = 2.0,
  criticalDrift = 5.0,
}) {
  const issues = [];
  const validScenes = sceneResults.filter(s => s.videoUrl);

  if (validScenes.length === 0) {
    return {
      valid: false,
      totalClipDuration: 0,
      ttsAudioDuration,
      drift: ttsAudioDuration,
      issues: ['No valid video clips — all scenes failed'],
      recommendation: 'regenerate_all_clips',
    };
  }

  const totalClipDuration = validScenes.reduce((sum, s) => sum + (s.clipDuration || 0), 0);
  const drift = Math.abs(totalClipDuration - ttsAudioDuration);

  // Check clip-to-TTS alignment
  if (drift > criticalDrift) {
    issues.push(`Critical duration drift: clips=${totalClipDuration.toFixed(1)}s, TTS=${ttsAudioDuration.toFixed(1)}s, drift=${drift.toFixed(1)}s`);
  } else if (drift > maxDrift) {
    issues.push(`Duration drift: clips=${totalClipDuration.toFixed(1)}s, TTS=${ttsAudioDuration.toFixed(1)}s, drift=${drift.toFixed(1)}s`);
  }

  // Check for missing scenes (gaps in the sequence)
  const skippedCount = sceneResults.length - validScenes.length;
  if (skippedCount > 0) {
    issues.push(`${skippedCount} scene(s) failed — video will have gaps in narration coverage`);
  }

  // Check music duration
  if (musicDuration !== null && musicDuration < totalClipDuration) {
    issues.push(`Music too short: music=${musicDuration.toFixed(1)}s, video=${totalClipDuration.toFixed(1)}s — music will end before video`);
  }

  // Determine recommendation
  let recommendation = null;
  if (drift > criticalDrift) {
    recommendation = 'regenerate_clips';
  } else if (drift > maxDrift) {
    recommendation = 'adjust_last_clip';
  } else if (skippedCount > sceneResults.length / 2) {
    recommendation = 'regenerate_failed_scenes';
  } else if (musicDuration !== null && musicDuration < totalClipDuration - 5) {
    recommendation = 'regenerate_music';
  }

  const valid = issues.length === 0;

  if (!valid) {
    console.warn(`[assemblyValidator] ${issues.length} issue(s) found:`);
    issues.forEach(issue => console.warn(`  - ${issue}`));
    if (recommendation) console.warn(`  Recommendation: ${recommendation}`);
  } else {
    console.log(`[assemblyValidator] All aligned: clips=${totalClipDuration.toFixed(1)}s, TTS=${ttsAudioDuration.toFixed(1)}s, drift=${drift.toFixed(1)}s`);
  }

  return {
    valid,
    totalClipDuration,
    ttsAudioDuration,
    drift,
    issues,
    recommendation,
  };
}
