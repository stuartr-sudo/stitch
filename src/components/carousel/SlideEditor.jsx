import React, { useState, useEffect } from 'react';
import { RefreshCw, Lock, Unlock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SLIDE_TYPES = [
  { value: 'hook', label: 'Hook' },
  { value: 'story', label: 'Story' },
  { value: 'conclusion', label: 'Conclusion' },
];

const STATUS_INFO = {
  pending: { label: 'Pending', color: 'text-gray-500' },
  generating: { label: 'Generating...', color: 'text-purple-600' },
  done: { label: 'Done', color: 'text-green-600' },
  failed: { label: 'Failed', color: 'text-red-600' },
};

export default function SlideEditor({ slide, onUpdate, onRegenerate, captionText, onUpdateCaption }) {
  const [headline, setHeadline] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [caption, setCaption] = useState('');
  const [regenerating, setRegendering] = useState(false);

  useEffect(() => {
    if (slide) {
      setHeadline(slide.headline || '');
      setBodyText(slide.body_text || '');
      setImagePrompt(slide.image_prompt || '');
    }
  }, [slide?.id]);

  useEffect(() => {
    setCaption(captionText || '');
  }, [captionText]);

  function handleBlur(field, value) {
    if (slide[field] !== value) {
      onUpdate({ [field]: value });
    }
  }

  function handleTypeChange(newType) {
    onUpdate({ slide_type: newType });
  }

  function handleLockToggle() {
    onUpdate({ locked: !slide.locked });
  }

  async function handleRegenerate() {
    setRegendering(true);
    try {
      await onRegenerate();
    } finally {
      setRegendering(false);
    }
  }

  function handleCaptionBlur() {
    if (caption !== captionText) {
      onUpdateCaption(caption);
    }
  }

  const status = STATUS_INFO[slide.generation_status] || STATUS_INFO.pending;

  return (
    <div className="p-4 space-y-4">
      {/* Slide info header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Slide {slide.slide_number}</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${status.color}`}>{status.label}</span>
          <button
            onClick={handleLockToggle}
            className="p-1 rounded hover:bg-gray-100"
            title={slide.locked ? 'Unlock slide' : 'Lock slide (prevent regeneration)'}
          >
            {slide.locked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Slide type selector */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
        <div className="flex gap-1">
          {SLIDE_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => handleTypeChange(t.value)}
              className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${
                slide.slide_type === t.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text fields — same for all types */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Headline</label>
          <Input
            value={headline}
            onChange={e => setHeadline(e.target.value)}
            onBlur={() => handleBlur('headline', headline)}
            placeholder="Main text"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Body Text</label>
          <textarea
            value={bodyText}
            onChange={e => setBodyText(e.target.value)}
            onBlur={() => handleBlur('body_text', bodyText)}
            placeholder={slide.slide_type === 'hook' ? 'Usually empty for hook slides' : 'Supporting detail'}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[80px]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Image Prompt</label>
          <textarea
            value={imagePrompt}
            onChange={e => setImagePrompt(e.target.value)}
            onBlur={() => handleBlur('image_prompt', imagePrompt)}
            placeholder="Background image description"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[60px]"
          />
        </div>
      </div>

      {/* Regenerate button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleRegenerate}
        disabled={regenerating || slide.locked || slide.generation_status === 'generating'}
      >
        {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
        Regenerate Image
      </Button>

      <hr className="border-gray-100" />

      {/* Post caption */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Post Caption</label>
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          onBlur={handleCaptionBlur}
          placeholder="Caption text for the social media post"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[100px]"
        />
      </div>
    </div>
  );
}
