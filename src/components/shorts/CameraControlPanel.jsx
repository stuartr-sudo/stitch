import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Camera, Sliders } from 'lucide-react';
import {
  CAMERA_MOVEMENTS, CAMERA_SPEEDS, CAMERA_ANGLES, CAMERA_FRAMINGS,
  CAMERA_PRESETS, buildCameraPromptPreview,
} from '@/lib/cameraPresets';

/**
 * CameraControlPanel — per-scene camera direction controls.
 *
 * Two modes:
 *   1. Quick presets (default) — one-click camera setups
 *   2. Custom (expanded) — individual dropdowns for movement, speed, angle, framing
 *      + optional custom motion prompt textarea override
 *
 * @param {object} props
 * @param {object} props.value - Current camera config { movement, speed, angle, framing, customMotion, preset }
 * @param {function} props.onChange - Called with updated config
 * @param {boolean} [props.compact] - Compact mode for inline use
 */
export default function CameraControlPanel({ value, onChange, compact = false }) {
  const [expanded, setExpanded] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const config = value || {};
  const previewText = buildCameraPromptPreview(config);
  const activePreset = CAMERA_PRESETS.find(p => p.key === config.preset);

  const updateConfig = (patch) => {
    onChange({ ...config, preset: undefined, ...patch });
  };

  const selectPreset = (preset) => {
    onChange({ ...preset.config, preset: preset.key, customMotion: '' });
  };

  const clearCamera = () => {
    onChange(null);
  };

  if (compact && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
      >
        <Camera className="w-3 h-3" />
        {activePreset ? activePreset.label : config.movement ? 'Custom Camera' : 'Camera Control'}
        <ChevronDown className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] font-semibold text-slate-700">Camera Control</span>
          {activePreset && (
            <span className="text-[9px] font-bold bg-[#2C666E]/10 text-[#2C666E] px-1.5 py-0.5 rounded">
              {activePreset.label}
            </span>
          )}
          {!activePreset && config.movement && (
            <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Custom</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(config.movement || config.preset) && (
            <button
              onClick={(e) => { e.stopPropagation(); clearCamera(); }}
              className="text-[9px] text-red-400 hover:text-red-600 font-medium"
            >
              Clear
            </button>
          )}
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Quick Presets */}
          <div>
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quick Presets</div>
            <div className="grid grid-cols-4 gap-1.5">
              {CAMERA_PRESETS.map(preset => (
                <button
                  key={preset.key}
                  onClick={() => selectPreset(preset)}
                  className={`px-2 py-1.5 rounded-lg text-left transition-all ${
                    config.preset === preset.key
                      ? 'bg-[#2C666E] text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-[#2C666E]/30 hover:bg-[#2C666E]/5'
                  }`}
                >
                  <div className="text-[10px] font-semibold leading-tight">{preset.label}</div>
                  <div className={`text-[8px] leading-tight mt-0.5 ${config.preset === preset.key ? 'text-white/70' : 'text-slate-400'}`}>
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Controls Toggle */}
          <button
            onClick={() => setShowCustom(!showCustom)}
            className="flex items-center gap-1 text-[10px] font-medium text-[#2C666E] hover:text-[#1f4f55]"
          >
            <Sliders className="w-3 h-3" />
            {showCustom ? 'Hide Custom Controls' : 'Custom Controls'}
          </button>

          {showCustom && (
            <div className="space-y-2">
              {/* Movement */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Movement</label>
                  <select
                    value={config.movement || ''}
                    onChange={(e) => updateConfig({ movement: e.target.value || undefined })}
                    className="w-full mt-0.5 text-[11px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2C666E]"
                  >
                    <option value="">None</option>
                    {CAMERA_MOVEMENTS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Speed</label>
                  <select
                    value={config.speed || 'medium'}
                    onChange={(e) => updateConfig({ speed: e.target.value })}
                    className="w-full mt-0.5 text-[11px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2C666E]"
                  >
                    {CAMERA_SPEEDS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Angle + Framing */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Angle</label>
                  <select
                    value={config.angle || ''}
                    onChange={(e) => updateConfig({ angle: e.target.value || undefined })}
                    className="w-full mt-0.5 text-[11px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2C666E]"
                  >
                    <option value="">Default</option>
                    {CAMERA_ANGLES.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Framing</label>
                  <select
                    value={config.framing || ''}
                    onChange={(e) => updateConfig({ framing: e.target.value || undefined })}
                    className="w-full mt-0.5 text-[11px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2C666E]"
                  >
                    <option value="">Default</option>
                    {CAMERA_FRAMINGS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Motion Override */}
              <div>
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Custom Motion (overrides above)</label>
                <textarea
                  value={config.customMotion || ''}
                  onChange={(e) => onChange({ ...config, customMotion: e.target.value, preset: undefined })}
                  placeholder="e.g., Slow dolly in with a slight orbit, rack focus from foreground to subject..."
                  rows={2}
                  className="w-full mt-0.5 text-[11px] px-2 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#2C666E] resize-none"
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {previewText && (
            <div className="bg-white rounded-lg border border-slate-200 p-2">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Prompt Preview</div>
              <div className="text-[10px] text-slate-600 leading-relaxed">{previewText}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
