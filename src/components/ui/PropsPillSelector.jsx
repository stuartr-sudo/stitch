import React from "react";
import { PROP_CATEGORIES } from "@/lib/creativePresets";
import { Label } from "@/components/ui/label";

export default function PropsPillSelector({ selected = [], onChange, maxHeight = '10rem' }) {
  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };

  return (
    <div>
      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Props & Accessories (optional)</Label>
      <div className="overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 space-y-2" style={{ maxHeight }}>
        {PROP_CATEGORIES.map(cat => (
          <div key={cat.label}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-0.5">{cat.label}</p>
            <div className="flex flex-wrap gap-1">
              {cat.props.map(prop => (
                <button key={prop.value} type="button"
                  onClick={() => toggle(prop.value)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-full border transition-all ${
                    selected.includes(prop.value)
                      ? 'bg-[#2C666E] text-white border-[#2C666E]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#2C666E] hover:text-[#2C666E]'
                  }`}>
                  {prop.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-[#2C666E] font-medium">{selected.length} selected</span>
          <button onClick={() => onChange([])} className="text-[10px] text-slate-400 hover:text-slate-600">Clear all</button>
        </div>
      )}
    </div>
  );
}
