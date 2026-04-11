# 3D Viewer Tool — Design Spec

## Overview

New sidebar tool for generating 3D models from images and interactively viewing them from any angle. Primary use case: orbit a 3D model to a custom angle, capture that view as a 2D image, and save to Library for use in other tools (Imagineer, Storyboard, JumpStart, etc.).

## Architecture

**New sidebar tool: "3D Viewer"** under Image Tools, between Lens and Try Style.

**Flow**: Select/upload image(s) → Generate 3D model via Hunyuan 3D Pro → Interactive 3D viewer → Capture angle → Save to Library

### Components

- `src/components/modals/ThreeDViewerModal.jsx` — full-width modal with 3D viewer + controls
- `api/viewer3d/generate.js` — backend endpoint, submits image(s) to FAL queue, returns requestId
- `api/viewer3d/result.js` — polling endpoint for async generation status

### 3D Rendering

Google's `<model-viewer>` web component. Handles orbit controls, zoom, lighting, and WebGL rendering. No Three.js needed. Lightweight (~150KB), well-maintained, works in all modern browsers. Install: `@google/model-viewer`.

### Export

`<model-viewer>` exposes `toBlob({mimeType: 'image/png'})` to capture the current camera view. The frontend converts the blob to a data URL, then sends it to the Lens-style `uploadDataUrlToSupabase()` pattern (upload base64 to Supabase storage directly) and saves via `/api/library/save` with the resulting hosted URL.

## UI Layout

**Full-width modal** (95vw × 90vh), dark background for better 3D viewing.

### State 1 — Input (before generation)

- Center area: upload zone with drag-and-drop for front image (required)
- Below: grid of optional angle input slots (Back, Left, Right, Top, Bottom, Left-Front, Right-Front). Each slot is a small thumbnail with an upload button. All optional — more angles = better reconstruction.
- Image upload flow: user selects file → read as data URL for preview → on "Generate", backend uploads data URLs to Supabase storage to get hosted URLs, then passes those to FAL. Same pattern as Lens `uploadDataUrlToSupabase()`.
- Bottom bar: "Generate 3D Model" button + model info (Hunyuan 3D Pro, ~$0.38/gen)

### State 2 — Viewer (after generation)

- Main area (~80% of modal): `<model-viewer>` with the GLB, dark background, auto-rotate on load
- Right strip (~20%): compact controls panel with:
  - "Capture This Angle" button — screenshots current view, saves to Library
  - "Download GLB" button — download the raw 3D file
  - "New Model" button — go back to input state
  - Camera info display (current rotation/zoom values)
- Error handling: if GLB fails to load in `<model-viewer>` (corrupt file, WebGL unavailable), show error message with "Download GLB" link as fallback.

## Backend

### Generation endpoint (`POST /api/viewer3d/generate`)

- Auth: JWT (standard `authenticateToken` middleware)
- Input: `{ front_image_url, back_image_url?, left_image_url?, right_image_url?, top_image_url?, bottom_image_url?, left_front_image_url?, right_front_image_url? }`
- If any image URL is a data URL (`data:`), upload to Supabase storage first to get a hosted URL (reuse `uploadDataUrlToSupabase()` pattern from Lens)
- Submits to FAL queue endpoint (`queue.fal.run/fal-ai/hunyuan-3d/v3.1/pro/image-to-3d`), returns immediately
- Returns `{ requestId, status: 'processing' }`
- Uses `getUserKeys()` for FAL key resolution
- Hardcoded defaults: `generate_type: 'Normal'`, `enable_pbr: false` (no UI toggle — keep simple)

### Polling endpoint (`POST /api/viewer3d/result`)

- Auth: JWT
- Input: `{ requestId }`
- Polls FAL queue status for `fal-ai/hunyuan-3d/v3.1/pro/image-to-3d`
- On completion: uploads GLB to Supabase storage (`media/3d/{userId}/{uuid}.glb`), returns `{ status: 'completed', glbUrl, thumbnailUrl }`
- On pending: returns `{ status: 'processing' }`
- On failure: returns `{ status: 'failed', error }`
- Frontend polls every 5 seconds (follow JumpStart polling pattern with `setTimeout` + cleanup on unmount)

### Export flow

1. Frontend captures current `<model-viewer>` view via `modelViewerRef.current.toBlob({mimeType: 'image/png'})`
2. Convert blob to data URL, upload to Supabase storage (`media/3d-exports/{userId}/{uuid}.png`)
3. Save to library via `/api/library/save` with `{ url: hostedUrl, type: 'image', source: '3d-viewer', title: '3D View Export' }`
4. Image appears in Library immediately

## Data Storage

- **No new database tables** — GLB files go in Supabase storage (`media/3d/{userId}/`), exported views go through the existing library save flow
- **Cost logging**: calls `logCost()` with category `fal`, model `hunyuan-3d-pro`, estimated cost `0.375`

## Route Registration

- `server.js`: register `POST /api/viewer3d/generate` and `POST /api/viewer3d/result` with `authenticateToken`
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
- No PBR toggle — hardcoded to off for simplicity
