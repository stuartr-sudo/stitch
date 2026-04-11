# Shorts Pipeline V3: Complete Refactor Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Shorts pipeline around a TTS-first architecture with two-stage script generation, parallel first-last-frame video generation, Beatoven music, and pre-assembly timing validation.

**Architecture:** Narrative Draft (words-only) → TTS → Whisper word timestamps → Block Aligner (snap to model durations) → Scene Director (keyframe image prompts per boundary) → Generate N+1 keyframe images (batched) → Generate N videos in parallel via first-last-frame-to-video → (Beatoven music runs parallel with video) → Assembly Validator → Assemble → Caption → Draft. TTS audio is the master clock. First-last-frame video generation eliminates sequential frame chaining.

**Tech Stack:** Express, FAL.ai (Gemini TTS, Whisper, Veo 3.1 first-last-frame, Beatoven, ffmpeg-api), OpenAI GPT-4.1-mini (script), Supabase, Zod (structured output)

---

## Pipeline Comparison

### Current (V2) — Sequential, Script-First
```
Framework → Duration Solver → Script (word budget from clip durations) → TTS → Video per scene (SEQUENTIAL) → Music → Assemble → Caption
                                ↑ BUG: word budget based on clip lengths, not target duration
                                                    ↑ BUG: clip durations don't match TTS
                                                                  ↑ SLOW: scenes are independent in cut mode but still sequential
                                                                                      ↑ SLOW: music waits for all scenes
```

### New (V3) — TTS-First, Parallel First-Last-Frame
```
Narrative Generator (Stage 1: words-only, narration + hook)
         ↓
TTS Voiceover (Gemini/ElevenLabs → single MP3)
         ↓
Whisper Word Timestamps (word-level timing from TTS audio)
         ↓
Block Aligner (snap word boundaries to model-valid clip durations)
         ↓
Scene Director (Stage 2: keyframe image prompts per scene boundary)
         ↓                              N scenes = N+1 keyframe images
┌────────┴────────┐
↓                 ↓
Beatoven Music    Generate N+1 keyframe images (batched, concurrency 2-3)
(parallel,             ↓
 exact duration)  Generate N videos via first-last-frame (ALL IN PARALLEL)
↓                      ↓          vid_1(img_0→img_1)
↓                      ↓          vid_2(img_1→img_2)
↓                      ↓          vid_3(img_2→img_3) ...
└────────┬────────┘
         ↓
Assembly Validator (check clip/TTS/music alignment)
         ↓
Assemble → Caption → Draft

KEY INSIGHT: Scene N's last frame image = Scene N+1's first frame image.
No sequential frame chaining. No frame extraction. Full parallelism.
Primary model: Veo 3.1 first-last-frame (fal-ai/veo3.1/fast/first-last-frame-to-video)
Fallback: sequential I2V for models without first-last-frame support.
```

---

## Reference Files

Read these files before starting any task. They contain the current implementations being refactored.

| File | Role | Read Before Tasks |
|------|------|-------------------|
| `api/lib/shortsPipeline.js` | Main pipeline orchestrator (729 lines) | All tasks |
| `api/lib/scriptGenerator.js` | GPT script generation (283 lines) | 2, 3, 6 |
| `api/lib/voiceoverGenerator.js` | TTS + Whisper timestamps (325 lines) | 4, 5 |
| `api/lib/durationSolver.js` | Duration allocation per model (181 lines) | 5 |
| `api/lib/pipelineHelpers.js` | assembleShort, generateMusic, extractFrame, uploadUrlToSupabase | 7, 8, 10 |
| `api/lib/captionBurner.js` | Auto-subtitle burn-in (178 lines) | 10 |
| `api/lib/videoStyleFrameworks.js` | 76 framework definitions | 1 |
| `api/lib/visualStyles.js` | 14 visual style presets (getVisualStyleSuffix, getImageStrategy) | 3, 6 |
| `api/lib/videoStylePresets.js` | 86 motion presets (getVideoStylePrompt) | 6 |
| `api/lib/mediaGenerator.js` | generateImageV2, animateImageV2, animateImageR2V dispatchers | 10 |
| `api/lib/modelRegistry.js` | Model configs, duration converters, getR2VEndpoint | 5, 10 |
| `api/lib/retryHelper.js` | withRetry(fn, opts) wrapper | All tasks |
| `api/lib/costLogger.js` | logCost() for spend tracking | 2, 7 |
| `api/lib/getUserKeys.js` | API key resolution | 9 |
| `api/campaigns/create.js` | Entry point that calls runShortsPipeline() | 10 |
| `docs/shorts-pipeline-reference/README.md` | Pipeline overview and known issues | All tasks |

---

## New File Map

| File | Responsibility | Depends On |
|------|---------------|------------|
| `api/lib/narrativeGenerator.js` | Stage 1 script: words-only narration with hook, no visual prompts | Framework definitions |
| `api/lib/sceneDirector.js` | Stage 2 script: visual + motion prompts per aligned scene block | Approved narrative, visual style, framework |
| `api/lib/visualPromptComposer.js` | Deterministic prompt assembly: style + direction + model constraints → final prompt | Visual style config, scene direction output |
| `api/lib/blockAligner.js` | Snap Whisper word timestamps to model-valid clip durations | Word timestamps, MODEL_DURATIONS from durationSolver |
| `api/lib/getWordTimestamps.js` | Extract word-level timing from TTS audio via Whisper | TTS audio URL, FAL key |
| `api/lib/topicDiscovery.js` | Research-powered hook suggestions: web search + LLM synthesis | Niche, framework |
| `api/lib/assemblyValidator.js` | Pre-assembly timing validation: clips vs TTS vs music alignment | Scene results, TTS duration |

## Modified File Map

| File | Changes |
|------|---------|
| `api/lib/videoStyleFrameworks.js` | Add `narrative`, `pacing`, `tts`, `music`, `sceneDefaults` blocks to each framework definition |
| `api/lib/shortsPipeline.js` | Complete rewrite: TTS-first ordering, two-stage script, parallel music+scenes, assembly validation |
| `api/lib/scriptGenerator.js` | Keep `generateScript()` as backward-compat wrapper (called by `preview-script.js`). Keep `generateTopics()`. Wrapper calls `generateNarrative()` internally and maps output to old format. |
| `api/lib/pipelineHelpers.js` | Add Beatoven to `generateMusic()`, update `assembleShort()` to accept TTS duration as master clock |
| `api/lib/durationSolver.js` | Export `MODEL_DURATIONS` so blockAligner can import it (single source of truth) |

---

## Task Dependency Graph

```
Task 1 (Expand Frameworks) ────────────────────────────────────────┐
                                                                    │
Task 2 (Narrative Generator) ──────────────────────────────────┐   │
                                                                │   │
Task 3 (Visual Prompt Composer) ───────────────────────────┐   │   │
                                                            │   │   │
Task 4 (getWordTimestamps) ────────────────────────────┐   │   │   │
                                                        │   │   │   │
Task 5 (Block Aligner) ◄──────────────────────────────┘   │   │   │
                                                        │   │   │   │
Task 6 (Scene Director) ◄─────────────────────────────┴───┘   │   │
                                                                │   │
Task 7 (Beatoven Music) ──────────────────────────────────────│   │
                                                                │   │
Task 8 (Assembly Validator) ──────────────────────────────────│   │
                                                                │   │
Task 9 (Topic Discovery) ─────────────────────────────────────│   │
                                                                │   │
Task 10 (Pipeline Rewrite) ◄──────────────────────────────────┴───┘
                                                                │
Task 11 (Integration Verification) ◄───────────────────────────┘
```

**Parallelizable:** Tasks 1-4, 7, 8, 9 can all run concurrently. Task 5 needs Task 4. Task 6 needs Tasks 2, 3, 5. Task 10 needs all of 1-9. Task 11 needs Task 10.

---

## Task 1: Expand Framework Definitions

**Files:**
- Modify: `api/lib/videoStyleFrameworks.js`

Currently each framework has: `id`, `name`, `category`, `description`, `thumb`, `hookExamples`, `supportedDurations`, `defaults`, `frameChain`, `ttsMode`, `transitionType`, `transitionDuration`, `textOverlays`, `overlayStyle`, `musicVolume`, `musicMood`, `ttsPacing`, `sceneStructure`, `applicableNiches`.

Add structured blocks for the new pipeline stages. These provide richer context to each pipeline module.

- [ ] **Step 1: Define the expanded framework schema**

Add these new fields to each framework definition. Start with the 16 universal frameworks, then apply to the 60 niche-specific ones.

```javascript
// New fields added to each framework definition:

narrative: {
  // Controls Stage 1 (narrativeGenerator.js)
  hookPattern: 'mystery-reveal',          // 'mystery-reveal' | 'contrarian' | 'story-open' | 'list-countdown' | 'question'
  hookExamples: [                         // Expanded from the existing hookExamples array
    'There\'s a lake in Tanzania so deadly, anything that touches it turns to stone.',
    'Scientists just discovered something beneath Antarctica that shouldn\'t exist.',
  ],
  narrativeArc: 'setup → tension → reveal → impact',  // Guides the narrative structure
  toneDescriptor: 'authoritative but approachable, building intrigue steadily',
  forbiddenPatterns: ['rhetorical questions as filler', 'vague claims without specifics'],
},

pacing: {
  // Controls block alignment and TTS behavior
  wordsPerSecond: 2.7,                    // Target speech rate
  pauseBetweenScenes: 0.3,               // Seconds of silence between scenes (for breath/transition)
  emphasisWords: ['never', 'always', 'exactly', 'deadly'],  // Words TTS should stress
},

tts: {
  // Controls voiceover generation
  defaultVoice: 'Kore',                  // Gemini voice ID
  styleInstructions: 'Speak slowly with deliberate pacing, use a dark unsettling tone, lean in like sharing a secret.',
  // Replaces buildTtsStyleInstructions() — pre-computed per framework instead of runtime parsing
},

music: {
  // Controls Beatoven music generation
  moodProgression: 'Dark ambient soundscape with low drones, distant metallic scrapes, and creeping dread. Building tension through middle, eerie release at end.',
  // Replaces expandMusicMood() — pre-computed rich prompt instead of runtime lookup
  genre: 'ambient',                       // Hint for Beatoven
  energy: 'low-to-medium',               // 'low' | 'low-to-medium' | 'medium' | 'medium-to-high' | 'high'
},

sceneDefaults: {
  // Per-scene visual defaults that feed into sceneDirector + visualPromptComposer
  lightingDefault: 'cinematic, dramatic side-lighting',
  colorPaletteDefault: 'desaturated cool tones with warm accent highlights',
  cameraDefault: 'slow push-in, shallow depth of field',
  // These are overridable per-scene in sceneStructure but provide framework-wide consistency
},
```

