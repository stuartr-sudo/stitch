# Learn Hub Walkthroughs — Design Spec

**Date:** 2026-04-04
**Status:** Draft
**Goal:** Rewrite all 11 tool guides in `/learn` with real UI screenshots, hyper-detailed step-by-step walkthroughs, click-target highlights, and full coverage of every feature including all recent additions (8 new features: Camera Control, Video Analysis/Remix, Character Cameos, Batch Queue, Multi-Platform Repurposing, Full Autopilot, Ideas, Ad Cloning — plus Motion Transfer, Quality Review Gate, Avatar Split-Screen, LoRA upgrades, Turnaround improvements, etc.).

---

## Problem

The existing guides are text-only and incomplete. Users — particularly new ones — cannot follow them confidently. Steps 2–5 of the Shorts Workbench (Timing, Keyframes, Clips, Assembly), the entire Storyboard model-selection flow, and 8 recently shipped features (Camera Control, Video Analysis/Remix, Character Cameos, Batch Queue, Multi-Platform Repurposing, Full Autopilot, Ideas, Ad Cloning) are either missing or minimally described. The result is user confusion and overwhelm.

## Solution

Replace all guides with screenshot-rich, step-by-step walkthroughs using real browser screenshots of `stitchstudios.app`. Each screenshot has highlighted click targets (glowing amber pulse injected via JavaScript). Guides are reorganised as chapters — one per major workflow phase — with every variation documented.

---

## Architecture

### Screenshot Pipeline (per agent)

1. Open Chrome via **Claude in Chrome MCP** (`mcp__Claude_in_Chrome__*` tools)
2. Navigate to `https://stitchstudios.app`
3. Log in: `stuartr@sewo.io` / `Ilovelife2021)`
4. Navigate to the tool's page
5. For each screenshot step:
   - Use `javascript_tool` to inject a highlight pulse on the target element.

     **Selector strategy:** Most elements in this React/Tailwind app have no stable `data-*` attributes. Use this priority order:
     1. `aria-label`: `document.querySelector('[aria-label="Generate Script"]')`
     2. Button text match: `Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Generate Script')`
     3. Heading/label text: `Array.from(document.querySelectorAll('h3,label')).find(el => el.textContent.includes('Visual Style'))`
     4. Class + position: last resort only

     ```javascript
     // Example: highlight a button by text
     const el = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().includes('Generate'));
     if (el) {
       const rect = el.getBoundingClientRect();
       const overlay = document.createElement('div');
       overlay.id = '__stitch_highlight__';
       overlay.style.cssText = `
         position: fixed;
         left: ${rect.left + rect.width/2 - 20}px;
         top: ${rect.top + rect.height/2 - 20}px;
         width: 40px; height: 40px;
         border-radius: 50%;
         background: rgba(245, 158, 11, 0.35);
         border: 3px solid #f59e0b;
         box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.2);
         z-index: 99999;
         pointer-events: none;
       `;
       document.body.appendChild(overlay);
     }
     ```
   - Take screenshot via `upload_image` or screen capture
   - Remove the overlay: `document.getElementById('__stitch_highlight__')?.remove()`
6. Upload each screenshot to Supabase storage bucket `media` at path `learn/<toolname>/NN-description.jpg`
7. Collect all CDN URLs into a manifest for the guide rewrite

### Guide Rewrite (per agent)

- Rewrite the existing `src/pages/*GuidePage.jsx` (or create new for Brand Kit)
- Keep existing `Section`, `Step`, `Tip`, `Warning`, `InfoBox`, `Badge` component structure
- Add screenshots after each step description:
  ```jsx
  <img
    src="https://uscmvlfleccbctuvhhcj.supabase.co/storage/v1/object/public/media/learn/toolname/NN-description.jpg"
    alt="Descriptive alt text"
    className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 shadow-lg my-4"
  />
  ```
