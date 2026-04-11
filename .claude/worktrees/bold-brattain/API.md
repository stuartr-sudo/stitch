# Stitch Video API - External Integration Guide

## Base URL

```
http://localhost:3003
```

For production, replace with your deployed server URL.

---

## Authentication

All API endpoints require a Bearer token in the `Authorization` header.

**Token:** `stitch_dev_token_2024`

> **Note:** For production, set a custom token via the `STITCH_API_TOKEN` environment variable.

### Headers Required

```
Authorization: Bearer stitch_dev_token_2024
Content-Type: application/json
```

### Authentication Errors

| Status | Error |
|--------|-------|
| 401 | Missing authentication token |
| 403 | Invalid authentication token |

---

## Quick Start Example

### Generate Video from Image (cURL)

```bash
# Step 1: Start video generation
curl -X POST http://localhost:3003/api/jumpstart/generate \
  -H "Authorization: Bearer stitch_dev_token_2024" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "prompt": "Person smiling and waving naturally",
    "model": "wavespeed-wan",
    "duration": 5,
    "resolution": "720p",
    "aspectRatio": "9:16"
  }'

# Response: { "success": true, "requestId": "abc123", "model": "wavespeed-wan" }

# Step 2: Poll for result (repeat until status is "completed")
curl -X POST http://localhost:3003/api/jumpstart/result \
  -H "Authorization: Bearer stitch_dev_token_2024" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "abc123",
    "model": "wavespeed-wan"
  }'

# Response: { "success": true, "status": "completed", "videoUrl": "https://..." }
```

---

## Endpoints

### 1. Image to Video Generation

**Endpoint:** `POST /api/jumpstart/generate`

Converts a static image into an animated video.

