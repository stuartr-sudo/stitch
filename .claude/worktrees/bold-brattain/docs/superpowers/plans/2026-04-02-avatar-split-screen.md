# AI Avatar Split-Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Avatar Mode" to the Shorts Workbench that produces split-screen videos — AI avatar (talking head) on the bottom 40%, B-roll visuals on the top 60%, captions at the seam.

**Architecture:** Avatar mode adds a parallel track to the existing workbench pipeline. The B-roll pipeline is unchanged. A single avatar clip (portrait → I2V → loop → lip-sync) is composited with the assembled B-roll via a new split-screen compositor using FAL FFmpeg. No database migrations — avatar state lives in the existing `storyboard_json` JSONB.

**Tech Stack:** React 18, Express, FAL.ai (FFmpeg compose, lip-sync, I2V), Supabase, OpenAI

**Spec:** `docs/superpowers/specs/2026-04-02-avatar-split-screen-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `api/lib/splitScreenCompositor.js` | **Create** | `composeSplitScreen()` — stacks B-roll + avatar vertically via FAL FFmpeg; `loopVideo()` — loops a short clip to target duration via FAL FFmpeg |
| `api/workbench/workbench.js` | **Modify** | Add 3 new actions (`generate-avatar-portrait`, `animate-avatar`, `lipsync-avatar`), modify `assemble` action for split-screen path |
| `src/pages/ShortsWorkbenchPage.jsx` | **Modify** | Avatar toggle + subject picker in Step 1, B-roll label in Step 3, avatar generation card in Step 4, state persistence |

---

### Task 1: Split-Screen Compositor — `loopVideo()`

**Files:**
- Create: `api/lib/splitScreenCompositor.js`

The compositor has two functions. This task builds `loopVideo()` — takes a short I2V clip and loops it to a target duration using FAL FFmpeg compose.

- [ ] **Step 1: Create `loopVideo()` function**

Create `api/lib/splitScreenCompositor.js` with the loop function. Uses FAL FFmpeg compose to repeat a video clip to fill the target duration.

```javascript
/**
 * Split-Screen Compositor
 *
 * Two functions for the avatar split-screen pipeline:
 * - loopVideo() — loops a short clip to a target duration
 * - composeSplitScreen() — stacks B-roll + avatar vertically (60/40)
 */

import { pollFalQueue, uploadUrlToSupabase } from './pipelineHelpers.js';

const FAL_BASE = 'https://queue.fal.run';
const SPLIT_RATIO = 0.6; // B-roll gets 60%, avatar gets 40%
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;

/**
 * Loop a short video clip to fill a target duration.
 * Uses FAL FFmpeg compose with repeated keyframes.
 *
 * @param {Object} params
 * @param {string} params.videoUrl — short clip to loop (e.g., 5-10s)
 * @param {number} params.clipDuration — duration of the source clip in seconds
 * @param {number} params.targetDuration — desired output duration in seconds
 * @param {string} params.falKey
 * @param {Object} params.supabase
 * @returns {Promise<string>} — URL of the looped video
 */
