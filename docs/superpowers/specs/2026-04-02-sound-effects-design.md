# Sound Effects — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Feature:** Per-short ambient sound effects via ElevenLabs SFX, mixed as a third audio track

## Problem

Shorts currently have two audio layers: voiceover and background music. Competing tools (ClipZap, Nate Herk's pipeline) add sound effects for production polish — ambient atmosphere, transitions, or tonal texture. Without SFX, Stitch shorts sound flat compared to manually-produced content.

## Solution

Add a single ambient sound effect per short, generated via `fal-ai/elevenlabs/sound-effects/v2`, mixed as a third audio track in `assembleShort()`. The SFX prompt is auto-derived from the niche template's mood. Controls live in Step 2 (Timing & Music) alongside the existing music controls.

## Architecture

### Data Flow

```
User clicks "Generate SFX" in Step 2
    |
    v
Backend: POST /api/workbench/sfx
  - Build SFX prompt from niche mood
  - Call fal-ai/elevenlabs/sound-effects/v2 via FAL queue
  - Upload result to Supabase
  - Return sfx_url
    |
    v
Frontend stores sfx_url in state
    |
    v
Assembly: sfx_url passed to assembleShort()
  - Added as third audio track (id: 'sfx')
  - Volume controlled independently (default 0.3)
```

### SFX Generation

**Endpoint:** `fal-ai/elevenlabs/sound-effects/v2` (confirmed available via FAL)

**Function:** `generateSoundEffect(prompt, durationSeconds, falKey, supabase)` added to `api/lib/pipelineHelpers.js`, next to `generateMusic()`.

Pattern follows `generateMusic()` exactly:
1. Submit to FAL queue via `fetch(FAL_BASE/fal-ai/elevenlabs/sound-effects/v2)`
2. Poll via `pollFalQueue()`
3. Upload result to Supabase via `uploadUrlToSupabase()`
4. Return permanent URL

**Prompt:** Auto-built from niche template mood via `buildSfxPrompt(niche)`. Each niche gets an atmospheric SFX description:

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
```

Fallback for unknown niches: `'subtle cinematic ambiance, gentle atmospheric background'`.

**Duration:** Matches the video duration (same value passed to music generation — `Math.ceil(effectiveDuration) + 3` seconds buffer).

### Assembly Integration

`assembleShort()` in `api/lib/pipelineHelpers.js` gets two new optional parameters:
- `sfxUrl` (string, optional) — URL of the sound effect audio file
- `sfxVolume` (number, default 0.3) — volume level for the SFX track

When `sfxUrl` is provided, a third audio track is added to the FFmpeg compose payload:

```javascript
if (sfxUrl) {
  tracks.push({
    id: 'sfx',
    type: 'audio',
    keyframes: [{ url: sfxUrl, timestamp: 0, duration: totalDurationMs, volume: sfxVolume }],
  });
}
```

No changes to existing voiceover or music track logic.

### Workbench Action

New `sfx` case in `api/workbench/workbench.js`:

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

Note: The response uses `sfx_url` (not `audio_url` like the music action) to clearly distinguish SFX from music in the frontend.

## Frontend Changes

### Step 2 (Timing & Music)

Add SFX controls below the existing music section. Same visual pattern — toggle, generate button, volume slider, audio preview.

**New state variables:**
```javascript
const [sfxUrl, setSfxUrl] = useState(null);
const [sfxLoading, setSfxLoading] = useState(false);
const [sfxVolume, setSfxVolume] = useState(0.3);
const [enableSfx, setEnableSfx] = useState(true);
```

**UI elements:**
- Toggle: "Sound Effects" on/off (default on)
- Generate button: "Generate SFX" — calls `POST /api/workbench/sfx` with `{ niche, duration }`
- Volume slider: 0-100% range, default 30%
- Audio preview: `<audio>` element to preview the generated SFX (same pattern as music preview)
- Regenerate: clicking "Generate SFX" again replaces the current SFX

**Assembly integration:** The assemble step passes `sfxUrl` and `sfxVolume` in the request body alongside `musicUrl` and `musicVolume`. Only passed when `enableSfx` is true and `sfxUrl` exists.

### Draft Persistence

`sfxUrl`, `sfxVolume`, and `enableSfx` are stored inside `storyboard_json` via `getWorkbenchState()` and restored on draft load. No dedicated database column needed — unlike `music_url` which has its own column in `ad_drafts`, SFX lives only in the JSON blob. This is appropriate since SFX is optional polish, not a primary asset.

## Error Handling

**SFX generation failure:** Unlike the `music` action (which returns 500 on failure), the `sfx` action catches errors and returns `{ sfx_url: null }` with a 200 status. SFX is optional polish — it should never block the workflow. Frontend shows a brief `toast.warning('SFX generation failed')` but continues normally. Assembly proceeds without SFX.

This is an intentional deviation from the music action pattern. Music is a core audio layer; SFX is ambient polish. The `sfx` action wraps `generateSoundEffect()` in a try-catch that returns null on any failure.

**Assembly:** No special SFX error handling in assembly. If `sfxUrl` is provided, it's added as a track. If the URL is bad, FFmpeg compose will fail and the standard assembly error handling applies (same as if any other track URL was invalid).

## Files Changed

| File | Change |
|---|---|
| `api/lib/pipelineHelpers.js` | Add `generateSoundEffect()`, `buildSfxPrompt()`, `NICHE_SFX_PROMPTS`. Add `sfxUrl`/`sfxVolume` params to `assembleShort()`. |
| `api/workbench/workbench.js` | Add `sfx` action case |
| `src/pages/ShortsWorkbenchPage.jsx` | Add SFX state, controls in Step 2, pass SFX to assembly |

## Cost

- ElevenLabs SFX via FAL: ~$0.01-0.02 per generation
- No additional assembly cost (FFmpeg compose handles extra tracks at same price)
- **Total per short with SFX: ~$0.01-0.02 extra**

## Backward Compatibility

- `sfxUrl` and `sfxVolume` are optional in `assembleShort()` — existing callers unaffected
- Older drafts without SFX state load fine (defaults to `null`/`0.3`/`true`)
- The `sfx` workbench action is additive — no existing actions change

## Dependencies

- `fal-ai/elevenlabs/sound-effects/v2` — confirmed available via FAL model listing
- `FAL_KEY` — already used everywhere, resolved via `getUserKeys()`
- No new external dependencies

## Out of Scope

- Per-scene sound effects (different SFX per scene)
- SFX library/presets (user picks from a catalog)
- Auto-generated SFX from script analysis (GPT reads script → suggests cue points)
- SFX layering (multiple SFX tracks stacked)
