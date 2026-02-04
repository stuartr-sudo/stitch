# Stitch Video Advert Creator - Features & API Endpoints

## Overview

Stitch is a video advertisement creation platform that leverages multiple AI providers (Wavespeed, FAL.ai, Google, xAI) for image and video generation, editing, and manipulation.

---

## Features & Endpoints

### 1. JumpStart - Image to Video Generation

Converts static images into animated videos using multiple AI models.

**Endpoint:** `POST /api/jumpstart/generate`

**Supported Models:**
| Model | Provider | Max Duration | Features |
|-------|----------|--------------|----------|
| `wavespeed-wan` | Wavespeed WAN 2.2 Spicy | Variable | Default model, custom resolution |
| `grok-imagine` | xAI Grok (via FAL.ai) | 15s | Audio generation, speech transcripts |
| `seedance-pro` | Bytedance Seedance 1.5 Pro (via FAL.ai) | 4-12s | Audio, fixed camera, end frame support |
| `veo3` | Google Veo 3.1 (via FAL.ai) | 8s | Multi-image reference, audio generation |
| `veo3-fast` | Google Veo 3.1 Fast (via FAL.ai) | 4-8s | Negative prompts, faster processing |
| `veo3-first-last` | Google Veo 3.1 First-Last-Frame (via FAL.ai) | 4-8s | **Morph between two keyframes**, audio, 4K |
| `kling-video` | Kling 2.5 Turbo Pro (via FAL.ai) | 5-10s | End frame (tail image), CFG scale |

**Request Body (multipart/form-data):**
- `image` (file, required) - Source image (first frame)
- `prompt` (string, required) - Motion/animation prompt
- `model` (string) - Model selection
- `resolution` (string) - `480p`, `720p`, `1080p`, `4k`
- `duration` (number) - Video duration in seconds
- `aspectRatio` (string) - `16:9`, `9:16`, `1:1`, `auto`
- `enableAudio` (boolean) - Enable audio generation
- `audioTranscript` (string) - Speech/dialogue text
- `cameraFixed` (boolean) - Lock camera movement (Seedance)
- `endImageUrl` (string) - End/last frame image URL (Seedance, Kling, Veo First-Last)
- `negativePrompt` (string) - What to avoid (Veo Fast, Kling, Veo First-Last)

**Veo 3.1 First-Last-Frame Mode:**

Generates a smooth video transition between two keyframe images. Ideal for:
- Before/after transformations
- Character motion control (standing → sitting)
- Product demonstrations (closed → open)
- Scene transitions (day → night)

```json
{
  "image": "[first frame file]",
  "endImageUrl": "https://... (last frame URL)",
  "prompt": "Smooth transition between poses",
  "model": "veo3-first-last",
  "duration": 8,
  "resolution": "1080p",
  "aspectRatio": "16:9",
  "enableAudio": true
}
```

---

### 2. JumpStart - Video Editing

Edit existing videos with AI-powered transformations.

**Endpoint:** `POST /api/jumpstart/edit`

**Supported Models:**
| Model | Provider | Max Resolution | Constraints |
|-------|----------|----------------|-------------|
| `wavespeed` | Wavespeed WAN 2.2 Video Edit | 480p | Default model |
| `grok-edit` | xAI Grok Imagine Video (via FAL.ai) | 720p | Max 854x480 input, 8s max duration |

**Request Body:**
```json
{
  "videoUrl": "https://...",
  "prompt": "Change the lighting to sunset",
  "model": "wavespeed",
  "resolution": "480p",
  "seed": -1
}
```

**Grok Edit Example:**
```json
{
  "videoUrl": "https://...",
  "prompt": "Colorize the video",
  "model": "grok-edit",
  "resolution": "auto"
}
```

**Grok Edit Notes:**
- Input video is resized to max 854x480 pixels
- Input video is truncated to 8 seconds max
- Resolution options: `auto`, `480p`, `720p`

---

### 3. JumpStart - Video Extension

Extend video duration by generating additional frames.

**Endpoint:** `POST /api/jumpstart/extend`

**Supported Models:**
| Model | Provider | Extension Duration |
|-------|----------|-------------------|
| `seedance` | Bytedance Seedance 1.5 Pro (via Wavespeed) | Variable |
| `veo3-fast-extend` | Google Veo 3.1 Fast (via FAL.ai) | Fixed 7s |

**Request Body:**
```json
{
  "videoUrl": "https://...",
  "prompt": "Continue the scene naturally",
  "model": "seedance",
  "duration": 5,
  "resolution": "720p",
  "generate_audio": true,
  "camera_fixed": false
}
```

---

### 4. JumpStart - Check Generation Result

Poll for async video generation status.

**Endpoint:** `POST /api/jumpstart/result`

**Request Body:**
```json
{
  "requestId": "abc123",
  "model": "wavespeed-wan"
}
```

**Response:**
```json
{
  "success": true,
  "status": "completed",
  "videoUrl": "https://...",
  "model": "wavespeed-wan"
}
```

---

### 5. JumpStart - Save Video

Download and save generated video to Supabase storage.

**Endpoint:** `POST /api/jumpstart/save-video`

**Request Body:**
```json
{
  "videoUrl": "https://...",
  "username": "user123"
}
```

---

### 6. Trip - Video Restyling

Apply artistic style transformations to existing videos.

**Endpoint:** `POST /api/trip/restyle`

**Provider:** Decart Lucy-Restyle (via Wavespeed)

**Request Body:**
```json
{
  "videoUrl": "https://...",
  "prompt": "Transform into anime style"
}
```

---

### 7. Imagineer - AI Image Generation

Generate images from text prompts with UGC/social media style presets.

