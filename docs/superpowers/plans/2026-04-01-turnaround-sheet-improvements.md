# Turnaround Sheet Improvements — Character Consistency & Quality

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve turnaround sheet generation quality based on 2026 best practices research — better prompts, new R2V-optimized pose set, gray background option, auto-upscale, and portrait close-ups per angle.

**Architecture:** Five changes across backend pose sets (mirrored to frontend), prompt builder restructuring in turnaround.js, a new Topaz upscale step for completed turnarounds, and a third background mode in the wizard UI. All changes are additive — no existing pose sets or workflows break.

**Tech Stack:** Node.js/Express backend, React frontend, FAL.ai (Topaz upscale, image generation), Sharp (image processing)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `api/lib/turnaroundPoseSets.js` | Modify | Add R2V Reference pose set, update standard-24 detail row |
| `src/lib/turnaroundPoseSets.js` | Modify | Frontend mirror — must match backend exactly |
| `api/imagineer/turnaround.js` | Modify | Restructure prompt builder, add gray background, add auto-upscale |
| `src/components/modals/TurnaroundSheetWizard.jsx` | Modify | Add gray background button to refinements step |

---

### Task 1: Add R2V Reference Pose Set (Backend)

**Files:**
- Modify: `api/lib/turnaroundPoseSets.js`

This new 3x2 grid (3 columns, 2 rows = 6 cells) is purpose-built for Reference-to-Video workflows. Row 1 has 3 full-body turnaround views, Row 2 has 3 matching portrait close-ups. Uses landscape-ish aspect ratio (3:2) to fit 3 wide columns. The key innovation from viral workflows (Tao Prompts 47K views, AI Video School 190K views) is pairing every full-body angle with a matching close-up portrait directly beneath it.

- [ ] **Step 1: Add the R2V Reference pose set to the POSE_SETS array**

Insert after the `3d-action` entry (position 2 in the array) so it appears near the other optimized-for-downstream-use sets. Add this object:

```javascript
{
  id: 'r2v-reference',
  name: 'R2V Reference',
  description: '6-cell reference sheet optimized for video generation — full body + matching portrait per angle',
  thumbnail: '/assets/pose-sets/r2v-reference.svg',
  rows: [
    {
      label: 'Full Body Turnaround',
      cells: [
        { prompt: 'front view facing camera directly, 0-degree rotation, full body standing in relaxed A-pose with arms slightly away from body, symmetrical, centered in frame, full character visible head to toe, consistent head height alignment', shortLabel: 'Front' },
        { prompt: 'three-quarter front view at 45-degree angle, full body standing in relaxed pose, showing front and one side clearly, centered in frame, full character visible head to toe, consistent head height alignment', shortLabel: '3/4 Front' },
        { prompt: 'exact 90-degree side profile view, full body standing in relaxed pose, strict side silhouette, nose pointing left, one ear visible, centered in frame, full character visible head to toe, consistent head height alignment', shortLabel: 'Side' },
      ],
    },
    {
      label: 'Portrait Close-ups (Matching Angles)',
      cells: [
        { prompt: 'front view portrait close-up, head and shoulders, facing camera directly, matching the front full-body pose above, detailed facial features, same lighting and expression', shortLabel: 'Front Portrait' },
        { prompt: 'three-quarter portrait close-up, head and shoulders, at 45-degree angle matching the 3/4 full-body pose above, detailed facial features, same lighting and expression', shortLabel: '3/4 Portrait' },
        { prompt: 'side profile portrait close-up, head and shoulders, exact 90-degree profile matching the side full-body pose above, detailed facial features, same lighting and expression', shortLabel: 'Side Portrait' },
      ],
    },
  ],
}
```

- [ ] **Step 2: Update grid dimension functions to handle 3-column grids**

The existing `getPoseSetGrid()` already derives dimensions dynamically — verify it works for 3x2:

```javascript
// getPoseSetGrid('r2v-reference') should return { cols: 3, rows: 2, total: 6 }
```

No code change needed — the function already handles any grid shape. But the aspect ratio logic in `turnaround.js` needs updating (see Task 4).

- [ ] **Step 3: Commit**

```bash
git add api/lib/turnaroundPoseSets.js
git commit -m "feat: add R2V Reference pose set (3x2 grid) for video generation workflows"
```

---

### Task 2: Add R2V Reference Pose Set (Frontend Mirror)

**Files:**
- Modify: `src/lib/turnaroundPoseSets.js`

