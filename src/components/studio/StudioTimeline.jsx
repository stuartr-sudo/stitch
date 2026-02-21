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