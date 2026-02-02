# Stitch - Video Advert Creator

A powerful video advertisement creation tool built with React, powered by AI for image and video generation.

## Features

### 1. Imagineer - AI Image Generation
Generate stunning images from text prompts using form-based controls:
- Subject type selection (person, product, landscape, etc.)
- Artistic style presets (photorealistic, anime, oil painting, etc.)
- Lighting, camera angle, and mood options
- Multiple aspect ratio support

### 2. JumpStart - Image to Video
Convert composed images into animated videos:
- Drag-and-drop image canvas using Konva.js
- Camera movement presets (zoom, pan, tilt, dolly)
- Video style options (cinematic, documentary, anime)
- Special effects (particles, light rays, bokeh)
- 480p and 720p output quality

### 3. Video Studio - Edit & Extend
Modify existing videos with AI:
- **Edit Mode**: Change characters, objects, or backgrounds
- **Extend Mode**: Add duration with AI continuation
- Iterative processing (edit the result again)

### 4. Trip - Video Restyling
Transform video style while preserving motion:
- Style presets (Anime, Cyberpunk, Film Noir, etc.)
- Custom style descriptions
- Side-by-side comparison

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **UI Components**: Radix UI (shadcn/ui)
- **Canvas**: Konva.js / react-konva
- **Backend**: Express.js API
- **AI Services**: Wavespeed.ai (primary), FAL.ai
- **Storage**: Supabase

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Wavespeed API key
- (Optional) Supabase project for storage

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm start
```

This runs:
- Vite dev server at http://localhost:5173
- Express API server at http://localhost:3003

### Environment Variables

```env
# Required
WAVESPEED_API_KEY=your_wavespeed_api_key

# Optional - for storage
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Optional - for image search
SERP_API_KEY=your_serp_api_key
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/imagineer/generate` | POST | Generate AI image |
| `/api/jumpstart/generate` | POST | Image to video |
| `/api/jumpstart/result` | POST | Check generation status |
| `/api/jumpstart/save-video` | POST | Save to storage |
| `/api/jumpstart/edit` | POST | Edit video |
| `/api/jumpstart/extend` | POST | Extend video |
| `/api/trip/restyle` | POST | Restyle video |
| `/api/images/search` | POST | Search images |
| `/api/images/import-url` | POST | Import from URL |

## AI Models Used

| Tool | Model | Provider |
|------|-------|----------|
| Imagineer | Google Nano Banana Pro | Wavespeed |
| JumpStart | WAN 2.2 Spicy | Wavespeed |
| Video Edit | Wan 2.2 Video Edit | Wavespeed |
| Video Extend | Seedance 1.5 Pro | Wavespeed |
| Trip Restyle | Lucy-Restyle | Wavespeed |

## Project Structure

```
stitch/
├── api/                    # Express API endpoints
│   ├── jumpstart/          # Video generation APIs
│   ├── trip/               # Restyle API
│   ├── imagineer/          # Image generation API
│   └── images/             # Image utilities
├── src/
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   ├── canvas/         # Konva canvas components
│   │   └── modals/         # Tool modals
│   ├── lib/                # Utilities & Supabase
│   ├── pages/              # Page components
│   ├── App.jsx
│   └── main.jsx
├── server.js               # Express server
├── vite.config.js
└── package.json
```

## License

MIT