- [ ] **Step 1: Copy the exact same R2V Reference pose set to the frontend mirror**

Add the identical `r2v-reference` object at the same position (after `3d-action`) in the frontend `POSE_SETS` array. The content must be character-for-character identical to the backend version from Task 1.

- [ ] **Step 2: Commit**

```bash
git add src/lib/turnaroundPoseSets.js
git commit -m "feat: sync R2V Reference pose set to frontend mirror"
```

---

### Task 3: Update Standard-24 Detail Row with Per-Angle Portraits

**Files:**
- Modify: `api/lib/turnaroundPoseSets.js`
- Modify: `src/lib/turnaroundPoseSets.js`

The current standard-24 Row 6 ("Special Views & Details") has: Face Detail, Hand Detail, Top-Down, Low Angle. Research shows the top-down and low-angle cells are rarely useful for character consistency. Replace them with per-angle portrait close-ups that lock facial features across views.

- [ ] **Step 1: Update Row 6 in the backend standard-24 pose set**

Replace the current Row 6 cells:

```javascript
// OLD Row 6:
{
  label: 'Special Views & Details',
  cells: [
    { prompt: 'face close-up head and shoulders', shortLabel: 'Face Detail' },
    { prompt: 'hand and accessory detail close-up', shortLabel: 'Hand Detail' },
    { prompt: 'bird\'s-eye view from above', shortLabel: 'Top-Down' },
    { prompt: 'dramatic low angle from below', shortLabel: 'Low Angle' },
  ],
}
```

With:

```javascript
// NEW Row 6:
{
  label: 'Portrait Close-ups (Per Angle)',
  cells: [
    { prompt: 'front view portrait close-up, head and shoulders, facing camera directly, detailed facial features, matching the front turnaround pose', shortLabel: 'Face Front' },
    { prompt: 'three-quarter portrait close-up, head and shoulders, at 45-degree angle, detailed facial features, matching the 3/4 front turnaround pose', shortLabel: 'Face 3/4' },
    { prompt: 'side profile portrait close-up, head and shoulders, exact 90-degree profile, detailed facial features, matching the side turnaround pose', shortLabel: 'Face Side' },
    { prompt: 'hand and accessory detail close-up, showing rings, gloves, weapons, or other held items', shortLabel: 'Hand Detail' },
  ],
}
```

This keeps the useful Hand Detail cell, replaces the low-value Top-Down and Low Angle cells with per-angle portraits, and upgrades the generic "face close-up" to a specific front-facing portrait.

- [ ] **Step 2: Apply the same Row 6 update to the frontend mirror**

Copy the identical Row 6 replacement to `src/lib/turnaroundPoseSets.js`.

- [ ] **Step 3: Commit**

```bash
git add api/lib/turnaroundPoseSets.js src/lib/turnaroundPoseSets.js
git commit -m "feat: replace standard-24 detail row with per-angle portrait close-ups"
```

---

### Task 4: Add Gray Background Option

**Files:**
- Modify: `api/imagineer/turnaround.js` (prompt builder)
- Modify: `src/components/modals/TurnaroundSheetWizard.jsx` (UI button)

Gray backgrounds are the industry standard for production turnaround sheets — they provide contrast without the R2V issues of pure white (Veo 3.1 fails on white backgrounds) and without the visual noise of full scene environments.

- [ ] **Step 1: Update the prompt builder to handle 'gray' backgroundMode**

In `api/imagineer/turnaround.js`, find the `backgroundText` variable in `buildTurnaroundPrompt()` (around line 164) and update:

```javascript
// OLD:
const backgroundText = backgroundMode === 'scene' && sceneEnvironment
  ? `Professional character turnaround model sheet, organized grid layout with ${gridCols} columns and ${gridRows} rows (${gridTotal} poses total), each pose set in a ${sceneEnvironment.trim()} environment with contextual background, clear cell separation, each cell should be large and detailed`
  : `Professional character turnaround model sheet, organized grid layout with ${gridCols} columns and ${gridRows} rows (${gridTotal} poses total), clean white background with clear cell separation, each cell should be large and detailed`;

// NEW:
const gridDesc = `Professional character turnaround model sheet, organized grid layout with ${gridCols} columns and ${gridRows} rows (${gridTotal} poses total)`;
const cellDesc = 'clear cell separation, each cell should be large and detailed';
let backgroundText;
if (backgroundMode === 'scene' && sceneEnvironment) {
  backgroundText = `${gridDesc}, each pose set in a ${sceneEnvironment.trim()} environment with contextual background, ${cellDesc}`;
} else if (backgroundMode === 'gray') {
  backgroundText = `${gridDesc}, clean neutral gray background with ${cellDesc}`;
} else {
  backgroundText = `${gridDesc}, clean white background with ${cellDesc}`;
}
```

