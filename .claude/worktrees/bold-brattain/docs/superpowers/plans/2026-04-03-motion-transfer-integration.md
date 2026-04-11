# Motion Transfer Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Motion Transfer as a first-class generation mode in Shorts Workbench and Storyboard, with two models (WAN 2.2 + Kling V3 Pro Motion Control), a video trimmer, and shared UI components.

**Architecture:** Dedicated motion transfer model registry (`motionTransferRegistry.js`) with a dispatcher function, reusable `MotionReferenceInput` + `VideoTrimmer` frontend components, per-scene/per-frame opt-in that overrides the normal generation strategy, and a standalone video trim endpoint.

**Tech Stack:** React 18, Express, FAL.ai (WAN 2.2 + Kling V3 Pro + FFmpeg compose), Supabase (storage + Postgres), Tailwind CSS, Radix UI.

**Spec:** `docs/superpowers/specs/2026-04-03-motion-transfer-integration-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|----------------|
| `api/lib/motionTransferRegistry.js` | Model configs + `generateMotionTransfer()` dispatcher |
| `api/video/trim.js` | Video trim endpoint using FAL FFmpeg compose |
| `src/components/VideoTrimmer.jsx` | Range slider UI for selecting video segments |
| `src/components/MotionReferenceInput.jsx` | Shared motion reference config editor (model, orientation, audio, trimmer) |
| `supabase/migrations/20260403_storyboard_motion_ref.sql` | Add `motion_ref` JSONB column to `storyboard_frames` |

### Modified Files
| File | Change |
|------|--------|
| `server.js:~270` | Register `POST /api/video/trim` route |
| `api/motion-transfer/generate.js` | Use registry dispatcher, accept `model` param, map legacy field names |
| `api/motion-transfer/result.js` | Model-aware polling, fix pre-existing truncated queue path bug |
| `api/workbench/workbench.js:~349` | Add `mode: 'mt'` branch in `generate-clip` action |
| `api/storyboard/produce.js:~136` | Add MT call-site override in `generateFrameVideo()` |
| `src/pages/ShortsWorkbenchPage.jsx:~455,~591` | MotionReferenceInput per scene (Step 3), MT mode detection (Step 4) |
| `src/pages/StoryboardWorkspace.jsx:~372` | MotionReferenceInput in frame detail panel |
| `src/components/modals/MotionTransferModal.jsx` | Refactor to use shared MotionReferenceInput + VideoTrimmer |

---

## Task 1: Motion Transfer Model Registry

**Files:**
- Create: `api/lib/motionTransferRegistry.js`

This is the foundation — everything else depends on it.

- [ ] **Step 1: Create the registry file with both model configs**

Read `api/lib/modelRegistry.js` (lines 1-50) for the pattern. Create `api/lib/motionTransferRegistry.js` with:

```javascript
import { pollFalQueue, uploadUrlToSupabase } from './pipelineHelpers.js';
import { logCost } from './costLogger.js';

