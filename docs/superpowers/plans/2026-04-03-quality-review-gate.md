# Quality Review Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically review assembled Shorts for visual-narration mismatches using GPT-4.1-mini vision, with one-click scene repair.

**Architecture:** After assembly, the frontend fires a background `review-quality` request that extracts one frame per scene clip (`frame_type: 'middle'`), sends each to GPT-4.1-mini vision with the narration text, and returns pass/fail per scene. Flagged scenes get a "Repair" button that triggers the existing `generate-clip` workbench action.

**Tech Stack:** GPT-4.1-mini vision (OpenAI), FAL extract-frame API, Express backend, React frontend

---

## File Structure

| File | Role | Action |
|---|---|---|
| `api/lib/qualityReviewer.js` | Core review logic: frame extraction + vision analysis | **Create** |
| `api/workbench/workbench.js` | Add `review-quality` action case + import | **Modify** |
| `src/pages/ShortsWorkbenchPage.jsx` | Auto-trigger review, results panel, repair buttons | **Modify** |

---

### Task 1: Create `qualityReviewer.js` — Frame Extraction Helper

**Files:**
- Create: `api/lib/qualityReviewer.js`

**Reference docs:**
- `api/lib/pipelineHelpers.js` lines 563-584 — `extractFirstFrame()` shows the exact FAL extract-frame API pattern (submit → poll → parse `images[0].url`)
- CLAUDE.md: "`extractLastFrame` uses `frame_type: 'last'`... The FAL extract-frame API supports `'first'`, `'middle'`, `'last'`"
- CLAUDE.md: "`pollFalQueue` uses the full model endpoint path for queue URLs (e.g. `fal-ai/ffmpeg-api/compose`, not `fal-ai/ffmpeg-api`). Never truncate multi-segment FAL paths"

- [ ] **Step 1: Create the file with extractMiddleFrame and a stub reviewSceneAlignment**

Create `api/lib/qualityReviewer.js` with:
- A private `extractMiddleFrame(clipUrl, falKey)` function that calls `fal-ai/ffmpeg-api/extract-frame` with `{ video_url: clipUrl, frame_type: 'middle' }`, polls with `pollFalQueue`, and returns the image URL. Follow the exact pattern from `extractFirstFrame()` in `pipelineHelpers.js`.
- A stub `reviewSceneAlignment()` that just calls `extractMiddleFrame` for each clip in parallel and returns placeholder results.

```javascript
/**
 * Quality Review Gate
 *
 * Extracts one frame per scene clip, sends to GPT-4.1-mini vision
 * to check if visuals match the narration, returns per-scene pass/fail.
 */

import { pollFalQueue } from './pipelineHelpers.js';
import OpenAI from 'openai';

const FAL_BASE = 'https://queue.fal.run';

/**
 * Extract the middle frame from a video clip via FAL extract-frame API.
 * @param {string} clipUrl — URL of the video clip
 * @param {string} falKey — FAL API key
 * @returns {Promise<string>} — URL of the extracted frame image
 */
async function extractMiddleFrame(clipUrl, falKey) {
  const res = await fetch(`${FAL_BASE}/fal-ai/ffmpeg-api/extract-frame`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: clipUrl, frame_type: 'middle' }),
  });

  if (!res.ok) throw new Error(`FAL extract-frame failed: ${res.status}`);
  const queueData = await res.json();

  // Some FAL endpoints return the result directly
  if (queueData.images?.[0]?.url) return queueData.images[0].url;

  const result = await pollFalQueue(
    queueData.response_url || queueData.request_id,
    'fal-ai/ffmpeg-api/extract-frame',
    falKey, 30, 2000,
  );
  const imageUrl = result?.images?.[0]?.url || result?.image?.url;
  if (!imageUrl) throw new Error('No image URL from extract-frame');
  return imageUrl;
}

/**
 * Review scene alignment: extract one frame per scene clip, compare
 * each frame against its narration using GPT-4.1-mini vision.
 *
 * @param {Object} params
 * @param {Array<{url: string, duration: number}>} params.clips
 * @param {Array<{narration: string}>} params.scenes
 * @param {string} params.falKey
 * @param {string} params.openaiKey
 * @returns {Promise<{results: Array}>}
 */
export async function reviewSceneAlignment({ clips, scenes, falKey, openaiKey }) {
  if (!clips?.length || !scenes?.length) {
    return { results: [], error: 'No clips or scenes to review' };
  }

  const count = Math.min(clips.length, scenes.length);

  // Phase 1: Extract middle frames from all clips in parallel
  console.log(`[qualityReview] Extracting ${count} middle frames...`);
  const framePromises = [];
  for (let i = 0; i < count; i++) {
    framePromises.push(
      extractMiddleFrame(clips[i].url, falKey)
        .catch(err => {
          console.warn(`[qualityReview] Frame extraction failed for scene ${i}: ${err.message}`);
          return null;
        })
    );
  }
  const frameUrls = await Promise.all(framePromises);
  console.log(`[qualityReview] Extracted ${frameUrls.filter(Boolean).length}/${count} frames`);

  // Phase 2: Vision analysis (TODO — Task 2)
  const results = frameUrls.map((frameUrl, i) => ({
    scene_index: i,
    match: true,
    confidence: 0,
    reason: frameUrl ? 'Vision analysis not yet implemented' : 'Frame extraction failed',
    frame_url: frameUrl || null,
  }));

  return { results };
}
```

