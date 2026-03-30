/**
 * Storyboard Narrative Generator — Stage 1 of 2
 *
 * Takes the user's story concept, mood, brand rules, and creative direction
 * and produces a structured narrative arc with per-scene beats.
 *
 * This is the CHEAP stage (~$0.01) — no images, no video. Just story structure.
 * The output feeds into Stage 2 (Visual Director) which produces model-specific
 * video generation prompts.
 *
 * Architecture:
 *   User inputs → Stage 1 (this) → narrative beats
 *   Narrative beats + style/model → Stage 2 (visualDirector) → video gen prompts
 *
 * Replaces: the monolithic system prompt in generate-scenes.js that tried to do
 * narrative + visual + model-awareness all in one pass.
 */

import { z } from 'zod';

// ── Narrative Arc Templates ──────────────────────────────────────────────────

const NARRATIVE_ARCS = {
  educational: {
    label: 'Educational',
    beats: ['introduce_topic', 'demonstrate', 'reinforce', 'apply', 'conclude'],
    description: 'Teach a concept: introduce → show how → reinforce → apply → wrap up',
    pacing: 'steady',
    emotionalCurve: ['curious', 'engaged', 'understanding', 'confident', 'satisfied'],
  },
  entertaining: {
    label: 'Entertaining / Story',
    beats: ['hook', 'setup', 'rising_action', 'climax', 'resolution'],
    description: 'Classic story arc: hook the viewer → build tension → peak moment → resolve',
    pacing: 'dynamic',
    emotionalCurve: ['intrigued', 'invested', 'tense', 'thrilled', 'satisfied'],
  },
  dramatic: {
    label: 'Dramatic',
    beats: ['cold_open', 'context', 'escalation', 'turning_point', 'aftermath', 'reflection'],
    description: 'High-stakes drama: cold open → context → escalate → turning point → aftermath',
    pacing: 'slow_build',
    emotionalCurve: ['shocked', 'concerned', 'anxious', 'devastated', 'hopeful', 'reflective'],
  },
  documentary: {
    label: 'Documentary',
    beats: ['establish', 'explore', 'evidence', 'perspective', 'insight', 'conclusion'],
    description: 'Explore a subject: establish → examine → evidence → perspectives → conclude',
    pacing: 'measured',
    emotionalCurve: ['curious', 'interested', 'impressed', 'thoughtful', 'informed', 'inspired'],
  },
  advertisement: {
    label: 'Advertisement / Promo',
    beats: ['attention', 'problem', 'solution', 'proof', 'call_to_action'],
    description: 'Sell or promote: grab attention → show the problem → present solution → prove it → CTA',
    pacing: 'punchy',
    emotionalCurve: ['surprised', 'frustrated', 'relieved', 'convinced', 'motivated'],
  },
  tutorial: {
    label: 'Tutorial / How-To',
    beats: ['preview_result', 'setup', 'step_by_step', 'tips', 'final_result'],
    description: 'Show how to do something: preview the result → setup → steps → tips → final',
    pacing: 'methodical',
    emotionalCurve: ['excited', 'prepared', 'focused', 'confident', 'proud'],
  },
  safety: {
    label: 'Safety / PSA',
    beats: ['everyday_scene', 'danger_moment', 'safe_behavior', 'positive_outcome', 'reminder'],
    description: 'Safety education: normal day → danger appears → right action → good outcome → remember',
    pacing: 'deliberate',
    emotionalCurve: ['relaxed', 'alert', 'attentive', 'relieved', 'empowered'],
  },
};

// ── Zod Schemas ─────────────────────────────────────────────────────────────

const NarrativeBeatSchema = z.object({
  sceneNumber: z.number(),
  beatType: z.string().describe('The narrative function of this scene (e.g., hook, rising_action, climax)'),
  narrativeMoment: z.string().describe('What happens story-wise in 1-2 sentences'),
  setting: z.string().describe('Where this scene takes place — specific location and time of day'),
  characterAction: z.string().describe('What the character(s) are physically doing'),
  characterEmotion: z.string().describe('The character\'s emotional state and expression'),
  emotionalTone: z.string().describe('The emotional tone the VIEWER should feel'),
  pacingNote: z.string().describe('Pacing instruction: slow/building/fast/pause/climactic'),
  dialogue: z.string().nullable().describe('What is said in this scene (narration or character speech). Null if no dialogue.'),
  durationSeconds: z.number().describe('Scene duration in seconds'),
  transitionNote: z.string().describe('How this scene connects to the next one visually and narratively'),
});