- [ ] **Step 2: Apply to `personal_journey` framework (template)**

Read the existing `personal_journey` framework definition in `videoStyleFrameworks.js`. Add the new fields:

```javascript
personal_journey: {
  // ... existing fields unchanged ...

  narrative: {
    hookPattern: 'story-open',
    hookExamples: [
      'Six months ago, I couldn\'t walk up a flight of stairs without stopping.',
      'I spent three years building something that nobody wanted.',
    ],
    narrativeArc: 'setup → inciting moment → struggle → turning point → resolution',
    toneDescriptor: 'reflective and honest, building from vulnerability to strength',
    forbiddenPatterns: ['generic motivation quotes', 'vague "I learned so much" without specifics'],
  },

  pacing: {
    wordsPerSecond: 2.5,  // Slower for reflective story
    pauseBetweenScenes: 0.5,
    emphasisWords: ['everything', 'never', 'finally', 'realized'],
  },

  tts: {
    defaultVoice: 'Aoede',
    styleInstructions: 'Speak slowly with deliberate pacing, sound reflective and contemplative, gradually build energy and intensity toward the end. Do not drag words out or over-enunciate. Keep delivery crisp even when slow.',
  },

  music: {
    moodProgression: 'Ambient piano with subtle strings, emotionally reflective and gentle. Quiet intimate opening, building warmth through middle, uplifting resolution at end. Soft pads and reverb throughout.',
    genre: 'ambient',
    energy: 'low-to-medium',
  },

  sceneDefaults: {
    lightingDefault: 'warm natural light, golden hour tones',
    colorPaletteDefault: 'warm earth tones, soft golden highlights',
    cameraDefault: 'medium close-up, gentle handheld movement, 50mm lens',
  },
},
```

- [ ] **Step 3: Apply to remaining 15 universal frameworks**

For each universal framework, add appropriate `narrative`, `pacing`, `tts`, `music`, and `sceneDefaults` blocks. Use the existing `ttsPacing`, `musicMood`, and `musicVolume` values as the basis — the new fields are richer versions of these.

Map existing fields to new ones:
- `ttsPacing` → `tts.styleInstructions` (expand from descriptive adjectives to imperative instructions, always append "Do not drag words out or over-enunciate. Keep delivery crisp even when slow.")
- `musicMood` → `music.moodProgression` (expand from terse label to rich Beatoven-quality prompt)
- `musicVolume` stays as-is (top-level field, still used by assembler)
- `defaults.videoModel` → keep, `sceneDefaults` is additive

The universal frameworks to update:
1. `personal_journey` (done in Step 2)
2. `mystery_reveal`
3. `countdown_listicle`
4. `before_after`
5. `myth_busting`
6. `day_in_the_life`
7. `hot_take`
8. `tutorial_quick`
9. `story_time`
10. `comparison`
11. `challenge`
12. `explainer`
13. `reaction`
14. `transformation`
15. `behind_the_scenes`
16. `did_you_know`

- [ ] **Step 4: Apply to all 60 niche-specific frameworks**

Same pattern as Step 3 but for the 60 niche-specific frameworks (3 per niche × 20 niches). The niche-specific frameworks already have more specific `musicMood` and `ttsPacing` values — use those as the basis for the richer fields.

- [ ] **Step 5: Verify syntax**

Run: `node -c api/lib/videoStyleFrameworks.js`
Expected: No errors

- [ ] **Step 6: Note on frontend mirror**

The frontend mirror `src/lib/videoStyleFrameworks.js` does NOT need these new fields (`narrative`, `pacing`, `tts`, `music`, `sceneDefaults`). These are backend-only pipeline configuration. The frontend mirror only contains display metadata (name, description, thumb, hookExamples, supportedDurations, badges). No sync needed for this task.

- [ ] **Step 7: Commit**

```bash
git add api/lib/videoStyleFrameworks.js
git commit -m "feat: expand framework definitions with narrative, pacing, tts, music, sceneDefaults blocks"
```

---

## Task 2: Narrative Generator (Stage 1)

**Files:**
- Create: `api/lib/narrativeGenerator.js`
- Reference: `api/lib/scriptGenerator.js` (the code being replaced)
- Reference: `api/lib/videoStyleFrameworks.js` (framework.narrative fields from Task 1)

The narrative generator produces words-only output: narration text with hook, per-scene narration segments, and metadata. NO visual prompts — those come later from the Scene Director (Task 6) after TTS timing is known.

- [ ] **Step 1: Create `api/lib/narrativeGenerator.js`**

```javascript
/**
 * Narrative Generator — Stage 1 of two-stage script generation.
 *
 * Produces words-only output: narration with hook, per-scene text segments.
 * NO visual or motion prompts — those come from sceneDirector.js (Stage 2)
 * after TTS timing is known.
 *
 * This separation means the narrative can be generated, TTS'd, and timestamped
 * before any visual decisions are made.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';

// ── Zod schema ──────────────────────────────────────────────────────────────

const NarrativeSceneSchema = z.object({
  scene_label: z.string().describe('Framework beat name for this scene (e.g., "Setup", "Reveal")'),
  narration_segment: z.string().describe('Voiceover text for this scene — word count must match per-scene target'),
  duration_seconds: z.number().describe('Target scene duration in seconds'),
  overlay_text: z.string().nullable().describe('On-screen text overlay (null if none)'),
});

const NarrativeDraftSchema = z.object({
  title: z.string().max(100).describe('Attention-grabbing title'),
  description: z.string().max(500).describe('Platform description for search/discovery'),
  hashtags: z.array(z.string()).max(15).describe('Relevant hashtags without # prefix'),
  hook_line: z.string().describe('The opening hook — first sentence that stops the scroll'),
  narration_full: z.string().describe('Complete voiceover text, all scenes concatenated naturally'),
  scenes: z.array(NarrativeSceneSchema),
  music_mood: z.string().describe('Background music mood/genre for music generation'),
});

/**
 * Generate a narrative draft (words-only, no visual prompts).
 *
 * @param {object} params
 * @param {string} params.niche - Niche key
 * @param {string} [params.topic] - Topic (auto-generated if omitted)
 * @param {string} [params.hookLine] - Pre-selected hook from topicDiscovery
 * @param {object} params.nicheTemplate - From shortsTemplates.js
 * @param {object} [params.framework] - Full framework object (with .narrative block)
 * @param {number} params.targetDurationSeconds - User's chosen duration (30/45/60/90)
 * @param {string} [params.storyContext] - Additional context for the narrative
 * @param {object} params.keys - { openaiKey }
 * @param {string} [params.brandUsername] - For cost logging
 * @returns {Promise<object>} Parsed NarrativeDraftSchema
 */
export async function generateNarrative({
  niche,
  topic,
  hookLine,
  nicheTemplate,
  framework,
  targetDurationSeconds,
  storyContext,
  keys,
  brandUsername,
}) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required for narrative generation');
  if (!nicheTemplate) throw new Error(`No template found for niche "${niche}"`);

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  // ── Build scene structure from framework or legacy template ─────────────
  const frameworkScenes = framework
    ? (framework.sceneStructure[targetDurationSeconds] || framework.sceneStructure[framework.supportedDurations[0]])
    : null;

  const effectiveDuration = targetDurationSeconds || (framework?.supportedDurations[0]) || 60;
  const wordsPerSecond = framework?.pacing?.wordsPerSecond || 2.7;
  const totalWords = Math.round(effectiveDuration * wordsPerSecond);

  let sceneGuide;
  if (frameworkScenes) {
    sceneGuide = frameworkScenes.map((s, i) => {
      const midDur = Math.round((s.durationRange[0] + s.durationRange[1]) / 2);
      const wordTarget = Math.round(midDur * wordsPerSecond);
      return `Scene ${i + 1} "${s.label}" (${s.durationRange[0]}-${s.durationRange[1]}s, ~${wordTarget} words): ${s.beat}` +
        (s.overlayText ? ` — overlay: "${s.overlayText}"` : '');
    }).join('\n');
  } else {
    // Legacy fallback
    const sceneCounts = { 15: 3, 30: 3, 45: 4, 60: 5, 90: 7 };
    const count = sceneCounts[effectiveDuration] || 5;
    const perScene = Math.round(effectiveDuration / count);
    sceneGuide = Array.from({ length: count }, (_, i) =>
      `Scene ${i + 1} (${perScene}s, ~${Math.round(perScene * wordsPerSecond)} words)`
    ).join('\n');
  }

  // ── Build narrative-specific prompt blocks ──────────────────────────────
  const narrativeBlock = framework?.narrative ? `
NARRATIVE FRAMEWORK: ${framework.name}
Hook Pattern: ${framework.narrative.hookPattern}
Narrative Arc: ${framework.narrative.narrativeArc}
Tone: ${framework.narrative.toneDescriptor}
${framework.narrative.forbiddenPatterns?.length ? `FORBIDDEN in this framework: ${framework.narrative.forbiddenPatterns.join('; ')}` : ''}
${framework.narrative.hookExamples?.length ? `Hook examples (for inspiration, don't copy):\n${framework.narrative.hookExamples.map(h => `  - "${h}"`).join('\n')}` : ''}
` : '';

  const categoryBlock = framework?.category === 'fast_paced'
    ? 'Each scene is self-contained and punchy. No flowery transitions. Hit hard, move on.'
    : 'Scenes flow naturally into each other like a continuous story. Each picks up where the last left off.';

  const overlayBlock = framework?.textOverlays === 'required'
    ? 'overlay_text is REQUIRED for every scene — concise on-screen text (3-7 words) that reinforces narration.'
    : framework?.textOverlays === 'optional'
    ? 'overlay_text: add where it enhances clarity, null otherwise.'
    : 'overlay_text: set to null for all scenes.';

  const systemPrompt = `${nicheTemplate.script_system_prompt}
${narrativeBlock}
SCENE STRUCTURE (${frameworkScenes?.length || 5} scenes, ${effectiveDuration}s total):
${sceneGuide}

WORD BUDGET (highest priority — violating this makes the video unwatchable):
- Total narration MUST be ${totalWords - 10} to ${totalWords + 10} words. Count carefully before responding.
- Each scene's narration_segment MUST match its per-scene word target shown above (~${wordsPerSecond} words/sec).
- narration_full = all narration_segments joined naturally. This is what gets spoken aloud as one continuous voiceover.

