# Library Auto-Metadata & Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-tag library items with generation metadata (model, styles, storyboard/short name) and add dropdown filters to the Library modal for fast searching.

**Architecture:** New metadata columns on both library tables, a shared `saveToLibrary()` function that accepts metadata directly, a `media_metadata` audit table as fallback, and dropdown filter UI. Shorts pipeline gets auto-save to library.

**Tech Stack:** Express, Supabase (Postgres), React, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-26-library-auto-metadata-design.md`

---

### Task 1: Database Migration

**Files:**
- Create: `supabase-migration-library-metadata.sql`

- [ ] **Step 1: Create migration file**

```sql
-- media_metadata audit/fallback table
CREATE TABLE IF NOT EXISTS media_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  video_style text,
  visual_style text,
  model_name text,
  storyboard_name text,
  short_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, source_url)
);

ALTER TABLE media_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own metadata" ON media_metadata
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add metadata columns to image_library_items
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS video_style text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS visual_style text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS model_name text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS storyboard_name text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS short_name text;

-- Add metadata columns to generated_videos
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS video_style text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS visual_style text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS model_name text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS storyboard_name text;
ALTER TABLE generated_videos ADD COLUMN IF NOT EXISTS short_name text;

-- Partial indexes for fast DISTINCT queries in filters endpoint
CREATE INDEX IF NOT EXISTS idx_ili_video_style ON image_library_items(video_style) WHERE video_style IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ili_visual_style ON image_library_items(visual_style) WHERE visual_style IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ili_model_name ON image_library_items(model_name) WHERE model_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ili_storyboard_name ON image_library_items(storyboard_name) WHERE storyboard_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ili_short_name ON image_library_items(short_name) WHERE short_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gv_video_style ON generated_videos(video_style) WHERE video_style IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gv_visual_style ON generated_videos(visual_style) WHERE visual_style IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gv_model_name ON generated_videos(model_name) WHERE model_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gv_storyboard_name ON generated_videos(storyboard_name) WHERE storyboard_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gv_short_name ON generated_videos(short_name) WHERE short_name IS NOT NULL;
```

- [ ] **Step 2: Run migration against Supabase**

Use the Supabase MCP tool `execute_sql` to run the migration SQL. Verify each statement succeeds.

- [ ] **Step 3: Verify tables and columns exist**

Run via `execute_sql`:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'image_library_items' AND column_name IN ('video_style','visual_style','model_name','storyboard_name','short_name');
```
Expected: 5 rows returned.

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'generated_videos' AND column_name IN ('video_style','visual_style','model_name','storyboard_name','short_name');
```
Expected: 5 rows returned.

```sql
SELECT table_name FROM information_schema.tables WHERE table_name = 'media_metadata';
```
Expected: 1 row returned.

- [ ] **Step 4: Commit**

```bash
git add supabase-migration-library-metadata.sql
git commit -m "feat: add library metadata migration (media_metadata table + 5 columns on library tables)"
```

---

### Task 2: Shared `saveToLibrary()` Function

Extract the core save logic from `api/library/save.js` into a reusable function.

**Files:**
- Create: `api/lib/librarySave.js`
- Modify: `api/library/save.js`

- [ ] **Step 1: Create `api/lib/librarySave.js`**

This function encapsulates **all** the logic currently in `api/library/save.js`: URL handling (data URLs, external URLs), duplicate detection, Supabase storage upload, database insert, and thumbnail generation. It adds support for the 5 metadata fields.

```js
import { generateAndUploadImageThumbnail } from './thumbnailHelper.js';

/**
 * Get file extension from MIME type (moved from api/library/save.js)
 */
function getExtensionFromMime(mimeType, type) {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mov')) return 'mov';
  return type === 'video' ? 'mp4' : 'png';
}

