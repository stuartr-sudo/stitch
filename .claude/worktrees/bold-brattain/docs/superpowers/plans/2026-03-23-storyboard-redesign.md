# Storyboard Planner Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Storyboard Planner wizard from a broken 7-step flow into a streamlined 6-step flow with conversational AI story building, new video models, per-scene model/mode selection, scene-1 defaults cascading, model-aware Characters UI, and video-to-video support.

**Model Clarity — These are SEPARATE systems:**
- **Veo 3.1 Reference-to-Video** (`veo3`) — Google model. Flat `image_urls` array for subject consistency. NO @Element placeholders. Endpoint: `fal-ai/veo3.1/reference-to-video`. Supports 720p/1080p/4K, audio, fixed 8s duration.
- **Veo 3.1 First-Last-Frame** (`veo3-first-last`) — Google model. `first_frame_url` + `last_frame_url` for start/end control. Endpoint: `fal-ai/veo3.1/first-last-frame-to-video`. Supports 4s/6s/8s, 720p/1080p/4K, audio.
- **Kling O3 R2V** (`kling-r2v-pro/standard`) — Kling model. `@Element1`-`@Element4` system with frontal + reference images, upscaling pipeline. Endpoint: `fal-ai/kling-video/o3/{tier}/reference-to-video`.
- **Kling O3 V2V** (`kling-o3-v2v-pro/standard`) — NEW. Video-to-video restyle/refinement. Endpoint: `fal-ai/kling-video/o3/{tier}/video-to-video`.

The Characters step shows **different UIs** depending on which model is selected:
- Kling R2V → `CharactersKling.jsx` (@Element tabs, frontal designation, 3 refs per element)
- Veo 3.1 Ref → `CharactersVeo.jsx` (simple image upload list, all passed as `image_urls`)

**Architecture:** The wizard (`StoryboardPlannerWizard.jsx`, 1737 lines) gets refactored into 6 focused steps with extracted sub-components. A new backend endpoint (`/api/storyboard/story-chat`) powers the conversational story builder using GPT-4.1-mini. New video models are added to both the frontend `STORYBOARD_MODELS` array and backend `generate.js`/`result.js` JumpStart handlers. Per-scene model selection replaces the global model dropdown.

**Tech Stack:** React 18, Tailwind CSS, Radix UI, Express, OpenAI GPT-4.1-mini (Zod structured output), FAL.ai queue API, Supabase Storage

---

## Updated Flow

| Step | Name | Purpose |
|------|------|---------|
| 1 | **Story & Mood** | Name, scene count, duration, aspect ratio, resolution, brand kit, mood |
| 2 | **Story Builder** | Conversational AI chat — gathers scene-by-scene story beats |
| 3 | **Visual Style** | 14 style presets (keep existing) |
| 4 | **Scene-by-Scene Builder** | Per-scene: environment, lighting, camera, model/mode selector, start image (scene 1). Scene 1 defaults cascade. |
| 5 | **Characters** | Conditional — only if Kling R2V or Veo 3.1 Reference-to-Video selected on any scene. Model-aware UI (Kling=@Element system, Veo=flat image_urls). |
| 6 | **Generate** | Execute generation + video-to-video refinement |

## File Structure

### New Files
| File | Responsibility |
|------|----------------|
| `src/components/storyboard/StoryChat.jsx` | Conversational AI story builder chat UI |
| `src/components/storyboard/SceneCard.jsx` | Single scene card with model/mode selector, environment controls, start image |
| `src/components/storyboard/SceneModelSelector.jsx` | Per-scene model + mode dropdown (i2v, r2v, first-last, v2v) |
| `src/components/storyboard/CharactersKling.jsx` | Kling R2V character UI (@Element system) |
| `src/components/storyboard/CharactersVeo.jsx` | Veo 3.1 Reference-to-Video character UI (flat image_urls — NOT R2V, NOT @Element) |
| `src/components/storyboard/GenerateScene.jsx` | Per-scene generation card with v2v refinement |
| `api/storyboard/story-chat.js` | Backend endpoint for conversational story builder |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/modals/StoryboardPlannerWizard.jsx` | Refactor wizard steps, state, extract sub-components |
| `api/jumpstart/generate.js` | Add Kling O3 V2V handler, add Veo 3.1 R2V (non-fast) to storyboard |
| `api/jumpstart/result.js` | Add polling for `kling-o3-v2v-pro`, `kling-o3-v2v-standard` |
| `api/storyboard/generate-scenes.js` | Accept story beats from chat step, richer context |
| `server.js` | Register `/api/storyboard/story-chat` route |

---

## Task 1: Backend — Conversational Story Builder Endpoint

**Files:**
- Create: `api/storyboard/story-chat.js`
- Modify: `server.js` (add route registration ~line 408)

This endpoint powers the Step 2 chat. It takes the conversation history + metadata from Step 1 (scene count, mood, duration) and returns the AI's next message. After all scenes are covered, it returns a structured `storyBeats` array.

- [ ] **Step 1: Create `api/storyboard/story-chat.js`**

```javascript
// api/storyboard/story-chat.js
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { getUserKeys } from '../lib/getUserKeys.js';
import { logCost } from '../lib/costLogger.js';

