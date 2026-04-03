/**
 * Camera Control Presets & Vocabulary
 *
 * Structured camera control system for per-scene camera direction.
 * Used by CameraControlPanel component and buildCameraPrompt() on the backend.
 *
 * Three layers:
 *   1. Individual selections (movement, speed, angle, framing)
 *   2. Quick presets that combine all four
 *   3. buildCameraPromptClient() for preview text (backend has the authoritative version)
 */

// ── Camera Movements ─────────────────────────────────────────────────────────

export const CAMERA_MOVEMENTS = [
  { value: 'static', label: 'Static', prompt: 'locked-off static camera, no movement' },
  { value: 'pan_left', label: 'Pan Left', prompt: 'smooth pan from right to left' },
  { value: 'pan_right', label: 'Pan Right', prompt: 'smooth pan from left to right' },
  { value: 'tilt_up', label: 'Tilt Up', prompt: 'smooth upward tilt revealing the scene above' },
  { value: 'tilt_down', label: 'Tilt Down', prompt: 'smooth downward tilt revealing the scene below' },
  { value: 'dolly_in', label: 'Dolly In', prompt: 'dolly push forward toward the subject' },
  { value: 'dolly_out', label: 'Dolly Out', prompt: 'dolly pull backward away from the subject' },
  { value: 'orbit_left', label: 'Orbit Left', prompt: 'orbiting arc movement circling left around the subject' },
  { value: 'orbit_right', label: 'Orbit Right', prompt: 'orbiting arc movement circling right around the subject' },
  { value: 'tracking', label: 'Tracking', prompt: 'tracking shot following the subject laterally' },
  { value: 'crane_up', label: 'Crane Up', prompt: 'crane shot rising upward with parallax' },
  { value: 'crane_down', label: 'Crane Down', prompt: 'crane shot descending downward with parallax' },
  { value: 'zoom_in', label: 'Zoom In', prompt: 'slow lens zoom pushing in on the subject' },
  { value: 'zoom_out', label: 'Zoom Out', prompt: 'slow lens zoom pulling out to reveal the scene' },
  { value: 'handheld', label: 'Handheld', prompt: 'handheld camera with natural organic sway' },
  { value: 'whip_pan', label: 'Whip Pan', prompt: 'fast whip pan with motion blur' },
];

// ── Movement Speeds ──────────────────────────────────────────────────────────

export const CAMERA_SPEEDS = [
  { value: 'very_slow', label: 'Very Slow', modifier: 'glacially slow, barely perceptible' },
  { value: 'slow', label: 'Slow', modifier: 'gentle and deliberate' },
  { value: 'medium', label: 'Medium', modifier: 'smooth and steady' },
  { value: 'fast', label: 'Fast', modifier: 'swift and dynamic' },
];

// ── Camera Angles ────────────────────────────────────────────────────────────

export const CAMERA_ANGLES = [
  { value: 'eye_level', label: 'Eye Level', prompt: 'eye-level perspective, neutral and intimate' },
  { value: 'low_angle', label: 'Low Angle', prompt: 'low-angle shot looking up, conveying power and scale' },
  { value: 'high_angle', label: 'High Angle', prompt: 'high-angle shot looking down, emphasizing vulnerability' },
  { value: 'dutch', label: 'Dutch Angle', prompt: 'tilted Dutch angle creating tension and unease' },
  { value: 'birds_eye', label: "Bird's Eye", prompt: 'overhead bird\'s eye view from directly above' },
  { value: 'worms_eye', label: "Worm's Eye", prompt: 'worm\'s eye view from ground level looking up, monumental scale' },
];

// ── Framing ──────────────────────────────────────────────────────────────────

export const CAMERA_FRAMINGS = [
  { value: 'extreme_wide', label: 'Extreme Wide', prompt: 'extreme wide shot establishing full environment' },
  { value: 'wide', label: 'Wide', prompt: 'wide shot showing subject in environment' },
  { value: 'medium', label: 'Medium', prompt: 'medium shot from waist up' },
  { value: 'close_up', label: 'Close-Up', prompt: 'close-up shot capturing detail and emotion' },
  { value: 'extreme_close_up', label: 'Extreme Close-Up', prompt: 'extreme close-up on specific detail' },
];

// ── Quick Presets ─────────────────────────────────────────────────────────────

