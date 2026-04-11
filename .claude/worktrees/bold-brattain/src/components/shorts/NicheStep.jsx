import React from 'react';
import { useShortsWizard } from '@/contexts/ShortsWizardContext';
import { cn } from '@/lib/utils';

const NICHES = [
  { key: 'ai_tech_news', label: 'AI/Tech News', icon: '🤖', scenes: 8 },
  { key: 'finance_money', label: 'Finance & Crypto', icon: '💰', scenes: 7 },
  { key: 'motivation_self_help', label: 'Motivation', icon: '🧠', scenes: 7 },
  { key: 'scary_horror', label: 'Horror & Creepy', icon: '💀', scenes: 8 },
  { key: 'history_did_you_know', label: 'History & Mysteries', icon: '📜', scenes: 7 },
  { key: 'true_crime', label: 'True Crime', icon: '🔍', scenes: 8 },
  { key: 'science_nature', label: 'Science & Nature', icon: '🔬', scenes: 7 },
  { key: 'relationships_dating', label: 'Relationships', icon: '❤️', scenes: 7 },
  { key: 'health_fitness', label: 'Health & Fitness', icon: '💪', scenes: 7 },
  { key: 'gaming_popculture', label: 'Gaming & Pop Culture', icon: '🎮', scenes: 7 },
  { key: 'conspiracy_mystery', label: 'Conspiracy', icon: '👁️', scenes: 7 },
  { key: 'business_entrepreneur', label: 'Business & Startups', icon: '💼', scenes: 7 },
];

export default function NicheStep() {
  const { niche, updateField } = useShortsWizard();

  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Choose your niche</h2>
      <p className="text-sm text-slate-500 mb-6">Pick the content category for your short video.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {NICHES.map((n) => (
          <button
            key={n.key}
            type="button"
            onClick={() => updateField('niche', n.key)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
              'hover:border-[#2C666E]/50 hover:bg-[#2C666E]/5',
              niche === n.key
                ? 'border-[#2C666E] bg-[#2C666E]/10 shadow-sm'
                : 'border-slate-200 bg-white',
            )}
          >
            <span className="text-3xl">{n.icon}</span>
            <span className="text-sm font-medium text-slate-700">{n.label}</span>
            <span className="text-xs text-slate-400">{n.scenes} scenes</span>
          </button>
        ))}
      </div>
    </div>
  );
}