- For steps requiring live generation (video renders, model outputs), insert:
  ```jsx
  <div className="max-w-2xl mx-auto my-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
    📸 <strong>Live generation step</strong> — screenshot to be added. Run this step yourself to see the output.
  </div>
  ```

### Screenshot Storage

- **Bucket:** `media` (existing, public)
- **Path pattern:** `learn/<toolname>/NN-step-description.jpg`
- **Examples:**
  - `learn/shorts/01-niche-selection.jpg`
  - `learn/storyboards/03-settings-tab.jpg`
  - `learn/brand-kit/02-url-extraction.jpg`

### Click Highlight Style

Amber glowing circle (40px diameter) centered on the target element. Injected before screenshot, removed after. Consistent across all guides.

### Image Sizing in Guides

```jsx
className="max-w-2xl mx-auto block rounded-xl border border-zinc-200 shadow-lg my-4"
```
Contained at 672px max-width, centered, with rounded corners and subtle shadow. Never full-width.

---

## Execution Plan

### Phase 1 — Priority Guides (sequential, review before Phase 2)

#### Guide 1: Shorts Workbench (`src/pages/ShortsWorkbenchGuidePage.jsx`)
Route: `/learn?tab=shorts`

**Chapters:**

**Overview** — What the Shorts Workbench is, when to use it vs other tools, the 5-step pipeline summary

