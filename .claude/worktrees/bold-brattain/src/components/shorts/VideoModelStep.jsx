import React from 'react';
import { useShortsWizard } from '@/contexts/ShortsWizardContext';
import { VIDEO_MODELS } from '@/lib/modelPresets';
import { cn } from '@/lib/utils';
import { Film } from 'lucide-react';

export default function VideoModelStep() {
  const { videoModel, updateField } = useShortsWizard();

  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Video Model</h2>
      <p className="text-sm text-slate-500 mb-6">Choose the AI model for generating video clips.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {VIDEO_MODELS.map((model) => (
          <button
            key={model.value}
            type="button"
            onClick={() => updateField('videoModel', model.value)}
            className={cn(
              'flex flex-col p-4 rounded-xl border-2 transition-all text-left',
              'hover:border-[#2C666E]/50 hover:bg-[#2C666E]/5',
              videoModel === model.value
                ? 'border-[#2C666E] bg-[#2C666E]/10 shadow-sm'
                : 'border-slate-200 bg-white',
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Film className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{model.label}</span>
            </div>
            <span className="text-xs text-slate-500 mb-1">{model.strength}</span>
            <span className="text-xs font-mono text-[#2C666E]">{model.price}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
