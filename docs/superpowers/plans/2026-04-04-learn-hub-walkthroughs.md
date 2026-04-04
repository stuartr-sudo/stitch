# Learn Hub Walkthroughs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite all 11 tool guides in `/learn` with real Chrome screenshots (click-target highlights, contained sizing), hyper-detailed step-by-step walkthroughs, and full coverage of every recently shipped feature.

**Architecture:** Phase 1 (Shorts + Storyboards) runs sequentially and must be approved before Phase 2. Phase 2 dispatches 8 parallel sub-agents (one per guide). Each agent: opens Chrome → logs into stitchstudios.app → takes screenshots with amber pulse highlights → uploads to Supabase `media/learn/<tool>/` → rewrites the guide JSX → verifies in Chrome → commits.

**Tech Stack:** React 18, Tailwind CSS, Supabase Storage, Claude in Chrome MCP (`mcp__Claude_in_Chrome__*`), Express/Node.js backend

**Spec:** `docs/superpowers/specs/2026-04-04-learn-hub-walkthroughs-design.md`

---

## Shared Patterns (read before any task)

### Chrome Login (repeat at start of every task)
```
1. mcp__Claude_in_Chrome__navigate → https://stitchstudios.app
2. Wait for page load
3. Fill email: stuartr@sewo.io
4. Fill password: Ilovelife2021)
5. Submit → verify dashboard loaded
```

### Click Highlight Injection (use before every screenshot)
```javascript
// Highlight by button text (most common)
const el = Array.from(document.querySelectorAll('button,a,[role="button"]'))
  .find(b => b.textContent.trim().includes('TARGET_TEXT'));

// Highlight by aria-label
const el = document.querySelector('[aria-label="TARGET_LABEL"]');

// Highlight by heading/label text
const el = Array.from(document.querySelectorAll('h2,h3,h4,label,span'))
  .find(e => e.textContent.trim() === 'TARGET_TEXT');

// Once el is found, inject overlay:
if (el) {
  const r = el.getBoundingClientRect();
  const o = document.createElement('div');
  o.id = '__sh__';
  o.style.cssText = `position:fixed;left:${r.left+r.width/2-22}px;top:${r.top+r.height/2-22}px;width:44px;height:44px;border-radius:50%;background:rgba(245,158,11,0.3);border:3px solid #f59e0b;box-shadow:0 0 0 8px rgba(245,158,11,0.15);z-index:99999;pointer-events:none;`;
  document.body.appendChild(o);
}
// After screenshot: document.getElementById('__sh__')?.remove();
```

### Screenshot Capture + Upload Pipeline (complete steps for every screenshot)

**Step A — Take the screenshot:**
Use `mcp__computer-use__screenshot`. This returns the current screen as a base64-encoded PNG embedded in the tool result.

**Step B — Save the base64 to a file using the Write tool:**
The `mcp__computer-use__screenshot` result contains the image as base64 text. Copy that base64 string and write it to a temp file using the Write tool (not Bash — Write handles large text reliably):
```
Write tool → file_path: /tmp/stitch-screenshot.b64
content: <paste the full base64 string from the screenshot result>
```
Then decode it to binary via Bash:
```bash
base64 -d /tmp/stitch-screenshot.b64 > /tmp/stitch-screenshot.jpg
```

**Step C — Get the Supabase service role key:**
```bash
grep SUPABASE_SERVICE_ROLE_KEY /Users/stuarta/stitch/.env | cut -d'=' -f2
```
Store this as `$SRK`.

**Step D — Upload to Supabase storage via curl:**
```bash
curl -s -X POST \
  "https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/media/learn/<TOOL>/NN-filename.jpg" \
  -H "Authorization: Bearer $SRK" \
  -H "Content-Type: image/jpeg" \
  -H "x-upsert: true" \
  --data-binary @/tmp/stitch-screenshot.jpg
```
The `x-upsert: true` header allows re-uploading if the file already exists.

**Step E — Confirm CDN URL:**
```
https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/<TOOL>/NN-filename.jpg
```
Verify by opening this URL in Chrome before writing it into the guide JSX.

**Important:** Do steps A–E once per screenshot. Collect all CDN URLs in a list before starting the guide rewrite. Never write a CDN URL into JSX before confirming the upload succeeded.

### Screenshot Image Component (use in all guides)
```jsx
<img
  src="https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/<tool>/NN-desc.jpg"
  alt="Descriptive alt text"
  className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 shadow-lg my-4"
/>
```

### Live Generation Placeholder (for video/AI output steps)
```jsx
<div className="max-w-2xl mx-auto my-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4 text-sm text-amber-800 dark:text-amber-300">
  📸 <strong>Live generation step</strong> — this output requires running the tool. Screenshot to be added in a follow-up session. Run this step to see the result.
