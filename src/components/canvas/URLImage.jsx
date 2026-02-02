import React, { useEffect, useRef, useState } from 'react';
import { Group, Image as KonvaImage, Transformer } from 'react-konva';
import useImage from 'use-image';

/**
 * URLImage - Individual image with non-destructive masking
 * 
 * Features:
 * - Load image from URL or Data URL
 * - Transform handles (resize, rotate)
 * - Non-destructive masking (eraser/reveal)
 * - Apply masks without modifying original image
 */
const URLImage = ({ 
  image, 
  isSelected, 
  onSelect, 
  onChange,
  isDraggable = true
}) => {
  const lastSrcRef = useRef(image.src);
  const [stableSrc, setStableSrc] = useState(image.src);
  const shapeRef = useRef();
  const trRef = useRef();
  const isTransformingRef = useRef(false);
  
  // Only update stableSrc if the src actually changed and we're not transforming
  useEffect(() => {
    if (image.src !== lastSrcRef.current && !isTransformingRef.current) {
      lastSrcRef.current = image.src;
      setStableSrc(image.src);
    }
  }, [image.src]);
  
  const [img] = useImage(stableSrc, 'anonymous');
  const [maskedImage, setMaskedImage] = useState(null);

  // Apply transformer to selected image
  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Apply masks to create masked image
  useEffect(() => {
    if (!img) return;
    
    if (isTransformingRef.current) return;
    
    if (!image.masks || image.masks.length === 0) {
      setMaskedImage(img);
      return;
    }

    // Create offscreen canvas for masking
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Apply eraser masks
    const eraserMasks = image.masks.filter(m => m.tool === 'eraser');
    
    if (eraserMasks.length > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      
      eraserMasks.forEach((mask) => {
        ctx.lineWidth = mask.size;
        const style = mask.style || 'soft';
        ctx.lineCap = style === 'hard' ? 'square' : 'round';
        ctx.lineJoin = style === 'hard' ? 'miter' : 'round';
        const opacity = (mask.opacity || 80) / 100;
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;

        ctx.beginPath();
        for (let i = 0; i < mask.points.length - 1; i += 2) {
          const x = mask.points[i];
          const y = mask.points[i + 1];
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }

    requestAnimationFrame(() => {
      try {
        const dataUrl = canvas.toDataURL();
        const maskedImg = new window.Image();
        maskedImg.crossOrigin = 'anonymous';
        maskedImg.onload = () => {
          setMaskedImage(maskedImg);
        };
        maskedImg.src = dataUrl;
      } catch (err) {
        console.warn('[URLImage] Masking failed:', err);
        setMaskedImage(null);
      }
    });
  }, [img, image.masks]);

  const handleTransformStart = () => {
    isTransformingRef.current = true;
    if (image.src !== stableSrc && image.src !== lastSrcRef.current) {
      lastSrcRef.current = image.src;
      setStableSrc(image.src);
    }
  };

  const handleTransformEnd = (e) => {
    isTransformingRef.current = false;
    const node = shapeRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    onChange({
      ...image,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: scaleX,
      scaleY: scaleY,
    });
    
    if (image.src !== stableSrc) {
      lastSrcRef.current = image.src;
      setStableSrc(image.src);
    }
  };

  const handleDragEnd = (e) => {
    onChange({
      ...image,
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  return (
    <>
      <Group
        ref={shapeRef}
        x={image.x}
        y={image.y}
        rotation={image.rotation}
        scaleX={image.scaleX}
        scaleY={image.scaleY}
        draggable={isDraggable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
      >
        {img && (
          <KonvaImage
            image={maskedImage || img}
            width={img.width}
            height={img.height}
            listening={true}
          />
        )}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

export default URLImage;