/**
 * Library Save — shared function for saving media to the library.
 * Called by the Express route handler AND directly by backend pipelines (Shorts).
 *
 * @param {object} supabase - Service-role Supabase client
 * @param {string} userId - auth.users UUID
 * @param {string} userEmail - for user_name extraction
 * @param {object} opts
 * @param {string} opts.url - Media URL (http, data:, etc.)
 * @param {string} [opts.type='image'] - 'image' or 'video'
 * @param {string} [opts.title]
 * @param {string} [opts.prompt]
 * @param {string} [opts.source] - ignored for DB insert (CHECK constraint forces 'ai_generated')
 * @param {string} [opts.video_style]
 * @param {string} [opts.visual_style]
 * @param {string} [opts.model_name]
 * @param {string} [opts.storyboard_name]
 * @param {string} [opts.short_name]
 * @returns {Promise<{saved:boolean, id?:string, url?:string, type:string, duplicate?:boolean, uploadedToStorage?:boolean}>}
 */
export async function saveToLibrary(supabase, userId, userEmail, opts)
```

**How to build this function — step by step:**

1. Copy the ENTIRE handler body from `api/library/save.js` (lines 15-272) into this function
2. Move the `getExtensionFromMime` helper (lines 278-288) into this file
3. Move the `import { generateAndUploadImageThumbnail }` to this file
4. Replace all `req.user?.id` → `userId`, `req.user?.email` → `userEmail`
5. Replace the `req.body` destructure with `opts` destructure, adding the 5 new fields
6. Replace all `return res.status(200).json(...)` → `return { ... }` (return objects, not Express responses)
7. The `source` field passed by callers (e.g. `'shorts'`, `'storyboard'`) is used ONLY for the file path prefix in storage. The `source` column in `image_library_items` is always hardcoded to `'ai_generated'` (CHECK constraint only allows `'ai_generated'` or `'amazon_import'`). Do NOT put `opts.source` into `insertData.source`.
8. Before the database insert, do the metadata fallback lookup and add metadata to insertData (see below)

**Metadata fallback lookup** (add before the `insertData` construction):
```js
// Fallback: look up media_metadata for fields not passed directly
const originalUrl = opts.url; // save before potential re-upload
if (!opts.video_style && !opts.visual_style && !opts.model_name && !opts.storyboard_name && !opts.short_name) {
  try {
    const { data: meta } = await supabase
      .from('media_metadata')
      .select('video_style, visual_style, model_name, storyboard_name, short_name')
      .eq('user_id', userId)
      .eq('source_url', originalUrl)
      .maybeSingle();
    if (meta) {
      opts.video_style = opts.video_style || meta.video_style;
      opts.visual_style = opts.visual_style || meta.visual_style;
      opts.model_name = opts.model_name || meta.model_name;
      opts.storyboard_name = opts.storyboard_name || meta.storyboard_name;
      opts.short_name = opts.short_name || meta.short_name;
    }
  } catch (err) {
    console.warn('[librarySave] metadata fallback lookup failed:', err.message);
  }
}
```

**Add metadata to insertData** (after existing insertData construction):
```js
if (opts.video_style) insertData.video_style = opts.video_style;
if (opts.visual_style) insertData.visual_style = opts.visual_style;
if (opts.model_name) insertData.model_name = opts.model_name;
if (opts.storyboard_name) insertData.storyboard_name = opts.storyboard_name;
if (opts.short_name) insertData.short_name = opts.short_name;
```

Return an object (not `res.json()`).

- [ ] **Step 2: Refactor `api/library/save.js` to use shared function**

Replace the handler body with a thin wrapper:
```js
import { saveToLibrary } from '../lib/librarySave.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(200).json({ success: true, message: 'Supabase not configured', saved: false });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const result = await saveToLibrary(supabase, req.user?.id, req.user?.email, req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('[Library Save] Error:', error);
    return res.status(200).json({ success: true, message: 'Error saving to library', saved: false, error: error.message });
  }
}
```

- [ ] **Step 3: Verify the refactored endpoint works**

Start the dev server (`npm run start`). Use preview tools or curl to test saving an image URL to the library and confirm the response is identical to the old behavior.

- [ ] **Step 4: Commit**

```bash
git add api/lib/librarySave.js api/library/save.js
git commit -m "refactor: extract saveToLibrary() shared function from library/save.js"
```

---

### Task 3: Media Metadata Helper

**Files:**
- Create: `api/lib/mediaMetadata.js`

- [ ] **Step 1: Create `api/lib/mediaMetadata.js`**

```js
/**
 * Media Metadata — audit/fallback table for generation provenance.
 * Written at generation time; looked up by saveToLibrary() as fallback
 * when metadata fields aren't passed directly.
 */