</div>
```

### Guide File Export Pattern
All guide files export a named `Content` function (not default export):
```jsx
export function ShortsWorkbenchGuideContent() {
  return ( ... );
}
```

### Existing Section/Step Components (reuse in all guides)
Find these in the existing guide files — copy the component definitions at the top of whichever guide you're editing. They use `useState` for expand/collapse and consistent Tailwind styling.

---

## Phase 1 — Priority Guides (run sequentially, approve before Phase 2)

---

### Task 1: Shorts Workbench Guide

**Files:**
- Modify: `src/pages/ShortsWorkbenchGuidePage.jsx`

This is the reference implementation. Be maximally detailed. Later tasks follow the same pattern.

**Screenshots to capture (in order):**

| # | File name | What to show | Highlight |
|---|-----------|-------------|-----------|
| 01 | `01-workbench-overview.jpg` | `/shorts/workbench` full page, 5 step badges visible | Nothing (overview) |
| 02 | `02-niche-selector.jpg` | Step 1 open, niche grid showing categories | "AI/Tech News" niche card |
| 03 | `03-topic-funnel.jpg` | Topic funnel expanded (Category → Angle → Hook levels) | "Hook" level button |
| 04 | `04-generate-ideas.jpg` | Ideas/topic suggestion area | "Generate Ideas" button |
| 05 | `05-script-generated.jpg` | Script text rendered after generation | Script text area |
| 06 | `06-voice-selector.jpg` | Voice grid showing Gemini TTS voices | One voice card |
| 07 | `07-speed-control.jpg` | Speed slider at 1.15x | Speed slider |
| 08 | `08-sfx-controls.jpg` | SFX toggle + volume + preview button visible | SFX toggle |
| 09 | `09-timing-overview.jpg` | Step 2 (Timing) open, block grid visible | "Generate Music" button |
| 10 | `10-timing-blocks.jpg` | Timing blocks detail — narration aligned to clip durations | Individual block |
| 11 | `11-music-panel.jpg` | Music generation section with mood indicator | Music regenerate button |
| 12 | `12-keyframes-grid.jpg` | Step 3 (Keyframes/Frames) — scene cards visible | "Generate All" button |
| 13 | `13-style-grid.jpg` | StyleGrid modal/panel open, style cards visible | A style card |
| 14 | `14-reference-image.jpg` | Reference image input showing 3 source options | "From Library" option |
| 15 | `15-clips-panel.jpg` | Step 4 (Clips) — model selector visible | Model dropdown |
| 16 | `16-flf-mode.jpg` | FLF mode selected, two keyframe slots per scene visible | FLF label/badge |
| 17 | `17-motion-transfer.jpg` | Motion Transfer option in Step 4 | Motion Transfer toggle/button |
| 18 | `18-avatar-mode.jpg` | Avatar Split-Screen toggle visible | Avatar mode toggle |
| 19 | `19-assembly-panel.jpg` | Step 5 (Assembly) — caption style selector visible | Caption dropdown |
| 20 | `20-quality-gate.jpg` | Quality Review Gate panel (post-assembly) — scene pass/fail | Repair button |
| 21 | `21-topic-discovery.jpg` | Topic discovery UI — scored topic cards with trending/competition badges visible | A topic card with score badge |
| 22 | `22-batch-queue.jpg` | `/shorts/batch` page — topic discovery phase | "Add to Batch" button |
| 23 | `23-production-queue.jpg` | `/queue` page — Autopilot controls visible | Autopilot toggle |
| 24 | `24-repurpose-panel.jpg` | RepurposePanel — multi-platform repurposing options visible | Platform selector or "Repurpose" button |
| 25 | `25-publish-queue.jpg` | `/publish` Publish Queue page — timeline strip with scheduled posts visible | A scheduled post card |

- [ ] **Step 1: Log into Chrome and navigate to Shorts Workbench**

```
Navigate: https://stitchstudios.app
Log in: stuartr@sewo.io / Ilovelife2021)
Navigate: https://stitchstudios.app/shorts/workbench
```

- [ ] **Step 2: Take screenshots 01–08 (Step 1: Script & Voice)**

For each screenshot in the table:
1. Navigate to the correct page/state
2. Inject highlight (see shared pattern above)
3. Capture screenshot
4. Remove highlight
5. Save screenshot locally with filename from table

- [ ] **Step 3: Take screenshots 09–11 (Step 2: Timing & Music)**

Navigate to Step 2 in the workbench. The timing step requires a script + voiceover to exist. If the step is locked/disabled, document the UI state that is visible and add a placeholder for the generated timing view.

- [ ] **Step 4: Take screenshots 12–14 (Step 3: Keyframes)**

Navigate to Step 3. Capture the frame grid. Open StyleGrid and capture. Show reference image options.

- [ ] **Step 5: Take screenshots 15–18 (Step 4: Clips)**

Navigate to Step 4. Open model selector dropdown. Show FLF mode. Show Motion Transfer panel. Show Avatar mode toggle.

- [ ] **Step 6: Take screenshots 19–20 (Step 5: Assembly)**

Navigate to Step 5. Show caption selector. Quality Review Gate requires a completed assembly — use placeholder if not available.

- [ ] **Step 7: Take screenshots 21–25 (Topic Discovery + Advanced Workflows)**

- Screenshot 21: Navigate to the topic discovery section in Step 1 of the workbench. The topic research agent runs a multi-query search and returns scored topic cards with trending/competition badges. Capture the scored card list with badges visible.
- Screenshot 22: Navigate to `/shorts/batch`. Capture the Batch Queue page.
- Screenshot 23: Navigate to `/queue`. Capture the Production Queue / Autopilot page.
- Screenshot 24: Find the RepurposePanel (accessible from a completed Shorts draft or batch results). Capture the multi-platform options.
- Screenshot 25: Navigate to `/publish`. Capture the Publish Queue timeline strip page.

- [ ] **Step 8: Upload all screenshots to Supabase**

Upload each file to `media/learn/shorts/NN-filename.jpg`.
Collect all CDN URLs into a list before writing the guide.

- [ ] **Step 9: Rewrite `src/pages/ShortsWorkbenchGuidePage.jsx`**

Structure (keep existing `Section`, `Step`, `Tip`, `Warning`, `InfoBox` components):

```
export function ShortsWorkbenchGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-[#07393C] to-[#2C666E] p-8 text-white">
        <h1>Shorts Workbench</h1>
        <p>Create AI short-form videos in 5 steps...</p>
      </div>

      {/* Overview */}
      <Section title="Overview" defaultOpen>
        <p>Plain English: what the Shorts Workbench is...</p>
        <p>When to use Shorts Workbench vs Storyboards...</p>
        <img [01-workbench-overview] />
      </Section>

      {/* Step 1 */}
      <Section title="Step 1 — Script & Voice">
        <Step number={1} title="Choose your niche">
          Explain niche selection (1 example: AI/Tech News)...
          <img [02-niche-selector] />
        </Step>
        <Step number={2} title="Build your topic">
          Topic funnel — 3 levels: Category → Angle → Hook...
          <img [03-topic-funnel] />
        </Step>
        <Step number={3} title="Generate ideas (optional)">
          Click Generate Ideas to get AI topic suggestions...
          <img [04-generate-ideas] />
          <Tip>Ideas are suggestions only — edit freely.</Tip>
        </Step>
        <Step number={4} title="Generate script">
          ...
          <img [05-script-generated] />
        </Step>
        <Step number={5} title="Select a voice">
          1 example: Puck voice. Speed: 1.15x is the sweet spot...
          <img [06-voice-selector] />
          <img [07-speed-control] />
        </Step>
        <Step number={6} title="Sound Effects (optional)">
          Toggle SFX on/off, set volume...
          <img [08-sfx-controls] />
        </Step>
      </Section>

      {/* Step 2 — DEEP DETAIL */}
      <Section title="Step 2 — Timing & Music">
        [Deep explanation of Whisper timestamps, block alignment, duration solver]
        <img [09-timing-overview] />
        [What each block in the grid represents...]
        <img [10-timing-blocks] />
        [Music generation — niche-aware mood...]
        <img [11-music-panel] />
      </Section>

      {/* Step 3 — DEEP DETAIL */}
      <Section title="Step 3 — Keyframes">
        [What a keyframe is, why it matters...]
        <img [12-keyframes-grid] />
        [LLM prompt synthesis — plain English...]
        [Visual Mood — what it controls...]
        [StyleGrid walkthrough...]
        <img [13-style-grid] />
        [Reference images — 3 ways...]
        <img [14-reference-image] />
      </Section>

      {/* Step 4 — DEEP DETAIL */}
      <Section title="Step 4 — Video Clips">
        [Model selector — which model to pick...]
        <img [15-clips-panel] />
        [FLF vs I2V — clear plain-English comparison table]
        <img [16-flf-mode] />
        [Motion Transfer — WAN 2.2 vs Kling V3 Pro...]
        <img [17-motion-transfer] />
        [Avatar Split-Screen — how to enable, what it produces...]
        <img [18-avatar-mode] />
        [Live generation placeholder for clip output]
      </Section>

      {/* Step 5 */}
      <Section title="Step 5 — Assembly">
        [Captions: word_pop, karaoke_glow, word_highlight, news_ticker — each explained]
        <img [19-assembly-panel] />
        [Quality Review Gate — what it checks, repair button...]
        <img [20-quality-gate] />
        [Live generation placeholder for final output]
      </Section>

      {/* Advanced */}
      <Section title="Topic Research Agent">
        [The topic research agent runs a multi-query search via SearchAPI, scores results by trending + competition, and returns ranked topic cards with badge indicators. Explain what the trending/competition badges mean and how to use them to pick a strong topic.]
        <img [21-topic-discovery] />
        <Tip>High trending + low competition = sweet spot. Pick the top-scored topic unless you have a reason to go specific.</Tip>
      </Section>

      <Section title="Batch Production Queue">
        <img [22-batch-queue] />
        [Phase 1: discover topics, cherry-pick. Phase 2: configure once, fire 2-concurrent jobs. Live progress grid. Results view.]
      </Section>

      <Section title="Multi-Platform Repurposing">
        <img [24-repurpose-panel] />
        [RepurposePanel walkthrough — platform-specific formatting, what gets adapted per platform...]
      </Section>

      <Section title="Full Autopilot">
        <img [23-production-queue] />
        [Autopilot mode — how it works, controls, monitoring...]
      </Section>

      <Section title="Scheduled Publishing">
        [After a Short is complete, schedule it to post automatically. Explain the Publish Queue at /publish — timeline strip, per-platform metadata, how scheduling works.]
        <img [25-publish-queue] />
        <Tip>Schedule at least 15 minutes ahead. The publisher polls every 60 seconds.</Tip>
      </Section>
    </div>
  );
}
```

Use real prose — not skeleton. Every step needs 2–5 sentences of plain English before each screenshot. Include `<Tip>` and `<Warning>` boxes for gotchas.

- [ ] **Step 10: Verify in Chrome**

```
Navigate: https://stitchstudios.app/learn?tab=shorts
Check:
- All screenshots load (no broken images)
- max-w-2xl sizing on images (not full-width)
- No React console errors
- All sections expand/collapse correctly
- Dark mode toggle works (top-right button on /learn)
```

- [ ] **Step 11: Commit**

```bash
git add src/pages/ShortsWorkbenchGuidePage.jsx
git commit -m "feat(learn): rewrite Shorts Workbench guide with screenshots and deep step detail"
```

---

### Task 2: Storyboards Guide

**Files:**
- Modify: `src/pages/StoryboardGuidePage.jsx`

**Screenshots to capture:**

| # | File name | What to show | Highlight |
|---|-----------|-------------|-----------|
| 01 | `01-storyboards-list.jpg` | `/storyboards` list page | "New Storyboard" button |
| 02 | `02-create-name.jpg` | Inline create panel — name field only | Name input field |
| 03 | `03-settings-tab.jpg` | Settings tab full view | Settings tab label |
| 04 | `04-model-dropdown.jpg` | Model dropdown open, all models visible | Dropdown |
| 05 | `05-camera-control.jpg` | CameraControlPanel visible | Camera preset buttons |
| 06 | `06-storyboard-tab-empty.jpg` | Storyboard tab, no frames, Generate Script button | "Generate Script" button |
| 07 | `07-frames-grid.jpg` | Frames grid after script generation | A frame card |
| 08 | `08-frame-detail.jpg` | Frame detail panel open (narration + visual direction fields) | Narration textarea |
| 09 | `09-frame-controls.jpg` | Lock / Split / Delete buttons on a frame | Lock button |
| 10 | `10-production-tab.jpg` | Production tab initial state | "Generate All" button |
| 11 | `11-export-share.jpg` | Export PDF + Share review link buttons | Export PDF button |

- [ ] **Step 1: Log into Chrome and navigate to Storyboards**

```
Navigate: https://stitchstudios.app/storyboards
```

- [ ] **Step 2: Take screenshots 01–11**

Follow the shared screenshot pattern. For screenshot 04 (model dropdown), click the model selector in Settings to open it before capturing.

- [ ] **Step 3: Upload all screenshots to Supabase**

Upload to `media/learn/storyboards/NN-filename.jpg`. Collect CDN URLs.

- [ ] **Step 4: Rewrite `src/pages/StoryboardGuidePage.jsx`**

Chapters:

**Overview** — Storyboard vs Shorts Workbench (comparison table), settings-first flow explained, what "approve for production" means. Screenshot 01.

**Creating a Storyboard** — Name-only creation, what happens next (lands on Settings). Screenshot 02.

**Settings Tab** — Must configure before generating. Duration → scene count relationship. Visual style + mood. Model selection table:

```
| Model          | Mode | Clip Duration | Audio | Best For               |
|----------------|------|---------------|-------|------------------------|
| Veo 3.1        | FLF  | 4s / 6s / 8s | Yes   | Cinematic quality      |
| Veo 3.1 Lite   | FLF  | 4s / 6s / 8s | No*   | Budget, same quality   |
| Kling V3 Pro   | FLF  | 5s / 10s      | Yes   | Premium motion         |
| Kling O3       | FLF  | 5s / 10s      | Yes   | Character consistency  |
| Wan 2.5        | I2V  | 5s            | No    | Fast & affordable      |
| Kling 2.0      | I2V  | 5s / 10s      | No    | Smooth natural motion  |
| Hailuo/MiniMax | I2V  | fixed         | No    | Stylised/animated look |
```
*Veo 3.1 Lite: audio is forced OFF — it defaults on but produces errors.

Screenshots 03, 04. Camera Control Panel. Screenshot 05. Brand kit + character references.

**Storyboard Tab** — Frame grid overview. How AI decides scene count (calculateSceneCount — duration ÷ average clip length, rounded). Screenshots 06, 07. Frame detail panel — edit narration, visual direction, camera per frame. Screenshot 08. Lock/Split/Delete controls. Screenshot 09. Preview image generation per frame. Motion Transfer per frame.

**Production Tab** — Video generation per model (FLF renders first+last frame pair; I2V animates from single keyframe). Screenshot 10. Live generation placeholder. Character Cameos (CharacterPicker). Per-scene repair + reassemble.

**Export & Share** — PDF export, public review link (no auth), approve for production. Screenshot 11.

**Model Gotchas** (Warning boxes, one per model):
- Veo 3.1: white-background reference images cause 422 errors — use Scene Environment or Gray background in Turnaround wizard
- Veo 3.1 Lite: must have `generate_audio: false` sent explicitly (defaults to true and breaks)
- Kling O3: best model for character reference / R2V workflows
- Grok R2V: white backgrounds work fine (unlike Veo)
- All Veo: only accepts 4s, 6s, 8s — other durations cause 422

- [ ] **Step 5: Verify in Chrome**

```
Navigate: https://stitchstudios.app/learn?tab=storyboards
Check: screenshots load, model table renders, dark mode works, no console errors
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/StoryboardGuidePage.jsx
git commit -m "feat(learn): rewrite Storyboards guide with screenshots and per-model detail"
```

---

### Task 3: Deploy Phase 1

- [ ] **Step 1: Push and deploy**

```bash
git push
fly deploy
```

- [ ] **Step 2: Verify live at stitchstudios.app/learn**

Check both `?tab=shorts` and `?tab=storyboards` on the live site.

---

## Phase 2 — Parallel Guides

**IMPORTANT:** Dispatch Tasks 4–11 as parallel sub-agents simultaneously using `superpowers:dispatching-parallel-agents`. Each agent handles exactly one guide. All follow the same pattern as Tasks 1–2.

**No file conflicts:** Each task owns exactly one guide file. No two tasks touch the same file. Task 12 (Brand Kit) is the only task that modifies `LearnPage.jsx` — all other tasks leave it untouched. Safe to run all in parallel.

**Each Phase 2 agent must:**
1. Read the Shared Patterns section at the top of this plan
2. Log into Chrome at stitchstudios.app
3. Navigate to their tool, capture screenshots per their chapter list
4. Upload to `media/learn/<toolname>/`
5. Rewrite their guide JSX file
6. Verify at `/learn?tab=<toolname>`
7. Commit

---

### Task 4: Imagineer Guide (parallel agent)

**Files:** Modify `src/pages/ImagineerGuidePage.jsx`
**Verify at:** `/learn?tab=imagineer`
**Navigate to:** `https://stitchstudios.app/studio` → find the toolbar button with exact text **"Imagineer"** (it's in the top toolbar of the Video Ad Creator). Click it to open the Imagineer modal. If you need to confirm the button exists first:
```javascript
Array.from(document.querySelectorAll('span')).find(el => el.textContent.trim() === 'Imagineer')?.closest('button')
```

