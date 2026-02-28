/**
 * LoRAPicker — Shared multi-select LoRA picker component.
 *
 * Fetches both pre-built library LoRAs and user-trained custom LoRAs.
 * Used by ImagineerModal, TemplatesPage, and BrandKitModal.
 *
 * Props:
 *   value: [{ id, type, url, triggerWord, scale }]
 *   onChange: (newValue) => void
 *   brandUsername?: string — filter custom LoRAs by brand
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Package, Paintbrush } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORY_ICONS = {
  product: Package,
  style: Paintbrush,
  effect: Sparkles,
  realism: Sparkles,
  composition: Sparkles,
};

const CATEGORY_LABELS = {
  product: 'Product',
  style: 'Style',
  effect: 'Effect',
  realism: 'Realism',
  composition: 'Composition',
  custom: 'Your Trained LoRAs',
};

export default function LoRAPicker({ value = [], onChange, brandUsername }) {
  const { supabase, user } = useAuth();
  const [libraryLoras, setLibraryLoras] = useState([]);
  const [customLoras, setCustomLoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadLoras();
  }, [user, brandUsername]);

  async function loadLoras() {
    setLoading(true);
    try {
      // Fetch pre-built library
      const libRes = await apiFetch('/api/lora/library');
      const libData = await libRes.json();
      if (libData.success) setLibraryLoras(libData.loras || []);

      // Fetch user's custom trained LoRAs
      if (user) {
        const query = supabase
          .from('brand_loras')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'ready');

        if (brandUsername) query.eq('brand_username', brandUsername);
        const { data } = await query;
        setCustomLoras(data || []);
      }
    } catch (err) {
      console.error('[LoRAPicker] Failed to load:', err);
    }
    setLoading(false);
  }

  function isSelected(id, type) {
    return value.some(v => v.id === id && v.type === type);
  }

  function getScale(id, type) {
    return value.find(v => v.id === id && v.type === type)?.scale ?? 1.0;
  }

  function toggleLora(lora, type) {
    if (isSelected(lora.id, type)) {
      onChange(value.filter(v => !(v.id === lora.id && v.type === type)));
    } else {
      const entry = type === 'prebuilt'
        ? { id: lora.id, type: 'prebuilt', url: lora.hf_repo_id, triggerWord: lora.recommended_trigger_word || null, scale: lora.default_scale || 0.8 }
        : { id: lora.id, type: 'custom', url: lora.fal_model_url, triggerWord: lora.trigger_word || null, scale: 1.0 };
      onChange([...value, entry]);
    }
  }

  function updateScale(id, type, newScale) {
    onChange(value.map(v => v.id === id && v.type === type ? { ...v, scale: newScale } : v));
  }

  // Build categories for display
  const categories = {};

  if (customLoras.length > 0) {
    categories.custom = customLoras.map(l => ({ ...l, _type: 'custom' }));
  }

  for (const lora of libraryLoras) {
    const cat = lora.category || 'style';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ ...lora, _type: 'prebuilt' });
  }

  const categoryKeys = Object.keys(categories);
  const filteredKeys = filter === 'all' ? categoryKeys : categoryKeys.filter(k => k === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-xs text-gray-400 ml-2">Loading LoRAs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-2 py-1 text-xs rounded-full border ${filter === 'all' ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          All
        </button>
        {categoryKeys.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2 py-1 text-xs rounded-full border ${filter === cat ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* LoRA items */}
      {filteredKeys.map(cat => (
        <div key={cat}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            {CATEGORY_LABELS[cat] || cat}
          </p>
          <div className="space-y-1.5">
            {categories[cat].map(lora => {
              const type = lora._type;
              const selected = isSelected(lora.id, type);
              const Icon = CATEGORY_ICONS[cat] || Sparkles;

              return (
                <div
                  key={`${type}-${lora.id}`}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selected ? 'border-[#2C666E] bg-[#90DDF0]/10' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => toggleLora(lora, type)}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                    selected ? 'bg-[#2C666E] border-[#2C666E] text-white' : 'border-gray-300'
                  }`}>
                    {selected && <span className="text-xs">&#10003;</span>}
                  </div>

                  <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">
                      {lora.name}
                      {lora.is_featured && <span className="ml-1 text-[10px] text-amber-600">&#9733;</span>}
                    </p>
                    {lora.description && (
                      <p className="text-[10px] text-gray-400 truncate">{lora.description}</p>
                    )}
                  </div>

                  {/* Scale slider (only when selected) */}
                  {selected && (
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <input
                        type="range"
                        min="0.1"
                        max="1.5"
                        step="0.1"
                        value={getScale(lora.id, type)}
                        onChange={e => updateScale(lora.id, type, parseFloat(e.target.value))}
                        className="w-16 h-1 accent-[#2C666E]"
                      />
                      <span className="text-[10px] text-gray-500 w-6 text-right">
                        {getScale(lora.id, type).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {categoryKeys.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No LoRAs available. Train one in Brand Kit or wait for the library to load.</p>
      )}

      {value.length > 0 && (
        <p className="text-[10px] text-gray-400">
          {value.length} LoRA{value.length > 1 ? 's' : ''} selected. Images will use FLUX 2 Dev model.
        </p>
      )}
    </div>
  );
}
