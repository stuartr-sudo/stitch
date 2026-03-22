import React, { useState, useEffect, useRef } from 'react';
import { useShortsWizard } from '@/contexts/ShortsWizardContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ScriptStep() {
  const { niche, primaryTopic, videoLengthPreset, script, updateField } = useShortsWizard();
  const [loading, setLoading] = useState(false);
  const [scenesExpanded, setScenesExpanded] = useState(false);
  const hasTriedAutoGen = useRef(false);

  const generateScript = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/campaigns/preview-script', {
        method: 'POST',
        body: JSON.stringify({ niche, topic: primaryTopic, videoLengthPreset }),
      });
      const data = await res.json();
      updateField('script', data);
    } catch (err) {
      console.error('Failed to generate script:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on mount if no script
  useEffect(() => {
    if (!script && !hasTriedAutoGen.current && primaryTopic) {
      hasTriedAutoGen.current = true;
      generateScript();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateScriptField = (field, value) => {
    if (!script) return;
    updateField('script', { ...script, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#2C666E] mx-auto mb-4" />
          <p className="text-sm text-slate-500">Generating your script...</p>
        </div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-slate-500 text-sm mb-4">
            {primaryTopic
              ? 'Ready to generate a script for your short.'
              : 'Select a primary topic first, then come back to generate a script.'}
          </p>
          <Button
            onClick={generateScript}
            disabled={!primaryTopic}
            className="bg-[#2C666E] hover:bg-[#24555c] text-white"
          >
            Generate Script
          </Button>
        </div>
      </div>
    );
  }

  const scenes = script.scenes || [];
  const firstScene = scenes[0];

  return (
    <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Script</h2>
          <p className="text-sm text-slate-500">Review and edit your generated script.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generateScript}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Regenerate
        </Button>
      </div>

      {/* Title */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Title</label>
        <Input
          value={script.title || ''}
          onChange={(e) => updateScriptField('title', e.target.value)}
          className="text-base font-medium"
        />
      </div>

      {/* Scene 1 image description highlight */}
      {firstScene && (
        <div className="bg-[#2C666E]/5 border border-[#2C666E]/20 rounded-lg p-4">
          <label className="text-xs font-medium text-[#2C666E] uppercase tracking-wide mb-1 block">
            Scene 1 Image Description
          </label>
          <p className="text-sm text-slate-700">{firstScene.image_prompt || firstScene.imagePrompt || firstScene.description || '(none)'}</p>
        </div>
      )}

      {/* Narration */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1 block">Full Narration</label>
        <textarea
          value={script.narration || script.full_narration || ''}
          onChange={(e) => updateScriptField('narration', e.target.value)}
          rows={6}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]/50 resize-y"
        />
      </div>

      {/* Per-scene breakdown */}
      {scenes.length > 0 && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setScenesExpanded(!scenesExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <span>Scene Breakdown ({scenes.length} scenes)</span>
            {scenesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {scenesExpanded && (
            <div className="divide-y divide-slate-100">
              {scenes.map((scene, i) => (
                <div key={i} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-400">SCENE {i + 1}</span>
                    {scene.role && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">{scene.role}</span>
                    )}
                    {scene.duration_seconds && (
                      <span className="text-xs text-slate-400">{scene.duration_seconds}s</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-1">
                    <span className="font-medium text-slate-700">Narration:</span>{' '}
                    {scene.narration || scene.voiceover || '(none)'}
                  </p>
                  <p className="text-sm text-slate-500">
                    <span className="font-medium text-slate-600">Visual:</span>{' '}
                    {scene.image_prompt || scene.imagePrompt || scene.description || '(none)'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