const StoryBeatsSchema = z.object({
  storyBeats: z.array(z.object({
    sceneNumber: z.number(),
    summary: z.string().describe('1-2 sentence summary of what happens'),
    setting: z.string().describe('Where this takes place'),
    keyAction: z.string().describe('The main action or event'),
    emotion: z.string().describe('Emotional tone of this beat'),
  })),
  storyTitle: z.string().describe('Suggested title for the storyboard'),
  storyOverview: z.string().describe('Cohesive 2-3 sentence overview of the full story'),
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { openaiKey } = await getUserKeys(req.user.id, req.user.email);
    if (!openaiKey) {
      return res.status(400).json({ error: 'OpenAI API key not configured.' });
    }

    const {
      messages = [],       // Chat history [{role, content}]
      numScenes,           // From step 1
      mood = '',           // From step 1
      duration = 5,        // From step 1
      finalize = false,    // True when all beats are gathered
    } = req.body;

    const openai = new OpenAI({ apiKey: openaiKey });

    const systemPrompt = `You are a creative story director helping build a ${numScenes}-scene video storyboard.
${mood ? `The overall mood is: ${mood}.` : ''}
Each scene will be approximately ${duration} seconds of video.

YOUR JOB:
- Guide the user through their story, scene by scene
- After the user describes what happens first, ask "And then what happens?" to get the next scene
- Keep track of which scene number you're on (1 through ${numScenes})
- Ask clarifying questions if the description is vague — where does this take place? Who's involved? What's the emotion?
- After all ${numScenes} scenes are described, summarize the complete story back to the user and ask if they want to adjust anything
- Be encouraging and creative — suggest improvements if the story could flow better
- Keep your responses concise (2-3 sentences max per turn)

CURRENT PROGRESS: The user has described ${messages.filter(m => m.role === 'user').length} messages so far.

Start by asking what happens in the opening scene.`;

    if (finalize) {
      // Extract structured beats from the conversation
      const completion = await openai.chat.completions.parse({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: `Extract ${numScenes} structured story beats from this conversation. Each beat should capture what happens, where, the key action, and emotional tone.` },
          ...messages,
        ],
        response_format: zodResponseFormat(StoryBeatsSchema, 'storybeats'),
      });

      const result = completion.choices[0].message.parsed;

      if (completion.usage && req.user?.email) {
        logCost({
          username: req.user.email.split('@')[0],
          category: 'openai',
          operation: 'storyboard_story_chat_finalize',
          model: 'gpt-4.1-mini-2025-04-14',
          input_tokens: completion.usage.prompt_tokens,
          output_tokens: completion.usage.completion_tokens,
        });
      }

      return res.status(200).json({
        success: true,
        finalized: true,
        ...result,
      });
    }

    // Normal conversational turn
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 300,
    });

    const reply = completion.choices[0].message.content;

    if (completion.usage && req.user?.email) {
      logCost({
        username: req.user.email.split('@')[0],
        category: 'openai',
        operation: 'storyboard_story_chat',
        model: 'gpt-4.1-mini-2025-04-14',
        input_tokens: completion.usage.prompt_tokens,
        output_tokens: completion.usage.completion_tokens,
      });
    }

    return res.status(200).json({
      success: true,
      finalized: false,
      reply,
    });

  } catch (error) {
    console.error('[StoryChat] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

- [ ] **Step 2: Register route in `server.js`**

Add after the existing storyboard routes (~line 408):

```javascript
app.post('/api/storyboard/story-chat', authenticateToken, async (req, res) => {
  const handler = await loadApiRoute('storyboard/story-chat.js');
  return handler(req, res);
});
```

- [ ] **Step 3: Verify endpoint works**

Run: `npm run server` then test with curl:
```bash
curl -X POST http://localhost:3003/api/storyboard/story-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <test-jwt>" \
  -d '{"messages":[],"numScenes":4,"mood":"Dramatic","duration":5}'
```
Expected: `{ success: true, finalized: false, reply: "..." }` with the AI asking about scene 1.

- [ ] **Step 4: Commit**

```bash
git add api/storyboard/story-chat.js server.js
git commit -m "feat(storyboard): add conversational story builder endpoint"
```

---

## Task 2: Backend — Add Kling O3 Video-to-Video Handlers

**Files:**
- Modify: `api/jumpstart/generate.js` (add v2v handler + routing ~line 149)
- Modify: `api/jumpstart/result.js` (add polling ~line 35)

The user wants Kling O3 video-to-video for both source material transformation and post-generation refinement. Endpoints: `fal-ai/kling-video/o3/pro/video-to-video` and `fal-ai/kling-video/o3/standard/video-to-video`.

- [ ] **Step 1: Add V2V model routing in `generate.js`**

Add new model IDs after the existing Kling R2V block (after line 179):

```javascript
} else if (model === 'kling-o3-v2v-pro' || model === 'kling-o3-v2v-standard') {
  const videoUrl = fields.videoUrl?.[0] || null;
  return await handleKlingO3V2V(req, res, {
    imageUrl, videoUrl, prompt, duration, aspectRatio, negativePrompt,
    cfgScale, enableAudio, model, FAL_KEY
  });
}
```

- [ ] **Step 2: Add `handleKlingO3V2V` function in `generate.js`**

Add before the closing of the file (before the last export or at end):

```javascript
/**
 * Handle Kling O3 Video-to-Video (FAL.ai)
 * Used for: restyling source video, refining generated scenes
 */
async function handleKlingO3V2V(req, res, params) {
  const { imageUrl, videoUrl, prompt, duration, aspectRatio, negativePrompt, cfgScale, enableAudio, model, FAL_KEY } = params;

  if (!FAL_KEY) {
    return res.status(400).json({ error: 'FAL API key not configured.' });
  }

  // Must have either a video URL (v2v) or image URL (fallback to i2v)
  const sourceVideoUrl = videoUrl || null;
  if (!sourceVideoUrl) {
    return res.status(400).json({ error: 'Video URL required for video-to-video generation' });
  }

  const tier = model === 'kling-o3-v2v-pro' ? 'pro' : 'standard';
  const endpoint = `fal-ai/kling-video/o3/${tier}/video-to-video`;

  console.log(`[JumpStart/KlingO3V2V] Submitting to ${endpoint}...`);

  const requestBody = {
    prompt,
    video_url: sourceVideoUrl,
    duration: String(duration),
    aspect_ratio: aspectRatio,
  };

  if (negativePrompt) requestBody.negative_prompt = negativePrompt;
  if (cfgScale && cfgScale !== 0.5) requestBody.cfg_scale = cfgScale;
  if (enableAudio) requestBody.generate_audio = true;

  const submitResponse = await fetch(`https://fal.run/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    console.error('[JumpStart/KlingO3V2V] Error:', errorText);
    return res.status(500).json({ error: 'Kling O3 V2V error: ' + errorText.substring(0, 200) });
  }

  const data = await submitResponse.json();

  if (data.video?.url) {
    return res.status(200).json({
      success: true,
      videoUrl: data.video.url,
      status: 'completed',
    });
  }

  const requestId = data.request_id || data.requestId;
  if (requestId) {
    return res.status(200).json({
      success: true,
      requestId,
      model,
      status: 'processing',
    });
  }

  return res.status(500).json({ error: 'Unexpected response from Kling O3 V2V' });
}
```

- [ ] **Step 3: Add polling in `result.js`**

Add after the existing Kling R2V block (~line 37):

```javascript
} else if (model === 'kling-o3-v2v-pro' || model === 'kling-o3-v2v-standard') {
  const tier = model === 'kling-o3-v2v-pro' ? 'pro' : 'standard';
  return await checkFalResult(req, res, requestId, FAL_KEY, `fal-ai/kling-video/o3/${tier}/video-to-video`, model);
}
```

- [ ] **Step 4: Verify the server starts cleanly**

Run: `npm run server`
Expected: No import errors, server starts on port 3003.

- [ ] **Step 5: Commit**

```bash
git add api/jumpstart/generate.js api/jumpstart/result.js
git commit -m "feat(jumpstart): add Kling O3 video-to-video handlers"
```

---

## Task 3: Frontend — Extract Reusable Sub-Components

**Files:**
- Create: `src/components/storyboard/StoryChat.jsx`
- Create: `src/components/storyboard/SceneCard.jsx`
- Create: `src/components/storyboard/SceneModelSelector.jsx`
- Create: `src/components/storyboard/CharactersKling.jsx`
- Create: `src/components/storyboard/CharactersVeo.jsx`
- Create: `src/components/storyboard/GenerateScene.jsx`

These components are extracted from the existing monolithic wizard. Each is self-contained with props for data and callbacks.

- [ ] **Step 1: Create `src/components/storyboard/` directory**

```bash
mkdir -p src/components/storyboard
```

- [ ] **Step 2: Create `SceneModelSelector.jsx`**

This is the per-scene model + generation mode selector. Key component for the redesign.

```jsx
// src/components/storyboard/SceneModelSelector.jsx
import React from 'react';

