// api/lib/durationSolver.js
// Allocates model-valid per-scene durations that sum to a target total.

// Valid durations per video model (in seconds)
const MODEL_DURATIONS = {
  // Discrete — only these exact values
  fal_veo3:        { type: 'discrete', values: [4, 6, 8] },
  fal_veo2:        { type: 'discrete', values: [4, 6, 8] },
  fal_kling:       { type: 'discrete', values: [5, 10] },
  fal_wan:         { type: 'discrete', values: [5, 10] },
  fal_pixverse:    { type: 'discrete', values: [5, 8] },
  // Continuous — any integer in range
  fal_kling_v3:    { type: 'range', min: 3, max: 15 },
  fal_kling_o3:    { type: 'range', min: 3, max: 15 },
  wavespeed_wan:   { type: 'range', min: 5, max: 8 },
  // Fixed — no duration param, model decides
  fal_hailuo:      { type: 'fixed', value: 6 },
  fal_wan_pro:     { type: 'fixed', value: 5 },
};

/**
 * Enumerate all combinations of `values` of length `count` that sum to `target`.
 * Calls `callback(combo)` for each valid combination.
 * Pruning keeps this tractable: max 12 scenes × 3 values = ~531k iterations.
 */
function enumerate(values, count, target, callback, current = [], depth = 0) {
  if (depth === count) {
    if (current.reduce((a, b) => a + b, 0) === target) callback(current);
    return;
  }
  const remaining = count - depth;
  const currentSum = current.reduce((a, b) => a + b, 0);
  const maxPossible = remaining * Math.max(...values);
  const minPossible = remaining * Math.min(...values);
  if (currentSum + maxPossible < target) return;
  if (currentSum + minPossible > target) return;

  for (const v of values) {
    current.push(v);
    enumerate(values, count, target, callback, current, depth + 1);
    current.pop();
  }
}

/**
 * For discrete-duration models: enumerate combinations summing to target,
 * score by deviation from each scene's preferred midpoint.
 */
function solveDiscrete(targetTotal, durationRanges, validValues) {
  const sceneCount = durationRanges.length;
  const midpoints = durationRanges.map(([min, max]) => (min + max) / 2);

  let bestCombo = null;
  let bestScore = Infinity;
  let bestDiff = Infinity;

  // Try exact target first, then expand tolerance: ±2, ±4, ±6
  for (const tolerance of [0, 2, 4, 6]) {
    const targets = tolerance === 0
      ? [targetTotal]
      : [targetTotal - tolerance, targetTotal + tolerance];

    for (const t of targets) {
      if (t <= 0) continue;
      enumerate(validValues, sceneCount, t, (combo) => {
        const score = combo.reduce((sum, d, i) => sum + Math.abs(d - midpoints[i]), 0);
        const diff = Math.abs(t - targetTotal);
        if (diff < bestDiff || (diff === bestDiff && score < bestScore)) {
          bestCombo = [...combo];
          bestScore = score;
          bestDiff = diff;
        }
      });
    }
    if (bestCombo) return bestCombo;
  }

  // Fallback: adjust scene count ±1 (non-recursive, single attempt)
  for (const delta of [-1, 1]) {
    const adjusted = sceneCount + delta;
    if (adjusted < 2 || adjusted > 12) continue;
    const adjustedRanges = delta > 0
      ? [...durationRanges, durationRanges[durationRanges.length - 1]]
      : durationRanges.slice(0, -1);
    const adjustedMidpoints = adjustedRanges.map(([min, max]) => (min + max) / 2);
    for (const tolerance of [0, 2, 4, 6]) {
      const targets = tolerance === 0 ? [targetTotal] : [targetTotal - tolerance, targetTotal + tolerance];
      for (const t of targets) {
        if (t <= 0) continue;
        let found = null;
        enumerate(validValues, adjusted, t, (combo) => {
          if (found) return;
          const score = combo.reduce((sum, d, i) => sum + Math.abs(d - adjustedMidpoints[i]), 0);
          found = [...combo];
        });
        if (found) return found;
      }
    }
  }

  // Ultimate fallback: equal distribution using smallest valid value
  return durationRanges.map(() => validValues[0]);
}

/**
 * For continuous-range models: proportionally distribute target across scenes,
 * clamp to model range and scene durationRange, adjust remainder.
 */
function solveRange(targetTotal, durationRanges, min, max) {
  const midpoints = durationRanges.map(([lo, hi]) => (lo + hi) / 2);
  const totalMidpoint = midpoints.reduce((a, b) => a + b, 0);

  // Proportional distribution
  let durations = midpoints.map(mp => Math.round((mp / totalMidpoint) * targetTotal));

  // Clamp to model range AND scene range
  durations = durations.map((d, i) => {
    const sceneMin = Math.max(min, durationRanges[i][0]);
    const sceneMax = Math.min(max, durationRanges[i][1]);
    return Math.max(sceneMin, Math.min(sceneMax, d));
  });

  // Adjust remainder — distribute across scenes with most headroom
  let diff = targetTotal - durations.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const step = diff > 0 ? 1 : -1;
    let bestIdx = -1;
    let bestHeadroom = -1;
    for (let i = 0; i < durations.length; i++) {
      const sceneMin = Math.max(min, durationRanges[i][0]);
      const sceneMax = Math.min(max, durationRanges[i][1]);
      const newVal = durations[i] + step;
      if (newVal < sceneMin || newVal > sceneMax) continue;
      const headroom = step > 0
        ? sceneMax - durations[i]
        : durations[i] - sceneMin;
      if (headroom > bestHeadroom) {
        bestHeadroom = headroom;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break; // Can't adjust further
    durations[bestIdx] += step;
    diff -= step;
  }

  return durations;
}

/**
 * For fixed-duration models: all scenes get the same duration.
 * Adjust scene count to approximate target.
 */
function solveFixed(targetTotal, durationRanges, fixedValue) {
  const idealCount = Math.round(targetTotal / fixedValue);
  const count = Math.max(2, Math.min(12, idealCount));
  return Array(count).fill(fixedValue);
}

/**
 * Solve for model-valid per-scene durations.
 * @param {number} targetTotal - Target total duration in seconds
 * @param {Array<[number, number]>} durationRanges - Per-scene [min, max] from framework
 * @param {string} modelKey - Video model key (e.g., 'fal_veo3')
 * @returns {number[]} Array of durations, one per scene
 */
export function solveDurations(targetTotal, durationRanges, modelKey) {
  const config = MODEL_DURATIONS[modelKey];
  if (!config) {
    // Unknown model — fall back to equal distribution
    const perScene = Math.round(targetTotal / durationRanges.length);
    return durationRanges.map(() => Math.max(3, perScene));
  }

  switch (config.type) {
    case 'discrete':
      return solveDiscrete(targetTotal, durationRanges, config.values);
    case 'range':
      return solveRange(targetTotal, durationRanges, config.min, config.max);
    case 'fixed':
      return solveFixed(targetTotal, durationRanges, config.value);
  }
}