**Step 1 — Script & Voice** *(the workbench's `script` step — niche, topic, and script are all here)*
- Niche selector (1 example shown — AI/Tech News)
- Topic funnel: Category → Angle → Hook
- Topic research option
- Ideas (Generate Ideas button at `/api/workbench/generate-ideas`) — plain-English explanation of what it produces, not called "Ideas Agent" in the UI
- Script generation: what the AI produces, how to edit
- Voice selection: 1 example voice (Gemini TTS)
- Speed control: what 1.15x means, pacing effect
- Niche-aware voice style presets
- Sound Effects (SFX): toggle, volume, preview

**Step 2 — Timing & Music (DEEP DETAIL)** *(workbench `timing` step)*
- What Whisper timestamps are and why they matter
- What "block alignment" means in plain English — how Stitch snaps narration blocks to video clip durations
- Duration solver — what it is, how it optimises scene lengths automatically
- Reading the timing grid — what each block represents
- Music generation: niche-aware mood, how to regenerate, volume control
- Rerun audio option
- How to manually adjust timing if something looks wrong

**Step 3 — Keyframes (DEEP DETAIL)** *(workbench `frames` step)*
- What a keyframe is and why it matters for video quality
- The LLM prompt synthesis step — what it does (narration + visual mood → single image prompt, not concatenation)
- Visual Mood panel — what it controls and how it affects output
- StyleGrid — how to pick a visual style, what each category does
- Per-scene reference images — 3 ways: from Library, from URL, from previous scene frame
- ReferenceImageInput component walkthrough
- LibraryModal walkthrough
- Image regeneration per scene
- Locking a keyframe

**Step 4 — Video Clips (DEEP DETAIL)** *(workbench `clips` step)*
- FLF (First-Last-Frame) mode — which models use it (Veo 3.1, Veo 3.1 Lite, Kling V3, Kling O3), how it works
- I2V (Image-to-Video) mode — which models use it (Wan 2.5, Kling 2.0, Hailuo, etc.), how it works
- Motion Transfer — third generation mode:
  - WAN 2.2 (budget) — what it does, how to upload a reference video, VideoTrimmer usage
  - Kling V3 Pro Motion Control (premium) — orientation control explained
  - When to use Motion Transfer vs FLF/I2V
- Character Cameos — CharacterPicker walkthrough, what it does to generation
- Avatar Split-Screen Mode:
  - What it is (talking head bottom 40%, B-roll top 60%)
  - How to enable it
  - Portrait → I2V → loop → lip-sync pipeline explained
  - Best practices for portrait photos
- Audio toggle per model (which models support generate_audio)
- Per-scene regeneration

**Step 5 — Assembly** *(workbench `assembly` step)*
- Caption selection — all styles explained (word_pop, karaoke_glow, word_highlight, news_ticker)
- Music volume control
- What the final assembly step does (FFmpeg composition)
- Quality Review Gate — what it checks, how to read the results, Repair button
- Download output

**Advanced Workflows**

*Batch Production Queue*
- What the Batch Queue is (`/shorts/batch`)
- Phase 1: discover topics, cherry-pick
- Phase 2: configure once, fire 2-concurrent jobs
- Live progress grid
- Batch results + scheduling

*Multi-Platform Repurposing*
- RepurposePanel walkthrough
- Platform-specific formatting

*Full Autopilot*
- Production Queue at `/queue`
- How Autopilot mode works
- Controls and monitoring

**Video Generation — Live Steps** (callout box listing)
- Step 5 clip generation (all models)
- Avatar lip-sync
- Assembly render
*These steps require active generation — screenshot to be added per model.*

---

#### Guide 2: Storyboards (`src/pages/StoryboardGuidePage.jsx`)
Route: `/learn?tab=storyboards`

**Chapters:**

**Overview** — Storyboard vs Shorts Workbench (when to use each), the settings-first flow, what "approve for production" means

**Creating a Storyboard**
- Name-only creation (no frames pre-created)
- What happens after creation — lands on Settings tab

**Settings Tab (must be right before generating)**
- Duration options — how they affect scene count
- Visual style selection
- Mood selection
- Model selection (THIS IS CRITICAL):

  | Model | Type | Duration | Audio | Best For |
  |-------|------|----------|-------|----------|
  | Veo 3.1 | FLF | 4/6/8s | Yes | Cinematic quality |
  | Veo 3.1 Lite | FLF | 4/6/8s | No (force false) | Budget quality |
  | Kling V3 Pro | FLF | 5/10s | Yes | Asian aesthetic |
  | Kling O3 | FLF | 5/10s | Yes | Character ref |
  | Wan 2.5 | I2V | 5s | No | Fast/affordable |
  | Kling 2.0 | I2V | 5/10s | No | Smooth motion |
  | Hailuo/MiniMax | I2V | fixed | No | Stylised |

- Brand kit selection
- Character references
- Camera Control — per-scene camera config system (CameraControlPanel)

**Storyboard Tab**
- Frame grid overview
- Generating script — what happens (Stage 1 narrative → Stage 2 visual director)
- How `calculateSceneCount()` works — AI decides scene count based on duration
- Frame detail panel — editing narration, visual direction, camera
- Locking a scene (prevents regeneration)
- Splitting a scene (halves duration)
- Deleting a scene (renumbers + recalculates timestamps)
- Generating preview images per frame
- Motion Transfer integration per frame

**Production Tab**
- Video generation status
- What FLF vs I2V does per model (explained again in context)
- Character Cameos — CharacterPicker
- Per-scene repair
- Reassemble

**Export & Share**
- PDF export
- Public review link (no auth required)
- Approving for production

**Model-Specific Gotchas** (callout box per model)
- Veo 3.1: white backgrounds fail (use Scene Environment in turnaround), accepts 4/6/8s only
- Grok R2V: white backgrounds work fine
- Kling O3: best for character reference workflows
- Veo 3.1 Lite: must force `generate_audio: false`

---

### Phase 2 — Parallel Guides (8 agents simultaneously)

#### Guide 3: Imagineer (`src/pages/ImagineerGuidePage.jsx`)
Route: `/learn?tab=imagineer`

**Chapters:** Overview, Text-to-Image wizard (4 steps), Image-to-Image editing, Multi-style bulk create, Multi-image composition, Reference image analysis, Style presets (categories explained), Model selection guide (Nano Banana 2, Seedream v4, Flux 2, Wavespeed Nano Ultra, Qwen Image Edit)

---

#### Guide 4: LoRA Training (`src/pages/LoraGuidePage.jsx`)
Route: `/learn?tab=lora`

**Chapters:** What a LoRA is (plain English), All training models with descriptions + best-use-cases + release dates, Subject vs Style vs Character training types, Image preparation guide, AI auto-captioning, Training configuration (steps, learning rate, face masks), Monitoring training, Using trained LoRAs in other tools, Pre-built LoRA library, Troubleshooting common failures

**Models to cover:** Read `api/lib/trainingModelRegistry.js` at implementation time to get the current complete list — do not hardcode model names here. As of April 2026 this includes Flux variants, Wan variants, Qwen variants, Z-Image variants, Hunyuan Video, FLUX.2 Klein 4B, and FLUX.2 Klein 9B. Use the exact `name` field from each registry entry.

---

#### Guide 5: Turnaround Sheet (`src/pages/TurnaroundGuidePage.jsx`)
Route: `/learn?tab=turnaround`

**Chapters:** What turnaround sheets are (R2V workflow explained), 6-step wizard walkthrough, All 8 pose set presets (with grid dimensions), Background modes (White/Gray/Scene — why Gray is industry standard), Auto-upscale via Topaz, R2V Reference pose set (3x2 grid) — specifically for video generation, Cell editor, Using turnarounds as R2V references (Grok vs Veo compatibility)

---

#### Guide 6: Carousel Builder (`src/pages/CarouselGuidePage.jsx`)
Route: `/learn?tab=carousels`

**Chapters:** Overview, Creating a carousel (multi-platform), Content generation pipeline (auto-triggers), Slide editor, Style templates (8 templates), Style overrides (gradient, density, text color, font), Image generation per slide, Video Carousel vs Slideshow (with voiceover), AI music mood + rerun audio, Publishing per platform

---

#### Guide 7: Ads Manager (`src/pages/AdsManagerGuidePage.jsx`)
Route: `/learn?tab=ads`

**Chapters:** Overview, Creating a campaign, AI Product Description (Auto-fill panel — URL + Brand Kit), Platform-specific copy generation (LinkedIn, Google RSA, Meta), Per-variation workflow (approve/reject/edit), Ad Cloning (AdCloneModal) — what it does and when to use it, Split testing (duplicate vs AI angle), Image regeneration with StyleGrid, Google RSA — CSV export, ad strength meter, pin-to-position, UTM tracking builder, Download Creatives ZIP, Platform API status (what's live vs pending)

---

#### Guide 8: LinkedIn Tool (`src/pages/LinkedInGuidePage.jsx`)
Route: `/learn?tab=linkedin`

**Chapters:** Topic discovery (keyword search + URL paste), Scoring explained, Post generation (3 variations), Image generation (Satori compositor), Post editor controls (layout, gradient, font, headline/body size), Recompose without regenerating image, Publishing, Downloading creatives

---

#### Guide 9: Motion Transfer (`src/pages/MotionTransferGuidePage.jsx`)
Route: `/learn?tab=motion`

**Chapters:** What Motion Transfer is, WAN 2.2 vs Kling V3 Pro Motion Control, VideoTrimmer usage, MotionReferenceInput walkthrough, Integration in Shorts Workbench (Step 5), Integration in Storyboards (frame detail), Best reference videos (what works, what doesn't)

---

#### Guide 10: Video Production (`src/pages/VideoProductionGuidePage.jsx`)
Route: `/learn?tab=video`

**Chapters:** Overview, Video Analysis / Remix (VideoAnalyzerModal) — upload a video, get analysis, remix options, JumpStart studio (all 6 endpoints: generate, result, save-video, edit, extend, erase), Model selector guide, Extend options (Seedance 1.5 Pro, Veo 3.1 Fast, Grok Imagine Extend), Edit and Erase tools, Autopilot pipeline

---

#### Guide 11: Brand Kit (`src/pages/BrandKitGuidePage.jsx`) — NEW
Route: `/learn?tab=brandkit` (new tab to add to LearnPage)

**Chapters:** What Brand Kit is and why it matters, Creating a Brand Kit, 3 auto-fill methods (PDF upload, URL extraction via Firecrawl, SEWO Connect), Manual field-by-field guide (name, tagline, colors, voice, visual style, etc.), Logo upload + background removal, How Brand Kit feeds into other tools (Ads, LinkedIn, Carousel, Storyboard), Managing multiple brand kits

---

## New Tab Registration

`src/pages/LearnPage.jsx` needs one new tab added. LearnPage uses conditional JSX blocks (not a switch/case). Read the file first to confirm the exact pattern, then follow it. Expected pattern:

```javascript
// 1. Add to TABS array (check exact shape of existing entries — may use Icon not icon):
{ id: 'brandkit', label: 'Brand Kit', Icon: BookOpen }

// 2. Add named export to BrandKitGuidePage.jsx:
export function BrandKitGuideContent() { ... }

// 3. Add import to LearnPage.jsx:
import { BrandKitGuideContent } from './BrandKitGuidePage';

// 4. Add conditional block in the content section (matching surrounding pattern):
{activeTab === 'brandkit' && (
  <div className="bg-gray-50 dark:bg-gray-900 min-h-full">
    <BrandKitGuideContent />
  </div>
)}
```

**Important:** Read `LearnPage.jsx` before making changes — match the exact import and conditional render pattern used by the other 11 guide tabs.

---

## Video Generation Steps — Do Not Auto-Screenshot

The following steps require active generation. Agents will insert placeholder callout boxes. These will be captured in a follow-up session:

**Shorts Workbench:**
- Step 4: Any video clip generation (all models)
- Step 4: Avatar lip-sync output
- Step 5: Assembly render + Quality Review Gate results
- Batch Queue: progress grid mid-run

**Storyboards:**
- Production tab: video generation in progress (any model)
- Per-scene repair in progress

**Video Production:**
- Any JumpStart generation result
- Extend output

**Imagineer:**
- Multi-style bulk create results grid

**LoRA Training:**
- Training progress screen
- Training completion screen

---

## Files Modified / Created

| File | Action |
|------|--------|
| `src/pages/ShortsWorkbenchGuidePage.jsx` | Rewrite |
| `src/pages/StoryboardGuidePage.jsx` | Rewrite |
| `src/pages/ImagineerGuidePage.jsx` | Rewrite |
| `src/pages/LoraGuidePage.jsx` | Rewrite |
| `src/pages/TurnaroundGuidePage.jsx` | Rewrite |
| `src/pages/CarouselGuidePage.jsx` | Rewrite |
| `src/pages/AdsManagerGuidePage.jsx` | Rewrite |
| `src/pages/LinkedInGuidePage.jsx` | Rewrite |
| `src/pages/MotionTransferGuidePage.jsx` | Rewrite |
| `src/pages/VideoProductionGuidePage.jsx` | Rewrite |
| `src/pages/BrandKitGuidePage.jsx` | Create new |
| `src/pages/LearnPage.jsx` | Add brandkit tab |

---

## Verification

After each guide is complete, the agent should:

1. Navigate to `stitchstudios.app/learn?tab=<toolname>` in Chrome
2. Verify screenshots load (not broken image icons)
3. Verify the guide renders without errors
4. Spot-check 3 steps — confirm screenshot matches the described step
5. Verify contained image sizing (max-w-2xl, centered)
6. Deploy: `git push && fly deploy` (after all Phase 1 guides complete)

---

## Skipped

- **Automation Flows** (`/learn?tab=flows`) — handled by a separate agent
- **CLI Lab** (`/learn` default) — interactive terminal, not a tool guide
