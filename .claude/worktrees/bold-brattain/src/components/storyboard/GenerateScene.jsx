import React from 'react';
import { Loader2, Play, RotateCcw, RefreshCw, CheckCircle2, AlertCircle, Clock, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SCENE_MODELS } from './SceneModelSelector';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: Clock },
  generating: { label: 'Generating', color: 'bg-amber-50 text-amber-700', icon: Loader2 },
  done: { label: 'Done', color: 'bg-green-50 text-green-700', icon: CheckCircle2 },
  error: { label: 'Error', color: 'bg-red-50 text-red-700', icon: AlertCircle },
};

export default function GenerateScene({
  scene,
  onGenerate,
  onRetry,
  onRefineWithV2V,
  isGenerating,
  isPending,
}) {
  const status = scene.status || 'pending';
  const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="flex gap-4 p-4">
        {/* Left: preview image or video */}
        <div className="w-48 shrink-0">
          {status === 'done' && scene.videoUrl ? (
            <video
              src={scene.videoUrl}
              controls
              className="w-full rounded-lg border border-gray-200 aspect-video object-cover"
              preload="metadata"
            />
          ) : scene.previewImageUrl ? (
            <img
              src={scene.previewImageUrl}
              alt={`Scene ${scene.sceneNumber}`}
              className="w-full rounded-lg border border-gray-200 aspect-video object-cover"
            />
          ) : (
            <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-gray-200" />
            </div>
          )}
        </div>

        {/* Right: info + actions */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">
              {scene.sceneNumber || 1}
            </span>
            <span className="text-sm font-medium text-gray-800 truncate">
              {scene.narrativeNote || `Scene ${scene.sceneNumber || 1}`}
            </span>
            <span className="text-xs text-gray-400 ml-auto shrink-0">{scene.durationSeconds || 5}s</span>
          </div>

          {/* Setting & dialogue */}
          {scene.setting && <p className="text-xs text-gray-500 mb-1">{scene.setting}</p>}
          {scene.dialogue && <p className="text-xs text-gray-600 italic mb-2">"{scene.dialogue}"</p>}

          {/* Error message */}
          {status === 'error' && scene.error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">
              {scene.error}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-2">
            {status === 'pending' && (
              <Button
                onClick={onGenerate}
                disabled={isPending || isGenerating}
                size="sm"
                className="bg-[#2C666E] hover:bg-[#2C666E]/90 text-white"
              >
                {isPending ? (
                  <><Clock className="w-3.5 h-3.5" /> Queued</>
                ) : (
                  <><Play className="w-3.5 h-3.5" /> Generate Video</>
                )}
              </Button>
            )}

            {status === 'generating' && (
              <span className="flex items-center gap-2 text-sm text-amber-600">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </span>
            )}

            {status === 'done' && (
              <>
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 size={14} /> Done
                </span>
                <Button onClick={onRetry} size="sm" variant="outline">
                  <RotateCcw className="w-3.5 h-3.5" /> Retry
                </Button>
              </>
            )}

            {status === 'error' && (
              <Button
                onClick={onRetry}
                disabled={isGenerating}
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </Button>
            )}

            {status === 'done' && scene.videoUrl && onRefineWithV2V && (
              <Button
                onClick={() => onRefineWithV2V(scene.videoUrl)}
                size="sm"
                variant="outline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refine with V2V
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