export async function loopVideo({ videoUrl, clipDuration, targetDuration, falKey, supabase }) {
  if (!videoUrl) throw new Error('videoUrl required for loopVideo');
  if (!clipDuration || clipDuration <= 0) throw new Error('clipDuration must be positive');
  if (!targetDuration || targetDuration <= 0) throw new Error('targetDuration must be positive');

  // If clip is already long enough, return as-is
  if (clipDuration >= targetDuration) return videoUrl;

  // Build repeated keyframes to fill the target duration
  const repetitions = Math.ceil(targetDuration / clipDuration);
  const keyframes = [];
  for (let i = 0; i < repetitions; i++) {
    keyframes.push({
      url: videoUrl,
      timestamp: i * clipDuration * 1000, // milliseconds
      duration: clipDuration * 1000,
      audio: false,
    });
  }

  const tracks = [
    { id: 'video', type: 'video', keyframes },
  ];

  console.log(`[loopVideo] Looping ${clipDuration}s clip ${repetitions}x to fill ${targetDuration}s`);

  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/compose`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tracks, duration: targetDuration }),
  });

  if (!res.ok) throw new Error(`FAL ffmpeg loop failed: ${await res.text()}`);
  const queueData = await res.json();

  const output = await pollFalQueue(queueData.response_url, 'fal-ai/ffmpeg-api/compose', falKey, 120, 3000);
  const resultUrl = output?.video_url || output?.video?.url || output?.output_url;
  if (!resultUrl) throw new Error('No video URL from FFmpeg loop');

  return await uploadUrlToSupabase(resultUrl, supabase, 'pipeline/avatar');
}
```

- [ ] **Step 2: Verify file was created correctly**

Run: `node -e "import('./api/lib/splitScreenCompositor.js').then(m => console.log('exports:', Object.keys(m)))"`
Expected: `exports: [ 'loopVideo' ]`

- [ ] **Step 3: Commit**

```bash
git add api/lib/splitScreenCompositor.js
git commit -m "feat: add loopVideo() for avatar clip looping"
```

---

### Task 2: Split-Screen Compositor — `composeSplitScreen()`

**Files:**
- Modify: `api/lib/splitScreenCompositor.js`

Add the main compositor function that stacks B-roll (top 60%) and avatar (bottom 40%) into a single 1080×1920 frame. The B-roll audio track (voiceover + music) is kept; the avatar audio track is discarded.

**⚠️ API exploration required:** The FAL `ffmpeg-api/compose` endpoint as used elsewhere in the codebase (`assembleShort`, `concatVideos`) only uses sequential video tracks — it has never been used for spatial positioning (stacking videos vertically). The implementer MUST first determine how to achieve vertical stacking before writing the final function.

- [ ] **Step 1: Explore FAL FFmpeg compose API capabilities**

Run this test script to determine what the compose API supports for spatial layout:

```bash
node -e "
// Test if FAL ffmpeg-api/compose supports custom_filter, filter_complex, or layout params
// by checking the API documentation or making a test call
const url = 'https://fal.run/fal-ai/ffmpeg-api/compose';
fetch(url, {
  method: 'POST',
  headers: { 'Authorization': 'Key ' + process.env.FAL_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tracks: [
      { id: 'v1', type: 'video', keyframes: [{ url: 'https://example.com/test.mp4', timestamp: 0, duration: 1000 }] },
    ],
    duration: 1,
    // Try these parameters — check which ones the API accepts:
    // width: 1080, height: 1920,
    // filter_complex: '[0:v]scale=1080:1152[top];...',
    // custom_args: ['-filter_complex', '...'],
  }),
}).then(r => r.json()).then(d => console.log('Response:', JSON.stringify(d, null, 2))).catch(e => console.error(e));
"
```

**Approaches to try, in order of preference:**
1. `filter_complex` or `custom_filter` parameter on the compose API: `"[0:v]scale=1080:1152[top];[1:v]scale=1080:768[bot];[top][bot]vstack=inputs=2[v]"`
2. `width`/`height` on the compose body + `x`/`y`/`width`/`height` on individual keyframes for positioning
3. Check if `fal-ai/ffmpeg-api/run` exists and accepts raw FFmpeg arguments
4. A two-pass approach: pre-scale both videos via separate FFmpeg calls, then vstack them

Document the working approach in a code comment before implementing.

- [ ] **Step 2: Implement `composeSplitScreen()` using verified approach**

Append to `api/lib/splitScreenCompositor.js`. The exact API call shape depends on Step 1 findings. The function signature and logic are fixed:

```javascript
/**
 * Compose a split-screen video: B-roll on top, avatar on bottom.
 *
 * Audio comes from the B-roll track only (voiceover + music).
 * Avatar audio is discarded to avoid double-voiceover.
 *
 * Layout (1080×1920):
 *   Top 60%  → B-roll  (1080×1152)
 *   Bottom 40% → Avatar (1080×768)
 *
 * @param {Object} params
 * @param {string} params.brollVideoUrl — assembled B-roll video (from assembleShort)
 * @param {string} params.avatarVideoUrl — lip-synced avatar video
 * @param {number} params.duration — total duration in seconds
 * @param {string} params.falKey
 * @param {Object} params.supabase
 * @returns {Promise<{videoUrl: string}>}
 */
export async function composeSplitScreen({ brollVideoUrl, avatarVideoUrl, duration, falKey, supabase }) {
  if (!brollVideoUrl) throw new Error('brollVideoUrl required');
  if (!avatarVideoUrl) throw new Error('avatarVideoUrl required');
  if (!falKey) throw new Error('falKey required');

  const topHeight = Math.round(OUTPUT_HEIGHT * SPLIT_RATIO);    // 1152
  const bottomHeight = OUTPUT_HEIGHT - topHeight;                 // 768

  console.log(`[composeSplitScreen] Compositing split-screen: B-roll (${OUTPUT_WIDTH}×${topHeight}) + Avatar (${OUTPUT_WIDTH}×${bottomHeight})`);

  // --- IMPLEMENTER: Replace the API call below with the approach verified in Step 1 ---
  // The core requirements are:
  // 1. Scale B-roll video to 1080×1152 (top 60%)
  // 2. Scale avatar video to 1080×768 (bottom 40%)
  // 3. Stack vertically into 1080×1920
  // 4. Use ONLY the B-roll audio track (discard avatar audio)
  // 5. Output duration matches `duration` parameter

  // Example using filter_complex (if supported):
  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/compose`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tracks: [
        { id: 'broll', type: 'video', keyframes: [{ url: brollVideoUrl, timestamp: 0, duration: Math.ceil(duration * 1000), audio: true }] },
        { id: 'avatar', type: 'video', keyframes: [{ url: avatarVideoUrl, timestamp: 0, duration: Math.ceil(duration * 1000), audio: false }] },
      ],
      duration,
      // Adjust based on Step 1 findings — e.g.:
      // filter_complex: `[0:v]scale=${OUTPUT_WIDTH}:${topHeight}[top];[1:v]scale=${OUTPUT_WIDTH}:${bottomHeight}[bot];[top][bot]vstack=inputs=2[v]`,
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
    }),
  });

  if (!res.ok) throw new Error(`FAL ffmpeg split-screen compose failed: ${await res.text()}`);
  const queueData = await res.json();

  const output = await pollFalQueue(queueData.response_url, 'fal-ai/ffmpeg-api/compose', falKey, 120, 3000);
  const videoUrl = output?.video_url || output?.video?.url || output?.output_url;
  if (!videoUrl) throw new Error('No video URL from split-screen compose');

  const finalUrl = await uploadUrlToSupabase(videoUrl, supabase, 'pipeline/finals');
  return { videoUrl: finalUrl };
}
```

- [ ] **Step 2: Verify exports**

Run: `node -e "import('./api/lib/splitScreenCompositor.js').then(m => console.log('exports:', Object.keys(m)))"`
Expected: `exports: [ 'loopVideo', 'composeSplitScreen' ]`

- [ ] **Step 3: Commit**

```bash
git add api/lib/splitScreenCompositor.js
git commit -m "feat: add composeSplitScreen() for vertical split-screen compositing"
```

---

### Task 3: Backend — `generate-avatar-portrait` Action

**Files:**
- Modify: `api/workbench/workbench.js` (imports ~line 21, new case after line 359)

Add the first of three new avatar actions. This one loads a Visual Subject's LoRA config and generates a presenter-style portrait via `generateImageV2()`.

- [ ] **Step 1: Add import for splitScreenCompositor**

At the top of `workbench.js`, after the existing imports (line 33), add:

```javascript
import { loopVideo, composeSplitScreen } from '../lib/splitScreenCompositor.js';
import { recommendLipsyncModel, applyLipsync } from '../lib/storyboardLipsync.js';
```

- [ ] **Step 2: Add `generate-avatar-portrait` case**

Insert a new case block before the `save-draft` case (before line 403). Follow the existing action pattern (destructure from `req.body`, validate, call helpers, log cost, return JSON).

```javascript
      // ─── Avatar: Generate Portrait ────────────────────────────────
      case 'generate-avatar-portrait': {
        const { visual_subject_id } = req.body;
        if (!visual_subject_id) return res.status(400).json({ error: 'visual_subject_id required' });

        // Load Visual Subject (verify ownership)
        const { data: subject, error: subjectErr } = await supabase
          .from('visual_subjects')
          .select('id, name, lora_url, lora_trigger_word, reference_image_url')
          .eq('id', visual_subject_id)
          .eq('user_id', req.user.id)
          .single();
        if (subjectErr || !subject) return res.status(404).json({ error: 'Visual Subject not found' });
        if (!subject.lora_url) return res.status(400).json({ error: 'Visual Subject has no trained LoRA' });

        // Build presenter portrait prompt
        const triggerWord = subject.lora_trigger_word || 'person';
        const prompt = `${triggerWord} person speaking to camera, shoulders up, direct eye contact, neutral solid background, portrait photography, soft studio lighting`;

        // Generate portrait with LoRA
        const portraitUrl = await generateImageV2(
          'fal_nano_banana',
          prompt,
          'landscape_16_9', // 1344×768 — close to 1080×768 target, will be cropped
          keys,
          supabase,
          {
            loras: [{ path: subject.lora_url, scale: 0.85 }],
          },
        );

        logCost({ username: req.user.email, category: 'fal', operation: 'avatar_portrait', model: 'nano-banana-2', metadata: { visual_subject_id } });

        return res.json({ portrait_url: portraitUrl, subject_name: subject.name });
      }
