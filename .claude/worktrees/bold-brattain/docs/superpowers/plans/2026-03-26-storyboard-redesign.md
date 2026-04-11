# Storyboard Planner Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Storyboard Planner wizard from a 7-step disconnected flow into a streamlined 8-step flow where all creative inputs are collected before AI scene generation, with proper frame chaining and video assembly.

**Architecture:** The wizard collects all inputs (mood, visual style, video style, model, starting image, characters, scene direction) before generating the scene script. Scene generation uses all inputs to produce coherent prompts. Video generation uses `extractLastFrame` + `analyzeFrameContinuity` from pipelineHelpers for frame chaining. Final assembly uses `fal-ai/ffmpeg-api/compose` (same as Shorts pipeline). The Story Builder chat step is removed entirely.

**Tech Stack:** React 18, Express, Supabase, FAL.ai (ffmpeg-api, extract-frame, auto-subtitle), OpenAI (GPT-4.1 mini for scene generation + vision analysis)

**Spec:** Agreed in conversation — no separate spec document. See `docs/superpowers/plans/2026-03-26-storyboard-redesign.md` (this file) for the authoritative plan.

**No test runner is configured.** Steps that say "verify" mean: run `npm run build` to check for compile errors, or start the dev server (`npm run start`) and test manually.

---

## New Wizard Flow (8 Steps)

| Step | Key | Label | What happens |
|------|-----|-------|-------------|
| 1 | `story` | Story & Mood | Name, desired length (not scene count), duration/scene, aspect ratio, resolution, audio, mood, brand |
| 2 | `style` | Visual Style | 124 style presets + Style/Lighting/Color Grade pills |
| 3 | `video-style` | Video Style | 62 motion/cinematography presets |
| 4 | `model` | Model | Single global model choice — drives Characters UI |
| 5 | `inputs` | Creative Inputs | 5a: Starting image, 5b: Characters (model-dependent), 5c: Global scene direction pills |
| 6 | `script` | Generate Script | AI generates scene prompts using ALL prior inputs |
| 7 | `review` | Review Scenes | View/edit generated scene prompts before committing |
| 8 | `generate` | Generate | Sequential video generation with frame chaining + assembly |

---

## File Map

### Files to Delete
| File | Reason |
|------|--------|
| `src/components/storyboard/StoryChat.jsx` (220 lines) | Story Builder chat removed |
| `api/storyboard/story-chat.js` (151 lines) | Backend for removed chat |

### Files to Modify (Major)
| File | Lines | Changes |
|------|-------|---------|
| `src/components/modals/StoryboardPlannerWizard.jsx` | 1623 | Complete rewrite — 8-step flow, remove chat, add model step, add script/review steps, add assembly |
| `api/storyboard/generate-scenes.js` | 184 | Accept new params (desiredLength, model constraints, visual/video style prompts, scene pills, characters), AI-determined scene count |
| `server.js` | 928 | Remove story-chat route (line 430-434), add assembly endpoint route |

### Files to Modify (Minor)
| File | Lines | Changes |
|------|-------|---------|
| `src/components/storyboard/SceneCard.jsx` | 321 | Remove per-scene model selector, simplify to prompt display/edit for review step |
| `src/components/storyboard/SceneModelSelector.jsx` | 93 | Repurpose as global model selector (remove per-scene wiring) |
| `src/components/storyboard/GenerateScene.jsx` | 132 | Update to use global model, remove V2V refine button |

### Files to Create
| File | Responsibility |
|------|---------------|
| `api/storyboard/assemble.js` | Storyboard video assembly endpoint — stitches scenes via ffmpeg-api/compose, optional captions |
| `src/components/storyboard/ReviewScene.jsx` | Scene review card with editable visual/motion prompts and narrative note |
| `src/components/storyboard/InputsStep.jsx` | Combined step component for starting image + characters + scene pills |

### Files Unchanged (Referenced)
| File | Used For |
|------|----------|
| `api/lib/pipelineHelpers.js` | `extractLastFrame()` (line 472), `analyzeFrameContinuity()` (line 509), `assembleShort()` (line 338), `pollFalQueue()` (line 56) |
| `api/storyboard/describe-scene.js` | Starting image analysis (unchanged) |
| `api/jumpstart/generate.js` | Video generation dispatch (unchanged) |
| `api/jumpstart/result.js` | Async polling (unchanged) |
| `src/components/storyboard/CharactersKling.jsx` | @Element UI (unchanged, imported by InputsStep) |
| `src/components/storyboard/CharactersVeo.jsx` | Veo reference UI (unchanged, imported by InputsStep) |
| `src/components/ui/StyleGrid.jsx` | Visual style picker (unchanged) |
| `src/lib/stylePresets.js` | `getPromptText()` (line 249), `STYLE_CATEGORIES` |
| `api/lib/captionBurner.js` | `burnCaptions()` for optional post-assembly captions |

---

## Task Dependency Graph

```
Task 1 (Cleanup: remove story-chat) ────────────────── Independent
Task 2 (Backend: enhance generate-scenes) ──────────── Independent
Task 3 (Backend: assembly endpoint) ────────────────── Independent
Task 4 (Frontend: ReviewScene component) ───────────── Independent
Task 5 (Frontend: InputsStep component) ────────────── Independent
Task 6 (Frontend: Wizard rewrite) ◄─────────────────── Needs Tasks 1-5
Task 7 (Server routes + wiring) ◄───────────────────── Needs Tasks 1-3
Task 8 (Integration verification) ◄─────────────────── Needs all tasks
```

**Parallelizable:** Tasks 1, 2, 3, 4, 5 can all run concurrently. Task 6 needs Tasks 1-5. Task 7 needs Tasks 1-3.

---

## Task 1: Cleanup — Remove Story Chat

**Files:**
- Delete: `src/components/storyboard/StoryChat.jsx`
- Delete: `api/storyboard/story-chat.js`
- Modify: `server.js:430-434`

- [ ] **Step 1: Delete StoryChat frontend component**

```bash
rm src/components/storyboard/StoryChat.jsx
```

- [ ] **Step 2: Delete story-chat backend handler**

```bash
rm api/storyboard/story-chat.js
```

- [ ] **Step 3: Remove route from server.js**

In `server.js`, remove lines 430-434 (the `/api/storyboard/story-chat` route):

