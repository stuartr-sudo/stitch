# Multi-Style Parallel Image Editing

**Date:** 2026-03-27
**Status:** Draft
**Scope:** Edit Image modal + Imagineer I2I modal

## Problem

Currently both Edit Image and Imagineer I2I support only single-style selection. To compare an edit across multiple visual styles, the user must run each style sequentially — selecting, generating, saving, then going back to pick the next style. This is slow and tedious.

## Solution

Enable multi-select on the StyleGrid in both modals. When the user selects multiple styles and clicks generate, fire all generations in parallel. Display results progressively as they complete.

## Design

### StyleGrid Changes

`StyleGrid` already fully supports `multiple` mode (array toggle, count badge, checkmarks). No component changes needed.

- Both modals pass `multiple={true}` to `StyleGrid`
- `value` prop changes from `string` to `string[]`
- `onChange` receives updated array on each toggle
- Neither modal passes `hideLabel`, so the existing count badge ("N selected") displays automatically
- No selection limit — user decides how many styles to generate

### State Changes

**EditImageModal.jsx:**
- `style` state: `string` -> `string[]` (default `[]`)
- New state: `multiResults` array of result objects
- New state: `expandedImage` for lightbox

**ImagineerModal.jsx:**
- `i2iStyle` state: `string` -> `string[]` (default `[]`)
- New state: `i2iMultiResults` array of result objects
- New state: `i2iExpandedImage` for lightbox

### Result Object Shape

```javascript
{
  styleKey: string,       // e.g., 'oil-painting'
  styleLabel: string,     // from findStyleByValue(styleKey).label
  status: 'prompting' | 'generating' | 'polling' | 'completed' | 'failed',
  imageUrl: string | null,
  error: string | null,
  saved: boolean          // tracks whether this result has been saved to library
}
```

### Parallel Generation Flow

1. User selects N styles on Step 1 (EditImageModal step 1, ImagineerModal I2I step 1 — both "Instructions & Style"), completes remaining wizard steps, clicks generate
2. Modal switches to results view. `multiResults` initialized with N slots, all `status: 'prompting'`
3. For each style, in parallel (`Promise.allSettled`):
   a. Call `/api/prompt/build-cohesive` with that style's `promptText` + shared inputs
   b. On prompt success, update slot to `status: 'generating'`, fire generation API call (same endpoint routing as today — Wavespeed vs FAL based on model)
   c. If generation returns `requestId`, update to `status: 'polling'`, poll with existing `pollImagineerResult` / `pollJumpstartResult`
   d. On completion, update to `status: 'completed'` with `imageUrl`
   e. On failure at any step, update to `status: 'failed'` with `error`
4. No concurrency limit — providers handle throttling
5. If only 1 style selected (or 0), same flow but with a single slot — no regression

### Progressive Results View

Replaces the wizard steps when generation starts.

**Layout:**
- Responsive grid: 2-3 columns depending on modal width
- Each cell maintains stable position (ordered by selection order, not completion order)

**Cell states:**
- **Loading:** Style label + spinner/skeleton placeholder
- **Completed:** Style label + image thumbnail + Save/Use buttons
- **Failed:** Style label + error message + Retry button

**Header:** "Generating X images... (Y/X complete)" progress summary

**Click-to-expand lightbox:**
- Clicking a completed image opens a full-size overlay within the modal
- Close via X button, Escape key, or clicking backdrop
- Shows full-resolution image with style label

**Per-image actions:**
- **Save** — Saves to library via existing `saveToLibrary()`. Button tracks `saved` boolean per result. After first save, button disables and shows "Saved" with checkmark. Prevents double-saving.
- **Use** — EditImageModal: calls existing `onUse(imageUrl)` callback and closes modal. ImagineerModal: sets `i2iResultUrl` to the selected image (same as current single-result flow) and closes the results grid, showing the standard result view with its existing action buttons.

**Bulk actions:**
- **Save All** — Iterates completed results, skips any with `saved: true`, saves the rest. Disables after running. Updates each result's `saved` flag.

**Navigation:**
- **Back to Editor** — Returns to wizard with all inputs preserved (styles, prompt, images, model, enhancements). Clears `multiResults` — if the user modifies inputs and regenerates, a fresh results grid is created.

### Save Idempotency (No Double-Saving)

Each result object has a `saved: boolean` field, initialized `false`. The save function:
1. Checks `saved` — if `true`, returns immediately (no-op)
2. Sets `saved = true` optimistically (disables button immediately)
3. Calls `saveToLibrary()`
4. On failure, sets `saved = false` (re-enables button)

"Save All" checks each result's `saved` flag and skips already-saved images.

### Retry on Failure

Each failed cell shows a "Retry" button. Clicking it:
1. Resets the slot: `imageUrl = null`, `error = null`, `status = 'prompting'` (shows loading state)
2. Re-runs the full pipeline for that single style (prompt build -> generate -> poll)
3. Updates the slot in place on completion or failure

## Files Changed

| File | Change |
|------|--------|
| `src/components/ui/StyleGrid.jsx` | No changes needed — already supports `multiple` mode with array toggle, count badge, and checkmarks |
| `src/components/modals/EditImageModal.jsx` | Multi-select state, parallel dispatch, results grid, lightbox, save guards |
| `src/components/modals/ImagineerModal.jsx` | Same changes as EditImageModal for the I2I flow |

## Files NOT Changed

- No backend changes. All existing API endpoints used as-is.
- No new endpoints.
- `src/lib/stylePresets.js` — no changes to style data.

## Edge Cases

- **No style selected:** Generates one image with no style applied (same as today)
- **One style selected:** Generates one image in results grid (same UX, just in the new grid view)
- **All fail:** Results view shows all failed cells with retry buttons + "Back to Editor"
- **Modal closed during generation:** Use a `mountedRef` to prevent state updates after unmount. Pending promises resolve but results are discarded (modal state resets on open).
- **Async models (polling):** Each result polls independently — one slow poll doesn't block others
- **Existing single-result UI:** The old single-result view (image preview + action buttons) is replaced by the results grid for both single and multi-style generations. No conditional path — always use the grid, even for 1 result.