```

- [ ] **Step 3: Verify the action is reachable**

Run the dev server and test with curl (requires valid auth token and subject ID):
```bash
curl -X POST http://localhost:3003/api/workbench/generate-avatar-portrait \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"visual_subject_id": "test-uuid"}'
```
Expected: 404 "Visual Subject not found" (confirms routing works; actual generation requires a real subject ID)

- [ ] **Step 4: Commit**

```bash
git add api/workbench/workbench.js
git commit -m "feat: add generate-avatar-portrait workbench action"
```

---

### Task 4: Backend — `animate-avatar` Action

**Files:**
- Modify: `api/workbench/workbench.js` (new case after `generate-avatar-portrait`)

Animate the portrait into a talking-head clip via I2V, then loop it to match the voiceover duration.

- [ ] **Step 1: Add `animate-avatar` case**

Insert after the `generate-avatar-portrait` case:

```javascript
      // ─── Avatar: Animate Portrait ─────────────────────────────────
      case 'animate-avatar': {
        const { portrait_url, duration: targetDuration } = req.body;
        if (!portrait_url) return res.status(400).json({ error: 'portrait_url required' });
        if (!targetDuration) return res.status(400).json({ error: 'duration required (voiceover length in seconds)' });

        // Hardcoded face-animation model — best for talking heads
        const AVATAR_VIDEO_MODEL = 'fal_wan25';
        const AVATAR_MOTION_PROMPT = 'person speaking naturally to camera, subtle head movement, gentle gestures, blinking, conversational body language';

        // Generate at model's max duration (Wan 2.5 supports up to 10s)
        const modelMaxDuration = 10;
        const clipDuration = Math.min(modelMaxDuration, targetDuration);

        const rawClipUrl = await animateImageV2(
          AVATAR_VIDEO_MODEL,
          portrait_url,
          AVATAR_MOTION_PROMPT,
          'landscape_16_9',
          clipDuration,
          keys,
          supabase,
          { generate_audio: false },
        );

        logCost({ username: req.user.email, category: 'fal', operation: 'avatar_animate', model: AVATAR_VIDEO_MODEL, metadata: { clip_duration: clipDuration, target_duration: targetDuration } });

        // Loop the clip to match voiceover duration if needed
        let avatarVideoUrl = rawClipUrl;
        if (targetDuration > clipDuration) {
          avatarVideoUrl = await loopVideo({
            videoUrl: rawClipUrl,
            clipDuration,
            targetDuration,
            falKey: keys.falKey,
            supabase,
          });
          logCost({ username: req.user.email, category: 'fal', operation: 'avatar_loop', model: 'ffmpeg-compose', metadata: { clip_duration: clipDuration, target_duration: targetDuration } });
        }

        return res.json({ avatar_video_url: avatarVideoUrl });
      }
