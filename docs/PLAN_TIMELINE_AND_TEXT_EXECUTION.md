# Execution Plan: Interactive Timeline and Text Tool

This plan uses your exact code and FIND/REPLACE blocks **adapted to the actual codebase**. The current file has **no Tabs**, **no selectedTab**, and the header uses **variant="ghost"**; Video Tools is a **collapsible section** with divs, not an h3 + grid. Below are the exact edits so implementation is copy-paste accurate.

---

## Step 1: Replace StudioTimeline with interactive component

**File:** `src/components/studio/StudioTimeline.jsx`  
**Action:** Replace the **entire file** with the following (your exact code):

```jsx
import React, { useRef, useState, useEffect } from 'react';
import { Type, Video as VideoIcon } from 'lucide-react';

export default function StudioTimeline({ items, onUpdateItem, onSelect, selectedId, currentTime, duration = 900, onSeek }) {
  const timelineRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { id, action: 'move'|'resize-l'|'resize-r', startX, initialStartAt, initialDuration }
  const pixelsPerFrame = 2; // Adjust for zoom later

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return;

      const deltaX = e.clientX - dragging.startX;
      const deltaFrames = Math.round(deltaX / pixelsPerFrame);

      if (dragging.action === 'move') {
        const newStartAt = Math.max(0, dragging.initialStartAt + deltaFrames);
        onUpdateItem(dragging.id, { startAt: newStartAt });
      } else if (dragging.action === 'resize-l') {
        const newStartAt = Math.max(0, dragging.initialStartAt + deltaFrames);
        const frameDiff = newStartAt - dragging.initialStartAt;
        const newDuration = Math.max(30, dragging.initialDuration - frameDiff);
        if (newDuration > 30) {
          onUpdateItem(dragging.id, { startAt: newStartAt, durationInFrames: newDuration });
        }
      } else if (dragging.action === 'resize-r') {
        const newDuration = Math.max(30, dragging.initialDuration + deltaFrames);
        onUpdateItem(dragging.id, { durationInFrames: newDuration });
      }
    };

    const handleMouseUp = () => setDragging(null);

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, onUpdateItem]);

  const handleMouseDown = (e, item, action) => {
    e.stopPropagation();
    onSelect(item);
    setDragging({
      id: item.id,
      action,
      startX: e.clientX,
      initialStartAt: item.startAt || 0,
      initialDuration: item.durationInFrames || 150
    });
  };

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.max(0, Math.round(x / pixelsPerFrame));
    if (onSeek) onSeek(frame);
  };

  return (
    <div className="w-full h-full bg-slate-50 overflow-x-auto relative select-none" onClick={handleTimelineClick}>
      <div
        ref={timelineRef}
        className="relative h-full border-b"
        style={{ width: `${Math.max(duration, 900) * pixelsPerFrame}px`, minWidth: '100%' }}
      >
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
          style={{ left: `${currentTime * pixelsPerFrame}px` }}
        >
          <div className="absolute -top-2 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-sm" />
        </div>

        {/* Tracks */}
        <div className="pt-8 pb-4 px-2 space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className={`absolute h-12 rounded-md border-2 overflow-hidden cursor-move transition-colors flex items-center px-2 shadow-sm ${
                selectedId === item.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-300'
              } ${item.type === 'text' ? 'bg-purple-100' : 'bg-blue-100'}`}
              style={{
                left: `${(item.startAt || 0) * pixelsPerFrame}px`,
                width: `${(item.durationInFrames || 150) * pixelsPerFrame}px`,
                top: item.type === 'text' ? '10px' : '70px'
              }}
              onMouseDown={(e) => handleMouseDown(e, item, 'move')}
            >
              {/* Left Handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2 hover:bg-black/20 cursor-w-resize"
                onMouseDown={(e) => handleMouseDown(e, item, 'resize-l')}
              />

              <div className="flex items-center gap-2 truncate pointer-events-none">
                {item.type === 'text' ? <Type className="w-4 h-4 text-purple-700" /> : <VideoIcon className="w-4 h-4 text-blue-700" />}
                <span className="text-xs font-semibold text-slate-800">
                  {item.type === 'text' ? item.content : item.title}
                </span>
              </div>

              {/* Right Handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-2 hover:bg-black/20 cursor-e-resize"
                onMouseDown={(e) => handleMouseDown(e, item, 'resize-r')}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Step 2: VideoAdvertCreator – imports and state

**File:** `src/pages/VideoAdvertCreator.jsx`

### 2.1 Imports

**FIND:**
```jsx
import { useNavigate } from 'react-router-dom';
```
**REPLACE WITH:**
```jsx
import { useNavigate, Link } from 'react-router-dom';
```

**FIND:**
```jsx
  Users,
  ChevronDown,
} from 'lucide-react';
```
**REPLACE WITH:**
```jsx
  Users,
  ChevronDown,
  Type,
  Clapperboard,
} from 'lucide-react';
```

Add Tabs import (after other `@/components` imports, e.g. after ApiKeysModal):
**FIND:**
```jsx
import ApiKeysModal from '@/components/modals/ApiKeysModal';

