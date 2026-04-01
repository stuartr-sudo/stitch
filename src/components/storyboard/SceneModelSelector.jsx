import React from 'react';

export const SCENE_MODELS = [
  // Reference-to-Video
  { id: 'veo3', label: 'Veo 3.1 (Reference)', description: 'Google — best subject consistency via flat image refs', mode: 'reference-to-video', supportsRefs: true, supportsAudio: true, supportsResolution: true, fixedDuration: 8 },
  { id: 'kling-r2v-pro', label: 'Kling O3 Pro (R2V)', description: 'Best character consistency — @Element system', mode: 'reference-to-video', supportsRefs: true, supportsAudio: true },
  { id: 'kling-r2v-standard', label: 'Kling O3 Standard (R2V)', description: 'Faster, lower cost — @Element system', mode: 'reference-to-video', supportsRefs: true, supportsAudio: true },
  { id: 'grok-r2v', label: 'Grok Imagine R2V (xAI)', description: 'Up to 7 reference images — @Image1 syntax', mode: 'reference-to-video', supportsRefs: true },

  // Image-to-Video
  { id: 'veo3-fast', label: 'Veo 3.1 Fast', description: 'Google — flexible duration, audio', mode: 'image-to-video', supportsAudio: true, supportsResolution: true },
  { id: 'veo3-lite', label: 'Veo 3.1 Lite', description: 'Google — 60% cheaper, same quality', mode: 'image-to-video', supportsAudio: true, supportsResolution: true },
  { id: 'pixverse-v6', label: 'PixVerse V6', description: 'Audio, styles, multi-resolution', mode: 'image-to-video', supportsAudio: true },
  { id: 'seedance-pro', label: 'Seedance 1.5 Pro', description: 'High quality with audio support', mode: 'image-to-video', supportsAudio: true },
  { id: 'kling-video', label: 'Kling 2.5 Turbo Pro', description: 'Cinematic motion', mode: 'image-to-video' },
  { id: 'grok-imagine', label: 'Grok Imagine (xAI)', description: 'Good quality with audio', mode: 'image-to-video', supportsAudio: true },
  { id: 'wavespeed-wan', label: 'Wavespeed WAN 2.2', description: 'Fast generation', mode: 'image-to-video' },

  // First-Last Frame
  { id: 'veo3-first-last', label: 'Veo 3.1 First-Last Frame', description: 'Google — specify start and end frames', mode: 'first-last-frame', supportsAudio: true, supportsResolution: true },
  { id: 'veo3-lite-first-last', label: 'Veo 3.1 Lite First-Last', description: 'Google — 60% cheaper FLF', mode: 'first-last-frame', supportsResolution: true },

  // Video-to-Video
  { id: 'kling-o3-v2v-pro', label: 'Kling O3 Pro (V2V)', description: 'Refine existing video — pro quality', mode: 'video-to-video', supportsAudio: true },
  { id: 'kling-o3-v2v-standard', label: 'Kling O3 Standard (V2V)', description: 'Refine existing video — faster', mode: 'video-to-video', supportsAudio: true },
];

const MODE_LABELS = {
  'reference-to-video': 'Reference-to-Video',
  'image-to-video': 'Image-to-Video',
  'first-last-frame': 'First-Last Frame',
  'video-to-video': 'Video-to-Video',
};

const MODE_ORDER = ['reference-to-video', 'image-to-video', 'first-last-frame', 'video-to-video'];

export default function SceneModelSelector({ value, onChange, sceneNumber }) {
  const selected = SCENE_MODELS.find(m => m.id === value);
  const grouped = MODE_ORDER.reduce((acc, mode) => {
    const models = SCENE_MODELS.filter(m => m.mode === mode);
    if (models.length > 0) acc.push({ mode, label: MODE_LABELS[mode], models });
    return acc;
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-500 uppercase tracking-wide font-medium block">
        Scene {sceneNumber} Model
      </label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E]"
      >
        <option value="" disabled>Select a model...</option>
        {grouped.map(group => (
          <optgroup key={group.mode} label={group.label}>
            {group.models.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {selected && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">{selected.description}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {MODE_LABELS[selected.mode]}
            </span>
            {selected.supportsRefs && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                Refs
              </span>
            )}
            {selected.supportsAudio && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                Audio
              </span>
            )}
            {selected.supportsResolution && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                Resolution
              </span>
            )}
            {selected.fixedDuration && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                {selected.fixedDuration}s
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
