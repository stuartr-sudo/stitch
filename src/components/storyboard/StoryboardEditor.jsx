/**
 * StoryboardEditor — Full-page storyboard editing experience
 *
 * This is the PRODUCT — not a modal, not a wizard step. A proper page where you:
 *
 *   1. See all storyboard frames in a visual grid (one frame per interval)
 *   2. Generate the script (Stage 1+2) → populates all frame descriptions
 *   3. Generate preview images → each frame gets a thumbnail
 *   4. Edit any frame inline (narrative, camera, dialogue, visual prompt)
 *   5. Lock frames you're happy with (prevents regeneration)
 *   6. Export as PDF for client review
 *   7. Share a review link with the client
 *   8. When approved → proceed to video production
 *
 * A 60s video at 4s intervals = 15 frames.
 * Each frame: preview image + narrative note + visual description + camera + dialogue
 *
 * URL: /storyboards/:id
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Loader2, FileDown, Play, Lock, Unlock, Edit2, Check, X,
  ChevronDown, ChevronRight, Clock, Camera, MessageSquare, Film, Eye,
  Share2, ExternalLink, Copy, ArrowLeft, RotateCcw, Image as ImageIcon,
  AlertTriangle, CheckCircle2, Palette, Clapperboard, Layers, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

// ── Beat Colors (same as StoryboardPreview) ──

const BEAT_COLORS = {
  hook: '#ef4444', attention: '#ef4444', cold_open: '#ef4444',
  setup: '#f97316', introduce_topic: '#f97316', establish: '#f97316',
  context: '#f97316', problem: '#f97316', everyday_scene: '#f97316',
  preview_result: '#f97316',
  rising_action: '#eab308', demonstrate: '#eab308', escalation: '#eab308',
  explore: '#eab308', evidence: '#eab308', step_by_step: '#eab308',
  danger_moment: '#eab308',
  climax: '#dc2626', turning_point: '#dc2626',
  solution: '#22c55e', safe_behavior: '#22c55e', reinforce: '#22c55e',
  perspective: '#22c55e', proof: '#22c55e', tips: '#22c55e',
  resolution: '#3b82f6', aftermath: '#3b82f6', positive_outcome: '#3b82f6',
  apply: '#3b82f6', conclusion: '#3b82f6', final_result: '#3b82f6',
  conclude: '#3b82f6',
  call_to_action: '#8b5cf6', reminder: '#8b5cf6', insight: '#8b5cf6',
  reflection: '#8b5cf6',
};

// ── Status Display ──

const STATUS_MAP = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600', description: 'Set up your storyboard settings, then generate the script' },
  scripted: { label: 'Scripted', color: 'bg-blue-50 text-blue-700', description: 'Script generated — review frames and generate preview images' },
  previewed: { label: 'Previewed', color: 'bg-amber-50 text-amber-700', description: 'Preview images ready — review, edit, and export PDF for client approval' },
  approved: { label: 'Approved', color: 'bg-green-50 text-green-700', description: 'Client approved — ready for video production' },
  generating: { label: 'Generating', color: 'bg-purple-50 text-purple-700', description: 'Video clips are being generated' },
  complete: { label: 'Complete', color: 'bg-emerald-50 text-emerald-700', description: 'All videos generated and assembled' },
};

// ── Timeline Bar ──

function TimelineBar({ frames }) {
  const totalDuration = frames.reduce((sum, f) => sum + (f.duration_seconds || 4), 0);
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Timeline</span>
        <span className="text-xs text-gray-400">{totalDuration}s · {frames.length} frames</span>
      </div>
      <div className="flex h-7 rounded-lg overflow-hidden border border-gray-200">
        {frames.map((frame, i) => {
          const pct = ((frame.duration_seconds || 4) / totalDuration) * 100;
          const color = BEAT_COLORS[frame.beat_type] || '#94a3b8';
          const hasPreview = !!frame.preview_image_url;
          return (
            <div
              key={frame.id || i}
              className="relative flex items-center justify-center text-[10px] font-bold text-white border-r border-white/30 last:border-r-0 cursor-pointer hover:brightness-110 transition-all"
              style={{ width: `${pct}%`, backgroundColor: color, minWidth: '20px', opacity: hasPreview ? 1 : 0.5 }}
              title={`Frame ${frame.frame_number}: ${frame.timestamp_seconds}s — ${frame.beat_type || 'pending'}`}
              onClick={() => {
                document.getElementById(`frame-${frame.frame_number}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              {pct > 4 && frame.frame_number}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Frame Card (the core editing unit) ──

function FrameCard({ frame, onUpdate, onRegeneratePreview, isGeneratingPreview }) {
  const [expanded, setExpanded] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (field) => { setEditingField(field); setEditValue(frame[field] || ''); };
  const saveEdit = () => {
    if (editingField) onUpdate(frame.id, { [editingField]: editValue, user_edited: true });
    setEditingField(null);
  };
  const cancelEdit = () => { setEditingField(null); };

  const EditableField = ({ label, field, icon: Icon, multiline = false, color = 'text-gray-400' }) => {
    const isEditing = editingField === field;
    const value = frame[field] || '';
    if (!value && !isEditing && !expanded) return null;

    return (
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <span className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${color}`}>
            {Icon && <Icon size={10} />} {label}
          </span>
          {!isEditing && !frame.locked && (
            <button onClick={() => startEdit(field)} className="p-0.5 text-gray-300 hover:text-gray-500"><Edit2 size={10} /></button>
          )}
        </div>
        {isEditing ? (
          <div className="mt-1 space-y-1">
            {multiline ? (
              <textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={3}
                className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2C666E]/30 resize-y" autoFocus />
            ) : (
              <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2C666E]/30" autoFocus />
            )}
            <div className="flex gap-1">
              <button onClick={saveEdit} className="px-2 py-0.5 text-[10px] bg-[#2C666E] text-white rounded"><Check size={10} /></button>
              <button onClick={cancelEdit} className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded"><X size={10} /></button>
            </div>
          </div>
        ) : (
          <p className={`text-xs leading-relaxed mt-0.5 ${field === 'dialogue' ? 'italic text-gray-700' : 'text-gray-600'}`}>
            {field === 'dialogue' && value ? `"${value}"` : value || <span className="text-gray-300">—</span>}
          </p>
        )}
      </div>
    );
  };

  const beatColor = BEAT_COLORS[frame.beat_type] || '#94a3b8';

  return (
    <div id={`frame-${frame.frame_number}`} className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-sm ${frame.locked ? 'border-[#2C666E]/40 ring-1 ring-[#2C666E]/10' : 'border-gray-200'}`}>
      {/* Preview Image */}
      <div className="relative aspect-video bg-gray-100">
        {frame.preview_image_url ? (
          <img src={frame.preview_image_url} alt={`Frame ${frame.frame_number}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            {isGeneratingPreview ? (
              <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
            ) : frame.visual_prompt ? (
              <>
                <ImageIcon className="w-6 h-6 text-gray-200" />
                <span className="text-[10px] text-gray-300">Ready to generate</span>
              </>
            ) : (
              <>
                <Film className="w-6 h-6 text-gray-200" />
                <span className="text-[10px] text-gray-300">Run script first</span>
              </>
            )}
          </div>
        )}

        {/* Frame number + time badge */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
          <span className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shadow-sm"
            style={{ backgroundColor: beatColor }}>
            {frame.frame_number}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[9px] font-medium">
            {frame.timestamp_seconds}s
          </span>
        </div>

        {/* Duration badge */}
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[9px] font-medium flex items-center gap-0.5">
          <Clock size={9} /> {frame.duration_seconds || 4}s
        </div>

        {/* Lock indicator */}
        {frame.locked && (
          <div className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-[#2C666E]/80 text-white">
            <Lock size={10} />
          </div>
        )}

        {/* Beat type label */}
        {frame.beat_type && (
          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[9px] font-medium">
            {frame.beat_type.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5">
        <EditableField label="Story" field="narrative_note" icon={Film} multiline />
        {frame.dialogue && <EditableField label="Dialogue" field="dialogue" icon={MessageSquare} multiline color="text-amber-500" />}

        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-gray-600 my-1">
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          {expanded ? 'Less' : 'More'}
        </button>

        {expanded && (
          <div className="pt-1 border-t border-gray-100 space-y-0.5">
            <EditableField label="Setting" field="setting" icon={Eye} />
            <EditableField label="Action" field="character_action" icon={Zap} />
            <EditableField label="Camera" field="motion_prompt" icon={Camera} />
            <EditableField label="Emotion" field="emotional_tone" icon={Sparkles} />
            {!frame.dialogue && <EditableField label="Dialogue" field="dialogue" icon={MessageSquare} multiline color="text-amber-500" />}

            {frame.visual_prompt && (
              <details className="mt-1">
                <summary className="text-[9px] text-gray-400 cursor-pointer">Visual prompt ({frame.visual_prompt?.split(/\s+/).length} words)</summary>
                <p className="text-[9px] text-gray-400 mt-1 bg-gray-50 rounded p-1.5 leading-relaxed">{frame.visual_prompt}</p>
              </details>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => onUpdate(frame.id, { locked: !frame.locked })}
            className={`p-1 rounded text-[10px] ${frame.locked ? 'text-[#2C666E] bg-[#2C666E]/10' : 'text-gray-400 hover:bg-gray-100'}`}
            title={frame.locked ? 'Unlock frame' : 'Lock frame'}
          >
            {frame.locked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>

          {frame.preview_image_url && !frame.locked && (
            <button
              onClick={() => onRegeneratePreview(frame.frame_number)}
              disabled={isGeneratingPreview}
              className="p-1 rounded text-gray-400 hover:bg-gray-100 text-[10px]"
              title="Regenerate preview"
            >
              <RotateCcw size={11} />
            </button>
          )}

          {frame.brand_warnings?.length > 0 && (
            <span className="ml-auto flex items-center gap-0.5 text-amber-500" title={frame.brand_warnings.join('; ')}>
              <AlertTriangle size={11} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Editor Page ──

export default function StoryboardEditor({ storyboardId, onBack }) {
  const [storyboard, setStoryboard] = useState(null);
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingPreviews, setGeneratingPreviews] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [savingTimer, setSavingTimer] = useState(null);

  // Load storyboard
  const loadStoryboard = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/storyboard/projects/${storyboardId}`);
      const data = await res.json();
      if (data.success) {
        setStoryboard(data.storyboard);
        setFrames(data.frames || []);
      } else {
        toast.error('Failed to load storyboard');
      }
    } catch (err) {
      toast.error('Error loading storyboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [storyboardId]);

  useEffect(() => { loadStoryboard(); }, [loadStoryboard]);

  // Auto-save frame changes (debounced)
  const updateFrame = useCallback(async (frameId, updates) => {
    // Optimistic update
    setFrames(prev => prev.map(f => f.id === frameId ? { ...f, ...updates } : f));

    // Debounced save to DB
    if (savingTimer) clearTimeout(savingTimer);
    const timer = setTimeout(async () => {
      try {
        await apiFetch(`/api/storyboard/projects/${storyboardId}/frames/${frameId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.warn('[StoryboardEditor] Save failed:', err.message);
      }
    }, 800);
    setSavingTimer(timer);
  }, [storyboardId, savingTimer]);

  // Generate script
  const handleGenerateScript = async () => {
    setGeneratingScript(true);
    try {
      const res = await apiFetch(`/api/storyboard/projects/${storyboardId}/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyboardId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Script generated: ${data.framesUpdated} frames populated`);
        if (data.brandWarnings?.length) {
          data.brandWarnings.forEach(w => toast.warning(w));
        }
        await loadStoryboard(); // Reload to get populated frames
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error('Script generation failed: ' + err.message);
    } finally {
      setGeneratingScript(false);
    }
  };

  // Generate previews
  const handleGeneratePreviews = async (frameNumbers = null) => {
    setGeneratingPreviews(true);
    try {
      const res = await apiFetch(`/api/storyboard/projects/${storyboardId}/generate-previews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboardId,
          frameNumbers,
          imageModel: 'fal_flux',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.stats.generated} preview images generated`);
        await loadStoryboard();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error('Preview generation failed: ' + err.message);
    } finally {
      setGeneratingPreviews(false);
    }
  };

  // Export PDF
  const handleExportPdf = async () => {
    if (!storyboard) return;
    setExportingPdf(true);
    try {
      const totalDuration = frames.reduce((sum, f) => sum + (f.duration_seconds || 4), 0);
      const res = await apiFetch('/api/storyboard/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboardName: storyboard.name,
          logline: storyboard.logline,
          narrativeStyle: storyboard.narrative_style,
          overallMood: storyboard.overall_mood,
          brandName: storyboard.brand_data?.brand_name || '',
          aspectRatio: storyboard.aspect_ratio,
          totalDuration,
          scenes: frames.map(f => ({
            sceneNumber: f.frame_number,
            narrativeNote: f.narrative_note,
            visualPrompt: f.visual_prompt,
            motionPrompt: f.motion_prompt,
            cameraAngle: f.camera_angle,
            durationSeconds: f.duration_seconds,
            dialogue: f.dialogue,
            emotionalTone: f.emotional_tone,
            beatType: f.beat_type,
            setting: f.setting,
            previewImageUrl: f.preview_image_url,
          })),
        }),
      });
      const data = await res.json();
      if (data.success && (data.pdfUrl || data.pdfDataUrl)) {
        window.open(data.pdfUrl || data.pdfDataUrl, '_blank');
        // Save PDF URL to storyboard
        await apiFetch(`/api/storyboard/projects/${storyboardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdf_url: data.pdfUrl }),
        });
        toast.success('Storyboard PDF exported');
      }
    } catch (err) {
      toast.error('PDF export failed: ' + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  // Share link
  const handleCreateShareLink = async () => {
    try {
      const res = await apiFetch(`/api/storyboard/projects/${storyboardId}/share`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setShareUrl(data.shareUrl);
        navigator.clipboard.writeText(data.shareUrl).then(() => {
          toast.success('Share link copied to clipboard');
        }).catch(() => {
          toast.success('Share link created');
        });
      }
    } catch (err) {
      toast.error('Failed to create share link: ' + err.message);
    }
  };

  // ── Derived state ──
  const statusInfo = STATUS_MAP[storyboard?.status] || STATUS_MAP.draft;
  const hasScript = frames.some(f => f.visual_prompt);
  const previewCount = frames.filter(f => f.preview_image_url).length;
  const hasAllPreviews = previewCount === frames.length && frames.length > 0;
  const totalDuration = frames.reduce((sum, f) => sum + (f.duration_seconds || 4), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (!storyboard) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Storyboard not found</p>
        <Button onClick={onBack} variant="outline" className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">

      {/* ── Header ── */}
      <div className="flex items-start justify-between py-6 border-b border-gray-200 mb-6">
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{storyboard.name}</h1>
            {storyboard.logline && (
              <p className="text-sm text-gray-500 italic mt-1">"{storyboard.logline}"</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              <span className="text-xs text-gray-400">{frames.length} frames · {totalDuration}s · {storyboard.aspect_ratio}</span>
              {storyboard.brand_data?.brand_name && (
                <span className="text-xs text-gray-400">· {storyboard.brand_data.brand_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!hasScript && (
            <Button onClick={handleGenerateScript} disabled={generatingScript}
              className="bg-[#2C666E] hover:bg-[#1e4d54] text-white">
              {generatingScript ? <><Loader2 size={14} className="animate-spin" /> Generating Script...</>
                : <><Sparkles size={14} /> Generate Script</>}
            </Button>
          )}

          {hasScript && !hasAllPreviews && (
            <Button onClick={() => handleGeneratePreviews()} disabled={generatingPreviews}
              className="bg-[#2C666E] hover:bg-[#1e4d54] text-white">
              {generatingPreviews ? <><Loader2 size={14} className="animate-spin" /> Generating...</>
                : <><ImageIcon size={14} /> Generate Previews ({previewCount}/{frames.length})</>}
            </Button>
          )}

          {hasScript && (
            <Button onClick={handleGenerateScript} disabled={generatingScript}
              variant="outline" size="sm" title="Regenerate script for unlocked frames">
              <RotateCcw size={14} />
            </Button>
          )}

          <Button onClick={handleExportPdf} disabled={exportingPdf || previewCount === 0}
            variant="outline" size="sm">
            {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            PDF
          </Button>

          <Button onClick={handleCreateShareLink} variant="outline" size="sm">
            <Share2 size={14} />
          </Button>
        </div>
      </div>

      {/* Share URL banner */}
      {shareUrl && (
        <div className="mb-4 flex items-center gap-3 bg-[#2C666E]/5 border border-[#2C666E]/20 rounded-xl px-4 py-3">
          <ExternalLink size={14} className="text-[#2C666E] shrink-0" />
          <span className="text-sm text-gray-700 truncate flex-1">{shareUrl}</span>
          <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Copied'); }}
            className="p-1.5 rounded-lg hover:bg-[#2C666E]/10 text-[#2C666E]"><Copy size={14} /></button>
        </div>
      )}

      {/* Status guidance */}
      <div className="mb-6 bg-gray-50 rounded-xl px-4 py-3">
        <p className="text-sm text-gray-600">{statusInfo.description}</p>
      </div>

      {/* Timeline */}
      {frames.length > 0 && <TimelineBar frames={frames} />}

      {/* ── Frame Grid ── */}
      {frames.length === 0 ? (
        <div className="text-center py-16">
          <Clapperboard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No frames yet. Generate the script to populate your storyboard.</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${
          storyboard.aspect_ratio === '9:16' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' :
          'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        }`}>
          {frames.map((frame) => (
            <FrameCard
              key={frame.id}
              frame={frame}
              onUpdate={updateFrame}
              onRegeneratePreview={(frameNum) => handleGeneratePreviews([frameNum])}
              isGeneratingPreview={generatingPreviews}
            />
          ))}
        </div>
      )}

      {/* ── Bottom Actions (when previewed) ── */}
      {hasAllPreviews && storyboard.status !== 'generating' && storyboard.status !== 'complete' && (
        <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Storyboard Complete</h3>
          <p className="text-sm text-gray-500 mb-4">
            All {frames.length} frames are ready. Export a PDF for client review, or proceed to video production.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={handleExportPdf} disabled={exportingPdf} variant="outline" size="lg">
              <FileDown size={16} className="mr-2" /> Export PDF for Client
            </Button>
            <Button
              onClick={() => {
                // Mark as approved and navigate to production
                apiFetch(`/api/storyboard/projects/${storyboardId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'approved' }),
                }).then(() => {
                  toast.success('Storyboard approved — ready for video production');
                  setStoryboard(prev => ({ ...prev, status: 'approved' }));
                });
              }}
              className="bg-[#2C666E] hover:bg-[#1e4d54] text-white" size="lg"
            >
              <CheckCircle2 size={16} className="mr-2" /> Approve & Begin Production
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
