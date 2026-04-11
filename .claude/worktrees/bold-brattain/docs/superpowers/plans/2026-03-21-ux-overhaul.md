# Stitch Studio UX Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul 7 areas of Stitch Studio to improve usability — larger thumbnails, wizard-step modals, model capability indicators, more Shorts niches with real story sourcing, and functional Campaigns export.

**Architecture:** Each issue is an independent workstream that can be executed in parallel. Shared patterns: wizard step components use the existing `SlideOverPanel` + a new reusable `WizardStepper` component. Thumbnail pipeline adds server-side processing in `api/library/save.js`. No features are removed — only restructured for clarity.

**Tech Stack:** React 18 + Vite, Radix UI, Tailwind CSS, Supabase (Postgres + Storage), Express API routes, ElevenLabs, OpenAI, FAL/Wavespeed video APIs.

**No test framework exists** in this project. Steps that would normally be TDD will instead use manual browser verification. Each task ends with a commit.

---

## File Structure Overview

### New Files

| File | Responsibility |
|------|---------------|
| `src/components/ui/WizardStepper.jsx` | Reusable step indicator + navigation for all wizard modals |
| `api/lib/thumbnailHelper.js` | Server-side image thumbnail generation (sharp resize, Supabase upload) |
| `api/library/update-thumbnail.js` | Endpoint to upload a thumbnail data URL and update a row's thumbnail_url column |
| `api/migrations/add-thumbnail-url.sql` | DB migration to add thumbnail_url columns |
| `src/lib/thumbnailHelper.js` | Client-side video poster frame extraction (browser canvas) |
| `api/shorts/research.js` | Story research for real story sourcing |
| `api/shorts/preview-script.js` | Generate script preview without starting full pipeline |
| `api/campaigns/export.js` | Download manifest of campaign assets per platform |
| `src/components/modals/StoryboardPlannerWizard.jsx` | Refactored storyboard planner as multi-step wizard |
| `src/components/modals/TurnaroundSheetWizard.jsx` | Refactored turnaround sheet as multi-step wizard |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/modals/LibraryModal.jsx` | Larger icons, thumbnail URLs, grid sizing |
| `src/components/modals/JumpStartVideoStudioModal.jsx` | Use thumbnail URLs for video library cards |
| `src/components/modals/EditImageModal.jsx` | Model capability badges, smart warnings |
| `src/pages/ShortsFactoryPage.jsx` | New niches, script preview, model selector, story sourcing UI |
| `src/pages/CampaignsPage.jsx` | Export/download button per draft |
| `api/library/save.js` | Generate thumbnail on save, store thumbnail_url |
| `api/lib/shortsTemplates.js` | Add 8 new niche templates |
| `api/lib/scriptGenerator.js` | Accept real story context for script generation |
| `api/shorts/generate.js` | Accept video_model override, story_context |
| `package.json` | Add `sharp` dependency for image thumbnails |

### Database Migrations

| Table | Change |
|-------|--------|
| `image_library_items` | Add column `thumbnail_url TEXT` |
| `generated_videos` | Add column `thumbnail_url TEXT` |

---

## Task Group A: Shared Components

### Task A1: WizardStepper Component

**Files:**
- Create: `src/components/ui/WizardStepper.jsx`

This is the foundation used by Tasks B (Storyboard), C (Turnaround), and referenced by EditImage.

- [ ] **Step 1: Create WizardStepper component**

```jsx
// src/components/ui/WizardStepper.jsx
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * WizardStepper — reusable step indicator + nav for multi-step modals.
 *
 * Props:
 *   steps: [{ key: string, label: string, icon?: ReactNode }]
 *   currentStep: string (matches a step.key)
 *   completedSteps: string[] (keys of completed steps)
 *   onStepClick?: (key: string) => void  (optional — allows clicking back to completed steps)
 */