**Endpoint:** `POST /api/imagineer/generate`

**Provider:** Wavespeed Google Nano Banana Pro

**Available Styles:**
- `iphone-selfie` - Raw iPhone selfie aesthetic
- `ugc-testimonial` - Authentic testimonial shot
- `tiktok-style` - TikTok photo aesthetic
- `instagram-candid` - Instagram lifestyle photography
- `facetime-screenshot` - Video call quality
- `mirror-selfie` - Bathroom/bedroom mirror selfie
- `car-selfie` - Car selfie aesthetic
- `gym-selfie` - Fitness/gym photo
- `golden-hour-selfie` - Warm sunset lighting
- `casual-snapshot` - Candid everyday moment

**Request Body:**
```json
{
  "prompt": "A person holding a product bottle",
  "style": "iphone-selfie",
  "dimensions": "16:9"
}
```

---

### 8. Lens - Image Angle Adjustment

Adjust viewing angles of images using AI.

**Endpoint:** `POST /api/lens/generate`

**Providers:** FAL.ai (primary), Wavespeed (fallback)

**Request Body:**
```json
{
  "image_url": "https://...",
  "horizontal_angle": 15,
  "vertical_angle": -10,
  "zoom": 0.5
}
```

---

### 9. Smoosh - Canvas Composition

Enhance and blend canvas compositions with AI.

**Endpoint:** `POST /api/smoosh/generate`

**Provider:** Wavespeed Google Nano Banana Pro

**Request Body:**
```json
{
  "image": "data:image/png;base64,... or https://...",
  "prompt": "A seamless, professional composition",
  "width": 1080,
  "height": 1080
}
```

---

### 10. Try Style - Virtual Try-On

Virtual clothing try-on using AI.

**Endpoint:** `POST /api/trystyle/generate`

**Supported Models:**
| Model | Provider | Features |
|-------|----------|----------|
| `fashn` | FASHN AI v1.6 (via FAL.ai) | Category detection, multiple samples |
| `flux2-lora` | Flux 2 Lora Gallery (via FAL.ai) | Prompt-based, advanced controls |

**Request Body:**
```json
{
  "model": "fashn",
  "model_image": "https://... (person photo)",
  "garment_image": "https://... (clothing photo)",
  "category": "auto",
  "mode": "balanced",
  "num_samples": 1
}
```

**Check Result Endpoint:** `POST /api/trystyle/result`

---

### 11. Image Utilities

#### Search Images
Search for images using Google Images.

**Endpoint:** `POST /api/images/search`

**Providers:** SERP API (primary), Google Custom Search Engine (fallback)

**Request Body:**
```json
{
  "query": "product photography white background"
}
```

---

#### Import Image from URL
Download external images to avoid CORS issues.

**Endpoint:** `POST /api/images/import-url`

**Request Body:**
```json
{
  "imageUrl": "https://...",
  "username": "user123"
}
```

---

#### Edit Image
AI-powered image editing with multiple models.

**Endpoint:** `POST /api/images/edit`

**Supported Models:**
| Model | Provider | Features |
|-------|----------|----------|
| `wavespeed-nano-ultra` | Wavespeed Nano Banana Pro Ultra | Up to 4K resolution |
| `wavespeed-qwen` | Wavespeed Qwen | Standard editing |
| `fal-flux` | Flux 2 Pro (via FAL.ai) | Advanced editing |

**Request Body:**
```json
{
  "images": ["https://..."],
  "prompt": "Remove the background",
  "model": "wavespeed-nano-ultra",
  "outputSize": "1920x1080"
}
```

---

#### Inpaint (Object Removal/Replacement)
Remove or replace objects using a mask.

**Endpoint:** `POST /api/images/inpaint`

**Provider:** Wavespeed Nano Banana

**Request Body:**
```json
{
  "image_url": "https://... or data:image/...",
  "mask_url": "https://... or data:image/...",
  "prompt": "Replace with a blue vase",
  "useProUltra": false
}
```

---

### 12. Library - Save Media

Save generated images/videos to Supabase storage and database.

**Endpoint:** `POST /api/library/save`

**Storage Buckets:**
- `media` - Images
- `videos` - Videos

**Database Tables:**
- `image_library_items` - Image metadata
- `generated_videos` - Video metadata

**Request Body:**
```json
{
  "url": "https://... or data:image/...",
  "type": "image",
  "title": "My Generated Image",
  "prompt": "Original prompt used",
  "source": "imagineer"
}
```

---

### 13. Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Environment Variables Required

| Variable | Description | Used By |
|----------|-------------|---------|
| `WAVESPEED_API_KEY` | Wavespeed AI API key | JumpStart, Imagineer, Trip, Smoosh, Edit, Inpaint |
| `FAL_KEY` | FAL.ai API key | Grok, Seedance, Veo, Kling, Lens, TryStyle |
| `SUPABASE_URL` | Supabase project URL | Storage, Library |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key | Storage, Library |
| `SERP_API_KEY` | SERP API key | Image Search |
| `GOOGLE_CSE_API_KEY` | Google Custom Search API key | Image Search (fallback) |
| `GOOGLE_CSE_CX` | Google Custom Search Engine ID | Image Search (fallback) |

---

## Server Configuration

- **API Port:** 3003 (configurable via `PORT` env var)
- **Frontend Port:** 4390 (Vite dev server)
- **Max Upload Size:** 50MB (JSON body)
- **Max Image Size:** 10MB (form uploads)

---

## Quick Start

```bash
# Install dependencies
npm install

# Start both servers (API + Vite)
npm start

# Or run separately
npm run server  # API on :3003
npm run dev     # Vite on :4390
```
