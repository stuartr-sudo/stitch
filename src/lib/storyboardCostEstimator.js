/**
 * Storyboard Production Cost & Time Estimator
 * Model-aware pricing based on actual provider costs.
 */

// Approximate cost per video clip by model (USD)
const VIDEO_COSTS = {
  'veo3-fast': 0.25,
  'veo3-lite': 0.15,
  'veo3': 0.35,
  'veo3-first-last': 0.35,
  'veo3-lite-first-last': 0.20,
  'kling-video': 0.20,
  'kling-r2v-pro': 0.40,
  'kling-r2v-standard': 0.25,
  'kling-o3-pro': 0.35,
  'pixverse-v6': 0.15,
  'seedance-pro': 0.25,
  'grok-imagine': 0.20,
  'grok-r2v': 0.30,
  'wavespeed-wan': 0.10,
  'hailuo': 0.20,
  'wan-pro': 0.15,
};

// Approximate generation time per frame in minutes
const TIME_PER_FRAME = {
  'veo3-fast': 0.5,
  'veo3-lite': 0.4,
  'veo3': 0.8,
  'veo3-first-last': 0.7,
  'veo3-lite-first-last': 0.5,
  'kling-video': 0.6,
  'kling-r2v-pro': 0.8,
  'kling-r2v-standard': 0.6,
  'kling-o3-pro': 0.8,
  'pixverse-v6': 0.5,
  'seedance-pro': 0.7,
  'grok-imagine': 0.5,
  'grok-r2v': 0.6,
  'wavespeed-wan': 0.3,
  'hailuo': 0.5,
  'wan-pro': 0.4,
};

const TTS_COST_PER_FRAME = 0.03;
const LIPSYNC_COST_PER_FRAME = 0.10;
const MUSIC_COST = 0.05;
const ASSEMBLY_COST = 0.02;
const CAPTION_COST = 0.05;

export function estimateProductionCost(frames, storyboard) {
  if (!frames?.length) return { video: 0, tts: 0, lipsync: 0, music: 0, assembly: 0, captions: 0, total: 0 };

  const model = storyboard?.global_model || 'veo3-fast';
  const videoCostPerFrame = VIDEO_COSTS[model] || 0.25;
  const dialogueFrames = frames.filter(f => f.dialogue?.trim()).length;
  const hasLipsync = storyboard?.lipsync_model && storyboard.lipsync_model !== 'none';
  const hasMusic = !!storyboard?.music_mood?.trim();
  const hasCaptions = storyboard?.caption_style && storyboard.caption_style !== 'none';

  const video = frames.length * videoCostPerFrame;
  const tts = dialogueFrames * TTS_COST_PER_FRAME;
  const lipsync = hasLipsync ? dialogueFrames * LIPSYNC_COST_PER_FRAME : 0;
  const music = hasMusic ? MUSIC_COST : 0;
  const assembly = ASSEMBLY_COST;
  const captions = hasCaptions ? CAPTION_COST : 0;

  return {
    video,
    tts,
    lipsync,
    music,
    assembly,
    captions,
    total: video + tts + lipsync + music + assembly + captions,
  };
}

export function estimateProductionTime(frames, storyboard) {
  if (!frames?.length) return 0;
  const model = storyboard?.global_model || 'veo3-fast';
  const minutesPerFrame = TIME_PER_FRAME[model] || 0.6;
  return Math.ceil(frames.length * minutesPerFrame) + 2; // +2 for TTS + assembly overhead
}