/**
 * Write metadata at generation time. Upserts on (user_id, source_url).
 * Fire-and-forget — errors are logged but don't throw.
 *
 * @param {object} supabase
 * @param {string} userId
 * @param {string} sourceUrl - The URL of the generated media
 * @param {object} metadata - { video_style?, visual_style?, model_name?, storyboard_name?, short_name? }
 */
export async function writeMediaMetadata(supabase, userId, sourceUrl, metadata) {
  if (!supabase || !userId || !sourceUrl) return;
  try {
    const row = {
      user_id: userId,
      source_url: sourceUrl,
      ...Object.fromEntries(
        Object.entries(metadata).filter(([_, v]) => v != null)
      ),
    };
    await supabase
      .from('media_metadata')
      .upsert(row, { onConflict: 'user_id,source_url' });
  } catch (err) {
    console.warn('[mediaMetadata] write failed:', err.message);
  }
}

/**
 * Look up metadata by source URL. Returns metadata object or null.
 */
export async function lookupMediaMetadata(supabase, userId, sourceUrl) {
  if (!supabase || !userId || !sourceUrl) return null;
  try {
    const { data } = await supabase
      .from('media_metadata')
      .select('video_style, visual_style, model_name, storyboard_name, short_name')
      .eq('user_id', userId)
      .eq('source_url', sourceUrl)
      .maybeSingle();
    return data || null;
  } catch (err) {
    console.warn('[mediaMetadata] lookup failed:', err.message);
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/lib/mediaMetadata.js
git commit -m "feat: add mediaMetadata helper (audit/fallback table for generation provenance)"
```

---

### Task 4: Filters Endpoint

**Files:**
- Create: `api/library/filters.js`
- Modify: `server.js` (add route registration)

- [ ] **Step 1: Create `api/library/filters.js`**

```js
/**
 * Library Filters — returns distinct metadata values for dropdown population.
 * GET /api/library/filters
 * Uses raw SQL with DISTINCT to leverage partial indexes (not client .select() which fetches all rows).
 */
import { createClient } from '@supabase/supabase-js';

const METADATA_COLUMNS = ['video_style', 'visual_style', 'model_name', 'storyboard_name', 'short_name'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = req.user?.id;
  if (!userId) return res.json({});

  try {
    const filters = {};

    for (const col of METADATA_COLUMNS) {
      // Use raw SQL DISTINCT to leverage partial indexes
      const { data } = await supabase.rpc('get_distinct_metadata', { col_name: col, p_user_id: userId });
      // Fallback: if RPC not available, query both tables with client
      if (data) {
        filters[col] = data.map(r => r.val).filter(Boolean).sort();
      } else {
        const [{ data: imgVals }, { data: vidVals }] = await Promise.all([
          supabase.from('image_library_items').select(col).eq('user_id', userId).not(col, 'is', null),
          supabase.from('generated_videos').select(col).eq('user_id', userId).not(col, 'is', null),
        ]);
        const allVals = new Set([
          ...(imgVals || []).map(r => r[col]),
          ...(vidVals || []).map(r => r[col]),
        ]);
        filters[col] = [...allVals].sort();
      }
    }

    return res.json(filters);
  } catch (err) {
    console.error('[Library Filters] Error:', err);
    return res.json({});
  }
}
```

**Note:** The RPC function `get_distinct_metadata` is optional. If creating it, add to the migration:
```sql
CREATE OR REPLACE FUNCTION get_distinct_metadata(col_name text, p_user_id uuid)
RETURNS TABLE(val text) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT DISTINCT %I AS val FROM image_library_items WHERE user_id = $1 AND %I IS NOT NULL
     UNION
     SELECT DISTINCT %I AS val FROM generated_videos WHERE user_id = $1 AND %I IS NOT NULL',
    col_name, col_name, col_name, col_name
  ) USING p_user_id;
END;
$$;
```
If you skip the RPC, the fallback (client `.select()`) still works — it's just less efficient at scale.

- [ ] **Step 2: Register route in `server.js`**

Add BEFORE the `/api/library/save` route (around line 269 in server.js), following the `loadApiRoute` pattern:

```js
app.get('/api/library/filters', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('library/filters.js');
  return handler(req, res);
});
```

- [ ] **Step 3: Verify endpoint**

Start the dev server. Hit `GET /api/library/filters` with a valid auth token. Expected: JSON with 5 keys, all empty arrays initially (no metadata populated yet).

- [ ] **Step 4: Commit**

```bash
git add api/library/filters.js server.js
git commit -m "feat: add GET /api/library/filters endpoint for metadata dropdown values"
```

---

### Task 5: Imagineer Metadata Writes

**Files:**
- Modify: `api/imagineer/generate.js`
- Modify: `api/imagineer/edit.js`

**Important:** `api/imagineer/generate.js` uses `req.body` (NOT formidable/multipart). Variables are plain strings: `model` (default `'nano-banana-2'`), `style` (style key string). Neither file has a Supabase client — you must create one.

- [ ] **Step 1: Add metadata write after image generation**

At the top of `api/imagineer/generate.js`, add:
```js
import { writeMediaMetadata } from '../lib/mediaMetadata.js';
import { createClient } from '@supabase/supabase-js';
```

The key variables (from `req.body` destructure at ~line 114):
- `model` — plain string (e.g., `'nano-banana-2'`, `'seedream'`, `'fal_flux'`)
- `style` — plain string style key from the `STYLE_PROMPTS` map

For sync results (where `data.images[0].url` gives `imageUrl`):
```js
if (imageUrl) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  writeMediaMetadata(sb, req.user?.id, imageUrl, {
    model_name: model || 'unknown',
    visual_style: style || null,
  });
}
```

For async results (where only `requestId`/`statusUrl` is returned), the metadata write happens in the result poller (`api/imagineer/result.js`) when the final URL is known. Add the same import and Supabase client creation there, writing metadata when `imageUrl` is extracted from the poll response.

- [ ] **Step 2: Add metadata write to `api/imagineer/edit.js`**

Same pattern — import `writeMediaMetadata` and `createClient`, create Supabase client, write after the result URL is determined, passing `model_name` and `visual_style`.

- [ ] **Step 3: Commit**

```bash
git add api/imagineer/generate.js api/imagineer/edit.js
git commit -m "feat: write media metadata from Imagineer generation endpoints"
```

---

### Task 6: JumpStart Metadata Writes

**Files:**
- Modify: `api/jumpstart/generate.js`

- [ ] **Step 1: Add metadata write after video generation**

Import at top:
```js
import { writeMediaMetadata } from '../lib/mediaMetadata.js';
import { createClient } from '@supabase/supabase-js';
```

**Note:** `api/jumpstart/generate.js` uses formidable for multipart parsing. The model variable is `fields.model?.[0]` (array element, not plain string like Imagineer). This file also does not have a Supabase client in scope — create one.

After each handler returns a sync result with `videoUrl`:
```js
if (videoUrl) {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  writeMediaMetadata(sb, req.user?.id, videoUrl, {
    model_name: model || 'unknown',
  });
}
```

The `model` variable (from `fields.model?.[0]`) is already available at the top of the handler. Write metadata after the response is built but before returning.

For async results, the metadata can be written in `api/jumpstart/result.js` when polling completes and the final `videoUrl` is known.

- [ ] **Step 2: Commit**

```bash
git add api/jumpstart/generate.js
git commit -m "feat: write media metadata from JumpStart generation endpoint"
```

---

### Task 7: Storyboard Library Saves with Metadata

**Files:**
- Modify: `src/components/modals/StoryboardPlannerWizard.jsx`

- [ ] **Step 1: Update all 4 library save calls to include metadata**

The Storyboard wizard has 4 `apiFetch('/api/library/save', ...)` calls. Update each to include metadata fields in the JSON body.

**Start frame saves (lines ~562 and ~583):**
```js
body: JSON.stringify({
  url: imageUrl,
  type: 'image',
  title: '[Storyboard] Start Frame',
  source: 'storyboard',
  visual_style: style || null,
  model_name: /* the imagineer model used */ null,
  storyboard_name: storyboardName || null,
}),
```

Note: The start frame is generated via Imagineer, so `model_name` comes from the Imagineer model selection. Check what variable holds it at the call site.

**Per-scene video save (line ~945, single scene generation):**
```js
body: JSON.stringify({
  url: videoUrl,
  type: 'video',
  title: `[Storyboard] Scene ${scene.sceneNumber} - ${storyboardTitle || storyboardName}`,
  source: 'storyboard',
  video_style: videoStyle || null,
  visual_style: style || null,
  model_name: selectedModelInfo?.label || globalModel || null,
  storyboard_name: storyboardName || null,
}),
```

**Batch scene video save (line ~1051, generateAllRemaining):**
Same pattern as above but using the loop variables.

- [ ] **Step 2: Verify save calls pass metadata**

Start the dev server. Open the Storyboard wizard, generate a scene, check the browser network tab for the `/api/library/save` request body — it should include the metadata fields.

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/StoryboardPlannerWizard.jsx
git commit -m "feat: pass metadata in Storyboard library save calls"
```