// All models available for storyboard scenes
export const SCENE_MODELS = [
  // Veo 3.1 variants
  { id: 'veo3', label: 'Veo 3.1 (Reference)', description: 'Multi-image reference, 8s, 720p/1080p/4K', mode: 'reference-to-video', supportsRefs: true, supportsAudio: true, supportsResolution: true, fixedDuration: 8 },
  { id: 'veo3-fast', label: 'Veo 3.1 Fast', description: 'Single image, flexible duration', mode: 'image-to-video', supportsAudio: true, supportsResolution: true },
  { id: 'veo3-first-last', label: 'Veo 3.1 First-Last Frame', description: 'Start + end image control', mode: 'first-last-frame', supportsAudio: true, supportsResolution: true },
  // Kling O3 variants
  { id: 'kling-r2v-pro', label: 'Kling O3 Pro (R2V)', description: 'Best character consistency', mode: 'reference-to-video', supportsRefs: true, supportsAudio: true },
  { id: 'kling-r2v-standard', label: 'Kling O3 Standard (R2V)', description: 'Faster R2V, lower cost', mode: 'reference-to-video', supportsRefs: true, supportsAudio: true },
  { id: 'kling-o3-v2v-pro', label: 'Kling O3 Pro (V2V)', description: 'Video-to-video restyle', mode: 'video-to-video', supportsAudio: true },
  { id: 'kling-o3-v2v-standard', label: 'Kling O3 Standard (V2V)', description: 'Faster V2V restyle', mode: 'video-to-video', supportsAudio: true },
  // Other models
  { id: 'seedance-pro', label: 'Seedance 1.5 Pro', description: 'High quality', mode: 'image-to-video', supportsAudio: true },
  { id: 'kling-video', label: 'Kling 2.5 Turbo Pro', description: 'Cinematic motion', mode: 'image-to-video' },
  { id: 'grok-imagine', label: 'Grok Imagine (xAI)', description: 'Good quality with audio', mode: 'image-to-video', supportsAudio: true },
  { id: 'wavespeed-wan', label: 'Wavespeed WAN 2.2', description: 'Fast generation', mode: 'image-to-video' },
];

// Group models by mode for the dropdown
const MODE_GROUPS = [
  { label: 'Reference-to-Video', modes: ['reference-to-video'] },
  { label: 'Image-to-Video', modes: ['image-to-video'] },
  { label: 'First & Last Frame', modes: ['first-last-frame'] },
  { label: 'Video-to-Video', modes: ['video-to-video'] },
];

