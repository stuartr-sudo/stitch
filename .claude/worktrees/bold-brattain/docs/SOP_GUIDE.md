# Stitch Studio — Standard Operating Procedure (SOP) Guide

This guide explains what Stitch does, how each feature works, how features work together, and what you can use the app for.

---

## 1. What is Stitch?

**Stitch** is a video and image advertisement creation tool. You use it to:

- Generate and edit images with AI
- Turn images into videos (image-to-video)
- Edit and extend existing videos
- Restyle videos (change visual style while keeping motion)
- Animate characters from photos
- Composite multiple images into one
- Remove or replace parts of images (inpaint)
- Adjust image viewing angles (Lens)
- Run virtual try-on (garments on person photos)
- Train custom brand LoRAs and generate product-style images

All created media are saved to your **Library** and can be previewed in the **Canvas** and arranged in the **Timeline** for the chosen platform (e.g. TikTok, Instagram Reels).

---

## 2. App Layout and Flow

### 2.1 Main Screen Structure

- **Header**: App title, Campaigns link, **API Keys**, Sign Out.
- **Left panel**: 
  - **Brand Kit** and **Assets** (Brand/LoRA) buttons at top
  - **Image Tools** (Imagineer, Edit Image, Inpaint, Smoosh, Lens, Try Style)
  - **Video Tools** (JumpStart, Video Studio, Trip, Animate, Library)
  - **Your Assets**: list of recently created videos (click to preview)
- **Center**: **Canvas** — preview of the selected video or empty state. Platform selector (e.g. TikTok, Instagram Reels) sets aspect ratio and safe zones.
- **Bottom**: **Timeline** — Remotion-based preview of the current clip(s); duration is derived from the clip’s `durationInFrames` (e.g. from JumpStart).

### 2.2 Platform Selector

You choose the target platform (TikTok, Instagram Reels, YouTube Shorts, etc.). This sets:

- **Aspect ratio** (e.g. 9:16 for Reels/Shorts)
- **Max duration** (platform limits)
- **Safe zones** (where to avoid critical text/UI)

Dimensions and guidelines are defined in `src/lib/platforms.js`.

### 2.3 Typical Flow

1. (Optional) Set up **Brand Kit** and/or train **Brand Assets (LoRA)**.
2. (Optional) Configure **API Keys** for the services you use.
3. Create or import media using **Image Tools** and **Video Tools**.
4. New items appear in **Your Assets** and are saved to the **Library**.
5. Select a video to preview in the **Canvas**; the **Timeline** shows its duration.
6. Use **Library** to re-use or manage saved images and videos.

---

## 3. Brand and Setup

### 3.1 Brand Kit

- **What it is**: Central place for brand identity (name, colors, logo URL, voice style, taglines, style preset).
- **How it works**: Data is stored per user in Supabase and loaded when you open the modal. You can add/remove colors and taglines and save.
- **How it’s used**: Brand Kit data can be used by other features (e.g. prompts, style presets) to keep content on-brand. It does not by itself generate media.

### 3.2 Brand Assets (LoRA Training)

- **What it is**: Upload product (or subject) photos, optionally remove backgrounds, then train a **custom LoRA** on Fal.ai. The LoRA gets a **name** and a **trigger word**.
- **How it works**:
  1. Upload 5–15 images (and optionally run “Remove BG” per image via `/api/brand/remove-bg`).
  2. Images are uploaded to Supabase first (via `/api/library/save`) to avoid 50MB payload limits; only public URLs are sent to Fal.
  3. You start training via `/api/lora/train`; the app polls for completion (e.g. 120 × 5s).
  4. When ready, the LoRA appears in the **Imagineer** modal when you select the **Flux Dev (Supports LoRA)** model.
- **How it’s used**: In **Imagineer**, choose model “Flux Dev (Supports LoRA)”, pick your trained LoRA from the dropdown, and include the trigger word in the prompt. The backend sends the LoRA URL to Fal so generated images follow your product/brand look.

### 3.3 API Keys