NARRATION CONTINUITY:
- This is ONE continuous voiceover, not separate paragraphs.
- Each scene picks up exactly where the previous ended. Never repeat, contradict, or re-introduce.
- Build forward only. Think of it as one monologue broken into chapters.
${categoryBlock}

HOOK (most important sentence):
- The first sentence of Scene 1 is the hook. It must create an information gap — the viewer MUST need to know the answer.
${hookLine ? `- USE THIS HOOK (provided by user): "${hookLine}"` : '- Write a hook that would make someone stop scrolling mid-swipe.'}

WRITING QUALITY:
- Every sentence advances the story or delivers new information. Zero filler.
- Use concrete details: specific numbers, names, places, dates. Never "some experts" or "many people believe".
- Vary sentence rhythm. Short punches between longer setups. Never three long sentences in a row.
- End with a satisfying payoff that delivers on the hook's promise. No vague "think about it" endings.

${overlayBlock}

FORBIDDEN:
- Emdashes or endashes (use commas, periods, semicolons instead)
- Cliches: "buckle up", "let's dive in", "here's the thing", "what if I told you", "game-changer", "mind-blowing", "insane", "literally", "absolutely", "at the end of the day", "in today's world", "it turns out", "the truth is", "picture this", "imagine this"

IMPORTANT: You are generating NARRATION ONLY. Do NOT include visual_prompt or motion_prompt fields. Those are handled separately.`;

  const storyContextBlock = storyContext
    ? `\n\nSTORY CONTEXT (use as basis):\n${storyContext}`
    : '';

  const userPrompt = topic
    ? `Create a ${effectiveDuration}-second ${nicheTemplate.name} narrative about: ${topic}${storyContextBlock}`
    : `Create a ${effectiveDuration}-second ${nicheTemplate.name} narrative about a trending topic. Pick something specific and surprising.${storyContextBlock}`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(NarrativeDraftSchema, 'narrative_draft'),
  });

  const narrative = completion.choices[0].message.parsed;

  // ── Word count safety net ──────────────────────────────────────────────
  const actualWords = narrative.narration_full.split(/\s+/).length;
  const maxAllowed = totalWords + 15;
  if (actualWords > maxAllowed) {
    console.warn(`[narrativeGenerator] Word count ${actualWords} exceeds budget ${totalWords}±15 — trimming to ${maxAllowed}`);
    const words = narrative.narration_full.split(/\s+/);
    narrative.narration_full = words.slice(0, maxAllowed).join(' ');
    let wordIdx = 0;
    for (const scene of narrative.scenes) {
      const sceneWordTarget = Math.round((scene.duration_seconds || 5) * wordsPerSecond);
      const take = Math.min(sceneWordTarget, words.length - wordIdx);
      scene.narration_segment = words.slice(wordIdx, wordIdx + take).join(' ');
      wordIdx += take;
    }
  }

  // Extract hook_line from first sentence if not already set
  if (!narrative.hook_line && narrative.narration_full) {
    const firstSentence = narrative.narration_full.match(/^[^.!?]+[.!?]/)?.[0] || narrative.narration_full.slice(0, 100);
    narrative.hook_line = firstSentence;
  }

  if (completion.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_narrative_generation',
      model: 'gpt-4.1-mini',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  console.log(`[narrativeGenerator] Generated: "${narrative.title}" — ${narrative.narration_full.split(/\s+/).length} words, ${narrative.scenes.length} scenes`);
  return narrative;
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c api/lib/narrativeGenerator.js`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/lib/narrativeGenerator.js
git commit -m "feat: add narrativeGenerator.js — Stage 1 words-only script generation"
```

---

## Task 2b: Backward-Compat Wrapper for `generateScript()`

**Files:**
- Modify: `api/lib/scriptGenerator.js`

`api/campaigns/preview-script.js` imports and calls `generateScript()` directly. We must preserve this function as a backward-compat wrapper that calls `generateNarrative()` and maps the output to the old `ShortsScriptSchema` format.

- [ ] **Step 1: Add wrapper to `scriptGenerator.js`**

Keep the existing `generateScript()` export but replace its implementation with a wrapper:

```javascript
import { generateNarrative } from './narrativeGenerator.js';

/**
 * Backward-compat wrapper — calls narrativeGenerator and maps output to old format.
 * Used by: api/campaigns/preview-script.js
 */
export async function generateScript({ niche, topic, nicheTemplate, keys, brandUsername, storyContext, visualDirections, targetDurationSeconds, framework, lockedDurations = null, frameChain = true }) {
  const narrative = await generateNarrative({
    niche, topic, nicheTemplate, framework,
    targetDurationSeconds, storyContext,
    keys, brandUsername,
  });

  // Map narrative output to old ShortsScriptSchema format
  return {
    title: narrative.title,
    description: narrative.description,
    hashtags: narrative.hashtags,
    narration_full: narrative.narration_full,
    scenes: narrative.scenes.map(s => ({
      role: s.scene_label || 'scene',
      narration_segment: s.narration_segment,
      visual_prompt: '',  // Not generated in Stage 1 — preview-script only needs narration
      motion_prompt: '',
      duration_seconds: s.duration_seconds,
      overlay_text: s.overlay_text,
      scene_label: s.scene_label,
    })),
    music_mood: narrative.music_mood,
    scene_1_image_description: '',  // Not generated in Stage 1
  };
}
```

Keep `generateTopics()` unchanged — it's independent.

- [ ] **Step 2: Verify syntax**

Run: `node -c api/lib/scriptGenerator.js`
Expected: No errors

- [ ] **Step 3: Verify `preview-script.js` still parses**

Run: `node -c api/campaigns/preview-script.js`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add api/lib/scriptGenerator.js
git commit -m "feat: convert generateScript to backward-compat wrapper over narrativeGenerator"
```

---

## Task 3: Visual Prompt Composer

**Files:**
- Create: `api/lib/visualPromptComposer.js`
- Reference: `api/lib/visualStyles.js` (getVisualStyleSuffix, getImageStrategy)
- Reference: `api/lib/videoStylePresets.js` (getVideoStylePrompt)

Deterministic prompt assembly — no LLM call. Takes a scene direction object and visual style config, outputs the final image/video prompt strings. This replaces the ad-hoc string concatenation scattered across shortsPipeline.js.

- [ ] **Step 1: Create `api/lib/visualPromptComposer.js`**

```javascript
/**
 * Visual Prompt Composer — deterministic prompt assembly.
 *
 * Takes a scene direction (from sceneDirector.js) and visual style config,
 * and produces the final image generation prompt and video motion prompt.
 *
 * No LLM calls — this is pure string composition with rules.
 */

import { getVisualStyleSuffix } from './visualStyles.js';
import { getVideoStylePrompt } from './videoStylePresets.js';

/**
 * Compose the final image generation prompt for a keyframe.
 *
 * Works with the keyframe schema from sceneDirector.js:
 *   { imagePrompt: string, motionHint: string }
 *
 * Enriches the scene director's imagePrompt with:
 * - LoRA trigger words
 * - Framework scene defaults (lighting, color palette, camera)
 * - Visual style suffix
 * - Format/quality tokens
 *
 * @param {object} params
 * @param {object} params.sceneDirection - Keyframe from sceneDirector: { imagePrompt, motionHint }
 * @param {string} [params.visualStyle] - Visual style key (e.g., 'cinematic_photo')
 * @param {string} [params.visualStylePrompt] - Custom visual style prompt text (overrides key lookup)
 * @param {object} [params.frameworkDefaults] - framework.sceneDefaults: { lightingDefault, colorPaletteDefault, cameraDefault }
 * @param {string} [params.aspectRatio] - '9:16' | '16:9' | '1:1'
 * @param {Array} [params.loraConfigs] - LoRA trigger words to prepend
 * @param {boolean} [params.isFirstScene] - Unused in keyframe mode (kept for API compat)
 * @param {boolean} [params.frameChain] - Unused in keyframe mode (kept for API compat)
 * @returns {{ imagePrompt: string, motionPrompt: string }}
 */
export function composePrompts({
  sceneDirection,
  visualStyle,
  visualStylePrompt,
  frameworkDefaults,
  aspectRatio = '9:16',
  loraConfigs = [],
  isFirstScene = false,
  frameChain = false,
}) {
  const parts = [];

  // 1. LoRA trigger words first
  const triggerWords = loraConfigs
    .map(c => c.triggerWord)
    .filter(Boolean);
  if (triggerWords.length > 0) {
    parts.push(triggerWords.join(', '));
  }

  // 2. Core image prompt from scene director (keyframe imagePrompt)
  // The scene director already produces hyper-specific prompts with subject, pose,
  // setting, lighting, camera angle — we ADD framework defaults only if the
  // director's prompt doesn't already cover them.
  if (sceneDirection.imagePrompt) {
    parts.push(sceneDirection.imagePrompt);
  }

  // 3. Framework defaults — append only if not already present in imagePrompt
  const prompt = (sceneDirection.imagePrompt || '').toLowerCase();
  if (frameworkDefaults?.lightingDefault && !prompt.includes('light')) {
    parts.push(frameworkDefaults.lightingDefault);
  }
  if (frameworkDefaults?.colorPaletteDefault && !prompt.includes('palette') && !prompt.includes('color')) {
    parts.push(frameworkDefaults.colorPaletteDefault);
  }
  // Camera default NOT added — the scene director's imagePrompt includes camera angle

  // 4. Visual style suffix (from the 14 visual styles in visualStyles.js)
  const styleSuffix = visualStylePrompt
    ? `, ${visualStylePrompt}`
    : getVisualStyleSuffix(visualStyle);
  if (styleSuffix) {
    parts.push(styleSuffix.replace(/^,\s*/, '')); // Remove leading comma+space
  }

  // 5. Format and quality tokens
  const formatStr = `Vertical ${aspectRatio} format, cinematic composition, no text or words in image`;
  parts.push(formatStr);

  const imagePrompt = parts.filter(Boolean).join('. ');

  // Motion prompt: keyframe's motionHint (what happens between this keyframe and the next)
  // Used as the video generation prompt for first-last-frame or I2V
  const motionPrompt = sceneDirection.motionHint || '';

  return { imagePrompt, motionPrompt };
}

/**
 * Compose the full prompt string for video generation (I2V).
 * Combines the image context with motion direction.
 *
 * @param {string} imagePrompt - From composePrompts().imagePrompt
 * @param {string} motionPrompt - From composePrompts().motionPrompt
 * @returns {string} Combined prompt for animateImageV2
 */
export function composeVideoPrompt(imagePrompt, motionPrompt) {
  return [imagePrompt, motionPrompt].filter(Boolean).join('. ');
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c api/lib/visualPromptComposer.js`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/lib/visualPromptComposer.js
git commit -m "feat: add visualPromptComposer.js — deterministic prompt assembly"
```

---

## Task 4: Word Timestamp Extractor

**Files:**
- Create: `api/lib/getWordTimestamps.js`
- Reference: `api/lib/voiceoverGenerator.js` (existing `generateTimestamps` function)

Thin wrapper around the existing Whisper integration in voiceoverGenerator.js. Extracted to its own file so blockAligner.js can depend on it without importing the full voiceover module.

- [ ] **Step 1: Create `api/lib/getWordTimestamps.js`**

```javascript
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
```

- [ ] **Step 2: Verify syntax**

Run: `node -c api/lib/getWordTimestamps.js`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/lib/getWordTimestamps.js
git commit -m "feat: add getWordTimestamps.js — Whisper word timing wrapper"
```

