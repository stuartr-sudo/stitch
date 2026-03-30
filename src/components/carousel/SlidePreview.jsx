import React from 'react';
import { ImageIcon } from 'lucide-react';

const ASPECT_CLASSES = {
  '1080x1080': 'aspect-square',
  '1080x1350': 'aspect-[4/5]',
  '1080x1920': 'aspect-[9/16]',
};

const SLIDE_TYPE_COLORS = {
  hook: 'from-indigo-900 to-indigo-700',
  content: 'from-gray-800 to-gray-600',
  stat: 'from-emerald-900 to-emerald-700',
  quote: 'from-purple-900 to-purple-700',
  cta: 'from-orange-900 to-orange-700',
  image_focus: 'from-slate-800 to-slate-600',
};

export default function SlidePreview({ slide, aspectRatio = '1080x1080', size = 'large' }) {
  const aspectClass = ASPECT_CLASSES[aspectRatio] || 'aspect-square';

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

  // Wireframe preview (no image generated yet)
  const gradientClass = SLIDE_TYPE_COLORS[slide.slide_type] || SLIDE_TYPE_COLORS.content;
  const isThumb = size === 'thumb';
  const headSize = isThumb ? 'text-[8px]' : 'text-lg';
  const bodySize = isThumb ? 'text-[6px]' : 'text-sm';
  const labelSize = isThumb ? 'text-[5px]' : 'text-[10px]';

  return (
    <div className={`${aspectClass} w-full rounded-lg overflow-hidden bg-gradient-to-br ${gradientClass} relative flex flex-col items-center justify-center p-3 text-white`}>
      {/* Slide type label */}
      <span className={`absolute top-1.5 right-1.5 ${labelSize} uppercase tracking-wider opacity-50`}>
        {slide.slide_type}
      </span>

      {slide.slide_type === 'hook' && (
        <p className={`${headSize} font-bold text-center leading-tight`}>{slide.headline || 'Hook'}</p>
      )}

      {slide.slide_type === 'content' && (
        <div className="text-center space-y-1">
          <p className={`${headSize} font-bold leading-tight`}>{slide.headline || 'Headline'}</p>
          <p className={`${bodySize} opacity-70 leading-snug`}>{slide.body_text || 'Body text'}</p>
        </div>
      )}

      {slide.slide_type === 'stat' && (
        <div className="text-center space-y-1">
          <p className={`${isThumb ? 'text-lg' : 'text-4xl'} font-bold`}>{slide.stat_value || '0%'}</p>
          <p className={`${bodySize} opacity-70`}>{slide.stat_label || 'Stat label'}</p>
        </div>
      )}

      {slide.slide_type === 'quote' && (
        <div className="text-center">
          <span className={`${isThumb ? 'text-sm' : 'text-3xl'} opacity-50`}>"</span>
          <p className={`${headSize} font-medium italic leading-tight`}>{slide.headline || 'Quote text'}</p>
        </div>
      )}

      {slide.slide_type === 'cta' && (
        <div className="text-center space-y-2">
          <p className={`${headSize} font-bold leading-tight`}>{slide.cta_text || slide.headline || 'Call to Action'}</p>
        </div>
      )}

      {slide.slide_type === 'image_focus' && (
        <div className="text-center space-y-2">
          <ImageIcon className={`mx-auto opacity-40 ${isThumb ? 'w-4 h-4' : 'w-10 h-10'}`} />
          {slide.headline && <p className={`${bodySize} opacity-70`}>{slide.headline}</p>}
        </div>
      )}
    </div>
  );
}