- [ ] **Step 2: Add the gray background button to the wizard UI**

In `src/components/modals/TurnaroundSheetWizard.jsx`, find the background mode buttons (around line 1419-1437). Add a third button between "White Background" and "Scene Environment":

```jsx
<button type="button"
  onClick={() => { setBackgroundMode('gray'); setSceneEnvironment(''); }}
  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
    backgroundMode === 'gray'
      ? 'bg-[#07393C] text-white border-[#07393C]'
      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
  }`}>
  Gray Background
</button>
```

Also update the white button's `onClick` to not clear `sceneEnvironment` unnecessarily — only clear it when switching away from scene mode (it already does this correctly).

- [ ] **Step 3: Commit**

```bash
git add api/imagineer/turnaround.js src/components/modals/TurnaroundSheetWizard.jsx
git commit -m "feat: add gray background option for turnaround sheets"
```

---

### Task 5: Restructure Prompt Builder with Identity-First Hierarchy

**Files:**
- Modify: `api/imagineer/turnaround.js`

Research shows models produce better character consistency when the prompt follows a strict priority hierarchy: identity anchor first, then layout instructions, then style. The current prompt puts style before character description. This task reorders the prompt parts and adds alignment/consistency instructions drawn from best-practice viral prompts.

- [ ] **Step 1: Restructure the parts array in buildTurnaroundPrompt()**

**IMPORTANT:** This task replaces ONLY the `const parts = []` through the taxonomy tags push (original lines 155-191). The `backgroundText` computation added in Task 4 (the `gridDesc`/`cellDesc`/`if-else` block) MUST remain above this section — it produces the `backgroundText` variable referenced below. Similarly, `avoidNote`, `stylePrompt`, `refNote`, `propsNote`, and `expressionCells` are all computed earlier in the function and remain unchanged.

Also update the `backgroundMode` destructure comment (around line 340) from `// 'white' (default) or 'scene'` to `// 'white' (default), 'gray', or 'scene'`.

Replace the parts assembly section with this reordered structure:

```javascript
const parts = [];

// 1. Avoidance goes FIRST — models pay most attention to the beginning
if (avoidNote) parts.push(avoidNote);

// 2. CHARACTER IDENTITY ANCHOR — face, hair, eyes, distinguishing marks, outfit
// This is the most important section for consistency
parts.push(`Character: ${characterDescription}`);

// 3. Reference image instructions — locks identity to visual anchor
parts.push(refNote);

// 4. Grid layout & background instructions
parts.push(backgroundText);

// 5. Consistency & alignment instructions (from best-practice research)
parts.push(
  'Maintain perfect identity consistency across every cell. Consistent head height alignment across all full-body views. Even spacing, uniform framing, relaxed A-pose for standing views. Same character proportions, facial features, hair, outfit colors, and accessories in every cell'
);

// 6. Style rendering
parts.push(stylePrompt);

// 7. Props integration
parts.push(propsNote);

// 8. Dynamic row definitions from pose set
const poseSetData = getPoseSetById(poseSet || 'standard-24');
poseSetData.rows.forEach((row, i) => {
  // For standard-24 Row 2, use expression-conflict-resolved cells
  if ((poseSet || 'standard-24') === 'standard-24' && i === 1) {
    const cells = row.cells.map((c, ci) => {
      if (ci === 2) return expressionCells[0];
      if (ci === 3) return expressionCells[1];
      return c.prompt;
    });
    parts.push(`Row ${i + 1} — ${row.label}: ${cells.join(', ')}`);
  } else {
    parts.push(`Row ${i + 1} — ${row.label}: ${row.cells.map(c => c.prompt).join(', ')}`);
  }
});

// 9. Taxonomy tags for model understanding
parts.push('character reference sheet, model sheet, turnaround sheet, multiple poses and angles, animation reference');

// 10. Repeat avoidance at the end for reinforcement
if (avoidNote) parts.push(avoidNote);
```

