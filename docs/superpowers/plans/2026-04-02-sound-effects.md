# Sound Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-short ambient sound effects via ElevenLabs SFX, mixed as a third audio track alongside voiceover and music.

**Architecture:** `generateSoundEffect()` in pipelineHelpers.js calls `fal-ai/elevenlabs/sound-effects/v2`, niche-derived prompt, result added as third track in `assembleShort()`. Frontend controls in Step 2 next to music.

**Tech Stack:** FAL.ai (ElevenLabs SFX proxy), FFmpeg Compose (multi-track audio), React

**Spec:** `docs/superpowers/specs/2026-04-02-sound-effects-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `api/lib/pipelineHelpers.js` | Modify | Add `generateSoundEffect()`, `buildSfxPrompt()`, `NICHE_SFX_PROMPTS`, update `assembleShort()` signature |
| `api/workbench/workbench.js` | Modify | Add `sfx` action case |
| `src/pages/ShortsWorkbenchPage.jsx` | Modify | Add SFX state, controls in Step 2, pass SFX to assembly |

---

### Task 1: Backend — `generateSoundEffect()` + `assembleShort()` Update

**Files:**
- Modify: `api/lib/pipelineHelpers.js`

- [ ] **Step 1: Add `NICHE_SFX_PROMPTS` constant and `buildSfxPrompt()` function**

Add near the top of the file (after imports, near `buildMusicPrompt()`):

```javascript
const NICHE_SFX_PROMPTS = {
  ai_tech_news: 'subtle digital ambiance, soft electronic hum, futuristic data center atmosphere',
  finance_money: 'soft professional office ambiance, muted urban background, subtle corporate atmosphere',
  motivation: 'gentle inspirational ambiance, soft uplifting tones, warm atmospheric pad',
  horror_creepy: 'eerie ambient tension, low rumble, distant unsettling creaks',
  history_era: 'soft historical ambiance, gentle wind, subtle old-world atmosphere',
  crime_mystery: 'tense investigative ambiance, subtle suspense tones, muted city night sounds',
  science_nature: 'gentle nature ambiance, soft lab environment, subtle wonder tones',
  dating_relationships: 'warm intimate ambiance, soft cafe atmosphere, gentle romantic tones',
  fitness_health: 'energetic gym ambiance, soft motivational pulse, active environment sounds',
  gaming: 'retro digital ambiance, soft arcade tones, electronic game atmosphere',
  conspiracy: 'dark mysterious ambiance, low tension hum, unsettling surveillance tones',
  business_startup: 'modern workspace ambiance, soft startup energy, professional focus tones',
  food_cooking: 'warm kitchen ambiance, gentle sizzle, cozy culinary atmosphere',
  travel: 'ambient world sounds, soft airport atmosphere, gentle exotic tones',
  psychology: 'calm analytical ambiance, soft thoughtful tones, subtle clinical atmosphere',
  space_cosmos: 'deep space ambiance, cosmic hum, vast ethereal atmosphere',
  animals_nature: 'natural wildlife ambiance, gentle forest sounds, outdoor atmosphere',
  sports: 'stadium crowd ambiance, athletic energy, competitive atmosphere tones',
  education: 'soft academic ambiance, quiet library atmosphere, gentle study tones',
  paranormal_ufo: 'eerie otherworldly ambiance, strange frequencies, unsettling extraterrestrial atmosphere',
};

export function buildSfxPrompt(niche) {
  return NICHE_SFX_PROMPTS[niche] || 'subtle cinematic ambiance, gentle atmospheric background';
}
```

- [ ] **Step 2: Add `generateSoundEffect()` function**

Add next to the existing `generateMusic()` function. Follow the same pattern: submit to FAL queue → poll → upload to Supabase.

```javascript
/**
 * Generate ambient sound effect via ElevenLabs SFX through FAL.
 * @param {string} prompt - SFX description
 * @param {number} durationSeconds - Target duration in seconds
 * @param {string} falKey - FAL API key
 * @param {object} supabase - Supabase client
 * @returns {string|null} Supabase URL of generated SFX audio
 */
