# Library Auto-Metadata & Filters

## Problem

When media is saved to the library, no generation context is stored — no model name, style presets, storyboard/short names. Users can't filter by "all videos made with Kling" or "all images from the Product Demo storyboard". Additionally, the Shorts pipeline doesn't save to the library at all.

## Solution

1. Five new metadata columns on both library tables
2. A shared `saveToLibrary()` function that accepts metadata directly
3. A `media_metadata` audit table as fallback for indirect saves
4. Dropdown filters in the Library modal for each metadata dimension
5. Shorts pipeline auto-saves all generated assets to the library

## Database

### New table: `media_metadata` (audit/fallback)

Used as a fallback when the save caller doesn't pass metadata directly (e.g., manual saves from UI). Not the primary data path — metadata is passed directly in the save call whenever possible.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Default `gen_random_uuid()` |
| `user_id` | uuid | FK to auth.users |
| `source_url` | text NOT NULL | Generation URL (lookup key) |
| `video_style` | text | Framework name (Shorts) or video style preset name (Storyboard) |
| `visual_style` | text | Visual style preset name |
| `model_name` | text | Generator model display name |
| `storyboard_name` | text | Storyboard name, if applicable |
| `short_name` | text | Campaign topic/name, if applicable |
| `created_at` | timestamptz | Default `now()` |

- Unique constraint on `(user_id, source_url)` for upsert
- RLS: users can only read/write their own rows (with `WITH CHECK`)

### Alter `image_library_items`

Add 5 nullable columns: `video_style text`, `visual_style text`, `model_name text`, `storyboard_name text`, `short_name text`.

### Alter `generated_videos`

Same 5 nullable columns.

### Indexes

Partial indexes on each metadata column (both tables) for fast `SELECT DISTINCT` in the filters endpoint:

```sql
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

## Backend Changes

### `api/lib/librarySave.js` (new)

Shared function extracted from `api/library/save.js`. Callable directly from backend code (Shorts pipeline) without going through HTTP or needing Express `req.user`.

```js
/**
 * Save media to the library with optional metadata.
 * @param {object} supabase - Service-role Supabase client
 * @param {string} userId - User ID
 * @param {string} userEmail - User email (for user_name extraction)
 * @param {object} opts
 * @param {string} opts.url - Media URL
 * @param {string} opts.type - 'image' or 'video'
 * @param {string} [opts.title]
 * @param {string} [opts.prompt]
 * @param {string} [opts.source]
 * @param {string} [opts.video_style]
 * @param {string} [opts.visual_style]
 * @param {string} [opts.model_name]
 * @param {string} [opts.storyboard_name]
 * @param {string} [opts.short_name]
 * @returns {Promise<{saved, id, url, duplicate?}>}
 */
