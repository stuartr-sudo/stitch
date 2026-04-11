# Full Endpoint Audit & Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every broken, missing, or fragile endpoint across the entire Stitch application — Imagineer, JumpStart, Storyboard, Turnaround, 3D Viewer, Shorts, LoRA, Captions, Motion Transfer, and Library Upload.

**Architecture:** Targeted surgical fixes to existing files. No refactoring. Each task is an independent fix that can be committed alone. Missing endpoints get new handler files + server.js registration.

**Tech Stack:** Express handlers, FAL.ai queue API, Wavespeed API, Supabase Storage, FormData (multer-free)

---

## Audit Summary

A 6-agent parallel deep-dive audited every subsystem. Here are the **confirmed real issues** (false positives excluded):

| # | Severity | Issue | Files |
|---|----------|-------|-------|
| 1 | CRITICAL | `/api/library/upload` — frontend calls it, endpoint doesn't exist | `api/library/upload.js`, `server.js` |
| 2 | CRITICAL | `/api/motion-transfer/generate` + `/result` — frontend calls them, endpoints don't exist | `api/motion-transfer/generate.js`, `api/motion-transfer/result.js`, `server.js` |
| 3 | HIGH | Imagineer polling never passes `statusUrl`/`responseUrl` from frontend — relies on fragile path truncation fallback | `src/components/modals/ImagineerModal.jsx` |
| 4 | HIGH | TurnaroundSheetWizard polling never passes `statusUrl`/`responseUrl` | `src/components/modals/TurnaroundSheetWizard.jsx` |
| 5 | MEDIUM | 3D Viewer `uploadGlbToSupabase` silently falls back to CDN URL on failure — should warn | `api/viewer3d/result.js` |
| 6 | LOW | `api/audio/generate.js` and `api/audio/result.js` are mocked stubs | `api/audio/generate.js`, `api/audio/result.js` |

**What passed audit (no fixes needed):**
- Shorts pipeline: all 13 components correct (endpoints, polling, duration formats, generate_audio, media saving, assembly, captions, music)
- Model registry: all duration converters correct
- JumpStart: all 6 endpoints correct (save-video is manual by design)
- Storyboard assembly: FFmpeg + Supabase upload correct
- LoRA training: submission + polling correct
- Caption burner: uses correct `auto-subtitle` endpoint
- Voiceover generator: Gemini + ElevenLabs both correct
- All FAL polling in pipelineHelpers.js: uses `response_url` first, correct fallback

---

### Task 1: Create `/api/library/upload` endpoint

**Files:**
- Create: `api/library/upload.js`
- Modify: `server.js` (add route registration)

The frontend (`ImagineerModal.jsx:331`) sends a `FormData` with a `file` field. The endpoint must parse it, upload to Supabase `media/uploads/{userId}/`, and return `{ url }`.

- [ ] **Step 1: Create the handler file**