import { PLATFORMS, getPlatformList } from '@/lib/platforms';
```
**REPLACE WITH:**
```jsx
import ApiKeysModal from '@/components/modals/ApiKeysModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { PLATFORMS, getPlatformList } from '@/lib/platforms';
```

*(Do not add a second `import StudioTimeline` – it already exists.)*

### 2.2 State

**FIND:**
```jsx
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showBrandAssets, setShowBrandAssets] = useState(false);

  const handleSignOut = async () => {
```
**REPLACE WITH:**
```jsx
  const [showBrandKit, setShowBrandKit] = useState(false);
  const [showBrandAssets, setShowBrandAssets] = useState(false);

  // Editor & Timeline state
  const [activeTab, setActiveTab] = useState('editor');
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [selectedTimelineId, setSelectedTimelineId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSignOut = async () => {
```

### 2.3 Playback useEffect (insert immediately after the state block above)

**FIND:**
```jsx
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSignOut = async () => {
```
**REPLACE WITH:**
```jsx
  const [isPlaying, setIsPlaying] = useState(false);

  // Playback loop
  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();
    const fps = 30;
    const frameInterval = 1000 / fps;

    const playLoop = (time) => {
      if (time - lastTime >= frameInterval) {
        setCurrentTime(prev => {
          const maxDuration = createdVideos.length > 0
            ? Math.max(150, ...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150)))
            : 150;
          return prev >= maxDuration ? 0 : prev + 1;
        });
        lastTime = time;
      }
      animationFrameId = requestAnimationFrame(playLoop);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(playLoop);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, createdVideos]);

  const handleSignOut = async () => {
```

### 2.4 handleVideoCreated – add type and startAt

**FIND:**
```jsx
    const newVideo = {
      id: Date.now().toString(),
      url: videoUrl,
      title: title || `Video ${createdVideos.length + 1}`,
      createdAt: new Date().toISOString(),
      source: source || activeModal || 'unknown',
      durationInFrames: frames,
    };
    setCreatedVideos(prev => [newVideo, ...prev]);
```
**REPLACE WITH:**
```jsx
    const nextStartAt = createdVideos.length > 0
      ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150)))
      : 0;

    const newVideo = {
      id: Date.now().toString(),
      type: 'video',
      url: videoUrl,
      title: title || `Video ${createdVideos.length + 1}`,
      createdAt: new Date().toISOString(),
      source: source || activeModal || 'unknown',
      durationInFrames: frames,
      startAt: nextStartAt,
    };
    setCreatedVideos(prev => [newVideo, ...prev]);
```

### 2.5 handleAddText (insert before handleImageCreated)

**FIND:**
```jsx
  // Handle new image created
  const handleImageCreated = async (params) => {
```
**REPLACE WITH:**
```jsx
  // Handle adding text to timeline
  const handleAddText = () => {
    const nextStartAt = createdVideos.length > 0
      ? Math.max(...createdVideos.map(v => (v.startAt || 0) + (v.durationInFrames || 150)))
      : 0;

    const newTextItem = {
      id: Date.now().toString(),
      type: 'text',
      content: 'New Text Overlay',
      startAt: nextStartAt,
      durationInFrames: 150,
      style: {
        x: 10,
        y: 80,
        color: '#ffffff',
        fontSize: '32px',
        fontWeight: 'bold',
        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
      }
    };
    setCreatedVideos(prev => [...prev, newTextItem]);
    toast.success('Text overlay added!');
    setActiveTab('editor');
  };

  // Handle new image created
  const handleImageCreated = async (params) => {
```

---

## Step 3: Header and View Campaigns

**FIND:**
```jsx
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/campaigns')}
                className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
              >
                Campaigns
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeys(true)}
                className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
              >
                <Key className="w-3.5 h-3.5" /> API Keys
              </Button>
```
**REPLACE WITH:**
```jsx
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5">
                <Link to="/campaigns">View Campaigns</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowApiKeys(true)}
                className="text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5"
              >
                <Key className="w-3.5 h-3.5" /> API Keys
              </Button>