export async function saveToLibrary(supabase, userId, userEmail, opts)
```

Merge priority: explicit fields in `opts` > `media_metadata` lookup (by original URL) > null.

### `api/library/save.js` (refactored)

Becomes a thin Express wrapper that calls `saveToLibrary()`. Accepts the 5 metadata fields in the request body as optional fields. No new endpoint needed.

### `api/lib/mediaMetadata.js` (new)

Helper for the audit/fallback table:

```js
export async function writeMediaMetadata(supabase, userId, sourceUrl, metadata)
export async function lookupMediaMetadata(supabase, userId, sourceUrl)
```

Called by `saveToLibrary()` as a fallback when no metadata fields are passed directly.

### `api/library/filters.js` (new)

`GET /api/library/filters` — returns distinct non-null values for each metadata column across both `image_library_items` and `generated_videos`. Response:

```json
{
  "video_style": ["Cinematic", "Top X Countdown"],
  "visual_style": ["Cinematic Photo", "Watercolor"],
  "model_name": ["Kling 2.0 Master", "Nano Banana 2"],
  "storyboard_name": ["Product Demo Reel"],
  "short_name": ["AI News Roundup"]
}
```

Register in `server.js` as `GET /api/library/filters`.

## Callers — Metadata Writers

### Shorts Pipeline (`api/lib/shortsPipeline.js`)

Calls `saveToLibrary()` directly (not HTTP) after each generation step, passing metadata fields inline. Also calls `writeMediaMetadata()` to populate the audit table.

| Step | Type | Metadata passed | Title pattern |
|------|------|-----------------|---------------|
| Scene image | image | `visual_style`, `model_name`, `short_name` | `[Short] {topic} - Scene {n} Image` |
| Scene video | video | `video_style` (framework name), `model_name`, `short_name` | `[Short] {topic} - Scene {n} Video` |
| Scene voiceover | audio* | `model_name` (Gemini/ElevenLabs), `short_name` | `[Short] {topic} - Voiceover {n}` |
| Music track | audio* | `model_name` (Lyria 2), `short_name` | `[Short] {topic} - Music` |
| Final assembled video | video | `video_style`, `visual_style`, `model_name`, `short_name` | `[Short] {topic} - Final` |
| Final captioned video | video | `video_style`, `visual_style`, `model_name`, `short_name` | `[Short] {topic} - Final (Captioned)` |

*Audio items save to `generated_audio` — metadata columns not added to that table. Audio saves use `saveToLibrary()` for the upload/dedup logic but metadata fields are ignored for audio type.

Save calls are fire-and-forget (non-blocking, don't fail the pipeline).

### Storyboard (`StoryboardPlannerWizard.jsx`)

The Storyboard already calls `apiFetch('/api/library/save', ...)` from the frontend. Update those calls to include metadata fields in the request body:

| Step | Metadata passed |
|------|-----------------|
| Start frame image | `visual_style`, `model_name`, `storyboard_name` |
| Per-scene video | `video_style`, `visual_style`, `model_name`, `storyboard_name` |
| Final assembled video | `video_style`, `visual_style`, `model_name`, `storyboard_name` |

No separate metadata endpoint needed — fields go directly in the save body.

### Imagineer (`api/imagineer/generate.js` + `edit.js`)

After generation, call `writeMediaMetadata()` with:
- `visual_style` (style preset name)
- `model_name` (selected model)

When user later saves via Library Save button in ImagineerModal, the save endpoint's fallback lookup finds the metadata.

### JumpStart (`api/jumpstart/generate.js`)

After generation, call `writeMediaMetadata()` with:
- `model_name` (selected model)

## Frontend Changes

### Library Modal (`src/components/modals/LibraryModal.jsx`)

**Filter bar**: Below the search bar, above the tag bar. Row of 5 compact `<select>` dropdowns:
- Video Style
- Visual Style
- Model
- Storyboard
- Short

Each populated from `GET /api/library/filters` on modal open. Default value: "All" (no filter). Selecting a value adds a `.eq()` to the Supabase query in `loadLibrary()`. Multiple dropdowns combine with AND. "Clear All" button resets all dropdowns and reloads.

**Query changes**: `loadLibrary()` includes the 5 new columns in its `select()` calls for both tables. When filters are active, `.eq('column', value)` is chained onto the query.

## `video_style` Column Semantics

The `video_style` column stores different but related things depending on source:
- **Shorts**: The framework name (e.g., "Top X Countdown", "Origin Story") — structural template
- **Storyboard**: The video style preset name (e.g., "Cinematic", "Documentary") — motion/cinematography

Both describe the visual motion treatment of the video. They appear together in the filter dropdown, which is fine — users searching for "Cinematic" videos want both Shorts and Storyboard results.

## Migration

Single SQL file: `supabase-migration-library-metadata.sql`

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

-- Add metadata columns to library tables
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS video_style text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS visual_style text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS model_name text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS storyboard_name text;
ALTER TABLE image_library_items ADD COLUMN IF NOT EXISTS short_name text;

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

## Not in scope

- Backfilling metadata for existing library items
- Filtering the `generated_audio` table (audio items don't have these style dimensions)
- Changing the existing manual tag system — it remains for user-created organizational tags
- Metadata for less-used generation tools (Lens, TryStyle, Animate, Smoosh) — can add in v2
- Searchable combobox for filter dropdowns (plain `<select>` for v1)