Key changes from original:
- Character description moved to position 2 (was position 4 in original)
- Reference note moved to position 3 (was position 8 in original)
- New consistency/alignment instructions at position 5 (didn't exist before)
- Style moved to position 6 (was position 2 in original)
- The IIFE for row generation replaced with a cleaner forEach
- `backgroundText`, `avoidNote`, `stylePrompt`, `refNote`, `propsNote`, `expressionCells` all remain computed above this block — only the assembly order changes

- [ ] **Step 2: Verify the brand style guide section is still appended after the parts array**

The brand style guide block (lines 197-207) should remain unchanged — it runs after the parts assembly and pushes to the same array. Just confirm it's still there and still works.

- [ ] **Step 3: Commit**

```bash
git add api/imagineer/turnaround.js
git commit -m "feat: restructure turnaround prompt with identity-first hierarchy and alignment instructions"
```

---

### Task 6: Add Auto-Upscale for Completed Turnaround Sheets

**Files:**
- Modify: `api/imagineer/turnaround.js`

Turnaround outputs should be upscaled 2x via Topaz before saving. This is especially important for 4x6 grids where individual cells are only ~256x256px. The upscale function pattern already exists in `api/jumpstart/generate.js` — copy it locally.

- [ ] **Step 1: Add the Topaz upscale function to turnaround.js**

Add this function after the imports (around line 20), before `stitchReferenceImages`:

```javascript
/**
 * Upscale an image 2x using Topaz via FAL.
 * Returns the upscaled image URL, or the original on error.
 */
const TOPAZ_ENDPOINT = 'fal-ai/topaz/upscale/image';

async function upscaleImage(imageUrl, falKey) {
  try {
    console.log(`[Turnaround/Upscale] Upscaling: ${imageUrl.substring(0, 80)}...`);
    const submitRes = await fetch(`https://queue.fal.run/${TOPAZ_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        model: 'Standard V2',
        upscale_factor: 2,
        output_format: 'png',
        subject_detection: 'All',
        face_enhancement: false,
      }),
    });

    const data = await submitRes.json();

    // Synchronous result
    if (data.image?.url) {
      console.log(`[Turnaround/Upscale] Done (sync): ${data.image.url.substring(0, 80)}`);
      return data.image.url;
    }

    // Queued — poll
    if (data.request_id) {
      const statusUrl = data.status_url || `https://queue.fal.run/${TOPAZ_ENDPOINT}/requests/${data.request_id}/status`;
      const responseUrl = data.response_url || `https://queue.fal.run/${TOPAZ_ENDPOINT}/requests/${data.request_id}`;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(statusUrl, { headers: { 'Authorization': `Key ${falKey}` } });
        const status = await statusRes.json();
        if (status.status === 'COMPLETED') {
          const resultRes = await fetch(responseUrl, { headers: { 'Authorization': `Key ${falKey}` } });
          const result = await resultRes.json();
          if (result.image?.url) {
            console.log(`[Turnaround/Upscale] Done (queued): ${result.image.url.substring(0, 80)}`);
            return result.image.url;
          }
        }
        if (status.status !== 'IN_QUEUE' && status.status !== 'IN_PROGRESS') break;
      }
    }

    console.warn('[Turnaround/Upscale] Timed out, using original');
    return imageUrl;
  } catch (err) {
    console.warn('[Turnaround/Upscale] Error, using original:', err.message);
    return imageUrl;
  }
}
```

Note: uses `output_format: 'png'` (not jpeg) since turnaround sheets need lossless quality for cell extraction.

- [ ] **Step 2: Apply upscale to synchronous (edit) results**

In the `handler` function, find where `callSync` results are returned (around line 402-404). After getting the result, upscale it before returning:

```javascript
if (modelDef.type === 'edit' || (modelDef.type === 'both' && hasRef)) {
  result = await tryEditWithFallback(FAL_KEY, model, modelDef, prompt, resolvedRefUrl, extras);
  // Auto-upscale completed turnaround sheets
  if (result.imageUrl) {
    result.imageUrl = await upscaleImage(result.imageUrl, FAL_KEY);
    result.upscaled = true;
  }
}
```

- [ ] **Step 3: Handle async (queue) results — upscale must happen client-side or via a separate step**

For queue-based models that return a `requestId`, the image isn't available yet at response time. The upscale must happen after the frontend polls and gets the final image. Two approaches:

**Option A (recommended):** Add an `upscale: true` flag to the queue response. The frontend, after polling gets the final image URL from `/api/imagineer/result`, makes a second call to a new lightweight endpoint or handles it client-side.

**Option B:** Don't auto-upscale queue results — only sync results get upscaled. Queue models are less commonly used for turnarounds (edit models are default/recommended).

Go with Option B for simplicity — only upscale sync (edit model) results. Queue model users can manually upscale via the cell editor. Add a comment explaining this:

```javascript
} else {
  // Queue-based models — upscale not applied automatically (image not available yet).
  // Users can upscale individual cells via the cell editor after generation completes.
  const payload = modelDef.buildPayload(prompt, null, extras);
  result = await submitToQueue(FAL_KEY, modelDef.endpoint, model, payload);
}
```

- [ ] **Step 4: Commit**

```bash
git add api/imagineer/turnaround.js
git commit -m "feat: auto-upscale turnaround sheets via Topaz for higher quality output"
```

---

### Task 7: Add 3x2 Grid Aspect Ratio Support

**Files:**
- Modify: `api/imagineer/turnaround.js`

The new R2V Reference pose set is 3x2 (3 columns, 2 rows). The current aspect ratio logic only handles 2x2 (square) and 4x6 (portrait). A 3x2 grid needs a landscape aspect ratio (3:2) to give each cell good proportions.

- [ ] **Step 1: Update the grid aspect ratio functions**

Replace the simple `gridAspect`/`gridSeedreamDims`/`gridFluxDims` functions (around lines 220-222):

```javascript
// Grid-aware aspect ratio & dimensions:
// 2×2 grids → 1:1 square (maximize per-cell resolution)
// 3×2 grids → 3:2 landscape (3 wide columns, 2 rows)
// 4×6 grids → 2:3 portrait (more rows than cols)
function gridAspect(extras) {
  if (extras?.gridSquare) return '1:1';
  if (extras?.gridLandscape) return '3:2';
  return '2:3';
}
function gridSeedreamDims(extras) {
  if (extras?.gridSquare) return { width: 2048, height: 2048 };
  if (extras?.gridLandscape) return { width: 2560, height: 1440 };
  return { width: 1440, height: 2560 };
}
function gridFluxDims(extras) {
  if (extras?.gridSquare) return { width: 1536, height: 1536 };
  if (extras?.gridLandscape) return { width: 1536, height: 1024 };
  return { width: 1024, height: 1536 };
}
```

- [ ] **Step 2: Update the extras calculation in the handler to detect 3x2 grids**

Find where `gridSquare` is computed (around line 399):

```javascript
// OLD:
const gridSquare = gridCols <= 2;
const extras = { loras: loras || (loraUrl ? [{ url: loraUrl, scale: 1 }] : null), negativePrompt: negPrompt, gridSquare };

