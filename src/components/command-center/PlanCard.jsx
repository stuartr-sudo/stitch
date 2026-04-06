import React from 'react';
import { Film, FileText, LayoutGrid, Megaphone, BookOpen, Sparkles } from 'lucide-react';

const TYPE_ICONS = {
  short: Film,
  linkedin_post: FileText,
  carousel: LayoutGrid,
  ad_set: Megaphone,
  storyboard: BookOpen,
  custom: Sparkles
};

const TYPE_LABELS = {
  short: 'Short Video',
  linkedin_post: 'LinkedIn Post',
  carousel: 'Carousel',
  ad_set: 'Ad Set',
  storyboard: 'Storyboard',
  custom: 'Custom'
};

export function PlanCard({ plan, onBuild, onRefine }) {
  if (!plan?.items?.length) return null;

  return (
    <div className="bg-purple-950/30 border border-purple-800/40 rounded-lg p-3 my-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-purple-300 font-semibold text-xs">{plan.name || 'Campaign Plan'}</span>
        <span className="text-slate-500 text-[10px]">{plan.items.length} pieces</span>
      </div>

      {plan.description && (
        <p className="text-slate-400 text-[11px] mb-2">{plan.description}</p>
      )}

      <div className="space-y-1.5">
        {plan.items.map((item, i) => {
          const Icon = TYPE_ICONS[item.type] || Sparkles;
          return (
            <div key={i} className="flex items-start gap-2 text-[11px]">
              <Icon className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-200 font-medium">
                  {TYPE_LABELS[item.type] || item.type}
                </span>
                {item.platform && (
                  <span className="text-slate-500 ml-1">
                    ({Array.isArray(item.platform) ? item.platform.join(', ') : item.platform})
                  </span>
                )}
                {item.topic && (
                  <span className="text-slate-400 block">{item.topic}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(onBuild || onRefine) && (
        <div className="flex gap-2 mt-3">
          {onBuild && (
            <button
              onClick={onBuild}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white text-[11px] font-medium py-1.5 rounded-md transition-colors"
            >
              Build it
            </button>
          )}
          {onRefine && (
            <button
              onClick={onRefine}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 text-[11px] font-medium py-1.5 px-3 rounded-md transition-colors"
            >
              Refine
            </button>
          )}
        </div>
      )}
    </div>
  );
}
