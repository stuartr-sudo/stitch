import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { Loader2, Palette, X } from "lucide-react";

/**
 * BrandStyleGuideSelector — lets user pick a brand kit to inject visual style
 * context into the cohesive prompt. Shows brand name + visual style summary.
 *
 * Props:
 *   value     — selected brand kit object (or null)
 *   onChange  — called with full brand kit object (or null to clear)
 */
export default function BrandStyleGuideSelector({ value, onChange }) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch('/api/brand/kit')
      .then(r => r.json())
      .then(data => { if (!cancelled) setBrands(data.brands || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const hasStyleData = (b) =>
    b.visual_style_notes || b.mood_atmosphere || b.lighting_prefs ||
    b.composition_style || b.ai_prompt_rules || b.preferred_elements || b.prohibited_elements;

  const brandsWithStyle = brands.filter(hasStyleData);

  if (loading) {
    return (
      <div>
        <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Brand Style Guide (optional)</Label>
        <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading brands...
        </div>
      </div>
    );
  }

  if (brands.length === 0) return null;

  return (
    <div>
      <Label className="text-xs font-semibold text-slate-600 mb-1.5 block">Brand Style Guide (optional)</Label>
      {value ? (
        <div className="p-2.5 rounded-lg border border-[#2C666E]/30 bg-[#2C666E]/5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#2C666E]" />
              <span className="text-xs font-semibold text-[#2C666E]">{value.brand_name}</span>
            </div>
            <button onClick={() => onChange(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {value.visual_style_notes && <p className="text-[10px] text-slate-500 truncate">Style: {value.visual_style_notes}</p>}
            {value.mood_atmosphere && <p className="text-[10px] text-slate-500 truncate">Mood: {value.mood_atmosphere}</p>}
            {value.lighting_prefs && <p className="text-[10px] text-slate-500 truncate">Lighting: {value.lighting_prefs}</p>}
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-colors text-xs text-slate-500"
          >
            {brandsWithStyle.length > 0
              ? `Select a brand style guide (${brandsWithStyle.length} available)...`
              : `Select a brand (${brands.length} available — add visual style in Brand Kit)...`}
          </button>
          {expanded && (
            <div className="mt-1.5 rounded-lg border border-slate-200 bg-white overflow-y-auto shadow-sm" style={{ maxHeight: '10rem' }}>
              {brands.map(b => (
                <button key={b.id} type="button"
                  onClick={() => { onChange(b); setExpanded(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {b.logo_url && <img src={b.logo_url} alt="" className="w-5 h-5 rounded object-cover" />}
                    <span className="text-xs font-medium text-slate-700">{b.brand_name || b.brand_username}</span>
                    {hasStyleData(b) && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#2C666E]/10 text-[#2C666E] font-medium">Style Guide</span>}
                  </div>
                  {b.visual_style_notes && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{b.visual_style_notes}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Extract the style guide fields from a brand kit object for API calls */
export function extractBrandStyleData(brand) {
  if (!brand) return undefined;
  return {
    brand_name: brand.brand_name,
    visual_style_notes: brand.visual_style_notes || undefined,
    mood_atmosphere: brand.mood_atmosphere || undefined,
    lighting_prefs: brand.lighting_prefs || undefined,
    composition_style: brand.composition_style || undefined,
    ai_prompt_rules: brand.ai_prompt_rules || undefined,
    preferred_elements: brand.preferred_elements || undefined,
    prohibited_elements: brand.prohibited_elements || undefined,
    colors: brand.colors || undefined,
  };
}