```

---

## Step 4: Tabs (Editor / Create) and Editor content

The current page has **no Tabs**; the main area is a single flex layout (left panel + center) and a bottom timeline. We introduce Tabs and put the new Editor UI in the first tab and the existing layout in the second.

**FIND:** (from start of Main Layout through the end of the bottom timeline)

```jsx
      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL - Asset & Generation Hub */}
        <div className="w-56 bg-slate-800 border-r border-slate-700 overflow-y-auto">
```

**REPLACE WITH:**

```jsx
      {/* Tabs: Editor (default) and Create */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-slate-700 px-4 py-2 bg-slate-850 flex items-center gap-2">
          <TabsList className="bg-slate-800 p-1">
            <TabsTrigger value="editor" className="gap-2 data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">
              <Clapperboard className="w-4 h-4" /> Editor
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2 data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">
              <Sparkles className="w-4 h-4" /> Create
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Editor Tab */}
        <TabsContent value="editor" className="flex-1 flex flex-col gap-4 mt-0 overflow-hidden p-4">
          <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-700 shadow-sm relative overflow-hidden flex items-center justify-center">
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 px-4 py-2 rounded-full z-50">
              <button type="button" onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-[#90DDF0]">
                {isPlaying ? <span className="font-bold">Pause</span> : <span className="font-bold flex items-center gap-1"><Play className="w-4 h-4" /> Play</span>}
              </button>
              <span className="text-white text-xs font-mono">FRAME: {currentTime}</span>
            </div>
            <div
              className="bg-black relative shadow-2xl"
              style={{
                aspectRatio: '9/16',
                height: '90%',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center'
              }}
            >
              {createdVideos.map(item => {
                const isActive = currentTime >= (item.startAt || 0) && currentTime < (item.startAt || 0) + (item.durationInFrames || 150);
                if (!isActive) return null;

                if (item.type === 'text') {
                  return (
                    <div
                      key={item.id}
                      style={{
                        position: 'absolute',
                        left: `${item.style?.x ?? 10}%`,
                        top: `${item.style?.y ?? 80}%`,
                        color: item.style?.color ?? '#ffffff',
                        fontSize: item.style?.fontSize ?? '32px',
                        fontWeight: item.style?.fontWeight ?? 'bold',
                        textShadow: item.style?.textShadow ?? '2px 2px 4px rgba(0,0,0,0.8)',
                        zIndex: 50,
                        cursor: 'pointer'
                      }}
                      onClick={() => setSelectedTimelineId(item.id)}
                      className={selectedTimelineId === item.id ? 'ring-2 ring-blue-500 border border-dashed border-blue-400 p-1' : ''}
                      role="button"
                      tabIndex={0}
                    >
                      {item.content}
                    </div>
                  );
                }

                return (
                  <video
                    key={item.id}
                    src={item.url}
                    autoPlay
                    muted
                    loop
                    className={`absolute inset-0 w-full h-full object-cover ${selectedTimelineId === item.id ? 'opacity-100' : 'opacity-95'}`}
                    style={{ zIndex: 10 }}
                  />
                );
              })}
              {createdVideos.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-500">
                  <Clapperboard className="w-12 h-12 mb-2 opacity-50" />
                  <p>Generate a video to start editing</p>
                </div>
              )}
            </div>
          </div>
          <div className="h-48 bg-slate-800 border border-slate-700 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-700 flex items-center justify-between bg-slate-850">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Timeline</span>
              <Button variant="outline" size="sm" onClick={handleAddText} className="h-7 text-xs gap-1 bg-slate-800 border-slate-600 text-slate-200">
                <Type className="w-3 h-3" /> Add Text
              </Button>
            </div>
            <div className="flex-1 relative min-h-0">
              <StudioTimeline
                items={createdVideos}
                onUpdateItem={(id, updates) => setCreatedVideos(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item))}
                onSelect={(item) => setSelectedTimelineId(item.id)}
                selectedId={selectedTimelineId}
                currentTime={currentTime}
                duration={createdVideos.length > 0 ? Math.max(900, ...createdVideos.map(i => (i.startAt || 0) + (i.durationInFrames || 150))) : 900}
                onSeek={(frame) => setCurrentTime(frame)}
              />
            </div>
          </div>
        </TabsContent>

        {/* Create Tab – existing layout */}
        <TabsContent value="create" className="flex-1 flex flex-col mt-0 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL - Asset & Generation Hub */}
        <div className="w-56 bg-slate-800 border-r border-slate-700 overflow-y-auto">
