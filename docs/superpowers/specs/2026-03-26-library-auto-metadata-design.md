# Library Auto-Metadata & Filters

## Problem

When media is saved to the library, no generation context is stored — no model name, style presets, storyboard/short names. Users can't filter by "all videos made with Kling" or "all images from the Product Demo storyboard". Additionally, the Shorts pipeline doesn't save to the library at all.

## Solution

1. A `media_metadata` lookup table populated at generation time
2. Five new metadata columns on both library tables, auto-populated from the lookup at save time
3. Dropdown filters in the Library modal for each metadata dimension
4. Shorts pipeline auto-saves all generated assets to the library

## Database

### New table: `media_metadata`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Default `gen_random_uuid()` |
| `user_id` | uuid | FK to auth.users |
| `source_url` | text NOT NULL | Original generation URL (lookup key) |
| `video_style` | text | Framework name or video style preset |
| `visual_style` | text | Visual style preset name |
| `model_name` | text | Generator model display name |
| `storyboard_name` | text | Storyboard name, if applicable |
| `short_name` | text | Campaign topic/name, if applicable |
| `created_at` | timestamptz | Default `now()` |

- Unique constraint on `(user_id, source_url)` for upsert
- RLS: users can only read/write their own rows

### Alter `image_library_items`

Add 5 nullable columns: `video_style text`, `visual_style text`, `model_name text`, `storyboard_name text`, `short_name text`.

### Alter `generated_videos`

Same 5 nullable columns.

## Backend Changes

### `api/lib/mediaMetadata.js` (new)

Shared helper with two functions:

```js
/**
 * Write metadata at generation time.
 * Upserts on (user_id, source_url).
 */
export async function writeMediaMetadata(supabase, userId, sourceUrl, metadata)

/**
 * Look up metadata by source URL.
 * Returns { video_style, visual_style, model_name, storyboard_name, short_name } or null.
 */
export async function lookupMediaMetadata(supabase, userId, sourceUrl)
```

### `api/library/save.js`

Before inserting the library row:
1. Look up `media_metadata` by the **original** URL (before re-upload to Supabase)
2. Merge any found metadata into the insert data
3. Any explicitly passed metadata fields in the request body override the lookup (caller always wins)

The 5 new fields are accepted in the request body as optional overrides but are NOT required — the lookup handles it.

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

### `api/library/save.js` — filter support on load

The Library modal's `loadLibrary` calls Supabase directly (not through the API). The filter logic is applied client-side on the Supabase query by adding `.eq()` clauses when dropdown filters are active. The `select()` calls in `loadLibrary` are updated to include the 5 new columns.

## Callers — Metadata Writers

### Shorts Pipeline (`api/lib/shortsPipeline.js`)

After each generation step, call `writeMediaMetadata()` with the output URL:

| Step | Metadata written |
|------|-----------------|
| Scene image | `visual_style`, `model_name`, `short_name` |
| Scene video | `video_style` (framework name), `model_name`, `short_name` |
| Scene voiceover | `model_name` (Gemini/ElevenLabs), `short_name` |
| Music track | `model_name` (Lyria 2), `short_name` |
| Final assembled video | `video_style`, `visual_style`, `model_name`, `short_name` |
| Final captioned video | `video_style`, `visual_style`, `model_name`, `short_name` |

### Shorts Pipeline — Auto-save to Library

After each generation step, also call `/api/library/save` (fire-and-forget, non-blocking) to save the asset to the library. Title pattern: `[Short] {topic} - Scene {n} Image`, `[Short] {topic} - Scene {n} Video`, `[Short] {topic} - Voiceover {n}`, `[Short] {topic} - Music`, `[Short] {topic} - Final`, `[Short] {topic} - Final (Captioned)`.

The save endpoint auto-merges metadata from `media_metadata`.

### Storyboard (`StoryboardPlannerWizard.jsx` + `api/storyboard/`)

The Storyboard already saves to the library. Update existing save calls to also call `writeMediaMetadata()` before saving:

| Step | Metadata written |
|------|-----------------|
| Start frame image | `visual_style`, `model_name`, `storyboard_name` |
| Per-scene video | `video_style`, `visual_style`, `model_name`, `storyboard_name` |
| Final assembled video | `video_style`, `visual_style`, `model_name`, `storyboard_name` |

Storyboard saves happen on the frontend — the metadata write happens via a new lightweight API endpoint `POST /api/library/metadata` that proxies to `writeMediaMetadata()`.

### Imagineer (`api/imagineer/generate.js` + `edit.js`)

After image generation, call `writeMediaMetadata()` with:
- `visual_style` (from the style preset name)
- `model_name` (from the selected model)

### JumpStart (`api/jumpstart/generate.js`)

After video generation, call `writeMediaMetadata()` with:
- `model_name` (from the selected model)

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

### Metadata write endpoint

`POST /api/library/metadata` — lightweight endpoint for frontend callers (Storyboard) to write to `media_metadata` without going through the full save flow. Body: `{ source_url, video_style, visual_style, model_name, storyboard_name, short_name }`.

## Migration

Single SQL file: `supabase-migration-library-metadata.sql`

```sql
-- media_metadata lookup table
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
  FOR ALL USING (auth.uid() = user_id);

-- Add columns to library tables
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
```

## Not in scope

- Backfilling metadata for existing library items
- Filtering the `generated_audio` table (audio items don't have these style dimensions)
- Changing the existing manual tag system — it remains for user-created organizational tags