```javascript
// api/library/upload.js
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ maxFileSize: 20 * 1024 * 1024 });
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const buffer = fs.readFileSync(file.filepath);
    const ext = file.originalFilename?.split('.').pop() || 'png';
    const userId = req.user?.id || 'anonymous';
    const fileName = `uploads/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('media')
      .upload(fileName, buffer, {
        contentType: file.mimetype || 'image/png',
        upsert: true,
      });

    if (uploadErr) {
      console.error('[Library/Upload] Supabase error:', uploadErr);
      return res.status(500).json({ error: 'Upload failed' });
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

    // Clean up temp file
    try { fs.unlinkSync(file.filepath); } catch {}

    return res.json({ url: publicUrl, path: fileName });
  } catch (error) {
    console.error('[Library/Upload] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

- [ ] **Step 2: Register route in server.js**

Find the library routes block (search for `/api/library/`) and add before the tags routes:

```javascript
app.post('/api/library/upload', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('library/upload.js');
  handler(req, res);
});
```

**Important:** This must go BEFORE `/api/library/tags` routes (specificity ordering).

- [ ] **Step 3: Verify — start dev server and test**

```bash
npm run server
# In another terminal:
curl -X POST http://localhost:3003/api/library/upload \
  -H "Authorization: Bearer <test-jwt>" \
  -F "file=@/path/to/test-image.png"
```

Expected: `{ "url": "https://...supabase.co/.../uploads/...", "path": "uploads/..." }`

- [ ] **Step 4: Commit**

```bash
git add api/library/upload.js server.js
git commit -m "feat: add /api/library/upload endpoint for Imagineer file uploads"
```

---

### Task 2: Create `/api/motion-transfer/generate` and `/api/motion-transfer/result` endpoints

**Files:**
- Create: `api/motion-transfer/generate.js`
- Create: `api/motion-transfer/result.js`
- Modify: `server.js` (add 2 route registrations)

The frontend (`MotionTransferModal.jsx`) sends `{ image, video, character_orientation, prompt, negative_prompt, keep_original_sound }` and expects back `{ predictionId }`. The result endpoint polls with `?predictionId=xxx` and expects `{ status, outputUrl }`.

FAL has a motion transfer model: `fal-ai/kling-video/o3/pro/motion-transfer` (character-to-motion). Alternatively use `fal-ai/wan/v2.2-14b/animate/move` which is already in the codebase.

- [ ] **Step 1: Create the generate handler**

```javascript
// api/motion-transfer/generate.js
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
    if (!FAL_KEY) return res.status(400).json({ error: 'FAL API key not configured.' });

    const { image, video, character_orientation, prompt, negative_prompt, keep_original_sound } = req.body;

    if (!image || !video) {
      return res.status(400).json({ error: 'Both image and video are required' });
    }

    const endpoint = 'fal-ai/wan/v2.2-14b/animate/move';
    const response = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: image,
        video_url: video,
        prompt: prompt || '',
        negative_prompt: negative_prompt || '',
        resolution: '1K',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[MotionTransfer] Submit error:', errText.substring(0, 300));
      return res.status(502).json({ error: 'Failed to start motion transfer' });
    }

    const data = await response.json();
    return res.json({
      predictionId: data.request_id,
      statusUrl: data.status_url,
      responseUrl: data.response_url,
    });
  } catch (error) {
    console.error('[MotionTransfer] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

- [ ] **Step 2: Create the result handler**

```javascript
// api/motion-transfer/result.js
import { getUserKeys } from '../lib/getUserKeys.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
    if (!FAL_KEY) return res.status(400).json({ error: 'FAL API key not configured.' });

    const predictionId = req.query.predictionId;
    if (!predictionId) {
      return res.status(400).json({ error: 'Missing predictionId' });
    }

    const headers = { 'Authorization': `Key ${FAL_KEY}` };
    const queuePath = 'fal-ai/wan';

    // Check status
    const statusUrl = `https://queue.fal.run/${queuePath}/requests/${predictionId}/status`;
    const statusRes = await fetch(statusUrl, { headers });

    if (!statusRes.ok) {
      return res.json({ status: 'processing', predictionId });
    }

    const statusData = await statusRes.json();

    if (statusData.status === 'COMPLETED') {
      // Fetch full result
      const resultUrl = `https://queue.fal.run/${queuePath}/requests/${predictionId}`;
      const resultRes = await fetch(resultUrl, { headers });
      const resultData = await resultRes.json();
      const videoUrl = resultData.video?.url;

      if (videoUrl) {
        return res.json({ status: 'completed', outputUrl: videoUrl });
      }
      return res.json({ status: 'failed', error: 'No video in result' });
    }

    if (statusData.status === 'FAILED') {
      return res.json({ status: 'failed', error: statusData.error || 'Generation failed' });
    }

    return res.json({ status: 'processing', predictionId });
  } catch (error) {
    console.error('[MotionTransfer] Result error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

- [ ] **Step 3: Update frontend to pass statusUrl/responseUrl through polling**

In `src/components/modals/MotionTransferModal.jsx`, update `handleGenerateMotion` to capture and forward the URLs:

```javascript
// After getting the generate response (line ~62):
if (result.predictionId) {
  toast.info('Motion transfer is being processed, please wait...');
  const motionVideoUrl = await pollForMotionResult(result.predictionId, result.statusUrl, result.responseUrl);
```

Update `pollForMotionResult` to accept and use the URLs:

```javascript
const pollForMotionResult = async (predictionId, statusUrl, responseUrl, maxAttempts = 60) => {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const params = new URLSearchParams({ predictionId });
      if (statusUrl) params.set('statusUrl', statusUrl);
      if (responseUrl) params.set('responseUrl', responseUrl);
      const res = await apiFetch(`/api/motion-transfer/result?${params}`);
```

Update `api/motion-transfer/result.js` to prefer client-provided URLs:

```javascript
const statusUrlParam = req.query.statusUrl;
const responseUrlParam = req.query.responseUrl;

// Use client-provided URLs if available, fall back to constructed
const statusCheckUrl = statusUrlParam || `https://queue.fal.run/${queuePath}/requests/${predictionId}/status`;
const resultFetchUrl = responseUrlParam || `https://queue.fal.run/${queuePath}/requests/${predictionId}`;
```

- [ ] **Step 4: Register both routes in server.js**

Add near the animate routes:

```javascript
app.post('/api/motion-transfer/generate', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('motion-transfer/generate.js');
  handler(req, res);
});
app.get('/api/motion-transfer/result', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('motion-transfer/result.js');
  handler(req, res);
});
```

- [ ] **Step 5: Commit**

```bash
git add api/motion-transfer/generate.js api/motion-transfer/result.js src/components/modals/MotionTransferModal.jsx server.js
git commit -m "feat: add motion transfer generate + result endpoints with robust polling URLs"
```

---

### Task 3: Pass `statusUrl`/`responseUrl` through Imagineer polling

**Files:**
- Modify: `api/imagineer/edit.js` (add `statusUrl`/`responseUrl` to response)
- Modify: `src/components/modals/ImagineerModal.jsx` (pass URLs through to polling)

The generate endpoint already returns `statusUrl` and `responseUrl` from the FAL queue, but `edit.js` does NOT. The frontend discards them in both cases and only passes `requestId` + `model` to the polling endpoint. This forces `result.js` to reconstruct queue URLs via path truncation — which works today but is fragile.

- [ ] **Step 1: Update `api/imagineer/edit.js` to return `statusUrl`/`responseUrl`**

In `api/imagineer/edit.js`, around line 132, update the processing response to include FAL URLs:

```javascript
    if (data.request_id) {
      const pollModel = selectedModel === 'fal-flux' ? 'fal-flux-edit'
        : selectedModel === 'nano-banana-2' ? 'nano-banana-2-edit'
        : selectedModel === 'seedream' ? 'seedream-edit'
        : selectedModel;
      return res.json({
        success: true,
        requestId: data.request_id,
        model: pollModel,
        status: 'processing',
        pollEndpoint: '/api/imagineer/result',
        statusUrl: data.status_url || null,
        responseUrl: data.response_url || null,
      });
    }
```

- [ ] **Step 2: Update `pollImagineerResult` and `pollImagineerResultAsync` to accept and pass URLs**

In `ImagineerModal.jsx`, update both polling functions to accept `statusUrl`/`responseUrl`:

```javascript
const pollImagineerResult = async (requestId, model, statusUrl, responseUrl) => {
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await apiFetch('/api/imagineer/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, model, statusUrl, responseUrl }) });
```

```javascript
const pollImagineerResultAsync = async (requestId, model, statusUrl, responseUrl) => {
    for (let i = 0; i < 120; i++) {
      if (!mountedRef.current) throw new Error('Unmounted');
      await new Promise(r => setTimeout(r, 3000));
      const res = await apiFetch('/api/imagineer/result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, model, statusUrl, responseUrl }),
      });
```

- [ ] **Step 3: Update ALL call sites to pass URLs from response data**

There are ~5 call sites that need updating. Each currently calls `pollImagineerResult(data.requestId, data.model)` or `pollImagineerResultAsync(data.requestId, data.model)`. Update each to:

```javascript
pollImagineerResultAsync(data.requestId, data.model, data.statusUrl, data.responseUrl)
```

Search for all invocations of both functions in `ImagineerModal.jsx` and update. The `data` object from both `generate.js` and `edit.js` responses will now include `statusUrl` and `responseUrl`. If they're `undefined` (e.g. sync edit responses), `result.js` already handles that by falling back to constructed URLs.

- [ ] **Step 4: Commit**

```bash
git add api/imagineer/edit.js src/components/modals/ImagineerModal.jsx
git commit -m "fix: pass statusUrl/responseUrl to Imagineer polling for robust FAL queue URLs"
```

---

### Task 4: Pass `statusUrl`/`responseUrl` through TurnaroundSheetWizard polling

**Files:**
- Modify: `src/components/modals/TurnaroundSheetWizard.jsx`

Same issue as Task 3. The turnaround backend returns `statusUrl` and `responseUrl` from FAL queue submissions, but the frontend discards them.

- [ ] **Step 1: Update `startPolling` to accept and pass URLs**

In `TurnaroundSheetWizard.jsx`, the `startPolling` callback (line ~488) currently takes `(sheetId, reqId, model)`. Update to `(sheetId, reqId, model, statusUrl, responseUrl)` and pass them in the request body:

```javascript
body: JSON.stringify({ requestId: reqId, model, statusUrl, responseUrl }),
```

Then update the call site where `startPolling` is invoked after a queue submission to pass the URLs from the response.

- [ ] **Step 2: Commit**

```bash
git add src/components/modals/TurnaroundSheetWizard.jsx
git commit -m "fix: pass statusUrl/responseUrl to turnaround polling for robust FAL queue URLs"
```

---

### Task 5: Add warning log for 3D Viewer GLB upload failure

**Files:**
- Modify: `api/viewer3d/result.js`

Currently `uploadGlbToSupabase` silently returns the CDN URL if upload fails. The GLB URL from Wavespeed may expire. Add a prominent warning log so operators know when this happens. Don't hard-fail — the user still needs the result for the current session.

- [ ] **Step 1: Add warning logs to fallback paths**

In `api/viewer3d/result.js`, update `uploadGlbToSupabase`:

```javascript
async function uploadGlbToSupabase(glbUrl, userId) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[3DViewer] ⚠️ Supabase not configured — GLB stored on temporary CDN URL that WILL expire:', glbUrl);
    return glbUrl;
  }

  try {
    const response = await fetch(glbUrl);
    if (!response.ok) {
      console.warn('[3DViewer] ⚠️ Failed to download GLB from CDN — URL may expire:', glbUrl);
      return glbUrl;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = `3d/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.glb`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase.storage.from('media').upload(fileName, buffer, {
      contentType: 'model/gltf-binary',
    });
    if (error) {
      console.error('[3DViewer] ⚠️ GLB upload to Supabase FAILED — returning temporary CDN URL:', error.message);
      return glbUrl;
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    return publicUrl;
  } catch (err) {
    console.error('[3DViewer] ⚠️ GLB upload failed — returning temporary CDN URL:', err.message);
    return glbUrl;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/viewer3d/result.js
git commit -m "fix: add warning logs when 3D viewer GLB falls back to temporary CDN URL"
```

---

### Task 6: Mark audio generate/result as explicitly unimplemented

**Files:**
- Modify: `api/audio/generate.js`
- Modify: `api/audio/result.js`

These return mock data that could confuse callers. Add a clear 501 response.

- [ ] **Step 1: Update both handlers to return 501**

`api/audio/generate.js`:
```javascript
export default async function handler(req, res) {
  return res.status(501).json({ error: 'Audio generation endpoint not yet implemented. Use /api/audio/music or /api/audio/voiceover instead.' });
}
```

`api/audio/result.js`:
```javascript
export default async function handler(req, res) {
  return res.status(501).json({ error: 'Audio result endpoint not yet implemented. Use /api/audio/music or /api/audio/voiceover instead.' });
}
```

- [ ] **Step 2: Commit**

```bash
git add api/audio/generate.js api/audio/result.js
git commit -m "fix: return 501 for unimplemented audio generate/result endpoints"
```

---

## Verified Working (No Changes Needed)

These subsystems were thoroughly audited and confirmed correct:

- **Shorts Pipeline** (13 components): All endpoints, polling, duration formats, generate_audio, media saving, V3 FLF/V2 Extract paths, assembly, captions, music — all correct
- **Model Registry**: All duration converters (Veo, Kling, Wan, PixVerse, Hailuo, Wavespeed) correct
- **Media Generator**: Generic dispatcher correctly routes to registry
- **Pipeline Helpers**: `pollFalQueue` uses `response_url` first, correct fallback; `uploadUrlToSupabase` extension detection correct; `assembleShort` FFmpeg tracks correct
- **JumpStart (6 endpoints)**: generate, result, save-video, edit, extend, erase — all correct. Videos are saved to Supabase via manual "Save to Library" action (by design)
- **Storyboard Assembly**: FFmpeg compose + Supabase upload correct
- **Storyboard Presets**: CRUD operations correct
- **LoRA Training**: Submission to `fal-ai/flux-lora-fast-training` + polling correct
- **Caption Burner**: Uses correct `fal-ai/workflow-utilities/auto-subtitle`, parses `output.video.url`
- **Voiceover Generator**: Both Gemini TTS and ElevenLabs via FAL correct
- **Imagineer result.js path truncation**: Actually correct — FAL queue URLs use owner/app-id (first 2 segments)
- **Turnaround**: Edit fallback chain, grid calculations, background mode all correct
- **Shorts Repair + Reassembly**: Job lookup, FLF repair, reassembly all correct
- **Images (search, import, edit, inpaint)**: All endpoints correct
- **Smoosh, Lens, Trip, TryStyle**: All endpoints correct
- **Voice preview + library**: Correct
- **Route specificity ordering**: Tags routes correctly ordered in server.js