```javascript
// DELETE this block:
app.post('/api/storyboard/story-chat', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('storyboard/story-chat.js');
  return handler(req, res);
});
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build WILL fail because StoryboardPlannerWizard statically imports StoryChat (line 44). You MUST also:
1. Comment out `import StoryChat from '../storyboard/StoryChat';` (line 44 of StoryboardPlannerWizard.jsx)
2. Comment out or delete the `{step === 'story-chat' ...}` render block (lines 1211-1244)
3. Remove `'story-chat'` from the WIZARD_STEPS array entry (line 68)
4. Remove story-chat related state: `storyBeats`, `storyTitle`, `storyChatOverview`, `chatHistory`

After these changes, build should succeed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove Story Builder chat from Storyboard Planner

The conversational story builder step was disconnected from the rest of the
wizard — extracted beats just pre-filled text fields. Removing it simplifies
the flow. Scene generation now happens after all creative inputs are collected.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Backend — Enhance generate-scenes.js

**Files:**
- Modify: `api/storyboard/generate-scenes.js` (184 lines — significant rewrite)

The scene generator needs to accept ALL creative inputs and determine scene count from desired total length + per-scene duration, rather than accepting a fixed `numScenes`.

- [ ] **Step 1: Read current `api/storyboard/generate-scenes.js` thoroughly**

Note the current Zod schema (lines 28-40), request params (lines 54-68), and the GPT prompt structure (lines 116-144).

- [ ] **Step 2: Update the request parameter extraction**

Replace the params block (lines 54-68) with:

```javascript
const {
  // Story & Mood (Step 1)
  storyboardName,
  desiredLength = 60,           // Total target length in seconds (replaces numScenes)
  defaultDuration = 5,          // Hint for per-scene duration
  overallMood,
  aspectRatio = '16:9',

  // Visual Style (Step 2)
  style = 'cinematic',
  visualStylePrompt,            // Full prompt text from getPromptText()
  builderStyle,                 // Manual style pill
  builderLighting,              // Manual lighting pill
  builderColorGrade,            // Manual color grade pill

  // Video Style (Step 3)
  videoStylePrompt,             // Full ~150-word cinematography prompt from video style preset

  // Model (Step 4)
  globalModel,                  // e.g. 'veo3', 'kling-r2v-pro', 'seedance-pro'
  modelDurationConstraints,     // { min, max, allowed[] } — valid durations for chosen model

  // Starting Image (Step 5a)
  hasStartFrame,
  startFrameDescription,        // From describe-scene analysis

  // Characters (Step 5b)
  elements,                     // @Element descriptions for Kling R2V
  veoReferenceCount,            // Number of Veo reference images (for prompt awareness)

  // Scene Direction Pills (Step 5c)
  sceneDirection,               // { environment, environmentDetail, actionType, expression, lighting, cameraAngle, cameraMovement }

  // Brand
  props,
  negativePrompt,
  brandStyleGuide,

  // Legacy compat
  description,
  storyBeats,
  numScenes,
  sceneGuides,
} = req.body;
```

- [ ] **Step 3: Add scene count calculation from desired length**

After the params block, add:

```javascript
// Determine scene count from desired total length and per-scene duration
let targetSceneCount;
if (numScenes) {
  // Legacy: explicit scene count provided
  targetSceneCount = numScenes;
} else {
  // New: calculate from desired length ÷ average scene duration
  // Respect model duration constraints if provided
  const avgDuration = modelDurationConstraints?.allowed
    ? modelDurationConstraints.allowed[Math.floor(modelDurationConstraints.allowed.length / 2)]
    : defaultDuration;
  targetSceneCount = Math.max(2, Math.min(12, Math.round(desiredLength / avgDuration)));
}
```

- [ ] **Step 4: Update the GPT system prompt to include all creative inputs**

Replace the system prompt block (lines 116-144) with:

```javascript
// Build context blocks
const storyContext = storyBeats?.length
  ? `STORY BEATS:\n${storyBeats.map((b, i) => `Scene ${i + 1}: ${b.summary} — Setting: ${b.setting}, Action: ${b.keyAction}, Emotion: ${b.emotion}`).join('\n')}`
  : description
    ? `STORY OVERVIEW:\n${description}`
    : `STORYBOARD: "${storyboardName || 'Untitled'}"`;

const startFrameBlock = hasStartFrame && startFrameDescription
  ? `\nSTARTING IMAGE ANALYSIS (Scene 1 must match this exactly):\n${startFrameDescription}`
  : '';

const elementBlock = elements?.length
  ? `\nCHARACTER REFERENCES:\n${elements.map(e => `@Element${e.index}: ${e.description}`).join('\n')}\nYou MUST reference these @Element placeholders in visualPrompt for every scene where the character appears.`
  : '';

const veoRefBlock = veoReferenceCount > 0
  ? `\nREFERENCE IMAGES: ${veoReferenceCount} reference images are provided for subject consistency. Describe the subject consistently across all scenes.`
  : '';

// sceneDirection arrays from frontend: { environment: [], action: [], expression: [], lighting: [], camera: [] }
const directionBlock = sceneDirection
  ? `\nGLOBAL SCENE DIRECTION:${
    sceneDirection.environment?.length ? `\n- Environment: ${sceneDirection.environment.join(', ')}` : ''
  }${sceneDirection.action?.length ? `\n- Action type: ${sceneDirection.action.join(', ')}` : ''
  }${sceneDirection.expression?.length ? `\n- Expression: ${sceneDirection.expression.join(', ')}` : ''
  }${sceneDirection.lighting?.length ? `\n- Lighting: ${sceneDirection.lighting.join(', ')}` : ''
  }${sceneDirection.camera?.length ? `\n- Camera movement: ${sceneDirection.camera.join(', ')}` : ''
  }`
  : '';

const styleBlock = [
  visualStylePrompt ? `Visual style: ${visualStylePrompt}` : (style ? `Visual style: ${style}` : ''),
  builderStyle ? `Aesthetic: ${builderStyle}` : '',
  builderLighting ? `Lighting: ${builderLighting}` : '',
  builderColorGrade ? `Color grade: ${builderColorGrade}` : '',
  videoStylePrompt ? `Cinematography: ${videoStylePrompt}` : '',
].filter(Boolean).join('\n');

const propsBlock = props?.length ? `\nINCLUDE NATURALLY: ${props.join(', ')}` : '';
const negBlock = negativePrompt ? `\nAVOID: ${negativePrompt}` : '';
const brandBlock = brandStyleGuide ? `\nBRAND GUIDELINES:\n${buildBrandStyleContext(brandStyleGuide)}` : '';

// Model duration info
const durationBlock = modelDurationConstraints
  ? `\nMODEL CONSTRAINTS: Each scene duration MUST be one of: ${modelDurationConstraints.allowed.join(', ')} seconds. Do not use other values.`
  : `\nTarget ${defaultDuration}s per scene (${desiredLength}s total).`;

