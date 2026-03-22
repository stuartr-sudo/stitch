import React from 'react';
import { useShortsWizard } from '@/contexts/ShortsWizardContext';
import { VISUAL_STYLES, VISUAL_STYLE_CATEGORIES } from '@/lib/visualStylePresets';
import { cn } from '@/lib/utils';

export default function LookFeelStep() {
  const { visualStyle, updateField } = useShortsWizard();

  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Visual Style</h2>
      <p className="text-sm text-slate-500 mb-6">Choose the look and feel for your generated images.</p>

      {VISUAL_STYLE_CATEGORIES.map((cat) => {
        const styles = VISUAL_STYLES.filter((s) => s.category === cat.key);
        if (styles.length === 0) return null;
        return (
          <div key={cat.key} className="mb-6">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">{cat.label}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {styles.map((style) => (
                <button
                  key={style.key}
                  type="button"
                  onClick={() => updateField('visualStyle', style.key)}
                  className={cn(
                    'flex flex-col rounded-xl border-2 overflow-hidden transition-all text-left',
                    'hover:border-[#2C666E]/50 hover:shadow-md',
                    visualStyle === style.key
                      ? 'border-[#2C666E] shadow-sm ring-2 ring-[#2C666E]/20'
                      : 'border-slate-200 bg-white',
                  )}
                >
                  <div className="aspect-video bg-slate-100 flex items-center justify-center">
                    {style.thumb ? (
                      <img
                        src={style.thumb}
                        alt={style.label}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : null}
                    <span className="text-2xl text-slate-300 absolute">🎨</span>
                  </div>
                  <div className="p-3">
                    <span className="text-sm font-medium text-slate-700 block">{style.label}</span>
                    <span className="text-xs text-slate-400 line-clamp-2">{style.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