- **What it is**: Secure storage of API keys (Wavespeed, Fal, OpenAI, ElevenLabs, Hugging Face) per user in Supabase.
- **How it works**: Keys are read/written via Supabase `user_api_keys`; the backend uses them (e.g. `getUserKeys`) for server-side calls. Keys are never exposed to the client.
- **Why it matters**: Image generation (Imagineer, Edit Image, etc.), video generation (JumpStart, Animate, Trip, Video Studio), LoRA training, and try-on all depend on the right keys being set.

---

## 4. Image Tools

### 4.1 Imagineer

- **What it does**: Text-to-image generation with a form-based prompt builder.
- **How it works**:
  - You set subject type, artistic style, lighting, camera angle, dimensions, mood, and optional elements. The app builds a prompt and calls `/api/imagineer/generate`.
  - Models: **Nano Banana Pro** (Wavespeed), **SeedDream 4.5** (ByteDance via Fal), **Flux Dev (Supports LoRA)** (Fal). For Flux Dev, you can select a trained LoRA and must include its trigger word in the description.
  - If the API returns a `requestId`, the frontend polls `/api/imagineer/result` (with the same `model`) until the image is ready. The result is added to Your Assets and saved to the Library.
- **Use when**: You need a new image from scratch (ads, concepts, product shots, UGC-style assets). Use Flux + LoRA for brand/product-consistent imagery.

### 4.2 Edit Image

- **What it does**: AI image editing from instructions (e.g. “change the background to a beach”).
- **How it works**: You provide one or more images (first = base), an edit prompt, model (Nano Banana Pro Ultra, Qwen Image Edit, Flux 2 Pro), and output size. The app calls `/api/images/edit`. If the backend returns a `requestId`, it polls for the result (e.g. via `/api/jumpstart/result` or the appropriate result endpoint).
- **Use when**: You need to change an existing image (background, object, style) without painting a mask.

### 4.3 Inpaint

- **What it does**: Remove or replace parts of an image by painting a mask.
- **How it works**: You upload an image, paint (or erase) the area to change, and add a prompt describing the desired result. The app sends image + mask + prompt to the inpaint API. Good for object removal or local edits.
- **Use when**: You need precise, localized changes (remove a person, replace an object, fix a region).

### 4.4 Smoosh

- **What it does**: Multi-image compositor: place several images on a canvas (drag, resize, rotate), then run one AI “enhancement” pass to blend and refine.
- **How it works**: You add images (upload, URL, or Library) onto a Konva canvas, choose dimensions and an enhancement preset (e.g. “Seamless Blend”, “Product Shot”, “Golden Hour”). The canvas is flattened to an image and sent with the preset prompt to `/api/smoosh/generate`. Result can be polled if async.
- **Use when**: You want one polished image from several assets (collages, product + lifestyle, multi-product shots).

### 4.5 Lens

- **What it does**: Adjust the “virtual” viewing angle of an image (horizontal/vertical angle, zoom) using AI.
- **How it works**: You upload an image and set angle/zoom sliders. The app calls an API that re-renders the image from the new viewpoint. Result is added to Your Assets and Library.
- **Use when**: You need the same product/person from a different angle without re-shooting.

### 4.6 Try Style

- **What it does**: Virtual try-on: put a garment (or style) onto a person photo.
- **How it works**: You provide a person image and a garment image (or similar), pick a model (e.g. FASHN, Flux 2 Stylized), and optional options (category, mode, prompt). The app calls the try-on API and shows the result. Result can be added to Your Assets and Library.
- **Use when**: You want to show how clothing or accessories look on a model or customer photo.

---

## 5. Video Tools

### 5.1 JumpStart (Image-to-Video)