---

### Task 8: Shorts Pipeline Auto-Save to Library

**Files:**
- Modify: `api/lib/shortsPipeline.js`

- [ ] **Step 1: Import saveToLibrary and writeMediaMetadata**

At the top of `shortsPipeline.js`:
```js
import { saveToLibrary } from './librarySave.js';
import { writeMediaMetadata } from './mediaMetadata.js';
```

- [ ] **Step 2: Create a helper for fire-and-forget library saves**

Inside `runShortsPipeline()` or at module level:
```js
/** Fire-and-forget library save — never blocks the pipeline */
function autoSave(supabase, userId, userEmail, opts) {
  saveToLibrary(supabase, userId, userEmail, opts).catch(err =>
    console.warn(`[shortsPipeline] autoSave failed for ${opts.title}:`, err.message)
  );
}
```

- [ ] **Step 3: Add `userEmail` to the pipeline's destructure**

The pipeline already destructures `userId` from opts at ~line 141 of `shortsPipeline.js`. Add `userEmail` to the same destructure block:
```js
  userEmail,  // add alongside userId at ~line 141
```

- [ ] **Step 4: Add auto-save after scene image generation**

After `imageUrl` is set for each scene (inside the scene loop, after `generateImageV2` returns):
```js
autoSave(supabase, userId, userEmail, {
  url: imageUrl,
  type: 'image',
  title: `[Short] ${topic} - Scene ${i + 1} Image`,
  source: 'shorts',
  visual_style: visualStyle || null,
  model_name: image_model || 'fal_nano_banana',
  short_name: topic || null,
});
```