**Full Request Example:**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "prompt": "Person smiling and waving naturally, subtle head movement",
  "model": "wavespeed-wan",
  "duration": 5,
  "resolution": "720p",
  "aspectRatio": "9:16",
  "enableAudio": true,
  "audioTranscript": "Hi everyone, thanks for watching!",
  "cameraFixed": false,
  "endImageUrl": "https://example.com/end-frame.jpg",
  "negativePrompt": "blur, distort, low quality",
  "cfgScale": 0.5
}
```

---

## All Available Parameters

### `model` (string)

| Model ID | Provider | Duration Options | Resolutions | Features |
|----------|----------|------------------|-------------|----------|
| `wavespeed-wan` | Wavespeed WAN 2.2 | 4, 5, 6, 8 sec | 480p, 720p | Fast, default |
| `grok-imagine` | xAI Grok | 4, 6, 8, 10, 12, 15 sec | 480p, 720p | Audio + speech |
| `seedance-pro` | Bytedance | 4-12 sec | 480p, 720p, 1080p | Audio, fixed camera, end frame |
| `veo3` | Google Veo 3.1 | 8 sec (fixed) | 720p, 1080p, 4k | Multi-image reference, audio |
| `veo3-fast` | Google Veo Fast | 4, 6, 8 sec | 720p, 1080p, 4k | Audio, negative prompts |
| `veo3-first-last` | Google Veo Morph | 4, 6, 8 sec | 720p, 1080p, 4k | First+last frame transition |
| `kling-video` | Kling 2.5 Turbo | 5, 10 sec | 720p | End frame, CFG scale |

---

### `aspectRatio` (string)

| Value | Description |
|-------|-------------|
| `auto` | Auto-detect best fit |
| `21:9` | Cinematic ultra-wide |
| `16:9` | Landscape (YouTube, desktop) |
| `9:16` | Portrait (TikTok, Reels, Stories) |
| `1:1` | Square (Instagram feed) |
| `4:3` | Standard TV |
| `3:2` | Photo ratio |
| `2:3` | Portrait photo |
| `3:4` | Portrait standard |

**Model Support:**
- `wavespeed-wan`: 16:9, 9:16, 1:1, 4:3
- `grok-imagine`: auto, 16:9, 9:16, 1:1, 4:3, 3:2, 2:3, 3:4
- `seedance-pro`: 21:9, 16:9, 4:3, 1:1, 3:4, 9:16
- `veo3`, `veo3-fast`, `veo3-first-last`: 16:9, 9:16 (+ auto for fast variants)
- `kling-video`: auto only

---

### `resolution` (string)

| Value | Description |
|-------|-------------|
| `480p` | SD (854×480) |
| `720p` | HD (1280×720) |
| `1080p` | Full HD (1920×1080) |
| `4k` | Ultra HD (3840×2160) |

**Model Support:**
- `wavespeed-wan`: 480p, 720p
- `grok-imagine`: 480p, 720p
- `seedance-pro`: 480p, 720p, 1080p
- `veo3`, `veo3-fast`, `veo3-first-last`: 720p, 1080p, 4k
- `kling-video`: 720p

---

### `duration` (number)

Duration in seconds. Options depend on model:

| Model | Duration Options |
|-------|------------------|
| `wavespeed-wan` | 4, 5, 6, 8 |
| `grok-imagine` | 4, 6, 8, 10, 12, 15 |
| `seedance-pro` | 4, 5, 6, 7, 8, 9, 10, 11, 12 |
| `veo3` | 8 (fixed) |
| `veo3-fast` | 4, 6, 8 |
| `veo3-first-last` | 4, 6, 8 |
| `kling-video` | 5, 10 |

---

### `enableAudio` (boolean)

Enable AI-generated audio/sound.

- **Supported:** `grok-imagine`, `seedance-pro`, `veo3`, `veo3-fast`, `veo3-first-last`
- **Not supported:** `wavespeed-wan`, `kling-video`

---

### `audioTranscript` (string)

Speech/dialogue text for audio generation.

```json
{
  "enableAudio": true,
  "audioTranscript": "Hey everyone! Check out this amazing product."
}
```

**Supported:** `grok-imagine`, `seedance-pro`

---

### `cameraFixed` (boolean)

Lock camera movement (static shot).

**Supported:** `seedance-pro` only

---

### `endImageUrl` (string)

URL of end/last frame image for video to transition towards.

**Supported:**
- `seedance-pro` - End frame support
- `kling-video` - Tail image support
- `veo3-first-last` - **Required** (generates transition between first & last)

---

### `negativePrompt` (string)

Things to avoid in the video.

```json
{
  "negativePrompt": "blur, distort, low quality, disfigured, bad anatomy"
}
```

**Supported:** `veo3-fast`, `veo3-first-last`, `kling-video`

---

### `cfgScale` (number)

Classifier-free guidance scale (0.0 - 1.0). Higher = more prompt adherence.

- Default: `0.5`
- **Supported:** `kling-video` only

---

## Prompt Building Guide

### Recommended Prompt Structure

Combine these elements for best results:

```
[Subject] + [Action/Movement] + [Style] + [Camera] + [Effects]
```

### Scene Description Ideas

**Facial Expressions & Micro-movements:**
- `person talking naturally to camera, mouth moving, natural speech rhythm`
- `slow genuine smile forming, eyes crinkling naturally, warm expression`
- `nodding head thoughtfully, engaged listening expression`
- `eyebrows raising slightly in surprise or interest`
- `natural soft blinking, relaxed eyes`
- `slight curious head tilt, attentive expression`

**Body Language:**
- `natural hand gestures while speaking, expressive movement`
- `leaning slightly forward, engaged and interested body language`
- `shoulders relaxing, comfortable natural posture`
- `casually touching or adjusting hair, natural fidget`
- `looking down briefly then back up to camera, thoughtful moment`

**Breathing & Subtle Motion:**
- `deep breath visible, chest rising and falling naturally`
- `subtle natural body sway, authentic human movement`
- `small weight shift, natural standing motion`

**Emotional Reactions:**
- `genuine laugh building, authentic joyful expression`
- `eyes lighting up with excitement, animated expression`
- `contemplative expression, deep in thought`
- `warm empathetic expression, understanding nod`

---

### Video Style Presets

Include these in your prompt for specific aesthetics:

| Style | Prompt Addition |
|-------|-----------------|
| iPhone Selfie | `raw iPhone selfie video, front-facing camera, handheld smartphone footage, natural ambient lighting, authentic candid moment, realistic skin texture, unfiltered unedited look` |
| UGC Testimonial | `user generated content, authentic testimonial video, real person talking naturally, genuine emotion, casual setting, believable and relatable` |
| TikTok/Reels | `vertical social media video, engaging and dynamic, quick natural movements, relatable content creator vibe` |
| FaceTime Call | `video call aesthetic, slightly pixelated, casual conversation, natural webcam lighting, authentic remote communication feel` |
| Cinematic | `cinematic quality, professional lighting, dramatic composition, shallow depth of field, film-like color grading` |
| Documentary | `documentary style, natural movement, observational, authentic moments, journalistic approach` |
| Commercial | `commercial quality, polished, professional, product-focused, aspirational` |
| Product Demo | `product demonstration, clean background, professional presentation, clear and informative` |
| Dreamy | `dreamy ethereal quality, soft focus, glowing highlights, romantic atmosphere` |
| Vintage | `vintage film look, nostalgic, warm tones, slight grain, retro aesthetic` |

---

### Camera Movement Options

Include in prompt for camera motion:

**Realistic/Natural (Best for UGC):**
- `static stable shot, selfie style`
- `subtle handheld shake, authentic feel`
- `natural breathing motion`
- `gentle natural sway`

**Zoom:**
- `slow zoom in`
- `slow zoom out`
- `fast zoom punch in`
- `dolly zoom vertigo effect`

**Pan:**
- `pan left to right`
- `pan right to left`
- `slow pan`

**Tilt:**
- `tilt up`
- `tilt down`
- `tilt up reveal`

**Dolly/Track:**
- `dolly forward`
- `dolly backward`
- `tracking shot follow`
- `lateral tracking`

**Complex:**
- `orbit around subject`
- `crane up`
- `crane down`
- `handheld following`

---

### Camera Angle Options

**Realistic/Selfie (Best for UGC):**
- `selfie close-up angle`
- `talking head framing`
- `vlog style angle`
- `webcam angle`

**Standard:**
- `eye level`
- `low angle hero shot`
- `high angle`
- `dutch angle tilted`

**Framing:**
- `wide shot`
- `medium shot`
- `close up`
- `extreme close up`

**Special:**
- `birds eye view`
- `worms eye view`
- `over the shoulder`
- `POV first person`

---

### Special Effects

**Realistic:**
- `natural lighting`
- `subtle skin texture`
- `authentic movement`
- `soft focus`

**Light Effects:**
- `lens flare`
- `bokeh blur`
- `soft glow`
- `light rays`
- `neon glow`
- `dappled sunlight`

**Film Effects:**
- `film grain`
- `vignette`
- `chromatic aberration`
- `motion blur`
- `warm tones`

**Particles:**
- `floating particles`
- `dust motes`
- `sparkles`
- `floating embers`

**Nature:**
- `wind in hair`
- `rain`
- `snow falling`
- `fog mist`

---

## Complete Request Examples

### UGC Testimonial Video

```json
{
  "imageUrl": "https://example.com/person.jpg",
  "prompt": "person talking naturally to camera, genuine smile, subtle hand gestures, user generated content testimonial style, authentic and relatable, natural ambient lighting",
  "model": "seedance-pro",
  "duration": 8,
  "resolution": "1080p",
  "aspectRatio": "9:16",
  "enableAudio": true,
  "audioTranscript": "I absolutely love this product! It changed my morning routine completely."
}
```

### Cinematic Product Shot

```json
{
  "imageUrl": "https://example.com/product.jpg",
  "prompt": "slow zoom in, product showcase, cinematic lighting, shallow depth of field, professional commercial quality, dramatic shadows",
  "model": "veo3-fast",
  "duration": 6,
  "resolution": "4k",
  "aspectRatio": "16:9",
  "enableAudio": false,
  "negativePrompt": "blur, low quality, amateur"
}
```

### Before/After Transformation (First-Last Frame)

```json
{
  "imageUrl": "https://example.com/before.jpg",
  "endImageUrl": "https://example.com/after.jpg",
  "prompt": "smooth natural transformation, seamless transition between states",
  "model": "veo3-first-last",
  "duration": 8,
  "resolution": "1080p",
  "aspectRatio": "9:16",
  "enableAudio": true
}
```

### TikTok-Style Content

```json
{
  "imageUrl": "https://example.com/creator.jpg",
  "prompt": "TikTok style vertical video, engaging and dynamic, person reacting with surprise then excitement, quick natural movements, relatable content creator vibe, handheld feel",
  "model": "grok-imagine",
  "duration": 10,
  "resolution": "720p",
  "aspectRatio": "9:16",
  "enableAudio": true,
  "audioTranscript": "Wait... did you guys see this? This is insane!"
}
```

---

**Response:**
```json
{
  "success": true,
  "requestId": "abc123-def456",
  "model": "wavespeed-wan"
}
```

---

### 2. Poll Generation Result

**Endpoint:** `POST /api/jumpstart/result`

Check the status of an async video generation job.

**Request:**
```json
{
  "requestId": "abc123-def456",
  "model": "wavespeed-wan"
}
```

**Response (Processing):**
```json
{
  "success": true,
  "status": "processing"
}
```

**Response (Completed):**
```json
{
  "success": true,
  "status": "completed",
  "videoUrl": "https://storage.example.com/video.mp4",
  "model": "wavespeed-wan"
}
```

**Response (Failed):**
```json
{
  "success": false,
  "status": "failed",
  "error": "Generation failed: reason"
}
```

---

### 3. Video Editing

**Endpoint:** `POST /api/jumpstart/edit`

Apply AI transformations to an existing video.

**Request:**
```json
{
  "videoUrl": "https://example.com/video.mp4",
  "prompt": "Change the lighting to golden hour sunset",
  "model": "wavespeed",
  "resolution": "480p"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `videoUrl` | string | Yes | URL of source video |
| `prompt` | string | Yes | Edit instruction |
| `model` | string | No | `wavespeed` or `grok-edit` |
| `resolution` | string | No | Output resolution |

---

### 4. Video Extension

**Endpoint:** `POST /api/jumpstart/extend`

Extend video duration by generating additional frames.

**Request:**
```json
{
  "videoUrl": "https://example.com/video.mp4",
  "prompt": "Continue the scene naturally with the same movement",
  "model": "seedance",
  "duration": 5
}
```

---

### 5. AI Image Generation (Async)

Image generation is **asynchronous**. You need to:
1. Call `/api/imagineer/generate` to start generation → returns `requestId`
2. Poll `/api/imagineer/result` with the `requestId` until `status: "completed"`

#### Start Image Generation

**Endpoint:** `POST /api/imagineer/generate`

**Request:**
```json
{
  "prompt": "A young woman holding a skincare product, natural lighting",
  "style": "ugc-testimonial",
  "dimensions": "9:16"
}
```

**Response (Async):**
```json
{
  "success": true,
  "requestId": "717c53a23def49a38936cf9d956519ed",
  "status": "created",
  "pollEndpoint": "/api/imagineer/result",
  "message": "Image generation started. Poll /api/imagineer/result with requestId to check status."
}
```

#### Poll for Image Result

**Endpoint:** `POST /api/imagineer/result`

**Request:**
```json
{
  "requestId": "717c53a23def49a38936cf9d956519ed"
}
```

**Response (Processing):**
```json
{
  "success": true,
  "status": "processing",
  "requestId": "717c53a23def49a38936cf9d956519ed",
  "imageUrl": null
}
```

**Response (Completed):**
```json
{
  "success": true,
  "status": "completed",
  "requestId": "717c53a23def49a38936cf9d956519ed",
  "imageUrl": "https://storage.wavespeed.ai/outputs/..."
}
```

#### Complete Example (Node.js)

```javascript
async function generateImage(prompt, style = 'instagram-candid') {
  const baseUrl = 'http://localhost:3003';
  const token = 'stitch_dev_token_2024';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Step 1: Start generation
  const startRes = await fetch(`${baseUrl}/api/imagineer/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, style, dimensions: '9:16' })
  });
  const startData = await startRes.json();
  
  if (startData.imageUrl) {
    return startData.imageUrl; // Immediate result (rare)
  }
  
  const { requestId } = startData;
  console.log('Started, polling for result...', requestId);

  // Step 2: Poll for result
  while (true) {
    await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds
    
    const pollRes = await fetch(`${baseUrl}/api/imagineer/result`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ requestId })
    });
    const pollData = await pollRes.json();
    
    if (pollData.status === 'completed' && pollData.imageUrl) {
      return pollData.imageUrl;
    }
    
    if (pollData.status === 'failed' || pollData.error) {
      throw new Error(pollData.error || 'Generation failed');
    }
    
    console.log('Status:', pollData.status);
  }
}

