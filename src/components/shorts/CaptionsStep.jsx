import React from 'react';
import { useShortsWizard } from '@/contexts/ShortsWizardContext';
import { CAPTION_STYLES } from '@/lib/captionStylePresets';
import { cn } from '@/lib/utils';

export default function CaptionsStep() {
  const { captionStyle, updateField } = useShortsWizard();

  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Caption Style</h2>
      <p className="text-sm text-slate-500 mb-6">Choose how text appears on screen during your short.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {CAPTION_STYLES.map((style) => (
          <button
            key={style.key}
            type="button"
            onClick={() => updateField('captionStyle', style.key)}
            className={cn(
              'flex flex-col rounded-xl border-2 overflow-hidden transition-all',
              'hover:border-[#2C666E]/50 hover:shadow-md',
              captionStyle === style.key
                ? 'border-[#2C666E] shadow-sm ring-2 ring-[#2C666E]/20'
                : 'border-slate-200 bg-white',
            )}
          >
            {/* Preview area */}
            <div className={cn('aspect-video flex items-center justify-center', style.preview?.bg || 'bg-slate-900')}>
              <span
                className={style.preview?.style || 'text-white font-bold text-lg'}
                style={style.preview?.textStroke ? { WebkitTextStroke: style.preview.textStroke } : undefined}
              >
                {style.preview?.text || style.label}
              </span>
            </div>
            <div className="p-3">
              <span className="text-sm font-medium text-slate-700 block">{style.label}</span>
              <span className="text-xs text-slate-400">{style.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
