# Flows UX Overhaul — Complete Design Specification

> **Date:** 2026-04-09
> **Status:** Draft — awaiting review
> **Goal:** Transform the Flows automation builder from a generic React Flow canvas into a ComfyUI-level visual pipeline builder with a puzzle/building-game aesthetic. Full UI/UX overhaul — same backend, new frontend.

---

## Table of Contents

1. [Context & Decisions](#context--decisions)
2. [Architecture Summary](#architecture-summary)
3. [Block Model (Node Redesign)](#block-model)
4. [Port System (Smart Wiring)](#port-system)
5. [Iterator & Aggregator (Array Handling)](#iterator--aggregator)
6. [Canvas & Visual Design](#canvas--visual-design)
7. [Node Palette (Left Sidebar Redesign)](#node-palette)
8. [Config UX (Inline, No Right Sidebar)](#config-ux)
9. [Live Data Previews](#live-data-previews)
10. [Execution Visualization](#execution-visualization)
11. [Flow Templates](#flow-templates)
12. [Files to Modify](#files-to-modify)
13. [Files to Create](#files-to-create)
14. [Backend Changes](#backend-changes)
15. [Database Changes](#database-changes)
16. [Current Node Type Registry (All 44)](#current-node-type-registry)
17. [New Node Types to Add](#new-node-types-to-add)
18. [Open Questions](#open-questions)

---

## 1. Context & Decisions

Decisions made during brainstorming:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Visual direction | Dark canvas, puzzle/building-game aesthetic | User wants it to feel like The Incredible Machine — tactile, playful, satisfying chain reactions |
| Blob concept | Explored and shelved | WebGL metaballs were explored but impractical for a production tool. Pivoted to achievable UX overhaul |
| Right sidebar | **REMOVED** | User explicitly requested removal. Config happens inline on nodes or via popover |
| Input model | **Flexible multi-input** | Any block can receive from multiple sources at any connection point. Not limited to one prior step |
| Output model | **Multiple typed outputs** | Each block can produce several outputs (e.g., script → `script_text` + `scenes[]`) |
| Array handling | **Iterator + Aggregator pair** | Iterator fans out array items into parallel branches. Aggregator collects results at any downstream point. Branches execute in parallel |
| Reference tool | ComfyUI + Fuser Studio | Visual pipeline where you see everything flowing, every connection, every output at a glance |
| Execution model | Keep existing DAG executor | `FlowExecutor` with concurrency=3, retry/skip/stop error modes, pause/resume/cancel. No backend rewrite |

---

## 2. Architecture Summary

### What stays the same (backend)
- `api/lib/flowExecutor.js` — DAG execution engine (concurrency=3, timeout=5min/node, retry with exponential backoff)
- `api/lib/nodeTypeRegistry.js` — Node type definitions with `run()` functions
- `api/flows/flows.js` — REST API (CRUD, execute, templates, clone)
- `api/lib/scheduledFlowRunner.js` — Cron-based scheduled execution
- `api/lib/flowCostEstimator.js` — Cost estimation
- Database tables: `automation_flows` (graph_json JSONB), `automation_executions` (step_states JSONB)

### What changes (frontend — full rewrite of these files)
- `src/pages/FlowsListPage.jsx` — New dark-themed list with richer flow cards
- `src/pages/FlowBuilderPage.jsx` — New layout (no right sidebar, inline config)
- `src/components/flows/FlowCanvas.jsx` — Dark canvas, animated edges, new node types
- `src/components/flows/nodes/StitchNode.jsx` — Complete redesign (wider, preview area, inline config summary, visible ports)
- `src/components/flows/NodePalette.jsx` — Redesigned left palette with descriptions, type badges, suggestions
- `src/components/flows/NodeConfigPanel.jsx` — **DELETED** (replaced by inline config)
- `src/components/flows/edges/DeletableEdge.jsx` — Type-colored animated edges
- `src/components/flows/ExecutionLog.jsx` — Redesigned as bottom drawer instead of sidebar

---

## 3. Block Model

### Core Principle: Flexible multi-input, multiple typed outputs

Every block (node) follows this model:

```
        ┌──────────────────────────┐
  ●───▶ │  prompt (string)         │
  ●───▶ │  style (string)          │  INPUTS: 0 to N
  ●───▶ │  reference_image (image) │  Each typed. Any can receive from any source.
        │                          │
        │    ╔══════════════╗      │
        │    ║  IMAGINEER   ║      │
        │    ║  GENERATE    ║      │
        │    ╚══════════════╝      │
        │                          │
        │  image_url (image)  ───▶ ●  OUTPUTS: 1 to N
        │  requestId (string) ───▶ ●  Each typed.
        └──────────────────────────┘
```

**Key rules:**
- An input port can receive connections from **multiple** source blocks (values merged/overridden by last connection — or user picks which takes priority via port ordering)
- An output port can connect to **multiple** target blocks (fan-out)
- Connections are only valid between **compatible types** (see Port System below)
- Config values act as defaults — input port values override config when connected
- A block with no input connections is a "source" block (Manual Input, Style Preset, Brand Kit, etc.)

### Block categories

| Category | Color | Icon | Examples |
|----------|-------|------|----------|
| Input | Slate/Silver | 📥 | Manual Input, Style Preset, Video Style Preset, Prompt Template, Image Search, Brand Kit Select |
| Image | Purple | 🖼 | Imagineer Generate, Imagineer Edit, Turnaround, Smoosh, Upscale, Inpaint, Background Remove |
| Video | Blue | 🎬 | JumpStart Animate, Video Extend, Video Restyle, Motion Transfer, Video Trim, Extract Frame |
| Audio | Emerald | 🎙️ | Voiceover, Music, Captions, Sound Effect |
| Content | Amber | 📝 | Script Generator, Prompt Builder, Carousel Create, Shorts Create, Storyboard Create, Ads Generate, LinkedIn Post Create |
| Publish | Red | 📤 | YouTube Upload, TikTok Publish, Instagram Post, Facebook Post, LinkedIn Publish, Schedule Publish |
| Control | Cyan | 🔀 | Conditional, Iterator, Aggregator, Delay, Parallel Split, Parallel Join, Approval Gate |
| Brand | Magenta | 🏷️ | Brand Kit Select, LoRA Select, Visual Subject Select |

---

## 4. Port System (Smart Wiring)

### Port types with colors

| Type | Color | Dot Shape | Accepts from |
|------|-------|-----------|-------------|
| `string` | Slate (#94a3b8) | Circle | Any type (universal receiver) |
| `image` | Purple (#a855f7) | Circle | image, string (URL) |
| `video` | Blue (#3b82f6) | Circle | video, string (URL) |
| `audio` | Emerald (#10b981) | Circle | audio, string (URL) |
| `json` | Amber (#f59e0b) | Diamond | json, string |
| `image[]` | Purple (#a855f7) | Double-circle | image[] |
| `video[]` | Blue (#3b82f6) | Double-circle | video[] |
| `any[]` | Cyan (#06b6d4) | Double-circle | Any array |

### Connection validation rules

1. **Type compatibility**: Output type must be compatible with input type (per table above)
2. **Visual feedback on drag**: Valid targets glow green, invalid targets dim. Animated dashed line follows cursor.
3. **Multi-input**: A single input port CAN receive multiple connections. When it does, the node gets an array of values for that port. The `resolveInputs()` function in the executor collects all incoming values.
4. **Auto-suggest**: When dragging from an output, the palette highlights compatible "next step" nodes

### Edge rendering

- **Idle**: Bezier curve, color matches the output port type color, 2px stroke
- **During execution (data flowing)**: Animated dashed stroke with flow direction particles
- **Completed**: Solid stroke, slightly thicker (2.5px), subtle glow
- **Error**: Red stroke with X marker at the target node

---

## 5. Iterator & Aggregator (Array Handling)

### Iterator Block

```
        ┌──────────────────────────┐
  ●───▶ │  items (any[])           │  INPUT: One array
        │                          │
        │    ╔══════════════╗      │
        │    ║   ITERATOR   ║      │
        │    ╚══════════════╝      │
        │                          │
        │  current_item (any) ───▶ ●  OUTPUT: Single item (runs downstream N times)
        │  index (string)     ───▶ ●  Current iteration index
        │  total (string)     ───▶ ●  Total item count
        └──────────────────────────┘
```

**Behavior:**
- Receives an array input
- For each item in the array, triggers all downstream blocks with that single item
- Downstream blocks run in parallel (respecting concurrency limit)
- Must have a matching Aggregator somewhere downstream to collect results

### Aggregator Block

```
        ┌──────────────────────────┐
  ●───▶ │  item (any)              │  INPUT: Single items (from iterated branches)
        │                          │
        │    ╔══════════════╗      │
        │    ║  AGGREGATOR  ║      │
        │    ╚══════════════╝      │
        │                          │
        │  collected (any[])  ───▶ ●  OUTPUT: Array of all collected items
        │  count (string)     ───▶ ●  Number of items collected
        └──────────────────────────┘
```

**Behavior:**
- Waits for all parallel iterations to complete
- Collects all results into an array, preserving original order
- Can be placed **anywhere** downstream of the Iterator — not necessarily immediately after
- Multiple aggregators can collect from the same iterator at different points

### Visual representation

The Iterator and Aggregator blocks get a special visual treatment:
- **Iterator**: Expanding fork icon, shows "Iterating 0/5" during execution
- **Aggregator**: Collecting funnel icon, shows "Collected 3/5" as items arrive
- The region between Iterator and Aggregator gets a subtle background tint to show the "loop zone"

### Example: Shorts Pipeline

```
[Topic Input] ──▶ [Script Generator] ──▶ scenes[] ──▶ [Iterator]
                                                          │
                                                ┌─────────┼──────────┐
                                                ▼         ▼          ▼
                                          [Generate    [Generate   [Generate
                                           Frame]       Frame]      Frame]
                                              │           │           │
                                              ▼           ▼           ▼
                                          [Generate    [Generate   [Generate
                                            Clip]       Clip]       Clip]
                                              │           │           │
                                              └─────────┬─┘──────────┘
                                                        ▼
                                                   [Aggregator] ──▶ clips[]
                                                        │
                                                        ▼
[Voiceover] ──────────────────────────────────────▶ [Assemble]
[Music] ──────────────────────────────────────────▶     │
                                                        ▼
                                                   [Captions]
                                                        │
                                                        ▼
                                                  [YouTube Upload]
```

Note how Voiceover and Music are independent source blocks that feed into Assemble alongside the aggregated clips. This is the **flexible multi-input** model — Assemble receives from 3 different sources.

---

## 6. Canvas & Visual Design

### Dark theme

- **Canvas background**: `#0f0f14` with subtle dot grid (#1a1a2e, 1px dots, 30px spacing)
- **Ambient glow**: Faint radial gradient from center (#1a1035 at 0%, transparent at 60%)
- **Selection**: Blue glow ring around selected nodes
- **Minimap**: Bottom-right, dark-themed, node colors match categories

### Puzzle/Building Game aesthetic

The key design principles from the "Incredible Machine" / puzzle-game inspiration:

1. **Snap-to-grid**: Nodes snap to a 20px grid when dropped, creating satisfying alignment
2. **Snap feedback**: Brief scale bounce (1.02x) + subtle sound cue on drop
3. **Connection snap**: When dragging a wire near a compatible port, it snaps with a magnetic pull (within 20px)
4. **Chain reaction on run**: When "Play" is pressed, a visible pulse travels from source nodes through the graph, lighting up each connection in sequence
5. **Completion celebration**: Brief confetti/sparkle particle effect on the final node when flow completes successfully
6. **Node shadows**: Soft dark drop shadow giving a "floating piece" feel
7. **Hover lift**: Nodes raise slightly on hover (translateY -2px + shadow spread increase)

### Node visual design (StitchNode v2)

```
┌─────────────────────────────────────────┐
│  🖼  Imagineer Generate       [Image]   │  ← Header: icon + name + category badge
│─────────────────────────────────────────│
│  ● prompt ─────────────────────  ○ ───▶ │  ← Input ports (left) with labels
│  ● style                                │
│  ● reference_image                      │
│─────────────────────────────────────────│
│  ┌─────────────────────────────────┐    │
│  │                                 │    │  ← Preview area (140px tall)
│  │       [thumbnail preview]       │    │     Shows last output image/video
│  │                                 │    │
│  └─────────────────────────────────┘    │
│─────────────────────────────────────────│
│  Model: Nano Banana 2                   │  ← Inline config summary (key settings)
│  Ratio: 16:9                            │
│  [Click to configure]                   │
│─────────────────────────────────────────│
│             image_url ────────────▶ ●   │  ← Output ports (right) with labels
│             requestId ────────────▶ ●   │
└─────────────────────────────────────────┘
```

- **Width**: 280px (wider than current 180px to fit port labels + preview)
- **Header**: Category-colored background strip. Bold white text on dark.
- **Ports**: Color-coded dots (left=inputs, right=outputs) with visible labels
- **Preview**: 140px tall area. Shows thumbnail of last output. Placeholder shimmer when empty.
- **Config summary**: 2-3 key settings shown inline. Clickable to expand full config popover.
- **Selection glow**: Blue ring + slight scale increase (1.01x)
- **Running state**: Pulsing border animation, progress percentage if available
- **Completed**: Green checkmark overlay on preview, border turns green briefly
- **Failed**: Red X overlay, error message truncated in config area

---

## 7. Node Palette (Left Sidebar Redesign)

### Layout

- **Width**: 260px (up from 220px)
- **Background**: `#0c0c14` with glass-morphism border
- **Search**: `/` keyboard shortcut to focus. Searches name + description.
- **Sticky header**: "Add Blocks" title + search input

### Category sections (collapsible)

Each category section:
- Colored icon + label + item count badge
- Collapsed by default except the most-used (Image, Video)
- Click to expand/collapse with smooth animation

### Block items in palette

Each draggable item shows:
```
┌──────────────────────────────────────┐
│ 🖼 Imagineer Generate                │
│ T2I with 11 models, LoRA, styles     │  ← One-line description
│ ● string  ● image  → ● image        │  ← Input/output type badges
└──────────────────────────────────────┘
```

- Drag cursor on hover
- Tooltip on hover showing full description + all ports
- Category color accent on left border

### "Suggested Next" section

When a node is selected on the canvas, the palette shows a dynamic section at top:

```
┌──────────────────────────────────────┐
│ ⚡ Compatible Next Steps             │
│                                      │
│ 🎬 JumpStart Animate (image → video) │
│ ✏️ Imagineer Edit (image → image)    │
│ 💾 Save to Library (image → saved)   │
│ 🔍 Upscale Image (image → image)    │
└──────────────────────────────────────┘
```

Filtered by type compatibility with the selected node's outputs.

---

## 8. Config UX (Inline, No Right Sidebar)

### Primary: Click-to-expand inline config

When a node is clicked, it expands vertically to reveal its full config form:

```
┌─────────────────────────────────────────┐
│  🖼  Imagineer Generate       [Image]   │
│─────────────────────────────────────────│
│  ● prompt ─────────────────────  ○ ───▶ │
│  ● style                                │
│─────────────────────────────────────────│
│                                         │
│  ┌─ Configuration ────────────────────┐ │  ← EXPANDED config section
│  │                                    │ │
│  │  Model:  [Nano Banana 2     ▼]     │ │
│  │  Ratio:  [16:9              ▼]     │ │
│  │  Negative: [________________]      │ │
│  │  Brand Kit: [None           ▼]     │ │
│  │                                    │ │
│  │  ── Advanced ──────────────────    │ │  ← Collapsible advanced section
│  │  Seed: [-1]                        │ │
│  │  Error Mode: [Stop on Error ▼]    │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│                                         │
│             image_url ────────────▶ ●   │
└─────────────────────────────────────────┘
```

**Behavior:**
- Single-click: Node expands to show config. Other nodes don't move (React Flow handles layout).
- Click elsewhere / click another node: Collapses back to summary view.
- The expanded config scrolls internally if fields exceed available height.
- All form elements use the dark theme styling (dark inputs, subtle borders, category-colored accents).

### Secondary: Double-click for SlideOver (complex nodes only)

For nodes with 8+ config fields (Imagineer, JumpStart, Voiceover, Script Generator), double-click opens the existing `NodeConfigModal` SlideOver panel from the **left side** (not right — right sidebar is gone). This gives more screen real estate for:
- StyleGrid selection
- LoRA picker
- Voice preview/playback
- Brand kit selector

### Right-click context menu

Quick actions:
- Configure (expand inline)
- Duplicate
- Delete
- Disconnect all
- Set error mode (stop/skip/retry)

---

## 9. Live Data Previews

### On nodes

After execution, each node's preview area updates:

| Output type | Preview |
|------------|---------|
| `image` | Thumbnail `<img>` (cover, 280x140px) |
| `video` | First-frame thumbnail + duration badge + play icon overlay |
| `audio` | Waveform visualization + duration badge |
| `string` | Truncated text (2 lines, monospace) |
| `json` | `{...}` icon + key count badge |
| `image[]` | Grid of mini thumbnails (2x2) + "+N more" |
| `video[]` | Grid of mini thumbnails + count badge |

### On edges (during execution)

- Animated gradient dash pattern flowing in the data direction (source → target)
- Color matches the data type being transmitted
- Speed of animation indicates data volume (faster = larger payload)

### Preview click

Clicking a node's preview area opens a full-size preview modal:
- Images: Full resolution with download button
- Videos: Embedded player with controls
- Audio: Waveform player
- JSON: Pretty-printed with syntax highlighting

---

## 10. Execution Visualization

### "Play" button chain reaction

1. User clicks **▶ Run Flow**
2. Camera auto-fits to show entire graph
3. Source nodes (no inputs) light up first — border pulses blue
4. As each node completes, a glowing pulse travels along its output edges to the next nodes
5. Receiving nodes begin their pulsing animation
6. Iterator nodes show a progress counter: "Iterating 2/5"
7. Aggregator nodes fill up: "Collected 3/5"
8. On completion: final node gets a green burst, brief particle effect

### Execution log (bottom drawer, not sidebar)

The execution log moves to a **collapsible bottom drawer** (like Chrome DevTools):
- Collapsed: Slim bar showing "Running... 4/12 nodes complete" with progress bar
- Expanded: Full timeline with node names, durations, errors, and cost per node
- Can be resized by dragging the top edge
- Stays visible during execution, can be dismissed after

### Status overlays

| Status | Node visual |
|--------|------------|
| Queued | Dimmed, dashed border |
| Running | Blue pulsing border, spinner in header |
| Completed | Green border flash, checkmark badge, preview updates |
| Failed | Red border, error message in config area, X badge |
| Paused | Amber border, pause icon |
| Skipped | Semi-transparent, "SKIPPED" label |

---

## 11. Flow Templates

Six templates mapping directly to the pipelines documented in `docs/TOOL_KNOWLEDGE_BASE.md`:

### 1. Shorts Video Pipeline
```
Topic Input → Script Generator → Voiceover → [timing handled internally]
                    ↓ scenes[]
                Iterator → Generate Frame → Generate Clip → Aggregator
Music ──────────────────────────────────────────────────────→ Assemble
Voiceover ──────────────────────────────────────────────────→ Assemble
                                                              → Captions → YouTube Upload
```

### 2. Social Content Pipeline
```
Topic Input → LinkedIn Post Create → Style Preset → [image gen internal]
                                                    → LinkedIn Publish
```

### 3. Ad Campaign Pipeline
```
Product Description → Ads Generate → [multi-platform internal]
Brand Kit Select ──→ Ads Generate
                              → Iterator (platforms) → Ad Copy per platform → Aggregator
                              → Image generation per platform
```

### 4. Character Asset Pipeline
```
Character Description → Imagineer Generate → Turnaround Sheet → LoRA Train
                                                                      → [Available as LoRA in all tools]
```

### 5. Storyboard Production Pipeline
```
Topic Input → Storyboard Create → [internal: script gen → frame previews]
                                  → Video production per scene → Assembly
```

### 6. Carousel Multi-Platform Pipeline
```
Topic Input → Carousel Create → [select platforms]
Brand Kit Select ──→ Carousel Create
                              → Iterator (slides) → Image gen + compose → Aggregator
                              → Slideshow assembly → Multi-platform publish
```

---

## 12. Files to Modify

| File | What changes |
|------|-------------|
| `src/pages/FlowsListPage.jsx` | Dark theme, richer flow cards with mini graph preview, better template browser |
| `src/pages/FlowBuilderPage.jsx` | Remove right sidebar, add bottom execution drawer, dark theme, inline config |
| `src/components/flows/FlowCanvas.jsx` | Dark background, new edge types, snap-to-grid, animated connections |
| `src/components/flows/nodes/StitchNode.jsx` | Complete redesign — 280px wide, preview area, inline config, visible port labels |
| `src/components/flows/NodePalette.jsx` | Collapsible categories, descriptions, type badges, suggested-next section |
| `src/components/flows/edges/DeletableEdge.jsx` | Type-colored, animated during execution, glow on hover |
| `src/components/flows/ExecutionLog.jsx` | Move to bottom drawer, add progress bar, per-node cost display |
| `src/components/flows/NodeConfigModal.jsx` | Opens from LEFT (not right), keep for complex nodes only |
| `src/components/flows/FlowCard.jsx` | Dark theme, mini graph preview thumbnail |
| `api/lib/nodeTypeRegistry.js` | Add Iterator, Aggregator, Approval Gate, Parallel Split/Join, Brand Kit Select, LoRA Select nodes |
| `api/lib/flowExecutor.js` | Add Iterator/Aggregator execution logic, multi-input resolution for same port |

## 13. Files to Create

| File | Purpose |
|------|---------|
| `src/components/flows/nodes/IteratorNode.jsx` | Special visual for Iterator (fork icon, progress counter) |
| `src/components/flows/nodes/AggregatorNode.jsx` | Special visual for Aggregator (funnel icon, collection counter) |
| `src/components/flows/nodes/ConditionalNode.jsx` | Special visual for branching (true/false paths) |
| `src/components/flows/InlineConfig.jsx` | Expandable config form rendered inside node |
| `src/components/flows/ExecutionDrawer.jsx` | Bottom drawer with timeline, progress, costs |
| `src/components/flows/PortBadge.jsx` | Reusable type-colored port dot + label component |
| `src/components/flows/NodePreview.jsx` | Thumbnail/waveform/text preview component for node output |
| `src/components/flows/SuggestedNodes.jsx` | "Compatible next steps" section in palette |
| `src/components/flows/edges/TypedEdge.jsx` | New edge component with type coloring + animation |
| `src/components/flows/edges/FlowingEdge.jsx` | Animated data-flow edge used during execution |

## 14. Backend Changes

### FlowExecutor modifications

**Multi-input resolution (same port receives multiple connections):**

Current `resolveInputs()` takes the last-connected value for each port. Change to:
- If a port receives exactly 1 connection → single value (current behavior)
- If a port receives 2+ connections → array of values
- Add port metadata flag: `merge: 'array' | 'override' | 'concat'` to control behavior

**Iterator execution:**

```javascript
// In FlowExecutor.execute():
// When encountering an Iterator node:
// 1. Get the array input
// 2. Find all nodes between Iterator and its paired Aggregator (the "loop zone")
// 3. For each item in the array:
//    a. Clone the loop-zone subgraph
//    b. Execute the subgraph with current_item as the iterator's output
//    c. Collect the final outputs
// 4. Pass collected array to the Aggregator node
```

**Aggregator execution:**
- Waits for all iterations to complete
- Collects results preserving index order
- Outputs the collected array

### New node types to add to registry

| ID | Category | Inputs | Outputs | Purpose |
|----|----------|--------|---------|---------|
| `iterator` | control | `items (any[])` | `current_item (any)`, `index (string)`, `total (string)` | Fan-out array items |
| `aggregator` | control | `item (any)` | `collected (any[])`, `count (string)` | Collect parallel results |
| `approval-gate` | control | `value (any)` | `approved_value (any)` | Pause for human review, resume passes value through |
| `parallel-split` | control | `value (any)` | `branch_a (any)`, `branch_b (any)`, `branch_c (any)` | Explicit parallel branching |
| `brand-kit-select` | brand | none | `brand_config (json)`, `brand_name (string)`, `colors (string)`, `logo_url (image)`, `voice_style (string)` | Load brand kit as multiple typed outputs |
| `lora-select` | brand | none | `lora_url (string)`, `trigger_word (string)`, `scale (string)` | Select trained LoRA model |
| `lora-train` | brand | `images (image[])` | `lora_url (string)`, `trigger_word (string)` | Submit LoRA training job |
| `background-remove` | image | `image (image)` | `image_url (image)` | Remove background |
| `inpaint` | image | `image (image)`, `mask (image)`, `prompt (string)` | `image_url (image)` | Selective region editing |
| `sound-effect` | audio | `prompt (string)` | `audio_url (audio)` | Generate sound effect |
| `video-erase` | video | `video (video)`, `prompt (string)` | `video_url (video)` | Remove objects from video |
| `describe-image` | utility | `image (image)` | `description (string)` | GPT vision analysis |
| `research-topic` | content | `query (string)` | `research (json)`, `summary (string)` | Web search + enrichment |

---

## 15. Database Changes

### Migration: Add iterator/aggregator pairing

The `graph_json` JSONB structure gains a new field to pair iterators with aggregators:

```json
{
  "nodes": [...],
  "edges": [...],
  "iteratorPairs": [
    { "iteratorId": "node-123", "aggregatorId": "node-456" }
  ]
}
```

No new tables needed — the existing `automation_flows.graph_json` and `automation_executions.step_states` handle everything.

The `step_states` JSONB gains iterator tracking:

```json
{
  "node-123": {
    "status": "running",
    "iterator_progress": { "current": 3, "total": 5 },
    "iteration_states": {
      "0": { "status": "completed", "output": {...} },
      "1": { "status": "completed", "output": {...} },
      "2": { "status": "running" },
      "3": { "status": "queued" },
      "4": { "status": "queued" }
    }
  }
}
```

---

## 16. Current Node Type Registry (All 44 Types)

From `api/lib/nodeTypeRegistry.js`:

| ID | Label | Category | Inputs | Outputs | Has `run()` |
|----|-------|----------|--------|---------|-------------|
| `manual-input` | Manual Input | input | none | value (string) | Yes |
| `style-preset` | Style Preset | input | none | style (string) | Yes |
| `video-style-preset` | Video Style Preset | input | none | style (string) | Yes |
| `prompt-template` | Prompt Template | input | none | prompt (string) | Yes |
| `image-search` | Image Search | input | query (string) | image_url (image) | Stub |
| `imagineer-generate` | Imagineer Generate | image | prompt (string), style (string) | image_url (image) | Yes |
| `imagineer-edit` | Imagineer Edit | image | image (image), prompt (string), style (string) | image_url (image) | Yes |
| `turnaround-sheet` | Turnaround Sheet | image | prompt (string), style (string) | image_url (image) | Yes |
| `smoosh` | Smoosh | image | image (image), image2 (image) | image_url (image) | Yes |
| `upscale-image` | Upscale Image | image | image (image) | image_url (image) | Yes |
| `jumpstart-animate` | JumpStart Animate | video | image (image), prompt (string) | video_url (video) | Yes |
| `video-extend` | Video Extend | video | video (video), prompt (string) | video_url (video) | Stub |
| `video-restyle` | Video Restyle | video | video (video), style_prompt (string) | video_url (video) | Stub |
| `motion-transfer` | Motion Transfer | video | video (video), reference_image (image) | video_url (video) | Yes |
| `video-trim` | Video Trim | utility | video (video) | video_url (video) | Stub |
| `extract-frame` | Extract Frame | utility | video (video) | image_url (image) | Yes |
| `voiceover` | Voiceover | audio | text (string) | audio_url (audio) | Yes |
| `music` | Music | audio | mood (string) | audio_url (audio) | Yes |
| `captions` | Captions | audio | video (video) | video_url (video) | Yes |
| `script-generator` | Script Generator | content | topic (string), niche (string) | script (json) | Yes |
| `prompt-builder` | Prompt Builder | content | description (string), style (string), props (string) | prompt (string) | Yes |
| `carousel-create` | Carousel Create | content | topic (string) | carousel_id (string) | Stub |
| `shorts-create` | Shorts Create | content | topic (string) | draft_id (string) | Stub |
| `storyboard-create` | Storyboard Create | content | topic (string) | storyboard_id (string) | Stub |
| `ads-generate` | Ads Generate | content | product_description (string) | campaign_id (string) | Stub |
| `linkedin-post` | LinkedIn Post | publish | text (string), image (image) | post_id (string) | Stub |
| `youtube-upload` | YouTube Upload | publish | video (video), title (string), description (string) | video_id (string) | Stub |
| `tiktok-publish` | TikTok Publish | publish | video (video), image (image) | post_id (string) | Stub |
| `instagram-post` | Instagram Post | publish | image (image), caption (string) | post_id (string) | Stub |
| `facebook-post` | Facebook Post | publish | image (image), text (string) | post_id (string) | Stub |
| `save-to-library` | Save to Library | utility | url (string), name (string) | saved_url (string) | Yes |
| `text-transform` | Text Transform | utility | text (string) | text (string) | Yes |
| `delay` | Delay | utility | passthrough (string) | passthrough (string) | Yes |
| `conditional` | Conditional | utility | value (string) | result (string) | Yes |

**Note:** 13 nodes marked "Stub" have placeholder `run()` functions that return fake IDs. These need real implementations that call the actual API endpoints.

---

## 17. New Node Types to Add

See Section 14 for the full list. Key additions:

- **Iterator** + **Aggregator** (control flow)
- **Brand Kit Select** + **LoRA Select** (brand inputs with multiple typed outputs)
- **Approval Gate** (human-in-the-loop pause)
- **Research Topic** (web search + Exa)
- **Describe Image** (GPT vision)
- **Inpaint**, **Background Remove**, **Sound Effect**, **Video Erase** (missing tool nodes)

---

## 18. Open Questions

1. **Multi-input priority**: When a port receives from 2+ sources, which value wins? Options: (a) last-connected overrides, (b) array of all values, (c) user-configurable per port. Current recommendation: array of all values, with merge strategy configurable.

2. **Iterator scope detection**: How does the executor know which nodes are "inside" the iterator loop? Options: (a) explicit pairing in `graph_json.iteratorPairs`, (b) auto-detect by graph traversal between Iterator and Aggregator nodes. Current recommendation: explicit pairing — user draws the connections, system validates.

3. **Stub node implementations**: 13 nodes need real `run()` functions. Should this be part of this overhaul or a separate task? Recommendation: separate task — this spec focuses on UX. Stubs work for layout/design testing.

4. **Node grouping**: Should users be able to group nodes into named collapsible sections (like ComfyUI groups)? Would help with large flows. Recommendation: yes, add in a follow-up phase.

5. **Undo/redo**: React Flow supports undo/redo via state snapshots. Should we add `Ctrl+Z` / `Ctrl+Shift+Z`? Recommendation: yes.

---

## Appendix: File Inventory

### Existing files (to modify)

```
src/pages/FlowsListPage.jsx            — 110 lines, flow list with tabs
src/pages/FlowBuilderPage.jsx           — ~250 lines, main builder page
src/components/flows/FlowCanvas.jsx     — 90 lines, React Flow wrapper
src/components/flows/nodes/StitchNode.jsx — 83 lines, node component
src/components/flows/NodePalette.jsx    — 69 lines, draggable tool list
src/components/flows/NodeConfigPanel.jsx — 135 lines, right sidebar (DELETE)
src/components/flows/NodeConfigModal.jsx — ~500 lines, SlideOver config form
src/components/flows/edges/DeletableEdge.jsx — 46 lines, edge with delete button
src/components/flows/ExecutionLog.jsx   — 50 lines, execution timeline
src/components/flows/FlowCard.jsx       — 110 lines, flow list card
api/lib/nodeTypeRegistry.js             — ~700 lines, 44 node type definitions
api/lib/flowExecutor.js                 — 249 lines, DAG execution engine
api/lib/flowCostEstimator.js            — 96 lines, cost estimation
api/lib/scheduledFlowRunner.js          — 57 lines, cron scheduler
api/flows/flows.js                      — REST API handlers
supabase/migrations/20260404_automation_flows.sql — DB schema
```

### Dependencies already installed
```
@xyflow/react: ^12.10.2    — React Flow (keep, upgrade if needed)
lucide-react: ^0.475.0     — Icons
croner: ^10.0.1             — Cron (for scheduled flows)
```

### No new dependencies expected
The overhaul is CSS/component-level. React Flow handles all canvas interactions. No Three.js, no WebGL.
