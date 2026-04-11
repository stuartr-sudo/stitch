# Proposal Page — Stitch Studios × Hamilton City Council

**Date:** 2026-03-24
**Status:** Approved

## Overview

A standalone, public-facing proposal page for pitching the "Movin' Martin" animated road safety & active travel series to Hamilton City Council. Executive scroll layout, dark premium visual design, tiered pricing ($25k / $30k / $35k).

## Context

Hamilton City Council's School Travel Coordinator (Tracey Grayson) wants an animated educational series featuring their mascot "Movin' Martin" — a dog that promotes road safety and active travel for primary school children. The series takes inspiration from Dora the Explorer's interactive format and the Ruben the Road Safety Bear website. Stitch Studios is proposing to deliver this using its AI-powered animation pipeline.

## Route & Access

- **Path:** `/proposal/hamilton-city-council`
- **Auth:** None — fully public, no login required
- **Component:** `src/pages/ProposalPage.jsx`
- **Navigation:** Standalone page — no app header, sidebar, or footer. Self-contained.
- **Route registration:** Add as a plain `<Route>` in `App.jsx` (not wrapped in `ProtectedRoute` or `GuestRoute`)

## Visual Design

- **Layout:** Single-page executive scroll with 8 sections
- **Background:** Dark slate gradient (`#0f172a` → `#1e293b`)
- **Primary text:** White (`#ffffff`)
- **Secondary text:** Slate (`#94a3b8`)
- **Accent colour:** Teal (`#2C666E`) — buttons, highlights, borders, badges
- **Light accent:** Cyan (`#90DDF0`) — logo needle detail, hover states
- **Font:** Inter (already available in the app)
- **Corners:** `rounded-xl` / `rounded-2xl` consistent with existing design system
- **Scroll animations:** Subtle fade-in-up via CSS + `IntersectionObserver` (no animation library)
- **Responsive:** Desktop-first, functional on tablet and mobile. Multi-column layouts stack to single column below `md` (768px). Connecting lines / horizontal decorations are desktop-only.

## Logo

SVG logo mark: a dashed stitch line curving into an S-shape with a needle at the top. Below: "STITCH STUDIOS" in spaced uppercase, "ANIMATION & MEDIA" subtitle. Colours: teal stitch path, cyan needle, white text.

This will be an inline SVG component within the proposal page — no external image file needed initially. A polished version can be generated later via image generation tools.

## Sections

### 1. Hero (full viewport)

- Stitch Studios logo (needle & thread S mark + wordmark), centered
- "Prepared exclusively for **Hamilton City Council**"
- Project title: "Movin' Martin — Animated Road Safety & Active Travel Series"
- Date: March 2026
- Subtle scroll-down indicator (animated chevron)

### 2. Project Vision

Two-column layout:
- **Left column:** Overview text — AI-powered animated series featuring Movin' Martin for primary school children. Combines road safety education with active travel promotion (walking, biking, scooting to school). Interactive "Dora-style" learning moments where Martin pauses and asks questions, reinforced by companion workbooks.
- **Right column:** Key highlights in teal-bordered stat cards:
  - 7 episodes
  - 3:30 compilation film
  - Primary school audience
  - Workbook integration
  - Active travel focus (point of difference)

### 3. Episode Guide

Card grid — one card per deliverable:

1. **Character Introduction Episode** (30–45 seconds) — Introduces Movin' Martin, establishes the character, sets the tone
2. **Keeping Safe on Our Wheels** (~30s) — Safety gear for bikes, scooters, skateboards
3. **Check Before You Step** (~30s) — Pedestrian crossing safety
4. **Sneaky Driveways** (~30s) — Awareness around driveways and reversing vehicles
5. **Foot Path Safety** (~30s) — Sharing paths with pedestrians, cyclists, scooter riders
6. **Walk or Wheels Superstar** (~30s) — Promoting active travel to school
7. **Full Feature Compilation Film** (~3:30) — All episodes combined into one film