const NarrativeArcSchema = z.object({
  title: z.string().max(100),
  narrativeStyle: z.string().describe('The narrative arc style used'),
  logline: z.string().max(200).describe('One-sentence summary of the entire story'),
  beats: z.array(NarrativeBeatSchema),
  overallEmotionalArc: z.string().describe('How the emotional tone progresses across the full sequence'),
});

export { NarrativeArcSchema, NarrativeBeatSchema, NARRATIVE_ARCS };

// ── System Prompt Builder ───────────────────────────────────────────────────

/**
 * Build the Stage 1 system prompt.
 * This prompt focuses ONLY on narrative — no visual style, no model details,
 * no prompt engineering for image/video generators. Those are Stage 2's job.
 */
export function buildNarrativeSystemPrompt(inputs) {
  const {
    storyOverview,
    storyboardName,
    overallMood,
    narrativeStyle = 'entertaining',
    targetAudience,
    desiredLength,
    targetSceneCount,
    durationConstraints,
    sceneDirection,
    locationDescription,
    brandStyleGuide,
    clientBrief,
    hasDialogue,
    storyBeats, // user-provided story beats from conversational builder
  } = inputs;

  const arc = NARRATIVE_ARCS[narrativeStyle] || NARRATIVE_ARCS.entertaining;

  const sections = [];

  // ── Role ──
  sections.push(`You are an expert narrative director for short-form video. Your job is to take a story concept and decompose it into a structured sequence of narrative beats — each one a single, filmable moment that advances the story.

You are NOT writing video generation prompts. You are NOT describing visual styles, lighting, or camera angles. You are writing the STORY — what happens, what the characters do, how the audience feels. The visual details will be added in a separate stage.`);

  // ── Story Context ──
  sections.push(`STORY:
Title: ${storyboardName || 'Untitled'}
Concept: ${storyOverview}
${clientBrief ? `Client Brief: ${clientBrief}` : ''}
${overallMood ? `Mood: ${overallMood}` : ''}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}`);

  // ── Location / Setting ──
  if (locationDescription) {
    sections.push(`PRIMARY LOCATION — use this as the foundation for scene settings. Scenes may move to different areas within or near this location, but this is the anchor environment:\n${locationDescription}`);
  }

  // ── User-provided story beats ──
  if (storyBeats?.length > 0) {
    const beatsText = storyBeats.map(b =>
      `Scene ${b.sceneNumber}: ${b.summary} (Setting: ${b.setting || 'TBD'}, Action: ${b.keyAction || 'TBD'}, Emotion: ${b.emotion || 'TBD'})`
    ).join('\n');
    sections.push(`USER-PROVIDED STORY BEATS — follow these closely as the narrative foundation:\n${beatsText}`);
  }

  // ── Narrative Arc Template ──
  sections.push(`NARRATIVE STYLE: ${arc.label}
Arc structure: ${arc.description}
Beat types to use: ${arc.beats.join(' → ')}
Emotional curve: ${arc.emotionalCurve.join(' → ')}
Pacing: ${arc.pacing}

Write exactly ${targetSceneCount} scenes that follow this arc. Map the beat types to your scenes — not every scene needs a unique beat type, but the OVERALL sequence must follow the arc progression.`);

  // ── Scene Direction (from pills) ──
  if (sceneDirection) {
    const dirParts = [];
    if (sceneDirection.environment?.length) dirParts.push(`Environments to use: ${sceneDirection.environment.join(', ')}`);
    if (sceneDirection.action?.length) dirParts.push(`Character actions to include: ${sceneDirection.action.join(', ')}`);
    if (sceneDirection.expression?.length) dirParts.push(`Expressions to show: ${sceneDirection.expression.join(', ')}`);
    if (dirParts.length > 0) {
      sections.push(`CREATIVE DIRECTION — distribute these across scenes naturally:\n${dirParts.join('\n')}`);
    }
  }

  // ── Brand Constraints (HARD RULES, not suggestions) ──
  if (brandStyleGuide) {
    const brandRules = [];
    if (brandStyleGuide.brand_name) brandRules.push(`Brand: ${brandStyleGuide.brand_name}`);
    if (brandStyleGuide.mood_atmosphere) brandRules.push(`Required mood: ${brandStyleGuide.mood_atmosphere}`);
    if (brandStyleGuide.ai_prompt_rules) brandRules.push(`MANDATORY RULES: ${brandStyleGuide.ai_prompt_rules}`);
    if (brandStyleGuide.preferred_elements) brandRules.push(`MUST INCLUDE in at least one scene: ${brandStyleGuide.preferred_elements}`);
    if (brandStyleGuide.prohibited_elements) brandRules.push(`NEVER INCLUDE (hard constraint): ${brandStyleGuide.prohibited_elements}`);
    if (brandRules.length > 0) {
      sections.push(`BRAND CONSTRAINTS — these are NON-NEGOTIABLE rules, not suggestions:\n${brandRules.join('\n')}`);
    }
  }

  // ── Duration Constraints ──
  if (durationConstraints) {
    const allowed = durationConstraints.allowed;
    if (allowed?.length) {
      sections.push(`DURATION RULES:
- Total target: ${desiredLength}s across ${targetSceneCount} scenes
- Each scene's durationSeconds MUST be one of: ${allowed.join(', ')} (seconds)
- The sum of all scene durations should approximate ${desiredLength}s`);
    }
  }

  // ── Dialogue ──
  if (hasDialogue) {
    sections.push(`DIALOGUE: This storyboard includes narration/dialogue. For each scene, write what is said — either character speech or narrator voiceover. Keep dialogue concise and natural. The dialogue will be converted to speech audio, so write for the ear, not the eye.`);
  } else {
    sections.push(`DIALOGUE: This storyboard has NO dialogue/narration. Leave the dialogue field empty. All storytelling is purely visual.`);
  }

  // ── Output Rules ──
  sections.push(`RULES:
1. Each narrativeMoment should be 1-2 sentences describing what HAPPENS, not what the scene LOOKS like.
2. Each setting should be specific: "a sunlit suburban footpath next to a busy road" not "outdoor".
3. characterAction should describe physical movement: "walks toward the crossing, looks both ways, waits for the green signal" not "crosses the road".
4. characterEmotion should be a specific emotion that could be shown on a face: "cautious but confident" not "happy".
5. emotionalTone is what the VIEWER feels, which may differ from the character's emotion.
6. transitionNote explains how to smoothly connect this scene to the next (same location? time skip? camera follows character to new location?).
7. DO NOT include any visual style descriptions (lighting, color grade, camera angle). Those are added in a separate stage.
8. DO NOT include copyrighted character names, brand names, or franchise references.`);

  return sections.join('\n\n');
}

