import React, { useState, useRef } from 'react';
import { Plus, Trash2, Upload, Sparkles, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Kling R2V character UI with @Element system.
 * Up to 4 elements, each with description, reference images (max 3), and frontal toggle.
 */
export default function CharactersKling({
  elements = [],
  onChange,
  onOpenImagineer,
  onOpenLibrary,
}) {
  const [activeTab, setActiveTab] = useState(0);
  const fileInputRef = useRef(null);

  const activeElement = elements[activeTab];

  const updateElement = (index, updates) => {
    const updated = elements.map((el, i) => (i === index ? { ...el, ...updates } : el));
    onChange(updated);
  };

  const addElement = () => {
    if (elements.length >= 4) {
      toast.error('Maximum 4 elements allowed');
      return;
    }
    const newEl = {
      id: `el-${Date.now()}-${elements.length}`,
      label: `Element ${elements.length + 1}`,
      description: '',
      refs: [],
      frontalIndex: 0,
      analyzing: false,
    };
    onChange([...elements, newEl]);
    setActiveTab(elements.length);
  };

  const removeElement = (index) => {
    if (elements.length <= 1) return;
    const updated = elements.filter((_, i) => i !== index);
    onChange(updated);
    if (activeTab >= updated.length) {
      setActiveTab(Math.max(0, updated.length - 1));
    }
  };

  const describeCharacterFromImage = async (imageUrl, elementIndex) => {
    if (!imageUrl) return;
    updateElement(elementIndex, { analyzing: true });
    try {
      const res = await apiFetch('/api/imagineer/describe-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (data.success && data.description) {
        updateElement(elementIndex, { description: data.description, analyzing: false });
        toast.success(`@Element${elementIndex + 1} description generated`);
      } else {
        updateElement(elementIndex, { analyzing: false });
        toast.error(data.error || 'Could not describe character');
      }
    } catch (err) {
      updateElement(elementIndex, { analyzing: false });
      toast.error('Character analysis failed: ' + err.message);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeElement) return;

    const remaining = 3 - (activeElement.refs?.length || 0);
    const filesToProcess = files.slice(0, remaining);
    const isFirstRef = (activeElement.refs?.length || 0) === 0;

    for (const file of filesToProcess) {
      const reader = new FileReader();
      reader.onload = () => {
        const currentEl = elements[activeTab];
        const updatedRefs = [...(currentEl.refs || []), reader.result];
        updateElement(activeTab, { refs: updatedRefs });

        // Auto-describe on first ref if no description
        if (isFirstRef && !currentEl.description) {
          describeCharacterFromImage(reader.result, activeTab);
        }
      };
      reader.readAsDataURL(file);
    }

    if (filesToProcess.length < files.length) {
      toast.info(`Only ${filesToProcess.length} of ${files.length} images added (max 3 per element)`);
    }
    e.target.value = '';
  };

  const removeRef = (refIndex) => {
    if (!activeElement) return;
    const updatedRefs = activeElement.refs.filter((_, i) => i !== refIndex);
    const updates = { refs: updatedRefs };
    if (activeElement.frontalIndex >= updatedRefs.length) {
      updates.frontalIndex = Math.max(0, updatedRefs.length - 1);
    }
    updateElement(activeTab, updates);
  };

  const toggleFrontal = (refIndex) => {
    updateElement(activeTab, { frontalIndex: refIndex });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Character References (@Element System)
        </p>
        <p className="text-xs text-gray-400">Kling R2V — up to 4 elements</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1.5">
        {elements.map((el, i) => (
          <button
            key={el.id}
            type="button"
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === i
                ? 'bg-[#2C666E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            @Element{i + 1}
          </button>
        ))}
        {elements.length < 4 && (
          <button
            type="button"
            onClick={addElement}
            className="px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:bg-gray-100 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Active element content */}
      {activeElement && (
        <div className="space-y-3 bg-gray-50 rounded-xl p-4">
          {/* Header with remove */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#2C666E]">
              @Element{activeTab + 1}
            </span>
            {elements.length > 1 && (
              <button
                type="button"
                onClick={() => removeElement(activeTab)}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block font-medium">
              Description
            </label>
            <textarea
              value={activeElement.description || ''}
              onChange={e => updateElement(activeTab, { description: e.target.value })}
              placeholder="Describe this character/element..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 focus:border-[#2C666E] resize-none"
            />
          </div>

          {/* Auto-describe button */}
          {activeElement.refs?.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => describeCharacterFromImage(activeElement.refs[0], activeTab)}
              disabled={activeElement.analyzing}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {activeElement.analyzing ? 'Analyzing...' : 'Auto-describe from image'}
            </Button>
          )}

          {/* Reference images */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide mb-1.5 block font-medium">
              Reference Images ({activeElement.refs?.length || 0}/3)
            </label>
            <div className="flex flex-wrap gap-2">
              {(activeElement.refs || []).map((ref, i) => (
                <div key={i} className="relative group">
                  <img
                    src={ref}
                    alt={`Ref ${i + 1}`}
                    className={`w-20 h-20 rounded-lg object-cover border-2 ${
                      activeElement.frontalIndex === i
                        ? 'border-[#2C666E]'
                        : 'border-gray-200'
                    }`}
                  />
                  {/* Frontal toggle */}
                  <button
                    type="button"
                    onClick={() => toggleFrontal(i)}
                    className={`absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      activeElement.frontalIndex === i
                        ? 'bg-[#2C666E] text-white'
                        : 'bg-white/80 text-gray-600 hover:bg-white'
                    }`}
                  >
                    {activeElement.frontalIndex === i ? 'Frontal' : 'Set frontal'}
                  </button>
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeRef(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>

            {(activeElement.refs?.length || 0) < 3 && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenLibrary?.(activeTab)}
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Library
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenImagineer?.(activeTab)}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Generate
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
}