```

- [ ] **Step 2: Commit**

```bash
git add api/workbench/workbench.js
git commit -m "feat: add animate-avatar workbench action with I2V + looping"
```

---

### Task 5: Backend — `lipsync-avatar` Action

**Files:**
- Modify: `api/workbench/workbench.js` (new case after `animate-avatar`)

Apply lip-sync to the avatar video using the existing `applyLipsync()` infrastructure.

- [ ] **Step 1: Add `lipsync-avatar` case**

Insert after the `animate-avatar` case:

```javascript
      // ─── Avatar: Lip-sync ─────────────────────────────────────────
      case 'lipsync-avatar': {
        const { avatar_video_url, voiceover_url } = req.body;
        if (!avatar_video_url) return res.status(400).json({ error: 'avatar_video_url required' });
        if (!voiceover_url) return res.status(400).json({ error: 'voiceover_url required' });

        // Recommend best model for realistic close-up talking head
        const model = recommendLipsyncModel({
          contentType: 'realistic',
          isCloseUp: true,
          hasVideoAlready: true,
        });

        const result = await applyLipsync({
          videoUrl: avatar_video_url,
          audioUrl: voiceover_url,
          model,
          falKey: keys.falKey,
          supabase,
        });

        logCost({ username: req.user.email, category: 'fal', operation: 'avatar_lipsync', model, metadata: { processing_time: result.processingTime } });

        return res.json({ lipsync_video_url: result.videoUrl, model_used: result.model });
      }