**Chapters and screenshots:**

1. **Overview** — T2I vs I2I, when to use each mode, model overview
   - Screenshot: Imagineer modal open showing mode toggle

2. **Text-to-Image Wizard** — 4 steps: Subject → Style → Enhance → Output
   - Screenshot each step (4 screenshots)
   - Highlight: step progression badges

3. **Multi-Style Bulk Create** — selecting multiple styles, what the results grid looks like
   - Screenshot: StyleGrid with multiple selected, `CONCURRENCY=2` note (why it batches)
   - Live generation placeholder for results grid

4. **Image-to-Image Editing** — upload source image, select edit model
   - Screenshot: I2I mode panel with image upload area
   - Screenshot: Model selector showing Nano Banana 2, Seedream, Wavespeed Nano Ultra, Qwen

5. **Multi-Image Composition** — combining multiple images (scene + character)
   - Screenshot: multiple `image_urls` input UI
   - Tip: explicit composition prompts needed ("composite the character into the scene, matching lighting")

6. **Reference Image Analysis** — describe-character feature
   - Screenshot: the analysis result panel

7. **Style Presets** — categories explained (Imagineer has ~86 styles in generate.js, separate from the 123 in StyleGrid)
   - Screenshot: style preset grid

8. **Model Selection Guide** — table:
   ```
   | Model              | Best For                              |
   |--------------------|---------------------------------------|
   | Nano Banana 2      | Fast T2I + multi-image composition    |
   | Seedream v4        | High quality, portraits               |
   | Flux 2 (LoRA)      | Custom style/character LoRA support   |
   | Wavespeed Nano Ultra | I2I blending, fast                  |
   | Qwen Image Edit    | Multi-image synthesis, editing        |
   ```