export const CAMERA_PRESETS = [
  {
    key: 'hero_reveal',
    label: 'Hero Reveal',
    description: 'Slow push-in from low angle, building power',
    config: { movement: 'dolly_in', speed: 'slow', angle: 'low_angle', framing: 'medium' },
  },
  {
    key: 'establishing',
    label: 'Establishing Pan',
    description: 'Wide pan revealing the full scene',
    config: { movement: 'pan_right', speed: 'medium', angle: 'eye_level', framing: 'wide' },
  },
  {
    key: 'dramatic_zoom',
    label: 'Dramatic Zoom',
    description: 'Fast zoom into extreme close-up',
    config: { movement: 'zoom_in', speed: 'fast', angle: 'eye_level', framing: 'extreme_close_up' },
  },
  {
    key: 'surveillance',
    label: 'Surveillance',
    description: 'Static high-angle wide shot',
    config: { movement: 'static', speed: 'medium', angle: 'high_angle', framing: 'wide' },
  },
  {
    key: 'intimate',
    label: 'Intimate',
    description: 'Very slow push-in, eye level close-up',
    config: { movement: 'dolly_in', speed: 'very_slow', angle: 'eye_level', framing: 'close_up' },
  },
  {
    key: 'orbit_reveal',
    label: 'Orbit Reveal',
    description: 'Smooth orbit around subject revealing depth',
    config: { movement: 'orbit_right', speed: 'slow', angle: 'eye_level', framing: 'medium' },
  },
  {
    key: 'crane_epic',
    label: 'Epic Crane',
    description: 'Rising crane from close to wide',
    config: { movement: 'crane_up', speed: 'slow', angle: 'low_angle', framing: 'wide' },
  },
  {
    key: 'documentary',
    label: 'Documentary',
    description: 'Handheld medium shot, natural feel',
    config: { movement: 'handheld', speed: 'medium', angle: 'eye_level', framing: 'medium' },
  },
  {
    key: 'god_view',
    label: 'God View',
    description: "Slow overhead bird's eye, extreme wide",
    config: { movement: 'static', speed: 'very_slow', angle: 'birds_eye', framing: 'extreme_wide' },
  },
  {
    key: 'tracking_chase',
    label: 'Tracking Chase',
    description: 'Fast tracking shot following action',
    config: { movement: 'tracking', speed: 'fast', angle: 'eye_level', framing: 'medium' },
  },
  {
    key: 'tension_dutch',
    label: 'Tension',
    description: 'Dutch angle slow push-in, close-up',
    config: { movement: 'dolly_in', speed: 'slow', angle: 'dutch', framing: 'close_up' },
  },
  {
    key: 'pullback_reveal',
    label: 'Pullback Reveal',
    description: 'Dolly out from close to wide, revealing context',
    config: { movement: 'dolly_out', speed: 'medium', angle: 'eye_level', framing: 'wide' },
  },
  {
    key: 'whip_transition',
    label: 'Whip Transition',
    description: 'Fast whip pan for high-energy transitions',
    config: { movement: 'whip_pan', speed: 'fast', angle: 'eye_level', framing: 'medium' },
  },
  {
    key: 'descending',
    label: 'Descending',
    description: 'Slow crane down from above, narrowing to subject',
    config: { movement: 'crane_down', speed: 'slow', angle: 'high_angle', framing: 'close_up' },
  },
  {
    key: 'tilt_reveal',
    label: 'Tilt Reveal',
    description: 'Slow tilt up revealing scale and grandeur',
    config: { movement: 'tilt_up', speed: 'slow', angle: 'low_angle', framing: 'extreme_wide' },
  },
  {
    key: 'detail_inspect',
    label: 'Detail Inspect',
    description: 'Very slow zoom into extreme detail',
    config: { movement: 'zoom_in', speed: 'very_slow', angle: 'eye_level', framing: 'extreme_close_up' },
  },
];

// ── Client-side prompt preview builder ───────────────────────────────────────

/**
 * Build a human-readable camera prompt from structured config.
 * This is a preview — the backend buildCameraPrompt() is authoritative.
 */
export function buildCameraPromptPreview(config) {
  if (!config) return '';
  if (config.customMotion) return config.customMotion;

  const movement = CAMERA_MOVEMENTS.find(m => m.value === config.movement);
  const speed = CAMERA_SPEEDS.find(s => s.value === config.speed);
  const angle = CAMERA_ANGLES.find(a => a.value === config.angle);
  const framing = CAMERA_FRAMINGS.find(f => f.value === config.framing);

  const parts = [];
  if (speed && movement && movement.value !== 'static') {
    parts.push(`${speed.label} ${movement.prompt}`);
  } else if (movement) {
    parts.push(movement.prompt);
  }
  if (angle) parts.push(angle.prompt);
  if (framing) parts.push(framing.prompt);

  return parts.join(', ');
}
