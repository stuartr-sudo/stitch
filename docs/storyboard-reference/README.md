# Storyboard Reference Package

This folder contains everything needed for another LLM to understand the complete Storyboard Planner system and create a refactor plan.

## How to Use This

Read the documents in this order:

1. **`PROCESS-DEEP-DIVE.md`** — Extremely detailed walkthrough of every step, what happens in the browser, what API calls are made, what data flows where. Includes known issues and improvement opportunities.

2. **`ARCHITECTURE.md`** — System diagram, API call sequences, state shape, model capabilities matrix, cost profile, critical dependencies.

3. **`FILE-MAP.md`** — Every file in the system with its role. Organized by category (API routes, frontend components, shared libs, UI components, database, docs).

4. **`source/`** — Full source code of every storyboard file, organized by category:
   - `source/api-routes/` — Backend endpoints + prompt builder
   - `source/frontend-components/` — Wizard + all sub-components
   - `source/shared-libs/` — Model registry, pipeline helpers, style presets, etc.

## Quick Summary

- **8-step "inputs-first" wizard** — all creative decisions before AI generation
- **1,898-line main component** with ~50 useState hooks (no reducer/context)
- **12 video models** across 4 modes (R2V, I2V, First-Last-Frame, V2V)
- **Dual character systems** (Kling @Element vs Veo flat refs)
- **Sequential generation** with frame chaining between scenes
- **2-stage prompt pipeline** — script gen (GPT) then per-scene cohesive builder (GPT)
- **Assembly** via FFmpeg compose + optional captions

## Key Pain Points for Refactoring

1. **Monolithic state** — 50+ useState in one 1,898-line file
2. **No validation** on scene prompts, durations, or model constraints
3. **Fragile frame chaining** — client-side extraction with no retry
4. **Sequential generation** — can't parallelize due to chaining
5. **Duplicate LLM calls** — script gen + per-scene cohesive builder
6. **No music/voiceover/caption UI** — assembly supports it, wizard doesn't expose it
7. **Global model only** — can't mix models per scene
8. **Library save is fire-and-forget** — scene URLs may be temporary FAL CDN
