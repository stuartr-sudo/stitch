import React from 'react';
import { useShortsWizard } from '@/contexts/ShortsWizardContext';
import { cn } from '@/lib/utils';

const MOTION_STYLES = [
  { key: 'subtle', label: 'Subtle', description: 'Gentle pans and slow zooms for a calm, professional feel' },
  { key: 'cinematic', label: 'Cinematic', description: 'Dramatic camera moves, slow-motion, sweeping shots' },
  { key: 'documentary', label: 'Documentary', description: 'Handheld feel, natural movement, realistic pacing' },
  { key: 'anime', label: 'Anime', description: 'Speed lines, dynamic angles, stylized motion' },
  { key: 'noir', label: 'Noir', description: 'Moody shadows, slow reveals, dramatic lighting shifts' },
  { key: 'dreamy', label: 'Dreamy', description: 'Soft focus transitions, floating camera, ethereal motion' },
  { key: 'dynamic', label: 'Dynamic', description: 'Fast cuts, zoom bursts, high-energy movement' },
  { key: 'static', label: 'Static', description: 'Minimal motion, fixed frame, focus on narration' },
];

export default function MotionStyleStep() {
  const { motionStyle, updateField } = useShortsWizard();

  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Motion Style</h2>
      <p className="text-sm text-slate-500 mb-6">How should the camera move and scenes transition?</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {MOTION_STYLES.map((style) => (
          <button
            key={style.key}
            type="button"
            onClick={() => updateField('motionStyle', style.key)}
            className={cn(
              'flex flex-col p-4 rounded-xl border-2 transition-all text-left',
              'hover:border-[#2C666E]/50 hover:bg-[#2C666E]/5',
              motionStyle === style.key
                ? 'border-[#2C666E] bg-[#2C666E]/10 shadow-sm'
                : 'border-slate-200 bg-white',
            )}
          >
            <span className="text-sm font-medium text-slate-700 mb-1">{style.label}</span>
            <span className="text-xs text-slate-400 line-clamp-2">{style.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