const systemPrompt = `You are a visual storyboard director. Generate exactly ${targetSceneCount} scenes for a ${desiredLength}-second video storyboard.

${storyContext}
${startFrameBlock}
${elementBlock}
${veoRefBlock}

VISUAL DIRECTION:
${styleBlock}
${directionBlock}
${propsBlock}
${negBlock}
${brandBlock}
${durationBlock}
Overall mood: ${overallMood || 'cinematic'}
Aspect ratio: ${aspectRatio}

RULES:
- Each visualPrompt: 60-100 words, dense visual description for AI image/video generation.
- Each motionPrompt: camera movement, action choreography, pacing.
- Scene 1 MUST match the starting image analysis if provided.
- Maintain visual continuity between scenes — consistent environment, lighting, character appearance.
- No text, typography, logos, or watermarks in visual prompts.
- narrativeNote: 1-sentence summary of what this scene accomplishes in the story.
${elements?.length ? '- Use @Element1, @Element2 etc. placeholders in visualPrompt for character references.' : ''}
${sceneGuides?.length ? `\nPER-SCENE OVERRIDES (take priority over global direction):\n${sceneGuides.map((sg, i) => `Scene ${i + 1}: ${sg.action || ''} ${sg.environment || ''} ${sg.lighting || ''} ${sg.cameraAngle || ''}`).join('\n')}` : ''}`;
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: No errors. This is a backend file so build won't catch syntax issues — also verify with:

```bash
node -e "import('./api/storyboard/generate-scenes.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

- [ ] **Step 6: Commit**

```bash
git add api/storyboard/generate-scenes.js
git commit -m "feat: enhance storyboard scene generator with full creative inputs

Accept desired total length (AI determines scene count), visual/video style
prompts, global scene direction pills, character references, and model
duration constraints. Replaces the old numScenes-only approach.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Backend — Assembly Endpoint

**Files:**
- Create: `api/storyboard/assemble.js`

This endpoint stitches generated scene videos into a single final video, with optional caption burning. It reuses the same `fal-ai/ffmpeg-api/compose` approach as the Shorts pipeline's `assembleShort()` in `api/lib/pipelineHelpers.js` (line 338).

- [ ] **Step 1: Read `assembleShort()` in `api/lib/pipelineHelpers.js` (lines 338-379)**

Understand the track format, duration calculation, and FAL compose API contract. Key points:
- Video track: keyframes array with `{ url, timestamp, duration }` per clip
- Audio tracks: voiceover and music as separate tracks
- `duration` param in compose body = total video duration in seconds
- Polls via `pollFalQueue('fal-ai/ffmpeg-api/compose', ...)`

- [ ] **Step 2: Read `burnCaptions()` in `api/lib/captionBurner.js`**

Understand the caption burning contract. Key points:
- Input: `videoUrl`, `captionConfig` (object or string key), `falKey`, `supabase`
- Uses `fal-ai/workflow-utilities/auto-subtitle`
- Returns public URL of captioned video

- [ ] **Step 3: Create `api/storyboard/assemble.js`**

```javascript
import { createClient } from '@supabase/supabase-js';
import { pollFalQueue, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  try {
    const keys = await getUserKeys(req.user.id, req.user.email);
    if (!keys.falKey) {
      return res.status(400).json({ error: 'FAL API key required' });
    }

    const {
      scenes,           // [{ videoUrl, durationSeconds }] — ordered scene clips
      musicUrl,         // Optional background music URL
      musicVolume,      // 0-1, default 0.15
      captionConfig,    // Optional caption config object or preset string
      storyboardName,   // For naming the output file
    } = req.body;

    if (!scenes?.length) {
      return res.status(400).json({ error: 'No scenes provided' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Build video track from scene clips
    let currentTimestamp = 0;
    const videoKeyframes = scenes.map((scene) => {
      const durationMs = (scene.durationSeconds || 5) * 1000;
      const kf = { url: scene.videoUrl, timestamp: currentTimestamp, duration: durationMs };
      currentTimestamp += durationMs;
      return kf;
    });

    const totalDurationMs = currentTimestamp;
    const totalDurationSec = totalDurationMs / 1000;

    console.log(`[Storyboard Assemble] ${scenes.length} scenes, ${totalDurationSec}s total`);

    // 2. Build tracks
    const tracks = [
      {
        id: 'video',
        type: 'video',
        keyframes: videoKeyframes,
      },
    ];

    // Optional music track
    if (musicUrl) {
      tracks.push({
        id: 'music',
        type: 'audio',
        keyframes: [{ url: musicUrl, timestamp: 0, duration: totalDurationMs }],
        volume: musicVolume ?? 0.15,
      });
    }

    // 3. Submit to FAL ffmpeg-api/compose
    const composeRes = await fetch('https://queue.fal.run/fal-ai/ffmpeg-api/compose', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${keys.falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks, duration: totalDurationSec }),
    });

    if (!composeRes.ok) {
      const errText = await composeRes.text();
      throw new Error(`FFmpeg compose failed (${composeRes.status}): ${errText}`);
    }

    const queueData = await composeRes.json();
    console.log(`[Storyboard Assemble] Queued: ${queueData.request_id}`);

    // 4. Poll for result
    const result = await pollFalQueue(
      queueData.response_url || queueData.request_id,
      'fal-ai/ffmpeg-api/compose',
      keys.falKey,
      120,
      3000
    );

    const assembledUrl = result?.video_url || result?.video?.url || result?.output_url;
    if (!assembledUrl) {
      throw new Error('FFmpeg compose returned no video URL');
    }

    console.log(`[Storyboard Assemble] Composed: ${assembledUrl}`);

    // 5. Upload to Supabase
    const publicUrl = await uploadUrlToSupabase(assembledUrl, supabase, 'pipeline/finals');
    console.log(`[Storyboard Assemble] Uploaded: ${publicUrl}`);

    // 6. Optional caption burning
    let captionedUrl = null;
    if (captionConfig) {
      try {
        const { burnCaptions } = await import('../lib/captionBurner.js');
        captionedUrl = await burnCaptions(publicUrl, captionConfig, keys.falKey, supabase);
        console.log(`[Storyboard Assemble] Captioned: ${captionedUrl}`);
      } catch (captionErr) {
        console.error('[Storyboard Assemble] Caption burning failed (non-fatal):', captionErr.message);
        // Non-fatal — return assembled video without captions
      }
    }

    res.json({
      success: true,
      assembledUrl: publicUrl,
      captionedUrl,
      totalDuration: totalDurationSec,
      sceneCount: scenes.length,
    });
  } catch (err) {
    console.error('[Storyboard Assemble] Error:', err);
    res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 4: Verify with node**

```bash
node -e "import('./api/storyboard/assemble.js').then(() => console.log('OK')).catch(e => console.error(e.message))"
```

Expected: `OK` (module loads without syntax errors)

- [ ] **Step 5: Commit**

```bash
git add api/storyboard/assemble.js
git commit -m "feat: add storyboard assembly endpoint via ffmpeg-api/compose

Stitches scene clips into final video with optional music and captions.
Uses same FAL compose approach as Shorts pipeline.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Frontend — ReviewScene Component