export default function SceneModelSelector({ value, onChange, sceneNumber }) {
  const selected = SCENE_MODELS.find(m => m.id === value);

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
        Model & Mode
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2C666E] focus:border-transparent"
      >
        {MODE_GROUPS.map(group => {
          const models = SCENE_MODELS.filter(m => group.modes.includes(m.mode));
          if (models.length === 0) return null;
          return (
            <optgroup key={group.label} label={group.label}>
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.description}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      {selected && (
        <div className="flex gap-2 flex-wrap">
          {selected.supportsRefs && (
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Characters</span>
          )}
          {selected.supportsAudio && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Audio</span>
          )}
          {selected.supportsResolution && (
            <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">720p/1080p/4K</span>
          )}
          {selected.mode === 'video-to-video' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">Needs Video Source</span>
          )}
          {selected.mode === 'first-last-frame' && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Needs Start + End Image</span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `StoryChat.jsx`**

Conversational chat UI for Step 2. Calls `/api/storyboard/story-chat`.

```jsx
// src/components/storyboard/StoryChat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export default function StoryChat({ numScenes, mood, duration, onComplete }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [storyBeats, setStoryBeats] = useState(null);
  const chatEndRef = useRef(null);
  const initialized = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get initial AI greeting
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    sendToAI([]);
  }, []);

  const sendToAI = async (chatHistory) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/storyboard/story-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          numScenes,
          mood,
          duration,
          finalize: false,
        }),
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      console.error('[StoryChat] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    await sendToAI(updated);
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/storyboard/story-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          numScenes,
          mood,
          duration,
          finalize: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.finalized) {
        setStoryBeats(data.storyBeats);
        setFinalized(true);
        onComplete({
          storyBeats: data.storyBeats,
          storyTitle: data.storyTitle,
          storyOverview: data.storyOverview,
          chatHistory: messages,
        });
      }
    } catch (err) {
      console.error('[StoryChat] Finalize error:', err);
    } finally {
      setLoading(false);
    }
  };

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const canFinalize = userMessageCount >= Math.ceil(numScenes / 2); // At least half the scenes discussed

  return (
    <div className="flex flex-col h-full">
      <div className="text-sm text-gray-500 mb-3 px-1">
        Tell your story scene by scene. The AI will guide you through {numScenes} scenes.
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#2C666E] text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      {!finalized && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Describe what happens..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#2C666E] focus:border-transparent"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="sm"
            className="bg-[#2C666E] hover:bg-[#1e4d54] rounded-xl px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Finalize button */}
      {canFinalize && !finalized && (
        <Button
          onClick={handleFinalize}
          disabled={loading}
          className="mt-3 w-full bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Story looks good — continue
        </Button>
      )}

      {finalized && storyBeats && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <div className="text-sm font-medium text-green-800 mb-2">
            ✓ Story captured — {storyBeats.length} scene beats ready
          </div>
          <div className="space-y-1">
            {storyBeats.map((beat, i) => (
              <div key={i} className="text-xs text-green-700">
                Scene {beat.sceneNumber}: {beat.summary}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `SceneCard.jsx`**

Per-scene card for the Scene-by-Scene Builder (Step 4). Includes environment controls, model selector, start image (scene 1), and cascading defaults from scene 1.

```jsx
// src/components/storyboard/SceneCard.jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Upload, ImageIcon } from 'lucide-react';
import SceneModelSelector from './SceneModelSelector';

// Reuse constants from the wizard
const ENVIRONMENTS = ['Street/Road', 'Sidewalk/Path', 'Park/Garden', 'Forest/Woods', 'Beach', 'Indoor', 'Playground', 'School', 'Shop/Store', 'Backyard'];
const ACTION_TYPES = ['Walking', 'Running', 'Riding', 'Standing', 'Sitting', 'Jumping', 'Looking', 'Turning', 'Stopping', 'Interacting'];
const EXPRESSIONS = ['Happy/Smiling', 'Focused/Determined', 'Surprised', 'Worried/Concerned', 'Excited', 'Calm/Peaceful', 'Curious', 'Cautious'];
const LIGHTING_OPTIONS = ['Golden Hour', 'Bright Midday', 'Soft Morning', 'Blue Hour/Dusk', 'Overcast', 'Night/Moonlit', 'Sunset Glow'];
const CAMERA_MOVEMENTS = ['Static', 'Pan Left', 'Pan Right', 'Tracking Follow', 'Dolly In', 'Dolly Out', 'Orbit', 'Crane Up', 'Crane Down'];
const CAMERA_ANGLES = ['wide', 'medium', 'close-up', 'extreme close-up', 'bird-eye', 'low-angle', 'over-shoulder', 'tracking', 'dutch angle', 'POV'];

function PillSelector({ options, value, onChange, label }) {
  return (
    <div>
      {label && <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">{label}</label>}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              value === opt
                ? 'bg-[#2C666E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SceneCard({
  scene,               // { sceneNumber, model, environment, environmentDetail, action, actionType, expression, lighting, cameraAngle, cameraMovement, startImageUrl, videoSourceUrl, endImageUrl }
  storyBeat,           // From story chat: { summary, setting, keyAction, emotion }
  onChange,             // (field, value) => void
  isFirst,             // Scene 1 gets start image upload
  expanded,
  onToggleExpand,
  onUploadStartImage,  // For scene 1
  onImportFromLibrary, // For scene 1
  onUploadVideoSource, // For v2v scenes
  onUploadEndImage,    // For first-last-frame scenes
}) {
  const mode = scene.model ? (require('./SceneModelSelector').SCENE_MODELS.find(m => m.id === scene.model)?.mode || 'image-to-video') : 'image-to-video';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold flex items-center justify-center">
            {scene.sceneNumber}
          </span>
          <div className="text-left">
            <div className="text-sm font-medium text-gray-800">Scene {scene.sceneNumber}</div>
            {storyBeat && (
              <div className="text-xs text-gray-500 truncate max-w-[300px]">{storyBeat.summary}</div>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 py-4 space-y-4">
          {/* Story beat context */}
          {storyBeat && (
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800">
              <strong>Story beat:</strong> {storyBeat.summary}
              {storyBeat.setting && <span className="ml-2 text-blue-600">📍 {storyBeat.setting}</span>}
            </div>
          )}

          {/* Model/Mode selector */}
          <SceneModelSelector
            value={scene.model}
            onChange={(val) => onChange('model', val)}
            sceneNumber={scene.sceneNumber}
          />

          {/* Resolution dropdown — only for Veo 3.1 models */}
          {scene.model?.startsWith('veo3') && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Resolution</label>
              <select
                value={scene.resolution || '720p'}
                onChange={(e) => onChange('resolution', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <option value="720p">720p</option>
                <option value="1080p">1080p</option>
                <option value="4k">4K</option>
              </select>
            </div>
          )}

          {/* Audio toggle — only for models that support it */}
          {(scene.model?.startsWith('veo3') || scene.model?.startsWith('kling')) && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`audio-${scene.sceneNumber}`}
                checked={scene.enableAudio || false}
                onChange={(e) => onChange('enableAudio', e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor={`audio-${scene.sceneNumber}`} className="text-sm text-gray-700">
                Generate audio
              </label>
            </div>
          )}

          {/* Start Image — scene 1 only (or if needed as seed) */}
          {isFirst && mode !== 'video-to-video' && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Starting Image</label>
              {scene.startImageUrl ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border">
                  <img src={scene.startImageUrl} alt="Start frame" className="w-full h-full object-cover" />
                  <button
                    onClick={() => onChange('startImageUrl', null)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >×</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={onUploadStartImage} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </button>
                  <button onClick={onImportFromLibrary} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-xs hover:bg-gray-200">
                    <ImageIcon className="w-3.5 h-3.5" /> Library
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Video source — for V2V mode */}
          {mode === 'video-to-video' && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Source Video</label>
              {scene.videoSourceUrl ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">✓ Video loaded</span>
                  <button onClick={() => onChange('videoSourceUrl', null)} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              ) : (
                <button onClick={onUploadVideoSource} className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 hover:bg-orange-100">
                  <Upload className="w-3.5 h-3.5" /> Upload video
                </button>
              )}
            </div>
          )}

          {/* End image — for first-last-frame mode */}
          {mode === 'first-last-frame' && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">End Frame Image</label>
              {scene.endImageUrl ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border">
                  <img src={scene.endImageUrl} alt="End frame" className="w-full h-full object-cover" />
                  <button onClick={() => onChange('endImageUrl', null)} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                </div>
              ) : (
                <button onClick={onUploadEndImage} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 hover:bg-amber-100">
                  <Upload className="w-3.5 h-3.5" /> Upload end frame
                </button>
              )}
            </div>
          )}

          {/* What happens */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">What Happens</label>
            <textarea
              value={scene.action || ''}
              onChange={(e) => onChange('action', e.target.value)}
              placeholder="Describe the action in this scene..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-16"
            />
          </div>

          {/* Environment, Action, Expression, Lighting, Camera */}
          <PillSelector label="Environment" options={ENVIRONMENTS} value={scene.environment || ''} onChange={(v) => onChange('environment', v)} />

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Environment Detail</label>
            <input
              value={scene.environmentDetail || ''}
              onChange={(e) => onChange('environmentDetail', e.target.value)}
              placeholder="Additional setting details..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <PillSelector label="Character Action" options={ACTION_TYPES} value={scene.actionType || ''} onChange={(v) => onChange('actionType', v)} />
          <PillSelector label="Expression" options={EXPRESSIONS} value={scene.expression || ''} onChange={(v) => onChange('expression', v)} />
          <PillSelector label="Lighting" options={LIGHTING_OPTIONS} value={scene.lighting || ''} onChange={(v) => onChange('lighting', v)} />

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">Camera Angle</label>
            <select
              value={scene.cameraAngle || ''}
              onChange={(e) => onChange('cameraAngle', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
            >
              <option value="">Select camera angle...</option>
              {CAMERA_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <PillSelector label="Camera Movement" options={CAMERA_MOVEMENTS} value={scene.cameraMovement || ''} onChange={(v) => onChange('cameraMovement', v)} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `CharactersKling.jsx`** (Kling R2V — @Element system)

Extract the existing Characters step UI for Kling models. Same functionality as current lines 1065-1304 of the wizard, but isolated.

```jsx
// src/components/storyboard/CharactersKling.jsx
// Kling R2V character management — @Element1-4 with frontal + reference images
// [Extract from StoryboardPlannerWizard.jsx lines 1065-1304, same logic]
import React, { useState } from 'react';
import { Plus, Trash2, Upload, Sparkles, FolderOpen } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function CharactersKling({ elements, onChange, onOpenImagineer, onOpenLibrary }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const addElement = () => {
    if (elements.length >= 4) return;
    onChange([...elements, {
      id: `el-${Date.now()}`,
      description: '',
      refs: [],
      frontalIndex: 0,
      analyzing: false,
    }]);
  };

  const removeElement = (index) => {
    const updated = elements.filter((_, i) => i !== index);
    onChange(updated);
    if (activeIndex >= updated.length) setActiveIndex(Math.max(0, updated.length - 1));
  };

  const updateElement = (index, field, value) => {
    const updated = [...elements];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const analyzeCharacter = async (index) => {
    const el = elements[index];
    if (!el.refs.length) return;
    updateElement(index, 'analyzing', true);
    try {
      const res = await apiFetch('/api/imagineer/describe-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: el.refs[0] }),
      });
      const data = await res.json();
      if (data.description) {
        updateElement(index, 'description', data.description);
      }
    } catch (err) {
      console.error('[CharactersKling] Analyze error:', err);
    } finally {
      updateElement(index, 'analyzing', false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500 mb-2">
        Add up to 4 character elements. Each becomes <code className="text-xs bg-gray-100 px-1 rounded">@Element1</code>, <code className="text-xs bg-gray-100 px-1 rounded">@Element2</code>, etc. in scene prompts.
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {elements.map((el, i) => (
          <button
            key={el.id}
            onClick={() => setActiveIndex(i)}
            className={`px-3 py-1.5 rounded-t-lg text-sm font-medium transition ${
              activeIndex === i ? 'bg-[#2C666E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            @Element{i + 1}
          </button>
        ))}
        {elements.length < 4 && (
          <button onClick={addElement} className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Active element editor */}
      {elements[activeIndex] && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-700">Character Description</label>
            <button onClick={() => removeElement(activeIndex)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>

          <textarea
            value={elements[activeIndex].description}
            onChange={(e) => updateElement(activeIndex, 'description', e.target.value)}
            placeholder="Describe this character's appearance..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-20"
          />

          {elements[activeIndex].refs.length > 0 && (
            <button
              onClick={() => analyzeCharacter(activeIndex)}
              disabled={elements[activeIndex].analyzing}
              className="text-xs text-[#2C666E] hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              {elements[activeIndex].analyzing ? 'Analyzing...' : 'Auto-describe from image'}
            </button>
          )}

          {/* Reference images */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">
              Reference Images (max 3) — mark one as frontal
            </label>
            <div className="flex gap-2 flex-wrap">
              {elements[activeIndex].refs.map((url, ri) => (
                <div key={ri} className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-gray-200">
                  <img src={url} alt={`Ref ${ri + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => updateElement(activeIndex, 'frontalIndex', ri)}
                    className={`absolute bottom-0 left-0 right-0 text-[9px] py-0.5 text-center ${
                      elements[activeIndex].frontalIndex === ri
                        ? 'bg-[#2C666E] text-white'
                        : 'bg-gray-800/50 text-white hover:bg-gray-800/70'
                    }`}
                  >
                    {elements[activeIndex].frontalIndex === ri ? '★ Frontal' : 'Set Frontal'}
                  </button>
                  <button
                    onClick={() => {
                      const newRefs = elements[activeIndex].refs.filter((_, j) => j !== ri);
                      updateElement(activeIndex, 'refs', newRefs);
                    }}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                  >×</button>
                </div>
              ))}
              {elements[activeIndex].refs.length < 3 && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onOpenLibrary(activeIndex)}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500"
                  >
                    <FolderOpen className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px]">Library</span>
                  </button>
                  <button
                    onClick={() => onOpenImagineer(activeIndex)}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500"
                  >
                    <Sparkles className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px]">Generate</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create `CharactersVeo.jsx`** (Veo 3.1 R2V — flat image_urls)

Simpler UI — no element placeholders, just reference images for subject consistency.

```jsx
// src/components/storyboard/CharactersVeo.jsx
// Veo 3.1 reference-to-video — flat image_urls array for subject consistency
import React from 'react';
import { Upload, Trash2, FolderOpen, Sparkles } from 'lucide-react';

export default function CharactersVeo({ referenceImages, onChange, onOpenLibrary, onOpenImagineer }) {
  const removeImage = (index) => {
    onChange(referenceImages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500 mb-2">
        Upload reference images for <strong>subject consistency</strong> across scenes.
        Veo 3.1 uses these to maintain visual appearance of characters, objects, or locations.
        No placeholders needed — all images are passed as references to every scene.
      </div>

      <div className="flex gap-2 flex-wrap">
        {referenceImages.map((url, i) => (
          <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
            <img src={url} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
            >×</button>
          </div>
        ))}
        {referenceImages.length < 5 && (
          <>
            <button
              onClick={onOpenLibrary}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400"
            >
              <FolderOpen className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Library</span>
            </button>
            <button
              onClick={onOpenImagineer}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-gray-400"
            >
              <Sparkles className="w-5 h-5 mb-1" />
              <span className="text-[10px]">Generate</span>
            </button>
          </>
        )}
      </div>

      {referenceImages.length > 0 && (
        <div className="text-xs text-gray-400">
          {referenceImages.length} reference image{referenceImages.length !== 1 ? 's' : ''} — these will be passed as <code className="bg-gray-100 px-1 rounded">image_urls</code> to Veo 3.1
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create `GenerateScene.jsx`** (Per-scene generation card with V2V refinement)

```jsx
// src/components/storyboard/GenerateScene.jsx
import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Play, RotateCcw, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SCENE_MODELS } from './SceneModelSelector';

export default function GenerateScene({
  scene,                    // Full scene object with status, videoUrl, model, etc.
  onGenerate,               // () => void
  onRetry,                  // () => void
  onRefineWithV2V,          // (videoUrl) => void — opens V2V refinement
  isGenerating,
  isPending,
}) {
  const modelInfo = SCENE_MODELS.find(m => m.id === scene.model);
  const statusColor = {
    pending: 'bg-gray-100 text-gray-500',
    generating: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  }[scene.status] || 'bg-gray-100 text-gray-500';

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#2C666E] text-white text-xs font-bold flex items-center justify-center">
            {scene.sceneNumber}
          </span>
          <span className="text-sm font-medium">Scene {scene.sceneNumber}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
            {scene.status}
          </span>
        </div>
        <span className="text-xs text-gray-400">{modelInfo?.label || scene.model}</span>
      </div>

      {/* Prompt preview */}
      <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2 line-clamp-3">
        {scene.visualPrompt || scene.action || 'No prompt yet'}
      </div>

      {/* Video preview */}
      {scene.videoUrl && (
        <video
          src={scene.videoUrl}
          controls
          className="w-full rounded-lg max-h-48 bg-black"
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {scene.status === 'pending' && (
          <Button
            onClick={onGenerate}
            disabled={isGenerating}
            size="sm"
            className="bg-[#2C666E] hover:bg-[#1e4d54]"
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            Generate
          </Button>
        )}

        {scene.status === 'generating' && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </div>
        )}

        {scene.status === 'error' && (
          <Button onClick={onRetry} size="sm" variant="outline" className="text-red-600 border-red-200">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        )}

        {scene.status === 'done' && scene.videoUrl && (
          <Button
            onClick={() => onRefineWithV2V(scene.videoUrl)}
            size="sm"
            variant="outline"
            className="text-orange-600 border-orange-200"
          >
            <Video className="w-3.5 h-3.5 mr-1" />
            Refine (V2V)
          </Button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Commit all sub-components**

```bash
git add src/components/storyboard/
git commit -m "feat(storyboard): extract reusable sub-components for wizard redesign"
```

---

## Task 4: Refactor Main Wizard — New Step Flow & State

**Files:**
- Modify: `src/components/modals/StoryboardPlannerWizard.jsx`

This is the largest task — restructure the wizard from 7 steps to 6, integrate all new sub-components, add per-scene model/mode state, cascading defaults, and conditional Characters step.

- [ ] **Step 1: Update WIZARD_STEPS constant and STORYBOARD_MODELS**

Replace lines 47-77 with:

```javascript
// Models are now per-scene — import from SceneModelSelector
import { SCENE_MODELS } from '@/components/storyboard/SceneModelSelector';

const WIZARD_STEPS = [
  { key: 'story', label: 'Story & Mood' },
  { key: 'story-chat', label: 'Story Builder' },
  { key: 'style', label: 'Visual Style' },
  { key: 'scene-builder', label: 'Scene Builder' },
  { key: 'characters', label: 'Characters' },
  { key: 'generating', label: 'Generate' },
];
```

- [ ] **Step 2: Add new imports**

Add at top of file:

```javascript
import StoryChat from '@/components/storyboard/StoryChat';
import SceneCard from '@/components/storyboard/SceneCard';
import SceneModelSelector from '@/components/storyboard/SceneModelSelector';
import CharactersKling from '@/components/storyboard/CharactersKling';
import CharactersVeo from '@/components/storyboard/CharactersVeo';
import GenerateScene from '@/components/storyboard/GenerateScene';
```

- [ ] **Step 3: Update state variables**

Replace the model-related state with per-scene model state. Add story chat state. Add resolution, audio defaults. Remove old `storyOverview` (now comes from chat). Keep start frame on scene 1.

Key state changes:
```javascript
// NEW — Step 1 settings
const [storyboardName, setStoryboardName] = useState('');
const [aspectRatio, setAspectRatio] = useState('16:9');
const [resolution, setResolution] = useState('720p');
const [enableAudioDefault, setEnableAudioDefault] = useState(false);

// NEW — Step 2 story chat output
const [storyBeats, setStoryBeats] = useState([]);
const [storyTitle, setStoryTitle] = useState('');
const [storyChatOverview, setStoryChatOverview] = useState('');
const [chatHistory, setChatHistory] = useState([]);

// CHANGED — sceneGuides now includes per-scene model + mode
// Each guide gains: model, resolution, enableAudio, startImageUrl, videoSourceUrl, endImageUrl

// REMOVED — global `model` state (replaced by per-scene)
// REMOVED — `storyOverview` (replaced by storyChatOverview from chat)
```

- [ ] **Step 4: Add scene-1 cascading logic**

When scene 1's environment/lighting/camera/expression values change, auto-populate scenes 2-N with the same values (only if those scenes' fields are still empty):

```javascript
const handleSceneGuideChange = (sceneIndex, field, value) => {
  const updated = [...sceneGuides];
  updated[sceneIndex] = { ...updated[sceneIndex], [field]: value };

  // Cascade scene 1 values to subsequent empty scenes
  if (sceneIndex === 0) {
    const cascadeFields = ['environment', 'environmentDetail', 'lighting', 'cameraAngle', 'cameraMovement', 'expression', 'actionType', 'model', 'resolution', 'enableAudio'];
    if (cascadeFields.includes(field)) {
      for (let i = 1; i < updated.length; i++) {
        if (!updated[i][field]) {
          updated[i] = { ...updated[i], [field]: value };
        }
      }
    }
  }

  setSceneGuides(updated);
};
```

- [ ] **Step 5: Add Characters step conditional visibility**

The Characters step only appears if any scene uses a model with `supportsRefs: true`:

```javascript
const needsCharacters = sceneGuides.some(sg => {
  const modelInfo = SCENE_MODELS.find(m => m.id === sg.model);
  return modelInfo?.supportsRefs;
});

const hasKlingRefs = sceneGuides.some(sg =>
  sg.model === 'kling-r2v-pro' || sg.model === 'kling-r2v-standard'
);
const hasVeoRefs = sceneGuides.some(sg => sg.model === 'veo3');

// Filter visible steps
const visibleSteps = WIZARD_STEPS.filter(s => {
  if (s.key === 'characters') return needsCharacters;
  return true;
});
```

- [ ] **Step 6: Rebuild Step 1 UI (Story & Mood)**

Replace the current Step 1 body. Remove story overview textarea. Add: name, scene count, duration, aspect ratio, resolution, audio toggle, brand kit, mood.

```jsx
{step === 'story' && (
  <div className="space-y-5">
    {/* Storyboard Name */}
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">Storyboard Name</label>
      <Input
        value={storyboardName}
        onChange={(e) => setStoryboardName(e.target.value)}
        placeholder="My awesome storyboard..."
      />
    </div>

    {/* Number of Scenes */}
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">Number of Scenes: {numScenes}</label>
      <input type="range" min={2} max={8} value={numScenes} onChange={(e) => setNumScenes(+e.target.value)}
        className="w-full accent-[#2C666E]" />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>2</span><span>8</span></div>
    </div>

    {/* Duration per Scene */}
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">Duration per Scene: {defaultDuration}s</label>
      <input type="range" min={3} max={10} value={defaultDuration} onChange={(e) => setDefaultDuration(+e.target.value)}
        className="w-full accent-[#2C666E]" />
    </div>

    {/* Aspect Ratio */}
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">Aspect Ratio</label>
      <div className="flex gap-2">
        {['16:9', '9:16', '1:1', '4:3'].map(ar => (
          <button key={ar} onClick={() => setAspectRatio(ar)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${aspectRatio === ar ? 'bg-[#2C666E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {ar}
          </button>
        ))}
      </div>
    </div>

    {/* Resolution */}
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1 block">Resolution</label>
      <div className="flex gap-2">
        {['720p', '1080p', '4k'].map(r => (
          <button key={r} onClick={() => setResolution(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${resolution === r ? 'bg-[#2C666E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {r}
          </button>
        ))}
      </div>
    </div>

    {/* Audio Toggle */}
    <div className="flex items-center gap-2">
      <input type="checkbox" id="audio-default" checked={enableAudioDefault}
        onChange={(e) => setEnableAudioDefault(e.target.checked)} className="rounded border-gray-300" />
      <label htmlFor="audio-default" className="text-sm text-gray-700">Generate audio (default: off)</label>
    </div>

    {/* Mood */}
    <PillSelector label="Overall Mood" options={MOODS} value={overallMood} onChange={setOverallMood} />

    {/* Brand Kit */}
    <BrandStyleGuideSelector value={selectedBrand} onChange={setSelectedBrand} />
  </div>
)}
```

- [ ] **Step 7: Add Step 2 UI (Story Builder Chat)**

```jsx
{step === 'story-chat' && (
  <StoryChat
    numScenes={numScenes}
    mood={overallMood}
    duration={defaultDuration}
    onComplete={({ storyBeats, storyTitle, storyOverview, chatHistory }) => {
      setStoryBeats(storyBeats);
      setStoryTitle(storyTitle);
      setStoryChatOverview(storyOverview);
      setChatHistory(chatHistory);
      // Pre-populate scene guides from beats
      const newGuides = storyBeats.map((beat, i) => ({
        ...EMPTY_SCENE_GUIDE,
        sceneNumber: i + 1,
        action: beat.keyAction,
        environment: '',    // User picks in scene builder
        model: 'veo3',      // Default to Veo 3.1 R2V
        resolution,
        enableAudio: enableAudioDefault,
      }));
      setSceneGuides(newGuides);
    }}
  />
)}
```

- [ ] **Step 8: Replace Step 4 (Scene Builder) with SceneCard components**

```jsx
{step === 'scene-builder' && (
  <div className="space-y-3">
    <div className="text-sm text-gray-500 mb-2">
      Configure each scene. Scene 1 settings cascade as defaults to subsequent scenes.
    </div>
    {sceneGuides.map((guide, i) => (
      <SceneCard
        key={i}
        scene={guide}
        storyBeat={storyBeats[i]}
        onChange={(field, value) => handleSceneGuideChange(i, field, value)}
        isFirst={i === 0}
        expanded={expandedScene === i}
        onToggleExpand={() => setExpandedScene(expandedScene === i ? -1 : i)}
        onUploadStartImage={() => { /* trigger file input or Imagineer */ }}
        onImportFromLibrary={() => { /* open library modal */ }}
        onUploadVideoSource={() => { /* trigger video upload for V2V */ }}
        onUploadEndImage={() => { /* trigger end frame upload */ }}
      />
    ))}
  </div>
)}
```

- [ ] **Step 9: Replace Characters step with model-aware components**

```jsx
{step === 'characters' && (
  <div className="space-y-4">
    {hasKlingRefs && (
      <>
        <h3 className="text-sm font-semibold text-gray-700">Kling R2V Characters (@Element)</h3>
        <CharactersKling
          elements={elements}
          onChange={setElements}
          onOpenImagineer={(elIndex) => { /* open Imagineer for element */ }}
          onOpenLibrary={(elIndex) => { /* open library for element */ }}
        />
      </>
    )}
    {hasVeoRefs && (
      <>
        <h3 className="text-sm font-semibold text-gray-700 mt-4">Veo 3.1 Reference Images</h3>
        <CharactersVeo
          referenceImages={veoReferenceImages}
          onChange={setVeoReferenceImages}
          onOpenLibrary={() => { /* open library */ }}
          onOpenImagineer={() => { /* open Imagineer */ }}
        />
      </>
    )}
  </div>
)}
```

- [ ] **Step 10: Replace Generate step with per-scene GenerateScene cards**

```jsx
{step === 'generating' && (
  <div className="space-y-3">
    <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-gray-500">
        {scenes.filter(s => s.status === 'done').length} / {scenes.length} scenes complete
      </span>
      <Button onClick={generateAllRemaining} disabled={generating} size="sm" className="bg-[#2C666E]">
        Generate All Remaining
      </Button>
    </div>
    {scenes.map((scene, i) => (
      <GenerateScene
        key={scene.id}
        scene={scene}
        onGenerate={() => generateSingleScene(scene, i > 0 ? scenes[i-1]?.lastFrameUrl : sceneGuides[0]?.startImageUrl)}
        onRetry={() => retrySingleScene(scene)}
        onRefineWithV2V={(videoUrl) => openV2VRefinement(scene, videoUrl)}
        isGenerating={scene.status === 'generating'}
        isPending={scene.status === 'pending'}
      />
    ))}
  </div>
)}
```

- [ ] **Step 11: Update `generateSingleScene` to use per-scene model**

The function currently reads `model` from global state. Change it to read from the scene's own model field:

```javascript
const generateSingleScene = async (scene, startFrameUrlForScene) => {
  // Use per-scene model instead of global
  const sceneModel = scene.model || sceneGuides[scene.sceneNumber - 1]?.model || 'veo3';
  const sceneModelInfo = SCENE_MODELS.find(m => m.id === sceneModel);
  const sceneResolution = scene.resolution || sceneGuides[scene.sceneNumber - 1]?.resolution || resolution;
  const sceneEnableAudio = scene.enableAudio ?? sceneGuides[scene.sceneNumber - 1]?.enableAudio ?? enableAudioDefault;

  // Build FormData with per-scene settings
  const formData = new FormData();
  formData.append('model', sceneModel);
  formData.append('resolution', sceneResolution);
  formData.append('enableAudio', String(sceneEnableAudio));
  formData.append('aspectRatio', aspectRatio);
  formData.append('duration', String(scene.durationSeconds || defaultDuration));
  // ... rest of existing logic, using sceneModel instead of global model
};
```

- [ ] **Step 12: Update `generateSceneBreakdown` to pass story beats**

The API call to `/api/storyboard/generate-scenes` should now include the story beats from the chat step:

```javascript
const generateSceneBreakdown = async () => {
  // Include story chat output
  body: JSON.stringify({
    description: storyChatOverview,  // From chat finalization
    storyBeats,                      // Structured beats from chat
    numScenes,
    style: getPromptText(style),
    defaultDuration,
    overallMood,
    sceneGuides,
    elements: elements.filter(el => el.description).map((el, i) => ({ index: i + 1, description: el.description })),
    hasStartFrame: !!sceneGuides[0]?.startImageUrl,
    startFrameDescription,
    props: getPropsLabels(selectedProps),
    negativePrompt: getCombinedNegativePrompt(selectedNegPills, negFreetext),
    brandStyleGuide: extractBrandStyleData(selectedBrand),
  }),
};
```

- [ ] **Step 13: Wire up V2V refinement flow**

Add function to open V2V refinement for a completed scene:

```javascript
const openV2VRefinement = async (scene, videoUrl) => {
  // Set the scene to V2V mode temporarily
  const formData = new FormData();
  // Need to convert videoUrl to a blob for the form
  const videoResponse = await fetch(videoUrl);
  const videoBlob = await videoResponse.blob();
  formData.append('image', videoBlob, 'source.mp4'); // JumpStart accepts video in image field for V2V
  formData.append('videoUrl', videoUrl);
  formData.append('prompt', scene.visualPrompt || scene.motionPrompt);
  formData.append('model', 'kling-o3-v2v-pro');
  formData.append('duration', String(scene.durationSeconds || defaultDuration));
  formData.append('aspectRatio', aspectRatio);

  updateSceneStatus(scene.id, 'generating');

  try {
    const res = await apiFetch('/api/jumpstart/generate', { method: 'POST', body: formData });
    const data = await res.json();
    // Poll for result same as normal generation
    if (data.status === 'processing' && data.requestId) {
      await pollForResult(data.requestId, data.model, scene.id);
    } else if (data.videoUrl) {
      updateScene(scene.id, { videoUrl: data.videoUrl, status: 'done' });
    }
  } catch (err) {
    updateSceneStatus(scene.id, 'error');
    toast.error('V2V refinement failed: ' + err.message);
  }
};
```

- [ ] **Step 14: Verify the wizard renders correctly**

Run: `npm run dev`
Navigate to the storyboard page and open the wizard. Verify:
1. 6 steps appear in stepper (or 5 if no ref models selected)
2. Step 1 shows all settings fields
3. Step 2 shows chat interface
4. Step 3 shows style grid
5. Step 4 shows scene cards with per-scene model selector
6. Characters step only appears when needed
7. Generate step shows per-scene cards

- [ ] **Step 15: Commit**

```bash
git add src/components/modals/StoryboardPlannerWizard.jsx
git commit -m "feat(storyboard): refactor wizard to 6-step flow with per-scene models"
```

---

## Task 5: Backend — Update Scene Generation to Accept Story Beats

**Files:**
- Modify: `api/storyboard/generate-scenes.js`

The scene generation endpoint needs to accept the structured story beats from the chat step and use them as stronger context for prompt generation.

- [ ] **Step 1: Update the handler to accept storyBeats**

Add `storyBeats` to the destructured body and incorporate into the system prompt:

```javascript
const {
  description,
  storyBeats = [],        // NEW — from story chat
  numScenes = 4,
  // ... rest unchanged
} = req.body;

// Build story beats context
let storyBeatContext = '';
if (storyBeats.length > 0) {
  storyBeatContext = storyBeats.map(beat =>
    `Scene ${beat.sceneNumber}: ${beat.summary} (Setting: ${beat.setting}, Action: ${beat.keyAction}, Emotion: ${beat.emotion})`
  ).join('\n');
}
```

Add to systemPrompt:
```javascript
${storyBeatContext ? `\nSTORY BEATS FROM CREATIVE SESSION — follow these story beats closely:\n${storyBeatContext}` : ''}
```

- [ ] **Step 2: Commit**

```bash
git add api/storyboard/generate-scenes.js
git commit -m "feat(storyboard): accept story beats in scene generation"
```

---

## Task 6: Backend — Handle Veo 3.1 R2V + First-Last-Frame in Storyboard Context

**Files:**
- Modify: `api/jumpstart/generate.js` (update handleVeo3 to accept reference images from storyboard)

The existing `handleVeo3` already supports `additionalImages` via `image_urls`. We need to ensure the storyboard's per-scene Veo reference images flow through correctly.

- [ ] **Step 1: Verify Veo 3.1 R2V accepts the full resolution param**

Check that the existing `handleVeo3` (line 455) passes `resolution` correctly. The existing code already does this — `resolution: resolution` in the request body. Verify the value is one of `'720p'`, `'1080p'`, `'4k'`.

- [ ] **Step 2: Ensure `handleVeo3FirstLast` accepts `auto` aspect ratio**

The existing code (line 623) already handles this: `aspect_ratio: aspectRatio === 'auto' ? 'auto' : aspectRatio`. ✓

- [ ] **Step 3: Add `safety_tolerance` passthrough**

Currently hardcoded absent. Add it as optional:

In `handleVeo3`:
```javascript
const requestBody = {
  // ... existing fields
  safety_tolerance: '4', // Default moderate
};
```

In `handleVeo3FirstLast`:
```javascript
const requestBody = {
  // ... existing fields
  safety_tolerance: '4',
};
```

- [ ] **Step 4: Commit**

```bash
git add api/jumpstart/generate.js
git commit -m "fix(jumpstart): add safety_tolerance to Veo 3.1 handlers"
```

---

## Task 7: Integration Testing — End-to-End Flow

**Files:** None (testing existing + new code together)

- [ ] **Step 1: Start the dev server**

Run: `npm run start`
Expected: Both Express (3003) and Vite (4390) start successfully.

- [ ] **Step 2: Open the Storyboard Wizard**

Navigate to the storyboard page in the browser. Open the wizard.

- [ ] **Step 3: Test Step 1 (Story & Mood)**

Verify: Name field, scene slider, duration slider, aspect ratio pills, resolution pills, audio toggle, mood pills, brand kit selector all render and save state.

- [ ] **Step 4: Test Step 2 (Story Builder Chat)**

Click Next. Verify: Chat interface appears, AI sends opening message, user can type and send, AI responds with "and then what happens?" pattern, finalize button appears after sufficient messages.

- [ ] **Step 5: Test Step 3 (Visual Style)**

Click Next after finalizing story. Verify: Style grid appears with all 14 presets.

- [ ] **Step 6: Test Step 4 (Scene Builder)**

Verify: Scene cards appear matching scene count. Each card has model/mode dropdown. Scene 1 has start image upload. Selecting environment on scene 1 cascades to empty scenes 2-N. V2V model shows video upload field. First-last-frame model shows end image field.

- [ ] **Step 7: Test Step 5 (Characters — conditional)**

Select Kling R2V on scene 1 → Characters step appears with @Element UI.
Select Veo 3.1 on scene 1 → Characters step shows flat image_urls UI.
Select non-ref model on all scenes → Characters step is skipped.

- [ ] **Step 8: Test Step 6 (Generate)**

Verify: Scene cards show with per-scene model labels. Generate button works. V2V refine button appears on completed scenes. Sequential frame chaining still works.

- [ ] **Step 9: Commit any fixes**

```bash
git add -A
git commit -m "fix(storyboard): integration fixes from end-to-end testing"
```

---

## Summary

| Task | Scope | New Files | Modified Files |
|------|-------|-----------|----------------|
| 1 | Story Chat API | `api/storyboard/story-chat.js` | `server.js` |
| 2 | Kling O3 V2V Backend | — | `api/jumpstart/generate.js`, `result.js` |
| 3 | Extract Sub-Components | 6 files in `src/components/storyboard/` | — |
| 4 | Refactor Main Wizard | — | `StoryboardPlannerWizard.jsx` |
| 5 | Scene Gen + Story Beats | — | `api/storyboard/generate-scenes.js` |
| 6 | Veo 3.1 Tuning | — | `api/jumpstart/generate.js` |
| 7 | Integration Testing | — | Various fixes |

**Execution order:** Tasks 1-3 are independent and can run in parallel. Task 4 depends on Task 3 (sub-components). Tasks 5-6 are independent of frontend work. Task 7 depends on all others.
