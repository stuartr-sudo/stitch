import React, { useState, useRef, useEffect } from 'react';

export default function DraggableCanvasItem({ item, selectedId, onSelect, onUpdate, currentTime, isPlaying }) {
  const isSelected = selectedId === item.id;

  // Default bounds and sizes based on item type
  const isText = item.type === 'text';
  const isVideo = item.type === 'video';
  const isImage = item.type === 'image';

  const defaultW = isText ? null : 100;
  const defaultH = isText ? null : 100;
  const defaultX = isText ? 10 : 0;
  const defaultY = isText ? 80 : 0;

  const style = item.style || {};
  const x = style.x ?? defaultX;
  const y = style.y ?? defaultY;
  const width = style.width ?? defaultW;
  const height = style.height ?? defaultH;

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(item.content || '');

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [dragState, setDragState] = useState(null); // { type: 'move' | 'resize', startX, startY, initX, initY, initW, initH }

  // Sync video element with timeline
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) return;

    const targetTime = (currentTime - (item.startAt || 0)) / 30;

    if (isPlaying) {
      if (el.paused) el.play().catch(() => {});
      // Re-sync if drifted more than 0.3s
      if (Math.abs(el.currentTime - targetTime) > 0.3) {
        el.currentTime = targetTime;
      }
    } else {
      if (!el.paused) el.pause();
      el.currentTime = Math.max(0, targetTime);
    }
  }, [currentTime, isPlaying, isVideo, item.startAt]);

  useEffect(() => {
    if (!dragState) return;
    
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      const rect = parent.getBoundingClientRect();
      
      const deltaX = ((e.clientX - dragState.startX) / rect.width) * 100;
      const deltaY = ((e.clientY - dragState.startY) / rect.height) * 100;

      if (dragState.type === 'move') {
        let newX = dragState.initX + deltaX;
        let newY = dragState.initY + deltaY;
        
        // Boundaries (roughly)
        newX = Math.max(0, Math.min(newX, 95));
        newY = Math.max(0, Math.min(newY, 95));

        onUpdate(item.id, {
          style: { ...style, x: newX, y: newY }
        });
      } else if (dragState.type === 'resize') {
        let newW = dragState.initW + deltaX;
        let newH = dragState.initH + deltaY;
        
        // Minimum sizes
        newW = Math.max(10, Math.min(newW, 100 - x));
        newH = Math.max(10, Math.min(newH, 100 - y));

        onUpdate(item.id, {
          style: { ...style, width: newW, height: newH }
        });
      }
    };

    const handleMouseUp = () => setDragState(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, item.id, style, x, y, width, height, onUpdate]);

  const handleMouseDown = (e, type) => {
    e.stopPropagation();
    onSelect(item.id);
    setDragState({
      type,
      startX: e.clientX,
      startY: e.clientY,
      initX: x,
      initY: y,
      initW: width || 20, // default resize width
      initH: height || 10
    });
  };

  if (isEditing && isText) {
    return (
      <input
        autoFocus
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          onUpdate(item.id, { content });
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setIsEditing(false);
            onUpdate(item.id, { content });
          }
        }}
        className="absolute z-50 focus:outline-none bg-black/50 text-white rounded p-1"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: width ? `${width}%` : 'auto',
          height: height ? `${height}%` : 'auto',
          fontSize: style.fontSize ?? '32px',
          fontWeight: style.fontWeight ?? 'bold',
          color: style.color ?? '#ffffff',
          backgroundColor: style.backgroundColor ?? 'transparent',
          borderRadius: style.borderRadius ?? '0px',
          padding: style.padding ?? '4px',
          border: '1px solid #60A5FA'
        }}
      />
    );
  }

  // Prevent drag action from bubbling if we're clicking the internal toolbar
  const handleToolbarClick = (e, updater) => {
    e.stopPropagation();
    updater();
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: width ? `${width}%` : (isText ? 'auto' : '100%'),
        height: height ? `${height}%` : (isText ? 'auto' : '100%'),
        zIndex: isSelected ? 40 : (item.trackIndex || 10),
        cursor: dragState?.type === 'move' ? 'grabbing' : 'grab',
        
        // Text specific styles applied to wrapper so shape background works
        ...(isText && {
          color: style.color ?? '#ffffff',
          fontSize: style.fontSize ?? '32px',
          fontWeight: style.fontWeight ?? 'bold',
          textShadow: style.textShadow ?? '2px 2px 4px rgba(0,0,0,0.8)',
          backgroundColor: style.backgroundColor ?? 'transparent',
          borderRadius: style.borderRadius ?? '0px',
          padding: style.padding ?? '4px',
        })
      }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (isText) setIsEditing(true);
      }}
      className={`group select-none relative ${isSelected ? 'ring-2 ring-blue-500 border border-dashed border-blue-400' : ''}`}
    >
      {isText && item.content}
      
      {isVideo && (
        <video
          ref={videoRef}
          src={item.url}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover pointer-events-none"
        />
      )}
      
      {isImage && (
        <img
          src={item.url}
          alt={item.title}
          className="w-full h-full object-cover pointer-events-none"
        />
      )}

      {/* Resize Handle */}
      {isSelected && (
        <div
          className="absolute -right-2 -bottom-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize z-50 border-2 border-white shadow-sm"
          onMouseDown={(e) => handleMouseDown(e, 'resize')}
        />
      )}
      
      {/* Quick Toolbar for Text when selected */}
      {isSelected && isText && (
        <div className="absolute -top-10 left-0 bg-slate-800 rounded flex gap-1 p-1 shadow-lg pointer-events-auto z-50">
          <button onClick={(e) => handleToolbarClick(e, () => onUpdate(item.id, { style: { ...style, backgroundColor: 'transparent' }}))} className="w-6 h-6 rounded border border-slate-600 bg-transparent" title="No Background" />
          <button onClick={(e) => handleToolbarClick(e, () => onUpdate(item.id, { style: { ...style, backgroundColor: '#000000cc', borderRadius: '8px', padding: '12px' }}))} className="w-6 h-6 rounded bg-black" title="Black Shape" />
          <button onClick={(e) => handleToolbarClick(e, () => onUpdate(item.id, { style: { ...style, backgroundColor: '#ef4444cc', borderRadius: '8px', padding: '12px' }}))} className="w-6 h-6 rounded bg-red-500" title="Red Shape" />
          <button onClick={(e) => handleToolbarClick(e, () => onUpdate(item.id, { style: { ...style, backgroundColor: '#3b82f6cc', borderRadius: '8px', padding: '12px' }}))} className="w-6 h-6 rounded bg-blue-500" title="Blue Shape" />
          <button onClick={(e) => handleToolbarClick(e, () => onUpdate(item.id, { style: { ...style, backgroundColor: '#eab308cc', borderRadius: '8px', padding: '12px' }}))} className="w-6 h-6 rounded bg-yellow-500" title="Yellow Shape" />
        </div>
      )}
    </div>
  );
}
