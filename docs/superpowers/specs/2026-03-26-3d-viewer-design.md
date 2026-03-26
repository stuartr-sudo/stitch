# 3D Viewer Tool — Design Spec

## Overview

New sidebar tool for generating 3D models from images and interactively viewing them from any angle. Primary use case: orbit a 3D model to a custom angle, capture that view as a 2D image, and save to Library for use in other tools (Imagineer, Storyboard, JumpStart, etc.).

## Architecture

**New sidebar tool: "3D Viewer"** under Image Tools, between Lens and Try Style.

**Flow**: Select/upload image(s) → Generate 3D model via Hunyuan 3D Pro → Interactive 3D viewer → Capture angle → Save to Library

### Components

- `src/components/modals/ThreeDViewerModal.jsx` — full-width modal with 3D viewer + controls
- `api/3d/generate.js` — backend endpoint, sends image(s) to FAL Hunyuan 3D Pro, polls for result
- `api/3d/result.js` — polling endpoint for async generation status

### 3D Rendering

Google's `<model-viewer>` web component. Handles orbit controls, zoom, lighting, and WebGL rendering. No Three.js needed. Lightweight (~150KB), well-maintained, works in all modern browsers. Install: `@google/model-viewer`.

### Export

`<model-viewer>` has a built-in `toDataURL()` method that captures the current camera view as a PNG. Upload to Supabase via `/api/library/save` with `source: '3d-viewer'`.

## UI Layout

**Full-width modal** (95vw × 90vh), dark background for better 3D viewing.

### State 1 — Input (before generation)

- Center area: upload zone with drag-and-drop for front image (required)
- Below: grid of optional angle input slots (Back, Left, Right, Top, Bottom, Left-Front, Right-Front). Each slot is a small thumbnail with an upload button. All optional — more angles = better reconstruction.
- Bottom bar: "Generate 3D Model" button + model info (Hunyuan 3D Pro, ~$0.38/gen)

### State 2 — Viewer (after generation)

- Main area (~80% of modal): `<model-viewer>` with the GLB, dark background, auto-rotate on load
- Right strip (~20%): compact controls panel with:
  - "Capture This Angle" button — screenshots current view, saves to Library
  - "Download GLB" button — download the raw 3D file
  - "New Model" button — go back to input state
  - Camera info display (current rotation/zoom values)

## Backend

### Generation endpoint (`POST /api/3d/generate`)

- Auth: JWT (standard `authenticateToken` middleware)
- Input: `{ front_image_url, back_image_url?, left_image_url?, right_image_url?, top_image_url?, bottom_image_url?, left_front_image_url?, right_front_image_url? }`
- Submits to FAL queue endpoint `fal-ai/hunyuan-3d/v3.1/pro/image-to-3d`
- Returns `{ requestId, status: 'processing' }`
- Uses `getUserKeys()` for FAL key resolution

### Polling endpoint (`POST /api/3d/result`)

- Auth: JWT
- Input: `{ requestId }`
- Polls FAL queue status for `fal-ai/hunyuan-3d/v3.1/pro/image-to-3d`
- On completion: uploads GLB to Supabase storage (`media/3d/` folder), returns `{ status: 'completed', glbUrl, thumbnailUrl }`
- On pending: returns `{ status: 'processing' }`
- On failure: returns `{ status: 'failed', error }`

### Export flow

1. Frontend captures current `<model-viewer>` view via `toDataURL()`
2. Sends data URL to existing `/api/library/save` with `{ url: dataUrl, type: 'image', source: '3d-viewer', title: '3D View Export' }`
3. Image appears in Library immediately

## Data Storage

- **No new database tables** — GLB files go in Supabase storage (`media/3d/` folder), exported views go through the existing library save flow
- **Cost logging**: calls `logCost()` with category `fal` and model `hunyuan-3d-pro`

## Route Registration

- `server.js`: register `POST /api/3d/generate` and `POST /api/3d/result` with `authenticateToken`
- `App.jsx`: no new page route needed — modal opens from sidebar

## Sidebar Entry

Add "3D Viewer" to the Image Tools section in `HomePage.jsx` sidebar, between Lens and Try Style. Icon: `Box` from lucide-react (3D box icon).

## Dependencies

- `@google/model-viewer` — npm package for the 3D viewer web component

## FAL API Details

**Endpoint**: `fal-ai/hunyuan-3d/v3.1/pro/image-to-3d`

**Input fields**:
- `input_image_url` (required) — front view, 128-5000px, max 8MB, JPG/PNG/WEBP
- `back_image_url`, `left_image_url`, `right_image_url` (optional)
- `top_image_url`, `bottom_image_url` (optional, v3.1 exclusive)
- `left_front_image_url`, `right_front_image_url` (optional, v3.1 exclusive)
- `generate_type` (default "Normal") — "Geometry" for untextured mesh
- `enable_pbr` (default false) — PBR textures, +$0.15

**Output fields**:
- `model_glb` (File) — primary GLB file with `.url`
- `model_urls` (object) — keys: `glb`, `obj`, `fbx`, `usdz`, `mtl`, `texture`
- `thumbnail` (File, optional) — single PNG preview render

**Pricing**: $0.375/generation base, +$0.15 for PBR

## Scope Exclusions

- No text-to-3D (image-to-3D only)
- No GLB import from external sources
- No "Edit in Imagineer" button (save to Library only)
- No new database tables or migrations
- No Rapid tier — Pro only for multi-angle input support
