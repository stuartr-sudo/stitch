# Turnaround Sheet Multi-Axis Variation

**Date**: 2026-03-25
**Status**: Draft
**Scope**: Extend TurnaroundSheetWizard to generate permutations across characters, styles, and pose sets. Add a global image library tag system.

---

## Overview

Currently the turnaround feature generates one sheet per selected style, holding character, model, props, and pose layout constant. This design adds two new variation axes (multiple characters, selectable pose set presets) so the generator produces a full cartesian product of `characters × styles × poseSets`. Model remains a global setting per batch.

A new tag system for the image library supports the feature by enabling character-based organization and retrieval.

---

## 1. Image Library Tag System

### 1.1 Data Model

**Table: `image_tags`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users`, NOT NULL |
| `name` | text | NOT NULL |
| `created_at` | timestamptz | default `now()` |

- Unique constraint on `(user_id, name)` — no duplicate tag names per user.
- RLS: users can only read/write their own tags.

**Table: `image_tag_links`**

| Column | Type | Notes |
|--------|------|-------|
| `image_id` | uuid | FK → `image_library_items.id`, NOT NULL, ON DELETE CASCADE |
| `tag_id` | uuid | FK → `image_tags.id`, NOT NULL, ON DELETE CASCADE |

- PK on `(image_id, tag_id)`.
- RLS: users can only read/write links for their own images (join through `image_library_items.user_id`).

### 1.2 API Endpoints

All authenticated via existing `authenticateToken` middleware.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| GET | `/api/library/tags` | — | `{ tags: [{ id, name, count, lastUsed }] }` sorted by most recently used |
| POST | `/api/library/tags` | `{ name }` | `{ tag: { id, name } }` — returns existing if name matches (case-insensitive) |
| POST | `/api/library/tags/assign` | `{ imageIds: [], tagIds: [] }` | `{ success: true }` — bulk assign |
| DELETE | `/api/library/tags/unassign` | `{ imageId, tagId }` | `{ success: true }` |
| POST | `/api/library/tags/auto-tag` | `{ imageId, tagNames: [] }` | `{ success: true, tags: [...] }` — creates tags if they don't exist + assigns, all in one transaction |

### 1.3 Library UI Changes

- **Tag filter bar** below the existing search bar — horizontal scrollable row of tag pills. Click to toggle filter. Selecting multiple tags within the bar uses OR (show images matching any selected tag). Active tags highlighted.
- **Search bar** searches both image titles AND tag names. Typing "kai" surfaces images tagged "Kai" even if the title doesn't match.
- **Image card tags** — small chips on each card showing assigned tags. "+" button opens tag assignment popover.
- **Tag assignment popover** — search field at top, existing tags as clickable pills below, "Create new" option at bottom of list. New tags are immediately available for future use.

### 1.4 Auto-Tagging from Turnaround

When a turnaround sheet is saved to the library, the **backend** calls the auto-tag endpoint to assign tags in one transaction:
- Character name (e.g., "Kai")
- `"turnaround"`
- Style name (e.g., "pixel-art")
- Pose set name (e.g., "action-heavy")

Tags are created if they don't exist yet for the user. This happens server-side after the image is saved — the frontend does not need to make separate tagging calls.

---

## 2. Multi-Character — Wizard Step 1 (Character) — Extended

### 2.1 State Change

**Current**: `characterDescription` (string) + `referenceImageUrl` (string).

**New**: `characters` array:
```js
[{
  id: string,         // unique ID (e.g., Date.now()-based)
  name: string,       // required — used for tagging, results grouping
  description: string, // character appearance description
  referenceImageUrl: string // optional reference image
}]
```

Initialized with one empty entry. Minimum 1 character, no maximum.

### 2.2 UI Layout

Each character rendered as a card within a vertical list:

- **Name** — short text input (placeholder: "e.g., Kai"). Required before generation.
- **Description** — textarea (rows=4). Same behavior as current.
- **Reference Image** — upload button + library picker (existing pattern). Library picker now includes tag filtering.
- **"Pick from Library"** button — opens the image library modal with tag-based filtering. Selecting an image populates `referenceImageUrl`. If the image has a stored description, auto-fills `description`.
- **"Analyze"** button — existing GPT-4 vision behavior, scoped to this character's reference image.
- **"Remove"** button — removes this character. Disabled when only 1 character remains.

**"Add Character"** button below the list — appends a new empty entry.

### 2.3 Validation

- Every character must have a non-empty `name` and `description` before generation.
- Reference image is optional (but required if an edit model is selected — existing validation, applied per-character).

---

## 3. Pose Set Presets — Wizard Step 2 (Style & Model) — Extended

### 3.1 Data File

New file: `api/lib/turnaroundPoseSets.js`

Exports:
- `POSE_SETS` — array of preset objects
- `getPoseSetById(id)` — returns single preset or default
- `listPoseSets()` — returns all presets (for API/frontend)

Each preset:
```js
{
  id: string,           // e.g., 'standard-24'
  name: string,         // e.g., 'Standard 24'
  description: string,  // short UI description
  thumbnail: string,    // path in public/assets/pose-sets/
  rows: [               // 6 entries, each with 4 cells
    {
      label: 'Row 1 — Turnaround',
      cells: [
        { prompt: 'front view', shortLabel: 'Front' },
        { prompt: 'three-quarter front view', shortLabel: '3/4 Front' },
        { prompt: 'side profile view', shortLabel: 'Side' },
        { prompt: 'back view', shortLabel: 'Back' },
      ]
    },
    // ... 5 more rows
  ]
}
```

Each cell has both a `prompt` string (used in the generation prompt) and a `shortLabel` string (used for grid overlay text, library save titles, and cell editor labels). This keeps display labels compact (e.g., "Front", "Wing Spread") while prompt text stays descriptive.

Frontend mirror: `src/lib/turnaroundPoseSets.js` — duplicated file with a sync comment, following the same pattern as `api/lib/visualStyles.js` / `src/lib/visualStylePresets.js`.

### 3.2 Five Presets

**Standard 24** (`standard-24`): Current hardcoded rows, unchanged.
- Row 1: Turnaround (front, 3/4 front, side, back)
- Row 2: Expressions & Alt Back (3/4 back, neutral, determined, joyful)
- Row 3: Walk Cycles (walk A, walk B, toward viewer, away)
- Row 4: Dynamic & Action (running, jumping, hero landing, fight stance)
- Row 5: Still Poses (sitting, reaching, carrying, leaning)
- Row 6: Detail Close-ups (face, hand, bird's-eye, low angle)

**Expressions Focus** (`expressions-focus`): Heavy on facial emotion.
- Row 1: Turnaround (same as standard)
- Row 2: Core Expressions (happy, sad, angry, surprised)
- Row 3: Complex Expressions (scared, disgusted, smug, crying)
- Row 4: Subtle Expressions (bored, curious, suspicious, embarrassed)
- Row 5: Interaction Expressions (laughing with someone, whispering, shouting, eye-roll)
- Row 6: Detail Close-ups (face front, face 3/4, eyes extreme close-up, mouth detail)

**Action Heavy** (`action-heavy`): Combat and dynamic poses.
- Row 1: Turnaround (same as standard)
- Row 2: Combat Stances (sword swing, dodge roll, shield block, kick)
- Row 3: Movement (sprint, crouch, climb wall, backflip)
- Row 4: Power Moves (dual-wield attack, power-up charge, ground slam, aerial strike)
- Row 5: States (injured/kneeling, victory pose, defeated, battle-ready)
- Row 6: Detail Close-ups (face battle expression, weapon grip, dynamic low angle, impact moment)

**Fashion/Outfit** (`fashion-outfit`): Clothing and accessory showcase.
- Row 1: Turnaround (same as standard)
- Row 2: Outfit Variations (casual wear, formal wear, sleepwear, athletic wear)
- Row 3: Seasonal (winter outfit, summer outfit, rain gear, evening/gala)
- Row 4: Accessory Focus (hat/headwear, bag/backpack, jewelry close-up, shoe detail)
- Row 5: Fabric & Fit (back detail showing closure, fabric texture close-up, layered outfit, silhouette/outline)
- Row 6: Styling Poses (runway walk, seated elegant, windswept, mirror reflection)

**Creature/Non-Human** (`creature-non-human`): Animals, monsters, mechs.
- Row 1: Turnaround (front, 3/4 front, side, back — same grid)
- Row 2: Creature Features (wing spread/extended, coiled/resting, roar/threat display, tail poses)
- Row 3: Movement (flight/hover, swimming/underwater, burrowing/digging, pounce/leap)
- Row 4: Interaction (pack formation, hunting/stalking, feeding, playful/friendly)
- Row 5: Detail Close-ups (eye detail extreme close-up, paw/claw/talon, scale/fur/feather texture, teeth/beak/horn)
- Row 6: Special Views (size comparison with human, x-ray/skeleton overlay, baby/juvenile version, battle/armored variant)

### 3.3 Frontend Integration

- Added to Step 2 as a card grid below the Style Grid, above the Model dropdown.
- Multi-select — same interaction pattern as styles.
- Each card shows thumbnail + name + short description.
- Default: `standard-24` pre-selected.

### 3.4 Shared Data Strategy

Frontend mirror: `src/lib/turnaroundPoseSets.js` is a duplicated file with a comment at the top noting it must stay in sync with `api/lib/turnaroundPoseSets.js`. This follows the existing pattern used by `visualStyles.js` / `visualStylePresets.js`. No API endpoint needed for V1.

---

## 4. Generation Flow

### 4.1 Permutation

`handleGenerate` computes the cartesian product:

```
sheets = characters × selectedStyles × selectedPoseSets
```

Each sheet object:
```js
{
  id: string,
  character: { id, name, description, referenceImageUrl },
  style: string,        // style preset ID
  styleText: string,    // resolved prompt text
  poseSet: string,      // pose set ID
  poseSetName: string,  // display name
  generating: boolean,
  requestId: string | null,
  pollModel: string | null,
  imageUrl: string | null,
  error: string | null,
}
```

Model is global — `selectedModel` applies to all sheets.

### 4.2 Concurrency & Soft Warning

**Concurrency limit**: Maximum 4 concurrent API calls. Sheets beyond the first 4 are queued and dispatched as earlier calls complete. This prevents overwhelming FAL.ai rate limits and the Express server connection pool.

**Soft warning**: Before firing, if `sheets.length > 10`, show a confirmation dialog:

```
"This will generate 24 sheets (2 characters × 4 styles × 3 pose sets). Continue?"
```

Shown as an AlertDialog. No hard cap. Below 10: no warning, generates immediately.

### 4.3 API Call

Each sheet fires `/api/imagineer/turnaround` with:
```js
{
  characterDescription: sheet.character.description,
  referenceImageUrl: sheet.character.referenceImageUrl || undefined,
  style: sheet.styleText,
  poseSet: sheet.poseSet,          // NEW — pose set ID
  characterName: sheet.character.name, // NEW — for auto-tagging on save
  props: propsLabels,
  model: selectedModel,
  negativePrompt: combinedNegativePrompt,
  brandStyleGuide: extractBrandStyleData(selectedBrand),
}
```

### 4.4 Backend Changes

**`buildTurnaroundPrompt` signature** adds `poseSet` parameter:
```js
function buildTurnaroundPrompt({ characterDescription, style, hasReference, props, negativePrompt, brandStyleGuide, poseSet })
```

**Row definitions**: Instead of hardcoded Row 1–6 strings, looks up `getPoseSetById(poseSet).rows` and formats each as `Row N — {row.label}: {row.cells.map(c => c.prompt).join(', ')}`.

**Negative prompt expression conflict resolution**: Only applied when `poseSet === 'standard-24'` (the only preset with the original Row 2 expression cells). For all other pose sets, the negative prompt is still placed at the start and end of the prompt (the "CRITICAL INSTRUCTION" wrapper), but the per-cell expression swapping logic is skipped — the broader negative prompt instruction is sufficient for non-standard layouts.

**`characterName` usage**: The backend handler receives `characterName` and passes it through to the save/auto-tag flow. When the generated image is saved to the library, the handler calls the auto-tag transaction with `[characterName, 'turnaround', styleName, poseSetName]`.

Everything else in the function stays identical — style rendering, props, reference note, brand guide, keyword suffixes.

**`CELL_LABELS`** becomes dynamic on the frontend — derived from the pose set's `rows` flattened: `poseSet.rows.flatMap(r => r.cells.map(c => c.shortLabel))`. Used by the slice/edit step and grid overlay.

---

## 5. Results Gallery (Wizard Step 5)

### 5.1 Grouped View

Sheets grouped by character name. Each group is a collapsible section:

```
▼ Kai (12 sheets — 8 complete, 4 generating)
  [sheet cards...]