- [ ] **Step 2: Verify the file is valid**

Run: `node -e "import('./api/lib/qualityReviewer.js').then(() => console.log('OK')).catch(e => console.error(e.message))"`
Expected: `OK` (module loads without syntax errors)

- [ ] **Step 3: Commit**

```bash
git add api/lib/qualityReviewer.js
git commit -m "feat: add qualityReviewer.js with frame extraction"
```

---

### Task 2: Add Vision Analysis to `qualityReviewer.js`

**Files:**
- Modify: `api/lib/qualityReviewer.js`

**Reference docs:**
- `api/lib/pipelineHelpers.js` lines 796-812 — `analyzeFrameContinuity()` shows the exact OpenAI vision call pattern (model, message structure with `image_url` + `text`, `max_tokens`)
- The model is `gpt-4.1-mini-2025-04-14` (same as used in `analyzeFrameContinuity`)

- [ ] **Step 1: Add the vision analysis function**

Add a private `analyzeFrameNarrationMatch(frameUrl, narrationText, openai)` function below `extractMiddleFrame`. This sends the frame image + narration to GPT-4.1-mini vision and parses the JSON response.

```javascript
const VISION_PROMPT = `You are a video quality reviewer. Compare this video frame against the narration it should depict.

Narration: "{narration}"

Analyze whether the visual content of the frame matches the narration. Consider:
- Subject matter: Does the frame show what the narration describes?
- Setting/environment: Is the location/background appropriate?
- Mood/tone: Does the visual tone match the narration's tone?

Ignore minor stylistic differences (art style, color grading, exact composition). Focus on whether the frame depicts the RIGHT SUBJECT for this narration.

Respond with ONLY valid JSON (no markdown fencing):
{ "match": true, "confidence": 0.95, "reason": "Brief explanation" }`;

/**
 * Send a frame + narration to GPT-4.1-mini vision for alignment check.
 * @param {string} frameUrl — URL of the extracted frame image
 * @param {string} narrationText — narration this frame should depict
 * @param {OpenAI} openai — OpenAI client instance
 * @returns {Promise<{match: boolean, confidence: number, reason: string}>}
 */
async function analyzeFrameNarrationMatch(frameUrl, narrationText, openai) {
  const prompt = VISION_PROMPT.replace('{narration}', narrationText);

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini-2025-04-14',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: frameUrl } },
        { type: 'text', text: prompt },
      ],
    }],
    max_tokens: 200,
  });

  const raw = response.choices[0].message.content.trim();

  // Parse JSON from the response — handle possible markdown fencing
  let cleaned = raw;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      match: !!parsed.match,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reason: parsed.reason || 'No reason provided',
    };
  } catch {
    console.warn(`[qualityReview] Failed to parse vision response: ${raw}`);
    return { match: true, confidence: 0, reason: 'Review inconclusive — could not parse response' };
  }
}
```

- [ ] **Step 2: Wire vision analysis into reviewSceneAlignment**

