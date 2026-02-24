import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X, Loader2, RefreshCw, Image, Video, Layers, AlertTriangle,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

const REGEN_TYPES = [
  { id: 'image_and_video', label: 'Image + Video', icon: Layers, desc: 'Regenerate both image and video' },
  { id: 'image_only', label: 'Image Only', icon: Image, desc: 'New image, keep existing video' },
  { id: 'video_only', label: 'Video Only', icon: Video, desc: 'Re-animate the current image' },
];

export default function RegenerateSceneModal({
  draft,
  sceneIndex,
  ratio,
  scene,       // scene data from storyboard
  sceneAsset,  // { imageUrl, videoUrl } from assets
  onClose,
  onRegenerated,
}) {
  const [regenType, setRegenType] = useState('image_and_video');
  const [customVisualPrompt, setCustomVisualPrompt] = useState(scene?.visual_prompt || '');
  const [customMotionPrompt, setCustomMotionPrompt] = useState(scene?.motion_prompt || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalScenes = draft?.storyboard_json?.scenes?.length || 0;
  const cascadeCount = totalScenes - sceneIndex - 1;

  const handleRegenerate = async () => {
    setIsSubmitting(true);
    try {
      const body = {
        draft_id: draft.id,
        scene_index: sceneIndex,
        ratio,
        regeneration_type: regenType,
      };

      // Only send custom prompts if they differ from originals
      if (customVisualPrompt !== scene?.visual_prompt) {
        body.custom_visual_prompt = customVisualPrompt;
      }
      if (customMotionPrompt !== scene?.motion_prompt) {
        body.custom_motion_prompt = customMotionPrompt;
      }

      const res = await apiFetch('/api/campaigns/regenerate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Regeneration failed');

      toast.success(`Regenerating scene ${sceneIndex + 1}${cascadeCount > 0 ? ` + ${cascadeCount} cascading` : ''}`);
      onRegenerated?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to start regeneration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Regenerate Scene {sceneIndex + 1}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {scene?.role || 'Scene'} — {ratio}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Current scene preview */}
          <div className="flex gap-3">
            {sceneAsset?.imageUrl && (
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                <img src={sceneAsset.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{scene?.headline}</p>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{scene?.voiceover}</p>
              <p className="text-xs text-slate-400 mt-1">{scene?.duration_seconds}s</p>
            </div>
          </div>

          {/* Regeneration type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Regeneration Type</label>
            <div className="grid grid-cols-3 gap-2">
              {REGEN_TYPES.map(type => {
                const Icon = type.icon;
                const isActive = regenType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setRegenType(type.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition ${
                      isActive
                        ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom visual prompt */}
          {regenType !== 'video_only' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Visual Prompt</label>
              <textarea
                value={customVisualPrompt}
                onChange={e => setCustomVisualPrompt(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2C666E] focus:border-[#2C666E] resize-none"
                placeholder="Describe the scene visuals..."
              />
            </div>
          )}

          {/* Custom motion prompt */}
          {regenType !== 'image_only' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motion Prompt</label>
              <textarea
                value={customMotionPrompt}
                onChange={e => setCustomMotionPrompt(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2C666E] focus:border-[#2C666E] resize-none"
                placeholder="Describe camera movement..."
              />
            </div>
          )}

          {/* Cascade warning */}
          {regenType !== 'image_only' && cascadeCount > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <p className="font-medium">Frame continuity cascade</p>
                <p className="mt-0.5">
                  Scenes {sceneIndex + 2}–{totalScenes} will be re-generated to maintain
                  visual continuity from this scene's last frame.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isSubmitting}
            className="bg-[#2C666E] hover:bg-[#07393C] text-white"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
}
