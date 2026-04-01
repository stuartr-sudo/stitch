/**
 * Camera Cinematography Decision Framework
 *
 * Maps narrative beat types and emotional tones to cinematographic
 * camera angles and framing choices, following established film grammar.
 *
 * Used by storyboardVisualDirector.js to inject per-scene camera recommendations
 * before the LLM generates visual prompts. The LLM may use or override them.
 */

// ── Camera Angle Definitions ────────────────────────────────────────────────

export const CAMERA_ANGLES = {
  low_angle: {
    label: 'Low Angle',
    effect: 'power, dominance, heroism, authority',
    keywords: ['power', 'dominance', 'heroic', 'triumph', 'authority', 'strength', 'confident', 'victory', 'climax', 'rising_action'],
    promptSnippet: 'low-angle shot looking up at subject, conveying power and dominance',
  },
  high_angle: {
    label: 'High Angle',
    effect: 'vulnerability, smallness, isolation, exposure',
    keywords: ['vulnerable', 'small', 'overwhelmed', 'anxious', 'lost', 'isolated', 'uncertain', 'fear', 'setup', 'problem'],
    promptSnippet: 'high-angle shot looking down at subject, emphasizing vulnerability and scale',
  },
  eye_level: {
    label: 'Eye Level',
    effect: 'neutral perspective, conversation, intimacy, equality',
    keywords: ['conversation', 'neutral', 'dialogue', 'connection', 'equal', 'everyday', 'normal', 'relatable', 'conclusion', 'resolution'],
    promptSnippet: 'eye-level shot, neutral perspective creating intimacy and connection',
  },
  dutch_angle: {
    label: 'Dutch Angle',
    effect: 'tension, unease, disorientation, psychological conflict',
    keywords: ['tension', 'unease', 'conflict', 'danger', 'disturbing', 'thriller', 'dark', 'climax', 'turning_point', 'escalation'],
    promptSnippet: 'Dutch angle (tilted camera), creating psychological tension and unease',
  },
  birds_eye: {
    label: "Bird's Eye",
    effect: 'isolation, scale, God perspective, overview',
    keywords: ['isolated', 'overview', 'scale', 'epic', 'vast', 'alone', 'birds_eye', 'establish', 'cold_open', 'hook'],
    promptSnippet: "bird's eye overhead shot, revealing scale and isolation from above",
  },
  over_the_shoulder: {
    label: 'Over the Shoulder',
    effect: 'perspective, focus on reaction, point of view',
    keywords: ['perspective', 'reaction', 'watching', 'observing', 'encounter', 'meeting', 'dialogue', 'rising_action'],
    promptSnippet: 'over-the-shoulder shot, establishing perspective and point of view',
  },
  worms_eye: {
    label: "Worm's Eye",
    effect: 'extreme power, monumentality, awe-inspiring scale',
    keywords: ['monumental', 'awe', 'towering', 'epic', 'grand', 'massive', 'overwhelming'],
    promptSnippet: "worm's eye view from ground level looking up, creating monumental scale",
  },
};

// ── Framing Type Definitions ─────────────────────────────────────────────────

export const FRAMING_TYPES = {
  extreme_wide: {
    label: 'Extreme Wide',
    effect: 'establish location, hook, scale of environment',
    keywords: ['establish', 'hook', 'cold_open', 'location', 'world', 'environment', 'beginning', 'opening'],
    promptSnippet: 'extreme wide shot establishing the full environment and scale',
  },
  wide: {
    label: 'Wide Shot',
    effect: 'context, setup, character in environment',
    keywords: ['setup', 'context', 'introduce', 'environment', 'everyday_scene', 'introduce_topic'],
    promptSnippet: 'wide shot showing character within their environment',
  },
  medium: {
    label: 'Medium Shot',
    effect: 'action, conversation, rising tension',
    keywords: ['action', 'rising_action', 'demonstrate', 'step_by_step', 'tutorial', 'conversation'],
    promptSnippet: 'medium shot framing character from waist up, balancing action and expression',
  },
  close_up: {
    label: 'Close-Up',
    effect: 'emotion, intensity, climax, detail',
    keywords: ['emotion', 'climax', 'turning_point', 'intense', 'fear', 'joy', 'sorrow', 'reaction'],
    promptSnippet: 'close-up shot on face/hands, capturing raw emotion and intensity',
  },
  extreme_close_up: {
    label: 'Extreme Close-Up',
    effect: 'proof, detail, revelation, visceral impact',
    keywords: ['proof', 'detail', 'reveal', 'evidence', 'product_detail', 'extreme', 'final_result'],
    promptSnippet: 'extreme close-up revealing critical detail or proof',
  },
  over_the_shoulder: {
    label: 'Over-the-Shoulder',
    effect: 'perspective, POV, relationship between characters',
    keywords: ['perspective', 'pov', 'dialogue', 'encounter', 'relationship'],
    promptSnippet: 'over-the-shoulder framing creating strong perspective and relationship',
  },
  profile: {
    label: 'Profile Shot',
    effect: 'reflection, contemplation, journey',
    keywords: ['reflection', 'contemplation', 'journey', 'thinking', 'insight', 'aftermath', 'resolve'],
    promptSnippet: 'profile shot showing character in contemplation or motion',
  },
  two_shot: {
    label: 'Two Shot',
    effect: 'relationship, comparison, conversation',
    keywords: ['relationship', 'comparison', 'together', 'pair', 'interaction', 'resolution'],
    promptSnippet: 'two-shot framing both characters together, showing relationship',
  },
};

