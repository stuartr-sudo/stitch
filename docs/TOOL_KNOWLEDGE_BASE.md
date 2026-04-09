# Stitch Tool Knowledge Base
## Complete Audit for Flows Automation Builder

> Generated 2026-04-09. Every tool, every endpoint, every cross-tool connection.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Image Tools](#image-tools)
3. [Video Tools](#video-tools)
4. [Social & Publishing Tools](#social--publishing-tools)
5. [Advertising Tools](#advertising-tools)
6. [Orchestration Tools](#orchestration-tools)
7. [Brand & Setup Tools](#brand--setup-tools)
8. [Shared Infrastructure](#shared-infrastructure)
9. [Cross-Tool Flow Map](#cross-tool-flow-map)
10. [Automation Flow Node Candidates](#automation-flow-node-candidates)
11. [Known Bugs & Dead Code](#known-bugs--dead-code)

---

## Architecture Overview

**Stack:** React 18 + Express + Supabase (Postgres + Auth + Storage)
**AI Providers:** FAL.ai (~43 endpoints), Wavespeed (~7 endpoints), OpenAI (GPT-4.1/5-mini)
**API Pattern:** `POST /api/{tool}/{action}` with JWT auth via `authenticateToken` middleware
**Inter-tool Communication:** `window.dispatchEvent(new CustomEvent('open-tool', { detail: { tool, imageUrl, model, referenceImages } }))` — VideoAdvertCreator hub listens and routes.

---

## Image Tools

### 1. Imagineer (Text-to-Image & Image-to-Image)

**Route:** Modal in `/studio` (VideoAdvertCreator)
**Files:** `src/components/modals/ImagineerModal.jsx`, `api/imagineer/generate.js`, `api/imagineer/edit.js`, `api/imagineer/result.js`, `api/imagineer/describe-character.js`, `api/imagineer/turnaround.js`, `api/imagineer/character-reel.js`

#### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/imagineer/generate` | Text-to-image generation |
| POST | `/api/imagineer/edit` | Image-to-image editing (single or multi-image) |
| POST | `/api/imagineer/result` | Poll async generation status |
| POST | `/api/imagineer/describe-character` | GPT-4.1-mini vision analysis of image |
| POST | `/api/imagineer/turnaround` | Multi-pose character turnaround sheet |
| POST | `/api/imagineer/character-reel` | Animated character reel from pose images |

#### `/api/imagineer/generate` — T2I
**Body:** `{ prompt, style, dimensions, model, loras: [{ url, scale }] }`
**Models:** nano-banana-2 (default), fal-flux, klein-4b, klein-9b, wan22-t2i, seedream, kling-image-o3
**Dimensions:** 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16
**100+ Style Presets** in `STYLE_PROMPTS` map (iphone-selfie, anime, oil-painting, cinematic, etc.)
**LoRA Support:** `loras: [{ url, scale, transformer? }]` — supports dual-transformer targeting for wan22/klein
**Returns:** `{ success, imageUrl?, requestId?, status, pollEndpoint }`

#### `/api/imagineer/edit` — I2I
**Body:** `{ image_url OR image_urls[], prompt, mask_url?, strength, dimensions, model, loras }`
**Models:** nano-banana-2 (supports image_urls[]), nano-banana-pro, seedream, seedream-5-lite, fal-flux
**Multi-Image:** nano-banana-2 and seedream accept `image_urls[]` for compositing
**Returns:** Same as generate

#### `/api/imagineer/turnaround`
**Body:** `{ characterDescription, referenceImageUrl OR referenceImageUrls[], style, model, loras, negativePrompt, props, brandStyleGuide, poseSet, backgroundMode, sceneEnvironment }`
**8 Pose Sets:**
- `3d-angles` (2x2): Front, Right, Back, Left orthographic
- `3d-action` (2x2): Dynamic action poses
- `r2v-reference` (3x2): Full body + matching portraits per angle (R2V optimized)
- `standard-24` (4x6): Classic turnaround + expressions + walk cycles + actions + details
- `expressions-focus` (4x6): 16 expression cells
- `action-heavy` (6x4): Combat/movement/power poses
- `fashion-outfit` (6x4): Outfit variations + seasonal + accessories
- `creature-non-human` (6x4): Wings/movement/interaction + special views
**Background Modes:** 'white' (default), 'gray' (production standard), 'scene' (R2V-compatible)
**Auto-upscales** result 2x via Topaz (`fal-ai/topaz/upscale/image`)
**Fallback chain:** nano-banana-2-edit → nano-banana-pro → seedream

#### `/api/imagineer/character-reel`
**Body:** `{ pose_images[] (3-8), video_model, duration_per_transition (3-6s), music_mood?, loop }`
**Flow:** Sequential transitions between poses → optional music → FFmpeg concat
**Returns:** `{ reel_url, clips[], total_duration }`

#### `/api/imagineer/describe-character`
**Body:** `{ imageUrl }`
**Returns:** `{ description }` — GPT-4.1-mini vision analysis (max 500 tokens)

**Outputs to:** Inpaint (`open-tool: inpaint`), Turnaround (`open-tool: turnaround`), Edit Image (`open-tool: imagineer-edit`), Library (`/api/library/save`), Shorts Workbench (keyframes), Storyboard (frame previews)

---

### 2. Edit Image
**Files:** `src/components/modals/EditImageModal.jsx`, `api/images/edit.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/images/edit` | AI-powered image editing |

**Body:** `{ images[], prompt, model, outputSize }`
**Models:** wavespeed-nano-ultra (default), wavespeed-qwen, wavespeed-kling-o3, fal-flux
**Returns:** `{ success, imageUrl?, requestId?, status }`

---

### 3. Inpaint
**Files:** `src/components/modals/InpaintModal.jsx`, `api/images/inpaint.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/images/inpaint` | Selective region editing with mask |

**Body:** `{ image_url, mask_url, prompt }`
**Model:** fal-ai/qwen-image-edit/inpaint
**Mask:** White=edit, Black=keep
**Returns:** `{ success, imageUrl?, requestId?, status }`
**Outputs to:** Imagineer (`open-tool: imagineer-edit`), Turnaround, Storyboard

---

### 4. Smoosh (Compositor)
**Files:** `src/components/modals/SmooshModal.jsx`, `api/smoosh/generate.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/smoosh/generate` | Canvas composition with AI enhancement |

**Body:** `{ image, prompt, width (1080), height (1080) }`
**Model:** Wavespeed nano-banana-pro/edit

---

### 5. Lens (Multi-Angle)
**Files:** `src/components/modals/LensModal.jsx`, `api/lens/generate.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/lens/generate` | Adjust viewing angle of image |

**Body:** `{ image_url, horizontal_angle, vertical_angle, zoom }`
**Primary:** fal-ai/qwen-image-edit-2511-multiple-angles
**Fallback:** Wavespeed qwen-image/edit-2511 (prompt-based)

---

### 6. 3D Viewer
**Files:** `src/components/modals/ThreeDViewerModal.jsx`, `api/viewer3d/generate.js`, `api/viewer3d/result.js`, `api/viewer3d/animate.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/viewer3d/generate` | Image-to-3D GLB via Hunyuan 3D |
| POST | `/api/viewer3d/result` | Poll 3D generation status |
| POST | `/api/viewer3d/animate` | Create animated 3D sequence |

**Generate Body:** `{ front_image_url, back_image_url, left_image_url, prompt? }`
Auto-upscales all 3 images 2x via Topaz before submission.
**Returns:** GLB file uploaded to Supabase `media/3d/{userId}/`

**Animate Body:** `{ angle_images[] (2+), animation_style, video_model, duration_per_transition (3-8s) }`
**Styles:** turntable_360, hero_reveal, explode_view, cinematic_orbit

---

### 7. TryStyle (Virtual Try-On)
**Files:** `src/components/modals/TryStyleModal.jsx`, `api/trystyle/generate.js`, `api/trystyle/result.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/trystyle/generate` | Virtual clothing try-on |
| POST | `/api/trystyle/result` | Poll try-on status |

**Body:** `{ model_image, garment_image, model: 'fashn'|'flux2-lora', category, mode, num_samples }`
**Returns:** `{ images[] }` or `{ requestId, status }` (async)

---

### 8. Library (Asset Storage)
**Files:** `src/components/modals/LibraryModal.jsx`, `api/library/*.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/library/save` | Save image/video to library |
| GET | `/api/library/filters` | Get distinct metadata for filtering |
| POST | `/api/library/upload` | Direct file upload |
| POST | `/api/library/update-thumbnail` | Update item thumbnail |
| GET/POST | `/api/library/tags` | List/create tags |
| POST | `/api/library/tags/auto-tag` | Auto-tag images |
| POST/DELETE | `/api/library/tags/assign` | Assign/unassign tags to images |

**Tables:** `image_library_items`, `generated_videos`, `image_tags`, `image_tag_links`
**Used by:** ALL image/video generation tools save here. Shorts, Storyboard, Carousel load from here.

---

### 9. LoRA Training
**Files:** `src/components/modals/BrandAssetsModal.jsx`, `api/lora/*.js`, `api/lib/trainingModelRegistry.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/lora/train` | Submit LoRA training job |
| POST | `/api/lora/result` | Poll training status |
| POST | `/api/lora/caption` | GPT-4o-mini auto-caption per image |
| GET | `/api/lora/models` | List available training models |
| GET | `/api/lora/library` | Pre-built LoRA library |

**Train Body:** `{ name, trigger_word, image_urls[] (max 25), model, training_type, is_style, create_masks, captions[], steps, learning_rate, brand_username, visual_subject_id }`

**18 Training Models** including: flux-lora-fast ($2 flat), flux-portrait, flux-kontext, wan-22-image, qwen-image, z-image, hunyuan-video, turbo-flux, flux-2-v2, flux-2-klein-4b, flux-2-klein-9b, z-image-v2, qwen-2512, qwen-2512-v2, ltx2-video, qwen-edit-2511

**Flow:** Upload images → Create zip with captions → Submit to FAL queue → Poll → .safetensors uploaded to Supabase → Available via LoRAPicker

---

## Video Tools

### 10. JumpStart Video Studio
**Files:** `src/components/modals/JumpStartVideoStudioModal.jsx`, `api/jumpstart/*.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/jumpstart/generate` | Image-to-video generation |
| POST | `/api/jumpstart/result` | Poll video generation status |
| POST | `/api/jumpstart/save-video` | Download and save to Supabase |
| POST | `/api/jumpstart/edit` | Video editing (restyle) |
| POST | `/api/jumpstart/extend` | Extend video duration |
| POST | `/api/jumpstart/erase` | Remove objects from video |

**Generate FormData:** `{ image (file), prompt, model, resolution, duration, aspectRatio, enableAudio, audioTranscript }`

**15+ Video Models:** veo3 (Veo 3.1 Fast), veo3-lite, veo3-first-last, pixverse-v6, kling-r2v-pro/standard, kling-o3-v2v-pro/standard, seedance-pro, grok-imagine, grok-r2v, ltx-audio-video, ltx-iclora, kling-video

**Edit Body:** `{ videoUrl, prompt, model: 'wavespeed'|'grok-edit', resolution, seed, negativePrompt }`

**Extend Body:** `{ videoUrl, prompt, model, duration, resolution, generate_audio, camera_fixed }`
**3 Extend Families:** Seedance (Wavespeed, 5-10s), Veo 3.1 Fast (FAL, fixed 7s), Grok (FAL, 2-10s)

**Erase Body:** `{ video_url, prompt, preserve_audio, auto_trim }`
**Model:** Bria Video Erase (max 5s input)

---

### 11. Shorts Workbench (5-Step Pipeline)
**Files:** `src/pages/ShortsWorkbenchPage.jsx`, `api/workbench/workbench.js`

**Single endpoint:** `POST /api/workbench/:action`

| Action | Purpose | Key Inputs | Key Outputs |
|--------|---------|------------|-------------|
| `voiceover` | TTS narration | text, voice, style_instructions, speed | audio_url |
| `timing` | Word timestamps + scene alignment | audio_url, video_model, framework_id, video_length_preset | blocks[] with clipDuration, startTime, endTime, narration |
| `music` | Background music generation | niche, duration, music_model | audio_url |
| `generate-frame` | Per-scene keyframe image | narration, visual_style, image_model, aspect_ratio, reference_image_url, scene_index, niche, characters[] | image_url, vision_context |
| `generate-clip` | Per-scene video clip | imageUrl, prompt, video_model, duration, generate_audio, loras[] | video_url |
| `assemble` | FFmpeg composition | clips[], voiceover_url, music_url, captions_enabled, caption_style, music_volume | video_url |
| `save-draft` | Persist workbench state | storyboard_json, name, campaign_id | draft_id |
| `load-draft` | Restore workbench state | draft_id | storyboard_json |
| `list-drafts` | List saved drafts | — | drafts[] |

**20 Niches:** ai_tech_news, finance_money, motivation_self_help, scary_horror, history_did_you_know, true_crime, science_nature, relationships_dating, health_fitness, gaming_popculture, conspiracy_mystery, business_entrepreneur, food_cooking, travel_adventure, psychology_mindblown, space_cosmos, animals_wildlife, sports_athletes, education_learning, paranormal_ufo

**30 Gemini Voices:** Perseus, Aoede, Charon, Fenrir, Kore, Orpheus, Hades, Gaia, Oceanus, Rhea, Theia, Themis, Iapetus, Coeus, Cronus, Hyperion, Mnemosyne, Phoebe, Tethys, Crius, Adam, Brian, Roger, Eve, Grace, Jacob, Joshua, Liam, Nicole, Olivia

**76 Video Style Frameworks** in `api/lib/videoStyleFrameworks.js` — structural templates defining scene count, beats, pacing, TTS instructions per 60s and 90s durations.

**Music Models:** elevenlabs (default), minimax, fal_lyria2, suno
**Caption Styles:** word_pop, karaoke_glow, word_highlight, news_ticker

**FLF Models** (First-Last-Frame): fal_veo3, fal_kling_v3, fal_kling_o3
**I2V Models** (Image-to-Video): All others

---

### 12. Storyboards
**Files:** `src/pages/StoryboardWorkspace.jsx`, `src/pages/StoryboardsPage.jsx`, `api/storyboard/projects.js`, `api/storyboard/generate.js`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/storyboard/projects` | List storyboards |
| POST | `/api/storyboard/projects` | Create new storyboard |
| GET | `/api/storyboard/projects/:id` | Get storyboard + frames |
| PUT | `/api/storyboard/projects/:id` | Update metadata |
| DELETE | `/api/storyboard/projects/:id` | Delete + all frames |
| PUT | `/api/storyboard/projects/:id/frames/:frameId` | Update frame |
| DELETE | `/api/storyboard/projects/:id/frames/:frameId` | Delete + renumber |
| POST | `/api/storyboard/projects/:id/frames/:frameId/split` | Split scene in two |
| POST | `/api/storyboard/projects/:id/share` | Generate share link |
| GET | `/api/storyboard/review/:token` | Public review (no auth) |
| POST | `/api/storyboard/review/:token/comment` | Add review comment |
| POST | `/api/storyboard/generate-scenes` | AI script → frames |
| POST | `/api/storyboard/describe-scene` | GPT visual analysis |
| POST | `/api/storyboard/assemble` | Video assembly |
| GET | `/api/storyboard/presets` | List visual presets |

**Script Generation:** 2-stage GPT pipeline (narrative generator → visual director)
**Settings-first flow:** Create → configure → Generate Script → preview images → inline edit → export PDF → share review → approve for production

---

### 13. Animate
**Files:** `api/animate/generate.js`, `api/animate/result.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/animate/generate` | Element animation (move/replace) |
| POST | `/api/animate/result` | Poll status |

**Body:** `{ video_url, image_url, mode: 'move'|'replace', resolution, guidance_scale, num_inference_steps }`
**FAL:** fal-ai/wan/v2.2-14b/animate/move or /replace

---

### 14. Motion Transfer
**Files:** `api/motion-transfer/generate.js`, `api/motion-transfer/result.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/motion-transfer/generate` | Transfer motion from video to image |
| GET | `/api/motion-transfer/result` | Poll status |

**Body:** `{ image_url, video_url, character_orientation?, prompt?, negative_prompt?, keep_original_sound?, elements[] }`
**Model:** fal-ai/wan/v2.2-14b/motion-transfer

---

### 15. Trip (Restyle)
**Files:** `api/trip/restyle.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/trip/restyle` | Video style transfer |

**Body:** `{ videoUrl, prompt }`
**Model:** Lucy Restyle by Decart (Wavespeed)

---

### 16. Audio Studio
**Files:** `api/audio/voiceover.js`, `api/audio/music.js`, `api/audio/captions.js`, `api/audio/generate.js`, `api/audio/result.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/audio/voiceover` | Text-to-speech |
| POST | `/api/audio/music` | Background music generation |
| POST | `/api/audio/captions` | Burn captions onto video |
| POST | `/api/audio/generate` | Generic audio generation |
| POST | `/api/audio/result` | Poll audio status |

**TTS Providers:** Gemini 2.5-Flash-TTS (30 voices), ElevenLabs via FAL
**Music Models:** elevenlabs (default), minimax, suno, fal_lyria2
**Caption Styles:** word_pop, karaoke_glow, word_highlight, news_ticker

---

### 17. Video Analyzer & Clone Ad
**Files:** `api/analyze/video.js`, `api/analyze/video-gemini.js`, `api/analyze/clone-ad.js`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/analyze/video` | Analyze video (3-frame + transcript) |
| POST | `/api/analyze/video-gemini` | Enhanced analysis (12-frame) |
| POST | `/api/analyze/clone-ad` | Extract ad recipe for cloning |

**Video Analyzer Returns:** title, hook, setting, characters, plot_structure, pacing, visual_style, motion, colors, mood
**Clone Ad Returns:** ad_insights (hook, value_prop, CTA, audience) + clone_recipe (scene structure, models, voiceover style) + optional brand_adaptation

---

## Social & Publishing Tools

### 18. LinkedIn Tool
**Files:** `src/pages/LinkedInPage.jsx`, `src/components/linkedin/`, `api/linkedin/`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/linkedin/search-keyword` | Search for topic ideas |
| POST | `/api/linkedin/add-topic` | Add URL as topic |
| POST | `/api/linkedin/add-search-result` | Add search result as topic |
| GET | `/api/linkedin/topics` | List topic queue |
| PATCH | `/api/linkedin/topics/:id` | Update topic status |
| POST | `/api/linkedin/generate` | Generate 3 post variations |
| GET | `/api/linkedin/posts` | List all posts |
| GET | `/api/linkedin/posts/:id` | Get post detail |
| PATCH | `/api/linkedin/posts/:id` | Edit post content |
| POST | `/api/linkedin/posts/:id/recompose` | Regenerate image |
| POST | `/api/linkedin/posts/:id/regenerate` | Regenerate content |
| POST | `/api/linkedin/posts/:id/publish` | Publish to LinkedIn |
| DELETE | `/api/linkedin/posts/:id` | Delete post |
| GET/PUT | `/api/linkedin/config` | Series title, CTA config |
| GET | `/api/linkedin/oauth/auth` | Start OAuth flow |
| GET | `/api/linkedin/oauth/callback` | Handle OAuth return |

**Generate Body:** `{ topic_id, template_index (0-5), style_preset, brand_kit_id, carousel_style, style_overrides, post_format, writing_style: 'contrarian'|'story'|'data'|'all' }`
**Flow:** Topic → 3 GPT-4.1 variations → gpt-5-mini excerpt → Nano Banana 2 image → Satori composition → LinkedIn API v2 publish
**Image:** 1080x1080 branded composition via `composeLinkedInSatori.js` (8 carousel style templates)

---

### 19. Carousel Builder
**Files:** `src/pages/CarouselPage.jsx`, `src/components/carousel/`, `api/carousel/`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/carousel` | Create carousel |
| GET | `/api/carousel` | List carousels |
| GET | `/api/carousel/:id` | Get carousel + slides |
| PUT | `/api/carousel/:id` | Update carousel |
| DELETE | `/api/carousel/:id` | Delete |
| POST | `/api/carousel/:id/generate-content` | 2-stage GPT content |
| POST | `/api/carousel/:id/generate-images` | AI background + Satori |
| POST | `/api/carousel/:id/generate-videos` | Animate slides |
| POST | `/api/carousel/:id/assemble-video` | FFmpeg video assembly |
| POST | `/api/carousel/:id/create-slideshow` | Static slideshow + optional voiceover |
| POST | `/api/carousel/:id/rerun-audio` | Regenerate audio |
| PUT | `/api/carousel/:id/slides/:slideId` | Update slide |
| POST | `/api/carousel/:id/slides/:slideId/regenerate` | Regenerate slide |
| POST | `/api/carousel/:id/reorder` | Reorder slides |
| POST | `/api/carousel/:id/publish` | Multi-platform publish |

**Platforms:** Instagram (4:5/1:1, 6-10 slides), LinkedIn (1:1, 6-10), TikTok (9:16, 5-8), Facebook (1:1, 5-8)
**Content Generation:** 2-stage GPT (research synthesis → slide writing)
**Two output modes:** Video Carousel (AI-animated) or Slideshow (static + optional voiceover)
**8 Style Templates:** bold_editorial, minimal, magazine, data_driven, narrative_arc, lifestyle, professional, creative_vibrant

---

### 20. Publishing System

**Platform Publishers:**
| Publisher | File | API Used |
|-----------|------|----------|
| LinkedIn | `api/lib/linkedinPublisher.js` | LinkedIn REST API v2 |
| Instagram | `api/lib/instagramPublisher.js` | Meta Graph API v21.0 |
| Facebook | `api/lib/facebookPublisher.js` | Meta Graph API v21.0 |
| TikTok | `api/lib/tiktokPublisher.js` | TikTok Open Platform v2 |
| YouTube | `api/youtube/upload.js` | YouTube Data API v3 |

**Token Manager** (`api/lib/tokenManager.js`): Unified `platform_connections` table, auto-refresh within 5min of expiry.

**Publish Queue:**
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/publish/schedule` | Schedule item for future publish |
| GET | `/api/publish/queue` | List scheduled items |
| POST | `/api/publish/retry` | Retry failed publish |
| POST | `/api/publish/cancel` | Cancel scheduled item |

**Scheduled Publisher** (`api/lib/scheduledPublisher.js`): Background poller, checks `publish_queue` for due items, calls platform publisher.

---

## Advertising Tools

### 21. Ads Manager
**Files:** `src/pages/AdsManagerPage.jsx`, `src/pages/AdCampaignEditor.jsx`, `api/ads/`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ads/campaigns` | Create campaign |
| GET | `/api/ads/campaigns` | List campaigns |
| GET | `/api/ads/campaigns/:id` | Get campaign + variations |
| PATCH | `/api/ads/campaigns/:id` | Update campaign |
| DELETE | `/api/ads/campaigns/:id` | Delete |
| POST | `/api/ads/campaigns/:id/generate` | Generate platform-specific variations |
| PATCH | `/api/ads/variations/:id` | Edit variation |
| DELETE | `/api/ads/variations/:id` | Delete variation |
| POST | `/api/ads/variations/:id/regenerate` | Regenerate with style_preset |
| POST | `/api/ads/variations/:id/split-test` | Create A/B test |
| POST | `/api/ads/variations/:id/publish-linkedin` | Publish to LinkedIn |
| GET | `/api/ads/campaigns/:id/export` | Google Ads CSV export |
| POST | `/api/ads/synthesize-description` | AI-refine product description |
| POST | `/api/ads/enhance-prompt` | Improve image gen prompt |
| POST | `/api/ads/upload-image` | Upload custom image |
| GET | `/api/ads/google/auth` | Google Ads OAuth |
| GET | `/api/ads/google/callback` | Google Ads callback |

**Generate Body:** `{ platforms: ['linkedin','google','meta'], style: 'storytelling'|'data_driven'|'default', include_images }`

**Copy Schemas per Platform:**
- **LinkedIn:** introText (600 chars), headline (200), description (300), CTA
- **Google RSA:** 15 headlines (30 chars each), 4 descriptions (90 chars each)
- **Meta:** primaryText (125 above-fold), headline (40), description (30), CTA

---

### 22. Ad Intelligence
**Files:** `src/pages/AdIntelligencePage.jsx`, `api/intelligence/`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/intelligence/search` | Multi-source competitor ad search |
| POST | `/api/intelligence/analyze-ad` | GPT-4.1 ad teardown |
| POST | `/api/intelligence/analyze-landing` | Landing page analysis |
| POST | `/api/intelligence/synthesize` | Combine analyses into brief |
| POST | `/api/intelligence/generate-campaign` | Research-enriched campaign |
| GET/POST/PUT/DELETE | `/api/intelligence/library*` | Saved ad library CRUD |
| GET/POST/PUT/DELETE | `/api/intelligence/competitors*` | Competitor profiles CRUD |

**Search Sources:** Meta Ad Library (Firecrawl scrape), Exa neural search, SerpAPI, RAG knowledge base
**Cross-tool:** `openWithContext()` injects research into Command Center chat

---

## Orchestration Tools

### 23. Command Center
**Files:** `src/pages/CommandCenterPage.jsx`, `src/contexts/CommandCenterContext.jsx`, `src/components/command-center/ChatBubble.jsx`, `api/command-center/`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/command-center/chat` | SSE streaming AI chat |
| POST | `/api/command-center/threads` | Create conversation thread |
| GET | `/api/command-center/threads` | List threads |
| GET | `/api/command-center/threads/:id/messages` | Get thread messages |
| DELETE | `/api/command-center/threads/:id` | Delete thread |
| POST | `/api/command-center/items/:id/approve` | Approve for publish |
| POST | `/api/command-center/items/:id/reject` | Reject with reason |
| POST | `/api/command-center/items/:id/rebuild` | Regenerate content |
| POST | `/api/command-center/items/:id/publish` | Publish to platforms |
| PUT | `/api/command-center/items/:id` | Update item |
| DELETE | `/api/command-center/items/:id` | Delete item |
| GET | `/api/command-center/campaigns` | List campaigns |
| GET | `/api/command-center/campaigns/:id` | Campaign details |
| GET | `/api/command-center/stats` | Dashboard stats |
| GET | `/api/command-center/calendar` | Calendar events |

**AI Tools (Function Calling):** search_trending, research_topic, search_brand_knowledge, get_existing_content, search_competitor_library
**Orchestrates:** Shorts, Carousel, LinkedIn, Ads, Storyboard via direct API calls

---

### 24. Automation Flows
**Files:** `src/pages/FlowsListPage.jsx`, `src/pages/FlowBuilderPage.jsx`, `api/flows/`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/flows` | List user's flows |
| POST | `/api/flows` | Create flow |
| GET | `/api/flows/:id` | Get flow definition |
| PUT | `/api/flows/:id` | Update flow |
| DELETE | `/api/flows/:id` | Delete flow |
| POST | `/api/flows/:id/execute` | Execute flow (async) |
| GET | `/api/flows/:id/executions` | List past executions |
| GET | `/api/flows/executions/:execId` | Execution status + step states |
| POST | `/api/flows/executions/:execId/pause` | Pause execution |
| POST | `/api/flows/executions/:execId/resume` | Resume execution |
| POST | `/api/flows/executions/:execId/retry/:nodeId` | Retry failed node |
| POST | `/api/flows/executions/:execId/cancel` | Cancel execution |
| GET | `/api/flows/node-types` | Available node types |
| GET | `/api/flows/templates` | Pre-built flow templates |
| POST | `/api/flows/templates/:id/clone` | Clone template |

**Execution Model:** Graph-based (nodes + edges JSON), step states per node, pause/resume/retry
**Tables:** `automation_flows`, `automation_executions`

---

## Brand & Setup Tools

### 25. Brand Kit
**Files:** `src/components/modals/BrandKitModal.jsx`, `api/brand/`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/brand/kit` | Get user's brands |
| POST | `/api/brand/kit` | Create/update brand |
| DELETE | `/api/brand/kit` | Delete brand |
| POST | `/api/brand/extract-pdf` | Extract brand from PDF |
| POST | `/api/brand/extract-url` | Extract brand from website URL |
| POST | `/api/brand/remove-bg` | Remove image background |
| GET | `/api/brand/usernames` | List available usernames |
| GET | `/api/brand/guidelines` | SEWO-connected guidelines |
| GET | `/api/brand/avatars` | List avatars |
| POST | `/api/brand/avatars` | Create avatar |
| DELETE | `/api/brand/avatars/:id` | Delete avatar |
| POST | `/api/brand/train-avatar` | Train LoRA for avatar |

**22 Brand Fields:** brand_name, brand_username, colors, logo_url, voice_style, taglines, style_preset, target_market, brand_personality, brand_voice_detail, content_style_rules, preferred_elements, prohibited_elements, visual_style_notes, mood_atmosphere, lighting_prefs, composition_style, ai_prompt_rules, blurb, website, default_loras

---

### 26. Cost & Health

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/costs/summary` | Cost breakdown by category/month |
| GET | `/api/providers/health` | Check OpenAI, FAL, Wavespeed status |

**Cost Categories:** openai, fal, wavespeed, elevenlabs

---

### 27. Review Widget
**Files:** `src/components/review/ReviewWidget.jsx`, `src/components/review/reviewToolMap.js`, `api/reviews/`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/reviews/upload` | Upload screenshot |
| GET | `/api/reviews/pending` | List pending reviews |
| GET/POST | `/api/reviews/reviews` | List/create reviews |
| POST | `/api/reviews/resolve` | Resolve review |
| GET/POST | `/api/reviews/comments` | Get/add comments |
| GET | `/api/reviews/get` | Get single review |
| POST | `/api/reviews/update` | Update review |

**Types:** bug, question, feature, console_error, change_request, learn_screenshot, prompt_review, claude_md_update

---

## Shared Infrastructure

### Model Registry (`api/lib/modelRegistry.js`)
**12 Image Models:** fal_nano_banana, fal_flux, fal_klein_4b, fal_klein_9b, fal_wan22_t2i, fal_seedream, fal_imagen4, fal_kling_img, fal_grok, fal_ideogram, wavespeed
**15 Video Models:** fal_kling, fal_kling_v3, fal_kling_o3, fal_veo2, fal_veo3, fal_veo3_lite, fal_pixverse, fal_pixverse_v6, fal_wan25, fal_wan_pro, fal_hailuo, fal_grok_video, wavespeed_wan

### Media Generator (`api/lib/mediaGenerator.js`)
- `generateImageV2(modelKey, prompt, aspectRatio, keys, supabase, opts)`
- `animateImageV2(modelKey, imageUrl, motionPrompt, aspectRatio, duration, keys, supabase, opts)`
- `animateMultiShot(modelKey, imageUrl, multiPrompt, totalDuration, aspectRatio, keys, supabase, opts)`

### Pipeline Helpers (`api/lib/pipelineHelpers.js`)
- `pollFalQueue()`, `pollWavespeedRequest()`
- `uploadUrlToSupabase()`, `assembleShort()`, `assembleCarouselVideo()`, `assembleCarouselSlideshow()`
- `generateMusic()`, `extractFirstFrame()`, `extractLastFrame()`
- `generateSoundEffect()`, `buildSfxPrompt()`, `buildMusicPrompt()`

### Prompt Builder (`api/prompt/build-cohesive.js`)
- GPT-powered prompt assembly from structured inputs
- Used by Imagineer T2I, I2I, Turnaround, Storyboard

---

## Cross-Tool Flow Map

### Sequential Pipelines (for Flows automation)

**1. Short-Form Video Pipeline**
```
Brand Kit → Script Generation (GPT-4.1 + niche template)
  → TTS Voiceover (Gemini 30 voices)
  → Word Timestamps (Whisper) + Block Alignment
  → Background Music (ElevenLabs/MiniMax)
  → Keyframe Images (Imagineer with StyleGrid + LoRA)
  → Video Clips (FLF or I2V per scene)
  → FFmpeg Assembly + Caption Burn
  → Save Draft / Publish to YouTube
```

**2. Social Content Pipeline**
```
Topic Discovery (keyword search or URL paste)
  → Content Generation (GPT-4.1 variations)
  → Image Generation (Nano Banana 2)
  → Image Composition (Satori with brand template)
  → Review/Edit
  → Publish to LinkedIn/Instagram/Facebook/TikTok
```

**3. Ad Campaign Pipeline**
```
Ad Intelligence Research (competitor analysis)
  → Command Center Brainstorm (AI chat with context)
  → Ad Campaign Creation (multi-platform)
  → Copy Generation (platform-specific GPT)
  → Image Generation (with style presets)
  → Variation Review (approve/reject)
  → Platform Publishing
```

**4. Character Asset Pipeline**
```
Imagineer (initial character image)
  → Turnaround Sheet (multi-pose reference)
  → LoRA Training (fine-tune on character)
  → LoRAPicker (inject into any generation)
  → Consistent character across ALL tools
```

**5. Storyboard Production Pipeline**
```
Create Storyboard → Settings (duration, style, model)
  → Generate Script (2-stage GPT)
  → Preview Images (per frame)
  → Inline Edit/Lock/Split scenes
  → PDF Export / Share Review Link
  → Video Production (per scene generation + assembly)
```

**6. Carousel Multi-Platform Pipeline**
```
CarouselCreateModal (select platforms, style, brand)
  → Content Generation (research synthesis → slides)
  → Image Generation + Satori Composition
  → Video or Slideshow Assembly
  → Multi-platform Publish
```

### Parallel Opportunities

| Parallel Group | Independent Tasks |
|----------------|-------------------|
| Image generation | Multiple scenes can generate simultaneously (CONCURRENCY=2 limit) |
| Platform publishing | LinkedIn + Instagram + TikTok can publish in parallel |
| Content research | Exa + SerpAPI + RAG can search simultaneously |
| Multi-platform ads | Google RSA + LinkedIn + Meta variations can generate in parallel |

---

## Automation Flow Node Candidates

Based on every endpoint above, here are the node types the Flows builder should support:

### Input Nodes
- **Topic Input** — URL or keyword
- **Image Input** — Upload or library selection
- **Video Input** — Upload or library selection
- **Brand Kit Select** — Pick brand for pipeline
- **Text Input** — Freeform prompt or description

### Generation Nodes
- **Generate Image** — Imagineer T2I (model, style, dimensions, LoRA)
- **Edit Image** — Imagineer I2I (model, prompt, strength)
- **Generate Turnaround** — Multi-pose character sheet (poseSet, style, background)
- **Generate Video** — JumpStart I2V (model, duration, resolution)
- **Extend Video** — JumpStart extend (model, duration)
- **Edit Video** — JumpStart edit/restyle (model, prompt)
- **Erase from Video** — JumpStart erase (prompt)
- **Generate Voiceover** — TTS (voice, speed, style)
- **Generate Music** — Background music (mood, duration, model)
- **Burn Captions** — Add captions to video (style)
- **Generate Sound Effect** — SFX from prompt

### Content Nodes
- **Generate Script** — GPT narrative (niche, topic, voice style)
- **Generate LinkedIn Post** — 3 variations from topic
- **Generate Carousel Content** — 2-stage GPT slides
- **Generate Ad Copy** — Platform-specific variations
- **Research Topic** — Web search + Exa enrichment
- **Analyze Video** — Extract structure/recipe
- **Clone Ad** — Extract ad recipe for reproduction

### Pipeline Nodes
- **Shorts Pipeline** — Full 5-step (script → voice → timing → frames → clips → assemble)
- **Storyboard Pipeline** — Full (script → frames → preview → production)
- **Carousel Pipeline** — Full (content → images → video/slideshow)

### Transform Nodes
- **Describe Image** — GPT vision analysis
- **Remove Background** — Background removal
- **Upscale Image** — Topaz 2x upscale
- **Extract Frame** — First/middle/last frame from video
- **Resize/Crop** — Aspect ratio adjustment

### Storage Nodes
- **Save to Library** — Persist image/video with tags
- **Save Draft** — Save workbench state
- **Upload to Supabase** — Direct storage upload

### Publishing Nodes
- **Publish LinkedIn** — Post to LinkedIn
- **Publish Instagram** — Post to Instagram
- **Publish Facebook** — Post to Facebook
- **Publish TikTok** — Post to TikTok
- **Upload YouTube** — Upload video to YouTube
- **Schedule Publish** — Add to publish queue with datetime

### Control Nodes
- **Conditional** — If/else based on output
- **Loop** — Repeat for list of items
- **Delay** — Wait N seconds
- **Approval Gate** — Pause for human review
- **Parallel Split** — Run branches simultaneously
- **Parallel Join** — Wait for all branches

### Training Nodes
- **Train LoRA** — Submit LoRA training job (model, images, trigger word)
- **Poll Training** — Check training status

---

## Known Bugs & Dead Code

### Bugs Found

1. **Imagineer turnaround fallback** — Generic error when all edit models fail, doesn't list attempted models
2. **Character reel timeout** — No retry mechanism for failed transitions
3. **3D Viewer upscale timeout** — Silently returns original if Topaz times out (>2min)
4. **Edit Image array inconsistency** — fal-flux only uses first image from images[], no warning
5. **Inpaint queue fallback untested** — No code path exercises the tryQueue fallback
6. **Lens fallback** — Silent log without user feedback on FAL failure
7. **TryStyle error inconsistency** — FASHN returns 422 with message, Flux2 returns raw errorText
8. **Library tag case sensitivity** — Case-insensitive match but trim may create duplicates
9. **LoRA zip stream cleanup** — Archive may not finalize if image download fails mid-stream
10. **File size limits** — mediaGenerator (9MB), jumpstart (7MB), FAL docs (10MB) — inconsistent
11. **PixVerse V6 audio param** — Uses `generate_audio_switch` not `generate_audio`
12. **Grok video polling** — Doesn't validate status field format, may silently fail
13. **No token limit handling** — Long prompts to LLM in storyboard/workbench can exceed limits
14. **Caption styles hardcoded** — Only 4 styles, no custom style support
15. **LinkedIn search endpoint unused** — `/api/linkedin/search` exists but UI uses `/api/linkedin/search-keyword`

### Dead Code

1. **`src/pages/ShortsWizardPage.jsx`** — Imported in App.jsx, no route points to it
2. **`src/pages/SetupKeys.jsx`** — Listed as dead in CLAUDE.md but actually used as `/login`
3. **`src/components/modals/StoryboardPlannerModal.jsx`** — Replaced by StoryboardWorkspace
4. **`src/components/storyboard/StoryboardEditor.jsx`** — Replaced by StoryboardWorkspace
5. **`src/components/modals/StoryboardPlannerWizard.jsx`** — Dead, replaced
6. **`api/jumpstart/generate-multishot.js`** — Multi-shot routed via generate.js instead
7. **5 Radix UI packages** — react-dropdown-menu, react-progress, react-slider, react-switch, react-tooltip (installed but unused)