- **What it does**: Turns a single image (and optionally an end frame or extra references) into a short video with motion, style, and optional audio.
- **How it works**:
  - You upload a start image (and for some models an end frame or multiple reference images). You set scene description, video style, camera movement/angle, effects, duration, resolution, and aspect ratio. Model-specific options (audio transcript, negative prompt, CFG, etc.) are supported.
  - Models include: Wavespeed WAN 2.2, Grok Imagine Video, Bytedance Seedance 1.5 Pro, Google Veo 3.1 / Veo 3.1 Fast, Veo 3.1 First & Last Frame, Kling 2.5 Turbo Pro. Request is sent to `/api/jumpstart/generate`. If the API returns a `requestId`, the frontend polls `/api/jumpstart/result` with **recursive setTimeout** (no setInterval) to avoid request pile-up.
  - On completion, the video is passed to the parent with **duration** (seconds) so the timeline can set `durationInFrames` (e.g. duration × 30) correctly.
  - Video is added to Your Assets and saved to the Library.
- **Use when**: You have a key image (e.g. from Imagineer or a photo) and want a 4–15s video for ads, social, or concepts.

### 5.2 Video Studio (Edit & Extend)

- **What it does**: **Edit** an existing video with a text prompt (change character, object, or background). **Extend** a video to make it longer using AI continuation.
- **How it works**:
  - **Edit**: You provide a video and an edit prompt; choose a model (e.g. Wavespeed WAN 2.2, Grok Imagine). Backend uses the appropriate edit API; result is polled if async, then added to Your Assets and Library.
  - **Extend**: You provide a video and choose duration increment; models include Seedance and Veo 3.1 Fast Extend. Same poll-and-save flow.
- **Use when**: You need to change something in an existing clip or lengthen it for the platform.

### 5.3 Trip (Restyle)

- **What it does**: Changes the visual style of a video (e.g. to Anime, Film Noir, Cyberpunk) while preserving motion and structure.
- **How it works**: You upload (or pick from Library) a video and choose a style preset or custom style description. The app calls the restyle API (e.g. Lucy-Restyle or equivalent). Result is a new video with the new look. Added to Your Assets and Library.
- **Use when**: You want the same motion in a different aesthetic (e.g. for A/B tests or creative variants).

### 5.4 Animate

- **What it does**: **Move**: animate a character from a single image using the motion from a reference video. **Replace**: swap the character in a video with your character image while keeping the scene.
- **How it works**: You provide a reference video and a character image, choose mode (Move or Replace) and resolution. The app calls `/api/animate/generate`; if a `requestId` is returned, it polls `/api/animate/result` with **recursive setTimeout**. On completion, you can save to Library and add to the editor.
- **Use when**: You need a character (e.g. brand mascot or influencer) to perform a motion from another video, or to insert a character into an existing scene.

### 5.5 Library

- **What it does**: Browse, play, and select previously saved images and videos from Supabase storage.
- **How it works**: Lists media from the user’s library (filter by type: image/video). You can pick an item to insert into the current workflow (e.g. as source for JumpStart, Trip, Edit Image, or to add to Your Assets). Delete is available where implemented.
- **Use when**: Reusing assets across tools or building from past work.

---

## 6. How Features Work Together

### 6.1 Common Pipelines

- **Brand product imagery**: **Brand Assets** (train LoRA) → **Imagineer** (Flux Dev + LoRA + trigger word) → image in Library/Your Assets. Optional: **JumpStart** to turn that image into a video.
- **UGC-style ad**: **Imagineer** (e.g. UGC style presets) → image → **JumpStart** (e.g. Grok/Seedance with audio) → video in Timeline.
- **Refine then animate**: **Edit Image** or **Inpaint** to clean up an image → **JumpStart** or **Animate** to create video.
- **Multi-asset creative**: **Imagineer** or upload several images → **Smoosh** to composite → optional **Edit Image** or **Lens** → use result in **JumpStart** or **Video Studio**.
- **Style variation**: Existing video → **Trip** (restyle) → new variant; or **Video Studio** (edit) to change content.
- **Character-driven ad**: Character photo + reference motion video → **Animate** (Move or Replace) → use result in Timeline or **Video Studio** (extend).

### 6.2 Shared Behaviours