// ── Scoring Weights ───────────────────────────────────────────────────────────

const BEAT_TYPE_ANGLE_WEIGHTS = {
  hook:             { low_angle: 2, birds_eye: 3, eye_level: 1 },
  cold_open:        { birds_eye: 3, extreme_wide: 2, low_angle: 1 },
  setup:            { eye_level: 3, high_angle: 1, wide: 2 },
  introduce_topic:  { eye_level: 3, medium: 2 },
  problem:          { high_angle: 3, dutch_angle: 2, eye_level: 1 },
  rising_action:    { low_angle: 2, over_the_shoulder: 2, medium: 1 },
  escalation:       { dutch_angle: 3, low_angle: 2, close_up: 1 },
  climax:           { low_angle: 3, dutch_angle: 2, close_up: 3 },
  turning_point:    { dutch_angle: 3, close_up: 2, low_angle: 1 },
  resolution:       { eye_level: 3, wide: 2 },
  aftermath:        { high_angle: 2, birds_eye: 2, eye_level: 1 },
  call_to_action:   { low_angle: 3, close_up: 2 },
  reflection:       { profile: 3, high_angle: 1, eye_level: 2 },
  insight:          { close_up: 2, eye_level: 2 },
  demonstrate:      { medium: 3, over_the_shoulder: 2, close_up: 1 },
  step_by_step:     { medium: 3, close_up: 2, extreme_close_up: 1 },
  conclusion:       { eye_level: 3, wide: 1 },
  proof:            { extreme_close_up: 3, close_up: 2 },
  final_result:     { wide: 2, medium: 2, low_angle: 1 },
};

const EMOTION_ANGLE_WEIGHTS = {
  // Positive/empowered
  confident:    { low_angle: 3, eye_level: 2 },
  triumphant:   { low_angle: 3, extreme_wide: 1 },
  joyful:       { eye_level: 2, close_up: 2 },
  hopeful:      { eye_level: 2, low_angle: 1 },
  excited:      { low_angle: 2, medium: 2 },
  // Negative/vulnerable
  fearful:      { high_angle: 3, dutch_angle: 2 },
  anxious:      { high_angle: 2, dutch_angle: 2, close_up: 1 },
  overwhelmed:  { high_angle: 3, birds_eye: 2 },
  sad:          { high_angle: 2, close_up: 2 },
  uncertain:    { high_angle: 2, eye_level: 1 },
  // Neutral/contemplative
  curious:      { medium: 2, eye_level: 2 },
  focused:      { close_up: 2, medium: 2 },
  determined:   { low_angle: 2, eye_level: 2, close_up: 1 },
  reflective:   { profile: 3, high_angle: 1 },
  pensive:      { profile: 2, close_up: 2 },
};