---

## Task 5: Block Aligner

**Files:**
- Create: `api/lib/blockAligner.js`
- Modify: `api/lib/durationSolver.js` (export `MODEL_DURATIONS`)
- Reference: `api/lib/getWordTimestamps.js` (word timestamp format)

Snaps TTS word timestamps to video-model-valid clip boundaries. This is the core of the TTS-first architecture — it determines where each video clip starts and ends based on the actual spoken audio timing.

- [ ] **Step 1: Export `MODEL_DURATIONS` from `durationSolver.js`**

In `api/lib/durationSolver.js`, change line 5 from:
```javascript
const MODEL_DURATIONS = {
```
to:
```javascript
export const MODEL_DURATIONS = {
```

- [ ] **Step 2: Create `api/lib/blockAligner.js`**

```javascript
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
```

- [ ] **Step 3: Verify syntax**

Run: `node -c api/lib/blockAligner.js && node -c api/lib/durationSolver.js`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add api/lib/blockAligner.js api/lib/durationSolver.js
git commit -m "feat: add blockAligner.js — snap TTS timestamps to model-valid clip durations"
```

---

## Task 6: Scene Director (Stage 2) — Keyframe Image Prompts

**Files:**
- Create: `api/lib/sceneDirector.js`
- Reference: `api/lib/narrativeGenerator.js` (Stage 1 output)
- Reference: `api/lib/blockAligner.js` (aligned blocks)
- Reference: `api/lib/videoStyleFrameworks.js` (framework.sceneDefaults)

Stage 2 of script generation: given the approved narrative + aligned blocks, generate **keyframe image prompts** for each scene boundary. N scenes = N+1 keyframe images. Each keyframe describes a specific frozen moment — NOT an action or motion. Scene N's last keyframe = Scene N+1's first keyframe, guaranteeing visual continuity.

The output feeds into:
1. Image generation (N+1 images, batched)
2. First-last-frame video generation (N videos, all in parallel)

- [ ] **Step 1: Create `api/lib/sceneDirector.js`**

```javascript
/**
 * Scene Director — Stage 2 of two-stage script generation.
 *
 * Generates keyframe image prompts for scene BOUNDARIES, not scene interiors.
 * N scenes = N+1 keyframes. Each keyframe is a frozen moment in time.
 *
 * Keyframe[i] = end of scene i = start of scene i+1
 * This enables parallel first-last-frame video generation with guaranteed continuity.
 *
 * Runs AFTER TTS timing is known (block aligner output).
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';

// ── Zod schema ──────────────────────────────────────────────────────────────

const KeyframeSchema = z.object({
  imagePrompt: z.string().describe('Hyper-specific AI image generation prompt for this frozen moment. Include: subject, pose/position, setting, lighting direction + color temp, camera angle, focal length, mood, color palette. Must be a STILL image — no motion, no action verbs.'),
  motionHint: z.string().describe('What happens BETWEEN this keyframe and the next — camera movement and subject action. Used as the video generation prompt.'),
});

const KeyframeDirectionsSchema = z.object({
  keyframes: z.array(KeyframeSchema),
});

/**
 * Generate keyframe image prompts for scene boundaries.
 *
 * @param {object} params
 * @param {object} params.narrative - Output from narrativeGenerator.js
 * @param {Array} params.alignedBlocks - Output from blockAligner.js (N scenes)
 * @param {object} [params.framework] - Full framework object
 * @param {string} [params.visualStyle] - Visual style key
 * @param {string} [params.visualStylePrompt] - Custom visual style prompt text
 * @param {string} [params.videoStyle] - Video style preset key
 * @param {string} [params.visualDirections] - User-provided visual directions
 * @param {object} params.keys - { openaiKey }
 * @param {string} [params.brandUsername] - For cost logging
 * @returns {Promise<{
 *   keyframes: Array<{ imagePrompt: string, motionHint: string }>,
 *   sceneCount: number,
 * }>}
 */
export async function directScenes({
  narrative,
  alignedBlocks,
  framework,
  visualStyle,
  visualStylePrompt,
  videoStyle,
  visualDirections,
  keys,
  brandUsername,
}) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required for scene direction');

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  const sceneDefaults = framework?.sceneDefaults || {};
  const sceneCount = alignedBlocks.length;
  const keyframeCount = sceneCount + 1; // N scenes = N+1 boundary keyframes

  // Build scene context showing what narration happens between each keyframe pair
  const sceneContext = alignedBlocks.map((block, i) => {
    return `Scene ${i + 1}${block.frameworkLabel ? ` "${block.frameworkLabel}"` : ''} (${block.clipDuration}s):
  Between keyframe ${i} → keyframe ${i + 1}
  Narration: "${block.narration}"`;
  }).join('\n\n');

  const systemPrompt = `You are a visual director for short-form video. You must generate ${keyframeCount} KEYFRAME IMAGE PROMPTS — one for each scene boundary.

CONCEPT: For ${sceneCount} scenes, there are ${keyframeCount} boundary moments:
- Keyframe 0: Opening image (start of scene 1)
- Keyframe 1: Transition image (end of scene 1 / start of scene 2)
- Keyframe 2: Transition image (end of scene 2 / start of scene 3)
...
- Keyframe ${sceneCount}: Closing image (end of scene ${sceneCount})

Each keyframe is a FROZEN MOMENT — a still image, not an action. The video model will interpolate motion between keyframe pairs.

FRAMEWORK DEFAULTS (use unless overriding):
- Lighting: ${sceneDefaults.lightingDefault || 'cinematic, natural lighting'}
- Color palette: ${sceneDefaults.colorPaletteDefault || 'rich, balanced color grading'}
- Camera: ${sceneDefaults.cameraDefault || 'medium shot, 50mm lens'}

KEYFRAME IMAGE PROMPT RULES:
- Each imagePrompt is a standalone AI image generation prompt for a STILL IMAGE.
- Describe a frozen moment: subject pose, exact position, setting, lighting, camera angle, focal length, mood, color palette.
- Be hyper-specific. "Close-up of weathered hands resting on a crystal sphere, warm golden light from below illuminating deep wrinkles, shallow depth of field at 85mm, dark moody background with teal fog"
- NOT action: "hands grabbing and lifting" — that's motion, not a still frame.
- NEVER vague: "A person in a room" or "something interesting" produces garbage.
- NEVER text, words, typography, UI elements, watermarks.
- All keyframes must maintain VISUAL CONSISTENCY — same setting, same characters, same color palette, same lighting style. Only the composition, camera angle, and subject state should evolve.

MOTION HINT RULES:
- motionHint describes what happens BETWEEN this keyframe and the NEXT one.
- Include both camera movement and subject action.
- Example: "Camera slowly pushes in while the subject turns to face the light, sphere begins to glow brighter"
- The LAST keyframe's motionHint should be empty string "" (nothing follows it).

${visualDirections ? `USER VISUAL DIRECTIONS (incorporate into all keyframes):\n${visualDirections}\n` : ''}
${visualStylePrompt ? `VISUAL STYLE (apply to all keyframes): ${visualStylePrompt}\n` : ''}`;

  const userPrompt = `Generate ${keyframeCount} keyframe image prompts for this ${sceneCount}-scene video.

Title: "${narrative.title}"
Full narration: "${narrative.narration_full}"

SCENES (each scene happens BETWEEN two adjacent keyframes):
${sceneContext}

Generate exactly ${keyframeCount} keyframes.`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: zodResponseFormat(KeyframeDirectionsSchema, 'keyframe_directions'),
  });

  const result = completion.choices[0].message.parsed;

  // Ensure correct keyframe count (pad or trim)
  while (result.keyframes.length < keyframeCount) {
    const lastKf = result.keyframes[result.keyframes.length - 1];
    result.keyframes.push({
      imagePrompt: lastKf?.imagePrompt || 'Cinematic scene, dramatic lighting, shallow depth of field',
      motionHint: '',
    });
  }
  if (result.keyframes.length > keyframeCount) {
    result.keyframes.length = keyframeCount;
  }

  // Ensure last keyframe has empty motionHint
  result.keyframes[result.keyframes.length - 1].motionHint = '';

  if (completion.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_scene_direction',
      model: 'gpt-4.1-mini',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  console.log(`[sceneDirector] Generated ${result.keyframes.length} keyframes for ${sceneCount} scenes`);

  return {
    keyframes: result.keyframes,
    sceneCount,
  };
}
```

- [ ] **Step 2: Verify syntax**

Run: `node -c api/lib/sceneDirector.js`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/lib/sceneDirector.js
git commit -m "feat: add sceneDirector.js — Stage 2 visual/motion prompts per aligned block"
```

---

## Task 7: Beatoven Music Generator

**Files:**
- Modify: `api/lib/pipelineHelpers.js` (add Beatoven to `generateMusic()`)

- [ ] **Step 1: Read `api/lib/pipelineHelpers.js` and locate `generateMusic()`**

Find the function at line ~429. Add a Beatoven model branch before the existing Lyria 2 block.

- [ ] **Step 2: Verify Beatoven FAL endpoint exists**

Before writing code, verify the endpoint: `curl -s -X POST https://queue.fal.run/beatoven/music-generation -H "Authorization: Key $FAL_KEY" -H "Content-Type: application/json" -d '{"prompt":"test","duration":10}' | head -c 200`

If the endpoint returns a 404 or doesn't exist, skip Beatoven and keep Lyria 2 as default. If it exists, note the actual response schema for `audioUrl` extraction.

- [ ] **Step 3: Add Beatoven backend to `generateMusic()`**

Insert this block as the first model branch inside `generateMusic()`, before the MiniMax block:

```javascript
// --- Beatoven (duration-aware, higher quality) ---
if (model === 'beatoven') {
  const res = await fetch(`${FAL_BASE}/beatoven/music-generation`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: moodPrompt.slice(0, 300),
      negative_prompt: 'vocals, singing, speech, noise, distortion',
      duration: clampedDuration,
      refinement: 100,
      creativity: 16,
    }),
  });
  if (!res.ok) {
    console.warn('[pipelineHelpers] Beatoven music gen failed, falling back to Lyria 2:', await res.text());
    return generateMusic(moodPrompt, durationSeconds, keys, supabase, 'fal_lyria2');
  }
  const queueData = await res.json();
  if (!queueData.request_id) return null;
  const output = await pollFalQueue(
    queueData.response_url || queueData.request_id,
    'beatoven/music-generation',
    keys.falKey,
    180,  // Beatoven can take longer than Lyria 2
    4000
  );
  const audioUrl = output?.audio?.url || output?.audio_file?.url;
  if (!audioUrl) return null;
  return await uploadUrlToSupabase(audioUrl, supabase, 'pipeline/audio');
}
```

- [ ] **Step 4: Change default model parameter from `'fal_lyria2'` to `'beatoven'`**

Change the function signature (if Beatoven endpoint was verified in Step 2; otherwise keep `'fal_lyria2'`):
```javascript
export async function generateMusic(moodPrompt, durationSeconds = 30, keys, supabase, model = 'beatoven') {
```

- [ ] **Step 5: Add `buildMusicPrompt()` helper**

Add this exported function above `generateMusic()`:

```javascript
/**
 * Build a rich music prompt from a framework's music config or mood label.
 * Beatoven handles detailed descriptions well — give it genre, instruments, feel.
 *
 * @param {object|string} musicConfig - framework.music object or a mood string
 * @param {string} [category] - framework category ('story' | 'fast_paced')
 * @returns {string} Rich music prompt
 */
export function buildMusicPrompt(musicConfig, category = 'story') {
  // If it's a full music config object (from expanded framework)
  if (musicConfig && typeof musicConfig === 'object' && musicConfig.moodProgression) {
    return `${musicConfig.moodProgression}. Instrumental only, no vocals.`;
  }

  // String mood label — expand it
  const mood = typeof musicConfig === 'string' ? musicConfig : '';
  if (!mood) return 'Cinematic background music with soft dynamics, instrumental only';

  const paceHint = category === 'fast_paced'
    ? 'driving rhythm, energetic pace, punchy transitions'
    : 'flowing dynamics, natural builds and releases, smooth transitions';

  return `${mood}. Instrumental only, no vocals. ${paceHint}. Suitable as background music under narration.`;
}
```

- [ ] **Step 6: Verify syntax**

Run: `node -c api/lib/pipelineHelpers.js`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add api/lib/pipelineHelpers.js
git commit -m "feat: add Beatoven music backend with Lyria 2 fallback, add buildMusicPrompt helper"
```

---

## Task 8: Assembly Validator

**Files:**
- Create: `api/lib/assemblyValidator.js`

Pre-assembly check that clips + TTS + music are temporally aligned. Catches drift before it becomes a visible problem.

- [ ] **Step 1: Create `api/lib/assemblyValidator.js`**

```javascript
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
```

- [ ] **Step 2: Verify syntax**

Run: `node -c api/lib/assemblyValidator.js`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/lib/assemblyValidator.js
git commit -m "feat: add assemblyValidator.js — pre-assembly timing validation"
```

---

## Task 9: Topic Discovery

**Files:**
- Create: `api/lib/topicDiscovery.js`
- Reference: `api/lib/getUserKeys.js` (for OpenAI key resolution)

Research-powered hook suggestions: web search + Reddit search + LLM synthesis.

- [ ] **Step 1: Create `api/lib/topicDiscovery.js`**

```javascript
/**
 * Topic Discovery — research-powered hook suggestions.
 *
 * Input: niche + framework → Output: ranked hook suggestions with source URLs.
 * Process: web search for trending content → LLM synthesis with framework hook pattern.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { logCost } from './costLogger.js';

// Niche → search query mapping for web research
const NICHE_SEARCH_QUERIES = {
  ai_tech_news: ['latest AI breakthroughs 2026', 'trending AI tools this week', 'AI news reddit'],
  finance_money: ['personal finance trending topics', 'money mistakes reddit', 'stock market news today'],
  motivation: ['motivational stories trending', 'self improvement reddit', 'life changing moments'],
  horror_creepy: ['creepiest true stories', 'unexplained mysteries reddit', 'scariest places on earth'],
  history_era: ['history facts nobody knows', 'forgotten history reddit', 'historical mysteries unsolved'],
  crime_mystery: ['unsolved crimes trending', 'true crime stories reddit', 'cold case breakthroughs'],
  science_nature: ['science discoveries this week', 'nature facts mind blowing', 'science reddit TIL'],
  dating_relationships: ['dating advice trending', 'relationship psychology reddit', 'attachment theory'],
  fitness_health: ['fitness myths debunked', 'health hacks reddit', 'workout science new research'],
  gaming: ['gaming lore hidden details', 'easter eggs reddit gaming', 'game theory trending'],
  conspiracy: ['conspiracy theories evidence', 'unexplained events reddit', 'government secrets declassified'],
  business_startup: ['startup stories viral', 'business breakdown reddit', 'entrepreneur lessons'],
  food_cooking: ['food science facts', 'cooking hacks trending', 'food history reddit'],
  travel: ['hidden travel gems 2026', 'travel hacks reddit', 'most dangerous places to visit'],
  psychology: ['psychology facts trending', 'social experiments reddit', 'cognitive biases'],
  space_cosmos: ['space discoveries 2026', 'cosmic mysteries reddit', 'NASA news this week'],
  animals_nature: ['animal superpowers facts', 'nature is metal reddit', 'animal intelligence research'],
  sports: ['sports history greatest moments', 'athlete stories reddit', 'sports statistics mind blowing'],
  education: ['things school never taught', 'education facts reddit', 'learning science research'],
  paranormal_ufo: ['UFO sightings 2026', 'paranormal evidence reddit', 'unexplained phenomena'],
};

const HookSuggestionSchema = z.object({
  suggestions: z.array(z.object({
    topic: z.string().describe('Specific, compelling topic (e.g., "Lake Natron — the lake that turns animals to stone")'),
    hookLine: z.string().describe('Opening hook sentence that stops the scroll'),
    angle: z.string().describe('Narrative angle (e.g., "mystery-reveal with scientific explanation")'),
    whyItWorks: z.string().describe('Why this topic will perform well — engagement signals, emotional triggers'),
    estimatedViralPotential: z.enum(['high', 'medium', 'low']).describe('Based on engagement signals from research'),
  })),
});

/**
 * Discover trending topics and generate ranked hook suggestions.
 *
 * @param {object} params
 * @param {string} params.niche - Niche key
 * @param {object} [params.framework] - Framework object (for hook pattern guidance)
 * @param {number} [params.count=5] - Number of suggestions
 * @param {string[]} [params.excludeTopics=[]] - Topics to avoid
 * @param {object} params.keys - { openaiKey }
 * @param {string} [params.brandUsername] - For cost logging
 * @returns {Promise<Array>} Ranked hook suggestions
 */
export async function discoverTopics({
  niche,
  framework,
  count = 5,
  excludeTopics = [],
  keys,
  brandUsername,
}) {
  if (!keys.openaiKey) throw new Error('OpenAI API key required for topic discovery');

  const openai = new OpenAI({ apiKey: keys.openaiKey });

  // ── Step 1: Gather search context ──────────────────────────────────────
  const searchQueries = NICHE_SEARCH_QUERIES[niche] || [`${niche} trending topics`, `${niche} reddit`];
  const searchContext = searchQueries.join('; ');

  // ── Step 2: LLM synthesis ─────────────────────────────────────────────
  const hookPattern = framework?.narrative?.hookPattern || 'mystery-reveal';
  const hookExamples = framework?.narrative?.hookExamples || framework?.hookExamples || [];

  const excludeBlock = excludeTopics.length > 0
    ? `\nAVOID these already-used topics:\n${excludeTopics.map(t => `- ${t}`).join('\n')}`
    : '';

  const systemPrompt = `You are a viral content researcher. Generate ${count} specific, research-backed topic suggestions for ${niche} short-form video content.

HOOK PATTERN: ${hookPattern}
${hookExamples.length > 0 ? `HOOK EXAMPLES (match this style):\n${hookExamples.map(h => `  - "${h}"`).join('\n')}` : ''}

SEARCH CONTEXT (use these as starting points for topic ideas):
${searchContext}

Each suggestion must be:
1. SPECIFIC — not vague like "money tips". Instead: "Why keeping $1000 in savings is actually losing you $47/year to inflation"
2. HOOK-FIRST — the hookLine must create an information gap that makes viewers NEED to know the answer
3. VERIFIABLE — based on real facts, events, or phenomena (not made-up scenarios)
4. STORY-CAPABLE — can be told in 30-90 seconds with a clear narrative arc
5. FRESH — not the same overused topics everyone has already covered

For estimatedViralPotential:
- "high": Combines strong emotional trigger + surprising fact + broad appeal
- "medium": Good topic but either niche or less surprising
- "low": Decent content but predictable or hard to make visually interesting
${excludeBlock}`;

  const completion = await openai.chat.completions.parse({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate ${count} viral topic suggestions for ${niche} content.` },
    ],
    response_format: zodResponseFormat(HookSuggestionSchema, 'hook_suggestions'),
    temperature: 1.0, // High creativity for diverse suggestions
  });

  const result = completion.choices[0].message.parsed;

  if (completion.usage && brandUsername) {
    logCost({
      username: brandUsername,
      category: 'openai',
      operation: 'shorts_topic_discovery',
      model: 'gpt-4.1-mini',
      input_tokens: completion.usage.prompt_tokens,
      output_tokens: completion.usage.completion_tokens,
    });
  }

  // Sort by viral potential
  const potentialOrder = { high: 0, medium: 1, low: 2 };
  const sorted = result.suggestions.sort((a, b) =>
    (potentialOrder[a.estimatedViralPotential] || 2) - (potentialOrder[b.estimatedViralPotential] || 2)
  );

  console.log(`[topicDiscovery] Generated ${sorted.length} suggestions for ${niche} (${sorted.filter(s => s.estimatedViralPotential === 'high').length} high potential)`);

  return sorted;
}
```

**Note:** This is an LLM-only implementation for now. The user's spec mentions web search + Reddit search as data sources. To add real web search, integrate with `SEARCHAPI_KEY`/`SERP_API_KEY` (already available via `getUserKeys()`). That can be a follow-up enhancement.

**Important:** This task creates a library module only — no API endpoint. To expose it to the frontend, a follow-up task must add a handler file (e.g., `api/shorts/discover-topics.js`) and register the route in `server.js`. The pipeline (Task 10) does NOT call `discoverTopics()` — topic discovery is a user-facing pre-step, not an automated pipeline step.

- [ ] **Step 2: Verify syntax**

Run: `node -c api/lib/topicDiscovery.js`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add api/lib/topicDiscovery.js
git commit -m "feat: add topicDiscovery.js — research-powered hook suggestions"
```

