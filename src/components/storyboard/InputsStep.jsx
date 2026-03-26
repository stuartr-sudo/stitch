import { useState } from 'react';
import { Upload, ImageIcon, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import CharactersKling from './CharactersKling';
import CharactersVeo from './CharactersVeo';

const SCENE_PILLS = {
  environment: ['Urban', 'Nature', 'Indoor', 'Studio', 'Underwater', 'Space', 'Desert', 'Forest', 'Beach', 'Mountain', 'Cityscape', 'Rural'],
  action: ['Walking', 'Running', 'Biking', 'Push-Scooter', 'Dancing', 'Sitting', 'Standing', 'Flying', 'Swimming', 'Fighting', 'Talking', 'Working', 'Playing', 'Sleeping'],
  expression: ['Happy', 'Sad', 'Angry', 'Surprised', 'Thoughtful', 'Determined', 'Peaceful', 'Excited', 'Fearful', 'Confident'],
  lighting: ['Golden Hour', 'Blue Hour', 'Midday Sun', 'Overcast', 'Neon', 'Candlelight', 'Moonlight', 'Studio Light', 'Backlit', 'Dramatic Shadow'],
  camera: ['Slow Pan', 'Tracking Shot', 'Static', 'Dolly In', 'Dolly Out', 'Orbit', 'Crane Up', 'Crane Down', 'Handheld', 'Aerial'],
};

function PillSelector({ label, options, selected, onToggle }) {
  return (
    <div className="mb-3">
      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {options.map((pill) => (
          <button
            key={pill}
            onClick={() => onToggle(pill)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
              selected.includes(pill)
                ? 'bg-[#07393C] text-white border-[#07393C]'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
            }`}
          >
            {pill}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function InputsStep({
  // Starting image (5a)
  startFrameUrl,
  startFrameDescription,
  onUploadStartFrame,
  onLibraryStartFrame,
  onGenerateStartFrame,
  onRemoveStartFrame,
  isAnalyzingFrame,

  // Characters (5b)
  globalModel,
  needsCharacters,
  elements,
  onElementsChange,
  veoReferenceImages,
  onVeoRefsChange,
  onOpenImagineer,
  onOpenLibrary,

  // Scene direction (5c)
  sceneDirection,
  onSceneDirectionChange,
}) {
  const [expandedSection, setExpandedSection] = useState('startImage');

  const isKlingModel = globalModel?.startsWith('kling-r2v');
  const isVeoModel = globalModel?.startsWith('veo3') && !globalModel?.includes('fast');

  const togglePill = (category, pill) => {
    const current = sceneDirection[category] || [];
    const updated = current.includes(pill)
      ? current.filter(p => p !== pill)
      : [...current, pill];
    onSceneDirectionChange({ ...sceneDirection, [category]: updated });
  };

  const SectionHeader = ({ id, label, subtitle }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === id ? null : id)}
      className="w-full flex items-center gap-3 py-3 text-left"
    >
      {expandedSection === id
        ? <ChevronDown size={16} className="text-gray-400" />
        : <ChevronRight size={16} className="text-gray-400" />}
      <div>
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        {subtitle && <span className="ml-2 text-xs text-gray-400">{subtitle}</span>}
      </div>
    </button>
  );

  return (
    <div className="space-y-3">
      {/* 5a: Starting Image */}
      <div className="bg-white border border-gray-200 rounded-xl px-4">
        <SectionHeader id="startImage" label="Starting Image" subtitle="Sets the visual foundation for Scene 1" />
        {expandedSection === 'startImage' && (
          <div className="pb-4">
            {startFrameUrl ? (
              <div className="space-y-3">
                <img src={startFrameUrl} alt="Start frame" className="w-full max-w-md rounded-lg border border-gray-200" />
                {isAnalyzingFrame && (
                  <p className="text-xs text-[#2C666E] animate-pulse">Analyzing image...</p>
                )}
                {startFrameDescription && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">AI Analysis:</p>
                    <p className="text-sm text-gray-700">{startFrameDescription}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={onGenerateStartFrame}
                    className="text-xs text-[#2C666E] hover:text-[#1e4d54]"
                  >
                    Replace image
                  </button>
                  <button
                    onClick={onRemoveStartFrame}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={onUploadStartFrame} className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 transition-colors">
                  <Upload size={14} /> Upload
                </button>
                <button onClick={onLibraryStartFrame} className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 transition-colors">
                  <ImageIcon size={14} /> Library
                </button>
                <button onClick={onGenerateStartFrame} className="flex items-center gap-2 px-4 py-2.5 bg-[#2C666E] hover:bg-[#1e4d54] rounded-lg text-sm text-white transition-colors">
                  <Sparkles size={14} /> Generate
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5b: Characters (conditional) */}
      {needsCharacters && (
        <div className="bg-white border border-gray-200 rounded-xl px-4">
          <SectionHeader
            id="characters"
            label="Characters"
            subtitle={isKlingModel ? '@Element references' : 'Reference images'}
          />
          {expandedSection === 'characters' && (
            <div className="pb-4">
              {isKlingModel && (
                <CharactersKling
                  elements={elements}
                  onChange={onElementsChange}
                  onOpenImagineer={onOpenImagineer}
                  onOpenLibrary={onOpenLibrary}
                />
              )}
              {isVeoModel && (
                <CharactersVeo
                  referenceImages={veoReferenceImages}
                  onChange={onVeoRefsChange}
                  onOpenLibrary={onOpenLibrary}
                  onOpenImagineer={onOpenImagineer}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 5c: Scene Direction Pills */}
      <div className="bg-white border border-gray-200 rounded-xl px-4">
        <SectionHeader id="direction" label="Scene Direction" subtitle="Global creative direction for all scenes" />
        {expandedSection === 'direction' && (
          <div className="pb-4">
            <PillSelector label="Environment" options={SCENE_PILLS.environment} selected={sceneDirection.environment || []} onToggle={(p) => togglePill('environment', p)} />
            <PillSelector label="Character Action" options={SCENE_PILLS.action} selected={sceneDirection.action || []} onToggle={(p) => togglePill('action', p)} />
            <PillSelector label="Expression" options={SCENE_PILLS.expression} selected={sceneDirection.expression || []} onToggle={(p) => togglePill('expression', p)} />
            <PillSelector label="Lighting" options={SCENE_PILLS.lighting} selected={sceneDirection.lighting || []} onToggle={(p) => togglePill('lighting', p)} />
            <PillSelector label="Camera Movement" options={SCENE_PILLS.camera} selected={sceneDirection.camera || []} onToggle={(p) => togglePill('camera', p)} />
          </div>
        )}
      </div>
    </div>
  );
}