**Files:**
- Create: `src/components/storyboard/ReviewScene.jsx`

A card component for the Review step (Step 7) that displays a generated scene's prompts and allows editing before committing to video generation.

- [ ] **Step 1: Create `src/components/storyboard/ReviewScene.jsx`**

```jsx
import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Check, X, RotateCcw } from 'lucide-react';

export default function ReviewScene({
  scene,
  index,
  onChange,
  onRegenerate,
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (field) => {
    setEditingField(field);
    setEditValue(scene[field] || '');
  };

  const saveEdit = () => {
    if (editingField && editValue !== scene[editingField]) {
      onChange(index, { ...scene, [editingField]: editValue });
    }
    setEditingField(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const renderField = (label, field, multiline = true) => {
    const isEditing = editingField === field;
    const value = scene[field] || '';

    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</span>
          {!isEditing && (
            <button
              onClick={() => startEdit(field)}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              title={`Edit ${label}`}
            >
              <Edit2 size={12} />
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            {multiline ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 resize-y"
                rows={3}
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            )}
            <div className="flex gap-2">
              <button onClick={saveEdit} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white">
                <Check size={12} /> Save
              </button>
              <button onClick={cancelEdit} className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300">
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-300 leading-relaxed">{value || <span className="italic text-zinc-500">Empty</span>}</p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
      >
        {expanded ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
        <span className="flex items-center gap-2">
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-zinc-200">
            {scene.narrativeNote || `Scene ${index + 1}`}
          </span>
        </span>
        <span className="ml-auto text-xs text-zinc-500">{scene.durationSeconds}s</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800">
          <div className="pt-3">
            {renderField('Visual Prompt', 'visualPrompt', true)}
            {renderField('Motion & Camera', 'motionPrompt', true)}
            {renderField('Narrative Note', 'narrativeNote', false)}
            {renderField('Camera Angle', 'cameraAngle', false)}

            <div className="flex justify-end mt-2">
              <button
                onClick={() => onRegenerate?.(index)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-300 transition-colors"
              >
                <RotateCcw size={12} /> Regenerate this scene
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: No errors (component isn't imported anywhere yet, but Vite will still check syntax).

- [ ] **Step 3: Commit**

```bash
git add src/components/storyboard/ReviewScene.jsx
git commit -m "feat: add ReviewScene component for storyboard scene editing

Collapsible card with inline editing for visual prompt, motion prompt,
narrative note, and camera angle. Used in the new Review step.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Frontend — InputsStep Component

**Files:**
- Create: `src/components/storyboard/InputsStep.jsx`

Combined step component containing 3 sub-sections: Starting Image (5a), Characters (5b), and Scene Direction Pills (5c). This extracts complexity from the main wizard.

- [ ] **Step 1: Read CharactersKling.jsx and CharactersVeo.jsx props**

CharactersKling (281 lines): `{ elements, onChange, onOpenImagineer, onOpenLibrary }`
CharactersVeo (133 lines): `{ referenceImages, onChange, onOpenLibrary, onOpenImagineer }`

- [ ] **Step 2: Read the scene direction pills in `src/lib/scenePills.js`**

Understand the pill categories and `getScenePillsForNiche()` structure. We need environment, action, expression, lighting, camera pills — but applied globally, not per-scene.

- [ ] **Step 3: Create `src/components/storyboard/InputsStep.jsx`**

