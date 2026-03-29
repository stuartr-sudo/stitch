/**
 * Storyboard Model Prompt Templates
 *
 * Each video generation model has different prompt sensitivities:
 * - Veo 3.1 wants naturalistic scene descriptions, no @Element, no AVOID:
 * - Kling O3 R2V needs @Element1 references woven into action descriptions
 * - Grok R2V works with natural character descriptions + reference_image_urls
 * - I2V models just need a good scene + motion description
 *
 * This file defines per-model prompt architecture so the Visual Director
 * (Stage 2) can produce prompts that speak each model's language.
 */

// ── Model Prompt Architectures ──────────────────────────────────────────────

export const MODEL_TEMPLATES = {

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCE-TO-VIDEO (R2V) MODELS
  // ═══════════════════════════════════════════════════════════════════════════

  'veo3': {
    family: 'veo',
    mode: 'reference-to-video',
    label: 'Veo 3.1 (Reference)',
    promptLength: { min: 150, target: 220, max: 300 },
    supportsNegativePrompt: false, // Veo R2V has NO negative_prompt field
    characterRefStyle: 'natural', // Describe characters naturally, refs passed as image_urls

    // Veo 3.1 prompt structure — what works best empirically
    promptStructure: [
      'scene_description',    // Open with the scene: where, when, atmosphere
      'character_action',     // What the character is doing (natural language, no @Element)
      'character_detail',     // Character appearance details (from reference description)
      'camera_and_motion',    // Camera movement and framing
      'lighting_and_mood',    // Lighting quality, color temperature, atmosphere
      'style_direction',      // Art style / visual aesthetic
    ],

    // Words/phrases Veo responds well to
    effectiveVocabulary: {
      camera: ['slow pan', 'tracking shot', 'dolly in', 'steadicam follow', 'crane shot', 'aerial view', 'close-up', 'wide establishing shot', 'rack focus', 'shallow depth of field'],
      lighting: ['golden hour light', 'soft diffused light', 'dramatic side light', 'backlit silhouette', 'warm ambient light', 'cool blue tones', 'dappled sunlight through trees', 'overcast flat light'],
      motion: ['gentle movement', 'slow deliberate motion', 'energetic action', 'fluid movement', 'subtle gestures'],
      atmosphere: ['cinematic', 'ethereal', 'grounded', 'intimate', 'expansive', 'serene', 'vibrant', 'moody'],
    },

    // Things that trigger Veo content policy rejections
    contentPolicyAvoid: [
      'Pixar', 'Disney', 'DreamWorks', 'Cocomelon', 'Studio Ghibli', 'Ghibli',
      'Nickelodeon', 'Cartoon Network', 'PBS Kids', 'Nick Jr',
      'Sarah and Duck', 'Bluey', 'Peppa Pig', 'Paw Patrol',
      'Nintendo', 'Pokémon', 'Pokemon', 'Marvel', 'DC Comics',
      'AVOID:', // Veo interprets this as a prompt, not a filter
      '@Element', // Kling-only syntax, confuses Veo
    ],

    buildPrompt: (components) => {
      const parts = [];

      // Scene + atmosphere first
      if (components.scene) parts.push(components.scene);
      if (components.characterAction) parts.push(components.characterAction);
      if (components.characterDetail) parts.push(components.characterDetail);

      // Camera and motion
      if (components.camera) parts.push(components.camera);

      // Style and lighting woven in
      if (components.lighting) parts.push(components.lighting);
      if (components.style) parts.push(components.style);
      if (components.motionStyle) parts.push(components.motionStyle);

      return parts.join('. ').replace(/\.\./g, '.').trim();
    },
  },

  'veo3-fast': {
    family: 'veo',
    mode: 'image-to-video',
    label: 'Veo 3.1 Fast',
    promptLength: { min: 100, target: 180, max: 250 },
    supportsNegativePrompt: true, // Veo Fast HAS negative_prompt
    characterRefStyle: 'none', // I2V — no character refs, animate the start frame

    promptStructure: [
      'action_from_start_frame', // What should happen to/in the start image
      'character_motion',         // How the character moves
      'camera_motion',            // How the camera moves
      'lighting_atmosphere',      // Lighting and mood
      'style',                    // Visual style
    ],

    effectiveVocabulary: {
      camera: ['slow pan', 'tracking shot', 'dolly in', 'steadicam', 'crane shot', 'close-up', 'wide shot'],
      lighting: ['golden hour', 'soft light', 'dramatic light', 'warm tones', 'cool tones'],
      motion: ['gentle movement', 'slow motion', 'energetic', 'fluid', 'subtle'],
      atmosphere: ['cinematic', 'serene', 'vibrant', 'moody', 'ethereal'],
    },

    contentPolicyAvoid: [
      'Pixar', 'Disney', 'DreamWorks', 'Cocomelon', 'Studio Ghibli', 'Ghibli',
      'AVOID:', '@Element',
    ],

    buildPrompt: (components) => {
      const parts = [];
      if (components.actionFromFrame) parts.push(components.actionFromFrame);
      if (components.characterAction) parts.push(components.characterAction);
      if (components.camera) parts.push(components.camera);
      if (components.lighting) parts.push(components.lighting);
      if (components.style) parts.push(components.style);
      if (components.motionStyle) parts.push(components.motionStyle);
      return parts.join('. ').replace(/\.\./g, '.').trim();
    },
  },

  'kling-r2v-pro': {
    family: 'kling',
    mode: 'reference-to-video',
    label: 'Kling O3 Pro (R2V)',
    promptLength: { min: 80, target: 150, max: 200 },
    supportsNegativePrompt: true,
    characterRefStyle: 'element', // Uses @Element1, @Element2, etc.

    // Kling R2V prompt structure — @Element MUST appear early
    promptStructure: [
      'element_action',     // "@Element1 walks along..." — element reference + action FIRST
      'scene_context',      // Environment context
      'camera_direction',   // Camera movement
      'lighting',           // Lighting (brief — Kling is less sensitive to lighting language)
    ],

    effectiveVocabulary: {
      camera: ['static shot', 'slow pan left', 'slow pan right', 'tracking follow', 'dolly in', 'dolly out', 'orbit around', 'low angle', 'high angle', 'close up', 'wide shot'],
      lighting: ['natural light', 'warm light', 'cool light', 'dramatic shadows', 'bright daylight', 'golden hour', 'soft diffused light'],
      motion: ['walks', 'runs', 'turns', 'looks', 'reaches', 'picks up', 'puts down', 'gestures', 'nods', 'smiles', 'waves'],
      atmosphere: ['cinematic', 'realistic', 'dramatic', 'cheerful', 'moody'],
    },

    contentPolicyAvoid: [],

    buildPrompt: (components) => {
      const parts = [];
      // Element references MUST come first for Kling R2V
      if (components.elementAction) parts.push(components.elementAction);
      if (components.scene) parts.push(components.scene);
      if (components.camera) parts.push(components.camera);
      if (components.lighting) parts.push(components.lighting);
      if (components.style) parts.push(components.style);
      if (components.motionStyle) parts.push(components.motionStyle);
      return parts.join('. ').replace(/\.\./g, '.').trim();
    },
  },

  'kling-r2v-standard': {
    family: 'kling',
    mode: 'reference-to-video',
    label: 'Kling O3 Standard (R2V)',
    // Inherits from kling-r2v-pro
    promptLength: { min: 80, target: 150, max: 200 },
    supportsNegativePrompt: true,
    characterRefStyle: 'element',
    promptStructure: ['element_action', 'scene_context', 'camera_direction', 'lighting'],
    effectiveVocabulary: {
      camera: ['static shot', 'slow pan', 'tracking follow', 'dolly in', 'dolly out', 'orbit', 'low angle', 'high angle'],
      lighting: ['natural light', 'warm light', 'cool light', 'dramatic shadows', 'bright daylight'],
      motion: ['walks', 'runs', 'turns', 'looks', 'reaches', 'gestures', 'nods', 'smiles'],
      atmosphere: ['cinematic', 'realistic', 'dramatic', 'cheerful'],
    },
    contentPolicyAvoid: [],
    buildPrompt: (components) => MODEL_TEMPLATES['kling-r2v-pro'].buildPrompt(components),
  },

  'grok-r2v': {
    family: 'grok',
    mode: 'reference-to-video',
    label: 'Grok Imagine R2V',
    promptLength: { min: 100, target: 180, max: 250 },
    supportsNegativePrompt: false, // Grok R2V doesn't support negative_prompt
    characterRefStyle: 'natural', // Uses reference_image_urls, natural descriptions

    promptStructure: [
      'scene_and_character', // Describe scene with character naturally
      'action_detail',       // Specific character actions
      'camera',              // Camera direction
      'style_and_mood',      // Visual style and atmosphere
    ],

    effectiveVocabulary: {
      camera: ['pan', 'tracking', 'dolly', 'static', 'orbit', 'close-up', 'wide'],
      lighting: ['natural', 'warm', 'cool', 'dramatic', 'soft', 'golden hour'],
      motion: ['moving', 'walking', 'running', 'gesturing', 'interacting'],
      atmosphere: ['cinematic', 'vibrant', 'moody', 'bright', 'atmospheric'],
    },

    contentPolicyAvoid: [],

    buildPrompt: (components) => {
      const parts = [];
      if (components.scene) parts.push(components.scene);
      if (components.characterAction) parts.push(components.characterAction);
      if (components.camera) parts.push(components.camera);
      if (components.lighting) parts.push(components.lighting);
      if (components.style) parts.push(components.style);
      if (components.motionStyle) parts.push(components.motionStyle);
      return parts.join('. ').replace(/\.\./g, '.').trim();
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IMAGE-TO-VIDEO (I2V) MODELS
  // ═══════════════════════════════════════════════════════════════════════════

  'seedance-pro': {
    family: 'seedance',
    mode: 'image-to-video',
    label: 'Seedance 1.5 Pro',
    promptLength: { min: 80, target: 150, max: 200 },
    supportsNegativePrompt: false,
    characterRefStyle: 'none',
    promptStructure: ['action_from_start_frame', 'camera_motion', 'lighting', 'style'],
    effectiveVocabulary: {
      camera: ['pan', 'tracking', 'dolly', 'static', 'orbit', 'close-up', 'wide'],
      lighting: ['natural', 'warm', 'cool', 'dramatic', 'soft'],
      motion: ['gentle', 'smooth', 'energetic', 'slow', 'dynamic'],
      atmosphere: ['cinematic', 'vibrant', 'moody', 'serene'],
    },
    contentPolicyAvoid: [],
    buildPrompt: (components) => {
      const parts = [];
      if (components.actionFromFrame) parts.push(components.actionFromFrame);
      if (components.characterAction) parts.push(components.characterAction);
      if (components.camera) parts.push(components.camera);
      if (components.lighting) parts.push(components.lighting);
      if (components.style) parts.push(components.style);
      if (components.motionStyle) parts.push(components.motionStyle);
      return parts.join('. ').replace(/\.\./g, '.').trim();
    },
  },

  'kling-video': {
    family: 'kling',
    mode: 'image-to-video',
    label: 'Kling 2.5 Turbo Pro',
    promptLength: { min: 60, target: 120, max: 180 },
    supportsNegativePrompt: true,
    characterRefStyle: 'none',
    promptStructure: ['action_from_start_frame', 'camera_motion', 'lighting'],
    effectiveVocabulary: {
      camera: ['static', 'slow pan', 'tracking', 'dolly in', 'dolly out', 'orbit'],
      lighting: ['natural light', 'warm', 'cool', 'dramatic', 'soft'],
      motion: ['walks', 'runs', 'turns', 'looks', 'gestures'],
      atmosphere: ['cinematic', 'realistic', 'dramatic'],
    },
    contentPolicyAvoid: [],
    buildPrompt: (components) => {
      const parts = [];
      if (components.actionFromFrame) parts.push(components.actionFromFrame);
      if (components.characterAction) parts.push(components.characterAction);
      if (components.camera) parts.push(components.camera);
      if (components.lighting) parts.push(components.lighting);
      if (components.style) parts.push(components.style);
      return parts.join('. ').replace(/\.\./g, '.').trim();
    },
  },

  'grok-imagine': {
    family: 'grok',
    mode: 'image-to-video',
    label: 'Grok Imagine',
    promptLength: { min: 80, target: 150, max: 200 },
    supportsNegativePrompt: false,
    characterRefStyle: 'none',
    promptStructure: ['action_from_start_frame', 'camera_motion', 'lighting', 'style'],
    effectiveVocabulary: {
      camera: ['pan', 'tracking', 'dolly', 'static', 'orbit', 'close-up', 'wide'],
      lighting: ['natural', 'warm', 'cool', 'dramatic', 'soft', 'golden hour'],
      motion: ['moving', 'walking', 'running', 'gesturing', 'interacting'],
      atmosphere: ['cinematic', 'vibrant', 'moody', 'bright'],
    },
    contentPolicyAvoid: [],
    buildPrompt: (components) => {
      const parts = [];
      if (components.actionFromFrame) parts.push(components.actionFromFrame);
      if (components.characterAction) parts.push(components.characterAction);
      if (components.camera) parts.push(components.camera);
      if (components.lighting) parts.push(components.lighting);
      if (components.style) parts.push(components.style);
      if (components.motionStyle) parts.push(components.motionStyle);
      return parts.join('. ').replace(/\.\./g, '.').trim();
    },
  },

  'wavespeed-wan': {
    family: 'wavespeed',
    mode: 'image-to-video',
    label: 'Wavespeed WAN 2.2',
    promptLength: { min: 50, target: 100, max: 150 },
    supportsNegativePrompt: false,
    characterRefStyle: 'none',
    promptStructure: ['action_from_start_frame', 'camera_motion'],
    effectiveVocabulary: {
      camera: ['pan', 'tracking', 'static', 'dolly'],
      lighting: ['natural', 'warm', 'cool'],
      motion: ['gentle', 'smooth', 'energetic'],
      atmosphere: ['cinematic', 'vibrant'],
    },
    contentPolicyAvoid: [],
    buildPrompt: (components) => {
      const parts = [];
      if (components.actionFromFrame) parts.push(components.actionFromFrame);
      if (components.characterAction) parts.push(components.characterAction);
      if (components.camera) parts.push(components.camera);
      if (components.style) parts.push(components.style);
      return parts.join('. ').replace(/\.\./g, '.').trim();
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST-LAST-FRAME
  // ═══════════════════════════════════════════════════════════════════════════

  'veo3-first-last': {
    family: 'veo',
    mode: 'first-last-frame',
    label: 'Veo 3.1 First-Last Frame',
    promptLength: { min: 80, target: 150, max: 200 },
    supportsNegativePrompt: true,
    characterRefStyle: 'none',
    promptStructure: ['transition_description', 'camera_motion', 'style'],
    effectiveVocabulary: {
      camera: ['slow pan', 'tracking', 'dolly', 'steadicam', 'crane'],
      lighting: ['golden hour', 'soft light', 'dramatic', 'warm', 'cool'],
      motion: ['smooth transition', 'gradual change', 'flowing movement'],
      atmosphere: ['cinematic', 'ethereal', 'serene', 'dramatic'],
    },
    contentPolicyAvoid: ['Pixar', 'Disney', 'DreamWorks', 'AVOID:', '@Element'],
    buildPrompt: (components) => {
      const parts = [];
      if (components.transitionDescription) parts.push(components.transitionDescription);
      if (components.camera) parts.push(components.camera);
      if (components.lighting) parts.push(components.lighting);
      if (components.style) parts.push(components.style);
      return parts.join('. ').replace(/\.\./g, '.').trim();
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIDEO-TO-VIDEO (V2V) MODELS
  // ═══════════════════════════════════════════════════════════════════════════

  'kling-o3-v2v-pro': {
    family: 'kling',
    mode: 'video-to-video',
    label: 'Kling O3 Pro V2V',
    promptLength: { min: 40, target: 80, max: 120 },
    supportsNegativePrompt: true,
    characterRefStyle: 'none',
    promptStructure: ['refinement_direction', 'style'],
    effectiveVocabulary: {
      camera: ['maintain framing', 'same angle'],
      lighting: ['enhance lighting', 'warm up', 'cool down'],
      motion: ['smoother motion', 'more fluid', 'sharper details'],
      atmosphere: ['more cinematic', 'higher quality'],
    },
    contentPolicyAvoid: [],
    buildPrompt: (components) => {
      const parts = [];
      if (components.refinementDirection) parts.push(components.refinementDirection);
      if (components.style) parts.push(components.style);
      return parts.join('. ').replace(/\.\./g, '.').trim();
    },
  },

  'kling-o3-v2v-standard': {
    family: 'kling',
    mode: 'video-to-video',
    label: 'Kling O3 Standard V2V',
    promptLength: { min: 40, target: 80, max: 120 },
    supportsNegativePrompt: true,
    characterRefStyle: 'none',
    promptStructure: ['refinement_direction', 'style'],
    effectiveVocabulary: {
      camera: ['maintain framing'],
      lighting: ['enhance lighting'],
      motion: ['smoother motion', 'sharper details'],
      atmosphere: ['more cinematic'],
    },
    contentPolicyAvoid: [],
    buildPrompt: (components) => MODEL_TEMPLATES['kling-o3-v2v-pro'].buildPrompt(components),
  },
};

// ── Helper Functions ────────────────────────────────────────────────────────

export function getModelTemplate(modelId) {
  return MODEL_TEMPLATES[modelId] || MODEL_TEMPLATES['veo3-fast']; // safe fallback
}

export function getModelFamily(modelId) {
  return MODEL_TEMPLATES[modelId]?.family || 'unknown';
}

export function isR2VModel(modelId) {
  return MODEL_TEMPLATES[modelId]?.mode === 'reference-to-video';
}

export function isI2VModel(modelId) {
  return MODEL_TEMPLATES[modelId]?.mode === 'image-to-video';
}

export function usesElementSyntax(modelId) {
  return MODEL_TEMPLATES[modelId]?.characterRefStyle === 'element';
}

/**
 * Strip content policy violations from a prompt based on model-specific rules.
 * Call this AFTER the Visual Director produces the prompt, before sending to API.
 */
export function sanitizePromptForModel(prompt, modelId) {
  const template = getModelTemplate(modelId);
  if (!template.contentPolicyAvoid?.length) return prompt;

  let clean = prompt;
  for (const term of template.contentPolicyAvoid) {
    // Use word boundary for short terms, simple replace for phrases
    if (term.length <= 5) {
      clean = clean.replace(new RegExp(`\\b${term}\\b`, 'gi'), '');
    } else {
      clean = clean.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    }
  }

  // Clean up orphaned grammar from stripping
  clean = clean
    .replace(/\b(inspired by|style of|like|similar to|reminiscent of)\s+(and\s*,?\s*|,\s*and\s*,?\s*)/gi, '$1 ')
    .replace(/,\s*,/g, ',')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return clean;
}

/**
 * Build the standard negative prompt for a model.
 * Returns null if the model doesn't support negative prompts.
 */
export function buildNegativePrompt(modelId, userNegativePrompt = '') {
  const template = getModelTemplate(modelId);
  if (!template.supportsNegativePrompt) return null;

  const standard = 'blur, blurry, out of focus, distorted, deformed, disfigured, low quality, low resolution, pixelated, text, words, watermark, logo, letterbox, black bars, ugly, amateur, draft quality, artifacts, noise';

  if (!userNegativePrompt) return standard;
  return `${standard}, ${userNegativePrompt}`;
}