const BEAT_TYPE_FRAMING_WEIGHTS = {
  hook:             { extreme_wide: 3, close_up: 2 },
  cold_open:        { extreme_wide: 3, wide: 2 },
  setup:            { wide: 3, medium: 2 },
  introduce_topic:  { medium: 3, wide: 1 },
  problem:          { close_up: 2, medium: 2 },
  rising_action:    { medium: 3, over_the_shoulder: 2 },
  escalation:       { close_up: 3, medium: 1 },
  climax:           { close_up: 3, extreme_close_up: 2 },
  turning_point:    { close_up: 3, extreme_close_up: 1 },
  resolution:       { wide: 2, medium: 2, two_shot: 2 },
  aftermath:        { wide: 3, medium: 1 },
  call_to_action:   { close_up: 3, medium: 2 },
  reflection:       { profile: 3, medium: 1 },
  demonstrate:      { medium: 3, close_up: 2, extreme_close_up: 1 },
  step_by_step:     { close_up: 3, medium: 2, extreme_close_up: 1 },
  proof:            { extreme_close_up: 3, close_up: 2 },
  final_result:     { wide: 2, medium: 2 },
  conclusion:       { medium: 2, wide: 2, two_shot: 1 },
};

// ── Fuzzy Keyword Scoring ─────────────────────────────────────────────────────

function fuzzyScore(text, keywords) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) score += 1;
  }
  return score;
}

// ── Main Recommendation Function ──────────────────────────────────────────────

/**
 * Recommend a camera setup for a single narrative beat.
 *
 * @param {string} beatType - The narrative beat type (e.g. 'climax', 'setup')
 * @param {string} emotionalTone - The emotional tone (e.g. 'anxious but hopeful')
 * @param {string} pacingNote - Pacing description (e.g. 'quick cuts, urgent')
 * @param {string} characterEmotion - Character's specific emotion (e.g. 'fearful')
 * @returns {{ angle: string, framing: string, reasoning: string, promptSnippet: string }}
 */
export function recommendCameraSetup(beatType, emotionalTone = '', pacingNote = '', characterEmotion = '') {
  const combinedText = `${emotionalTone} ${pacingNote} ${characterEmotion}`.trim();

  // ── Score angles ──
  const angleScores = {};
  for (const [key, def] of Object.entries(CAMERA_ANGLES)) {
    let score = 0;
    // Beat type direct weights
    if (BEAT_TYPE_ANGLE_WEIGHTS[beatType]?.[key]) {
      score += BEAT_TYPE_ANGLE_WEIGHTS[beatType][key];
    }
    // Emotion keyword weights
    if (EMOTION_ANGLE_WEIGHTS[characterEmotion]?.[key]) {
      score += EMOTION_ANGLE_WEIGHTS[characterEmotion][key];
    }
    // Fuzzy text match against angle keywords
    score += fuzzyScore(combinedText, def.keywords);
    angleScores[key] = score;
  }

  // ── Score framings ──
  const framingScores = {};
  for (const [key, def] of Object.entries(FRAMING_TYPES)) {
    let score = 0;
    if (BEAT_TYPE_FRAMING_WEIGHTS[beatType]?.[key]) {
      score += BEAT_TYPE_FRAMING_WEIGHTS[beatType][key];
    }
    score += fuzzyScore(combinedText, def.keywords);
    framingScores[key] = score;
  }

  // Pick highest scoring angle and framing
  const bestAngle = Object.entries(angleScores).sort((a, b) => b[1] - a[1])[0][0];
  const bestFraming = Object.entries(framingScores).sort((a, b) => b[1] - a[1])[0][0];

  const angleDef = CAMERA_ANGLES[bestAngle];
  const framingDef = FRAMING_TYPES[bestFraming];

  const reasoning = `${framingDef.label} ${angleDef.label} — ${framingDef.effect}; conveys ${angleDef.effect}`;
  const promptSnippet = `${framingDef.promptSnippet}, ${angleDef.promptSnippet}`;

  return {
    angle: bestAngle,
    framing: bestFraming,
    angleLabel: angleDef.label,
    framingLabel: framingDef.label,
    reasoning,
    promptSnippet,
  };
}

/**
 * Build camera recommendations for all narrative beats.
 * Called once per storyboard generation, before the Visual Director prompt.
 *
 * @param {Array} narrativeBeats - Stage 1 output beats
 * @returns {Array} Same beats annotated with { cameraRec }
 */
export function buildCameraRecommendations(narrativeBeats) {
  return narrativeBeats.map(beat => ({
    ...beat,
    cameraRec: recommendCameraSetup(
      beat.beatType,
      beat.emotionalTone,
      beat.pacingNote,
      beat.characterEmotion,
    ),
  }));
}