```

- [ ] **Step 2: Verify all three avatar actions register**

Run: `grep -c "case 'generate-avatar-portrait'\|case 'animate-avatar'\|case 'lipsync-avatar'" api/workbench/workbench.js`
Expected: `3`

- [ ] **Step 3: Commit**

```bash
git add api/workbench/workbench.js
git commit -m "feat: add lipsync-avatar workbench action"
```

---

### Task 6: Backend — Modify `assemble` Action for Split-Screen

**Files:**
- Modify: `api/workbench/workbench.js` (modify `assemble` case, lines 362-401)

When `avatarMode: true` and `avatar_lipsync_url` are present in the request, the assembly flow changes: assemble B-roll normally, then composite with the avatar via `composeSplitScreen()`.

- [ ] **Step 1: Modify the `assemble` case**

Replace the existing `assemble` case (lines 362-401) with:

```javascript
      // ─── Assemble ─────────────────────────────────────────────────
      case 'assemble': {
        const {
          clips, voiceover_url, music_url, music_volume = 0.15,
          tts_duration, voice_speed = 1.0, caption_config,
          sfx_url, sfx_volume = 0.3,
          avatar_mode, avatar_lipsync_url,
        } = req.body;

        if (!clips?.length) return res.status(400).json({ error: 'clips required' });
        if (!voiceover_url) return res.status(400).json({ error: 'voiceover_url required' });

        const videoUrls = clips.map(c => c.url);
        const clipDurations = clips.map(c => c.duration);

        // tts_duration from frontend is already the effective duration (raw / speed).
        // Don't divide by voice_speed again — that was causing a double-division bug.
        const effectiveTtsDuration = tts_duration || null;

        // Assemble B-roll with voiceover + music (same as before)
        const assembledUrl = await assembleShort(
          videoUrls, voiceover_url, music_url,
          keys.falKey, supabase,
          clipDurations, music_volume,
          effectiveTtsDuration,
          sfx_url, sfx_volume,
        );

        let finalUrl = assembledUrl;

        // Split-screen composite if avatar mode is active
        if (avatar_mode && avatar_lipsync_url) {
          const compositeDuration = effectiveTtsDuration
            || clipDurations.reduce((sum, d) => sum + d, 0);

          const { videoUrl: compositeUrl } = await composeSplitScreen({
            brollVideoUrl: assembledUrl,
            avatarVideoUrl: avatar_lipsync_url,
            duration: compositeDuration,
            falKey: keys.falKey,
            supabase,
          });

          finalUrl = compositeUrl;
          logCost({ username: req.user.email, category: 'fal', operation: 'avatar_split_screen', model: 'ffmpeg-compose' });
        }

        // Burn captions
        const uncaptionedUrl = finalUrl;
        if (caption_config) {
          try {
            finalUrl = await burnCaptions(finalUrl, caption_config, keys.falKey, supabase);
          } catch (err) {
            console.warn(`[workbench] Caption burn failed, using uncaptioned: ${err.message}`);
          }
        }

        logCost({ username: req.user.email, category: 'fal', operation: 'workbench_assemble', model: 'ffmpeg-compose', metadata: { clip_count: clips.length, avatar_mode: !!avatar_mode } });

        return res.json({ video_url: finalUrl, uncaptioned_url: uncaptionedUrl });
      }
```

**Key changes from the original:**
- Destructure `avatar_mode` and `avatar_lipsync_url` from request body
- After `assembleShort()`, conditionally call `composeSplitScreen()` if avatar mode is active
- Cost logging includes `avatar_mode` flag
- Captions burn on the composite (split-screen) video, not the B-roll video — so captions appear at the seam

- [ ] **Step 2: Verify the assemble action compiles**

Run: `node -e "import('./api/workbench/workbench.js').then(() => console.log('OK'))"`
Expected: `OK` (no import errors)

- [ ] **Step 3: Commit**

```bash
git add api/workbench/workbench.js
git commit -m "feat: modify assemble action for split-screen composite when avatar mode active"
```

---

### Task 7: Frontend — Avatar State & Toggle in Step 1

**Files:**
- Modify: `src/pages/ShortsWorkbenchPage.jsx`

Add avatar mode state variables, the toggle switch in Step 1, and the Visual Subject picker dropdown.

- [ ] **Step 1: Add avatar state variables**

After the Step 1 state variables (after `voiceApproved` ~line 427), add:

```javascript
  // ── Avatar Mode ─────────────────────────────────────────────────
  const [avatarMode, setAvatarMode] = useState(false);
  const [avatarSubjectId, setAvatarSubjectId] = useState(null);
  const [avatarSubjectName, setAvatarSubjectName] = useState('');
  const [avatarSubjects, setAvatarSubjects] = useState([]); // fetched from API
  const [avatarPortraitUrl, setAvatarPortraitUrl] = useState(null);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(null);
  const [avatarLipsyncUrl, setAvatarLipsyncUrl] = useState(null);
  const [avatarStage, setAvatarStage] = useState(null); // 'portrait' | 'animating' | 'lipsyncing' | 'done' | null
  const [avatarLoading, setAvatarLoading] = useState(false);
