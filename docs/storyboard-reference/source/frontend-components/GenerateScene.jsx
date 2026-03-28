import React from 'react';
import { Loader2, Play, RotateCcw, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
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
  const modelInfo = SCENE_MODELS.find(m => m.id === scene.model);
  const promptPreview = scene.visualPrompt || scene.action || '';
  const truncatedPrompt = promptPreview.length > 120
    ? promptPreview.slice(0, 120) + '...'
    : promptPreview;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="px-4 py-3 space-y-3">
        {/* Header row */}
        <div className="flex items-center gap-3">
          {/* Scene number badge */}
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">
            {scene.sceneNumber || 1}
          </span>

          {/* Model + status */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {modelInfo?.label || scene.model || 'Unknown model'}
            </p>
          </div>

          {/* Status badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
            <StatusIcon className={`w-3 h-3 ${status === 'generating' ? 'animate-spin' : ''}`} />
            {statusInfo.label}
          </span>
        </div>

        {/* Prompt preview */}
        {truncatedPrompt && (
          <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
            {truncatedPrompt}
          </p>
        )}

        {/* Video preview */}
        {scene.videoUrl && (
          <div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
            <video
              src={scene.videoUrl}
              controls
              className="w-full max-h-48 object-contain"
              preload="metadata"
            />
          </div>
        )}

        {/* Error message */}
        {status === 'error' && scene.error && (
          <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {scene.error}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {status === 'pending' && (
            <Button
              onClick={onGenerate}
              disabled={isPending || isGenerating}
              size="sm"
              className="bg-[#2C666E] hover:bg-[#2C666E]/90 text-white"
            >
              {isPending ? (
                <>
                  <Clock className="w-3.5 h-3.5" /> Queued
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Generate
                </>
              )}
            </Button>
          )}

          {status === 'generating' && (
            <Button disabled size="sm" variant="outline">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
            </Button>
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
  );
}