```

Then **remove** the old bottom timeline and close the Create tab and Tabs:

**FIND:**
```jsx
      </div>

      {/* BOTTOM PANEL - Timeline */}
      <StudioTimeline
        clips={currentPreviewVideo ? [currentPreviewVideo] : createdVideos}
        textOverlays={[]}
        width={PLATFORMS[selectedPlatform]?.dimensions?.width || 1080}
        height={PLATFORMS[selectedPlatform]?.dimensions?.height || 1920}
      />

      {/* Modals */}
```
**REPLACE WITH:**
```jsx
      </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
```

*(So: the closing `</div>` of the center panel stays; then we close the flex container, then close TabsContent for create, then close Tabs. The old StudioTimeline block is removed.)*

---

## Step 5: Add Text tool in Video Tools (Create tab)

**FIND:**
```jsx
              {expandedSections.videoTools && (
                <div className="mt-2 space-y-2">
                  <div
                    onClick={() => setActiveModal('jumpstart')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-[#07393C]" />
                      <span className="text-xs font-medium text-slate-200">JumpStart</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Image to video</p>
                  </div>
```
**REPLACE WITH:**
```jsx
              {expandedSections.videoTools && (
                <div className="mt-2 space-y-2">
                  <div
                    onClick={handleAddText}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-[#90DDF0]" />
                      <span className="text-xs font-medium text-slate-200">Add Text</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Overlay text on video</p>
                  </div>
                  <div
                    onClick={() => setActiveModal('jumpstart')}
                    className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4 text-[#07393C]" />
                      <span className="text-xs font-medium text-slate-200">JumpStart</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Image to video</p>
                  </div>
```
*(Add Text is the first tool; JumpStart remains second.)*

---

## Step 6: Backfill type and startAt for existing items

So the timeline and canvas work for items created before this change, ensure `createdVideos` items without `type` or `startAt` are treated correctly. The new StudioTimeline and canvas use `item.type`, `item.startAt`, and `item.durationInFrames`. When passing `items={createdVideos}`:

- For items that already have `type` and `startAt`, no change.
- For legacy items (only `url`, `title`, `durationInFrames`), the component uses `(item.startAt || 0)` and `(item.durationInFrames || 150)`; `item.type === 'text'` is false, so they render as video. So no backfill is strictly required. Optionally, when loading or when first rendering the Editor tab, you could normalize: if `!item.type` set `type: 'video'`, and if `item.startAt == null` set `startAt` from cumulative sum of previous durations. That can be a follow-up.

---

## Summary

| Step | File | Action |
|------|------|--------|
| 1 | `StudioTimeline.jsx` | Replace entire file with interactive timeline (items, onUpdateItem, onSelect, selectedId, currentTime, duration, onSeek). |
| 2 | `VideoAdvertCreator.jsx` | Add Link, Type, Clapperboard, Tabs imports; add state (currentTime, zoom, selectedTimelineId, isPlaying); add playback useEffect; add handleAddText; add type + startAt in handleVideoCreated. |
| 3 | `VideoAdvertCreator.jsx` | Header: replace Campaigns button with View Campaigns Link. |
| 4 | `VideoAdvertCreator.jsx` | Wrap main area in Tabs; add Editor tab (canvas + StudioTimeline) and Create tab (existing left + center); remove old bottom StudioTimeline. |
| 5 | `VideoAdvertCreator.jsx` | In Video Tools (Create tab), add “Add Text” as first tool. |

Result: Editor tab is the default, with timeline-driven canvas and interactive drag/resize timeline; Create tab keeps the existing tools and layout; View Campaigns links to `/campaigns`; new videos and text use `type` and `startAt`; playback advances `currentTime` when Play is active.