Each card shows:
- Episode number and title
- Duration badge (teal pill)
- Brief description
- Key phrases as subtle pills where applicable (e.g. "Check before you step!", "Cross like a boss!", "Be bright, be seen")
- Video embed: `<video>` element with `controls` and a placeholder Supabase URL. Stu will replace URLs with real content later. Use a generic sample video URL for initial build.

Grid: 2 columns on desktop, 1 on mobile. Card 1 (intro) gets a "First Episode" badge. Card 7 (compilation) spans full width with special visual treatment — distinct teal border, larger format.

### 4. Sample Work

2–3 embedded video examples from existing Storyboard output. Each in a rounded dark container with:
- `<video>` element with controls, poster frame
- Caption: "Sample animation — final style will be tailored to Movin' Martin"
- Placeholder Supabase URLs that Stu will replace with real content

### 5. The Approach

Three-step horizontal process visualisation:

1. **Story & Script** — AI-assisted scriptwriting with interactive learning beats baked in. Each episode structured around a key road safety message with Dora-style pause-and-ask moments.
2. **Animation** — AI-powered visual generation with consistent character design across all episodes. Movin' Martin maintains a cohesive look and personality throughout.
3. **Polish** — Professional voiceover, background music, sound effects, captions, and final edit. Ready for classroom and online distribution.

Presented as 3 cards in a row with numbered circles and connecting lines. No mention of specific AI tools or technical implementation — the focus is on output quality and creative process.

### 6. Pricing Tiers

Three cards side by side:

**Base — $25,000 + GST**
- 7 animated episodes (character intro + 5 themed + compilation)
- Interactive learning beats (Dora-style pause & ask)
- Movin' Martin website with admin backend
- Digital delivery (MP4, web-optimised)

**Premium — $30,000 + GST** ← Recommended (teal border + badge)
- Everything in Base, plus:
- Professional voiceover (all episodes)
- Voice lipsync animation (Martin's mouth syncs to speech)
- Movin' Martin website with admin backend

**Deluxe — $35,000 + GST**
- Everything in Premium, plus:
- Original music & sound effects
- Workbook integration guide (educational resource alignment)
- Movin' Martin website with admin backend

The website deliverable is listed per-tier (not as a separate footer note) to reinforce its presence at every price point.

### 7. About Stitch Studios

Brief company introduction. Logo mark. Emphasis on stitching stories together through animation. Contact details: name, email, phone. Call to action: "Let's bring Movin' Martin to life."

### 8. Footer

- "This proposal is confidential and prepared exclusively for Hamilton City Council"
- "© 2026 Stitch Studios LLC"
- Date prepared

## Key Phrases (reference for episode descriptions)

These are Hamilton City Council's established road safety phrases — to be featured in relevant episode cards:

- "Walk or Wheels Superstar!"
- "Check before you step!"
- "Cross like a boss!"
- "Get movin' with Movin' Martin!"
- "Be bright, be seen"
- "Stay alert, be aware"
- "Stop, look and listen"

## Technical Notes

- Single file: `src/pages/ProposalPage.jsx` — all sections in one component, no sub-components needed unless it exceeds ~500 lines
- Tailwind CSS only — no additional styling dependencies
- Videos: `<video>` elements with `controls`, `poster`, and Supabase storage `src` URLs
- Scroll animations: CSS `@keyframes` + `IntersectionObserver` in a `useEffect` — no framer-motion or similar
- Logo: Inline SVG, not an image file
- No API calls, no backend, no data fetching — entirely static content
- No shadcn/ui components needed — this is a standalone marketing page with its own styling

## Out of Scope

- The Movin' Martin website itself (separate project, to be built later)
- Actual video content (placeholders will be swapped by Stu)
- PDF export of the proposal
- Analytics or tracking
- CMS or editable content — this is a one-off static proposal
