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

// Track definitions
const TRACK_DEFS = [
  { id: 'V1', label: 'V1', type: 'video', icon: VideoIcon },
  { id: 'V2', label: 'V2', type: 'video', icon: VideoIcon },
  { id: 'T1', label: 'T1', type: 'text', icon: Type },
  { id: 'T2', label: 'T2', type: 'text', icon: Type },
  { id: 'A1', label: 'A1', type: 'audio', icon: Music },
  { id: 'A2', label: 'A2', type: 'audio', icon: Music },
];

const TRACK_HEIGHT = 36;
const RULER_HEIGHT = 28;
const LABEL_WIDTH = 48;
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

// Toolbar button — light theme
function ToolBtn({ onClick, disabled, active, title, children, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors ${
        active
          ? 'bg-[#2C666E] text-white'
          : disabled
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      }`}
      title={title}
    >
      {children}
      {label && <span className="text-[11px]">{label}</span>}
    </button>
  );
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
  const [zoom, setZoom] = useState(2);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [clipboard, setClipboard] = useState(null);
  const [trackStates, setTrackStates] = useState(() =>
    Object.fromEntries(TRACK_DEFS.map(t => [t.id, { locked: false, visible: true }]))
  );
  const [hoverFrame, setHoverFrame] = useState(null);

  const pixelsPerFrame = zoom;
  const totalFrames = Math.max(duration, 900);
  const timelineWidth = totalFrames * pixelsPerFrame;

  const getTrackForItem = useCallback((item) => {
    const idx = item.trackIndex || 0;
    if (item.type === 'text') return idx <= 0 ? 2 : Math.min(idx + 2, 3);
    if (item.type === 'audio') return idx <= 0 ? 4 : Math.min(idx + 4, 5);
    return Math.min(idx, 1);
  }, []);

  const snapPoints = useMemo(() => {
    if (!snapEnabled || !dragging) return [];
    const points = new Set([0]);
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && onDeleteItem) {
        e.preventDefault(); onDeleteItem(selectedId); return;
      }
      if (e.key === ' ' && onTogglePlay) { e.preventDefault(); onTogglePlay(); return; }
      if (e.key === 's' && !e.metaKey && !e.ctrlKey && selectedId) { e.preventDefault(); handleSplit(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedId) {
        const item = items.find(i => i.id === selectedId);
        if (item) setClipboard({ ...item }); return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipboard) { handlePaste(); return; }
      if (e.key === 'ArrowLeft' && selectedId) {
        e.preventDefault();
        const item = items.find(i => i.id === selectedId);
        if (item) onUpdateItem(selectedId, { startAt: Math.max(0, (item.startAt || 0) - (e.shiftKey ? FPS : 1)) });
        return;
      }
      if (e.key === 'ArrowRight' && selectedId) {
        e.preventDefault();
        const item = items.find(i => i.id === selectedId);
        if (item) onUpdateItem(selectedId, { startAt: (item.startAt || 0) + (e.shiftKey ? FPS : 1) });
        return;
      }
      if (e.key === '=' || e.key === '+') { setZoom(z => Math.min(8, z + 0.5)); return; }
      if (e.key === '-') { setZoom(z => Math.max(0.5, z - 0.5)); return; }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, onDeleteItem, onTogglePlay, items, clipboard, onUpdateItem]);

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
    onUpdateItem(item.id, { durationInFrames: leftDur });
    const newItem = { ...item, id: Date.now().toString(), startAt: currentTime, durationInFrames: rightDur };
    if (onUpdateItem.__splitCallback) onUpdateItem.__splitCallback(newItem);
  }, [items, selectedId, currentTime, onUpdateItem]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    const newItem = { ...clipboard, id: Date.now().toString(), startAt: currentTime };
    if (onUpdateItem.__splitCallback) onUpdateItem.__splitCallback(newItem);
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
        const endFrame = newStartAt + (dragging.initialDuration || 150);
        const snappedEnd = snapToNearest(endFrame);
        if (snappedEnd !== endFrame) newStartAt = snappedEnd - (dragging.initialDuration || 150);
        const deltaY = e.clientY - dragging.startY;
        const trackDelta = Math.round(deltaY / TRACK_HEIGHT);
        const newTrack = Math.max(0, Math.min(TRACK_DEFS.length - 1, dragging.initialTrack + trackDelta));
        onUpdateItem(dragging.id, { startAt: Math.max(0, newStartAt), trackIndex: newTrack });
      } else if (dragging.action === 'resize-l') {
        let newStartAt = Math.max(0, dragging.initialStartAt + deltaFrames);
        newStartAt = snapToNearest(newStartAt);
        const frameDiff = newStartAt - dragging.initialStartAt;
        const newDuration = Math.max(MIN_CLIP_FRAMES, dragging.initialDuration - frameDiff);
        if (newDuration > MIN_CLIP_FRAMES) onUpdateItem(dragging.id, { startAt: newStartAt, durationInFrames: newDuration });
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
      id: item.id, action, startX: e.clientX, startY: e.clientY,
      initialStartAt: item.startAt || 0, initialDuration: item.durationInFrames || 150, initialTrack: track,
    });
  };

  const handleTimelineClick = (e) => {
    if (!timelineRef.current || dragging) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + (scrollRef.current?.scrollLeft || 0);
    if (onSeek) onSeek(Math.max(0, Math.round(x / pixelsPerFrame)));
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

  const rulerTicks = useMemo(() => {
    const ticks = [];
    let majorInterval, minorInterval;
    if (pixelsPerFrame >= 4) { majorInterval = FPS; minorInterval = FPS / 2; }
    else if (pixelsPerFrame >= 2) { majorInterval = FPS * 2; minorInterval = FPS; }
    else if (pixelsPerFrame >= 1) { majorInterval = FPS * 5; minorInterval = FPS; }
    else { majorInterval = FPS * 10; minorInterval = FPS * 5; }
    for (let f = 0; f <= totalFrames; f += minorInterval) {
      ticks.push({ frame: f, isMajor: f % majorInterval === 0, x: f * pixelsPerFrame });
    }
    return ticks;
  }, [pixelsPerFrame, totalFrames]);

  // Clip colors — light theme with subtle tints
  const getClipStyle = (type, isSelected) => {
    if (isSelected) {
      if (type === 'text') return 'bg-amber-100 border-[#2C666E] ring-1 ring-[#2C666E]';
      if (type === 'audio') return 'bg-green-100 border-[#2C666E] ring-1 ring-[#2C666E]';
      return 'bg-blue-100 border-[#2C666E] ring-1 ring-[#2C666E]';
    }
    if (type === 'text') return 'bg-amber-50 border-amber-300 hover:border-amber-400';
    if (type === 'audio') return 'bg-green-50 border-green-300 hover:border-green-400';
    return 'bg-blue-50 border-blue-300 hover:border-blue-400';
  };

  // Clip left accent stripe color
  const getAccentColor = (type) => {
    if (type === 'text') return 'bg-amber-400';
    if (type === 'audio') return 'bg-green-400';
    return 'bg-blue-400';
  };

  const getIcon = (type) => {
    if (type === 'text') return <Type className="w-3 h-3 text-amber-600" />;
    if (type === 'audio') return <Music className="w-3 h-3 text-green-600" />;
    return <VideoIcon className="w-3 h-3 text-blue-600" />;
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 select-none">
      {/* Transport Bar */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-white border-b border-gray-200 shrink-0">
        {/* Playback */}
        <ToolBtn onClick={() => onSeek && onSeek(0)} title="Go to start">
          <SkipBack className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={onTogglePlay} title="Play/Pause (Space)">
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </ToolBtn>
        <ToolBtn onClick={() => {
          const maxFrame = items.length > 0 ? Math.max(...items.map(i => (i.startAt || 0) + (i.durationInFrames || 150))) : 0;
          if (onSeek) onSeek(maxFrame);
        }} title="Go to end">
          <SkipForward className="w-3.5 h-3.5" />
        </ToolBtn>

        {/* Timecode */}
        <div className="px-2 py-0.5 rounded bg-gray-100 border border-gray-300 mx-1">
          <span className="text-xs font-mono text-gray-800 tabular-nums">{formatTime(currentTime)}</span>
        </div>

        <div className="w-px h-4 bg-gray-300" />

        {/* Edit tools */}
        <ToolBtn onClick={handleSplit} disabled={!selectedId} title="Split (S)" label="Split">
          <Scissors className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => { if (selectedId) { const item = items.find(i => i.id === selectedId); if (item) setClipboard({ ...item }); } }} disabled={!selectedId} title="Copy (Cmd+C)">
          <Copy className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={handlePaste} disabled={!clipboard} title="Paste (Cmd+V)">
          <ClipboardPaste className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => selectedId && onDeleteItem && onDeleteItem(selectedId)} disabled={!selectedId} title="Delete (Del)">
          <Trash2 className="w-3.5 h-3.5" />
        </ToolBtn>

        <div className="w-px h-4 bg-gray-300" />

        {/* Snap */}
        <ToolBtn onClick={() => setSnapEnabled(s => !s)} active={snapEnabled} title={`Snap ${snapEnabled ? 'ON' : 'OFF'}`} label="Snap">
          <Magnet className="w-3.5 h-3.5" />
        </ToolBtn>

        {/* Zoom */}
        <div className="flex items-center gap-0.5 ml-auto">
          <ToolBtn onClick={() => setZoom(z => Math.max(0.5, z - 0.5))} title="Zoom out (-)">
            <ZoomOut className="w-3.5 h-3.5" />
          </ToolBtn>
          <span className="text-[10px] text-gray-500 font-mono w-7 text-center">{zoom}x</span>
          <ToolBtn onClick={() => setZoom(z => Math.min(8, z + 0.5))} title="Zoom in (+)">
            <ZoomIn className="w-3.5 h-3.5" />
          </ToolBtn>
        </div>

        {hoverFrame !== null && (
          <span className="text-[10px] text-gray-500 font-mono ml-1">{formatTimeShort(hoverFrame)}</span>
        )}
      </div>

      {/* Timeline Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Track Labels */}
        <div className="flex flex-col shrink-0 bg-white border-r border-gray-200" style={{ width: LABEL_WIDTH }}>
          <div style={{ height: RULER_HEIGHT }} className="border-b border-gray-200" />
          {TRACK_DEFS.map((track) => {
            const state = trackStates[track.id];
            const TIcon = track.icon;
            return (
              <div key={track.id} className="flex items-center justify-between px-1.5 border-b border-gray-100 group" style={{ height: TRACK_HEIGHT }}>
                <div className="flex items-center gap-1">
                  <TIcon className="w-2.5 h-2.5 text-gray-400" />
                  <span className="text-[10px] font-semibold text-gray-600">{track.label}</span>
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleTrackLock(track.id)} className="p-0.5 hover:bg-gray-100 rounded" title={state.locked ? 'Unlock' : 'Lock'}>
                    {state.locked ? <Lock className="w-2.5 h-2.5 text-gray-800" /> : <Unlock className="w-2.5 h-2.5 text-gray-400" />}
                  </button>
                  <button onClick={() => toggleTrackVisibility(track.id)} className="p-0.5 hover:bg-gray-100 rounded" title={state.visible ? 'Hide' : 'Show'}>
                    {state.visible ? <Eye className="w-2.5 h-2.5 text-gray-400" /> : <EyeOff className="w-2.5 h-2.5 text-gray-300" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable Timeline */}
        <div ref={scrollRef} className="flex-1 overflow-auto relative" onMouseMove={handleTimelineMouseMove} onMouseLeave={() => setHoverFrame(null)}>
          <div
            ref={timelineRef}
            className="relative"
            style={{ width: `${timelineWidth}px`, minHeight: `${RULER_HEIGHT + TRACK_DEFS.length * TRACK_HEIGHT}px` }}
            onClick={handleTimelineClick}
          >
            {/* Ruler */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-300" style={{ height: RULER_HEIGHT }}>
              {rulerTicks.map((tick) => (
                <div key={tick.frame} className="absolute top-0" style={{ left: `${tick.x}px` }}>
                  <div
                    className={`w-px ${tick.isMajor ? 'bg-gray-400' : 'bg-gray-200'}`}
                    style={{ height: tick.isMajor ? RULER_HEIGHT : RULER_HEIGHT * 0.4, marginTop: tick.isMajor ? 0 : RULER_HEIGHT * 0.6 }}
                  />
                  {tick.isMajor && (
                    <span className="absolute top-0.5 left-1 text-[9px] text-gray-500 font-mono whitespace-nowrap">
                      {formatTimeShort(tick.frame)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Track Backgrounds */}
            {TRACK_DEFS.map((track, i) => {
              const state = trackStates[track.id];
              return (
                <div
                  key={track.id}
                  className={`absolute w-full border-b border-gray-100 ${
                    state.locked ? 'bg-gray-100' : i % 2 === 0 ? 'bg-gray-50' : 'bg-white'
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
                  className={`absolute rounded border overflow-hidden cursor-move transition-shadow ${getClipStyle(item.type, isSelected)} ${isSelected ? 'z-40 shadow-md' : 'z-10 shadow-sm'} ${state.locked ? 'cursor-not-allowed opacity-60' : ''}`}
                  style={{ left: `${startPx}px`, width: `${widthPx}px`, top: `${topPx}px`, height: `${TRACK_HEIGHT - 4}px` }}
                  onMouseDown={(e) => handleMouseDown(e, item, 'move')}
                >
                  {/* Left accent stripe */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getAccentColor(item.type)}`} />

                  {/* Left resize handle */}
                  <div className="absolute left-0 top-0 bottom-0 w-2 hover:bg-black/5 cursor-w-resize z-20" onMouseDown={(e) => handleMouseDown(e, item, 'resize-l')} />

                  {/* Content */}
                  <div className="flex items-center gap-1.5 pl-3 pr-2 h-full pointer-events-none overflow-hidden">
                    {getIcon(item.type)}
                    <span className="text-[10px] font-medium text-gray-800 truncate">
                      {item.type === 'text' ? item.content : item.title}
                    </span>
                    {widthPx > 80 && (
                      <span className="text-[9px] text-gray-500 ml-auto shrink-0">{formatTimeShort(item.durationInFrames || 150)}</span>
                    )}
                  </div>

                  {/* Audio waveform placeholder */}
                  {item.type === 'audio' && widthPx > 40 && (
                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none opacity-20">
                      {Array.from({ length: Math.min(Math.floor(widthPx / 3), 80) }).map((_, i) => (
                        <div key={i} className="w-0.5 mx-px bg-green-600 rounded-full" style={{ height: `${30 + Math.sin(i * 0.7) * 40 + Math.random() * 20}%` }} />
                      ))}
                    </div>
                  )}

                  {/* Right resize handle */}
                  <div className="absolute right-0 top-0 bottom-0 w-2 hover:bg-black/5 cursor-e-resize z-20" onMouseDown={(e) => handleMouseDown(e, item, 'resize-r')} />
                </div>
              );
            })}

            {/* Playhead */}
            <div className="absolute top-0 z-50 pointer-events-none" style={{ left: `${currentTime * pixelsPerFrame}px`, height: `${RULER_HEIGHT + TRACK_DEFS.length * TRACK_HEIGHT}px` }}>
              <div className="relative">
                <div className="absolute -left-[5px] top-0 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#2C666E]" />
                <div className="absolute left-0 top-[8px] w-px bg-[#2C666E]/70" style={{ height: `${TRACK_DEFS.length * TRACK_HEIGHT + RULER_HEIGHT - 8}px` }} />
              </div>
            </div>

            {/* Hover line */}
            {hoverFrame !== null && !dragging && (
              <div className="absolute top-0 w-px bg-gray-300 pointer-events-none z-20" style={{ left: `${hoverFrame * pixelsPerFrame}px`, height: `${RULER_HEIGHT + TRACK_DEFS.length * TRACK_HEIGHT}px` }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