// Usage
const url = await generateImage('Professional woman smiling at camera');
console.log('Image URL:', url);
```

**Available Styles:**
- `iphone-selfie` - Raw iPhone aesthetic
- `ugc-testimonial` - Authentic testimonial shot
- `tiktok-style` - TikTok photo aesthetic
- `instagram-candid` - Lifestyle photography
- `facetime-screenshot` - Video call quality
- `mirror-selfie` - Mirror selfie aesthetic
- `car-selfie` - Car selfie aesthetic
- `gym-selfie` - Fitness photo
- `golden-hour-selfie` - Warm sunset lighting
- `casual-snapshot` - Candid moment

---

### 6. Video Restyling

**Endpoint:** `POST /api/trip/restyle`

Apply artistic style transformations to videos.

**Request:**
```json
{
  "videoUrl": "https://example.com/video.mp4",
  "prompt": "Transform into anime style with vibrant colors"
}
```

---

### 7. Image Editing

**Endpoint:** `POST /api/images/edit`

AI-powered image editing.

**Request:**
```json
{
  "images": ["https://example.com/image.jpg"],
  "prompt": "Remove the background and replace with white",
  "model": "wavespeed-nano-ultra",
  "outputSize": "1920x1080"
}
```

---

### 8. Health Check

**Endpoint:** `GET /api/health`

No authentication required.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Code Examples

### Node.js / JavaScript

```javascript
const STITCH_API_URL = 'http://localhost:3003';
const STITCH_API_TOKEN = 'stitch_dev_token_2024';

