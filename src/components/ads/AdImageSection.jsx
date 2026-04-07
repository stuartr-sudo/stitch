import React, { useState, useRef } from 'react';
import { RefreshCw, Loader2, ChevronDown, Palette, Eye, EyeOff, Sparkles, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import StyleGrid from '@/components/ui/StyleGrid';
import { STYLE_CATEGORIES } from '@/lib/stylePresets';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Shared ad image section with style picker, regeneration, and multi-image upload.
 * Used by LinkedIn, Meta, and Google editors.
 *
 * Props:
 *   imageUrls      — string[] — all image URLs for this variation
 *   imagePrompt    — string — current prompt text
 *   onPromptChange — (prompt: string) => void
 *   onRegenerate   — (stylePreset?: string) => void — AI regen
 *   onEnhancePrompt — (prompt: string) => Promise<string>
 *   onImagesChange — (newUrls: string[]) => void — called when user uploads/removes images
 *   regenerating   — boolean
 *   aspectClass    — string — Tailwind aspect ratio class
 */
export default function AdImageSection({
  imageUrls = [],
  imagePrompt,
  onPromptChange,
  onRegenerate,
  onEnhancePrompt,
  onImagesChange,
  regenerating,
  aspectClass = 'aspect-[1.91/1]',
}) {
  const [showStyles, setShowStyles] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('');
  const [enhancing, setEnhancing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const fileInputRef = useRef(null);

  // Clamp active index if images array shrinks
  const clampedIdx = Math.min(activeIdx, Math.max(0, imageUrls.length - 1));
  const activeUrl = imageUrls[clampedIdx] || null;

  const handleEnhance = async () => {
    if (!onEnhancePrompt || !imagePrompt?.trim()) return;
    setEnhancing(true);
    try {
      const enhanced = await onEnhancePrompt(imagePrompt);
      if (enhanced) onPromptChange?.(enhanced);
    } finally {
      setEnhancing(false);
    }
  };

  const handleRegenWithStyle = () => {
    let styleText = selectedStyle;
    for (const cat of STYLE_CATEGORIES) {
      const found = cat.styles.find(s => s.value === selectedStyle);
      if (found?.promptText) { styleText = `${found.label}: ${found.promptText}`; break; }
    }
    onRegenerate(styleText || undefined);
    setShowStyles(false);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('image', f));
      const res = await apiFetch('/api/ads/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.urls) {
        const newUrls = [...imageUrls, ...data.urls];
        onImagesChange?.(newUrls);
        setActiveIdx(newUrls.length - 1);
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (idx) => {
    const newUrls = imageUrls.filter((_, i) => i !== idx);
    onImagesChange?.(newUrls);
    setActiveIdx(Math.min(clampedIdx, Math.max(0, newUrls.length - 1)));
  };

  const handlePrev = () => setActiveIdx(i => Math.max(0, i - 1));
  const handleNext = () => setActiveIdx(i => Math.min(imageUrls.length - 1, i + 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">
          Ad Image{imageUrls.length > 1 ? ` (${clampedIdx + 1}/${imageUrls.length})` : ''}
        </label>
        <div className="flex items-center gap-2">
          {/* Upload button */}
          {onImagesChange && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 text-xs text-[#2C666E] hover:underline disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </>
          )}
          <button
            onClick={() => setShowStyles(!showStyles)}
            className="flex items-center gap-1 text-xs text-[#2C666E] hover:underline"
          >
            <Palette className="w-3 h-3" />
            {showStyles ? 'Hide styles' : 'Change style'}
          </button>
        </div>
      </div>

      {/* Image preview */}
      {activeUrl ? (
        <div className={`relative rounded-lg overflow-hidden border ${!showStyles ? '' : 'mb-3'}`}>
          <img
            src={activeUrl}
            alt="Ad creative"
            className={`w-full ${aspectClass} object-cover`}
          />
          {/* Navigation arrows for multiple images */}
          {imageUrls.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                disabled={clampedIdx === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 disabled:opacity-30 text-white rounded-full p-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={clampedIdx === imageUrls.length - 1}
                className="absolute right-8 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 disabled:opacity-30 text-white rounded-full p-1 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          {/* Remove this image */}
          {onImagesChange && imageUrls.length > 0 && (
            <button
              onClick={() => handleRemoveImage(clampedIdx)}
              className="absolute top-2 left-2 bg-black/50 hover:bg-red-600/80 text-white rounded-lg p-1 transition-colors"
              title="Remove this image"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Regen button */}
          <button
            onClick={() => onRegenerate(undefined)}
            disabled={regenerating}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-lg p-1.5 transition-colors"
            title="Regenerate with AI"
          >
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
      ) : (
        <div className={`w-full ${aspectClass} bg-gray-100 rounded-lg border flex items-center justify-center mb-3`}>
          <span className="text-gray-400 text-sm">No image yet</span>
        </div>
      )}

      {/* Thumbnail strip — only shown when 2+ images */}
      {imageUrls.length > 1 && (
        <div className="flex gap-1.5 mt-1.5 overflow-x-auto pb-1">
          {imageUrls.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`relative flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden transition-colors ${
                idx === clampedIdx ? 'border-[#2C666E]' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
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
            <div className="mt-1">
              <textarea
                value={imagePrompt}
                onChange={e => onPromptChange?.(e.target.value)}
                rows={3}
                className="w-full text-xs text-gray-900 bg-gray-50 rounded p-2 leading-relaxed border focus:outline-none focus:ring-2 focus:ring-[#2C666E] resize-y"
              />
              {onEnhancePrompt && (
                <button
                  onClick={handleEnhance}
                  disabled={enhancing || !imagePrompt?.trim()}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Use AI to rewrite this prompt into a rich image generation prompt"
                >
                  {enhancing
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Sparkles className="w-3.5 h-3.5" />}
                  {enhancing ? 'Enhancing…' : 'Enhance with AI'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Style picker (collapsible) */}
      {showStyles && (
        <div className="border rounded-lg p-3 bg-gray-50 space-y-2 mt-2">
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
