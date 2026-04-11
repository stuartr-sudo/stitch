/**
 * StoryboardPreview — Visual storyboard document rendered in-app
 *
 * Displays scene preview images in a grid layout with narrative notes,
 * camera direction, timing, dialogue, and emotional arc. This is the
 * "creative gate" view — the user (or their client) reviews this before
 * approving video generation.
 *
 * Features:
 * - Scene grid with preview images (2 per row landscape, 1 per row portrait)
 * - Inline editing of narrative, camera, and dialogue fields
 * - Drag to reorder scenes
 * - "Generate Previews" button to create cheap preview images
 * - "Export PDF" button for client-facing document
 * - Visual emotional arc indicator across scenes
 * - Duration timeline bar
 */

import React, { useState } from 'react';
import {
  FileDown, Sparkles, Loader2, Edit2, Check, X, Clock,
  ChevronDown, ChevronRight, MessageSquare, Camera, Eye,
  Film, Palette, GripVertical, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

// ── Beat type visual indicators ──

const BEAT_COLORS = {
  hook: '#ef4444',
  attention: '#ef4444',
  cold_open: '#ef4444',
  setup: '#f97316',
  introduce_topic: '#f97316',
  establish: '#f97316',
  context: '#f97316',
  problem: '#f97316',
  everyday_scene: '#f97316',
  preview_result: '#f97316',
  rising_action: '#eab308',
  demonstrate: '#eab308',
  escalation: '#eab308',
  explore: '#eab308',
  evidence: '#eab308',
  step_by_step: '#eab308',
  danger_moment: '#eab308',
  climax: '#dc2626',
  turning_point: '#dc2626',
  solution: '#22c55e',
  safe_behavior: '#22c55e',
  reinforce: '#22c55e',
  perspective: '#22c55e',
  proof: '#22c55e',
  tips: '#22c55e',
  resolution: '#3b82f6',
  aftermath: '#3b82f6',
  positive_outcome: '#3b82f6',
  apply: '#3b82f6',
  conclusion: '#3b82f6',
  final_result: '#3b82f6',
  conclude: '#3b82f6',
  call_to_action: '#8b5cf6',
  reminder: '#8b5cf6',
  insight: '#8b5cf6',
  reflection: '#8b5cf6',
};

function getBeatColor(beatType) {
  return BEAT_COLORS[beatType] || '#6b7280';
}

// ── Duration Timeline Bar ──

function DurationTimeline({ scenes, totalDuration }) {
  const actualTotal = scenes.reduce((sum, s) => sum + (s.durationSeconds || 5), 0);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-500">TIMELINE</span>
        <span className="text-xs text-gray-400">{actualTotal}s total</span>
      </div>
      <div className="flex h-6 rounded-lg overflow-hidden border border-gray-200">
        {scenes.map((scene, i) => {
          const pct = ((scene.durationSeconds || 5) / actualTotal) * 100;
          const color = getBeatColor(scene.beatType);
          return (
            <div
              key={scene.id || i}
              className="relative flex items-center justify-center text-[10px] font-bold text-white border-r border-white/30 last:border-r-0 transition-all"
              style={{ width: `${pct}%`, backgroundColor: color, minWidth: '24px' }}
              title={`Scene ${scene.sceneNumber}: ${scene.durationSeconds || 5}s — ${scene.beatType || 'scene'}`}
            >
              {pct > 6 && <span>{scene.sceneNumber}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex mt-1 gap-3 flex-wrap">
        {[...new Set(scenes.map(s => s.beatType).filter(Boolean))].map(beat => (
          <span key={beat} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getBeatColor(beat) }} />
            {beat.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Scene Card ──

function StoryboardSceneCard({
  scene,
  index,
  onUpdate,
  isGeneratingPreviews,
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (field) => {
    setEditingField(field);
    setEditValue(scene[field] || '');
  };

  const saveEdit = () => {
    if (editingField) {
      onUpdate(scene.id, { [editingField]: editValue });
    }
    setEditingField(null);
  };

  const EditableField = ({ label, field, icon: Icon, multiline = false, accent = false }) => {
    const isEditing = editingField === field;
    const value = scene[field] || '';

    if (!value && !isEditing) return null;

    return (
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <span className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${accent ? 'text-amber-600' : 'text-gray-400'}`}>
            {Icon && <Icon size={10} />}
            {label}
          </span>
          {!isEditing && (
            <button onClick={() => startEdit(field)} className="p-0.5 text-gray-300 hover:text-gray-500">
              <Edit2 size={10} />
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="mt-1 space-y-1.5">
            {multiline ? (
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                rows={3}
                className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2C666E]/30 resize-y"
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2C666E]/30"
                autoFocus
              />
            )}
            <div className="flex gap-1">
              <button onClick={saveEdit} className="px-2 py-0.5 text-[10px] bg-[#2C666E] text-white rounded"><Check size={10} /></button>
              <button onClick={() => setEditingField(null)} className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded"><X size={10} /></button>
            </div>
          </div>
        ) : (
          <p className={`text-xs leading-relaxed mt-0.5 ${accent ? 'italic text-gray-700' : 'text-gray-600'}`}>
            {accent ? `"${value}"` : value}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
      {/* Preview Image */}
      <div className="relative aspect-video bg-gray-100">
        {scene.previewImageUrl ? (
          <img
            src={scene.previewImageUrl}
            alt={`Scene ${scene.sceneNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isGeneratingPreviews ? (
              <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
            ) : (
              <Film className="w-8 h-8 text-gray-200" />
            )}
          </div>
        )}

        {/* Scene number badge */}
        <div
          className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
          style={{ backgroundColor: getBeatColor(scene.beatType) }}
        >
          {scene.sceneNumber || index + 1}
        </div>

        {/* Duration badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium flex items-center gap-1">
          <Clock size={10} />
          {scene.durationSeconds || 5}s
        </div>

        {/* Beat type label */}
        {scene.beatType && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-medium">
            {scene.beatType.replace(/_/g, ' ')}
          </div>
        )}

        {/* Emotional tone */}
        {scene.emotionalTone && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-white/80 text-gray-700 text-[10px] font-medium">
            {scene.emotionalTone}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Narrative note (always visible) */}
        <EditableField label="Story" field="narrativeNote" icon={Film} multiline />

        {/* Expand/collapse for details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 mt-1 mb-1"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? 'Less detail' : 'More detail'}
        </button>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <EditableField label="Setting" field="setting" icon={Eye} />
            <EditableField label="Camera" field="motionPrompt" icon={Camera} />
            <EditableField label="Dialogue" field="dialogue" icon={MessageSquare} accent multiline />

            {/* Visual prompt (collapsed by default, for power users) */}
            <details className="mt-2">
              <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">
                Visual prompt ({scene.visualPrompt?.split(/\s+/).length || 0} words)
              </summary>
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed bg-gray-50 rounded p-2">
                {scene.visualPrompt}
              </p>
            </details>
          </div>
        )}

        {/* Brand warnings */}
        {scene.brandWarnings?.length > 0 && (
          <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg p-2">
            <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-[10px] text-amber-700">
              {scene.brandWarnings.map((w, i) => <div key={i}>{w}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ──

export default function StoryboardPreview({
  scenes = [],
  storyboardName = '',
  logline = '',
  narrativeStyle = '',
  overallMood = '',
  brandName = '',
  aspectRatio = '16:9',
  desiredLength = 60,
  startFrameUrl = null,
  startFrameDescription = null,
  onUpdateScene,
  onExportPdf,
}) {
  const [generatingPreviews, setGeneratingPreviews] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const previewCount = scenes.filter(s => s.previewImageUrl).length;
  const hasAllPreviews = previewCount === scenes.length;

  const handleGeneratePreviews = async () => {
    setGeneratingPreviews(true);
    try {
      const res = await apiFetch('/api/storyboard/generate-previews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes: scenes.map(s => ({
            sceneNumber: s.sceneNumber,
            previewImagePrompt: s.previewImagePrompt,
            visualPrompt: s.visualPrompt,
            durationSeconds: s.durationSeconds,
            narrativeNote: s.narrativeNote,
          })),
          aspectRatio,
          imageModel: 'fal_flux',
          startFrameUrl,
          startFrameDescription,
        }),
      });

      const data = await res.json();
      if (data.success && data.previews) {
        for (const preview of data.previews) {
          if (preview.imageUrl) {
            onUpdateScene?.(
              scenes.find(s => s.sceneNumber === preview.sceneNumber)?.id,
              { previewImageUrl: preview.imageUrl }
            );
          }
        }
        toast.success(`${data.stats.generated} preview images generated`);
        if (data.stats.failed > 0) {
          toast.warning(`${data.stats.failed} previews failed — you can retry later`);
        }
      } else {
        throw new Error(data.error || 'Preview generation failed');
      }
    } catch (err) {
      toast.error('Preview generation failed: ' + err.message);
    } finally {
      setGeneratingPreviews(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const totalDuration = scenes.reduce((sum, s) => sum + (s.durationSeconds || 5), 0);

      const res = await apiFetch('/api/storyboard/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboardName,
          logline,
          narrativeStyle,
          overallMood,
          brandName,
          aspectRatio,
          totalDuration,
          scenes: scenes.map(s => ({
            sceneNumber: s.sceneNumber,
            narrativeNote: s.narrativeNote,
            visualPrompt: s.visualPrompt,
            motionPrompt: s.motionPrompt,
            cameraAngle: s.cameraAngle,
            durationSeconds: s.durationSeconds,
            dialogue: s.dialogue,
            emotionalTone: s.emotionalTone,
            beatType: s.beatType,
            setting: s.setting,
            previewImageUrl: s.previewImageUrl,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const url = data.pdfUrl || data.pdfDataUrl;
        if (url) {
          window.open(url, '_blank');
          toast.success('Storyboard PDF exported');
          onExportPdf?.(url);
        }
      } else {
        throw new Error(data.error || 'PDF export failed');
      }
    } catch (err) {
      toast.error('PDF export failed: ' + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with logline */}
      {logline && (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Logline</p>
          <p className="text-sm italic text-gray-700">"{logline}"</p>
        </div>
      )}

      {/* Timeline */}
      <DurationTimeline scenes={scenes} totalDuration={desiredLength} />

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleGeneratePreviews}
            disabled={generatingPreviews}
            size="sm"
            className="bg-[#2C666E] hover:bg-[#1e4d54] text-white"
          >
            {generatingPreviews ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Previews...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> {hasAllPreviews ? 'Regenerate Previews' : 'Generate Previews'}</>
            )}
          </Button>

          <span className="text-xs text-gray-400">
            {previewCount}/{scenes.length} preview images
          </span>
        </div>

        <Button
          onClick={handleExportPdf}
          disabled={exportingPdf || previewCount === 0}
          variant="outline"
          size="sm"
        >
          {exportingPdf ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Exporting...</>
          ) : (
            <><FileDown className="w-3.5 h-3.5" /> Export PDF</>
          )}
        </Button>
      </div>

      {/* Scene Grid — 2 columns for landscape, 1 for portrait */}
      <div className={`grid gap-4 ${aspectRatio === '9:16' ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-2'}`}>
        {scenes.map((scene, i) => (
          <StoryboardSceneCard
            key={scene.id || i}
            scene={scene}
            index={i}
            onUpdate={(id, updates) => onUpdateScene?.(id, updates)}
            isGeneratingPreviews={generatingPreviews}
          />
        ))}
      </div>
    </div>
  );
}