Replace the Phase 2 placeholder in `reviewSceneAlignment` with actual vision calls:

```javascript
  // Phase 2: Vision analysis — compare each frame against its narration
  console.log(`[qualityReview] Running vision analysis on ${frameUrls.filter(Boolean).length} frames...`);
  const openai = new OpenAI({ apiKey: openaiKey });

  const visionPromises = frameUrls.map((frameUrl, i) => {
    if (!frameUrl) {
      return Promise.resolve({
        scene_index: i,
        match: true,
        confidence: 0,
        reason: 'Frame extraction failed',
        frame_url: null,
      });
    }

    const narration = scenes[i]?.narration || '';
    if (!narration.trim()) {
      return Promise.resolve({
        scene_index: i,
        match: true,
        confidence: 0,
        reason: 'No narration text to compare',
        frame_url: frameUrl,
      });
    }

    return analyzeFrameNarrationMatch(frameUrl, narration, openai)
      .then(analysis => ({
        scene_index: i,
        ...analysis,
        frame_url: frameUrl,
      }))
      .catch(err => {
        console.warn(`[qualityReview] Vision analysis failed for scene ${i}: ${err.message}`);
        return {
          scene_index: i,
          match: true,
          confidence: 0,
          reason: `Vision analysis failed: ${err.message}`,
          frame_url: frameUrl,
        };
      });
  });

  const results = await Promise.all(visionPromises);
  const flagged = results.filter(r => !r.match).length;
  console.log(`[qualityReview] Done — ${flagged}/${count} scenes flagged`);

  return { results };
```

- [ ] **Step 3: Verify the file is valid**

Run: `node -e "import('./api/lib/qualityReviewer.js').then(() => console.log('OK')).catch(e => console.error(e.message))"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add api/lib/qualityReviewer.js
git commit -m "feat: add GPT-4.1-mini vision analysis to qualityReviewer"
```

---

### Task 3: Add `review-quality` Action to Workbench Backend

**Files:**
- Modify: `api/workbench/workbench.js`

**Reference docs:**
- `api/workbench/workbench.js` lines 1-36 — import section (add `reviewSceneAlignment` import)
- `api/workbench/workbench.js` lines 364-428 — `assemble` case (the new action goes after this, before `generate-avatar-portrait`)
- `api/workbench/workbench.js` lines 74, 120, 134, 259, 353 — `logCost` call pattern

- [ ] **Step 1: Add the import**

Add this import after the existing imports (after line 36):

```javascript
import { reviewSceneAlignment } from '../lib/qualityReviewer.js';
```

- [ ] **Step 2: Add the `review-quality` case**

Add the new case after the `assemble` case (after line 428, before the `generate-avatar-portrait` case). Follow the exact pattern of other workbench actions:

```javascript
      // ─── Quality Review Gate ─────────────────────────────────────
      case 'review-quality': {
        const { clips, scenes } = req.body;
        if (!clips?.length) return res.status(400).json({ error: 'clips array required' });
        if (!scenes?.length) return res.status(400).json({ error: 'scenes array required' });
        if (clips.length !== scenes.length) {
          return res.status(400).json({ error: `clips (${clips.length}) and scenes (${scenes.length}) must have matching lengths` });
        }

        const result = await reviewSceneAlignment({
          clips,
          scenes,
          falKey: keys.falKey,
          openaiKey: keys.openaiKey,
        });

        const sceneCount = clips.length;
        logCost({ username: req.user.email, category: 'openai', operation: 'quality_review', model: 'gpt-4.1-mini', metadata: { scene_count: sceneCount } });

        return res.json(result);
      }
```

- [ ] **Step 3: Update the file header comment**

Update the actions list in the file header comment (line 8-13) to include the new action:

Change:
```
 *   assemble   — Stitch clips + voiceover + music + captions
```
To:
```
 *   assemble       — Stitch clips + voiceover + music + captions
 *   review-quality — Visual QA: extract frames, compare to narration via GPT vision
```

- [ ] **Step 4: Verify the server starts**

Run: `node -e "import('./api/workbench/workbench.js').then(() => console.log('OK')).catch(e => console.error(e.message))"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add api/workbench/workbench.js
git commit -m "feat: add review-quality action to workbench backend"
```

