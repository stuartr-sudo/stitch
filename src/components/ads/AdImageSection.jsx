import React, { useState } from 'react';
import { RefreshCw, Loader2, ChevronDown, Palette, Eye, EyeOff } from 'lucide-react';
import StyleGrid from '@/components/ui/StyleGrid';
import { STYLE_CATEGORIES } from '@/lib/stylePresets';

/**
 * Shared ad image section with style picker for regeneration.
 * Used by LinkedIn, Meta, and Google editors.
 */
export default function AdImageSection({ imageUrl, imagePrompt, onPromptChange, onRegenerate, regenerating, aspectClass = 'aspect-[1.91/1]' }) {
  const [showStyles, setShowStyles] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('');

  const handleRegenWithStyle = () => {
    // Look up the full promptText for the selected style so the backend GPT gets
    // detailed visual direction, not just an opaque key like 'iphone-selfie'
    let styleText = selectedStyle;
    for (const cat of STYLE_CATEGORIES) {
      const found = cat.styles.find(s => s.value === selectedStyle);
      if (found?.promptText) { styleText = `${found.label}: ${found.promptText}`; break; }
    }
    onRegenerate(styleText || undefined);
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

      {/* Image prompt (collapsible, editable) */}
      {imagePrompt && (
        <div className="mt-1">
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {showPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPrompt ? 'Hide image prompt' : 'View image prompt'}
          </button>
          {showPrompt && (
            <textarea
              value={imagePrompt}
              onChange={e => onPromptChange?.(e.target.value)}
              rows={3}
              className="mt-1 w-full text-xs text-gray-900 bg-gray-50 rounded p-2 leading-relaxed border focus:outline-none focus:ring-2 focus:ring-[#2C666E] resize-y"
            />
          )}
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