// NEW:
const { cols: gridCols, rows: gridRows } = getPoseSetGrid(poseSet || 'standard-24');
const gridSquare = gridCols <= 2 && gridRows <= 2;
const gridLandscape = gridCols > gridRows && !gridSquare; // 3x2 = landscape
const extras = { loras: loras || (loraUrl ? [{ url: loraUrl, scale: 1 }] : null), negativePrompt: negPrompt, gridSquare, gridLandscape };
```

Note: The existing `const { cols: gridCols } = getPoseSetGrid(...)` on line 398 already destructures `cols`. Update it to also destructure `rows`.

- [ ] **Step 3: Commit**

```bash
git add api/imagineer/turnaround.js
git commit -m "feat: support 3x2 landscape grid aspect ratio for R2V Reference pose set"
```

---

### Task 8: Verify & Test

- [ ] **Step 1: Start the dev server**

```bash
npm run start
```

- [ ] **Step 2: Verify the backend returns the new pose set**

Open the turnaround wizard in the browser. In Step 2 (Style & Model), verify "R2V Reference" appears as a selectable pose set.

- [ ] **Step 3: Verify gray background option appears**

Navigate to Step 4 (Refinements). Verify three background buttons are present: "White Background", "Gray Background", "Scene Environment".

- [ ] **Step 4: Verify standard-24 Row 6 shows updated labels**

Select standard-24 pose set, generate a sheet, go to the cell editor (Step 6). Verify the last row cells are labeled "Face Front", "Face 3/4", "Face Side", "Hand Detail" (not the old "Top-Down", "Low Angle").

- [ ] **Step 5: Test generation with the R2V Reference pose set**

Select R2V Reference + a reference image + gray background. Generate a sheet. Verify:
- The output is a 3x2 grid (3 columns, 2 rows)
- Top row has full-body views, bottom row has matching portrait close-ups
- The aspect ratio is landscape (wider than tall)
- If using an edit model, the output is upscaled (check console for `[Turnaround/Upscale]` log)

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during turnaround improvements testing"
```