**Note on `source` field:** The `source` field here is used only for the storage file path prefix. The `saveToLibrary()` function always sets `insertData.source = 'ai_generated'` for `image_library_items` (CHECK constraint). The `source` value from the caller does NOT go into the database column.

- [ ] **Step 5: Add auto-save after scene video generation**

After `clipUrl` is set for each scene:
```js
autoSave(supabase, userId, userEmail, {
  url: clipUrl,
  type: 'video',
  title: `[Short] ${topic} - Scene ${i + 1} Video`,
  source: 'shorts',
  video_style: framework?.name || frameworkId || null,
  visual_style: visualStyle || null,
  model_name: videoModel || null,
  short_name: topic || null,
});
```

- [ ] **Step 6: Add auto-save after voiceover generation**

After each scene's voiceover URL is set:
```js
autoSave(supabase, userId, userEmail, {
  url: voiceoverUrl,
  type: 'video',
  title: `[Short] ${topic} - Voiceover ${i + 1}`,
  source: 'shorts',
  model_name: gemini_voice ? 'Gemini TTS' : 'ElevenLabs',
  short_name: topic || null,
});
```

**Note:** Voiceover is audio but `saveToLibrary()` only handles `image` and `video` types. Passing `type: 'video'` saves to `generated_videos` — this is acceptable since it still shows in the library's Videos tab and gets metadata. The library already handles mixed media types in the Videos tab.

