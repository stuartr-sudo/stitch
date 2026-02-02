import React, { useRef, useEffect, forwardRef, useCallback } from 'react';
import { Stage, Layer } from 'react-konva';

/**
 * CanvasBoard - Infinite pannable/zoomable canvas using Konva.js
 * 
 * Features:
 * - Infinite canvas with pan/zoom
 * - Mouse wheel zoom
 * - Click-and-drag panning
 * - Keyboard shortcuts (F to frame content)
 */
const CanvasBoard = forwardRef(({ 
  width, 
  height, 
  children, 
  onStageClick,
  isPanning = false 
}, stageRef) => {
  const layerRef = useRef(null);

  // Frame all content (fit to view)
  const frameContent = useCallback(() => {
    if (!stageRef?.current || !layerRef.current) return;
    
    const stage = stageRef.current;
    const layer = layerRef.current;
    
    // Get bounding box of all children
    const clientRect = layer.getClientRect();
    
    if (clientRect.width === 0 || clientRect.height === 0) return;
    
    // Calculate scale to fit - minimal padding for tight fit
    const padding = 10;
    const scaleX = (width - padding * 2) / clientRect.width;
    const scaleY = (height - padding * 2) / clientRect.height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in past 100%
    
    // Center the content
    const x = (width / 2) - (clientRect.x + clientRect.width / 2) * scale;
    const y = (height / 2) - (clientRect.y + clientRect.height / 2) * scale;
    
    stage.scale({ x: scale, y: scale });
    stage.position({ x, y });
    stage.batchDraw();
  }, [stageRef, width, height]);

  // Attach frameContent to the stage ref so parent can call it
  useEffect(() => {
    if (stageRef?.current) {
      stageRef.current.frameContent = frameContent;
    }
  }, [stageRef, frameContent]);

  // Handle mouse wheel zoom
  const handleWheel = (e) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Zoom factor
    const scaleBy = 1.05;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    // Limit zoom
    const limitedScale = Math.max(0.1, Math.min(newScale, 5));

    stage.scale({ x: limitedScale, y: limitedScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * limitedScale,
      y: pointer.y - mousePointTo.y * limitedScale,
    };
    stage.position(newPos);
    stage.batchDraw();
  };

  // Handle stage click (deselect)
  const handleStageClick = (e) => {
    // Only deselect if clicking on the stage itself (not on any shape)
    if (e.target === e.target.getStage()) {
      if (onStageClick) onStageClick();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcuts when user is typing in an input field
      const target = e.target;
      const isInputElement = target.tagName === 'INPUT' || 
                            target.tagName === 'TEXTAREA' || 
                            target.isContentEditable ||
                            target.closest('input') ||
                            target.closest('textarea') ||
                            target.closest('[contenteditable="true"]');
      
      // Don't trigger shortcuts when typing
      if (isInputElement) return;
      
      // F = Frame content
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        frameContent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [frameContent]);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      draggable={isPanning}
      onWheel={handleWheel}
      onClick={handleStageClick}
      onTap={handleStageClick}
      style={{ 
        background: '#f3f4f6',
        cursor: isPanning ? 'grab' : 'default'
      }}
    >
      <Layer ref={layerRef}>
        {children}
      </Layer>
    </Stage>
  );
});

CanvasBoard.displayName = 'CanvasBoard';

export default CanvasBoard;
