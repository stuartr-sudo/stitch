import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Film, X, FolderOpen, Volume2, VolumeX } from 'lucide-react';
import VideoTrimmer from '@/components/VideoTrimmer';
import LibraryModal from '@/components/modals/LibraryModal';

const MODELS = [
  { id: 'wan_motion', label: 'WAN 2.2 Motion Transfer', description: 'Budget — simple animations' },
  { id: 'kling_motion_control', label: 'Kling V3 Pro Motion Control', description: 'Premium — orientation, facial binding, audio' },
];

const ORIENTATIONS = [
  { id: 'image', label: 'Match Image', description: 'Character keeps reference image pose (max 10s)' },
  { id: 'video', label: 'Match Video', description: 'Character matches video orientation (max 30s)' },
];

export default function MotionReferenceInput({ motionRef, onChange, onClear }) {
  const [showLibrary, setShowLibrary] = useState(false);
  const ref = motionRef || {};
  const isKling = ref.model === 'kling_motion_control';
  const maxDuration = isKling ? (ref.characterOrientation === 'video' ? 30 : 10) : null;
  const effectiveDuration = ref.trimmedUrl
    ? (ref.endTime - ref.startTime)
    : null;

  const update = (patch) => onChange({ ...ref, ...patch });

  return (
    <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5" /> Motion Reference
        </Label>
        {ref.videoUrl && (
          <Button size="sm" variant="ghost" onClick={onClear} className="h-6 w-6 p-0">
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Video URL input */}
      <div className="flex gap-2">
        <Input
          placeholder="Paste video URL..."
          value={ref.videoUrl || ''}
          onChange={(e) => update({ videoUrl: e.target.value, trimmedUrl: null, startTime: null, endTime: null })}
          className="text-xs"
        />
        <Button size="sm" variant="outline" onClick={() => setShowLibrary(true)}>
          <FolderOpen className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Video Trimmer */}
      {ref.videoUrl && (
        <VideoTrimmer
          videoUrl={ref.videoUrl}
          onTrimmed={({ trimmedUrl, startTime, endTime, duration }) =>
            update({ trimmedUrl, startTime, endTime })
          }
        />
      )}

      {/* Model selector */}
      <div>
        <Label className="text-xs text-gray-500">Model</Label>
        <select
          value={ref.model || 'kling_motion_control'}
          onChange={(e) => update({ model: e.target.value })}
          className="w-full mt-1 text-xs border border-gray-200 rounded-md p-1.5 bg-white"
        >
          {MODELS.map(m => (
            <option key={m.id} value={m.id}>{m.label} — {m.description}</option>
          ))}
        </select>
      </div>

      {/* Kling-specific options */}
      {isKling && (
        <>
          {/* Character orientation */}
          <div>
            <Label className="text-xs text-gray-500">Character Orientation</Label>
            <div className="flex gap-2 mt-1">
              {ORIENTATIONS.map(o => (
                <button
                  key={o.id}
                  onClick={() => update({ characterOrientation: o.id })}
                  className={`flex-1 text-xs p-2 rounded-md border transition-colors ${
                    (ref.characterOrientation || 'image') === o.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">{o.label}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{o.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Keep original sound */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-500 flex items-center gap-1">
              {ref.keepOriginalSound !== false ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              Keep Original Sound
            </Label>
            <button
              onClick={() => update({ keepOriginalSound: !(ref.keepOriginalSound !== false) })}
              className={`w-8 h-4 rounded-full transition-colors ${
                ref.keepOriginalSound !== false ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${
                ref.keepOriginalSound !== false ? 'translate-x-4' : ''
              }`} />
            </button>
          </div>
        </>
      )}

      {/* Duration warning for Kling */}
      {isKling && maxDuration && effectiveDuration && effectiveDuration > maxDuration && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          Reference video is {effectiveDuration.toFixed(1)}s — Kling {ref.characterOrientation || 'image'} mode supports max {maxDuration}s. Please trim the video.
        </div>
      )}

      {/* Optional prompt */}
      <div>
        <Label className="text-xs text-gray-500">Prompt (optional)</Label>
        <Input
          placeholder="Describe the scene..."
          value={ref.prompt || ''}
          onChange={(e) => update({ prompt: e.target.value })}
          className="text-xs mt-1"
        />
      </div>

      {showLibrary && (
        <LibraryModal
          isOpen={showLibrary}
          onClose={() => setShowLibrary(false)}
          onSelect={(url) => {
            update({ videoUrl: url, trimmedUrl: null, startTime: null, endTime: null });
            setShowLibrary(false);
          }}
          mediaType="video"
        />
      )}
    </div>
  );
}
