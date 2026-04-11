import React from 'react';

const ASPECT_CLASSES = {
  '1080x1080': 'aspect-square',
  '1080x1350': 'aspect-[4/5]',
  '1080x1920': 'aspect-[9/16]',
};

export default function SlidePreview({ slide, aspectRatio = '1080x1080', size = 'large' }) {
  const aspectClass = ASPECT_CLASSES[aspectRatio] || 'aspect-square';

  // Video takes priority over image
  if (slide.video_url) {
    return (
      <div className={`${aspectClass} w-full rounded-lg overflow-hidden bg-black relative`}>
        <video
          src={slide.video_url}
          className="w-full h-full object-cover"
          controls={size === 'large'}
          muted
          loop
          autoPlay={size === 'large'}
          playsInline
        />
        {size === 'thumb' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-5 h-5 rounded-full bg-black/40 flex items-center justify-center">
              <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5" />
            </div>
          </div>
        )}
      </div>
    );
  }

  // If we have a composed image, show it
  if (slide.composed_image_url) {
    return (
      <div className={`${aspectClass} w-full rounded-lg overflow-hidden bg-gray-100`}>
        <img
          src={slide.composed_image_url}
          alt={`Slide ${slide.slide_number}`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Wireframe preview — consistent layout for all 3 types
  const isThumb = size === 'thumb';
  const headSize = isThumb ? 'text-[8px]' : 'text-lg';
  const bodySize = isThumb ? 'text-[6px]' : 'text-sm';
  const labelSize = isThumb ? 'text-[5px]' : 'text-[10px]';

  const typeLabel = slide.slide_type === 'hook' ? 'Hook'
    : slide.slide_type === 'conclusion' ? 'Conclusion'
    : 'Story';

  return (
    <div className={`${aspectClass} w-full rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-700 relative flex flex-col justify-end p-3 text-white`}>
      <span className={`absolute top-1.5 right-1.5 ${labelSize} uppercase tracking-wider opacity-40`}>
        {typeLabel}
      </span>
      <div className="space-y-1">
        <p className={`${headSize} font-bold leading-tight`}>{slide.headline || 'Headline'}</p>
        {slide.body_text && slide.slide_type !== 'hook' && (
          <p className={`${bodySize} opacity-70 leading-snug`}>{slide.body_text}</p>
        )}
      </div>
    </div>
  );
}