- [ ] **Step 7: Add auto-save after music generation**

After `musicUrl` is set:
```js
autoSave(supabase, userId, userEmail, {
  url: musicUrl,
  type: 'video',
  title: `[Short] ${topic} - Music`,
  source: 'shorts',
  model_name: 'Lyria 2',
  short_name: topic || null,
});
```

- [ ] **Step 8: Add auto-save after final assembly and captioning**

After `assembledVideoUrl`:
```js
autoSave(supabase, userId, userEmail, {
  url: assembledVideoUrl,
  type: 'video',
  title: `[Short] ${topic} - Final`,
  source: 'shorts',
  video_style: framework?.name || frameworkId || null,
  visual_style: visualStyle || null,
  model_name: videoModel || null,
  short_name: topic || null,
});
```

After `captionedVideoUrl`:
```js
autoSave(supabase, userId, userEmail, {
  url: captionedVideoUrl,
  type: 'video',
  title: `[Short] ${topic} - Final (Captioned)`,
  source: 'shorts',
  video_style: framework?.name || frameworkId || null,
  visual_style: visualStyle || null,
  model_name: videoModel || null,
  short_name: topic || null,
});
```

- [ ] **Step 9: Pass userEmail from campaigns/create.js**

In `api/campaigns/create.js`, add `userEmail: req.user?.email` to the opts passed to `runShortsPipeline()`.

- [ ] **Step 10: Commit**

```bash
git add api/lib/shortsPipeline.js api/campaigns/create.js
git commit -m "feat: auto-save all Shorts pipeline assets to library with metadata"
```

---

### Task 9: Library Modal — Dropdown Filters

**Files:**
- Modify: `src/components/modals/LibraryModal.jsx`

- [ ] **Step 1: Add filter state and fetch**

Inside the `LibraryModal` component, after the existing tag state (~line 508):

```jsx
// Metadata filters
const [filterOptions, setFilterOptions] = useState({
  video_style: [], visual_style: [], model_name: [], storyboard_name: [], short_name: []
});
const [activeFilters, setActiveFilters] = useState({
  video_style: '', visual_style: '', model_name: '', storyboard_name: '', short_name: ''
});

const fetchFilterOptions = async () => {
  try {
    const res = await apiFetch('/api/library/filters');
    if (!res.ok) return; // Silently skip if filters API unavailable
    const data = await res.json();
    if (data) setFilterOptions(data);
  } catch {}
};

// Fetch filter options when modal opens (alongside tags)
useEffect(() => {
  if (!open) return;
  fetchFilterOptions();
}, [open]);
```

- [ ] **Step 2: Update loadLibrary() to include metadata columns and apply filters**

In the `loadLibrary` function, update the `select()` calls to include the 5 new columns:

For images (~line 596):
```js
.select('id, url, thumbnail_url, title, prompt, created_at, alt_text, video_style, visual_style, model_name, storyboard_name, short_name')
```

For videos (~line 611):
```js
.select('id, url, thumbnail_url, title, prompt, created_at, video_style, visual_style, model_name, storyboard_name, short_name')
```