---

## Task 10: Pipeline Rewrite

**Files:**
- Modify: `api/lib/shortsPipeline.js` (complete rewrite of step ordering)
- Modify: `api/lib/pipelineHelpers.js` (update `assembleShort` to accept TTS duration)
- Reference: All new files from Tasks 1-9

This is the integration task. It rewires `runShortsPipeline()` to use the new TTS-first architecture with all new modules.

- [ ] **Step 1: Read the current `api/lib/shortsPipeline.js` in full**

Understand every step before modifying.

- [ ] **Step 2: Update imports at top of `shortsPipeline.js`**

Replace/add imports:

```javascript
// New imports
import { generateNarrative } from './narrativeGenerator.js';
import { directScenes } from './sceneDirector.js';
import { composePrompts, composeVideoPrompt } from './visualPromptComposer.js';
import { getWordTimestamps } from './getWordTimestamps.js';
import { alignBlocks } from './blockAligner.js';
import { validateAssemblyTiming } from './assemblyValidator.js';

// Keep these existing imports (combine pipelineHelpers into one import)
import { generateVoiceover, generateGeminiVoiceover } from './voiceoverGenerator.js';
import { burnCaptions } from './captionBurner.js';
import { generateImageV2, animateImageV2, VIDEO_MODELS } from './mediaGenerator.js';
import { solveDurations } from './durationSolver.js';  // fallback only
import { generateMusic, assembleShort, buildMusicPrompt, uploadUrlToSupabase, pollFalQueue } from './pipelineHelpers.js';
import { getVisualStyleSuffix, getImageStrategy } from './visualStyles.js';
import { getFramework } from './videoStyleFrameworks.js';
import { withRetry } from './retryHelper.js';
import { logCost } from './costLogger.js';
import { saveToLibrary } from './librarySave.js';

// Remove these imports (no longer needed):
// import { getVideoStylePrompt } from './videoStylePresets.js'; // moved to visualPromptComposer
// import { generateScript } from './scriptGenerator.js'; // replaced by narrativeGenerator
// import { extractLastFrame, extractFirstFrame } from './pipelineHelpers.js'; // no frame extraction needed
// import { getR2VEndpoint } from './modelRegistry.js'; // not used in first-last-frame approach
// import { animateImageR2V } from './mediaGenerator.js'; // not used in first-last-frame approach
```

- [ ] **Step 3: Remove `expandMusicMood()` function**

Delete the `expandMusicMood()` function (lines ~82-142). Replaced by `buildMusicPrompt()` from pipelineHelpers.

Keep `buildTtsStyleInstructions()` — it's still used as fallback when framework doesn't have `tts.styleInstructions`.

- [ ] **Step 3b: Preserve critical variable definitions**