- [ ] **Step 1:** Log into Chrome, navigate to Imagineer modal
- [ ] **Step 2:** Take all screenshots per chapter list above
- [ ] **Step 3:** Upload to `media/learn/imagineer/`
- [ ] **Step 4:** Rewrite `src/pages/ImagineerGuidePage.jsx`
- [ ] **Step 5:** Verify at `/learn?tab=imagineer`
- [ ] **Step 6:** Commit with message `feat(learn): rewrite Imagineer guide with screenshots`

---

### Task 5: LoRA Training Guide (parallel agent)

**Files:** Modify `src/pages/LoraGuidePage.jsx`
**Verify at:** `/learn?tab=lora`
**Navigate to:** Brand Assets modal (LoRA training UI) — accessible from a camera/assets button in the studio

**IMPORTANT:** Read `api/lib/trainingModelRegistry.js` to get the current complete model list before writing the guide. Use the exact `name` field from each registry entry.

**Chapters and screenshots:**

1. **What is a LoRA?** — plain English: "A LoRA teaches an AI model to recognise a specific character, face, product, or visual style by training on your images. Once trained, you can reference it in any generation."
   - Screenshot: LoRA training wizard Step 1 (upload screen)

2. **All Training Models** — card per model with: name (from registry), best use case, cost, training time estimate, release date. Read the registry for accuracy.
   - Screenshot: model selector dropdown open showing all models