```

- [ ] **Step 2: Add avatar subjects fetch**

After the existing `loadDraftList` function (~line 540), add:

```javascript
  // Fetch user's Visual Subjects when avatar mode is toggled on
  const fetchAvatarSubjects = async () => {
    try {
      const res = await apiFetch('/api/brand/avatars');
      const data = await res.json();
      if (data.avatars) setAvatarSubjects(data.avatars.filter(a => a.lora_url));
    } catch {}
  };

  useEffect(() => {
    if (avatarMode && avatarSubjects.length === 0) fetchAvatarSubjects();
  }, [avatarMode]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Update `getWorkbenchState()` to include avatar fields**

Find the `getWorkbenchState` function (~line 472) and add avatar fields to the returned object:

```javascript
  const getWorkbenchState = () => ({
    step, niche, topic, storyContext, framework: framework?.id || null,
    duration, script, geminiVoice, styleInstructions, voiceSpeed,
    voiceoverUrl, voiceApproved,
    blocks, ttsDuration, rawTtsDuration, musicUrl, musicApproved, musicVolume, enableMusic,
    sfxUrl, sfxVolume, enableSfx,
    visualStyle, videoStyle, imageModel, videoModel, aspectRatio,
    frames, scenePrompts, sceneRefs, clips, finalVideoUrl: finalUrl,
    // Avatar mode
    avatarMode, avatarSubjectId, avatarSubjectName,
    avatarPortraitUrl, avatarVideoUrl, avatarLipsyncUrl,
  });
```

- [ ] **Step 4: Update `loadDraft()` to restore avatar fields**

Find the `loadDraft` function (~line 502). After the existing state restoration (after `setFinalUrl` ~line 525), add:

```javascript
      // Restore avatar state
      setAvatarMode(s.avatarMode || false);
      setAvatarSubjectId(s.avatarSubjectId || null);
      setAvatarSubjectName(s.avatarSubjectName || '');
      setAvatarPortraitUrl(s.avatarPortraitUrl || null);
      setAvatarVideoUrl(s.avatarVideoUrl || null);
      setAvatarLipsyncUrl(s.avatarLipsyncUrl || null);
      setAvatarStage(s.avatarLipsyncUrl ? 'done' : null);
```

- [ ] **Step 5: Add Avatar Mode toggle and Subject picker to Step 1 UI**

Find the niche selector in Step 1 (`step === 'script'`, ~line 901). After the Duration selector buttons (after the `</div>` closing the duration block, ~line 952), add the avatar toggle section:

```jsx
                  {/* Avatar Mode */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={avatarMode} onChange={e => {
                        setAvatarMode(e.target.checked);
                        if (!e.target.checked) {
                          setAvatarSubjectId(null); setAvatarSubjectName('');
                          setAvatarPortraitUrl(null); setAvatarVideoUrl(null);
                          setAvatarLipsyncUrl(null); setAvatarStage(null);
                        }
                      }}
                        className="w-4 h-4 rounded border-slate-300 text-[#2C666E] focus:ring-[#2C666E]" />
                      <span className="text-[11px] font-semibold text-slate-700">Avatar Mode</span>
                      <span className="text-[9px] text-slate-400">(split-screen talking head)</span>
                    </label>

                    {avatarMode && (
                      <div className="mt-2 ml-6">
                        {avatarSubjects.length > 0 ? (
                          <div className="space-y-2">
                            <select
                              value={avatarSubjectId || ''}
                              onChange={e => {
                                const subject = avatarSubjects.find(s => s.id === e.target.value);
                                setAvatarSubjectId(subject?.id || null);
                                setAvatarSubjectName(subject?.name || '');
                                // Reset avatar pipeline when subject changes
                                setAvatarPortraitUrl(null); setAvatarVideoUrl(null);
                                setAvatarLipsyncUrl(null); setAvatarStage(null);
                              }}
                              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white"
                            >
                              <option value="">Select a character...</option>
                              {avatarSubjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            {avatarSubjectId && (() => {
                              const subject = avatarSubjects.find(s => s.id === avatarSubjectId);
                              return subject?.reference_image_url ? (
                                <img src={subject.reference_image_url} alt={subject.name}
                                  className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400">
                            No characters with trained LoRAs found.{' '}
                            <button onClick={() => navigate('/settings')} className="text-[#2C666E] underline">Train one first</button>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/ShortsWorkbenchPage.jsx
git commit -m "feat: add avatar mode toggle and Visual Subject picker to Step 1"
```

---

### Task 8: Frontend — B-Roll Label in Step 3

**Files:**
- Modify: `src/pages/ShortsWorkbenchPage.jsx`

When avatar mode is on, show a label above the keyframe grid clarifying that these images are for the upper B-roll portion.

- [ ] **Step 1: Find Step 3 (frames) rendering**

Search for `step === 'frames'` in `ShortsWorkbenchPage.jsx`. Find the Panel title for the frames step.

- [ ] **Step 2: Add B-roll label**

Add a conditional label inside the frames Panel, before the scene cards:

```jsx
                {avatarMode && (
                  <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-[10px] font-semibold text-blue-700">
                      🖼️ B-Roll Scenes (top 60%) — These images fill the upper portion of the split-screen. Your avatar will appear below.
                    </p>
                  </div>
                )}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ShortsWorkbenchPage.jsx
git commit -m "feat: add B-roll label in Step 3 when avatar mode is active"
```

---

### Task 9: Frontend — Avatar Generation Card in Step 4

**Files:**
- Modify: `src/pages/ShortsWorkbenchPage.jsx`

Add the avatar generation UI below the B-roll clip cards in Step 4. This shows the portrait preview, a pipeline trigger button, progress stages, and the final lip-synced avatar preview.

- [ ] **Step 1: Add avatar generation handler function**

After the existing `generateClip` function (search for `const generateClip`), add:

```javascript
  const generateAvatarPipeline = async () => {
    if (!avatarSubjectId || !voiceoverUrl) {
      toast.error('Select a character and generate voiceover first');
      return;
    }
    setAvatarLoading(true);
    // effectiveDuration is already computed in the component as ttsDuration / voiceSpeed
    const effectiveDur = effectiveDuration || duration;

    try {
      // Stage 1: Portrait
      setAvatarStage('portrait');
      let portraitUrl = avatarPortraitUrl;
      if (!portraitUrl) {
        const portraitRes = await apiFetch('/api/workbench/generate-avatar-portrait', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visual_subject_id: avatarSubjectId }),
        });
        const portraitData = await parseApiResponse(portraitRes);
        portraitUrl = portraitData.portrait_url;
        setAvatarPortraitUrl(portraitUrl);
      }

      // Stage 2: Animate + Loop
      setAvatarStage('animating');
      const animRes = await apiFetch('/api/workbench/animate-avatar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portrait_url: portraitUrl, duration: effectiveDur }),
      });
      const animData = await parseApiResponse(animRes);
      setAvatarVideoUrl(animData.avatar_video_url);

      // Stage 3: Lip-sync
      setAvatarStage('lipsyncing');
      const lipsyncRes = await apiFetch('/api/workbench/lipsync-avatar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_video_url: animData.avatar_video_url,
          voiceover_url: voiceoverUrl,
        }),
      });
      const lipsyncData = await parseApiResponse(lipsyncRes);
      setAvatarLipsyncUrl(lipsyncData.lipsync_video_url);

      setAvatarStage('done');
      saveDraft();
    } catch (err) {
      toast.error(`Avatar generation failed: ${err.message}`);
      setAvatarStage(null);
    } finally {
      setAvatarLoading(false);
    }
  };

  const regenerateAvatar = () => {
    setAvatarPortraitUrl(null);
    setAvatarVideoUrl(null);
    setAvatarLipsyncUrl(null);
    setAvatarStage(null);
    generateAvatarPipeline();
  };
```

- [ ] **Step 2: Add avatar generation card UI in Step 4**

Find the end of the clips section in Step 4 (after the Duration validation block, before the `</Panel>` closing tag for "Generate Video Clips", ~line 1592). Add the avatar card.

**Note:** `<Tag>` and `<Loader2>` are already defined/imported in `ShortsWorkbenchPage.jsx` — `Tag` is a local component (~line 170), `Loader2` is imported from lucide-react. No new imports needed.

```jsx
              {/* Avatar Generation */}
              {avatarMode && avatarSubjectId && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                    🎭 Avatar — {avatarSubjectName}
                    <span className="text-[9px] text-slate-400 font-normal">(bottom 40% of split-screen)</span>
                  </h3>

                  {/* Portrait preview */}
                  {avatarPortraitUrl && (
                    <div className="mb-3">
                      <p className="text-[9px] text-slate-500 mb-1">Presenter Portrait</p>
                      <img src={avatarPortraitUrl} alt="Avatar portrait" className="h-24 rounded-lg border border-slate-200" />
                    </div>
                  )}

                  {/* Progress stages */}
                  {avatarStage && avatarStage !== 'done' && (
                    <div className="flex items-center gap-2 mb-3">
                      <Loader2 className="w-4 h-4 animate-spin text-[#2C666E]" />
                      <span className="text-xs text-slate-600">
                        {avatarStage === 'portrait' && 'Generating portrait...'}
                        {avatarStage === 'animating' && 'Animating avatar (this may take a few minutes)...'}
                        {avatarStage === 'lipsyncing' && 'Lip-syncing to voiceover...'}
                      </span>
                    </div>
                  )}

                  {/* Done — show lip-synced preview */}
                  {avatarStage === 'done' && avatarLipsyncUrl && (
                    <div className="mb-3">
                      <Tag color="teal">✓ Avatar ready</Tag>
                      <video src={avatarLipsyncUrl} controls className="h-28 rounded-lg mt-2" />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {!avatarStage && (
                      <button onClick={generateAvatarPipeline} disabled={avatarLoading || !voiceoverUrl}
                        className="px-4 py-2 bg-[#2C666E] text-white rounded-lg text-[10px] font-semibold hover:bg-[#1f4f55] disabled:opacity-50">
                        🎭 Generate Avatar Video
                      </button>
                    )}
                    {avatarStage === 'done' && (
                      <button onClick={regenerateAvatar} disabled={avatarLoading}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-[10px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                        Regenerate
                      </button>
                    )}
                    {!voiceoverUrl && (
                      <p className="text-[9px] text-amber-500 self-center">Generate voiceover in Step 1 first</p>
                    )}
                  </div>
                </div>
              )}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ShortsWorkbenchPage.jsx
git commit -m "feat: add avatar generation card with 3-stage pipeline in Step 4"
```

---

### Task 10: Frontend — Pass Avatar Data to Assembly

**Files:**
- Modify: `src/pages/ShortsWorkbenchPage.jsx`

Update the assembly call to include avatar mode data when active.

- [ ] **Step 1: Find the assembly API call**

Search for `'/api/workbench/assemble'` in `ShortsWorkbenchPage.jsx`. Find the `handleAssemble` or inline assembly function.

- [ ] **Step 2: Add avatar fields to the assembly request body**

In the `body: JSON.stringify({...})` call for the assemble action, add two fields:

```javascript
        body: JSON.stringify({
          clips: clipArray,
          voiceover_url: voiceoverUrl,
          music_url: enableMusic ? musicUrl : null,
          music_volume: musicVolume,
          tts_duration: effectiveDuration,
          voice_speed: voiceSpeed,
          caption_config: captionConfig,
          sfx_url: enableSfx ? sfxUrl : null,
          sfx_volume: sfxVolume,
          // Avatar split-screen
          avatar_mode: avatarMode && !!avatarLipsyncUrl,
          avatar_lipsync_url: avatarMode ? avatarLipsyncUrl : null,
        }),
```

The `avatar_mode` flag is only true when both avatar mode is on AND the lip-synced avatar video exists. This ensures the backend falls back to normal assembly if the avatar pipeline wasn't completed.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ShortsWorkbenchPage.jsx
git commit -m "feat: pass avatar mode data to assembly endpoint"
```

---

### Task 11: Integration Verification

**Files:** None (testing only)

Verify the full pipeline works end-to-end by running the dev server and testing each step.

- [ ] **Step 1: Start the dev server**

Run: `npm run start`
Verify both Express (port 3003) and Vite (port 4390) start without errors.

- [ ] **Step 2: Verify backend imports compile**

Run: `node -e "import('./api/workbench/workbench.js').then(() => console.log('workbench OK')); import('./api/lib/splitScreenCompositor.js').then(m => console.log('compositor exports:', Object.keys(m)))"`
Expected: Both modules load without errors.

- [ ] **Step 3: Verify frontend renders**

Open `http://localhost:4390/shorts/workbench` in a browser. Verify:
1. Step 1 loads with niche selector
2. Avatar Mode checkbox appears below Duration selector
3. Toggling it on shows the Visual Subject dropdown
4. Toggling it off hides the dropdown

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: No build errors.

- [ ] **Step 5: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: address integration issues from avatar split-screen testing"
```

- [ ] **Step 6: Deploy**

```bash
git push && fly deploy
```
