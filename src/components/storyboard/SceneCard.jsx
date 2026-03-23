import React from 'react';
import { ChevronDown, ChevronRight, Upload, Video, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SceneModelSelector, { SCENE_MODELS } from './SceneModelSelector';

// ── Pill Constants ──

const ENVIRONMENTS = ['Street/Road', 'Sidewalk/Path', 'Park/Garden', 'Forest/Woods', 'Beach', 'Indoor', 'Playground', 'School', 'Shop/Store', 'Backyard'];
const ACTION_TYPES = ['Walking', 'Running', 'Riding', 'Standing', 'Sitting', 'Jumping', 'Looking', 'Turning', 'Stopping', 'Interacting'];
const EXPRESSIONS = ['Happy/Smiling', 'Focused/Determined', 'Surprised', 'Worried/Concerned', 'Excited', 'Calm/Peaceful', 'Curious', 'Cautious'];
const LIGHTING_OPTIONS = ['Golden Hour', 'Bright Midday', 'Soft Morning', 'Blue Hour/Dusk', 'Overcast', 'Night/Moonlit', 'Sunset Glow'];
const CAMERA_MOVEMENTS = ['Static', 'Pan Left', 'Pan Right', 'Tracking Follow', 'Dolly In', 'Dolly Out', 'Orbit', 'Crane Up', 'Crane Down'];
const CAMERA_ANGLES = ['wide', 'medium', 'close-up', 'extreme close-up', 'bird-eye', 'low-angle', 'over-shoulder', 'tracking', 'dutch angle', 'POV'];
const RESOLUTIONS = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '4k', label: '4K' },
];

// ── PillSelector sub-component ──

function PillSelector({ options, value, onChange, label }) {
  return (
    <div>
      {label && (
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              value === opt
                ? 'bg-[#2C666E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main SceneCard ──

export default function SceneCard({
  scene,
  storyBeat,
  onChange,
  isFirst,
  expanded,
  onToggleExpand,
  onUploadStartImage,
  onImportFromLibrary,
  onUploadVideoSource,
  onUploadEndImage,
}) {
  const modelInfo = SCENE_MODELS.find(m => m.id === scene.model);
  const mode = modelInfo?.mode || 'image-to-video';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#2C666E] text-white text-xs font-bold shrink-0">
          {scene.sceneNumber || 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {storyBeat?.summary || scene.action || 'Untitled scene'}
          </p>
          {modelInfo && (
            <p className="text-xs text-gray-400">{modelInfo.label}</p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          {/* Story beat context */}
          {storyBeat && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Story Beat</p>
              <p className="text-sm text-blue-900">{storyBeat.summary}</p>
              {storyBeat.setting && (
                <p className="text-xs text-blue-600">Setting: {storyBeat.setting}</p>
              )}
              {storyBeat.emotion && (
                <p className="text-xs text-blue-600">Emotion: {storyBeat.emotion}</p>
              )}
            </div>
          )}

          {/* Model selector */}
          <SceneModelSelector
            value={scene.model || ''}
            onChange={val => onChange('model', val)}
            sceneNumber={scene.sceneNumber || 1}
          />

          {/* Resolution — only for veo3* models */}
          {modelInfo?.supportsResolution && (
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">
                Resolution
              </label>
              <select
                value={scene.resolution || '1080p'}
                onChange={e => onChange('resolution', e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E]"
              >
                {RESOLUTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Audio toggle — only for models with supportsAudio */}
          {modelInfo?.supportsAudio && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!scene.generateAudio}
                onChange={e => onChange('generateAudio', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#2C666E] focus:ring-[#2C666E]"
              />
              <span className="text-sm text-gray-700">Generate native audio</span>
            </label>
          )}

          {/* Starting Image — scene 1 only, not for v2v mode */}
          {isFirst && mode !== 'video-to-video' && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block">
                Starting Image (Scene 1)
              </label>
              {scene.startImageUrl ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={scene.startImageUrl} alt="Start" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onChange('startImageUrl', null)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                  >
                    x
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onUploadStartImage}>
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </Button>
                  <Button variant="outline" size="sm" onClick={onImportFromLibrary}>
                    <ImageIcon className="w-3.5 h-3.5" /> Library
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Video source — v2v mode only */}
          {mode === 'video-to-video' && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block">
                Video Source
              </label>
              {scene.videoSourceUrl ? (
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-[#2C666E]" />
                  <span className="text-sm text-gray-600 truncate flex-1">{scene.videoSourceUrl}</span>
                  <button
                    type="button"
                    onClick={() => onChange('videoSourceUrl', null)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={onUploadVideoSource}>
                  <Video className="w-3.5 h-3.5" /> Upload Video
                </Button>
              )}
            </div>
          )}

          {/* End frame — first-last-frame mode only */}
          {mode === 'first-last-frame' && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block">
                End Frame
              </label>
              {scene.endImageUrl ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={scene.endImageUrl} alt="End" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onChange('endImageUrl', null)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs"
                  >
                    x
                  </button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={onUploadEndImage}>
                  <Upload className="w-3.5 h-3.5" /> Upload End Frame
                </Button>
              )}
            </div>
          )}

          {/* What Happens */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">
              What Happens
            </label>
            <textarea
              value={scene.action || ''}
              onChange={e => onChange('action', e.target.value)}
              placeholder="Describe the action in this scene..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E] resize-none"
            />
          </div>

          {/* Environment */}
          <PillSelector
            label="Environment"
            options={ENVIRONMENTS}
            value={scene.environment || ''}
            onChange={val => onChange('environment', val)}
          />

          {/* Environment Detail */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">
              Environment Detail
            </label>
            <input
              type="text"
              value={scene.environmentDetail || ''}
              onChange={e => onChange('environmentDetail', e.target.value)}
              placeholder="e.g. cobblestone street with market stalls"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E]"
            />
          </div>

          {/* Character Action */}
          <PillSelector
            label="Character Action"
            options={ACTION_TYPES}
            value={scene.actionType || ''}
            onChange={val => onChange('actionType', val)}
          />

          {/* Expression */}
          <PillSelector
            label="Expression"
            options={EXPRESSIONS}
            value={scene.expression || ''}
            onChange={val => onChange('expression', val)}
          />

          {/* Lighting */}
          <PillSelector
            label="Lighting"
            options={LIGHTING_OPTIONS}
            value={scene.lighting || ''}
            onChange={val => onChange('lighting', val)}
          />

          {/* Camera Angle */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">
              Camera Angle
            </label>
            <select
              value={scene.cameraAngle || ''}
              onChange={e => onChange('cameraAngle', e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E]"
            >
              <option value="">Select angle...</option>
              {CAMERA_ANGLES.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Camera Movement */}
          <PillSelector
            label="Camera Movement"
            options={CAMERA_MOVEMENTS}
            value={scene.cameraMovement || ''}
            onChange={val => onChange('cameraMovement', val)}
          />
        </div>
      )}
    </div>
  );
}