export const MOTION_TRANSFER_MODELS = {
  wan_motion: {
    provider: 'fal',
    label: 'WAN 2.2 Motion Transfer',
    description: 'Budget motion transfer, good for simple animations',
    endpoint: 'fal-ai/wan/v2.2-14b/animate/move',
    maxDuration: null,
    supportsOrientation: false,
    supportsElements: false,
    supportsKeepAudio: false,
    buildBody: (imageUrl, videoUrl, opts = {}) => ({
      image_url: imageUrl,
      video_url: videoUrl,
      prompt: opts.prompt || '',
      negative_prompt: opts.negative_prompt || '',
      resolution: '1K',
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 3000 },
  },
  kling_motion_control: {
    provider: 'fal',
    label: 'Kling V3 Pro Motion Control',
    description: 'Premium motion transfer with orientation control and facial binding',
    endpoint: 'fal-ai/kling-video/v3/pro/motion-control',
    maxDuration: { image: 10, video: 30 },
    supportsOrientation: true,
    supportsElements: true,
    supportsKeepAudio: true,
    buildBody: (imageUrl, videoUrl, opts = {}) => ({
      image_url: imageUrl,
      video_url: videoUrl,
      character_orientation: opts.character_orientation || 'image',
      prompt: opts.prompt || undefined,
      keep_original_sound: opts.keep_original_sound ?? true,
      ...(opts.elements?.length ? { elements: opts.elements } : {}),
    }),
    parseResult: (output) => output?.video?.url,
    pollConfig: { maxRetries: 120, delayMs: 4000 },
  },
};

export function getMotionTransferModel(key) {
  return MOTION_TRANSFER_MODELS[key] || null;
}

export function listMotionTransferModels() {
  return Object.entries(MOTION_TRANSFER_MODELS).map(([key, m]) => ({
    id: key, label: m.label, description: m.description,
    supportsOrientation: m.supportsOrientation,
    supportsElements: m.supportsElements,
    supportsKeepAudio: m.supportsKeepAudio,
    maxDuration: m.maxDuration,
  }));
}
```

- [ ] **Step 2: Add the dispatcher function**

Add to the same file, below the model configs:

```javascript
/**
 * Submit a motion transfer job, poll until complete, upload to Supabase.
 * Returns { videoUrl } with a permanent Supabase URL.
 */
export async function generateMotionTransfer(modelKey, imageUrl, videoUrl, opts, falKey, supabase) {
  const model = MOTION_TRANSFER_MODELS[modelKey];
  if (!model) throw new Error(`Unknown motion transfer model: ${modelKey}`);

  const body = model.buildBody(imageUrl, videoUrl, opts);

  // Submit to FAL queue
  const submitRes = await fetch(`https://queue.fal.run/${model.endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    console.error(`[MotionTransfer] Submit error (${modelKey}):`, errText.substring(0, 300));
    throw new Error(`Motion transfer submit failed: ${submitRes.status}`);
  }

  const { request_id } = await submitRes.json();

  // Poll for completion using full endpoint path
  const result = await pollFalQueue(
    request_id,
    model.endpoint,
    falKey,
    model.pollConfig.maxRetries,
    model.pollConfig.delayMs,
  );

  const rawUrl = model.parseResult(result);
  if (!rawUrl) throw new Error('Motion transfer produced no video');

  // Upload to Supabase to avoid FAL CDN expiry
  const permanentUrl = await uploadUrlToSupabase(rawUrl, supabase, 'pipeline/motion-transfer');

  return { videoUrl: permanentUrl };
}
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/motionTransferRegistry.js
git commit -m "feat(motion-transfer): add model registry with WAN 2.2 + Kling V3 Pro Motion Control"
```

---

## Task 2: Video Trim Endpoint

**Files:**
- Create: `api/video/trim.js`
- Modify: `server.js:~270`

- [ ] **Step 1: Create the trim endpoint**

Read `api/lib/pipelineHelpers.js` for `pollFalQueue` (line ~87) and `uploadUrlToSupabase` (line ~192) signatures. Also check how `assembleShort()` builds FFmpeg compose payloads for the track structure pattern.

Create `api/video/trim.js`:

```javascript
import { getUserKeys } from '../lib/getUserKeys.js';
import { pollFalQueue, uploadUrlToSupabase } from '../lib/pipelineHelpers.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { falKey } = await getUserKeys(req.user.id, req.user.email);
    if (!falKey) return res.status(400).json({ error: 'FAL API key not configured.' });

    const { video_url, start_time, end_time } = req.body;

    if (!video_url) return res.status(400).json({ error: 'video_url required' });
    if (start_time == null || end_time == null) return res.status(400).json({ error: 'start_time and end_time required' });
    if (start_time < 0) return res.status(400).json({ error: 'start_time must be >= 0' });
    if (end_time <= start_time) return res.status(400).json({ error: 'end_time must be > start_time' });

    const duration = end_time - start_time;
    if (duration > 60) return res.status(400).json({ error: 'Maximum trim duration is 60 seconds' });

    const endpoint = 'fal-ai/ffmpeg-api/compose';
    const body = {
      tracks: [{
        type: 'video',
        segments: [{
          url: video_url,
          start_time: start_time,
          duration: duration,
        }],
      }],
      duration: duration,
    };

    const submitRes = await fetch(`https://queue.fal.run/${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      console.error('[VideoTrim] Submit error:', errText.substring(0, 300));
      return res.status(502).json({ error: 'Failed to start video trim' });
    }

    const { request_id } = await submitRes.json();

    const result = await pollFalQueue(request_id, endpoint, falKey, 60, 2000);
    const outputUrl = result?.video?.url || result?.output?.url;
    if (!outputUrl) return res.status(500).json({ error: 'Trim produced no output' });

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const trimmedUrl = await uploadUrlToSupabase(outputUrl, supabase, `media/trimmed/${req.user.id}`);

    return res.json({ trimmed_url: trimmedUrl, duration });
  } catch (error) {
    console.error('[VideoTrim] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

- [ ] **Step 2: Register the route in server.js**

Read `server.js` around line 268-272 to find the video utility routes. Insert the trim route after the `extract-frame` endpoint:

```javascript
app.post('/api/video/trim', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('video/trim.js');
  if (handler) return handler(req, res);
  res.status(500).json({ error: 'Handler not found' });
});
```

- [ ] **Step 3: Commit**

```bash
git add api/video/trim.js server.js
git commit -m "feat(video): add /api/video/trim endpoint using FAL FFmpeg compose"
```

---

## Task 3: Refactor Existing Motion Transfer Backend

**Files:**
- Modify: `api/motion-transfer/generate.js`
- Modify: `api/motion-transfer/result.js`

- [ ] **Step 1: Refactor generate.js to use registry**

Read current `api/motion-transfer/generate.js` (50 lines). Refactor to use the registry dispatcher. Map legacy `image`/`video` field names for backward compat:

```javascript
import { getUserKeys } from '../lib/getUserKeys.js';
import { generateMotionTransfer } from '../lib/motionTransferRegistry.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { falKey } = await getUserKeys(req.user.id, req.user.email);
    if (!falKey) return res.status(400).json({ error: 'FAL API key not configured.' });

    const {
      model = 'wan_motion',
      image, image_url,
      video, video_url,
      character_orientation, prompt, negative_prompt,
      keep_original_sound, elements,
    } = req.body;

    // Map legacy field names (existing frontend sends image/video)
    const resolvedImage = image_url || image;
    const resolvedVideo = video_url || video;

    if (!resolvedImage || !resolvedVideo) {
      return res.status(400).json({ error: 'Both image and video are required' });
    }

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const result = await generateMotionTransfer(model, resolvedImage, resolvedVideo, {
      character_orientation, prompt, negative_prompt,
      keep_original_sound, elements,
    }, falKey, supabase);

    return res.json({ status: 'completed', outputUrl: result.videoUrl });
  } catch (error) {
    console.error('[MotionTransfer] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

Note: This changes the response shape — the old endpoint returned `{ predictionId, statusUrl, responseUrl }` for client-side polling. The new version does server-side polling and returns the final URL directly. The frontend modal will be updated in Task 8 to match. This also means `result.js` (Step 2 below) becomes a backward-compat-only endpoint — no new code should call it. It's kept for any in-flight requests from old clients but the MotionTransferModal refactor in Task 8 removes all client-side polling that called it.

- [ ] **Step 2: Refactor result.js — fix queue path bug + model-awareness**

Read current `api/motion-transfer/result.js` (55 lines). The existing code uses truncated `fal-ai/wan` queue path (line 21) which is a pre-existing bug. Refactor to use registry endpoints:

```javascript
import { getUserKeys } from '../lib/getUserKeys.js';
import { MOTION_TRANSFER_MODELS } from '../lib/motionTransferRegistry.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { falKey: FAL_KEY } = await getUserKeys(req.user.id, req.user.email);
    if (!FAL_KEY) return res.status(400).json({ error: 'FAL API key not configured.' });

    const { predictionId, model = 'wan_motion' } = req.query;
    if (!predictionId) return res.status(400).json({ error: 'Missing predictionId' });

    const modelConfig = MOTION_TRANSFER_MODELS[model];
    if (!modelConfig) return res.status(400).json({ error: `Unknown model: ${model}` });

    const headers = { 'Authorization': `Key ${FAL_KEY}` };
    // Use full endpoint path from registry (fixes pre-existing truncated path bug)
    const queuePath = modelConfig.endpoint;

    const statusCheckUrl = `https://queue.fal.run/${queuePath}/requests/${predictionId}/status`;
    const statusRes = await fetch(statusCheckUrl, { headers });

    if (!statusRes.ok) return res.json({ status: 'processing', predictionId });

    const statusData = await statusRes.json();

    if (statusData.status === 'COMPLETED') {
      const resultRes = await fetch(`https://queue.fal.run/${queuePath}/requests/${predictionId}`, { headers });
      const resultData = await resultRes.json();
      const videoUrl = modelConfig.parseResult(resultData);

      if (videoUrl) return res.json({ status: 'completed', outputUrl: videoUrl });
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

- [ ] **Step 3: Commit**

```bash
git add api/motion-transfer/generate.js api/motion-transfer/result.js
git commit -m "refactor(motion-transfer): use registry dispatcher, fix FAL queue path bug, add model param"
```

---

## Task 4: VideoTrimmer Frontend Component

**Files:**
- Create: `src/components/VideoTrimmer.jsx`

- [ ] **Step 1: Create the VideoTrimmer component**

Read `src/components/ui/` for existing UI patterns (Button, Label, Input, Slider). The trimmer is a controlled component that accepts a video URL, lets the user select a range, and calls the trim endpoint.

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Scissors } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export default function VideoTrimmer({ videoUrl, onTrimmed, onClear }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [trimmedUrl, setTrimmedUrl] = useState(null);

  useEffect(() => {
    setStartTime(0);
    setEndTime(0);
    setTrimmedUrl(null);
  }, [videoUrl]);

  const handleLoadedMetadata = () => {
    const dur = videoRef.current?.duration || 0;
    setDuration(dur);
    setEndTime(dur);
  };

  const handleStartChange = (e) => {
    const val = parseFloat(e.target.value);
    setStartTime(Math.min(val, endTime - 0.5));
    if (videoRef.current) videoRef.current.currentTime = val;
    setTrimmedUrl(null);
  };

  const handleEndChange = (e) => {
    const val = parseFloat(e.target.value);
    setEndTime(Math.max(val, startTime + 0.5));
    if (videoRef.current) videoRef.current.currentTime = val;
    setTrimmedUrl(null);
  };

  const handleTrim = async () => {
    const segmentDuration = endTime - startTime;
    if (segmentDuration > 60) {
      toast.error('Maximum trim duration is 60 seconds');
      return;
    }

    setTrimming(true);
    try {
      const data = await apiFetch('/api/video/trim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl, start_time: startTime, end_time: endTime }),
      });

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setTrimmedUrl(data.trimmed_url);
      onTrimmed?.({ trimmedUrl: data.trimmed_url, startTime, endTime, duration: data.duration });
    } catch (err) {
      toast.error('Failed to trim video');
    } finally {
      setTrimming(false);
    }
  };

  const segmentDuration = (endTime - startTime).toFixed(1);
  const isFullVideo = startTime === 0 && Math.abs(endTime - duration) < 0.5;

  return (
    <div className="space-y-3">
      <video
        ref={videoRef}
        src={videoUrl}
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full rounded-lg bg-black aspect-video"
        controls
        preload="metadata"
      />

      {duration > 0 && (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Start: {startTime.toFixed(1)}s</span>
              <span>Selected: {segmentDuration}s</span>
              <span>End: {endTime.toFixed(1)}s</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={duration} step={0.1}
                value={startTime} onChange={handleStartChange}
                className="flex-1 accent-blue-500"
              />
              <input
                type="range" min={0} max={duration} step={0.1}
                value={endTime} onChange={handleEndChange}
                className="flex-1 accent-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="outline"
              onClick={handleTrim}
              disabled={trimming || isFullVideo}
            >
              {trimming ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Scissors className="w-3 h-3 mr-1" />}
              {trimming ? 'Trimming...' : trimmedUrl ? 'Re-trim' : 'Trim Clip'}
            </Button>
            {trimmedUrl && <span className="text-xs text-green-600">Trimmed to {segmentDuration}s</span>}
            {isFullVideo && <span className="text-xs text-gray-400">Full video selected — no trim needed</span>}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/VideoTrimmer.jsx
git commit -m "feat(ui): add VideoTrimmer range slider component"
```

---

## Task 5: MotionReferenceInput Frontend Component

**Files:**
- Create: `src/components/MotionReferenceInput.jsx`

- [ ] **Step 1: Create the MotionReferenceInput component**

Read `src/components/modals/MotionTransferModal.jsx` for the existing UI patterns (orientation toggle, prompt fields, library picker). Read `src/components/ui/` for Button, Label, Input, Select patterns. This component is a data editor — it does not trigger generation.

```jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Film, X, FolderOpen, Volume2, VolumeX } from 'lucide-react';
import VideoTrimmer from '@/components/VideoTrimmer';
import LibraryModal from '@/components/modals/LibraryModal';

const MODELS = [
  { id: 'wan_motion', label: 'WAN 2.2 Motion Transfer', description: 'Budget — simple animations' },
  { id: 'kling_motion_control', label: 'Kling V3 Pro Motion Control', description: 'Premium — orientation, facial binding, audio' },
];

const ORIENTATIONS = [
  { id: 'image', label: 'Match Image', description: 'Character keeps reference image pose (max 10s)' },
  { id: 'video', label: 'Match Video', description: 'Character matches video orientation (max 30s)' },
];

export default function MotionReferenceInput({ motionRef, onChange, onClear }) {
  const [showLibrary, setShowLibrary] = useState(false);
  const ref = motionRef || {};
  const isKling = ref.model === 'kling_motion_control';
  const maxDuration = isKling ? (ref.characterOrientation === 'video' ? 30 : 10) : null;
  const effectiveDuration = ref.trimmedUrl
    ? (ref.endTime - ref.startTime)
    : null; // duration unknown until video loads

  const update = (patch) => onChange({ ...ref, ...patch });

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5" /> Motion Reference
        </Label>
        {ref.videoUrl && (
          <Button size="sm" variant="ghost" onClick={onClear} className="h-6 w-6 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Video URL input */}
      <div className="flex gap-2">
        <Input
          placeholder="Paste video URL..."
          value={ref.videoUrl || ''}
          onChange={(e) => update({ videoUrl: e.target.value, trimmedUrl: null, startTime: null, endTime: null })}
          className="text-xs"
        />
        <Button size="sm" variant="outline" onClick={() => setShowLibrary(true)}>
          <FolderOpen className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Video Trimmer */}
      {ref.videoUrl && (
        <VideoTrimmer
          videoUrl={ref.videoUrl}
          onTrimmed={({ trimmedUrl, startTime, endTime, duration }) =>
            update({ trimmedUrl, startTime, endTime })
          }
        />
      )}

      {/* Model selector */}
      <div>
        <Label className="text-xs text-gray-500">Model</Label>
        <select
          value={ref.model || 'kling_motion_control'}
          onChange={(e) => update({ model: e.target.value })}
          className="w-full mt-1 text-xs border border-gray-200 rounded-md p-1.5 bg-white"
        >
          {MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
          ))}
        </select>
      </div>

      {/* Kling-specific options */}
      {isKling && (
        <>
          {/* Character orientation */}
          <div>
            <Label className="text-xs text-gray-500">Character Orientation</Label>
            <div className="flex gap-2 mt-1">
              {ORIENTATIONS.map(o => (
                <button
                  key={o.id}
                  onClick={() => update({ characterOrientation: o.id })}
                  className={`flex-1 text-xs p-2 rounded-md border transition-colors ${
                    (ref.characterOrientation || 'image') === o.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{o.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{o.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Keep original sound */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-500 flex items-center gap-1">
              {ref.keepOriginalSound !== false ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              Keep Original Sound
            </Label>
            <button
              onClick={() => update({ keepOriginalSound: !(ref.keepOriginalSound !== false) })}
              className={`w-8 h-4 rounded-full transition-colors ${
                ref.keepOriginalSound !== false ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${
                ref.keepOriginalSound !== false ? 'translate-x-4' : ''
              }`} />
            </button>
          </div>
        </>
      )}

      {/* Duration warning for Kling */}
      {isKling && maxDuration && effectiveDuration && effectiveDuration > maxDuration && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          Reference video is {effectiveDuration.toFixed(1)}s — Kling {ref.characterOrientation || 'image'} mode supports max {maxDuration}s. Please trim the video.
        </div>
      )}

      {/* Optional prompt */}
      <div>
        <Label className="text-xs text-gray-500">Prompt (optional)</Label>
        <Input
          placeholder="Describe the scene..."
          value={ref.prompt || ''}
          onChange={(e) => update({ prompt: e.target.value })}
          className="text-xs mt-1"
        />
      </div>

      {showLibrary && (
        <LibraryModal
          isOpen={showLibrary}
          onClose={() => setShowLibrary(false)}
          onSelect={(url) => {
            update({ videoUrl: url, trimmedUrl: null, startTime: null, endTime: null });
            setShowLibrary(false);
          }}
          mediaType="video"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MotionReferenceInput.jsx
git commit -m "feat(ui): add MotionReferenceInput shared component"
```

---

## Task 6: Shorts Workbench Integration

**Files:**
- Modify: `src/pages/ShortsWorkbenchPage.jsx`
- Modify: `api/workbench/workbench.js`

- [ ] **Step 1: Add motion reference state and UI to Shorts Step 3**

Read `ShortsWorkbenchPage.jsx` around lines 455-465 (scene reference state) and the Step 3 render section (~lines 1680-1720) to find where per-scene keyframe inputs are rendered.

Add state near existing `sceneRefs` state (~line 455):
```javascript
const [sceneMotionRefs, setSceneMotionRefs] = useState({}); // { sceneIdx: motionRef }
```

Add a helper to update a scene's motion ref:
```javascript
const updateSceneMotionRef = (sceneIdx, motionRef) => {
  setSceneMotionRefs(prev => ({ ...prev, [sceneIdx]: motionRef }));
};
const clearSceneMotionRef = (sceneIdx) => {
  setSceneMotionRefs(prev => {
    const next = { ...prev };
    delete next[sceneIdx];
    return next;
  });
};
```

In the Step 3 per-scene render (after the keyframe image generation area), add a collapsible motion reference section:
```jsx
{/* Motion Reference (optional) */}
{!sceneMotionRefs[sceneIdx] ? (
  <Button
    size="sm" variant="ghost"
    onClick={() => updateSceneMotionRef(sceneIdx, { model: 'kling_motion_control' })}
    className="text-xs text-gray-500"
  >
    <Film className="w-3 h-3 mr-1" /> Add Motion Reference
  </Button>
) : (
  <MotionReferenceInput
    motionRef={sceneMotionRefs[sceneIdx]}
    onChange={(ref) => updateSceneMotionRef(sceneIdx, ref)}
    onClear={() => clearSceneMotionRef(sceneIdx)}
  />
)}
```

Import `MotionReferenceInput` and `Film` at the top of the file.

- [ ] **Step 2: Modify Step 4 mode detection for MT**

Read line ~591 for the current mode detection. Change to:

```javascript
const mode = sceneMotionRefs[sceneIdx]?.videoUrl
  ? 'mt'
  : isFLF(videoModel) ? 'flf' : 'i2v';
```

In the `generateClip` function (the handler that calls the backend), when `mode === 'mt'`, include the motion ref data in the request body:

```javascript
const motionRef = sceneMotionRefs[sceneIdx];
const clipBody = {
  mode,
  video_model: videoModel,
  start_frame_url: frames[sceneIdx]?.start || frames[sceneIdx]?.single,
  // ... existing fields ...
  ...(mode === 'mt' && motionRef ? {
    motion_ref: {
      video_url: motionRef.videoUrl,
      trimmed_url: motionRef.trimmedUrl,
      model: motionRef.model || 'kling_motion_control',
      character_orientation: motionRef.characterOrientation || 'image',
      keep_original_sound: false, // Shorts always false — has its own audio
      elements: motionRef.elements,
      prompt: motionRef.prompt,
    },
  } : {}),
};
```

MT scenes should follow the sequential generation pattern (like I2V), not parallel (like FLF).

- [ ] **Step 3: Include motion refs in draft save/load**

Find the draft save logic (search for `save-draft` action). Include `sceneMotionRefs` in the saved `storyboard_json`. On load, restore it from the draft data.

- [ ] **Step 4: Add MT mode to workbench.js backend**

Read `api/workbench/workbench.js` lines 267-363 (the `generate-clip` case). The current structure is `if (mode === 'flf') { ... } else { // I2V }`. Restructure to: `if (mode === 'flf') { ... } else if (mode === 'mt') { ... } else { // I2V }`. The MT branch goes between the FLF `if` block and the I2V `else` block:

```javascript
} else if (mode === 'mt') {
  // Motion Transfer mode
  const { motion_ref } = req.body;
  if (!motion_ref?.video_url && !motion_ref?.trimmed_url) {
    return res.status(400).json({ error: 'motion_ref with video_url or trimmed_url required for MT mode' });
  }

  const { generateMotionTransfer } = await import('../lib/motionTransferRegistry.js');
  const motionVideoUrl = motion_ref.trimmed_url || motion_ref.video_url;

  const result = await generateMotionTransfer(
    motion_ref.model || 'kling_motion_control',
    start_frame_url,
    motionVideoUrl,
    {
      character_orientation: motion_ref.character_orientation || 'image',
      prompt: motion_ref.prompt || fullPrompt,
      keep_original_sound: false, // Shorts: always false
      elements: motion_ref.elements,
    },
    keys.falKey,
    supabase,
  );

  videoUrl = result.videoUrl;

  // Extract last frame for chaining (same as I2V)
  const { extractLastFrame, uploadUrlToSupabase: uploadUrl } = await import('../lib/pipelineHelpers.js');
  lastFrameUrl = await extractLastFrame(videoUrl, duration, keys.falKey);
  lastFrameUrl = await uploadUrl(lastFrameUrl, supabase, 'pipeline/workbench');

  // Vision analysis for next-scene prompt continuity (same as I2V)
  if (openai) {
    const { analyzeFrameContinuity } = await import('../lib/pipelineHelpers.js');
    visionAnalysis = await analyzeFrameContinuity(lastFrameUrl, openai);
  }
}
```

Import `logCost` and add cost logging after the MT generation (check existing cost logging pattern in the file).

- [ ] **Step 5: Commit**

```bash
git add src/pages/ShortsWorkbenchPage.jsx api/workbench/workbench.js
git commit -m "feat(shorts): integrate motion transfer as third generation mode (MT)"
```

---

## Task 7: Storyboard Integration

**Files:**
- Create: `supabase/migrations/20260403_storyboard_motion_ref.sql`
- Modify: `src/pages/StoryboardWorkspace.jsx`
- Modify: `api/storyboard/produce.js`

- [ ] **Step 1: Create the migration**

```sql
-- Add motion reference support to storyboard frames
ALTER TABLE storyboard_frames
ADD COLUMN IF NOT EXISTS motion_ref JSONB DEFAULT NULL;

COMMENT ON COLUMN storyboard_frames.motion_ref IS 'Optional motion transfer config: { videoUrl, trimmedUrl, startTime, endTime, model, characterOrientation, keepOriginalSound, elements, prompt }';
```

- [ ] **Step 2: Run the migration**

Run via Supabase dashboard or direct SQL execution against the production database.

- [ ] **Step 3: Add MotionReferenceInput to frame detail panel**

Read `StoryboardWorkspace.jsx` around lines 367-389 (frame detail panel, after motion_prompt Field). Insert the MotionReferenceInput component:

```jsx
{/* Motion Reference (optional) */}
{!selectedFrame?.motion_ref ? (
  <Button
    size="sm" variant="ghost"
    onClick={() => handleFrameUpdate(selectedFrame.id, {
      motion_ref: { model: 'kling_motion_control' }
    })}
    className="text-xs text-gray-500 mt-2"
  >
    <Film className="w-3 h-3 mr-1" /> Add Motion Reference
  </Button>
) : (
  <MotionReferenceInput
    motionRef={selectedFrame.motion_ref}
    onChange={(ref) => handleFrameUpdate(selectedFrame.id, { motion_ref: ref })}
    onClear={() => handleFrameUpdate(selectedFrame.id, { motion_ref: null })}
  />
)}
```

The `handleFrameUpdate` function should already exist for updating frame fields — verify it persists to the database. If it only updates local state, ensure the `motion_ref` field is included in the save/update API call.

Add "MT" badge to frame thumbnails in the grid view when `frame.motion_ref?.videoUrl` is truthy.

Import `MotionReferenceInput` and `Film` at the top.

- [ ] **Step 4: Add MT strategy to produce.js**

Read `api/storyboard/produce.js` around lines 106-179 (`generateFrameVideo` function). Add the MT call-site override BEFORE the strategy lookup:

```javascript
async function generateFrameVideo(frame, config, prevLastFrame, keys, supabase) {
  // MT override: if frame has a motion reference, use MT regardless of global model
  if (frame.motion_ref?.videoUrl || frame.motion_ref?.trimmedUrl) {
    const { generateMotionTransfer } = await import('../lib/motionTransferRegistry.js');
    const motionVideoUrl = frame.motion_ref.trimmedUrl || frame.motion_ref.videoUrl;
    const imageUrl = prevLastFrame || frame.preview_image_url;

    if (!imageUrl) throw new Error(`Frame ${frame.frame_number}: No image for motion transfer`);

    const result = await generateMotionTransfer(
      frame.motion_ref.model || 'kling_motion_control',
      imageUrl,
      motionVideoUrl,
      {
        character_orientation: frame.motion_ref.characterOrientation || 'image',
        prompt: frame.motion_ref.prompt || frame.visual_prompt || '',
        keep_original_sound: frame.motion_ref.keepOriginalSound ?? true,
        elements: frame.motion_ref.elements,
      },
      keys.falKey,
      supabase,
    );

    // Extract last frame for chaining + upload to Supabase (FAL CDN URLs expire)
    const { extractLastFrame, uploadUrlToSupabase: uploadUrl } = await import('../lib/pipelineHelpers.js');
    let lastFrameUrl = await extractLastFrame(result.videoUrl, frame.duration_seconds, keys.falKey);
    lastFrameUrl = await uploadUrl(lastFrameUrl, supabase, 'pipeline/storyboard');

    return { videoUrl: result.videoUrl, lastFrameUrl };
  }

  // Normal strategy dispatch (existing code continues unchanged)
  const strategy = getModelStrategy(config.model);
  // ...
}
```

Note: Unlike Shorts, Storyboard does NOT force `keep_original_sound: false` — the storyboard user controls this per-frame.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260403_storyboard_motion_ref.sql src/pages/StoryboardWorkspace.jsx api/storyboard/produce.js
git commit -m "feat(storyboard): integrate per-frame motion transfer with MT strategy override"
```

---

## Task 8: Refactor MotionTransferModal in VideoAdvertCreator

**Files:**
- Modify: `src/components/modals/MotionTransferModal.jsx`

- [ ] **Step 1: Refactor the modal to use shared components**

Read the full current `MotionTransferModal.jsx` (330 lines). Replace the inline UI with `MotionReferenceInput` and update the generation handler to use the new endpoint response shape (direct `outputUrl` instead of polling).

Key changes:
- Replace character image input, motion video input, orientation toggle, prompt fields, and audio toggle with a single `<MotionReferenceInput>` for the video reference
- Keep the character image input separate (it's the `image_url` for generation — distinct from the video reference)
- Remove the client-side polling loop — the refactored `generate.js` now does server-side polling and returns the final URL
- Fix the subtitle from "Kling 2.6" to show the selected model name
- Pass `model` in the generate request body

The generation handler simplifies to:
```javascript
const handleGenerateMotion = async () => {
  if (!characterImage || !motionRef?.videoUrl) {
    toast.error('Please provide both a character image and a motion video.');
    return;
  }
  setIsLoading(true);
  try {
    const response = await apiFetch('/api/motion-transfer/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: motionRef.model || 'kling_motion_control',
        image_url: characterImage,
        video_url: motionRef.trimmedUrl || motionRef.videoUrl,
        character_orientation: motionRef.characterOrientation || 'image',
        prompt: motionRef.prompt || '',
        keep_original_sound: motionRef.keepOriginalSound !== false,
        elements: motionRef.elements,
      }),
    });

    if (response.error) {
      toast.error(response.error);
      return;
    }

    onMotionGenerated?.(response.outputUrl);
    onClose();
  } catch (err) {
    toast.error('Motion transfer failed');
  } finally {
    setIsLoading(false);
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modals/MotionTransferModal.jsx
git commit -m "refactor(motion-transfer-modal): use shared MotionReferenceInput + registry-backed generation"
```

---

## Task 9: Verify End-to-End

- [ ] **Step 1: Start the dev server**

```bash
npm run start
```

- [ ] **Step 2: Test video trim endpoint**

Use a known video URL. Open browser dev tools or use curl to call `POST /api/video/trim` with a 5s segment. Verify the returned Supabase URL plays correctly.

- [ ] **Step 3: Test VideoAdvertCreator modal**

Open VideoAdvertCreator → Motion Transfer. Select WAN 2.2, paste a character image + motion video, optionally trim, generate. Then switch to Kling V3 Pro, test with orientation toggle. Verify both models produce output.

- [ ] **Step 4: Test Shorts Workbench**

Create a new Short. In Step 3, add a motion reference to Scene 2 only (leave Scene 1 and 3 as normal). In Step 4, verify Scene 2 uses MT mode while others use FLF/I2V. Verify frame chaining works across the mixed modes.

- [ ] **Step 5: Test Storyboard**

Create a storyboard with 3+ frames. Add a motion reference to frame 2. Run production. Verify frame 2 uses MT, others use the global model, and the final video assembles correctly.

- [ ] **Step 6: Test draft persistence**

In Shorts Workbench, add motion refs, save draft, reload — verify refs persist. In Storyboard, add motion refs to frames, navigate away and back — verify they persist in the database.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during motion transfer integration testing"
```
