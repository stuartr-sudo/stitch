import React from "react";
import { NEG_PROMPT_CATEGORIES } from "@/lib/creativePresets";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NegPromptPillSelector({
  selectedPills = [],
  onPillsChange,
  freetext = '',
  onFreetextChange,
  maxHeight = '8rem',
}) {
  const toggle = (val) => {
    if (selectedPills.includes(val)) onPillsChange(selectedPills.filter(v => v !== val));
    else onPillsChange([...selectedPills, val]);
  };

  return (
    <div>
      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Negative Prompt (optional)</Label>
      <div className="overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 space-y-2" style={{ maxHeight }}>
        {NEG_PROMPT_CATEGORIES.map(cat => (
          <div key={cat.label}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-0.5">{cat.label}</p>
            <div className="flex flex-wrap gap-1">
              {cat.prompts.map(np => (
                <button key={np.value} type="button"
                  onClick={() => toggle(np.value)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-full border transition-all ${
                    selectedPills.includes(np.value)
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-red-400 hover:text-red-500'
                  }`}>
                  {np.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {selectedPills.length > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-red-500 font-medium">{selectedPills.length} selected</span>
          <button onClick={() => onPillsChange([])} className="text-[10px] text-slate-400 hover:text-slate-600">Clear all</button>
        </div>
      )}
      <Textarea value={freetext} onChange={(e) => onFreetextChange(e.target.value)}
        placeholder="Additional things to avoid..."
        rows={1} className="bg-white text-sm mt-2" />
    </div>
  );
}