export default function WizardStepper({ steps, currentStep, completedSteps = [], onStepClick }) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center gap-1 px-5 py-3 border-b bg-slate-50 flex-shrink-0 overflow-x-auto">
      {steps.map((step, i) => {
        const isCompleted = completedSteps.includes(step.key);
        const isCurrent = step.key === currentStep;
        const isPast = i < currentIndex;
        const isClickable = onStepClick && (isCompleted || isPast);

        return (
          <React.Fragment key={step.key}>
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.key)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                isCurrent && 'bg-[#2C666E] text-white shadow-sm',
                isCompleted && !isCurrent && 'bg-[#2C666E]/10 text-[#2C666E]',
                !isCurrent && !isCompleted && 'text-slate-400',
                isClickable && 'cursor-pointer hover:bg-[#2C666E]/20',
                !isClickable && !isCurrent && 'cursor-default',
              )}
            >
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                isCurrent && 'bg-white/20 text-white',
                isCompleted && !isCurrent && 'bg-[#2C666E] text-white',
                !isCurrent && !isCompleted && 'bg-slate-200 text-slate-500',
              )}>
                {isCompleted && !isCurrent ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              {step.label}
            </button>
            {i < steps.length - 1 && (
              <div className={cn(
                'flex-shrink-0 w-6 h-px',
                isPast || isCompleted ? 'bg-[#2C666E]/40' : 'bg-slate-200',
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Import into any existing modal temporarily to confirm it renders correctly. Remove after verification.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/WizardStepper.jsx
git commit -m "feat: add reusable WizardStepper component for multi-step modals"
```

---

## Task Group 1: Library Thumbnails & Icons (Issue #1 + #5)

### Task 1.1: Database Migration — Add thumbnail_url Columns

**Files:**
- Create: `api/migrations/add-thumbnail-url.sql`

- [ ] **Step 0: Create migrations directory**

```bash
mkdir -p /Users/stuarta/stitch/api/migrations
```

- [ ] **Step 1: Write the migration SQL**

```sql
-- api/migrations/add-thumbnail-url.sql
-- Add thumbnail_url column to media tables for fast grid loading

ALTER TABLE image_library_items
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE generated_videos
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Index for quick lookups when loading library grids
CREATE INDEX IF NOT EXISTS idx_image_library_items_thumbnail
  ON image_library_items (thumbnail_url)
  WHERE thumbnail_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generated_videos_thumbnail
  ON generated_videos (thumbnail_url)
  WHERE thumbnail_url IS NOT NULL;
```

- [ ] **Step 2: Run migration against Supabase**

Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query → paste → Run). Or use the Supabase MCP tool `execute_sql`.

- [ ] **Step 3: Commit**

```bash
git add api/migrations/add-thumbnail-url.sql
git commit -m "feat: add thumbnail_url columns to image_library_items and generated_videos"
```

### Task 1.2: Thumbnail Helper Library

**Files:**
- Create: `api/lib/thumbnailHelper.js`

- [ ] **Step 1: Install sharp dependency**

```bash
cd /Users/stuarta/stitch && npm install sharp
```

- [ ] **Step 2: Create thumbnail helper**

```js
// api/lib/thumbnailHelper.js
/**
 * Thumbnail generation helpers.
 * - Images: resize to 400px wide using sharp
 * - Videos: extract first frame as JPEG (client-side fallback if no ffmpeg)
 */

import sharp from 'sharp';

const THUMB_WIDTH = 400;
const THUMB_QUALITY = 80;

/**
 * Generate a thumbnail from an image buffer.
 * @param {Buffer} imageBuffer - raw image bytes
 * @returns {Promise<Buffer>} - JPEG thumbnail buffer
 */
export async function generateImageThumbnail(imageBuffer) {
  return sharp(imageBuffer)
    .resize(THUMB_WIDTH, null, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY })
    .toBuffer();
}

/**
 * Download a URL to a buffer.
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
export async function downloadToBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate a thumbnail from an image URL, upload to Supabase Storage,
 * and return the public URL.
 *
 * @param {string} imageUrl - source image URL
 * @param {object} supabase - Supabase client
 * @param {string} userId - for storage path namespacing
 * @returns {Promise<string|null>} - thumbnail public URL or null on failure
 */
export async function generateAndUploadImageThumbnail(imageUrl, supabase, userId) {
  try {
    const buffer = await downloadToBuffer(imageUrl);
    const thumbBuffer = await generateImageThumbnail(buffer);
    const filename = `thumbnails/${userId}/${Date.now()}-thumb.jpg`;

    const { data, error } = await supabase.storage
      .from('media')
      .upload(filename, thumbBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.warn('[Thumbnail] Upload failed:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filename);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn('[Thumbnail] Generation failed:', err.message);
    return null;
  }
}

// NOTE: Video poster frame extraction is handled CLIENT-SIDE only.
// See src/lib/thumbnailHelper.js for the browser-based extractVideoPosterFrame function.
// Do NOT add browser code (document.createElement) to this server-side module.
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/thumbnailHelper.js package.json package-lock.json
git commit -m "feat: add thumbnail generation helper with sharp for image resizing"
```

### Task 1.3: Modify Library Save to Generate Thumbnails

**Files:**
- Modify: `api/library/save.js`

- [ ] **Step 1: Add thumbnail generation to the save flow**

At the top of `api/library/save.js` (after line 12), add the import:

```js
import { generateAndUploadImageThumbnail } from '../lib/thumbnailHelper.js';
```

After the successful DB insert at line 236 (`console.log(...SUCCESS...)`), **before** the `return res.status(200).json(...)` at line 239, add thumbnail generation. The key variables at this point are: `finalUrl` (the stored URL), `data.id` (the new row's ID), `table` (either `'image_library_items'` or `'generated_videos'`), `type` (either `'image'` or `'video'`).

```js
// Generate thumbnail asynchronously (don't block the response)
if (type === 'image' && finalUrl) {
  generateAndUploadImageThumbnail(finalUrl, supabase, req.user?.id || 'anonymous')
    .then(thumbUrl => {
      if (thumbUrl) {
        supabase.from('image_library_items')
          .update({ thumbnail_url: thumbUrl })
          .eq('id', data.id)
          .then(() => console.log(`[Library Save] Thumbnail saved for ${data.id}`))
          .catch(err => console.warn('[Library Save] Thumb update failed:', err.message));
      }
    })
    .catch(err => console.warn('[Library Save] Thumb gen failed:', err.message));
}
```

For videos, we'll handle thumbnails client-side (Task 1.5) since server-side ffmpeg isn't available.

- [ ] **Step 2: Verify by saving a new image via the app and checking the DB**

Open Stitch Studio, generate or save any image. Check `image_library_items` in Supabase — the new row should get a `thumbnail_url` populated shortly after save.

- [ ] **Step 3: Commit**

```bash
git add api/library/save.js
git commit -m "feat: generate image thumbnails on library save"
```

### Task 1.4: Update LibraryModal to Use Thumbnails + Larger Icons

**Files:**
- Modify: `src/components/modals/LibraryModal.jsx`

- [ ] **Step 1: Update MediaCard to prefer thumbnail_url for grid display**

In `LibraryModal.jsx`, in the `MediaCard` component, change the `mediaUrl` resolution at line ~41 to prefer thumbnails:

```js
const mediaUrl = item.url || item.image_url || item.video_url || item.audio_url;
const thumbnailUrl = item.thumbnail_url || mediaUrl;
```

Then in the `<img>` tag (around line 203), change `src={mediaUrl}` to `src={thumbnailUrl}` for the grid display. Keep `mediaUrl` for the "Add to Editor" action and external link.

For videos (around line 158), add a poster attribute and show a static thumbnail instead of loading the full video:

Replace the video rendering block with:

```jsx
{isVideo ? (
  <>
    {item.thumbnail_url ? (
      <img
        src={item.thumbnail_url}
        alt={item.title || 'Video'}
        className="max-w-full max-h-full object-contain"
        loading="lazy"
      />
    ) : (
      <video
        ref={videoRef}
        src={mediaUrl}
        className="max-w-full max-h-full object-contain"
        muted={isMuted}
        loop
        playsInline
        onLoadedMetadata={handleMediaLoad}
        onEnded={handleMediaEnd}
        onClick={(e) => e.stopPropagation()}
      />
    )}
    {/* ... keep existing overlay controls ... */}
  </>
)}
```

- [ ] **Step 2: Increase icon sizes**

In `MediaCard`, find the type badge section (around line 232). Change:

```jsx
// OLD:
<div className={`p-1.5 rounded-lg ...`}>
  {isAudio ? <MusicIcon className="w-3.5 h-3.5" /> : isVideo ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
</div>

// NEW:
<div className={`p-2 rounded-lg ...`}>
  {isAudio ? <MusicIcon className="w-5 h-5" /> : isVideo ? <Video className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
</div>
```

- [ ] **Step 3: Adjust grid columns for larger cards**

In `MediaGrid` (around line 318), change:

```jsx
// OLD:
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max">

// NEW:
<div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-max">
```

This gives 3 columns max on desktop instead of 4 — larger, more visible cards.

- [ ] **Step 4: Update Supabase queries to include thumbnail_url**

In `loadLibrary()` (around line 409), update the select for images:

```js
// OLD:
.select('id, url, title, prompt, created_at, alt_text')

// NEW:
.select('id, url, thumbnail_url, title, prompt, created_at, alt_text')
```

And for videos (around line 424):

```js
// OLD:
.select('id, url, title, prompt, created_at')

// NEW:
.select('id, url, thumbnail_url, title, prompt, created_at')
```

- [ ] **Step 5: Verify in browser**

Open Library modal — images should load faster (thumbnails), icons should be visibly larger, video cards should show poster frames where available.

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/LibraryModal.jsx
git commit -m "feat: use thumbnails in library grid, increase icon sizes, reduce columns for larger cards"
```

### Task 1.5: Update Video Studio to Use Thumbnails

**Files:**
- Modify: `src/components/modals/JumpStartVideoStudioModal.jsx`

- [ ] **Step 1: Add thumbnail_url to video library query**

In `JumpStartVideoStudioModal.jsx`, find where `videoLibrary` is loaded from Supabase (search for `generated_videos` select query). Add `thumbnail_url` to the select. Then in the video card rendering, use `thumbnail_url` as the card image instead of rendering a `<video>` element.

Search for the section that renders video library cards (the grid showing "LIBRARY" text in your screenshot). Replace the dark placeholder with:

```jsx
{video.thumbnail_url ? (
  <img src={video.thumbnail_url} alt={video.title || 'Video'} className="w-full h-full object-cover" />
) : (
  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
    <Video className="w-8 h-8 text-slate-500" />
  </div>
)}
```

- [ ] **Step 2: Add client-side thumbnail extraction for videos without thumbnails**

Import the client-side extractor at the top:

```js
import { extractVideoPosterFrameClientSide } from '@/api/lib/thumbnailHelper';
```

Note: Since this is a browser function, it may need to be moved to `src/lib/thumbnailHelper.js` or inlined. Create `src/lib/thumbnailHelper.js`:

```js
// src/lib/thumbnailHelper.js
/**
 * Extract a poster frame from a video URL (browser-only).
 * Returns a JPEG data URL.
 */
export function extractVideoPosterFrame(videoUrl) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth, 400);
        canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = videoUrl;
  });
}
```

Then after loading the video library, for any video without a `thumbnail_url`, lazily extract a poster frame and backfill the `generated_videos.thumbnail_url` column directly (do NOT save as a new image library item — that would pollute the user's library):

```js
// After setVideoLibrary(data):
// Backfill missing video thumbnails
data.filter(v => !v.thumbnail_url && v.url).forEach(async (v) => {
  try {
    const posterDataUrl = await extractVideoPosterFrame(v.url);

    // Upload the poster to Supabase Storage and update the video row's thumbnail_url
    const uploadRes = await apiFetch('/api/library/update-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'generated_videos',
        id: v.id,
        thumbnail_data_url: posterDataUrl,
      }),
    });
    const uploadData = await uploadRes.json();

    // Update local state with the hosted thumbnail URL
    if (uploadData.thumbnail_url) {
      setVideoLibrary(prev => prev.map(item =>
        item.id === v.id ? { ...item, thumbnail_url: uploadData.thumbnail_url } : item
      ));
    }
  } catch (err) {
    console.warn('[VideoStudio] Poster extraction failed:', err.message);
  }
});
```

This requires a small new endpoint — create `api/library/update-thumbnail.js`:

```js
// api/library/update-thumbnail.js
/**
 * POST /api/library/update-thumbnail
 * Upload a thumbnail data URL to storage and update the row's thumbnail_url column.
 * Body: { table: 'image_library_items' | 'generated_videos', id: string, thumbnail_data_url: string }
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { table, id, thumbnail_data_url } = req.body;
  if (!table || !id || !thumbnail_data_url) return res.status(400).json({ error: 'Missing fields' });
  if (!['image_library_items', 'generated_videos'].includes(table)) return res.status(400).json({ error: 'Invalid table' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const matches = thumbnail_data_url.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: 'Invalid data URL' });

    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `thumbnails/${req.user?.id || 'anon'}/${Date.now()}-thumb.jpg`;

    const { error: uploadErr } = await supabase.storage.from('media').upload(filename, buffer, {
      contentType: 'image/jpeg', upsert: false,
    });
    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from('media').getPublicUrl(filename);
    const thumbnailUrl = urlData?.publicUrl;

    const { error: updateErr } = await supabase.from(table).update({ thumbnail_url: thumbnailUrl }).eq('id', id);
    if (updateErr) throw updateErr;

    return res.json({ success: true, thumbnail_url: thumbnailUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 3: Verify in browser**

Open Video Studio — video cards should now show preview images instead of dark squares.

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/JumpStartVideoStudioModal.jsx src/lib/thumbnailHelper.js api/library/update-thumbnail.js
git commit -m "feat: show video thumbnails in Video Studio, extract poster frames for backfill"
```

---

## Task Group 2: Storyboard Planner Wizard (Issue #2)

### Task 2.1: Create StoryboardPlannerWizard

**Files:**
- Create: `src/components/modals/StoryboardPlannerWizard.jsx`
- Modify: `src/components/modals/StoryboardPlannerModal.jsx` (keep as-is, rename export)

The approach: Create the new wizard component that imports and reuses all the same state logic from the original, but restructures the UI into 7 steps. We keep the original file intact as a fallback.

- [ ] **Step 1: Create the new wizard file**

Create `src/components/modals/StoryboardPlannerWizard.jsx`. This file will:

1. Import `WizardStepper` from `@/components/ui/WizardStepper`
2. Copy all state, effects, and handler functions from `StoryboardPlannerModal.jsx` (lines 1–860)
3. Replace the single `step === 'setup'` render block with 5 separate step renders

The wizard steps:

```js
const WIZARD_STEPS = [
  { key: 'story', label: 'Story & Mood' },
  { key: 'style', label: 'Visual Style' },
  { key: 'characters', label: 'Characters' },
  { key: 'scene-builder', label: 'Scene Builder' },
  { key: 'settings', label: 'Frame & Model' },
  { key: 'scenes', label: 'Scenes' },
  { key: 'generating', label: 'Generate' },
];
```

**Step 1 — Story & Mood** (full width, no columns):
- Story overview textarea (larger — rows={4})
- Overall mood PillSelector (bigger pills: `text-sm px-3 py-1.5` instead of `text-[10px] px-2 py-0.5`)
- Number of scenes, duration per scene, aspect ratio (grid-cols-3)

**Step 2 — Visual Style** (full width):
- Style pills (with `text-sm` sizing)
- Lighting pills
- Color grade pills
- Brand style guide selector

**Step 3 — Characters** (full width):
- Element cards (up to 4) — each gets more vertical space
- Reference image upload/library per element
- Auto-describe from image
- Character description textarea per element

**Step 4 — Scene Builder** (full width):
- Per-scene cards — each gets full width instead of being crammed into half-width
- All pill selectors use `text-sm px-3 py-1.5`
- Environment, action, expression, lighting, camera angle, camera movement
- "What happens?" textarea gets rows={3} instead of single line input

**Step 5 — Frame & Model** (full width):
- Starting scene image (generate/upload/library) — larger preview area
- Video model selector
- Props & accessories pills
- Negative prompt pills + freetext

**Steps 6 & 7** — Keep existing `scenes`, `generating`, and `review` renders unchanged.

The full implementation is large (1700+ lines refactored). The key structural change is:

```jsx
return (
  <SlideOverPanel open={isOpen} onOpenChange={(open) => !open && onClose()}
    title="Storyboard Planner" subtitle={subtitle}
    icon={<Clapperboard className="w-5 h-5" />}>
    <WizardStepper
      steps={WIZARD_STEPS}
      currentStep={step}
      completedSteps={completedSteps}
      onStepClick={(key) => {
        const targetIdx = WIZARD_STEPS.findIndex(s => s.key === key);
        const currentIdx = WIZARD_STEPS.findIndex(s => s.key === step);
        if (targetIdx < currentIdx) setStep(key);
      }}
    />
    <SlideOverBody>
      {step === 'story' && ( /* Story & Mood content — full width */ )}
      {step === 'style' && ( /* Visual Style content — full width */ )}
      {step === 'characters' && ( /* Characters content — full width */ )}
      {step === 'scene-builder' && ( /* Scene Builder content — full width */ )}
      {step === 'settings' && ( /* Frame & Model content — full width */ )}
      {step === 'scenes' && ( /* existing scenes content */ )}
      {step === 'generating' && ( /* existing generating content */ )}
    </SlideOverBody>
    <SlideOverFooter>
      <div className="flex justify-between w-full">
        <Button variant="outline" onClick={handleBack} disabled={step === 'story'}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={handleNext} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
          {step === 'settings' ? 'Generate Scenes' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </SlideOverFooter>
  </SlideOverPanel>
);
```

**IMPORTANT sizing changes throughout:**
- All PillSelector pills: `text-[10px] px-2 py-0.5` → `text-sm px-3 py-1.5 rounded-lg`
- Labels: `text-[10px]` → `text-sm`
- Inputs: `text-xs` → `text-sm`
- Scene cards: remove `max-h-[340px]` constraint, give each card `p-5` instead of `p-2.5`
- Textareas: `rows={1}` → `rows={3}`

- [ ] **Step 2: Wire up navigation helpers**

Add these to the component:

```js
const [completedSteps, setCompletedSteps] = useState([]);

const handleNext = () => {
  const currentIdx = WIZARD_STEPS.findIndex(s => s.key === step);
  if (currentIdx < WIZARD_STEPS.length - 1) {
    setCompletedSteps(prev => [...new Set([...prev, step])]);
    const nextStep = WIZARD_STEPS[currentIdx + 1].key;
    if (nextStep === 'scenes' && scenes.length === 0) {
      // Auto-generate scenes when entering the scenes step
      handleGenerateScenes();
    }
    setStep(nextStep);
  }
};

const handleBack = () => {
  const currentIdx = WIZARD_STEPS.findIndex(s => s.key === step);
  if (currentIdx > 0) {
    setStep(WIZARD_STEPS[currentIdx - 1].key);
  }
};
```

- [ ] **Step 3: Update the import in the parent component**

Find where `StoryboardPlannerModal` is imported (likely in `src/pages/VideoAdvertCreator.jsx` or `src/App.jsx`). Change the import to use the new wizard:

```js
// OLD:
import StoryboardPlannerModal from '@/components/modals/StoryboardPlannerModal';
// NEW:
import StoryboardPlannerModal from '@/components/modals/StoryboardPlannerWizard';
```

Keep the old file as `StoryboardPlannerModal.jsx` — don't delete it.

- [ ] **Step 4: Verify in browser**

Open Storyboard Planner. Should show step indicators at top. Click through each step — content should be full-width and readable with larger text.

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/StoryboardPlannerWizard.jsx
git commit -m "feat: refactor Storyboard Planner into 7-step wizard with larger UI elements"
```

---

## Task Group 3: Character Turnaround Wizard (Issue #3)

### Task 3.1: Create TurnaroundSheetWizard

**Files:**
- Create: `src/components/modals/TurnaroundSheetWizard.jsx`

Same pattern as Task Group 2. Extract the configure step into 4 wizard steps.

- [ ] **Step 1: Create wizard file**

```js
const WIZARD_STEPS = [
  { key: 'character', label: 'Character' },
  { key: 'style-model', label: 'Style & Model' },
  { key: 'props', label: 'Props' },
  { key: 'refinements', label: 'Refinements' },
  { key: 'results', label: 'Results' },
  { key: 'cells', label: 'Cell Editor' },
];
```

**Step 1 — Character** (full width):
- Character description textarea (rows={6}, full width, `text-sm`)
- Reference image area — larger preview (w-32 h-32 instead of w-20 h-20)
- Upload / Library / URL input — each button gets more space
- Re-analyze button prominently placed

**Step 2 — Style & Model** (full width):
- StyleGrid component with `columns="grid-cols-4"` and full width (currently crammed into w-1/2)
- Model selector below with clear labels about which need reference images
- Warning banner if no reference image + model requires one

**Step 3 — Props** (full width):
- Props categories with larger pills (`text-sm px-3 py-1.5`)
- Remove the `maxHeight: '10rem'` scroll constraint — let categories breathe
- Selected count and clear button

**Step 4 — Refinements** (full width):
- Negative prompt categories (larger pills, no scroll constraint)
- Freetext negative prompt textarea
- Brand style guide selector

**Steps 5 & 6** — Keep existing results and cells renders.

Footer shows sheet dimensions info + Back/Next/Generate buttons.

- [ ] **Step 2: Update parent import**

Same as Task 2.1 Step 3 — swap the import.

- [ ] **Step 3: Verify in browser**

Open Character Turnaround. Step through the wizard. Style grid should be full-width and much more visible.

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/TurnaroundSheetWizard.jsx
git commit -m "feat: refactor Character Turnaround into 6-step wizard with larger UI elements"
```

---

## Task Group 4: Edit Image Model Capabilities (Issue #4)

### Task 4.1: Add Model Capability Badges

**Files:**
- Modify: `src/components/modals/EditImageModal.jsx`

- [ ] **Step 1: Enhance model definitions with capability flags**

At the top of `EditImageModal.jsx` (around line 25), update the MODELS array:

```js
const MODELS = [
  { id: 'wavespeed-nano-ultra', label: 'Nano Banana Pro Ultra (4K/8K)', description: 'Multi-image blending, high resolution', multiImage: true, badges: ['Multi-Image', '4K/8K'] },
  { id: 'wavespeed-qwen', label: 'Qwen Image Edit', description: 'Multi-image blending, great detail', multiImage: true, badges: ['Multi-Image'] },
  { id: 'fal-flux', label: 'Flux 2 Dev (LoRA)', description: 'Brand Kits & custom products', multiImage: false, supportsLora: true, badges: ['LoRA'] },
  { id: 'nano-banana-2', label: 'Nano Banana 2', description: 'Fast, reliable editing', multiImage: false, badges: [] },
  { id: 'seedream', label: 'Seedream v4.5', description: 'High detail editing', multiImage: false, badges: [] },
];
```

- [ ] **Step 2: Add info banner on Step 1 (Images)**

Find the Step 1 render section (the Images step). Add this banner above the image upload area:

```jsx
<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
  <p className="text-sm text-blue-800 font-medium mb-1">Multi-image blending</p>
  <p className="text-xs text-blue-600">
    Add a base image and optional references. Models that support multi-image blending:
    <strong> Nano Banana Pro Ultra</strong> and <strong>Qwen Image Edit</strong>.
    Other models will only use your base image.
  </p>
</div>
```

- [ ] **Step 3: Add capability badges on Step 4 (Model & Output)**

Find where models are rendered in the model selection step. Update each model option to show badges:

```jsx
{MODELS.map(m => (
  <button key={m.id} onClick={() => setSelectedModel(m.id)}
    className={`p-3 rounded-xl border-2 text-left transition-all ${
      selectedModel === m.id ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300'
    }`}>
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-slate-800">{m.label}</span>
      <div className="flex gap-1">
        {m.badges?.map(badge => (
          <span key={badge} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            badge === 'Multi-Image' ? 'bg-green-100 text-green-700' :
            badge === 'LoRA' ? 'bg-purple-100 text-purple-700' :
            'bg-blue-100 text-blue-700'
          }`}>{badge}</span>
        ))}
      </div>
    </div>
    <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
  </button>
))}
```

- [ ] **Step 4: Add smart warning when multi-image + single-image model**

After the model selector, add a conditional warning:

```jsx
{images.length > 1 && selectedModel && !MODELS.find(m => m.id === selectedModel)?.multiImage && (
  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-sm text-amber-800 font-medium">Single-image model selected</p>
      <p className="text-xs text-amber-600">
        You have {images.length} images loaded, but <strong>{MODELS.find(m => m.id === selectedModel)?.label}</strong> only
        uses the base image. Switch to <strong>Nano Banana Pro Ultra</strong> or <strong>Qwen</strong> to blend all images.
      </p>
    </div>
  </div>
)}
```

- [ ] **Step 5: Verify in browser**

Open Edit Image → add 2 images → go to Step 4 → should see badges on models and warning if single-image model selected.

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/EditImageModal.jsx
git commit -m "feat: add model capability badges and smart warnings to Edit Image modal"
```

---

## Task Group 5: Shorts Factory Overhaul (Issue #6)

### Task 5.1: Add New Niche Templates

**Files:**
- Modify: `api/lib/shortsTemplates.js`

- [ ] **Step 1: Add niche type constants**

In `shortsTemplates.js`, add to `SHORTS_NICHE_TYPES`:

```js
export const SHORTS_NICHE_TYPES = {
  AI_TECH_NEWS: 'ai_tech_news',
  FINANCE_MONEY: 'finance_money',
  MOTIVATION: 'motivation_self_help',
  SCARY_HORROR: 'scary_horror',
  // New niches:
  HISTORY: 'history_did_you_know',
  TRUE_CRIME: 'true_crime',
  SCIENCE_NATURE: 'science_nature',
  RELATIONSHIPS: 'relationships_dating',
  HEALTH_FITNESS: 'health_fitness',
  GAMING_POPCULTURE: 'gaming_popculture',
  CONSPIRACY_MYSTERY: 'conspiracy_mystery',
  BUSINESS: 'business_entrepreneur',
};
```

- [ ] **Step 2: Add template for each new niche**

Add to `SHORTS_TEMPLATES` — each niche needs: `name`, `description`, `total_duration_seconds`, `scenes` (array of role/duration/hint), `music_mood`, `voice_pacing`, `default_voice`, `visual_style`, `script_system_prompt`.

Example for History:

```js
[SHORTS_NICHE_TYPES.HISTORY]: {
  name: 'History / Did You Know',
  description: 'Fascinating historical facts and untold stories',
  total_duration_seconds: 60,
  scenes: [
    { role: 'hook', duration: 3, hint: 'Mind-blowing historical fact or question that defies expectations' },
    { role: 'context', duration: 8, hint: 'Set the historical scene — time period, place, key figure' },
    { role: 'point', duration: 10, hint: 'The core story or fact — what actually happened' },
    { role: 'point', duration: 10, hint: 'The surprising detail most people don\'t know' },
    { role: 'impact', duration: 10, hint: 'How this changed the course of history or still affects us today' },
    { role: 'point', duration: 10, hint: 'The most shocking part — the twist or ironic outcome' },
    { role: 'opinion', duration: 5, hint: 'Thought-provoking question or connection to modern day' },
    { role: 'cta', duration: 4, hint: 'Follow for daily history facts, comment which fact blew your mind' },
  ],
  music_mood: 'epic orchestral ambient, historical documentary feel, building tension, no vocals',
  voice_pacing: 'Storyteller energy — measured pace with dramatic pauses at reveals. Build wonder and surprise.',
  default_voice: 'pNInz6obpgDQGcFmaJgB',
  visual_style: 'cinematic',
  script_system_prompt: `You are a history storyteller creating a viral 60-second "Did You Know" video.
Rules:
- Pick ONE specific historical event, figure, or fact — not a broad overview
- Open with the most surprising or counterintuitive aspect
- Include specific dates, names, and places — be concrete
- Connect the historical event to something modern viewers care about
- The "twist" should genuinely surprise — not the obvious Wikipedia summary
- Use vivid imagery: what did it look, sound, smell like?
- End with a question that makes viewers want to comment`,
},
```

Write similar templates for: True Crime, Science/Nature, Relationships, Health/Fitness, Gaming/Pop Culture, Conspiracy/Mystery, Business/Entrepreneur. Each follows the same structure with niche-appropriate scene roles, music mood, voice pacing, and system prompts.

- [ ] **Step 3: Commit**

```bash
git add api/lib/shortsTemplates.js
git commit -m "feat: add 8 new niche templates for Shorts Factory"
```

### Task 5.2: Update Frontend Niche Selector

**Files:**
- Modify: `src/pages/ShortsFactoryPage.jsx`

- [ ] **Step 1: Add new niches to the NICHES array**

Update the `NICHES` array (line ~36) to include all 12 niches. Use appropriate Lucide icons:

```js
import {
  // ... existing imports ...
  History, Skull, Microscope, Heart, Dumbbell, Gamepad2, Eye, Briefcase,
} from 'lucide-react';

const NICHES = [
  { key: 'ai_tech_news', label: 'AI / Tech News', icon: Zap, description: 'Breaking AI developments with authority', color: 'from-blue-500 to-cyan-500' },
  { key: 'finance_money', label: 'Finance / Money', icon: DollarSign, description: 'Actionable money strategies', color: 'from-green-500 to-emerald-500' },
  { key: 'motivation_self_help', label: 'Motivation', icon: Brain, description: 'Powerful stories with emotional arc', color: 'from-orange-500 to-amber-500' },
  { key: 'scary_horror', label: 'Scary / Horror', icon: Ghost, description: 'Atmospheric horror with shocking twist', color: 'from-purple-500 to-violet-500' },
  { key: 'history_did_you_know', label: 'History / Did You Know', icon: History, description: 'Fascinating historical facts & untold stories', color: 'from-amber-600 to-yellow-500' },
  { key: 'true_crime', label: 'True Crime', icon: Skull, description: 'Real crime case breakdowns', color: 'from-red-600 to-rose-500' },
  { key: 'science_nature', label: 'Science / Nature', icon: Microscope, description: 'Mind-blowing science facts', color: 'from-teal-500 to-green-500' },
  { key: 'relationships_dating', label: 'Relationships', icon: Heart, description: 'Psychology-based dating insights', color: 'from-pink-500 to-rose-400' },
  { key: 'health_fitness', label: 'Health / Fitness', icon: Dumbbell, description: 'Quick health tips & myths debunked', color: 'from-lime-500 to-green-500' },
  { key: 'gaming_popculture', label: 'Gaming / Pop Culture', icon: Gamepad2, description: 'Game lore & pop culture stories', color: 'from-indigo-500 to-blue-500' },
  { key: 'conspiracy_mystery', label: 'Conspiracy / Mystery', icon: Eye, description: 'Unexplained events & mysteries', color: 'from-slate-600 to-zinc-500' },
  { key: 'business_entrepreneur', label: 'Business', icon: Briefcase, description: 'Startup stories & business lessons', color: 'from-emerald-600 to-teal-500' },
];
```

- [ ] **Step 2: Update grid to handle more niches**

Change the niche grid from `grid-cols-2` to `grid-cols-3` to fit 12 niches nicely:

```jsx
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
```

- [ ] **Step 3: Add voice presets for new niches**

Update `VOICE_PRESETS` to include niche mappings for the new niches:

```js
const VOICE_PRESETS = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, authoritative male', niches: ['ai_tech_news', 'finance_money', 'history_did_you_know', 'business_entrepreneur'] },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Warm, inspiring male', niches: ['motivation_self_help', 'relationships_dating', 'health_fitness'] },
  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', description: 'Deep gravelly male', niches: ['scary_horror', 'true_crime', 'conspiracy_mystery'] },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, eerie female', niches: ['scary_horror', 'conspiracy_mystery'] },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Young energetic male', niches: ['ai_tech_news', 'motivation_self_help', 'gaming_popculture', 'science_nature'] },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Young clear female', niches: ['finance_money', 'ai_tech_news', 'health_fitness', 'relationships_dating', 'science_nature'] },
];
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/ShortsFactoryPage.jsx
git commit -m "feat: add 8 new niches to Shorts Factory UI with icons and voice mappings"
```

### Task 5.3: Add Script Preview & Edit Before Generation

**Files:**
- Modify: `src/pages/ShortsFactoryPage.jsx`
- Modify: `api/shorts/generate.js`

- [ ] **Step 1: Add a "preview script" step**

Add new state:

```js
const [scriptPreview, setScriptPreview] = useState(null);
const [editedScript, setEditedScript] = useState('');
const [showScriptPreview, setShowScriptPreview] = useState(false);
```

Add a new API call to generate script only (without starting the full pipeline):

```js
const handlePreviewScript = async () => {
  if (!niche || !brandUsername) { toast.error('Select a niche and brand'); return; }
  setLoadingTopics(true);
  try {
    const res = await apiFetch('/api/shorts/preview-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche, topic: topic || undefined, brand_username: brandUsername }),
    });
    const data = await res.json();
    if (data.script) {
      setScriptPreview(data.script);
      setEditedScript(data.script);
      setShowScriptPreview(true);
    }
  } catch (err) { toast.error(err.message); }
  finally { setLoadingTopics(false); }
};
```

- [ ] **Step 2: Create the preview-script API endpoint**

Create `api/shorts/preview-script.js`:

```js
/**
 * POST /api/shorts/preview-script
 * Generate script only — for preview before committing to full pipeline.
 */
import { createClient } from '@supabase/supabase-js';
import { getShortsTemplate } from '../lib/shortsTemplates.js';
import { generateScript } from '../lib/scriptGenerator.js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, topic, brand_username } = req.body;
  if (!brand_username || !niche) return res.status(400).json({ error: 'Missing niche or brand_username' });

  const nicheTemplate = getShortsTemplate(niche);
  if (!nicheTemplate) return res.status(400).json({ error: `Unknown niche: ${niche}` });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = await resolveUserIdFromBrand(brand_username, supabase, req.user?.id);
  if (!userId) return res.status(404).json({ error: `Brand not found: ${brand_username}` });

  const { data: userKeys } = await supabase.from('user_api_keys').select('openai_key').eq('user_id', userId).maybeSingle();
  const openaiKey = userKeys?.openai_key || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

  try {
    const script = await generateScript({
      niche, topic, nicheTemplate, keys: { openaiKey }, brandUsername: brand_username,
    });
    return res.json({ script, niche });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 3: Add script preview UI section**

In `ShortsFactoryPage.jsx`, add a collapsible section below the topic input. When `showScriptPreview` is true:

```jsx
{showScriptPreview && scriptPreview && (
  <div className="bg-white rounded-2xl p-6 border shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-slate-800">Script Preview</h2>
      <span className="text-xs text-slate-400">Edit before generating</span>
    </div>
    <textarea
      value={editedScript}
      onChange={e => setEditedScript(e.target.value)}
      rows={12}
      className="w-full border border-slate-200 rounded-lg p-3 text-sm font-mono resize-y"
    />
    <p className="text-xs text-slate-400 mt-2">
      This script will be used for voiceover and scene generation. Edit freely.
    </p>
  </div>
)}
```

Add a "Preview Script" button next to "Generate Short":

```jsx
<div className="flex gap-3">
  <Button variant="outline" onClick={handlePreviewScript} disabled={isGenerating || !niche}
    className="flex-1">
    <Sparkles className="w-4 h-4 mr-2" /> Preview Script
  </Button>
  <Button onClick={handleGenerate} disabled={isGenerating || !niche}
    className="flex-1 bg-[#2C666E] hover:bg-[#07393C] text-white">
    <Sparkles className="w-4 h-4 mr-2" /> Generate Short
  </Button>
</div>
```

- [ ] **Step 4: Pass edited script to generate endpoint**

In `handleGenerate`, add `script: editedScript || undefined` to the request body so the pipeline uses the user-edited script instead of generating a new one.

In `api/shorts/generate.js`, accept `script` in the body and skip `generateScript()` if provided:

```js
const { niche, topic, brand_username, voice_id, visual_style, caption_style, words_per_chunk, lora_config, script: userScript } = req.body;

// ... later in the pipeline:
const script = userScript || await generateScript({ ... });
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/ShortsFactoryPage.jsx api/shorts/preview-script.js api/shorts/generate.js
git commit -m "feat: add script preview and edit before Shorts generation"
```

### Task 5.4: Real Story Sourcing

**Files:**
- Create: `api/shorts/research.js`
- Modify: `src/pages/ShortsFactoryPage.jsx`

- [ ] **Step 1: Create the research endpoint**

```js
// api/shorts/research.js
/**
 * POST /api/shorts/research
 * Search for real trending stories for a niche.
 * Returns story cards the user can pick from.
 *
 * Body: { niche, count?: number, brand_username }
 * Response: { stories: [{ title, summary, source_url, source_name, published_date }] }
 */
import { createClient } from '@supabase/supabase-js';
import { resolveUserIdFromBrand } from '../lib/resolveUserIdFromBrand.js';
import { getShortsTemplate } from '../lib/shortsTemplates.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { niche, count = 8, brand_username } = req.body;
  if (!brand_username || !niche) return res.status(400).json({ error: 'Missing niche or brand_username' });

  const nicheTemplate = getShortsTemplate(niche);
  if (!nicheTemplate) return res.status(400).json({ error: `Unknown niche: ${niche}` });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = await resolveUserIdFromBrand(brand_username, supabase, req.user?.id);
  if (!userId) return res.status(404).json({ error: `Brand not found` });

  const { data: userKeys } = await supabase.from('user_api_keys').select('openai_key').eq('user_id', userId).maybeSingle();
  const openaiKey = userKeys?.openai_key || process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key required' });

  try {
    // Build search query based on niche
    const NICHE_SEARCH_QUERIES = {
      ai_tech_news: 'latest AI breakthrough news today',
      finance_money: 'trending personal finance money tips news',
      motivation_self_help: 'inspiring real life comeback stories',
      scary_horror: 'creepy true stories unexplained events',
      history_did_you_know: 'fascinating obscure history facts',
      true_crime: 'recent true crime cases solved',
      science_nature: 'amazing science discoveries this week',
      relationships_dating: 'psychology dating relationship advice trending',
      health_fitness: 'health myths debunked fitness tips',
      gaming_popculture: 'gaming news pop culture stories trending',
      conspiracy_mystery: 'unexplained mysteries unsolved cases',
      business_entrepreneur: 'startup success stories business lessons',
    };

    const searchQuery = NICHE_SEARCH_QUERIES[niche] || `trending ${nicheTemplate.name} stories`;

    // IMPORTANT: GPT-4o-mini does NOT have real-time web access.
    // For truly current stories, integrate a web search API first (Tavily, Serper, Brave Search)
    // and pass results as context. For MVP, GPT generates plausible stories from training data.
    // TODO: Replace with Tavily search → GPT summarize pipeline for real-time stories.
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a research assistant finding trending real stories for a "${nicheTemplate.name}" video channel. Find ${count} real, recent, compelling stories that would make great 60-second videos. For each story, provide factual information only — no made-up details.`,
          },
          {
            role: 'user',
            content: `Find ${count} real trending stories about: ${searchQuery}\n\nReturn JSON array: [{"title": "...", "summary": "2-3 sentence summary of the real story", "source_hint": "where this story is from (e.g. 'BBC News', 'Reddit r/science')", "story_angle": "how to turn this into a compelling 60s video"}]`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);
    const stories = content.stories || content.results || content;

    return res.json({
      stories: Array.isArray(stories) ? stories.slice(0, count) : [],
      niche,
      search_query: searchQuery,
    });
  } catch (err) {
    console.error('[shorts/research] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Add story sourcing UI to ShortsFactoryPage**

Add state:

```js
const [realStories, setRealStories] = useState([]);
const [loadingStories, setLoadingStories] = useState(false);
const [useRealStory, setUseRealStory] = useState(false);
const [selectedStory, setSelectedStory] = useState(null);
```

Add a toggle and story cards section below the Topic input:

```jsx
{/* Real Story Sourcing */}
<div className="bg-white rounded-2xl p-6 border shadow-sm">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-sm font-semibold text-slate-800">Story Source</h2>
    <div className="flex items-center gap-2">
      <button
        onClick={() => setUseRealStory(false)}
        className={`px-3 py-1 rounded-full text-xs font-medium ${!useRealStory ? 'bg-[#2C666E] text-white' : 'bg-slate-100 text-slate-600'}`}
      >Custom Topic</button>
      <button
        onClick={() => setUseRealStory(true)}
        className={`px-3 py-1 rounded-full text-xs font-medium ${useRealStory ? 'bg-[#2C666E] text-white' : 'bg-slate-100 text-slate-600'}`}
      >Find Real Stories</button>
    </div>
  </div>

  {useRealStory ? (
    <>
      <Button variant="outline" size="sm" onClick={handleFindStories} disabled={loadingStories || !niche} className="mb-3">
        {loadingStories ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Searching...</> : 'Search Trending Stories'}
      </Button>
      {realStories.length > 0 && (
        <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
          {realStories.map((story, i) => (
            <button key={i} onClick={() => { setSelectedStory(story); setTopic(story.title); }}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedStory === story ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300'
              }`}>
              <p className="text-sm font-medium text-slate-800">{story.title}</p>
              <p className="text-xs text-slate-500 mt-1">{story.summary}</p>
              {story.source_hint && <p className="text-[10px] text-slate-400 mt-1">Source: {story.source_hint}</p>}
            </button>
          ))}
        </div>
      )}
    </>
  ) : (
    /* existing topic input + suggest topics button */
  )}
</div>
```

- [ ] **Step 3: Pass story context to generation**

When generating with a real story selected, pass the story summary as context to the script generator. In `handleGenerate`:

```js
body: JSON.stringify({
  niche,
  topic: topic || undefined,
  brand_username: brandUsername,
  voice_id: voiceId || undefined,
  caption_style: captionStyle,
  lora_config: loraConfig.length > 0 ? loraConfig : undefined,
  story_context: selectedStory ? `Real story: ${selectedStory.title}. ${selectedStory.summary}. Angle: ${selectedStory.story_angle}` : undefined,
}),
```

In `api/shorts/generate.js`, pass `story_context` to the script generator:

```js
const { niche, topic, brand_username, ..., story_context } = req.body;
// ... later:
const script = userScript || await generateScript({
  niche, topic, nicheTemplate, keys: { openaiKey }, brandUsername: brand_username,
  storyContext: story_context, // Add this parameter
});
```

In `api/lib/scriptGenerator.js`, inject the story context into the system prompt when provided.

- [ ] **Step 4: Commit**

```bash
git add api/shorts/research.js src/pages/ShortsFactoryPage.jsx api/shorts/generate.js api/lib/scriptGenerator.js
git commit -m "feat: add real story sourcing to Shorts Factory with search and selection UI"
```

---

## Task Group 6: Campaigns Export (Issue #7)

### Task 6.1: Campaign Export Endpoint

**Files:**
- Create: `api/campaigns/export.js`

- [ ] **Step 1: Create export endpoint**

```js
// api/campaigns/export.js
/**
 * GET /api/campaigns/export?draft_id=xxx
 * Returns a JSON manifest with download links for all assets, organized by platform.
 * Frontend uses this to trigger downloads.
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { draft_id } = req.query;
  if (!draft_id) return res.status(400).json({ error: 'draft_id required' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!req.user?.id) return res.status(401).json({ error: 'Authentication required' });

  const { data: draft, error } = await supabase
    .from('ad_drafts')
    .select('*')
    .eq('id', draft_id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !draft) return res.status(404).json({ error: 'Draft not found' });

  const assets = draft.assets_json || [];
  const storyboard = draft.storyboard_json || {};

  // Organize assets by platform with download-friendly metadata
  const exportBundle = {
    draft_id: draft.id,
    campaign_name: storyboard.campaign_name || draft.template_name || 'Campaign',
    created_at: draft.created_at,
    platforms: (draft.platforms || []).map(platform => {
      const platformAssets = assets.find(a => a.platforms?.includes(platform));
      if (!platformAssets) return { platform, assets: [] };

      return {
        platform,
        ratio: platformAssets.ratio,
        scenes: (platformAssets.scenes || []).map((scene, i) => ({
          index: i,
          role: scene.scene?.role || `scene_${i + 1}`,
          headline: scene.scene?.headline || '',
          videoUrl: scene.videoUrl || null,
          imageUrl: scene.imageUrl || null,
        })),
      };
    }),
    subtitles_available: true,
    subtitle_url: `/api/campaigns/download-subtitles?draft_id=${draft_id}`,
  };

  return res.json({ success: true, export: exportBundle });
}
```

- [ ] **Step 2: Commit**

```bash
git add api/campaigns/export.js
git commit -m "feat: add campaign export endpoint for downloading asset bundles"
```

### Task 6.2: Add Export Button to Campaigns Page

**Files:**
- Modify: `src/pages/CampaignsPage.jsx`

- [ ] **Step 1: Add export handler and button to DraftCard**

In the `DraftCard` component (around line 218), add state and handler:

```js
const [isExporting, setIsExporting] = useState(false);

const handleExport = async () => {
  setIsExporting(true);
  try {
    const res = await apiFetch(`/api/campaigns/export?draft_id=${draft.id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const bundle = data.export;

    // Download each asset
    for (const platform of bundle.platforms) {
      for (const scene of platform.scenes) {
        const url = scene.videoUrl || scene.imageUrl;
        if (url) {
          const ext = scene.videoUrl ? 'mp4' : 'jpg';
          const link = document.createElement('a');
          link.href = url;
          link.download = `${bundle.campaign_name}-${platform.platform}-${scene.role}-${scene.index + 1}.${ext}`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          // Small delay between downloads to avoid browser blocking
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    toast.success(`Exported ${bundle.platforms.length} platform(s) of assets`);
  } catch (err) {
    toast.error(err.message || 'Export failed');
  } finally {
    setIsExporting(false);
  }
};
```

Add the export button next to the existing Publish/Schedule buttons in the DraftCard action bar:

```jsx
<Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting || !isReady}>
  {isExporting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />}
  Export All
</Button>
```

- [ ] **Step 2: Verify in browser**

Open Campaigns, expand a ready draft, click Export All — assets should download.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CampaignsPage.jsx api/campaigns/export.js
git commit -m "feat: add Export All button to download campaign assets per platform"
```

---

## Task Group 7: Update Parent Imports

### Task 7.1: Wire Up New Wizard Components

**Files:**
- Modify: File that imports `StoryboardPlannerModal` and `TurnaroundSheetModal`

- [ ] **Step 1: Find and update imports**

```bash
grep -r "StoryboardPlannerModal" src/ --include="*.jsx" -l
grep -r "TurnaroundSheetModal" src/ --include="*.jsx" -l
```

Update each import to point to the new wizard files:

```js
// Storyboard:
import StoryboardPlannerModal from '@/components/modals/StoryboardPlannerWizard';

// Turnaround:
import TurnaroundSheetModal from '@/components/modals/TurnaroundSheetWizard';
```

- [ ] **Step 2: Full smoke test**

Open each feature in the browser and verify:
1. Library: larger icons, thumbnails load, video cards show poster frames
2. Storyboard: 7-step wizard, each step readable
3. Turnaround: 6-step wizard, style grid full-width
4. Edit Image: model badges visible, warning when multi-image + single-image model
5. Video Studio: thumbnails showing
6. Shorts Factory: 12 niches, script preview, real story search
7. Campaigns: Export All button downloads assets

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: wire up all wizard components and complete UX overhaul"
```

---

## Execution Order

Tasks can be run in parallel by group since they're independent:

```
Group A (WizardStepper)  ←── must be first (dependency for Groups 2 & 3)
  ↓
Groups 1-6 can run in parallel:
  Group 1: Library Thumbnails (1.1 → 1.2 → 1.3 → 1.4 → 1.5)
  Group 2: Storyboard Wizard (2.1)
  Group 3: Turnaround Wizard (3.1)
  Group 4: Edit Image Badges (4.1)
  Group 5: Shorts Factory (5.1 → 5.2 → 5.3 → 5.4)
  Group 6: Campaigns Export (6.1 → 6.2)
  ↓
Group 7: Wire Up & Smoke Test (7.1)
```