```jsx
import { useState } from 'react';
import { Upload, ImageIcon, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import CharactersKling from './CharactersKling';
import CharactersVeo from './CharactersVeo';

const SCENE_PILLS = {
  environment: ['Urban', 'Nature', 'Indoor', 'Studio', 'Underwater', 'Space', 'Desert', 'Forest', 'Beach', 'Mountain', 'Cityscape', 'Rural'],
  action: ['Walking', 'Running', 'Dancing', 'Sitting', 'Standing', 'Flying', 'Swimming', 'Fighting', 'Talking', 'Working', 'Playing', 'Sleeping'],
  expression: ['Happy', 'Sad', 'Angry', 'Surprised', 'Thoughtful', 'Determined', 'Peaceful', 'Excited', 'Fearful', 'Confident'],
  lighting: ['Golden Hour', 'Blue Hour', 'Midday Sun', 'Overcast', 'Neon', 'Candlelight', 'Moonlight', 'Studio Light', 'Backlit', 'Dramatic Shadow'],
  camera: ['Slow Pan', 'Tracking Shot', 'Static', 'Dolly In', 'Dolly Out', 'Orbit', 'Crane Up', 'Crane Down', 'Handheld', 'Aerial'],
};

function PillSelector({ label, options, selected, onToggle }) {
  return (
    <div className="mb-3">
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {options.map((pill) => (
          <button
            key={pill}
            onClick={() => onToggle(pill)}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              selected.includes(pill)
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {pill}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function InputsStep({
  // Starting image (5a)
  startFrameUrl,
  startFrameDescription,
  onUploadStartFrame,
  onLibraryStartFrame,
  onGenerateStartFrame,
  isAnalyzingFrame,

  // Characters (5b)
  globalModel,
  needsCharacters,
  elements,
  onElementsChange,
  veoReferenceImages,
  onVeoRefsChange,
  onOpenImagineer,
  onOpenLibrary,

  // Scene direction (5c)
  sceneDirection,
  onSceneDirectionChange,
}) {
  const [expandedSection, setExpandedSection] = useState('startImage');

  const isKlingModel = globalModel?.startsWith('kling-r2v');
  const isVeoModel = globalModel?.startsWith('veo3') && !globalModel?.includes('fast');

  const togglePill = (category, pill) => {
    const current = sceneDirection[category] || [];
    const updated = current.includes(pill)
      ? current.filter(p => p !== pill)
      : [...current, pill];
    onSceneDirectionChange({ ...sceneDirection, [category]: updated });
  };

  const SectionHeader = ({ id, label, subtitle }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === id ? null : id)}
      className="w-full flex items-center gap-3 py-3 text-left"
    >
      {expandedSection === id
        ? <ChevronDown size={16} className="text-zinc-400" />
        : <ChevronRight size={16} className="text-zinc-400" />}
      <div>
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        {subtitle && <span className="ml-2 text-xs text-zinc-500">{subtitle}</span>}
      </div>
    </button>
  );

  return (
    <div className="space-y-2">
      {/* 5a: Starting Image */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4">
        <SectionHeader id="startImage" label="Starting Image" subtitle="Sets the visual foundation for Scene 1" />
        {expandedSection === 'startImage' && (
          <div className="pb-4">
            {startFrameUrl ? (
              <div className="space-y-3">
                <img src={startFrameUrl} alt="Start frame" className="w-full max-w-md rounded-lg border border-zinc-700" />
                {isAnalyzingFrame && (
                  <p className="text-xs text-blue-400 animate-pulse">Analyzing image...</p>
                )}
                {startFrameDescription && (
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <p className="text-xs text-zinc-400 mb-1">AI Analysis:</p>
                    <p className="text-sm text-zinc-300">{startFrameDescription}</p>
                  </div>
                )}
                <button
                  onClick={onGenerateStartFrame}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Replace image
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={onUploadStartFrame} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-zinc-300 transition-colors">
                  <Upload size={14} /> Upload
                </button>
                <button onClick={onLibraryStartFrame} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-zinc-300 transition-colors">
                  <ImageIcon size={14} /> Library
                </button>
                <button onClick={onGenerateStartFrame} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition-colors">
                  <Sparkles size={14} /> Generate
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5b: Characters (conditional) */}
      {needsCharacters && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4">
          <SectionHeader
            id="characters"
            label="Characters"
            subtitle={isKlingModel ? '@Element references' : 'Reference images'}
          />
          {expandedSection === 'characters' && (
            <div className="pb-4">
              {isKlingModel && (
                <CharactersKling
                  elements={elements}
                  onChange={onElementsChange}
                  onOpenImagineer={onOpenImagineer}
                  onOpenLibrary={onOpenLibrary}
                />
              )}
              {isVeoModel && (
                <CharactersVeo
                  referenceImages={veoReferenceImages}
                  onChange={onVeoRefsChange}
                  onOpenLibrary={onOpenLibrary}
                  onOpenImagineer={onOpenImagineer}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 5c: Scene Direction Pills */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4">
        <SectionHeader id="direction" label="Scene Direction" subtitle="Global creative direction for all scenes" />
        {expandedSection === 'direction' && (
          <div className="pb-4">
            <PillSelector label="Environment" options={SCENE_PILLS.environment} selected={sceneDirection.environment || []} onToggle={(p) => togglePill('environment', p)} />
            <PillSelector label="Character Action" options={SCENE_PILLS.action} selected={sceneDirection.action || []} onToggle={(p) => togglePill('action', p)} />
            <PillSelector label="Expression" options={SCENE_PILLS.expression} selected={sceneDirection.expression || []} onToggle={(p) => togglePill('expression', p)} />
            <PillSelector label="Lighting" options={SCENE_PILLS.lighting} selected={sceneDirection.lighting || []} onToggle={(p) => togglePill('lighting', p)} />
            <PillSelector label="Camera Movement" options={SCENE_PILLS.camera} selected={sceneDirection.camera || []} onToggle={(p) => togglePill('camera', p)} />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/storyboard/InputsStep.jsx
git commit -m "feat: add InputsStep component for storyboard creative inputs

Combined step with 3 collapsible sections: Starting Image (upload/library/
generate), Characters (Kling @Elements or Veo refs based on model), and
Scene Direction pills (global environment/action/expression/lighting/camera).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Frontend — Wizard Rewrite

**Files:**
- Modify: `src/components/modals/StoryboardPlannerWizard.jsx` (1623 lines — major rewrite)

This is the largest task. The wizard is restructured from 7 steps to 8, with completely new ordering and flow.

- [ ] **Step 1: Read the entire current `StoryboardPlannerWizard.jsx`**

Map all state variables (lines 117-177), all handlers (lines 290-1040), and all step render blocks (lines 1107-1552). Understand what can be kept vs what must change.

- [ ] **Step 2: Update WIZARD_STEPS constant (line 67-75)**

Replace:
```javascript
const WIZARD_STEPS = [
  { key: 'story', label: 'Story & Mood' },
  { key: 'story-chat', label: 'Story Builder' },
  { key: 'style', label: 'Visual Style' },
  { key: 'video-style', label: 'Video Style' },
  { key: 'scene-builder', label: 'Scene Builder' },
  { key: 'characters', label: 'Characters' },
  { key: 'generating', label: 'Generate' },
];
```

With:
```javascript
const WIZARD_STEPS = [
  { key: 'story', label: 'Story & Mood' },
  { key: 'style', label: 'Visual Style' },
  { key: 'video-style', label: 'Video Style' },
  { key: 'model', label: 'Model' },
  { key: 'inputs', label: 'Creative Inputs' },
  { key: 'script', label: 'Generate Script' },
  { key: 'review', label: 'Review Scenes' },
  { key: 'generate', label: 'Generate' },
];
```

Note: The Characters step is no longer a separate conditional step — it's a sub-section of the Inputs step, always visible when a ref model is selected.

- [ ] **Step 3: Update state variables**

Remove story-chat related state:
```javascript
// REMOVE these:
// const [storyBeats, setStoryBeats] = useState([]);
// const [storyTitle, setStoryTitle] = useState('');
// const [storyChatOverview, setStoryChatOverview] = useState('');
// const [chatHistory, setChatHistory] = useState([]);
```

Replace `numScenes` with `desiredLength`:
```javascript
// REMOVE:
// const [numScenes, setNumScenes] = useState(4);

// ADD:
const [desiredLength, setDesiredLength] = useState(60); // 30, 45, 60, 90
```

Add new state for global model and scene direction:
```javascript
const [globalModel, setGlobalModel] = useState('veo3');
const [sceneDirection, setSceneDirection] = useState({
  environment: [],
  action: [],
  expression: [],
  lighting: [],
  camera: [],
});

// Script generation state
const [generatingScript, setGeneratingScript] = useState(false);
const [scriptError, setScriptError] = useState(null);

// Assembly state
const [assembling, setAssembling] = useState(false);
const [assembledUrl, setAssembledUrl] = useState(null);

// Kling R2V upscaled element cache (avoids re-upscaling across scenes)
const [upscaledElementsCache, setUpscaledElementsCache] = useState(null);
```

- [ ] **Step 4: Add model duration constraints helper**

Add near the top of the component or as a utility:

```javascript
import { SCENE_MODELS } from '../storyboard/SceneModelSelector';

