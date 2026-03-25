import { useState } from 'react';
import { ChevronDown, ChevronRight, Edit2, Check, X, RotateCcw } from 'lucide-react';

export default function ReviewScene({
  scene,
  index,
  onChange,
  onRegenerate,
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (field) => {
    setEditingField(field);
    setEditValue(scene[field] || '');
  };

  const saveEdit = () => {
    if (editingField && editValue !== scene[editingField]) {
      onChange(index, { ...scene, [editingField]: editValue });
    }
    setEditingField(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const renderField = (label, field, multiline = true) => {
    const isEditing = editingField === field;
    const value = scene[field] || '';

    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</span>
          {!isEditing && (
            <button
              onClick={() => startEdit(field)}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              title={`Edit ${label}`}
            >
              <Edit2 size={12} />
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            {multiline ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 resize-y"
                rows={3}
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                autoFocus
              />
            )}
            <div className="flex gap-2">
              <button onClick={saveEdit} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded text-white">
                <Check size={12} /> Save
              </button>
              <button onClick={cancelEdit} className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300">
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-300 leading-relaxed">{value || <span className="italic text-zinc-500">Empty</span>}</p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors"
      >
        {expanded ? <ChevronDown size={16} className="text-zinc-400" /> : <ChevronRight size={16} className="text-zinc-400" />}
        <span className="flex items-center gap-2">
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-zinc-200">
            {scene.narrativeNote || `Scene ${index + 1}`}
          </span>
        </span>
        <span className="ml-auto text-xs text-zinc-500">{scene.durationSeconds}s</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800">
          <div className="pt-3">
            {renderField('Visual Prompt', 'visualPrompt', true)}
            {renderField('Motion & Camera', 'motionPrompt', true)}
            {renderField('Narrative Note', 'narrativeNote', false)}
            {renderField('Camera Angle', 'cameraAngle', false)}

            <div className="flex justify-end mt-2">
              <button
                onClick={() => onRegenerate?.(index)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-300 transition-colors"
              >
                <RotateCcw size={12} /> Regenerate this scene
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