// ── User Prompt ─────────────────────────────────────────────────────────────

export function buildNarrativeUserPrompt(inputs) {
  const { targetSceneCount, desiredLength, narrativeStyle = 'entertaining' } = inputs;
  const arc = NARRATIVE_ARCS[narrativeStyle] || NARRATIVE_ARCS.entertaining;

  return `Write exactly ${targetSceneCount} narrative beats for a ${desiredLength}-second video following the "${arc.label}" arc structure (${arc.beats.join(' → ')}).

Each beat must have a clear narrative function, specific character action, and emotional progression. The sequence should feel like one continuous story, not disconnected scenes.

The emotional arc should progress: ${arc.emotionalCurve.join(' → ')}`;
}

// ── Scene Count Calculator ──────────────────────────────────────────────────

/**
 * Calculate optimal scene count based on desired length and model constraints.
 * Factors in narrative arc — some arcs need minimum beat counts.
 */
export function calculateSceneCount(desiredLength, durationConstraints, narrativeStyle = 'entertaining') {
  const arc = NARRATIVE_ARCS[narrativeStyle] || NARRATIVE_ARCS.entertaining;
  const minBeats = Math.max(3, Math.min(arc.beats.length, 5)); // arc needs at least this many scenes
  const maxScenes = 12;

  const avgDuration = durationConstraints?.allowed
    ? durationConstraints.allowed[Math.floor(durationConstraints.allowed.length / 2)]
    : 5;

  const countFromDuration = Math.round(desiredLength / avgDuration);
  const clamped = Math.max(minBeats, Math.min(maxScenes, countFromDuration));

  return clamped;
}