// Model duration constraints for the scene generator
function getModelDurationConstraints(modelId) {
  const model = SCENE_MODELS.find(m => m.id === modelId);
  if (!model) return null;

  // Duration constraints per model family
  const constraints = {
    'veo3': { min: 4, max: 8, allowed: [4, 6, 8] },
    'veo3-fast': { min: 4, max: 8, allowed: [4, 6, 8] },
    'veo3-first-last': { min: 8, max: 8, allowed: [8] },
    'kling-r2v-pro': { min: 5, max: 10, allowed: [5, 10] },
    'kling-r2v-standard': { min: 5, max: 10, allowed: [5, 10] },
    'kling-video': { min: 5, max: 10, allowed: [5, 10] },
    'kling-o3-v2v-pro': { min: 3, max: 15, allowed: [3, 5, 8, 10, 15] },
    'kling-o3-v2v-standard': { min: 3, max: 15, allowed: [3, 5, 8, 10, 15] },
    'seedance-pro': { min: 4, max: 12, allowed: [4, 6, 8, 10, 12] },
    'grok-imagine': { min: 5, max: 15, allowed: [5, 8, 10, 15] },
    'wavespeed-wan': { min: 5, max: 8, allowed: [5, 8] },
  };

  return constraints[modelId] || { min: 5, max: 8, allowed: [5, 8] };
}
```

- [ ] **Step 5: Compute `needsCharacters` from `globalModel` (not per-scene)**

Replace the existing `needsCharacters` computation (which scans `sceneGuides`) with:

```javascript
const selectedModelInfo = SCENE_MODELS.find(m => m.id === globalModel);
const needsCharacters = selectedModelInfo?.supportsRefs || false;
```

- [ ] **Step 6: Add the script generation handler**

```javascript
const handleGenerateScript = async () => {
  setGeneratingScript(true);
  setScriptError(null);

  try {
    const body = {
      storyboardName,
      desiredLength,
      defaultDuration,
      overallMood,
      aspectRatio,
      style,
      visualStylePrompt: style ? getPromptText(style) : undefined,
      builderStyle,
      builderLighting,
      builderColorGrade,
      videoStylePrompt: videoStyle
        ? videoStylesList.find(v => v.key === videoStyle)?.prompt
        : undefined,
      globalModel,
      modelDurationConstraints: getModelDurationConstraints(globalModel),
      hasStartFrame: !!startFrameUrl,
      startFrameDescription,
      elements: needsCharacters && elements?.length
        ? elements.map((el, i) => ({ index: i + 1, description: el.description }))
        : undefined,
      veoReferenceCount: needsCharacters && veoReferenceImages?.length
        ? veoReferenceImages.length
        : 0,
      sceneDirection,
      props: selectedProps,
      negativePrompt: negFreetext || selectedNegPills?.join(', '),
      brandStyleGuide: selectedBrand || undefined,
    };

    const res = await apiFetch('/api/storyboard/generate-scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!data.success || !data.scenes) {
      throw new Error(data.error || 'Failed to generate scenes');
    }

    setScenes(data.scenes.map((s, i) => ({
      ...s,
      id: `scene-${i}`,
      status: 'pending',
      videoUrl: null,
      lastFrameUrl: null,
    })));
  } catch (err) {
    console.error('[Storyboard] Script generation failed:', err);
    setScriptError(err.message);
  } finally {
    setGeneratingScript(false);
  }
};
```

- [ ] **Step 7: Update video generation to use global model + frame chaining**

Update `generateSingleScene` (currently line 673) to:
1. Use `globalModel` instead of `sceneGuides[i].model`
2. Use `extractLastFrame` from pipelineHelpers (already used, but verify the import)
3. Add `analyzeFrameContinuity` call after frame extraction — append result to next scene's motion prompt

The frame chaining logic should look like:

```javascript
const generateSingleScene = async (sceneIndex) => {
  const scene = scenes[sceneIndex];
  updateScene(sceneIndex, { status: 'generating' });

  try {
    const formData = new FormData();
    formData.append('model', globalModel);
    formData.append('prompt', buildScenePrompt(scene));
    formData.append('duration', scene.durationSeconds || defaultDuration);
    formData.append('aspectRatio', aspectRatio);
    formData.append('resolution', resolution);

    if (selectedModelInfo?.supportsAudio && enableAudioDefault) {
      formData.append('enableAudio', 'true');
    }

    // Frame chaining: Scene 1 uses start frame, Scene N uses prev scene's last frame
    let imageUrl = null;
    if (sceneIndex === 0 && startFrameUrl) {
      imageUrl = startFrameUrl;
    } else if (sceneIndex > 0) {
      const prevScene = scenes[sceneIndex - 1];
      if (prevScene?.lastFrameUrl) {
        imageUrl = prevScene.lastFrameUrl;
      }
    }

    if (imageUrl) {
      // Fetch image and append as blob
      const imgRes = await fetch(imageUrl);
      const blob = await imgRes.blob();
      formData.append('image', blob, 'frame.jpg');
    }

    // Character references
    if (needsCharacters) {
      if (globalModel.startsWith('kling-r2v') && elements?.length) {
        formData.append('r2vElements', JSON.stringify(
          elements.map(el => ({
            frontalImageUrl: el.refs[el.frontalIndex]?.url || el.refs[0]?.url,
            referenceImageUrls: el.refs.map(r => r.url),
          }))
        ));
        // Pass cached upscaled elements if available
        if (upscaledElementsCache) {
          formData.append('r2vElementsPreUpscaled', JSON.stringify(upscaledElementsCache));
        }
      } else if (globalModel.startsWith('veo3') && veoReferenceImages?.length) {
        formData.append('additionalImages', JSON.stringify(veoReferenceImages));
      }
    }

    const res = await apiFetch('/api/jumpstart/generate', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });

    // Cache upscaled elements for next scene
    if (res.upscaledElements) {
      setUpscaledElementsCache(res.upscaledElements);
    }

    let videoUrl = res.videoUrl;

    // Poll if async
    if (!videoUrl && res.requestId) {
      videoUrl = await pollForResult(res.requestId, res.model || globalModel);
    }

    if (!videoUrl) throw new Error('No video URL returned');

    // Extract last frame for chaining to next scene
    // Uses the existing extractLastFrame helper which calls /api/video/extract-frame
    let lastFrameUrl = null;
    try {
      const { extractLastFrame } = await import('@/lib/frameExtractor');
      lastFrameUrl = await extractLastFrame(videoUrl);
    } catch (frameErr) {
      console.warn('[Storyboard] Frame extraction failed (non-fatal):', frameErr.message);
    }

    updateScene(sceneIndex, {
      status: 'done',
      videoUrl,
      lastFrameUrl,
    });
  } catch (err) {
    console.error(`[Storyboard] Scene ${sceneIndex + 1} failed:`, err);
    updateScene(sceneIndex, { status: 'error', error: err.message });
  }
};
```

**Important note on frame extraction:** The current codebase calls `extractLastFrame` directly in the frontend via pipelineHelpers (which uses the FAL API directly). Check how the current wizard does this — if it makes the FAL call from the frontend, keep that pattern. If it goes through a backend endpoint, use that. The Shorts pipeline does this server-side, but the Storyboard wizard currently does it client-side via the same FAL endpoint. Verify and match the existing pattern.

- [ ] **Step 8: Add assembly handler**

```javascript
const handleAssemble = async () => {
  setAssembling(true);

  try {
    const completedScenes = scenes
      .filter(s => s.status === 'done' && s.videoUrl)
      .map(s => ({
        videoUrl: s.videoUrl,
        durationSeconds: s.durationSeconds || defaultDuration,
      }));

    const res = await apiFetch('/api/storyboard/assemble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenes: completedScenes,
        storyboardName,
      }),
    });
    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Assembly failed');

    setAssembledUrl(data.captionedUrl || data.assembledUrl);
  } catch (err) {
    console.error('[Storyboard] Assembly failed:', err);
  } finally {
    setAssembling(false);
  }
};
```

- [ ] **Step 9: Rewrite step render blocks**

Replace ALL step render blocks (lines 1107-1552) with the new 8-step structure. Key changes:

**Step 1 (story):** Replace `numScenes` slider with `desiredLength` selector:
```jsx
{step === 'story' && (
  <div className="space-y-6">
    {/* Storyboard name — keep existing */}
    {/* Replace numScenes slider with: */}
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">Desired Length</label>
      <div className="flex gap-2">
        {[30, 45, 60, 90].map(len => (
          <button
            key={len}
            onClick={() => setDesiredLength(len)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              desiredLength === len
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {len}s
          </button>
        ))}
      </div>
    </div>
    {/* Duration per scene, aspect ratio, resolution, audio, mood, brand — keep existing */}
  </div>
)}
```

**Step 2 (style):** Keep existing visual style render block as-is.

**Step 3 (video-style):** Keep existing video style render block as-is.

**Step 4 (model):** New step — global model selector:
```jsx
{step === 'model' && (
  <div className="space-y-4">
    <p className="text-sm text-zinc-400">Choose the AI model for all scenes. This determines video quality, duration options, and whether character references are supported.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {SCENE_MODELS.map(model => (
        <button
          key={model.id}
          onClick={() => setGlobalModel(model.id)}
          className={`text-left p-4 rounded-xl border transition-colors ${
            globalModel === model.id
              ? 'bg-blue-600/10 border-blue-500'
              : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-200">{model.label}</span>
            <span className="text-xs text-zinc-500">{model.mode}</span>
          </div>
          {model.supportsRefs && (
            <span className="inline-block mt-1 text-xs bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded">Character refs</span>
          )}
          {model.supportsAudio && (
            <span className="inline-block mt-1 ml-1 text-xs bg-green-600/20 text-green-300 px-2 py-0.5 rounded">Audio</span>
          )}
        </button>
      ))}
    </div>
  </div>
)}
```

**Step 5 (inputs):** Use the InputsStep component:
```jsx
{step === 'inputs' && (
  <InputsStep
    startFrameUrl={startFrameUrl}
    startFrameDescription={startFrameDescription}
    onUploadStartFrame={handleFileUpload}
    onLibraryStartFrame={() => setShowLibraryForStart(true)}
    onGenerateStartFrame={() => setShowImagineerForStartFrame(true)}
    isAnalyzingFrame={analyzingFrame}
    globalModel={globalModel}
    needsCharacters={needsCharacters}
    elements={elements}
    onElementsChange={setElements}
    veoReferenceImages={veoReferenceImages}
    onVeoRefsChange={setVeoReferenceImages}
    onOpenImagineer={() => setShowImagineerForChar(true)}
    onOpenLibrary={() => setShowLibraryForChar(true)}
    sceneDirection={sceneDirection}
    onSceneDirectionChange={setSceneDirection}
  />
)}
```

**Step 6 (script):** Generate script step:
```jsx
{step === 'script' && (
  <div className="space-y-4">
    {scenes.length === 0 && !generatingScript && !scriptError && (
      <div className="text-center py-12">
        <p className="text-zinc-400 mb-4">Ready to generate your scene script using all your creative inputs.</p>
        <button
          onClick={handleGenerateScript}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
        >
          Generate Scene Script
        </button>
      </div>
    )}
    {generatingScript && (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-zinc-400">Generating scenes from your creative inputs...</p>
      </div>
    )}
    {scriptError && (
      <div className="bg-red-900/20 border border-red-800 rounded-xl p-4">
        <p className="text-red-400 text-sm">{scriptError}</p>
        <button onClick={handleGenerateScript} className="mt-2 text-sm text-blue-400 hover:text-blue-300">
          Try again
        </button>
      </div>
    )}
    {scenes.length > 0 && (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-zinc-400">{scenes.length} scenes generated</p>
          <button onClick={handleGenerateScript} className="text-xs text-blue-400 hover:text-blue-300">
            Regenerate all
          </button>
        </div>
        <p className="text-xs text-zinc-500">Scenes generated. Proceed to Review to edit individual scenes.</p>
      </div>
    )}
  </div>
)}
```

**Step 7 (review):** Review scenes:
```jsx
{step === 'review' && (
  <div className="space-y-3">
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-zinc-400">{scenes.length} scenes to review</p>
      <button
        onClick={() => { setScenes([]); handleBack(); }}
        className="text-xs text-zinc-500 hover:text-zinc-300"
      >
        Back to regenerate
      </button>
    </div>
    {scenes.map((scene, i) => (
      <ReviewScene
        key={scene.id || i}
        scene={scene}
        index={i}
        onChange={(idx, updated) => {
          const newScenes = [...scenes];
          newScenes[idx] = { ...newScenes[idx], ...updated };
          setScenes(newScenes);
        }}
        onRegenerate={async (idx) => {
          // Regenerate single scene via generate-scenes with sceneGuides override
          // For now, just clear its status to allow re-editing
        }}
      />
    ))}
  </div>
)}
```

**Step 8 (generate):** Keep the existing generation render block but simplify:
- Remove per-scene model badges (global model)
- Add "Assemble" button after all scenes complete
- Add assembled video preview

```jsx
{step === 'generate' && (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <p className="text-sm text-zinc-400">
        {completedScenesCount} / {scenes.length} scenes complete
      </p>
      {!generating && completedScenesCount < scenes.length && (
        <button onClick={generateAllRemaining} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white">
          Generate All Remaining
        </button>
      )}
      {generating && (
        <button onClick={() => { cancelRef.current = true; }} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm text-white">
          Cancel
        </button>
      )}
    </div>

    {scenes.map((scene, i) => (
      <GenerateScene
        key={scene.id || i}
        scene={scene}
        onGenerate={() => generateSingleSceneWrapper(i)}
        onRetry={() => { updateScene(i, { status: 'pending' }); generateSingleSceneWrapper(i); }}
        isGenerating={scene.status === 'generating'}
        isPending={scene.status === 'pending'}
      />
    ))}

    {/* Assembly section */}
    {completedScenesCount === scenes.length && scenes.length > 0 && (
      <div className="border-t border-zinc-700 pt-4 mt-4">
        {!assembledUrl ? (
          <button
            onClick={handleAssemble}
            disabled={assembling}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 rounded-xl text-white font-medium transition-colors"
          >
            {assembling ? 'Assembling...' : 'Assemble Final Video'}
          </button>
        ) : (
          <div className="space-y-3">
            <video src={assembledUrl} controls className="w-full rounded-lg" />
            <button
              onClick={() => sendToTimeline()}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium"
            >
              Send to Timeline
            </button>
          </div>
        )}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 10: Update imports**

At the top of StoryboardPlannerWizard.jsx, update imports:

```javascript
// ADD:
import InputsStep from '../storyboard/InputsStep';
import ReviewScene from '../storyboard/ReviewScene';
import { SCENE_MODELS } from '../storyboard/SceneModelSelector';
import { getPromptText } from '@/lib/stylePresets';

// REMOVE:
// import StoryChat from '../storyboard/StoryChat';
```

- [ ] **Step 11: Update `handleNext()` / step navigation**

Update the step navigation logic (currently line 1040) to handle the new step flow. Remove the `story-chat` transition. The `script` step should auto-trigger script generation if scenes haven't been generated yet:

```javascript
const handleNext = () => {
  const currentIndex = WIZARD_STEPS.findIndex(s => s.key === step);
  if (currentIndex < WIZARD_STEPS.length - 1) {
    const nextStep = WIZARD_STEPS[currentIndex + 1].key;
    setStep(nextStep);

    // Auto-trigger script generation when entering script step
    if (nextStep === 'script' && scenes.length === 0) {
      handleGenerateScript();
    }
  }
};
```

- [ ] **Step 12: Update `isNextDisabled()` validation**

```javascript
const isNextDisabled = () => {
  switch (step) {
    case 'story':
      return !storyboardName?.trim();
    case 'style':
      return !style;
    case 'video-style':
      return false; // Optional
    case 'model':
      return !globalModel;
    case 'inputs':
      return false; // All sub-sections optional
    case 'script':
      return scenes.length === 0 || generatingScript;
    case 'review':
      return scenes.length === 0;
    case 'generate':
      return generating || completedScenesCount === 0;
    default:
      return false;
  }
};
```

- [ ] **Step 13: Remove all `sceneGuides` per-scene state and handlers**

The per-scene `sceneGuides` array (line 133-ish), `updateSceneGuide` (line 290), `handleSceneGuideChange` (line 295), and the SceneCard rendering per scene guide are no longer needed. Scenes are now generated by the AI in Step 6, not manually configured per-scene.

Keep the `scenes` state array (used for generated scenes and video results), but remove `sceneGuides`.

- [ ] **Step 14: Verify build**

```bash
npm run build
```

Expected: Build succeeds. Fix any import errors or missing references.

- [ ] **Step 15: Commit**

```bash
git add src/components/modals/StoryboardPlannerWizard.jsx
git commit -m "feat: rewrite Storyboard wizard — 8-step flow with inputs-first design

New flow: Story & Mood → Visual Style → Video Style → Model → Creative
Inputs (starting image + characters + scene pills) → Generate Script →
Review Scenes → Generate Videos + Assembly.

Key changes:
- Remove Story Builder chat (disconnected, just pre-filled text)
- Replace scene count with desired total length (AI determines scenes)
- Single global model (not per-scene)
- Scene direction pills are global (not per-scene)
- Dedicated script generation step after all inputs collected
- New review step for editing scene prompts before generation
- Post-generation assembly via ffmpeg-api/compose

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Server Routes & Wiring

**Files:**
- Modify: `server.js:418-434`

- [ ] **Step 1: Add assembly route to server.js**

Near the existing storyboard routes (line 418), add:

```javascript
app.post('/api/storyboard/assemble', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('storyboard/assemble.js');
  return handler(req, res);
});
```

- [ ] **Step 2: Verify the story-chat route was removed (Task 1)**

Confirm lines 430-434 (story-chat route) are gone. The remaining storyboard routes should be:
- `POST /api/storyboard/generate-scenes` (enhanced in Task 2)
- `POST /api/storyboard/describe-scene` (unchanged)
- `POST /api/storyboard/assemble` (new from Task 3)

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: register storyboard assembly route, remove story-chat route

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Integration Verification

**Depends on:** All previous tasks complete.

- [ ] **Step 1: Build check**

```bash
npm run build
```

Expected: Clean build, no errors.

- [ ] **Step 2: Start dev server**

```bash
npm run start
```

Expected: Both Express (port 3003) and Vite (port 4390) start without errors.

- [ ] **Step 3: Manual walkthrough — Step 1 (Story & Mood)**

Open `http://localhost:4390` in browser. Navigate to Video Ad Creator. Click Storyboard.

Verify:
- Storyboard name input works
- Desired length buttons (30s, 45s, 60s, 90s) work — NOT a scene count slider
- Duration per scene slider works
- Aspect ratio, resolution, audio toggle, mood pills all work
- "Next" is disabled until name is entered

- [ ] **Step 4: Manual walkthrough — Steps 2-3 (Visual Style, Video Style)**

Verify:
- Visual style grid loads 124 presets
- Video style grid loads 62 presets (fetched from `/api/styles/video`)
- Selection persists when navigating back and forth

- [ ] **Step 5: Manual walkthrough — Step 4 (Model)**

Verify:
- All models from SCENE_MODELS appear
- Selecting a ref model (veo3, kling-r2v-pro) shows "Character refs" badge
- Selection persists

- [ ] **Step 6: Manual walkthrough — Step 5 (Creative Inputs)**

Verify:
- 3 collapsible sections appear: Starting Image, Characters (if ref model), Scene Direction
- Starting Image: Upload, Library, Generate buttons work
- If ref model selected: Characters section shows appropriate UI (Kling @Elements or Veo refs)
- Scene Direction: pills are selectable, multiple selection works

- [ ] **Step 7: Manual walkthrough — Step 6 (Generate Script)**

Verify:
- "Generate Scene Script" button appears
- Clicking it calls `/api/storyboard/generate-scenes`
- Loading spinner shows during generation
- Scenes appear after generation completes
- Scene count is AI-determined (not a fixed number from user input)

- [ ] **Step 8: Manual walkthrough — Step 7 (Review Scenes)**

Verify:
- All generated scenes appear as collapsible cards
- First scene is expanded by default
- Edit button on each field works (visual prompt, motion prompt, narrative note, camera angle)
- Edits persist

- [ ] **Step 9: Manual walkthrough — Step 8 (Generate Videos)**

Verify:
- "Generate All Remaining" button works
- Videos generate using the global model
- Frame chaining works (last frame extracted, used as next scene's input)
- After all scenes complete, "Assemble Final Video" button appears
- Assembly produces a stitched video
- "Send to Timeline" returns videos to the parent

- [ ] **Step 10: Verify no console errors**

Check browser console for:
- No 404s on removed routes (story-chat)
- No import errors
- No React warnings about missing props

- [ ] **Step 11: Deploy**

```bash
fly deploy
```

Wait for deploy to complete, then verify on production.

- [ ] **Step 12: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "fix: integration fixes for storyboard redesign

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

Then push:

```bash
git push origin main
```