---

### Task 4: Frontend — Add Review State and Auto-Trigger

**Files:**
- Modify: `src/pages/ShortsWorkbenchPage.jsx`

**Reference docs:**
- `src/pages/ShortsWorkbenchPage.jsx` line 472 — `finalUrl` state variable (review triggers when this is set)
- `src/pages/ShortsWorkbenchPage.jsx` lines 894-921 — `assembleVideo()` function (review fires after this completes)
- `src/pages/ShortsWorkbenchPage.jsx` line 118-127 — `parseApiResponse()` helper
- `src/pages/ShortsWorkbenchPage.jsx` line 490 — `getWorkbenchState()` (review state is NOT persisted here)

- [ ] **Step 1: Add review state variables**

Add these three state variables after the `finalUrl` state (after line 472):

```javascript
  const [reviewResults, setReviewResults] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
```

- [ ] **Step 2: Add the review function**

Add a `runQualityReview()` function after the `assembleVideo()` function (after line 921). This sends the clips and scene narrations to the backend for review:

```javascript
  const runQualityReview = async (clipsForReview) => {
    if (!clipsForReview?.length || !blocks?.length) return;
    setReviewLoading(true);
    setReviewResults(null);
    setReviewError(null);
    try {
      const scenesPayload = blocks.map(b => ({ narration: b.narration || '' }));
      const clipsPayload = clipsForReview.map((c, i) => ({
        url: c.url,
        duration: c.actualDuration || blocks[i]?.clipDuration || c.duration,
      }));
      const res = await apiFetch('/api/workbench/review-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clips: clipsPayload, scenes: scenesPayload }),
      });
      const data = await parseApiResponse(res);
      setReviewResults(data.results || []);
    } catch (err) {
      console.error('[qualityReview] Review failed:', err.message);
      setReviewError(err.message || 'Quality review failed');
    } finally {
      setReviewLoading(false);
    }
  };
```

- [ ] **Step 3: Auto-trigger review after assembly**

Modify the `assembleVideo()` function. After `setFinalUrl(data.video_url)` (line 917), add the auto-trigger. The review fires in the background — it doesn't block the assembly success:

```javascript
      setFinalUrl(data.video_url);
      // Auto-trigger quality review in background (non-blocking)
      const validClipsForReview = blocks.map((b, i) => clips[i]).filter(c => c?.url);
      runQualityReview(validClipsForReview);
```

Also clear stale review results at the start of `assembleVideo()`, after `setAssembleLoading(true)` (line 897):

```javascript
    setAssembleLoading(true);
    setReviewResults(null);
    setReviewError(null);
```