export async function generateSoundEffect(prompt, durationSeconds, falKey, supabase) {
  const FAL_BASE = 'https://queue.fal.run';
  const clampedDuration = Math.max(1, Math.min(22, durationSeconds));

  console.log(`[generateSoundEffect] Generating SFX: "${prompt.slice(0, 80)}..." (${clampedDuration}s)`);

  const submitRes = await fetch(`${FAL_BASE}/fal-ai/elevenlabs/sound-effects/v2`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: prompt.slice(0, 300),
      duration_seconds: clampedDuration,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => '');
    throw new Error(`SFX submit failed (${submitRes.status}): ${errText.slice(0, 200)}`);
  }

  const submitData = await submitRes.json();
  const requestId = submitData.request_id;

  if (!requestId) throw new Error('SFX submit returned no request_id');

  // Poll for result
  const result = await pollFalQueue(requestId, 'fal-ai/elevenlabs/sound-effects/v2', falKey, { maxAttempts: 30, intervalMs: 3000 });

  const audioUrl = result?.audio?.url || result?.output?.url || result?.url;
  if (!audioUrl) throw new Error('SFX result has no audio URL');

  // Upload to Supabase for permanent storage
  const permanentUrl = await uploadUrlToSupabase(audioUrl, supabase, 'audio/mpeg');
  console.log(`[generateSoundEffect] SFX uploaded: ${permanentUrl}`);
  return permanentUrl;
}
```

**Important:** Check the actual FAL response shape for `fal-ai/elevenlabs/sound-effects/v2` — the audio URL field might be `audio.url`, `output.url`, or just `url`. The code above tries all three. Also check if the API uses `text` or `prompt` as the prompt field name, and whether duration is `duration_seconds` or `duration`. Verify against FAL docs or by inspecting a test response.

- [ ] **Step 3: Update `assembleShort()` to accept SFX track**

Find the `assembleShort()` function signature and add `sfxUrl` and `sfxVolume` parameters. Then add the SFX track to the tracks array.

Current signature (approximate):
```javascript
export async function assembleShort(videoUrls, voiceoverUrl, musicUrl, falKey, supabase, clipDurations, musicVolume = 0.15, ttsDuration)
```

Add after `ttsDuration`:
```javascript
export async function assembleShort(videoUrls, voiceoverUrl, musicUrl, falKey, supabase, clipDurations, musicVolume = 0.15, ttsDuration, sfxUrl = null, sfxVolume = 0.3)
```

Then inside the function, after the music track is added to `tracks`, add:

```javascript
if (sfxUrl) {
  tracks.push({
    id: 'sfx',
    type: 'audio',
    keyframes: [{ url: sfxUrl, timestamp: 0, duration: totalDurationMs, volume: sfxVolume }],
  });
}
```

Where `totalDurationMs` is the total duration in milliseconds (same value used for the music track's duration).

- [ ] **Step 4: Export `buildSfxPrompt` if not already exported**

Ensure `buildSfxPrompt` and `generateSoundEffect` are both exported from pipelineHelpers.js so workbench.js can import them.

- [ ] **Step 5: Commit**

```bash
git add api/lib/pipelineHelpers.js
git commit -m "feat: add generateSoundEffect() and SFX track in assembleShort()"
```

---

### Task 2: Workbench Action

**Files:**
- Modify: `api/workbench/workbench.js`

- [ ] **Step 1: Add `sfx` action case**

Import `buildSfxPrompt` and `generateSoundEffect` from pipelineHelpers.js (they may already be available if pipelineHelpers is imported).

Add the `sfx` case near the existing `music` case:

```javascript
case 'sfx': {
  const { niche, duration = 65 } = req.body;
  const prompt = buildSfxPrompt(niche);
  try {
    const sfxUrl = await generateSoundEffect(prompt, duration, keys.falKey, supabase);
    return res.json({ sfx_url: sfxUrl });
  } catch (err) {
    console.warn('[workbench/sfx] SFX generation failed (non-blocking):', err.message);
    return res.json({ sfx_url: null });
  }
}
```

- [ ] **Step 2: Update `assemble` action to pass SFX**

Find the `assemble` case. Add `sfx_url` and `sfx_volume` to the destructured request body, and pass them through to `assembleShort()`:

In the request body destructuring, add:
```javascript
sfx_url, sfx_volume = 0.3,
```

In the `assembleShort()` call, add the two new params at the end:
```javascript
const assembledUrl = await assembleShort(
  videoUrls, voiceover_url, music_url,
  keys.falKey, supabase,
  clipDurations, music_volume,
  effectiveTtsDuration,
  sfx_url, sfx_volume  // new
);
```

- [ ] **Step 3: Commit**

```bash
git add api/workbench/workbench.js
git commit -m "feat: add sfx workbench action and pass SFX to assembly"
```

---

### Task 3: Frontend — SFX Controls

**Files:**
- Modify: `src/pages/ShortsWorkbenchPage.jsx`

- [ ] **Step 1: Add SFX state variables**

Add near the existing music state (~line 429-438):

```javascript
const [sfxUrl, setSfxUrl] = useState(null);
const [sfxLoading, setSfxLoading] = useState(false);
const [sfxVolume, setSfxVolume] = useState(0.3);
const [enableSfx, setEnableSfx] = useState(true);
```

- [ ] **Step 2: Add SFX to draft save/load**

In `getWorkbenchState()` (the function that serializes state for draft saving), add:
```javascript
sfxUrl, sfxVolume, enableSfx,
```

In the draft load handler (where state is restored from `storyboard_json`), add:
```javascript
setSfxUrl(s.sfxUrl || null);
setSfxVolume(s.sfxVolume ?? 0.3);
setEnableSfx(s.enableSfx ?? true);
```

- [ ] **Step 3: Add `generateSfx` function**

Add near the existing `generateMusic` function:

```javascript
const generateSfx = async () => {
  setSfxLoading(true);
  try {
    const res = await apiFetch('/api/workbench/sfx', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        niche,
        duration: Math.ceil(effectiveDuration) + 3,
      }),
    });
    const data = await parseApiResponse(res);
    if (data.sfx_url) {
      setSfxUrl(data.sfx_url);
    } else {
      toast.warning('SFX generation unavailable');
    }
  } catch (err) { toast.warning(err.message || 'SFX generation failed'); }
  finally { setSfxLoading(false); }
};
```

- [ ] **Step 4: Add SFX UI controls in Step 2**

Find the music controls section in Step 2 (Timing & Music). Add SFX controls below music, using the same visual pattern:

```jsx
{/* Sound Effects */}
<div className="mt-4 pt-4 border-t border-slate-100">
  <div className="flex items-center justify-between mb-2">
    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sound Effects</label>
    <button onClick={() => setEnableSfx(!enableSfx)}
      className={cn('text-[10px] px-2 py-0.5 rounded-full', enableSfx ? 'bg-[#2C666E] text-white' : 'bg-slate-200 text-slate-500')}>
      {enableSfx ? 'On' : 'Off'}
    </button>
  </div>
  {enableSfx && (
    <div className="space-y-2">
      <button onClick={generateSfx} disabled={sfxLoading || !niche}
        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
        {sfxLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating SFX...</> : '🔊 Generate Sound Effects'}
      </button>
      {sfxUrl && (
        <>
          <audio src={sfxUrl} controls className="w-full h-8" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 w-12">Volume</span>
            <input type="range" min="0" max="100" value={Math.round(sfxVolume * 100)}
              onChange={e => setSfxVolume(Number(e.target.value) / 100)}
              className="flex-1 h-1 accent-[#2C666E]" />
            <span className="text-[10px] text-slate-400 w-8">{Math.round(sfxVolume * 100)}%</span>
          </div>
        </>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 5: Pass SFX to assembly**

Find the assembly request (the `handleAssemble` or similar function that calls `/api/workbench/assemble`). Add SFX params to the request body:

```javascript
sfx_url: enableSfx ? sfxUrl : null,
sfx_volume: sfxVolume,
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/ShortsWorkbenchPage.jsx
git commit -m "feat: add SFX controls in Step 2 with toggle, volume, and preview"
```

---

### Task 4: Build Verification + Deploy

- [ ] **Step 1: Verify build**

```bash
npm run build
```

Expect clean build with no errors.

- [ ] **Step 2: Push and deploy**

```bash
git push origin main
fly deploy
```

- [ ] **Step 3: Verify in production**

Test the full flow: generate SFX in Step 2, assemble with SFX, verify the final video has three audio layers.
