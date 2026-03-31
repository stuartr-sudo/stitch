import React, { useState } from 'react';
import { RefreshCw, Loader2, ChevronDown, Palette } from 'lucide-react';
import StyleGrid from '@/components/ui/StyleGrid';

/**
 * Shared ad image section with style picker for regeneration.
 * Used by LinkedIn, Meta, and Google editors.
 */
export default function AdImageSection({ imageUrl, onRegenerate, regenerating, aspectClass = 'aspect-[1.91/1]' }) {
  const [showStyles, setShowStyles] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('');

  const handleRegenWithStyle = () => {
    onRegenerate(selectedStyle || undefined);
    setShowStyles(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">Ad Image</label>
        <button
          onClick={() => setShowStyles(!showStyles)}
          className="flex items-center gap-1 text-xs text-[#2C666E] hover:underline"
        >
          <Palette className="w-3 h-3" />
          {showStyles ? 'Hide styles' : 'Change style'}
        </button>
      </div>

      {/* Image preview */}
      {imageUrl ? (
        <div className={`relative rounded-lg overflow-hidden border ${!showStyles ? '' : 'mb-3'}`}>
          <img
            src={imageUrl}
            alt="Ad creative"
            className={`w-full ${aspectClass} object-cover`}
          />
          <button
            onClick={() => onRegenerate(undefined)}
            disabled={regenerating}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-lg p-1.5 transition-colors"
            title="Regenerate with current style"
          >
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
      ) : (
        <div className={`w-full ${aspectClass} bg-gray-100 rounded-lg border flex items-center justify-center mb-3`}>
          <span className="text-gray-400 text-sm">No image yet</span>
        </div>
      )}

      {/* Style picker (collapsible) */}
      {showStyles && (
        <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
          <StyleGrid
            value={selectedStyle}
            onChange={setSelectedStyle}
            maxHeight="12rem"
            hideLabel
          />
          <button
            onClick={handleRegenWithStyle}
            disabled={regenerating || !selectedStyle}
            className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
              selectedStyle
                ? 'bg-[#2C666E] text-white hover:bg-[#1f4f55]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Regenerate with style
          </button>
        </div>
      )}
    </div>
  );
}