After each `.select()` call, chain `.eq()` for any active filters:
```js
let imgQuery = supabase
  .from('image_library_items')
  .select('id, url, thumbnail_url, title, prompt, created_at, alt_text, video_style, visual_style, model_name, storyboard_name, short_name')
  .order('created_at', { ascending: false });

// Apply metadata filters
Object.entries(activeFilters).forEach(([key, val]) => {
  if (val) imgQuery = imgQuery.eq(key, val);
});

imgQuery = imgQuery.range(currentOffsets.images, currentOffsets.images + PAGE_SIZE - 1);
const { data: images } = await imgQuery;
```

Same pattern for the videos query.

Add `activeFilters` to the dependency that triggers a reload — when a filter changes, reset and reload:
```js
useEffect(() => {
  if (!open) return;
  setItems([]);
  setOffsets({ images: 0, videos: 0, audio: 0 });
  setHasMore({ images: true, videos: true, audio: true });
  loadLibrary(true);
}, [activeFilters]);
```

- [ ] **Step 3: Add filter dropdown UI**

Below the search bar (inside the `<div className="flex-shrink-0 px-5 py-3 border-b space-y-3">` block), after the search row and before the tag filter bar:

```jsx
{/* Metadata filter dropdowns */}
<div className="flex gap-2 flex-wrap">
  {[
    { key: 'video_style', label: 'Video Style' },
    { key: 'visual_style', label: 'Visual Style' },
    { key: 'model_name', label: 'Model' },
    { key: 'storyboard_name', label: 'Storyboard' },
    { key: 'short_name', label: 'Short' },
  ].map(({ key, label }) => {
    const options = filterOptions[key] || [];
    if (options.length === 0) return null;
    return (
      <select
        key={key}
        value={activeFilters[key]}
        onChange={(e) => setActiveFilters(prev => ({ ...prev, [key]: e.target.value }))}
        className="text-xs bg-zinc-100 border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#2C666E]"
      >
        <option value="">{label}</option>
        {options.map(val => (
          <option key={val} value={val}>{val}</option>
        ))}
      </select>
    );
  })}
  {Object.values(activeFilters).some(v => v) && (
    <button
      onClick={() => setActiveFilters({ video_style: '', visual_style: '', model_name: '', storyboard_name: '', short_name: '' })}
      className="text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1 px-2 py-1.5"
    >
      <X className="w-3 h-3" /> Clear filters
    </button>
  )}
</div>
```

Only dropdowns that have at least one option are rendered (the `if (options.length === 0) return null` check).

- [ ] **Step 4: Verify filters work**

Start the dev server. Open the Library modal. The dropdowns should appear (empty initially). After generating content with metadata (Task 7 or 8), the dropdowns should populate and filtering should narrow the results.

- [ ] **Step 5: Commit**

```bash
git add src/components/modals/LibraryModal.jsx
git commit -m "feat: add metadata dropdown filters to Library modal"
```

---

### Task 10: End-to-End Verification

- [ ] **Step 1: Test Storyboard → Library flow**

1. Open Storyboard wizard, create a short storyboard with a name
2. Generate at least one scene
3. Open Library modal
4. Verify the scene video appears with metadata (check via browser dev tools → Supabase query)
5. Verify the "Storyboard" dropdown shows the storyboard name
6. Select it — only that storyboard's items should show

- [ ] **Step 2: Test Shorts → Library flow**

1. Go to Campaigns → New Short
2. Generate a short (any niche/topic)
3. Open Library modal
4. Verify scene images, scene videos, and final video all appear
5. Verify the "Short" dropdown shows the topic name
6. Verify "Model" dropdown shows the models used

- [ ] **Step 3: Test Imagineer → Library flow**

1. Open Imagineer, generate an image with a style preset
2. Save to library
3. Open Library modal
4. Verify the image has metadata (visual_style, model_name)

- [ ] **Step 4: Test filter combinations**

1. Apply two filters simultaneously (e.g., Model + Visual Style)
2. Verify AND logic works — only matching items shown
3. Clear filters — all items return

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during e2e verification"
```