These variables from the current pipeline MUST be preserved in the rewritten function body (they're referenced throughout):

```javascript
// After opts destructuring, before Step 0
const useGemini = !!gemini_voice;
const resolvedImageModel = image_model || (hasLoras ? 'fal_flux' : (framework?.defaults?.imageModel || undefined));
let characterRef = null;
const hasLoras = Array.isArray(loraConfigs) && loraConfigs.length > 0;
```

`visualStylePrompt` comes from the existing destructuring: `visual_style_prompt: visualStylePrompt`.

- [ ] **Step 4: Rewrite `runShortsPipeline()` step ordering**

The new step sequence:

```
Step 0: Load Framework (unchanged)
Step 1: Generate Narrative (narrativeGenerator — words only, no visual prompts)
Step 2: Generate TTS Voiceover (unchanged — single MP3)
Step 3: Extract Word Timestamps (getWordTimestamps — Whisper)
Step 4: Align Blocks (blockAligner — snap to model durations)
Step 5: Direct Scenes (sceneDirector — N+1 keyframe image prompts per boundary)
Step 6: Generate Assets (3 parallel phases):
        Phase A: Generate N+1 keyframe images (batched, concurrency 3)
        Phase B: Generate N videos via first-last-frame (ALL IN PARALLEL)
        Phase C: Music generation (parallel with A+B, only needs TTS duration)
Step 7: Validate Assembly (assemblyValidator)
Step 8: Assemble Video (assembleShort — TTS is master clock)
Step 9: Burn Captions (unchanged)
Step 10: Save Draft (unchanged)
```

**Step 1 change — Replace `generateScript()` with `generateNarrative()`:**

```javascript
// ── Step 1: Generate Narrative (words-only) ─────────────────────────────
currentStep = 'generating_narrative';
let narrativeResult;
await updateJob({ current_step: 'generating_narrative', completed_steps: 0 });

if (prebuiltScript) {
  // Handle prebuilt script — convert to narrative format
  if (typeof prebuiltScript === 'string') {
    console.log(`[shortsPipeline] Step 1: Building narrative from prebuilt text (${prebuiltScript.length} chars)`);
    narrativeResult = await generateNarrative({
      niche, topic: prebuiltScript, nicheTemplate, framework,
      targetDurationSeconds: video_length_preset, storyContext,
      keys, brandUsername: brand_username,
    });
    narrativeResult.narration_full = prebuiltScript;
  } else {
    console.log(`[shortsPipeline] Step 1: Using prebuilt script object`);
    narrativeResult = prebuiltScript;
    if (!narrativeResult.narration_full && narrativeResult.scenes) {
      narrativeResult.narration_full = narrativeResult.scenes
        .map(s => s.narration_segment || s.narration || '').filter(Boolean).join(' ');
    }
    if (!narrativeResult.title) narrativeResult.title = topic || 'Untitled Short';
    if (!narrativeResult.hook_line) narrativeResult.hook_line = narrativeResult.narration_full?.split(/[.!?]/)?.[0] || '';
  }
} else {
  console.log(`[shortsPipeline] Step 1: Generating narrative niche="${niche}" topic="${topic || 'auto'}"${framework ? ` framework="${frameworkId}"` : ''}`);
  narrativeResult = await generateNarrative({
    niche, topic, nicheTemplate, framework,
    targetDurationSeconds: video_length_preset, storyContext,
    keys, brandUsername: brand_username,
  });
}

console.log(`[shortsPipeline] Narrative: "${narrativeResult.title}" — ${narrativeResult.narration_full?.split(/\s+/).length} words`);
```

**Step 2 — TTS (unchanged in logic, uses narrativeResult instead of scriptResult):**

```javascript
// ── Step 2: Generate TTS Voiceover ──────────────────────────────────────
currentStep = 'generating_voiceover';
await updateJob({ current_step: 'generating_voiceover', completed_steps: 1 });

const fullNarration = narrativeResult.narration_full || narrativeResult.scenes
  .map(s => s.narration_segment || '').filter(Boolean).join(' ');

let voiceoverUrl = null;
const ttsStyleInstructions = framework?.tts?.styleInstructions
  || style_instructions
  || buildTtsStyleInstructions(framework?.ttsPacing);

if (useGemini) {
  voiceoverUrl = await withRetry(
    () => generateGeminiVoiceover(fullNarration, keys, supabase, {
      voice: gemini_voice || framework?.tts?.defaultVoice || 'Kore',
      model: gemini_model || 'gemini-2.5-flash-tts',
      styleInstructions: ttsStyleInstructions,
    }),
    { maxAttempts: 2, baseDelayMs: 3000 }
  );
} else {
  voiceoverUrl = await withRetry(
    () => generateVoiceover(fullNarration, keys, supabase, { voiceId }),
    { maxAttempts: 2, baseDelayMs: 3000 }
  );
}
```

**Step 3 — NEW: Word Timestamps:**

```javascript
// ── Step 3: Extract Word Timestamps ─────────────────────────────────────
currentStep = 'analyzing_voiceover';
await updateJob({ current_step: 'analyzing_voiceover', completed_steps: 2 });

let wordTimestamps = null;
let ttsDuration = video_length_preset;

try {
  console.log('[shortsPipeline] Step 3: Extracting word timestamps via Whisper...');
  const tsResult = await withRetry(
    () => getWordTimestamps(voiceoverUrl, keys.falKey),
    { maxAttempts: 2, baseDelayMs: 3000 }
  );
  wordTimestamps = tsResult.words;
  ttsDuration = tsResult.totalDuration;
  console.log(`[shortsPipeline] Whisper: ${tsResult.wordCount} words, ${ttsDuration.toFixed(1)}s total`);
  logCost({ username: brand_username, category: 'fal', operation: 'shorts_whisper_timestamps', model: 'whisper-v3', metadata: { word_count: tsResult.wordCount } });
} catch (whisperErr) {
  console.warn(`[shortsPipeline] Whisper failed, using framework durations: ${whisperErr.message}`);
}
```

**Step 4 — NEW: Block Alignment:**

```javascript
// ── Step 4: Align Blocks ────────────────────────────────────────────────
currentStep = 'aligning_blocks';
await updateJob({ current_step: 'aligning_blocks', completed_steps: 3 });

const frameworkScenes = framework?.sceneStructure[video_length_preset]
  || framework?.sceneStructure[framework?.supportedDurations[0]]
  || null;

let alignedBlocks;

if (wordTimestamps && wordTimestamps.length > 0) {
  // TTS-first path
  console.log(`[shortsPipeline] Step 4: Aligning blocks (TTS-first, model=${videoModel})`);
  const alignment = alignBlocks(wordTimestamps, ttsDuration, videoModel || 'fal_veo3', frameworkScenes);
  alignedBlocks = alignment.blocks;
  console.log(`[shortsPipeline] ${alignedBlocks.length} blocks, ${alignment.totalClipDuration}s clips, drift ${alignment.drift.toFixed(1)}s`);
} else {
  // Fallback: use old duration solver
  console.log('[shortsPipeline] Step 4: Fallback — using framework durations');
  const durationRanges = frameworkScenes?.map(s => s.durationRange) || [[4, 8]];
  const lockedDurations = solveDurations(video_length_preset, durationRanges, videoModel || 'fal_veo3');
  alignedBlocks = lockedDurations.map((dur, i) => ({
    clipDuration: dur,
    startTime: lockedDurations.slice(0, i).reduce((a, b) => a + b, 0),
    endTime: lockedDurations.slice(0, i + 1).reduce((a, b) => a + b, 0),
    narration: narrativeResult.scenes?.[i]?.narration_segment || '',
    frameworkLabel: frameworkScenes?.[i]?.label || null,
    frameworkBeat: frameworkScenes?.[i]?.beat || null,
  }));
}
```

**Step 5 — NEW: Scene Direction (Keyframe Prompts):**

```javascript
// ── Step 5: Direct Scenes (keyframe image prompts per boundary) ─────────
currentStep = 'directing_scenes';
await updateJob({ current_step: 'directing_scenes', completed_steps: 4 });

const sceneCount = alignedBlocks.length;
console.log(`[shortsPipeline] Step 5: Generating ${sceneCount + 1} keyframe prompts for ${sceneCount} scenes`);
const { keyframes } = await directScenes({
  narrative: narrativeResult,
  alignedBlocks,
  framework,
  visualStyle,
  visualStylePrompt,
  videoStyle,
  visualDirections: null,
  keys,
  brandUsername: brand_username,
});
// keyframes.length === sceneCount + 1
// keyframes[i].imagePrompt = frozen moment image prompt
// keyframes[i].motionHint = what happens between keyframe[i] and keyframe[i+1]
```

**Step 6 — Parallel Keyframe Images + Parallel First-Last-Frame Videos + Parallel Music:**

This is the core architectural change. Three phases run with maximum parallelism:
- Phase A: Generate N+1 keyframe images (batched, concurrency 2-3)
- Phase B: Generate N videos via first-last-frame — ALL fired simultaneously
- Phase C: Music generation runs parallel with Phases A and B

```javascript
// ── Step 6: Generate Assets (parallel keyframes → parallel videos + music) ──
currentStep = 'generating_assets';
await updateJob({ current_step: 'generating_assets', completed_steps: 5 });

// ── Phase C: Launch music immediately (only needs TTS duration, fully independent) ──
const musicMoodPrompt = buildMusicPrompt(
  framework?.music || framework?.musicMood || nicheTemplate?.music_mood,
  framework?.category
);
const musicPromise = enableBackgroundMusic
  ? withRetry(
      () => generateMusic(musicMoodPrompt, Math.ceil(ttsDuration) + 3, keys, supabase, 'beatoven'),
      { maxAttempts: 2, baseDelayMs: 5000 }
    ).catch(err => { console.warn('[shortsPipeline] Music failed:', err.message); return null; })
  : Promise.resolve(null);

// ── Phase A: Generate N+1 keyframe images (batched, concurrency 2-3) ──
console.log(`[shortsPipeline] Phase A: Generating ${keyframes.length} keyframe images (batched)`);
const BATCH_SIZE = 3;
const keyframeImageUrls = new Array(keyframes.length).fill(null);

for (let batchStart = 0; batchStart < keyframes.length; batchStart += BATCH_SIZE) {
  const batchEnd = Math.min(batchStart + BATCH_SIZE, keyframes.length);
  const batchPromises = [];

  for (let k = batchStart; k < batchEnd; k++) {
    const kf = keyframes[k];

    // Use starting_image for keyframe 0 if provided
    if (k === 0 && starting_image) {
      batchPromises.push(Promise.resolve(starting_image));
      continue;
    }

    // Compose the final image prompt with visual style
    const { imagePrompt: composedPrompt } = composePrompts({
      sceneDirection: { imagePrompt: kf.imagePrompt, motionPrompt: kf.motionHint },
      visualStyle,
      visualStylePrompt,
      frameworkDefaults: framework?.sceneDefaults,
      aspectRatio,
      loraConfigs,
      isFirstScene: k === 0,
      frameChain: false, // Not relevant for keyframe generation
    });

    batchPromises.push(
      withRetry(
        () => generateImageV2(resolvedImageModel || 'fal_flux', composedPrompt, aspectRatio, keys, supabase, {
          loras: (loraConfigs || []).filter(c => c.loraUrl).map(c => ({ path: c.loraUrl, scale: c.scale ?? 1.0 })),
        }),
        { maxAttempts: 2, baseDelayMs: 2000 }
      ).catch(err => {
        console.error(`[shortsPipeline] Keyframe ${k} image failed: ${err.message}`);
        return null;
      })
    );
  }

  const batchResults = await Promise.allSettled(batchPromises);
  for (let j = 0; j < batchResults.length; j++) {
    const idx = batchStart + j;
    keyframeImageUrls[idx] = batchResults[j].status === 'fulfilled' ? batchResults[j].value : null;
  }

  console.log(`[shortsPipeline] Keyframe images batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: ${batchResults.filter(r => r.status === 'fulfilled' && r.value).length}/${batchResults.length} succeeded`);
}

// Set characterRef from first keyframe image
characterRef = keyframeImageUrls[0];

// Checkpoint keyframe images
await updateJob({
  step_results: {
    keyframe_images: keyframeImageUrls.map((url, i) => ({ index: i, url, prompt: keyframes[i].imagePrompt })),
  },
});

// ── Phase B: Generate N videos via first-last-frame (ALL IN PARALLEL) ──
// Determine if the selected model supports first-last-frame
// Models that support first-last-frame video generation:
// - Veo 3.1: separate endpoint (fal-ai/veo3.1/fast/first-last-frame-to-video)
// - Kling O3/V3: same I2V endpoint with `end_image_url` parameter
const FIRST_LAST_FRAME_MODELS = ['fal_veo3', 'fal_kling_o3', 'fal_kling_v3'];
const useFirstLastFrame = FIRST_LAST_FRAME_MODELS.includes(videoModel || 'fal_veo3');

const sceneAssets = [];
const clips = [];

if (useFirstLastFrame) {
  // ── PARALLEL FIRST-LAST-FRAME PATH ──
  console.log(`[shortsPipeline] Phase B: Firing ${sceneCount} first-last-frame videos IN PARALLEL (model=${videoModel})`);

  // Two API formats for first-last-frame:
  // 1. Veo 3.1: separate endpoint (fal-ai/veo3.1/fast/first-last-frame-to-video)
  //    - duration: '4s' | '6s' | '8s'
  //    - params: first_frame_url, last_frame_url
  // 2. Kling O3/V3: same I2V endpoint with end_image_url parameter
  //    - duration: '3' through '15' (string number)
  //    - params: image_url (first), end_image_url (last)
  const isVeo = (videoModel || 'fal_veo3') === 'fal_veo3';
  const veoDuration = (dur) => dur <= 4 ? '4s' : dur <= 6 ? '6s' : '8s';
  const klingDuration = (dur) => String(Math.max(3, Math.min(15, Math.round(dur))));

  // Fire ALL video generation requests simultaneously
  const videoPromises = alignedBlocks.map((block, i) => {
    const firstImg = keyframeImageUrls[i];
    const lastImg = keyframeImageUrls[i + 1];

    if (!firstImg || !lastImg) {
      console.warn(`[shortsPipeline] Scene ${i + 1}: missing keyframe image (first=${!!firstImg}, last=${!!lastImg}), skipping`);
      return Promise.resolve(null);
    }

    const motionPrompt = keyframes[i].motionHint || 'Smooth cinematic transition';
    const { motionPrompt: composedMotion } = composePrompts({
      sceneDirection: { imagePrompt: keyframes[i].imagePrompt, motionPrompt },
      visualStyle,
      visualStylePrompt,
      frameworkDefaults: framework?.sceneDefaults,
      aspectRatio,
      loraConfigs,
      isFirstScene: i === 0,
      frameChain: false,
    });

    const prompt = composedMotion || motionPrompt;

    // Build request body based on model type
    let endpoint, body;
    if (isVeo) {
      endpoint = 'fal-ai/veo3.1/fast/first-last-frame-to-video';
      body = {
        prompt,
        first_frame_url: firstImg,
        last_frame_url: lastImg,
        aspect_ratio: aspectRatio || '9:16',
        duration: veoDuration(block.clipDuration),
        resolution: '720p',
        generate_audio: false,
        safety_tolerance: '6',
        auto_fix: true,
      };
    } else {
      // Kling O3/V3 — uses existing I2V endpoint with end_image_url
      // Look up endpoint from model registry (e.g., 'fal-ai/kling-video/o3/pro/image-to-video')
      const model = VIDEO_MODELS[videoModel];
      endpoint = model?.endpoint || 'fal-ai/kling-video/o3/pro/image-to-video';
      body = {
        prompt,
        image_url: firstImg,
        end_image_url: lastImg,  // This activates first-last-frame mode
        aspect_ratio: aspectRatio || '9:16',
        duration: klingDuration(block.clipDuration),
        generate_audio: false,
      };
    }

    return withRetry(async () => {
      // Submit to FAL queue
      const submitRes = await fetch(`https://queue.fal.run/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${keys.falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!submitRes.ok) {
        const errText = await submitRes.text();
        throw new Error(`FLF submit failed (scene ${i + 1}, ${videoModel}): ${errText}`);
      }
      const { request_id } = await submitRes.json();

      // Poll for completion
      const result = await pollFalQueue(endpoint, request_id, keys.falKey);
      const videoUrl = result?.video?.url;
      if (!videoUrl) throw new Error(`No video URL in FLF result for scene ${i + 1}`);

      // Upload to Supabase (FAL CDN URLs are temporary)
      return uploadUrlToSupabase(videoUrl, supabase, 'pipeline/scenes');
    }, { maxAttempts: 2, baseDelayMs: 5000 }).catch(err => {
      console.error(`[shortsPipeline] Scene ${i + 1} first-last-frame failed: ${err.message}`);
      return null;
    });
  });

  // Wait for ALL videos to complete (they're all running in parallel)
  const videoResults = await Promise.allSettled(videoPromises);

  for (let i = 0; i < alignedBlocks.length; i++) {
    const block = alignedBlocks[i];
    const clipUrl = videoResults[i].status === 'fulfilled' ? videoResults[i].value : null;

    clips.push({
      url: clipUrl,
      firstFrameUrl: keyframeImageUrls[i],      // Already have these — no extraction needed
      lastFrameUrl: keyframeImageUrls[i + 1],    // Already have these — no extraction needed
      imageUrl: keyframeImageUrls[i],
    });

    sceneAssets.push({
      image_url: keyframeImageUrls[i],
      video_url: clipUrl,
      first_frame_url: keyframeImageUrls[i],
      last_frame_url: keyframeImageUrls[i + 1],
      voiceover_url: voiceoverUrl,
      clip_duration: block.clipDuration,
      start_time: block.startTime, end_time: block.endTime,
      narration: block.narration, framework_label: block.frameworkLabel,
    });
  }

  console.log(`[shortsPipeline] Phase B complete: ${clips.filter(c => c.url).length}/${sceneCount} videos generated`);

} else {
  // ── FALLBACK: Sequential I2V for models without first-last-frame ──
  console.log(`[shortsPipeline] Phase B (fallback): Sequential I2V — model ${videoModel} does not support first-last-frame`);

  for (let i = 0; i < alignedBlocks.length; i++) {
    const block = alignedBlocks[i];
    currentSceneIndex = i;

    const imageUrl = keyframeImageUrls[i]; // Use keyframe image as the source frame
    let clipUrl = null;

    try {
      const motionPrompt = keyframes[i].motionHint || 'Smooth cinematic movement';
      const { motionPrompt: composedMotion } = composePrompts({
        sceneDirection: { imagePrompt: keyframes[i].imagePrompt, motionPrompt },
        visualStyle, visualStylePrompt,
        frameworkDefaults: framework?.sceneDefaults,
        aspectRatio, loraConfigs,
        isFirstScene: i === 0, frameChain: false,
      });

      const fullPrompt = composeVideoPrompt(keyframes[i].imagePrompt, composedMotion || motionPrompt);

      currentModel = videoModel;
      clipUrl = await withRetry(
        () => animateImageV2(videoModel || 'fal_kling', imageUrl, fullPrompt, aspectRatio, block.clipDuration, keys, supabase, {
          loras: loraConfigs, generate_audio: false,
        }),
        { maxAttempts: 2, baseDelayMs: 5000 }
      );
    } catch (sceneErr) {
      console.error(`[shortsPipeline] Scene ${i + 1} I2V fallback failed: ${sceneErr.message}`);
    }

    clips.push({
      url: clipUrl,
      firstFrameUrl: keyframeImageUrls[i],
      lastFrameUrl: keyframeImageUrls[i + 1],
      imageUrl: keyframeImageUrls[i],
    });

    sceneAssets.push({
      image_url: keyframeImageUrls[i],
      video_url: clipUrl,
      first_frame_url: keyframeImageUrls[i],
      last_frame_url: keyframeImageUrls[i + 1],
      voiceover_url: voiceoverUrl,
      clip_duration: block.clipDuration,
      start_time: block.startTime, end_time: block.endTime,
      narration: block.narration, framework_label: block.frameworkLabel,
    });

    console.log(`[shortsPipeline] Scene ${i + 1}/${sceneCount} complete (I2V fallback)`);
  }
}

