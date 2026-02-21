import re

with open('src/components/studio/StudioTimeline.jsx', 'r') as f:
    text = f.read()

# We need to handle vertical dragging for track assignments and delete functionality.
# I will just write a whole new StudioTimeline.jsx because it needs significant upgrades for tracks.

new_timeline = """import React, { useRef, useState, useEffect } from 'react';
import { Type, Video as VideoIcon, Music, Trash2 } from 'lucide-react';

export default function StudioTimeline({ items, onUpdateItem, onDeleteItem, onSelect, selectedId, currentTime, duration = 900, onSeek }) {
  const timelineRef = useRef(null);
  const [dragging, setDragging] = useState(null); // { id, action: 'move'|'resize-l'|'resize-r', startX, startY, initialStartAt, initialDuration, initialTrack }
  const pixelsPerFrame = 2; // Adjust for zoom later
  const trackHeight = 40; // Reduced height (32px track + 8px gap)

  // Listen for delete key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && onDeleteItem) {
        // Prevent if we are typing in an input
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        onDeleteItem(selectedId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, onDeleteItem]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging) return;

      const deltaX = e.clientX - dragging.startX;
      const deltaFrames = Math.round(deltaX / pixelsPerFrame);
      
      const deltaY = e.clientY - dragging.startY;
      const deltaTracks = Math.round(deltaY / trackHeight);

      if (dragging.action === 'move') {
        const newStartAt = Math.max(0, dragging.initialStartAt + deltaFrames);
        const newTrack = Math.max(0, dragging.initialTrack + deltaTracks);
        onUpdateItem(dragging.id, { startAt: newStartAt, trackIndex: newTrack });
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
      startY: e.clientY,
      initialStartAt: item.startAt || 0,
      initialDuration: item.durationInFrames || 150,
      initialTrack: item.trackIndex || 0
    });
  };

  const handleTimelineClick = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.max(0, Math.round(x / pixelsPerFrame));
    if (onSeek) onSeek(frame);
    onSelect(null); // click empty space to deselect
  };

  const getIcon = (type) => {
    if (type === 'text') return <Type className="w-3.5 h-3.5 text-purple-700" />;
    if (type === 'audio') return <Music className="w-3.5 h-3.5 text-green-700" />;
    return <VideoIcon className="w-3.5 h-3.5 text-blue-700" />;
  };

  const getBgColor = (type) => {
    if (type === 'text') return 'bg-purple-100 border-purple-300';
    if (type === 'audio') return 'bg-green-100 border-green-300';
    return 'bg-blue-100 border-blue-300';
  };

  // Determine the max track index to render enough background tracks
  const maxTrack = Math.max(5, ...items.map(i => i.trackIndex || 0));
  const trackLines = Array.from({ length: maxTrack + 2 });

  return (
    <div className="w-full h-full bg-slate-900 overflow-auto relative select-none" onClick={handleTimelineClick}>
      <div
        ref={timelineRef}
        className="relative min-h-full border-b border-slate-700"
        style={{ width: `${Math.max(duration, 900) * pixelsPerFrame}px`, minWidth: '100%' }}
      >
        {/* Background Track Lines */}
        {trackLines.map((_, i) => (
          <div key={`track-${i}`} className="absolute w-full border-t border-slate-800/50" style={{ top: `${i * trackHeight + 28}px`, height: `${trackHeight}px` }} />
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-px bg-red-500 z-50 pointer-events-none"
          style={{ left: `${currentTime * pixelsPerFrame}px` }}
        >
          <div className="absolute top-0 -left-1.5 w-3 h-3 bg-red-500 rounded-sm" />
        </div>

        {/* Tracks Container */}
        <div className="pt-7 pb-4">
          {items.map(item => (
            <div
              key={item.id}
              className={`absolute h-8 rounded border overflow-hidden cursor-move transition-shadow flex items-center px-2 ${
                selectedId === item.id ? 'ring-2 ring-blue-400 z-40 brightness-110' : 'z-10'
              } ${getBgColor(item.type)}`}
              style={{
                left: `${(item.startAt || 0) * pixelsPerFrame}px`,
                width: `${(item.durationInFrames || 150) * pixelsPerFrame}px`,
                top: `${(item.trackIndex || 0) * trackHeight + 30}px`
              }}
              onMouseDown={(e) => handleMouseDown(e, item, 'move')}
            >
              {/* Left Handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2 hover:bg-black/20 cursor-w-resize"
                onMouseDown={(e) => handleMouseDown(e, item, 'resize-l')}
              />

              <div className="flex items-center gap-1.5 truncate pointer-events-none w-full">
                {getIcon(item.type)}
                <span className="text-[11px] font-semibold text-slate-800 truncate">
                  {item.type === 'text' ? item.content : item.title}
                </span>
              </div>
              
              {/* Delete Button (only if selected) */}
              {selectedId === item.id && (
                <button
                  className="absolute right-3 p-0.5 bg-red-100 hover:bg-red-200 rounded text-red-600 transition-colors z-50"
                  onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}

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
"""

with open('src/components/studio/StudioTimeline.jsx', 'w') as f:
    f.write(new_timeline)

print("Timeline rewritten.")
