import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Type,
  Video as VideoIcon,
  Music,
  Trash2,
  ZoomIn,
  ZoomOut,
  Scissors,
  Copy,
  ClipboardPaste,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Magnet,
} from 'lucide-react';

const FPS = 30;
const MIN_CLIP_FRAMES = 15; // 0.5s minimum clip

// Track definitions with labels and colors
const TRACK_DEFS = [
  { id: 'V1', label: 'V1', type: 'video', color: 'bg-blue-500/20 border-blue-400/60', activeColor: 'bg-blue-500/30', textColor: 'text-blue-300', icon: VideoIcon },
  { id: 'V2', label: 'V2', type: 'video', color: 'bg-blue-500/15 border-blue-400/40', activeColor: 'bg-blue-500/20', textColor: 'text-blue-400', icon: VideoIcon },
  { id: 'T1', label: 'T1', type: 'text', color: 'bg-purple-500/20 border-purple-400/60', activeColor: 'bg-purple-500/30', textColor: 'text-purple-300', icon: Type },
  { id: 'T2', label: 'T2', type: 'text', color: 'bg-purple-500/15 border-purple-400/40', activeColor: 'bg-purple-500/20', textColor: 'text-purple-400', icon: Type },
  { id: 'A1', label: 'A1', type: 'audio', color: 'bg-green-500/20 border-green-400/60', activeColor: 'bg-green-500/30', textColor: 'text-green-300', icon: Music },
  { id: 'A2', label: 'A2', type: 'audio', color: 'bg-green-500/15 border-green-400/40', activeColor: 'bg-green-500/20', textColor: 'text-green-400', icon: Music },
];

const TRACK_HEIGHT = 36;
const RULER_HEIGHT = 28;
const LABEL_WIDTH = 44;
const SNAP_THRESHOLD_PX = 6;

function formatTime(frames) {
  const totalSeconds = frames / FPS;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  const fr = Math.floor(frames % FPS);
  if (mins > 0) return `${mins}:${String(secs).padStart(2, '0')}:${String(fr).padStart(2, '0')}`;
  return `${secs}:${String(fr).padStart(2, '0')}`;
}

function formatTimeShort(frames) {
  const totalSeconds = frames / FPS;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  if (mins > 0) return `${mins}:${String(secs).padStart(2, '0')}`;
  return `${secs}s`;
}