// Checkpoint all scene assets
await updateJob({
  step_results: Object.fromEntries(
    sceneAssets.map((s, idx) => [`scene_${idx}`, { ...s, completed_at: new Date().toISOString() }])
  ),
});

// Await music (ran in parallel with everything above)
const musicUrl = await musicPromise;
```

**Step 7 — NEW: Assembly Validation:**

```javascript
// ── Step 7: Validate Assembly Timing ────────────────────────────────────
currentStep = 'validating_assembly';
await updateJob({ current_step: 'validating_assembly', completed_steps: 7 });

const validClips = clips.filter(c => c.url);
if (validClips.length === 0) throw new Error('All scenes failed — no video clips generated');

const validation = validateAssemblyTiming({
  sceneResults: sceneAssets.map(s => ({ clipDuration: s.clip_duration, videoUrl: s.video_url })),
  ttsAudioDuration: ttsDuration,
  musicDuration: null, // We don't know music duration precisely; Beatoven targets it
});

if (!validation.valid) {
  console.warn(`[shortsPipeline] Assembly validation issues: ${validation.issues.join('; ')}`);
  // Log but don't block — the assembler will handle mild drift
}
```

**Steps 8-10 — Assemble, Caption, Save (mostly unchanged):**

Update the `assembleShort` call to pass TTS duration:

```javascript
// ── Step 8: Assemble Video ──────────────────────────────────────────────
const clipDurations = alignedBlocks.map(b => b.clipDuration);
const validClipUrls = clips.filter(c => c.url).map(c => c.url);
assembledVideoUrl = await assembleShort(validClipUrls, voiceoverUrl, musicUrl, keys.falKey, supabase, clipDurations, effectiveMusicVolume, ttsDuration);
```

Update the draft insert to include new metadata:

```javascript
storyboard_json: {
  scenes: alignedBlocks,  // Preserves field for ShortsDraftPage.jsx compatibility
},
shorts_metadata_json: {
  narrative: narrativeResult,  // renamed from 'script'
  script: narrativeResult,     // backward compat alias — ShortsDraftPage may reference this
  scenes: alignedBlocks,       // aligned blocks with timing
  keyframes: keyframes.map((kf, i) => ({
    imagePrompt: kf.imagePrompt,
    motionHint: kf.motionHint,
    imageUrl: keyframeImageUrls[i],
  })),
  hashtags: narrativeResult.hashtags,
  niche, topic,
  visual_style: visualStyle,
  video_style: videoStyle,
  video_model: videoModel,
  voice_id: voiceId,
  gemini_voice: gemini_voice || null,
  caption_config: effectiveCaptionConfig,
  music_url: musicUrl,
  framework: frameworkId || null,
  music_volume: effectiveMusicVolume,
  tts_duration: ttsDuration,
  pipeline_version: 'v3',
  generation_mode: useFirstLastFrame ? 'first-last-frame' : 'i2v-fallback',
},
```

- [ ] **Step 5: Update `assembleShort` in `pipelineHelpers.js` to accept `ttsDuration`**

Add `ttsDuration = null` parameter:

```javascript
export async function assembleShort(videoUrls, voiceoverUrl, musicUrl, falKey, supabase, clipDurations = [], musicVolume = 0.15, ttsDuration = null) {
  // ... existing validation ...

  // Build video keyframes (unchanged)
  let runningTimestamp = 0;
  const videoKeyframes = videoUrls.map((url, i) => {
    const durationMs = (clipDurations[i] || 8) * 1000;
    const kf = { url, timestamp: runningTimestamp, duration: durationMs };
    runningTimestamp += durationMs;
    return kf;
  });

  // Master duration: TTS duration if provided, otherwise sum of clips
  const totalDurationMs = ttsDuration
    ? Math.ceil(ttsDuration * 1000)
    : runningTimestamp;

  // ... rest unchanged (tracks, fetch, poll) ...
}
```

- [ ] **Step 6: Verify syntax of all modified files**

Run: `node -c api/lib/shortsPipeline.js && node -c api/lib/pipelineHelpers.js`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add api/lib/shortsPipeline.js api/lib/pipelineHelpers.js
git commit -m "feat: rewrite shorts pipeline — TTS-first, parallel first-last-frame video, keyframe images, Beatoven music"
```

---

## Task 11: Integration Verification

**Files:**
- All files from Tasks 1-10

- [ ] **Step 1: Full syntax check on all new and modified files**

Run:
```bash
node -c api/lib/narrativeGenerator.js && \
node -c api/lib/sceneDirector.js && \
node -c api/lib/visualPromptComposer.js && \
node -c api/lib/getWordTimestamps.js && \
node -c api/lib/blockAligner.js && \
node -c api/lib/topicDiscovery.js && \
node -c api/lib/assemblyValidator.js && \
node -c api/lib/shortsPipeline.js && \
node -c api/lib/pipelineHelpers.js && \
node -c api/lib/durationSolver.js && \
node -c api/lib/videoStyleFrameworks.js
```
Expected: All pass with no errors

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Server startup check**

Run: `npm run server`
Expected: Server starts on port 3003 without import errors or crashes. Kill after confirming startup.

- [ ] **Step 4: Verify backward compatibility**

Check that these existing callers still work:
- `api/campaigns/create.js` calls `runShortsPipeline()` — verify the parameter interface hasn't broken
- `api/shorts/reassemble.js` calls `assembleShort()` — verify the new `ttsDuration` param defaults to `null`
- `api/shorts/repair-scene.js` — verify it still works (doesn't use the pipeline directly)

Run: `node -c api/campaigns/create.js && node -c api/shorts/reassemble.js && node -c api/shorts/repair-scene.js`
Expected: All pass

- [ ] **Step 5: Commit integration verification**

```bash
git add api/lib/ api/campaigns/
git commit -m "chore: verify TTS-first pipeline v3 integration — all syntax checks pass"
```

---

## Edge Cases

1. **Whisper fails:** Falls back to old duration solver approach. The pipeline degrades gracefully to V2 behavior.

2. **Very short TTS (< 10s):** Block aligner may produce only 1-2 blocks. This is fine — the video will just be shorter.

3. **Beatoven fails:** Falls back to Lyria 2 automatically (handled in Task 7).

4. **More blocks than script scenes:** Scene director handles this — it maps proportionally.

5. **Many short clips (Veo 4/6/8s on 60s video = ~8-10 blocks):** All blocks generate in parallel via first-last-frame. N+1 keyframe images are batched (concurrency 3), then N videos fire simultaneously. No sequential bottleneck.

6. **No framework selected:** Falls back to niche template defaults. Block aligner uses fallback durations. Scene director uses generic defaults.

7. **Prebuilt script object passed in:** Converted to narrative format. TTS-first path still applies — the prebuilt narration gets timestamped and block-aligned.

8. **Model without first-last-frame support:** Falls back to sequential I2V using keyframe images as source frames. Same keyframe images, same prompts — just animated one at a time via `animateImageV2`. The `FIRST_LAST_FRAME_MODELS` array controls which models get the parallel path.

9. **Keyframe image generation failure:** If a keyframe image fails, the corresponding video(s) that use it as first/last frame are skipped. The pipeline continues with available clips. A 60s video losing 1-2 scenes is still usable.

10. **Kling first-last-frame:** Kling O3/V3 support first-last-frame on FAL.ai using the same I2V endpoint with an `end_image_url` parameter — no separate endpoint needed. The pipeline handles both Veo (separate endpoint, `first_frame_url`/`last_frame_url`) and Kling (same endpoint, `image_url`/`end_image_url`) API formats. Kling accepts durations `"3"` through `"15"` (string numbers) vs Veo's `'4s'`/`'6s'`/`'8s'`. Also available on Wavespeed via `kwaivgi/kling-v2.1-i2v-pro/start-end-frame`.
