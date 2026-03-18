import React from 'react';
import { Check } from 'lucide-react';
import { STYLE_CATEGORIES } from '@/lib/stylePresets';

/**
 * Reusable visual style thumbnail grid.
 *
 * Props:
 *   value     – currently selected style value
 *   onChange  – called with the new style value when a thumbnail is clicked
 *   maxHeight – CSS max-height for the scrollable container (default "16rem")
 *   categories – optional override for STYLE_CATEGORIES (defaults to shared preset)
 */
export default function StyleGrid({ value, onChange, maxHeight = '16rem', categories, columns }) {
  const cats = categories || STYLE_CATEGORIES;

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">Style</label>
      <div
        className="overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 space-y-3"
        style={{ maxHeight }}
      >
        {cats.map(cat => (
          <div key={cat.label}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-0.5">
              {cat.label}
            </p>
            <div className={`grid ${columns || 'grid-cols-4 sm:grid-cols-5'} gap-2`}>
              {cat.styles.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onChange(s.value)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                    value === s.value
                      ? 'border-[#2C666E] ring-1 ring-[#2C666E] scale-[1.02]'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={s.thumb}
                    alt={s.label}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div
                    className={`absolute inset-x-0 bottom-0 px-1 py-0.5 text-[9px] font-medium text-center leading-tight ${
                      value === s.value
                        ? 'bg-[#2C666E] text-white'
                        : 'bg-black/60 text-white'
                    }`}
                  >
                    {s.label}
                  </div>
                  {value === s.value && (
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-[#2C666E] rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