async function generateVideo(imageUrl, prompt, options = {}) {
  // Step 1: Start generation
  const generateResponse = await fetch(`${STITCH_API_URL}/api/jumpstart/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STITCH_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl,
      prompt,
      model: options.model || 'wavespeed-wan',
      duration: options.duration || 5,
      resolution: options.resolution || '720p',
      aspectRatio: options.aspectRatio || '9:16'
    })
  });

  const { requestId, model } = await generateResponse.json();
  console.log(`Generation started: ${requestId}`);

  // Step 2: Poll for result
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

    const resultResponse = await fetch(`${STITCH_API_URL}/api/jumpstart/result`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STITCH_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requestId, model })
    });

    const result = await resultResponse.json();

    if (result.status === 'completed') {
      console.log(`Video ready: ${result.videoUrl}`);
      return result.videoUrl;
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'Generation failed');
    }

    console.log('Still processing...');
  }
}

// Usage
generateVideo(
  'https://example.com/photo.jpg',
  'Person smiling naturally with subtle head movement',
  { duration: 5, resolution: '720p', aspectRatio: '9:16' }
).then(videoUrl => {
  console.log('Generated video:', videoUrl);
});
```

### Python

```python
import requests
import time

STITCH_API_URL = 'http://localhost:3003'
STITCH_API_TOKEN = 'stitch_dev_token_2024'

def generate_video(image_url, prompt, model='wavespeed-wan', duration=5, resolution='720p'):
    headers = {
        'Authorization': f'Bearer {STITCH_API_TOKEN}',
        'Content-Type': 'application/json'
    }

    # Step 1: Start generation
    response = requests.post(
        f'{STITCH_API_URL}/api/jumpstart/generate',
        headers=headers,
        json={
            'imageUrl': image_url,
            'prompt': prompt,
            'model': model,
            'duration': duration,
            'resolution': resolution,
            'aspectRatio': '9:16'
        }
    )
    
    data = response.json()
    request_id = data['requestId']
    model = data['model']
    print(f'Generation started: {request_id}')

    # Step 2: Poll for result
    while True:
        time.sleep(3)
        
        result = requests.post(
            f'{STITCH_API_URL}/api/jumpstart/result',
            headers=headers,
            json={'requestId': request_id, 'model': model}
        ).json()

        if result['status'] == 'completed':
            print(f"Video ready: {result['videoUrl']}")
            return result['videoUrl']
        
        if result['status'] == 'failed':
            raise Exception(result.get('error', 'Generation failed'))
        
        print('Still processing...')

# Usage
video_url = generate_video(
    'https://example.com/photo.jpg',
    'Person smiling naturally with subtle head movement'
)
print(f'Generated video: {video_url}')
```

---

## Rate Limits & Best Practices

1. **Polling Interval:** Wait at least 3 seconds between result checks
2. **Timeout:** Video generation typically takes 30-120 seconds
3. **Image Requirements:** 
   - Supported formats: JPG, PNG, WebP
   - Max size: 10MB
   - Recommended: 720p or higher resolution
4. **Video Requirements:**
   - Supported formats: MP4, WebM
   - Max duration for editing: 8 seconds (Grok), unlimited (Wavespeed)

---

## Error Handling

All errors return JSON with an `error` field:

```json
{
  "error": "Description of what went wrong"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad request (missing/invalid parameters) |
| 401 | Missing authentication token |
| 403 | Invalid authentication token |
| 500 | Server error |

---

## Support

For issues or questions, check the server logs or contact the development team.