▼ Mira (12 sheets — 12 complete)
  [sheet cards...]
```

Each sheet card shows:
- Thumbnail (or spinner if generating)
- Style label
- Pose set label
- Error state if failed + **"Retry"** button on failed sheets

### 5.2 Filter Bar

Horizontal pill row above the groups:
- **Character**: toggle pills for each character name
- **Style**: toggle pills for each selected style
- **Pose Set**: toggle pills for each selected pose set

Filters use standard faceted filtering: **OR within a category** (selecting "Kai" and "Mira" shows both), **AND across categories** (Character=Kai AND Style=pixel-art shows only Kai's pixel-art sheets).

### 5.3 Retry Failed

- Individual "Retry" button on each failed sheet card — re-fires that single sheet's API call.
- **"Retry All Failed"** button in the filter bar (visible when any sheets have errors) — re-fires all failed sheets, respecting the concurrency limit.

### 5.4 Detail/Slice/Edit

Clicking a sheet enters the existing detail view. `CELL_LABELS` for the slice grid comes from the sheet's pose set (`shortLabel` values), not a global constant. All other cell editing, reassembly, and save logic unchanged.

### 5.5 Auto-Tagging on Save

When a completed sheet is saved to library, the backend auto-tags via the `/api/library/tags/auto-tag` endpoint:
- Character name
- `"turnaround"`
- Style name
- Pose set name

---

## 6. Files Changed

| File | Change |
|------|--------|
| `api/lib/turnaroundPoseSets.js` | **NEW** — 5 pose set presets with `prompt` + `shortLabel` per cell, `getPoseSetById()`, `listPoseSets()` |
| `src/lib/turnaroundPoseSets.js` | **NEW** — frontend mirror (duplicated, sync comment) |
| `api/imagineer/turnaround.js` | `buildTurnaroundPrompt` accepts `poseSet`, dynamic row lookup, expression conflict only for `standard-24`. Handler accepts `poseSet` + `characterName`, triggers auto-tagging on save. |
| `src/components/modals/TurnaroundSheetWizard.jsx` | Multi-character state, pose set selector, permutation generation with concurrency limit, grouped results with filters, retry failed, dynamic cell labels |
| `api/library/tags.js` | **NEW** — CRUD endpoints for tags |
| `api/library/tags-assign.js` | **NEW** — assign/unassign endpoints |
| `api/library/tags-auto.js` | **NEW** — atomic auto-tag endpoint (create-if-not-exists + assign) |
| `server.js` | Register new tag routes + auto-tag route |
| `src/components/library/` | Tag filter bar, tag pills on cards, tag assignment popover, search integration |
| `public/assets/pose-sets/` | **NEW** — 5 thumbnail images for pose set cards |
| Supabase migration | **NEW** — `image_tags` + `image_tag_links` tables with RLS |

## 7. Not Changing

- Model registry, edit fallback chain, sync/queue dispatch, polling logic
- Cell editing, slicing, reassembly, LoRA save flow
- Props step, negative prompt step, brand style guide step
- Backend prompt structure (order of elements, negative prompt placement, keyword suffixes) — only the row definitions become dynamic
- Existing single-style generation still works (1 character × 1 style × 1 pose set = 1 sheet, same as today)