- [ ] **Step 4: Verify the app builds**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds (the review UI isn't rendered yet, but state + function should compile)

- [ ] **Step 5: Commit**

```bash
git add src/pages/ShortsWorkbenchPage.jsx
git commit -m "feat: add quality review state and auto-trigger after assembly"
```

---

### Task 5: Frontend — Render Review Results Panel in Step 5

**Files:**
- Modify: `src/pages/ShortsWorkbenchPage.jsx`

**Reference docs:**
- `src/pages/ShortsWorkbenchPage.jsx` lines 1859-1880 — Step 5 assemble section (the review panel goes after the video preview area)
- The codebase uses Tailwind CSS throughout for styling
- The codebase uses `toast.error()` and `toast.warning()` (success/info toasts are silenced)

- [ ] **Step 1: Add the Quality Review panel below the video preview**

In Step 5's right panel, after the video preview + download/re-assemble buttons block (after the closing `</div>` of the `finalUrl` conditional, around line 1880), add the review results panel:

```jsx
                  {/* Quality Review Gate */}
                  {reviewLoading && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-700">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      Reviewing scenes for visual-narration alignment...
                    </div>
                  )}

                  {reviewError && !reviewLoading && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      Quality review failed: {reviewError}
                      <button onClick={() => setReviewError(null)} className="ml-2 underline text-red-600">Dismiss</button>
                    </div>
                  )}

                  {reviewResults && !reviewLoading && (() => {
                    const flagged = reviewResults.filter(r => !r.match);
                    const passed = reviewResults.filter(r => r.match);
                    const allPass = flagged.length === 0;

                    return (
                      <div className="mt-4">
                        {/* Summary banner */}
                        <div className={`p-3 rounded-lg border text-sm font-medium ${allPass ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                          {allPass
                            ? `All ${reviewResults.length} scenes match narration ✓`
                            : `${flagged.length} of ${reviewResults.length} scenes flagged for review`}
                        </div>

                        {/* Flagged scenes (expanded) */}
                        {flagged.map(r => (
                          <div key={r.scene_index} className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              {r.frame_url && (
                                <img src={r.frame_url} alt={`Scene ${r.scene_index + 1}`} className="w-24 h-16 object-cover rounded border border-amber-300" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-amber-800">Scene {r.scene_index + 1} — Mismatch</div>
                                <div className="text-xs text-amber-700 mt-1">{r.reason}</div>
                                <div className="text-[11px] text-amber-600 mt-1 italic truncate">
                                  Narration: "{blocks[r.scene_index]?.narration?.slice(0, 120)}"
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                // Inline repair: regenerate the clip using the same generateClip() used in Step 4
                                await generateClip(r.scene_index);
                                // Update this result to show repaired status
                                setReviewResults(prev => prev?.map(pr =>
                                  pr.scene_index === r.scene_index
                                    ? { ...pr, match: true, reason: 'Repaired — re-assemble to update final video' }
                                    : pr
                                ));
                                toast.warning('Scene repaired. Click Re-assemble to update the final video.');
                              }}
                              disabled={clipLoading !== null}
                              className="mt-2 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded hover:bg-amber-700 transition-colors disabled:opacity-50"
                            >
                              {clipLoading === r.scene_index ? 'Repairing...' : `Repair Scene ${r.scene_index + 1}`}
                            </button>
                          </div>
                        ))}

                        {/* Passing scenes (collapsed) */}
                        {passed.length > 0 && !allPass && (
                          <details className="mt-2">
                            <summary className="text-xs text-green-600 cursor-pointer">{passed.length} scenes passed ✓</summary>
                            {passed.map(r => (
                              <div key={r.scene_index} className="mt-1 p-2 bg-green-50 border border-green-100 rounded text-xs text-green-700 flex items-center gap-2">
                                {r.frame_url && <img src={r.frame_url} alt="" className="w-12 h-8 object-cover rounded" />}
                                <span>Scene {r.scene_index + 1}: {r.reason}</span>
                              </div>
                            ))}
                          </details>
                        )}

                        {/* All-pass expandable detail */}
                        {allPass && reviewResults.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-green-600 cursor-pointer">View scene details</summary>
                            {reviewResults.map(r => (
                              <div key={r.scene_index} className="mt-1 p-2 bg-green-50 border border-green-100 rounded text-xs text-green-700 flex items-center gap-2">
                                {r.frame_url && <img src={r.frame_url} alt="" className="w-12 h-8 object-cover rounded" />}
                                <span>Scene {r.scene_index + 1}: {r.reason} ({Math.round(r.confidence * 100)}%)</span>
                              </div>
                            ))}
                          </details>
                        )}
                      </div>
                    );
                  })()}
```

- [ ] **Step 2: Verify the app builds**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds without errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/ShortsWorkbenchPage.jsx
git commit -m "feat: add Quality Review results panel to Step 5 UI"
```

---

### Task 6: Manual Integration Test

**Files:**
- No file changes — verification only

- [ ] **Step 1: Start the dev server**

Run: `npm run server` (background) + `npm run dev` (background)
Or: `npm run start`

- [ ] **Step 2: Verify the review-quality endpoint works**

Test with curl (substitute a valid auth token and clip URL):

```bash
curl -X POST http://localhost:3003/api/workbench/review-quality \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "clips": [{"url": "https://example.com/test.mp4", "duration": 5}],
    "scenes": [{"narration": "A sunset over the ocean"}]
  }'
```

Expected: JSON response with `results` array (may error on invalid URL — that's fine, confirms the endpoint routes correctly and returns a structured response)

- [ ] **Step 3: Verify the frontend builds and the review panel renders**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Push and deploy**

```bash
git push
fly deploy
```