- **Async jobs**: Many tools return a `requestId` and require polling. The app uses **recursive setTimeout** (not setInterval) so the next poll runs only after the previous one finishes, avoiding overlapping requests and server load.
- **Library**: Generated images and videos are saved to the Library (and shown in Your Assets) so every tool can use them as inputs.
- **Platform**: The platform selector affects preview and timeline dimensions; keep the target platform in mind when choosing aspect ratios in each tool.

---

## 7. What You Can Use Stitch For

- **Social ads**: TikTok, Reels, Shorts, Facebook/Instagram feed and stories, LinkedIn, Pinterest (platform presets and safe zones).
- **Brand content**: Consistent product/brand imagery via LoRA + Imagineer (Flux Dev); then optional video via JumpStart.
- **UGC-style content**: Imagineer’s UGC/selfie-style presets + JumpStart with audio for testimonial-style clips.
- **Product shots**: Imagineer, Edit Image, Smoosh, Lens for stills; JumpStart for product-in-motion.
- **Character / influencer content**: Animate (Move/Replace) to get a character to perform a motion or replace someone in a scene.
- **Creative variation**: Trip for style variants; Video Studio for edits and length; multiple Imagineer/Smoosh outputs for A/B tests.
- **E-commerce / try-on**: Try Style for virtual try-on; Imagineer + LoRA for on-brand product imagery.

---

## 8. Technical Notes (for implementers)

- **Auth**: User context from `useAuth`; API keys and brand data are per user.
- **APIs**: Backend uses Wavespeed and Fal (and optionally OpenAI, ElevenLabs, Hugging Face) via stored keys. Key endpoints: `imagineer/generate`, `imagineer/result`, `jumpstart/generate`, `jumpstart/result`, `lora/train`, `lora/result`, `animate/generate`, `animate/result`, `library/save`, `brand/kit`, `brand/remove-bg`, `images/edit`, etc.
- **Polling**: Always use recursive `setTimeout` in the frontend for status checks; clear the timeout on unmount and on success/failure. Same pattern in JumpStart, Animate, and Imagineer result polling.
- **Timeline**: Remotion composition uses `durationInFrames` (e.g. 30 fps). JumpStart passes `durationInSeconds` so the creator can set `durationInFrames = durationInSeconds * 30`.
- **LoRA**: Train in Brand Assets (images to Supabase, then `/api/lora/train` with public URLs). Use in Imagineer with model “fal-flux” and `loraUrl`; backend passes it to Fal Flux. Poll with `model: 'fal-flux'` in `/api/imagineer/result` (handled by `pollFalFlux`).

---

## 9. Quick Reference — Tools and Purpose

| Tool           | Purpose in one line                                                                 |
|----------------|-------------------------------------------------------------------------------------|
| Brand Kit      | Store brand name, colors, logo, voice, taglines, style preset.                      |
| Brand Assets   | Train a custom LoRA from product photos; use in Imagineer (Flux Dev).               |
| API Keys       | Store Wavespeed, Fal, OpenAI, ElevenLabs, Hugging Face keys per user.              |
| Imagineer      | Text-to-image (Nano Banana, SeedDream, Flux Dev + optional LoRA).                  |
| Edit Image     | Edit images with a text prompt (multiple models, multiple output sizes).            |
| Inpaint        | Remove/replace image regions by painting a mask.                                    |
| Smoosh         | Composite multiple images on a canvas, then one AI enhancement pass.                |
| Lens           | Change virtual viewing angle/zoom of an image.                                      |
| Try Style      | Virtual try-on: garment (or style) on a person photo.                                |
| JumpStart      | Image-to-video (many models, optional audio/end frame); feeds timeline duration.   |
| Video Studio   | Edit video with prompt or extend duration.                                          |
| Trip           | Restyle video (keep motion, change look).                                           |
| Animate        | Move: character image + reference video → character motion. Replace: swap character in video. |
| Library        | Browse and select saved images/videos for use in any tool.                           |

---

*End of SOP Guide. For setup and run instructions, see the main README.*