export default function StudioTimeline({
  items,
  onUpdateItem,
  onDeleteItem,
  onSelect,
  selectedId,
  currentTime,
  duration = 900,
  onSeek,
  isPlaying,
  onTogglePlay,
}) {
  const timelineRef = useRef(null);
  const scrollRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [zoom, setZoom] = useState(2); // pixels per frame
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [clipboard, setClipboard] = useState(null);
  const [trackStates, setTrackStates] = useState(() =>
    Object.fromEntries(TRACK_DEFS.map(t => [t.id, { locked: false, visible: true }]))
  );
  const [hoverFrame, setHoverFrame] = useState(null);

  const pixelsPerFrame = zoom;
  const totalFrames = Math.max(duration, 900);
  const timelineWidth = totalFrames * pixelsPerFrame;

  // Assign items to tracks based on their type and trackIndex
  const getTrackForItem = useCallback((item) => {
    const idx = item.trackIndex || 0;
    if (item.type === 'text') return idx <= 0 ? 2 : Math.min(idx + 2, 3);
    if (item.type === 'audio') return idx <= 0 ? 4 : Math.min(idx + 4, 5);
    return Math.min(idx, 1); // video tracks 0-1
  }, []);

  // Collect snap points from all items (except the dragged one)
  const snapPoints = useMemo(() => {
    if (!snapEnabled || !dragging) return [];
    const points = new Set([0]); // Always snap to 0
    items.forEach(item => {
      if (item.id === dragging.id) return;
      const start = item.startAt || 0;
      const end = start + (item.durationInFrames || 150);
      points.add(start);
      points.add(end);
    });
    return Array.from(points);
  }, [items, dragging, snapEnabled]);

  const snapToNearest = useCallback((frame) => {
    if (!snapEnabled || snapPoints.length === 0) return frame;
    let closest = frame;
    let minDist = Infinity;
    const thresholdFrames = SNAP_THRESHOLD_PX / pixelsPerFrame;
    for (const sp of snapPoints) {
      const dist = Math.abs(frame - sp);
      if (dist < minDist && dist < thresholdFrames) {
        minDist = dist;
        closest = sp;
      }
    }
    return closest;
  }, [snapEnabled, snapPoints, pixelsPerFrame]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      // Delete/Backspace — remove selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && onDeleteItem) {
        e.preventDefault();
        onDeleteItem(selectedId);
        return;
      }
      // Space — play/pause
      if (e.key === ' ' && onTogglePlay) {
        e.preventDefault();
        onTogglePlay();
        return;
      }
      // S — split at playhead
      if (e.key === 's' && !e.metaKey && !e.ctrlKey && selectedId) {
        e.preventDefault();
        handleSplit();
        return;
      }
      // Ctrl/Cmd+C — copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedId) {
        const item = items.find(i => i.id === selectedId);
        if (item) setClipboard({ ...item });
        return;
      }
      // Ctrl/Cmd+V — paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard && onUpdateItem) {
        handlePaste();
        return;
      }
      // Arrow keys — nudge selected clip
      if (e.key === 'ArrowLeft' && selectedId) {
        e.preventDefault();
        const item = items.find(i => i.id === selectedId);
        if (item) {
          const shift = e.shiftKey ? FPS : 1; // Shift = 1 second, plain = 1 frame
          onUpdateItem(selectedId, { startAt: Math.max(0, (item.startAt || 0) - shift) });
        }
        return;
      }
      if (e.key === 'ArrowRight' && selectedId) {
        e.preventDefault();
        const item = items.find(i => i.id === selectedId);
        if (item) {
          const shift = e.shiftKey ? FPS : 1;
          onUpdateItem(selectedId, { startAt: (item.startAt || 0) + shift });
        }
        return;
      }
      // +/- zoom
      if (e.key === '=' || e.key === '+') {
        setZoom(z => Math.min(8, z + 0.5));
        return;
      }
      if (e.key === '-') {
        setZoom(z => Math.max(0.5, z - 0.5));
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, onDeleteItem, onTogglePlay, items, clipboard, onUpdateItem]);

  // Split clip at playhead
  const handleSplit = useCallback(() => {
    const item = items.find(i => i.id === selectedId);
    if (!item) return;
    const start = item.startAt || 0;
    const dur = item.durationInFrames || 150;
    const end = start + dur;
    if (currentTime <= start || currentTime >= end) return;

    const leftDur = currentTime - start;
    const rightDur = end - currentTime;
    if (leftDur < MIN_CLIP_FRAMES || rightDur < MIN_CLIP_FRAMES) return;

    // Shrink original to left portion
    onUpdateItem(item.id, { durationInFrames: leftDur });

    // Create right portion as new item (use a callback if available)
    const newItem = {
      ...item,
      id: Date.now().toString(),
      startAt: currentTime,
      durationInFrames: rightDur,
    };
    // We pass a special update that the parent can handle
    if (onUpdateItem.__splitCallback) {
      onUpdateItem.__splitCallback(newItem);
    }
  }, [items, selectedId, currentTime, onUpdateItem]);

  // Paste clipboard
  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    const newItem = {
      ...clipboard,
      id: Date.now().toString(),
      startAt: currentTime,
    };
    if (onUpdateItem.__splitCallback) {
      onUpdateItem.__splitCallback(newItem);
    }
  }, [clipboard, currentTime, onUpdateItem]);

  // Drag handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return;
      const deltaX = e.clientX - dragging.startX;
      const deltaFrames = Math.round(deltaX / pixelsPerFrame);

      if (dragging.action === 'move') {
        let newStartAt = Math.max(0, dragging.initialStartAt + deltaFrames);
        newStartAt = snapToNearest(newStartAt);
        // Also snap end point
        const endFrame = newStartAt + (dragging.initialDuration || 150);
        const snappedEnd = snapToNearest(endFrame);
        if (snappedEnd !== endFrame) {
          newStartAt = snappedEnd - (dragging.initialDuration || 150);
        }

        const deltaY = e.clientY - dragging.startY;
        const trackDelta = Math.round(deltaY / TRACK_HEIGHT);
        const newTrack = Math.max(0, Math.min(TRACK_DEFS.length - 1, dragging.initialTrack + trackDelta));

        onUpdateItem(dragging.id, { startAt: Math.max(0, newStartAt), trackIndex: newTrack });
      } else if (dragging.action === 'resize-l') {
        let newStartAt = Math.max(0, dragging.initialStartAt + deltaFrames);
        newStartAt = snapToNearest(newStartAt);
        const frameDiff = newStartAt - dragging.initialStartAt;
        const newDuration = Math.max(MIN_CLIP_FRAMES, dragging.initialDuration - frameDiff);
        if (newDuration > MIN_CLIP_FRAMES) {
          onUpdateItem(dragging.id, { startAt: newStartAt, durationInFrames: newDuration });
        }
      } else if (dragging.action === 'resize-r') {
        let newDuration = Math.max(MIN_CLIP_FRAMES, dragging.initialDuration + deltaFrames);
        const endFrame = (dragging.initialStartAt || 0) + newDuration;
        const snappedEnd = snapToNearest(endFrame);
        newDuration = Math.max(MIN_CLIP_FRAMES, snappedEnd - (dragging.initialStartAt || 0));
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
  }, [dragging, onUpdateItem, pixelsPerFrame, snapToNearest]);

  const handleMouseDown = (e, item, action) => {
    e.stopPropagation();
    const track = getTrackForItem(item);
    if (trackStates[TRACK_DEFS[track]?.id]?.locked) return;
    onSelect(item);
    setDragging({
      id: item.id,
      action,
      startX: e.clientX,
      startY: e.clientY,
      initialStartAt: item.startAt || 0,
      initialDuration: item.durationInFrames || 150,
      initialTrack: track,
    });
  };

  const handleTimelineClick = (e) => {
    if (!timelineRef.current || dragging) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
    const frame = Math.max(0, Math.round(x / pixelsPerFrame));
    if (onSeek) onSeek(frame);
    onSelect(null);
  };

  const handleTimelineMouseMove = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
    setHoverFrame(Math.max(0, Math.round(x / pixelsPerFrame)));
  };

  const toggleTrackLock = (trackId) => {
    setTrackStates(prev => ({ ...prev, [trackId]: { ...prev[trackId], locked: !prev[trackId].locked } }));
  };

  const toggleTrackVisibility = (trackId) => {
    setTrackStates(prev => ({ ...prev, [trackId]: { ...prev[trackId], visible: !prev[trackId].visible } }));
  };

  // Ruler tick calculation
  const rulerTicks = useMemo(() => {
    const ticks = [];
    // Determine interval based on zoom
    let majorInterval, minorInterval;
    if (pixelsPerFrame >= 4) {
      majorInterval = FPS; // every second
      minorInterval = FPS / 2; // every 0.5s
    } else if (pixelsPerFrame >= 2) {
      majorInterval = FPS * 2; // every 2 seconds
      minorInterval = FPS; // every second
    } else if (pixelsPerFrame >= 1) {
      majorInterval = FPS * 5; // every 5 seconds
      minorInterval = FPS * 1; // every second
    } else {
      majorInterval = FPS * 10;
      minorInterval = FPS * 5;
    }

    for (let f = 0; f <= totalFrames; f += minorInterval) {
      const isMajor = f % majorInterval === 0;
      ticks.push({ frame: f, isMajor, x: f * pixelsPerFrame });
    }
    return ticks;
  }, [pixelsPerFrame, totalFrames]);

  const getClipColor = (type) => {
    if (type === 'text') return 'bg-purple-500/30 border-purple-400/50 hover:border-purple-400';
    if (type === 'audio') return 'bg-green-500/30 border-green-400/50 hover:border-green-400';
    return 'bg-blue-500/30 border-blue-400/50 hover:border-blue-400';
  };

  const getClipSelectedColor = (type) => {
    if (type === 'text') return 'ring-2 ring-purple-400 bg-purple-500/40 border-purple-400';
    if (type === 'audio') return 'ring-2 ring-green-400 bg-green-500/40 border-green-400';
    return 'ring-2 ring-blue-400 bg-blue-500/40 border-blue-400';
  };

  const getIcon = (type) => {
    if (type === 'text') return <Type className="w-3 h-3 text-purple-300" />;
    if (type === 'audio') return <Music className="w-3 h-3 text-green-300" />;
    return <VideoIcon className="w-3 h-3 text-blue-300" />;
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 select-none">
      {/* Transport Bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0">
        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSeek && onSeek(0)}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Go to start"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onTogglePlay}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Play/Pause (Space)"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              const maxFrame = items.length > 0
                ? Math.max(...items.map(i => (i.startAt || 0) + (i.durationInFrames || 150)))
                : 0;
              if (onSeek) onSeek(maxFrame);
            }}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Go to end"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Time display */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
          <span className="text-xs font-mono text-white font-medium tabular-nums w-16 text-center">
            {formatTime(currentTime)}
          </span>
        </div>

        <div className="w-px h-4 bg-slate-700" />

        {/* Editing tools */}
        <button
          onClick={handleSplit}
          disabled={!selectedId}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Split at playhead (S)"
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { if (selectedId) { const item = items.find(i => i.id === selectedId); if (item) setClipboard({ ...item }); } }}
          disabled={!selectedId}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Copy (Cmd+C)"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handlePaste}
          disabled={!clipboard}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Paste (Cmd+V)"
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => selectedId && onDeleteItem && onDeleteItem(selectedId)}
          disabled={!selectedId}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Delete (Del)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-700" />

        {/* Snap toggle */}
        <button
          onClick={() => setSnapEnabled(s => !s)}
          className={`p-1 rounded transition-colors ${snapEnabled ? 'bg-blue-600/30 text-blue-300' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          title={`Snap ${snapEnabled ? 'ON' : 'OFF'}`}
        >
          <Magnet className="w-3.5 h-3.5" />
        </button>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Zoom out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-slate-500 font-mono w-8 text-center">{zoom}x</span>
          <button
            onClick={() => setZoom(z => Math.min(8, z + 0.5))}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hover time indicator */}
        {hoverFrame !== null && (
          <span className="text-[10px] text-slate-500 font-mono ml-1">
            {formatTimeShort(hoverFrame)}
          </span>
        )}
      </div>

      {/* Timeline body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Track Labels */}
        <div className="flex flex-col shrink-0 bg-slate-900 border-r border-slate-800" style={{ width: LABEL_WIDTH }}>
          {/* Ruler spacer */}
          <div style={{ height: RULER_HEIGHT }} className="border-b border-slate-800" />
          {/* Track labels */}
          {TRACK_DEFS.map((track) => {
            const state = trackStates[track.id];
            const TIcon = track.icon;
            return (
              <div
                key={track.id}
                className="flex items-center justify-between px-1 border-b border-slate-800/50 group"
                style={{ height: TRACK_HEIGHT }}
              >
                <div className="flex items-center gap-0.5">
                  <TIcon className={`w-2.5 h-2.5 ${track.textColor}`} />
                  <span className={`text-[9px] font-bold ${track.textColor}`}>{track.label}</span>
                </div>
                <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleTrackLock(track.id)}
                    className="p-0.5 hover:bg-slate-700 rounded"
                    title={state.locked ? 'Unlock track' : 'Lock track'}
                  >
                    {state.locked
                      ? <Lock className="w-2.5 h-2.5 text-amber-400" />
                      : <Unlock className="w-2.5 h-2.5 text-slate-500" />
                    }
                  </button>
                  <button
                    onClick={() => toggleTrackVisibility(track.id)}
                    className="p-0.5 hover:bg-slate-700 rounded"
                    title={state.visible ? 'Hide track' : 'Show track'}
                  >
                    {state.visible
                      ? <Eye className="w-2.5 h-2.5 text-slate-500" />
                      : <EyeOff className="w-2.5 h-2.5 text-slate-600" />
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable timeline area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto relative"
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={() => setHoverFrame(null)}
        >
          <div
            ref={timelineRef}
            className="relative"
            style={{ width: `${timelineWidth}px`, minHeight: `${RULER_HEIGHT + TRACK_DEFS.length * TRACK_HEIGHT}px` }}
            onClick={handleTimelineClick}
          >
            {/* Time Ruler */}
            <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700" style={{ height: RULER_HEIGHT }}>
              {rulerTicks.map((tick) => (
                <div key={tick.frame} className="absolute top-0" style={{ left: `${tick.x}px` }}>
                  <div
                    className={`w-px ${tick.isMajor ? 'bg-slate-500 h-full' : 'bg-slate-700 h-2/3 mt-auto'}`}
                    style={{ height: tick.isMajor ? RULER_HEIGHT : RULER_HEIGHT * 0.4, marginTop: tick.isMajor ? 0 : RULER_HEIGHT * 0.6 }}
                  />
                  {tick.isMajor && (
                    <span className="absolute top-0.5 left-1 text-[9px] text-slate-500 font-mono whitespace-nowrap">
                      {formatTimeShort(tick.frame)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Track backgrounds */}
            {TRACK_DEFS.map((track, i) => {
              const state = trackStates[track.id];
              return (
                <div
                  key={track.id}
                  className={`absolute w-full border-b border-slate-800/40 ${
                    state.locked ? 'bg-slate-800/20' : i % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-950/50'
                  } ${!state.visible ? 'opacity-40' : ''}`}
                  style={{ top: `${RULER_HEIGHT + i * TRACK_HEIGHT}px`, height: TRACK_HEIGHT }}
                />
              );
            })}

            {/* Clips */}
            {items.map(item => {
              const trackIdx = getTrackForItem(item);
              const trackDef = TRACK_DEFS[trackIdx];
              const state = trackStates[trackDef?.id];
              if (!state?.visible) return null;

              const isSelected = selectedId === item.id;
              const startPx = (item.startAt || 0) * pixelsPerFrame;
              const widthPx = (item.durationInFrames || 150) * pixelsPerFrame;
              const topPx = RULER_HEIGHT + trackIdx * TRACK_HEIGHT + 2;

              return (
                <div
                  key={item.id}
                  className={`absolute rounded border overflow-hidden cursor-move transition-shadow ${
                    isSelected ? getClipSelectedColor(item.type) + ' z-40' : getClipColor(item.type) + ' z-10'
                  } ${state.locked ? 'cursor-not-allowed opacity-70' : ''}`}
                  style={{
                    left: `${startPx}px`,
                    width: `${widthPx}px`,
                    top: `${topPx}px`,
                    height: `${TRACK_HEIGHT - 4}px`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, item, 'move')}
                >
                  {/* Left resize handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 hover:bg-white/20 cursor-w-resize z-20"
                    onMouseDown={(e) => handleMouseDown(e, item, 'resize-l')}
                  />

                  {/* Clip content */}
                  <div className="flex items-center gap-1 px-2 h-full pointer-events-none overflow-hidden">
                    {getIcon(item.type)}
                    <span className="text-[10px] font-medium text-white/80 truncate">
                      {item.type === 'text' ? item.content : item.title}
                    </span>
                    {widthPx > 80 && (
                      <span className="text-[9px] text-white/40 ml-auto shrink-0">
                        {formatTimeShort(item.durationInFrames || 150)}
                      </span>
                    )}
                  </div>

                  {/* Waveform placeholder for audio */}
                  {item.type === 'audio' && widthPx > 40 && (
                    <div className="absolute inset-0 flex items-center px-2 pointer-events-none opacity-30">
                      {Array.from({ length: Math.min(Math.floor(widthPx / 3), 80) }).map((_, i) => (
                        <div
                          key={i}
                          className="w-0.5 mx-px bg-green-400 rounded-full"
                          style={{ height: `${30 + Math.sin(i * 0.7) * 40 + Math.random() * 20}%` }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Right resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1.5 hover:bg-white/20 cursor-e-resize z-20"
                    onMouseDown={(e) => handleMouseDown(e, item, 'resize-r')}
                  />
                </div>
              );
            })}

            {/* Playhead */}
            <div
              className="absolute top-0 z-50 pointer-events-none"
              style={{ left: `${currentTime * pixelsPerFrame}px`, height: `${RULER_HEIGHT + TRACK_DEFS.length * TRACK_HEIGHT}px` }}
            >
              {/* Head triangle */}
              <div className="relative">
                <div className="absolute -left-[5px] top-0 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500" />
                <div className="absolute left-0 top-[8px] w-px bg-red-500/80" style={{ height: `${TRACK_DEFS.length * TRACK_HEIGHT + RULER_HEIGHT - 8}px` }} />
              </div>
            </div>

            {/* Hover line */}
            {hoverFrame !== null && !dragging && (
              <div
                className="absolute top-0 w-px bg-slate-600/40 pointer-events-none z-20"
                style={{
                  left: `${hoverFrame * pixelsPerFrame}px`,
                  height: `${RULER_HEIGHT + TRACK_DEFS.length * TRACK_HEIGHT}px`,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