3. **Training Types** — Subject vs Style vs Character — how each affects captioning
   - Screenshot: training type toggle

4. **Image Preparation** — 10–25 images, consistent framing, variety of angles, clean backgrounds
   - Screenshot: image upload grid

5. **AI Auto-Captioning** — what it does, when to enable vs manual captions
   - Screenshot: auto-caption toggle + example caption

6. **Training Configuration** — steps (recommended ranges per model from registry's `stepRange`), learning rate, face masks
   - Screenshot: advanced settings panel expanded

7. **Monitoring Training** — background poller, where to see status, what "COMPLETED" looks like
   - Screenshot: training in progress / completion state (use placeholder if not available)

8. **Using Trained LoRAs** — LoRAPicker in other tools (Imagineer, Storyboards, Ads, Carousel)
   - Screenshot: LoRAPicker component in one tool

9. **Pre-Built LoRA Library** — what it is, how to browse
   - Screenshot: LoRA library panel

10. **Troubleshooting** — common failures: OOM (bump RAM), bad captions, wrong model for content type

- [ ] **Step 1:** Read `api/lib/trainingModelRegistry.js` for exact model names and specs
- [ ] **Step 2:** Log into Chrome, navigate to LoRA training wizard
- [ ] **Step 3:** Take all screenshots
- [ ] **Step 4:** Upload to `media/learn/lora/`
- [ ] **Step 5:** Rewrite `src/pages/LoraGuidePage.jsx` (note: has password gate — keep it, just rewrite content behind it)
- [ ] **Step 6:** Verify at `/learn?tab=lora`
- [ ] **Step 7:** Commit with `feat(learn): rewrite LoRA Training guide with all models and screenshots`

---

### Task 6: Turnaround Sheet Guide (parallel agent)

**Files:** Modify `src/pages/TurnaroundGuidePage.jsx`
**Verify at:** `/learn?tab=turnaround`
**Navigate to:** `https://stitchstudios.app/studio` → find the toolbar button with exact text **"Turnaround"** (same toolbar as Imagineer in the Video Ad Creator — they are independent buttons). Click it to open the Turnaround Sheet Wizard. You do NOT need to open Imagineer first. If you need to confirm:
```javascript
Array.from(document.querySelectorAll('span')).find(el => el.textContent.trim() === 'Turnaround')?.closest('button')
```

**Chapters and screenshots:**

1. **What Are Turnaround Sheets?** — character reference sheets for R2V (Reference-to-Video). Why they matter for video generation consistency.
   - Screenshot: example turnaround sheet output (or wizard landing)

2. **The 6-Step Wizard** — overview of steps: Character → Style & Model → Props → Refinements → Results → Cell Editor
   - Screenshot: wizard step 1 (character description)

3. **All 8 Pose Set Presets** — with grid dimensions and best use case:
   ```
   | Pose Set              | Grid | Cells | Best For                        |
   |-----------------------|------|-------|---------------------------------|
   | Standard 24           | 4×6  | 24    | Complete reference sheets       |
   | Expressions Focus     | 4×6  | 24    | Facial expression variety       |
   | Action Heavy          | 4×6  | 24    | Dynamic poses                   |
   | Fashion/Outfit        | 4×6  | 24    | Clothing/costume design         |
   | Creature/Non-Human    | 4×6  | 24    | Non-humanoid characters         |
   | 3D Reference — Angles | 2×2  | 4     | Orthographic 3D reference       |
   | 3D Reference — Action | 2×2  | 4     | Dynamic 3D reference            |
   | R2V Reference         | 3×2  | 6     | Optimised for video generation  |
   ```
   - Screenshot: pose set selector

4. **Background Modes** — White / Gray (industry standard) / Scene Environment
   - Why Gray: avoids Veo 3.1 white-background 422 errors while providing contrast
   - Screenshot: background mode buttons

5. **R2V Reference Pose Set (Deep Detail)** — 3×2 grid, full body front/3-4/side + matching portrait close-ups
   - Screenshot: R2V Reference pose set selected

6. **Auto-Upscale via Topaz** — what it does, when it runs (edit models only, sync results)
   - Screenshot: results page showing upscaled output (or placeholder)

7. **Cell Editor** — per-cell editing, regeneration
   - Screenshot: cell editor open

8. **Using Turnarounds as R2V References** — Grok R2V (white backgrounds OK) vs Veo 3.1 (Scene Environment required)
   - Warning box: white background + Veo 3.1 = 422 error

- [ ] **Steps 1–6:** Same pattern: screenshots → upload → rewrite → verify → commit
- [ ] **Commit message:** `feat(learn): rewrite Turnaround Sheet guide with pose sets and R2V guidance`

---

### Task 7: Carousel Builder Guide (parallel agent)

**Files:** Modify `src/pages/CarouselGuidePage.jsx`
**Verify at:** `/learn?tab=carousels`
**Navigate to:** `/carousels`

**Chapters and screenshots:**

1. **Overview** — Carousel vs Shorts, platform use cases
   - Screenshot: `/carousels` list page

2. **Creating a Carousel** — multi-platform select, content auto-triggers on create
   - Screenshot: New Carousel modal

3. **Slide Editor** — filmstrip left, detail right, editing individual slides
   - Screenshot: editor with filmstrip visible

4. **Style Templates** — 8 templates, what each controls (scrim, text position, font sizing)
   - Screenshot: style template selector

5. **Style Overrides** — gradient color, gradient density (20–100%), text color, headline/body scale, font family
   - Screenshot: overrides panel

6. **Image Generation** — per-slide AI background, style matching
   - Screenshot: image generation state per slide (or placeholder)

7. **Video Carousel vs Slideshow** — when to use each:
   - Video: animated slides via AI video generation
   - Slideshow: static images assembled into video, supports ElevenLabs voiceover
   - Screenshot: output type selector

8. **AI Music Mood + Rerun Audio** — niche-aware mood, how to regenerate
   - Screenshot: music mood controls

9. **Publishing** — platform dispatch, what each platform expects
   - Screenshot: publish button/options

- [ ] **Steps 1–6:** Same pattern
- [ ] **Commit message:** `feat(learn): rewrite Carousel Builder guide with screenshots`

---

### Task 8: Ads Manager Guide (parallel agent)

**Files:** Modify `src/pages/AdsManagerGuidePage.jsx`
**Verify at:** `/learn?tab=ads`
**Navigate to:** `/ads`

**Chapters and screenshots:**

1. **Overview** — campaign → variations workflow, platform support
   - Screenshot: `/ads` campaigns list

2. **Creating a Campaign** — name, product description, landing URL, target audience, objective, platform select
   - Screenshot: new campaign form

3. **AI Product Description (Auto-fill)** — "Auto-fill with AI" collapsible panel, URL + Brand Kit options
   - Screenshot: Auto-fill panel expanded showing URL input + Brand Kit dropdown + "Generate Description" button highlighted

4. **Platform-Specific Copy Generation** — what each platform gets:
   - LinkedIn: 3 variations (introText, headline, description, CTA)
   - Google RSA: 15 headlines + 4 descriptions
   - Meta: 3 variations (primaryText, headline, description, CTA)
   - Screenshot: generated variations for one platform

5. **Per-Variation Workflow** — approve/reject/delete, inline editing
   - Screenshot: variation card with approve/reject buttons highlighted

6. **Ad Cloning (AdCloneModal)** — what it does: duplicate a campaign with new creative variants
   - Screenshot: AdCloneModal open

7. **Split Testing** — duplicate vs AI angle (high temperature re-generation)
   - Screenshot: split test options

8. **Image Regeneration with StyleGrid** — 123 styles, style_preset passed to regenerate endpoint
   - Screenshot: StyleGrid in context of an ad variation

9. **Google RSA Tools** — CSV export for Google Ads Editor, ad strength meter, pin-to-position
   - Screenshot: RSA-specific controls

10. **UTM Tracking Builder** — per-variation UTM with platform auto-fill presets
    - Screenshot: UTM builder panel

11. **Download Creatives ZIP** — what gets included, how to use the download
    - Screenshot: Download Creatives button highlighted

12. **Platform API Status** — what's live vs pending (informational table, no screenshots needed)

- [ ] **Steps 1–6:** Same pattern
- [ ] **Commit message:** `feat(learn): rewrite Ads Manager guide with Ad Cloning, AI description, and screenshots`

---

### Task 9: LinkedIn Tool Guide (parallel agent)

**Files:** Modify `src/pages/LinkedInGuidePage.jsx`
**Verify at:** `/learn?tab=linkedin`
**Navigate to:** `/linkedin`

**Chapters and screenshots:**

1. **Overview** — Two-panel layout: topic queue (left) + post feed (right)
   - Screenshot: `/linkedin` full page

2. **Topic Discovery** — keyword search vs paste URL, scoring explained (GPT + Exa)
   - Screenshot: search bar + scored topic cards

3. **Post Generation** — 3 variations, writing style/brand kit/image layout selectors
   - Screenshot: LinkedInCreateModal or post creation panel

4. **Image Generation** — Satori compositor, branded 1080×1080, layout templates
   - Screenshot: generated post with image visible (or image generation state)

5. **Post Editor** — style controls: layout, gradient color, font family, headline/body size
   - Screenshot: `/linkedin/:id` post editor with controls visible

6. **Recompose Without Regenerating** — `base_image_url` + `/recompose` — change style at zero cost
   - Screenshot: recompose button highlighted

7. **Publishing** — OAuth connection required, publish flow
   - Screenshot: publish button / connection status

8. **Downloading Creatives** — download image for external use
   - Screenshot: download button

- [ ] **Steps 1–6:** Same pattern
- [ ] **Commit message:** `feat(learn): rewrite LinkedIn Tool guide with screenshots`

---

### Task 10: Motion Transfer Guide (parallel agent)

**Files:** Modify `src/pages/MotionTransferGuidePage.jsx`
**Verify at:** `/learn?tab=motion`
**Navigate to:** `/studio` → open a video → Motion Transfer option

**Chapters and screenshots:**

1. **What Is Motion Transfer?** — apply motion from a reference video to a new image/scene
   - Screenshot: MotionReferenceInput component

2. **Two Models Compared:**
   ```
   | Model                    | Cost    | What It Controls           |
   |--------------------------|---------|----------------------------|
   | WAN 2.2                  | Budget  | Motion pattern transfer     |
   | Kling V3 Pro Motion Ctrl | Premium | Orientation + motion ctrl   |
   ```
   - Screenshot: model selector for Motion Transfer

3. **VideoTrimmer** — range slider for selecting which segment of the reference video to use
   - Screenshot: VideoTrimmer component with range handles visible

4. **MotionReferenceInput Walkthrough** — upload or URL, trim, confirm
   - Screenshot: MotionReferenceInput with video loaded

5. **In Shorts Workbench (Step 4)** — how to enable Motion Transfer mode vs FLF/I2V
   - Screenshot: Step 4 with Motion Transfer option visible

6. **In Storyboards (Frame Detail)** — per-frame Motion Transfer override
   - Screenshot: Storyboard frame detail panel with MT option

7. **Best Reference Videos** — what works: clear subject motion, consistent camera, no jump cuts; what doesn't: handheld, multiple subjects, extreme lighting changes
   - Tip boxes (no screenshots needed)

- [ ] **Steps 1–6:** Same pattern
- [ ] **Commit message:** `feat(learn): rewrite Motion Transfer guide with screenshots`

---

### Task 11: Video Production Guide (parallel agent)

**Files:** Modify `src/pages/VideoProductionGuidePage.jsx`
**Verify at:** `/learn?tab=video`
**Navigate to:** `/studio`

**Chapters and screenshots:**

1. **Overview** — what the Video Ad Creator / Studio covers vs Shorts Workbench
   - Screenshot: `/studio` page overview

2. **Video Analysis / Remix (VideoAnalyzerModal)** — upload a video, get AI analysis, remix options
   - Screenshot: VideoAnalyzerModal open with upload state

3. **JumpStart Studio** — 6 operations explained:
   - Generate: image → video (model selector, aspect ratio, duration)
   - Result: polling / async result
   - Save-Video: persist to library
   - Edit: restyle/refinement (Kling O3 V2V)
   - Extend: add length (Seedance 1.5 Pro / Veo 3.1 Fast / Grok Imagine)
   - Erase: inpainting
   - Screenshot: JumpStart modal showing operation tabs

4. **Model Selector Guide** — all video models, when to use each (read `api/lib/modelRegistry.js` for current list)
   - Screenshot: model dropdown open

5. **Extend Options Deep-Dive:**
   ```
   | Model              | Provider  | Range  | Notes                              |
   |--------------------|-----------|--------|------------------------------------|
   | Seedance 1.5 Pro   | Wavespeed | 4–12s  | Most flexible range                |
   | Veo 3.1 Fast Extend| FAL       | fixed 7s | High quality, fixed duration      |
   | Grok Imagine Extend| FAL       | 2–10s  | Input must be MP4 H.264/265/AV1    |
   ```
   - Screenshot: extend controls with model selector

6. **Edit and Erase Tools** — what Kling O3 V2V does, inpainting workflow
   - Screenshot: edit/erase controls

7. **Autopilot Pipeline** — article → video automated pipeline (workflow engine)
   - Screenshot: `/queue` Production Queue page

- [ ] **Steps 1–6:** Same pattern
- [ ] **Commit message:** `feat(learn): rewrite Video Production guide with analysis, JumpStart, and screenshots`

---

### Task 12: Brand Kit Guide — NEW FILE (parallel agent)

**Files:**
- Create: `src/pages/BrandKitGuidePage.jsx`
- Modify: `src/pages/LearnPage.jsx`

**Verify at:** `/learn?tab=brandkit`
**Navigate to:** Settings or Studio → Brand Kit modal (BrandKitModal.jsx)

- [ ] **Step 1: Log into Chrome, open Brand Kit modal**

The Brand Kit modal is accessed from within other tools. Navigate to `/studio` or find the Brand Kit button in the sidebar/header.

- [ ] **Step 2: Take screenshots**

| # | File name | What to show | Highlight |
|---|-----------|-------------|-----------|
| 01 | `01-brand-kit-modal.jpg` | Brand Kit modal open — full view | Modal header |
| 02 | `02-auto-fill-methods.jpg` | PDF upload button + URL input field visible | "Extract from URL" button |
| 03 | `03-url-extraction.jpg` | URL extraction in progress or result | URL input field |
| 04 | `04-manual-fields.jpg` | Core fields: name, tagline, colors, voice | Brand name field |
| 05 | `05-logo-upload.jpg` | Logo upload area + background removal option | Logo upload button |
| 06 | `06-visual-style.jpg` | Visual style / mood / lighting fields | Style preset dropdown |

- [ ] **Step 3: Upload to `media/learn/brand-kit/`**

- [ ] **Step 4: Create `src/pages/BrandKitGuidePage.jsx`**

```jsx
import React, { useState } from 'react';
// ... (copy Section/Step/Tip/Warning components from an existing guide)

export function BrandKitGuideContent() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-[#07393C] to-[#2C666E] p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Brand Kit</h1>
        <p className="text-white/80">Set up your brand once. Use it everywhere.</p>
      </div>

      {/* Overview */}
      <Section title="What Is Brand Kit?" defaultOpen>
        <p>Brand Kit stores your brand identity (name, logo, colors, voice, visual style) in one place.
           Once configured, it feeds automatically into Ads Manager, LinkedIn posts, Carousels, Storyboards,
           and image generation — so everything you create stays on-brand without manual setup.</p>
        <img [01-brand-kit-modal] />
      </Section>

      {/* Creating a Brand Kit */}
      <Section title="Creating a Brand Kit">
        <Step number={1} title="Open Brand Kit">
          [Where to find Brand Kit — button location in sidebar/studio/settings]
        </Step>
        [3 auto-fill methods section]
        <img [02-auto-fill-methods] />

        <Step number={2} title="Auto-fill from URL (fastest)">
          Paste your website URL → Stitch scrapes it via Firecrawl and populates all fields automatically.
          <img [03-url-extraction] />
          <Tip>Works best on marketing/about pages. Product pages with heavy JavaScript may return limited content.</Tip>
        </Step>

        <Step number={3} title="Auto-fill from PDF">
          Upload brand guidelines PDF → GPT-4.1-mini extracts name, tagline, colors, voice, and visual direction.
        </Step>

        <Step number={4} title="Manual setup">
          Fill fields directly. Core fields:
          <img [04-manual-fields] />
        </Step>
      </Section>

      {/* Field-by-field guide */}
      <Section title="Field Guide">
        [Every field explained: brand_name, blurb, website, taglines, target_market,
         brand_personality, brand_voice_detail, voice_style, content_style_rules,
         preferred_elements, prohibited_elements, colors, style_preset, visual_style_notes,
         mood_atmosphere, lighting_prefs, composition_style, ai_prompt_rules]
        <img [04-manual-fields] />
        <img [06-visual-style] />
      </Section>

      {/* Logo */}
      <Section title="Logo & Background Removal">
        <img [05-logo-upload] />
        [Upload logo, automatic background removal via AI]
      </Section>

      {/* How it feeds into other tools */}
      <Section title="Brand Kit in Other Tools">
        [Table: which fields each tool uses]
        | Tool          | Fields Used                                        |
        |---------------|----------------------------------------------------|
        | Ads Manager   | name, tagline, target_market, logo, colors         |
        | LinkedIn      | name, voice_style, brand_personality               |
        | Carousel      | name, colors, style_preset, logo                   |
        | Storyboards   | brand as context for visual director               |
        | LoRA Training | — (LoRA is linked to brand_kit via brand_loras)    |
      </Section>

      {/* SEWO Connect */}
      <Section title="SEWO Connect">
        [Pulls brand data from Doubleclicker shared tables — for SEWO users only]
      </Section>
    </div>
  );
}
```

- [ ] **Step 5: Add Brand Kit tab to `src/pages/LearnPage.jsx`**

Read LearnPage.jsx first. Then make exactly these changes:

```jsx
// 1. Add BookOpen to existing lucide-react import (it may already be imported)

// 2. Add to TABS array after the 'flows' entry:
{ id: 'brandkit', label: 'Brand Kit', Icon: BookOpen },

// 3. Add import after existing guide imports:
import { BrandKitGuideContent } from './BrandKitGuidePage';

// 4. Add conditional block after the flows block (before closing </div>):
{activeTab === 'brandkit' && (
  <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-850 min-h-full">
    <BrandKitGuideContent />
  </div>
)}
```

- [ ] **Step 6: Verify in Chrome**

```
Navigate: https://stitchstudios.app/learn?tab=brandkit
Check: new tab visible in tab bar, guide content renders, screenshots load, no console errors
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/BrandKitGuidePage.jsx src/pages/LearnPage.jsx
git commit -m "feat(learn): add Brand Kit guide with screenshots and LearnPage tab"
```

---

### Task 13: Deploy Phase 2

After all Phase 2 agents complete:

- [ ] **Step 1: Merge all commits and push**

```bash
git log --oneline -20  # verify all guide commits are present
git push
```

- [ ] **Step 2: Deploy**

```bash
fly deploy
```

- [ ] **Step 3: Verify all 11 guides on live site**

Navigate to each tab on `stitchstudios.app/learn` and confirm:
- All tabs visible in tab bar (including new Brand Kit tab)
- Screenshots load (no broken images)
- Dark mode toggle works on each guide
- No JavaScript console errors on any guide

---

## Plan Review Loop

After writing this plan, dispatch plan-document-reviewer subagent with:
- Plan path: `docs/superpowers/plans/2026-04-04-learn-hub-walkthroughs.md`
- Spec path: `docs/superpowers/specs/2026-04-04-learn-hub-walkthroughs-design.md`
