/**
 * StoryboardWorkspace — the single unified storyboard experience.
 *
 * Replaces:
 *  - StoryboardEditor.jsx (frame grid + script gen + preview gen)
 *  - StoryboardPlannerWizard.jsx generate step (video gen + assembly)
 *
 * Three tabs:
 *  1. Storyboard — frame grid, grouped by narrative beats, with detail panel
 *  2. Settings — all configuration (editable until production starts)
 *  3. Production — server-side video gen progress, per-frame status, final output
 *
 * URL: /storyboards/:id
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import {
  Sparkles, Loader2, FileDown, Play, Lock, Unlock, Edit2, Check, X,
  ChevronDown, ChevronRight, ChevronLeft, Clock, Camera, MessageSquare,
  Film, Eye, Share2, ExternalLink, Copy, ArrowLeft, RotateCcw,
  Image as ImageIcon, AlertTriangle, CheckCircle2, Zap, Settings,
  Volume2, Music, Type, Pause, RefreshCw, Send, Video,
} from 'lucide-react';

// ── Beat colors for narrative arc visualization ──

const BEAT_COLORS = {
  hook: '#ef4444', attention: '#ef4444', cold_open: '#ef4444',
  setup: '#f97316', introduce_topic: '#f97316', establish: '#f97316',
  context: '#f97316', problem: '#f97316', everyday_scene: '#f97316', preview_result: '#f97316',
  rising_action: '#eab308', demonstrate: '#eab308', escalation: '#eab308',
  explore: '#eab308', evidence: '#eab308', step_by_step: '#eab308', danger_moment: '#eab308',
  climax: '#dc2626', turning_point: '#dc2626',
  solution: '#22c55e', safe_behavior: '#22c55e', reinforce: '#22c55e',
  perspective: '#22c55e', proof: '#22c55e', tips: '#22c55e',
  resolution: '#3b82f6', aftermath: '#3b82f6', positive_outcome: '#3b82f6',
  apply: '#3b82f6', conclusion: '#3b82f6', final_result: '#3b82f6', conclude: '#3b82f6',
  call_to_action: '#8b5cf6', reminder: '#8b5cf6', insight: '#8b5cf6', reflection: '#8b5cf6',
};

const getBeatColor = (beatType) => BEAT_COLORS[beatType] || '#94a3b8';

const STATUS_MAP = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', desc: 'Generate the script to populate frames' },
  scripted: { label: 'Scripted', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', desc: 'Review frames, then generate preview images' },
  previewed: { label: 'Previewed', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', desc: 'Edit, lock, and export PDF for client review' },
  ready: { label: 'Ready', color: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500', desc: 'Approved — ready for video production' },
  producing: { label: 'Producing', color: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500', desc: 'Video generation in progress' },
  complete: { label: 'Complete', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', desc: 'All done' },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-700', dot: 'bg-red-500', desc: 'Production failed — retry or reconfigure' },
};

const GEN_STATUS = {
  pending: { icon: Clock, color: 'text-gray-400', label: 'Queued' },
  generating: { icon: Loader2, color: 'text-amber-500', label: 'Generating', spin: true },
  done: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Done' },
  error: { icon: AlertTriangle, color: 'text-red-500', label: 'Error' },
};

// ═══════════════════════════════════════════════════════════════════════════
// Timeline Bar
// ═══════════════════════════════════════════════════════════════════════════

function Timeline({ frames, selectedId, onSelect }) {
  if (!frames.length) return null;
  const totalDuration = frames.reduce((s, f) => s + (f.duration_seconds || 4), 0);

  // Group consecutive frames by beat_type for the label bar
  const beatGroups = [];
  let current = null;
  for (const f of frames) {
    if (current && current.beat === f.beat_type) {
      current.count++;
    } else {
      current = { beat: f.beat_type, count: 1, color: getBeatColor(f.beat_type) };
      beatGroups.push(current);
    }
  }

  return (
    <div className="px-5 pb-3 bg-white border-b border-gray-200">
      {/* Beat labels */}
      <div className="flex mb-1" style={{ gap: '1px' }}>
        {beatGroups.map((g, i) => (
          <div key={i} style={{ flex: g.count }} className="text-center overflow-hidden">
            <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: g.color }}>
              {g.beat?.replace(/_/g, ' ') || ''}
            </span>
          </div>
        ))}
      </div>
      {/* Frame strip */}
      <div className="flex rounded-lg overflow-hidden" style={{ gap: '1px' }}>
        {frames.map((f) => {
          const color = getBeatColor(f.beat_type);
          const sel = f.id === selectedId;
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              className="relative flex-1 transition-all duration-100 rounded-sm"
              style={{
                minWidth: 22, height: 32,
                backgroundColor: sel ? color : `${color}30`,
                outline: sel ? `2px solid ${color}` : 'none',
                outlineOffset: -1,
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
                style={{ color: sel ? 'white' : color }}>
                {f.frame_number}
              </span>
              {f.generation_status === 'done' && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
      {/* Time markers */}
      <div className="flex justify-between mt-0.5">
        <span className="text-[9px] text-gray-400">0s</span>
        <span className="text-[9px] text-gray-400">{totalDuration}s</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Frame Card (in grid)
// ═══════════════════════════════════════════════════════════════════════════

function FrameCard({ frame, isSelected, onClick }) {
  const color = getBeatColor(frame.beat_type);
  const hasPreview = !!frame.preview_image_url;
  const genStatus = GEN_STATUS[frame.generation_status] || GEN_STATUS.pending;

  return (
    <button
      onClick={onClick}
      className={`group relative rounded-lg overflow-hidden text-left transition-all duration-150 border ${
        isSelected ? 'ring-2 ring-offset-1 shadow-md border-gray-300' : 'border-gray-200 hover:shadow-sm hover:border-gray-300'
      }`}
      style={{ '--ring-color': isSelected ? color : undefined }}
    >
      {/* Image */}
      <div className="aspect-video bg-gray-50 relative">
        {hasPreview ? (
          <img src={frame.preview_image_url} alt={`Frame ${frame.frame_number}`} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {frame.visual_prompt ? (
              <ImageIcon className="w-5 h-5 text-gray-200" />
            ) : (
              <span className="text-[10px] text-gray-300">no script</span>
            )}
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-1 left-1 flex items-center gap-1">
          <span className="w-5 h-5 rounded text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: color }}>
            {frame.frame_number}
          </span>
          <span className="px-1 py-0.5 rounded text-[8px] font-medium text-white bg-black/50">
            {frame.timestamp_seconds}s
          </span>
        </div>
        {frame.locked && (
          <div className="absolute bottom-1 right-1 p-0.5 rounded bg-white/80"><Lock size={10} className="text-gray-500" /></div>
        )}
        {/* Video status indicator */}
        {frame.generation_status === 'done' && (
          <div className="absolute bottom-1 left-1 p-0.5 rounded bg-emerald-500 text-white"><CheckCircle2 size={10} /></div>
        )}
      </div>
      {/* Text */}
      <div className="px-2 py-1.5">
        <p className="text-[11px] text-gray-700 leading-snug line-clamp-2">{frame.narrative_note || '—'}</p>
        {frame.dialogue && (
          <p className="text-[10px] text-amber-600 italic mt-0.5 line-clamp-1">"{frame.dialogue}"</p>
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Beat Group Header
// ═══════════════════════════════════════════════════════════════════════════

function BeatGroupHeader({ beatType, frameCount, intervalSeconds }) {
  const color = getBeatColor(beatType);
  const label = beatType?.replace(/_/g, ' ') || 'Scene';
  return (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
      <span className="text-[10px] text-gray-400">{frameCount} frames · {frameCount * intervalSeconds}s</span>
      <div className="flex-1 h-px bg-gray-200 ml-2" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Detail Panel (right sidebar)
// ═══════════════════════════════════════════════════════════════════════════

function DetailPanel({ frame, onUpdate }) {
  const [editField, setEditField] = useState(null);
  const [editVal, setEditVal] = useState('');

  // Reset editing when frame changes
  useEffect(() => { setEditField(null); }, [frame?.id]);

  if (!frame) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm p-6 text-center">
        Select a keyframe to view and edit details
      </div>
    );
  }

  const color = getBeatColor(frame.beat_type);
  const startEdit = (field) => { setEditField(field); setEditVal(frame[field] || ''); };
  const saveEdit = () => {
    if (editField) onUpdate(frame.id, { [editField]: editVal, user_edited: true });
    setEditField(null);
  };

  const Field = ({ label, field, icon: Icon, multiline, accent }) => {
    const editing = editField === field;
    const val = frame[field] || '';
    if (!val && !editing) return null;
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${accent ? 'text-amber-500' : 'text-gray-400'}`}>
            {Icon && <Icon size={10} />} {label}
          </span>
          {!editing && !frame.locked && (
            <button onClick={() => startEdit(field)} className="p-0.5 text-gray-300 hover:text-gray-500"><Edit2 size={10} /></button>
          )}
        </div>
        {editing ? (
          <div className="space-y-1.5">
            {multiline ? (
              <textarea value={editVal} onChange={e => setEditVal(e.target.value)} rows={3} autoFocus
                className="w-full text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30 resize-y" />
            ) : (
              <input type="text" value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus
                className="w-full text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2C666E]/30" />
            )}
            <div className="flex gap-1.5">
              <button onClick={saveEdit} className="px-2.5 py-1 text-[10px] font-medium bg-[#2C666E] text-white rounded-md"><Check size={10} className="inline mr-0.5" /> Save</button>
              <button onClick={() => setEditField(null)} className="px-2.5 py-1 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-md">Cancel</button>
            </div>
          </div>
        ) : (
          <p className={`text-xs leading-relaxed ${accent ? 'italic text-gray-600' : 'text-gray-600'}`}>
            {accent ? `"${val}"` : val}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
        <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>
          {frame.frame_number}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800">Frame {frame.frame_number}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-400">{frame.timestamp_seconds}s</span>
            {frame.beat_type && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}15`, color }}>
                {frame.beat_type.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onUpdate(frame.id, { locked: !frame.locked })}
          className={`p-1.5 rounded-md transition-colors ${frame.locked ? 'bg-[#2C666E]/10 text-[#2C666E]' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          {frame.locked ? <Lock size={12} /> : <Unlock size={12} />}
        </button>
      </div>

      {/* Preview */}
      <div className="px-4 pt-3">
        <div className="aspect-video rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
          {frame.preview_image_url ? (
            <img src={frame.preview_image_url} alt="" className="w-full h-full object-cover" />
          ) : frame.video_url ? (
            <video src={frame.video_url} controls preload="metadata" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ImageIcon size={20} />
            </div>
          )}
        </div>
        {/* Video player (if generated) */}
        {frame.video_url && frame.preview_image_url && (
          <div className="mt-2 rounded-lg border border-gray-200 overflow-hidden">
            <video src={frame.lipsync_video_url || frame.video_url} controls preload="metadata" className="w-full max-h-32 object-cover" />
          </div>
        )}
      </div>

      {/* Editable fields */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
        <Field label="Story" field="narrative_note" icon={Film} multiline />
        <Field label="Setting" field="setting" icon={Eye} />
        <Field label="Dialogue" field="dialogue" icon={MessageSquare} accent multiline />
        <Field label="Action" field="character_action" icon={Zap} />
        <Field label="Emotion" field="emotional_tone" icon={Sparkles} />
        <Field label="Camera" field="motion_prompt" icon={Camera} />

        {/* Visual prompt (collapsed) */}
        {frame.visual_prompt && (
          <details className="mt-2">
            <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600">
              Visual prompt ({frame.visual_prompt?.split(/\s+/).length || 0} words)
            </summary>
            <p className="mt-1 p-2 bg-gray-50 rounded-md text-[10px] text-gray-500 leading-relaxed border border-gray-100">
              {frame.visual_prompt}
            </p>
          </details>
        )}

        {/* Generation error */}
        {frame.generation_error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-[10px] text-red-600">{frame.generation_error}</p>
          </div>
        )}

        {/* Brand warnings */}
        {frame.brand_warnings?.length > 0 && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-1.5">
            <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-[10px] text-amber-700">{frame.brand_warnings.join('; ')}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-200 flex gap-2">
        <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
          <RotateCcw size={11} /> Regen Preview
        </button>
        {frame.video_url && (
          <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
            <RotateCcw size={11} /> Retry Video
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Production Tab — per-frame generation status
// ═══════════════════════════════════════════════════════════════════════════

function ProductionTab({ storyboard, frames, job, onStartProduction, onPollStatus }) {
  const isProducing = storyboard?.production_status === 'producing';
  const isComplete = storyboard?.production_status === 'complete';
  const hasPreviews = frames.some(f => f.preview_image_url);
  const hasScript = frames.some(f => f.visual_prompt);
  const doneCount = frames.filter(f => f.generation_status === 'done').length;

  // Poll job status while producing
  useEffect(() => {
    if (!isProducing || !onPollStatus) return;
    const interval = setInterval(onPollStatus, 4000);
    return () => clearInterval(interval);
  }, [isProducing, onPollStatus]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Status card */}
      {!isProducing && !isComplete && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
          <Zap className="w-10 h-10 text-[#2C666E] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800 mb-1">
            {hasScript ? 'Ready for Production' : 'Script Required'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {!hasScript
              ? 'Generate the script first to populate frames with visual prompts.'
              : !hasPreviews
                ? 'Preview images recommended before production (but not required).'
                : `${frames.length} frames ready. Production generates video clips, audio, and assembles the final video.`
            }
          </p>
          {hasScript && (
            <>
              <Button onClick={onStartProduction} className="bg-[#2C666E] hover:bg-[#1e4d54] text-white px-8">
                <Zap className="w-4 h-4 mr-2" /> Start Production
              </Button>
              <div className="flex items-center justify-center gap-3 mt-3 text-xs text-gray-400">
                <span>~{Math.ceil(frames.length * 0.7)} min estimated</span>
                <span>·</span>
                <span>~${(frames.length * 0.35).toFixed(2)} estimated cost</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Job progress */}
      {(isProducing || isComplete) && job && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-800">
              {isComplete ? 'Production Complete' : `Producing — ${job.current_step || 'starting'}...`}
            </span>
            {isProducing && (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <Loader2 size={12} className="animate-spin" /> {doneCount}/{frames.length}
              </span>
            )}
            {isComplete && <CheckCircle2 size={16} className="text-emerald-500" />}
          </div>
          {/* Step progress bar */}
          <div className="flex gap-1 mb-3">
            {['tts', 'video', 'lipsync', 'music', 'assembly', 'captions'].map(step => {
              const stepDone = job.step_results?.[step]?.done;
              const isCurrent = job.current_step === step;
              return (
                <div key={step} className="flex-1">
                  <div className={`h-1.5 rounded-full ${stepDone ? 'bg-emerald-400' : isCurrent ? 'bg-amber-400 animate-pulse' : 'bg-gray-200'}`} />
                  <span className={`text-[9px] block text-center mt-0.5 ${isCurrent ? 'text-amber-600 font-medium' : stepDone ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-frame status list */}
      <div className="space-y-1">
        {frames.map((frame) => {
          const color = getBeatColor(frame.beat_type);
          const gs = GEN_STATUS[frame.generation_status] || GEN_STATUS.pending;
          const StatusIcon = gs.icon;
          return (
            <div key={frame.id} className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-3">
              <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: color }}>
                {frame.frame_number}
              </div>
              <span className="text-xs text-gray-600 flex-1 truncate">{frame.narrative_note || `Frame ${frame.frame_number}`}</span>

              {/* Status badges */}
              {frame.audio_url && <Volume2 size={12} className="text-blue-400 shrink-0" title="Has voiceover" />}
              {frame.video_url && <Video size={12} className="text-emerald-400 shrink-0" title="Video generated" />}
              {frame.lipsync_video_url && <MessageSquare size={12} className="text-purple-400 shrink-0" title="Lipsync applied" />}

              <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                frame.generation_status === 'done' ? 'bg-emerald-50 text-emerald-600' :
                frame.generation_status === 'generating' ? 'bg-amber-50 text-amber-600' :
                frame.generation_status === 'error' ? 'bg-red-50 text-red-600' :
                'bg-gray-100 text-gray-500'
              }`}>
                <StatusIcon size={10} className={gs.spin ? 'animate-spin' : ''} />
                {gs.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Final output */}
      {isComplete && (storyboard?.assembled_url || job?.assembled_url) && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Final Video</h3>
          <div className="rounded-lg overflow-hidden border border-gray-200 bg-black">
            <video
              src={job?.captioned_url || job?.assembled_url || storyboard?.assembled_url}
              controls
              className="w-full max-h-64 object-contain"
              preload="metadata"
            />
          </div>
          <div className="flex gap-2">
            <a
              href={job?.captioned_url || job?.assembled_url || storyboard?.assembled_url}
              download
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#2C666E] text-white rounded-lg hover:bg-[#1e4d54]"
            >
              <FileDown size={14} /> Download
            </a>
            <button className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
              <Send size={14} /> Save to Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Workspace
// ═══════════════════════════════════════════════════════════════════════════

export default function StoryboardWorkspace() {
  const { id: storyboardId } = useParams();
  const navigate = useNavigate();

  const [storyboard, setStoryboard] = useState(null);
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFrameId, setSelectedFrameId] = useState(null);
  const [activeTab, setActiveTab] = useState('storyboard');

  // Action states
  const [generatingScript, setGeneratingScript] = useState(false);
  const [generatingPreviews, setGeneratingPreviews] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [productionJob, setProductionJob] = useState(null);

  // Debounced save
  const saveTimerRef = useRef(null);

  // ── Load data ──
  const loadStoryboard = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/storyboard/projects/${storyboardId}`);
      const data = await res.json();
      if (data.success) {
        setStoryboard(data.storyboard);
        setFrames(data.frames || []);
        if (!selectedFrameId && data.frames?.length) {
          setSelectedFrameId(data.frames[0].id);
        }
      } else {
        toast.error('Failed to load storyboard');
      }
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [storyboardId]);

  useEffect(() => { loadStoryboard(); }, [loadStoryboard]);

  // ── Update frame (optimistic + debounced save) ──
  const updateFrame = useCallback((frameId, updates) => {
    setFrames(prev => prev.map(f => f.id === frameId ? { ...f, ...updates } : f));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await apiFetch(`/api/storyboard/projects/${storyboardId}/frames/${frameId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (err) {
        console.warn('[Workspace] Save failed:', err.message);
      }
    }, 800);
  }, [storyboardId]);

  // ── Generate Script ──
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
        toast.success(`Script generated — ${data.framesUpdated} frames populated`);
        if (data.brandWarnings?.length) data.brandWarnings.forEach(w => toast.warning(w));
        await loadStoryboard();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error('Script failed: ' + err.message);
    } finally {
      setGeneratingScript(false);
    }
  };

  // ── Generate Previews ──
  const handleGeneratePreviews = async (frameNumbers = null) => {
    setGeneratingPreviews(true);
    try {
      const res = await apiFetch(`/api/storyboard/projects/${storyboardId}/generate-previews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboardId,
          frameNumbers,
          imageModel: storyboard?.image_model || 'fal_nano_banana',
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.stats.generated} previews generated`);
        await loadStoryboard();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      toast.error('Previews failed: ' + err.message);
    } finally {
      setGeneratingPreviews(false);
    }
  };

  // ── Export PDF ──
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const totalDuration = frames.reduce((s, f) => s + (f.duration_seconds || 4), 0);
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
            sceneNumber: f.frame_number, narrativeNote: f.narrative_note, visualPrompt: f.visual_prompt,
            motionPrompt: f.motion_prompt, cameraAngle: f.camera_angle, durationSeconds: f.duration_seconds,
            dialogue: f.dialogue, emotionalTone: f.emotional_tone, beatType: f.beat_type,
            setting: f.setting, previewImageUrl: f.preview_image_url,
          })),
        }),
      });
      const data = await res.json();
      if (data.success && (data.pdfUrl || data.pdfDataUrl)) {
        window.open(data.pdfUrl || data.pdfDataUrl, '_blank');
        toast.success('PDF exported');
      }
    } catch (err) {
      toast.error('PDF export failed: ' + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  // ── Share ──
  const handleShare = async () => {
    try {
      const res = await apiFetch(`/api/storyboard/projects/${storyboardId}/share`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setShareUrl(data.shareUrl);
        navigator.clipboard.writeText(data.shareUrl).then(() => toast.success('Share link copied'));
      }
    } catch (err) {
      toast.error('Share failed: ' + err.message);
    }
  };

  // ── Start Production (placeholder — will call new endpoint) ──
  const handleStartProduction = async () => {
    try {
      const res = await apiFetch(`/api/storyboard/projects/${storyboardId}/produce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyboardId }),
      });
      const data = await res.json();
      if (data.success) {
        setProductionJob(data.job);
        setStoryboard(prev => ({ ...prev, production_status: 'producing' }));
        toast.success('Production started');
      } else {
        throw new Error(data.error || 'Failed to start production');
      }
    } catch (err) {
      toast.error('Production start failed: ' + err.message);
    }
  };

  // ── Poll production status ──
  const pollProductionStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/storyboard/projects/${storyboardId}/production-status`);
      const data = await res.json();
      if (data.success) {
        setProductionJob(data.job);
        if (data.frames) setFrames(data.frames);
        if (data.storyboard) setStoryboard(data.storyboard);
      }
    } catch (err) {
      console.warn('[Workspace] Poll failed:', err.message);
    }
  }, [storyboardId]);

  // ── Derived state ──
  const selectedFrame = frames.find(f => f.id === selectedFrameId);
  const status = STATUS_MAP[storyboard?.production_status] || STATUS_MAP.draft;
  const hasScript = frames.some(f => f.visual_prompt);
  const previewCount = frames.filter(f => f.preview_image_url).length;
  const totalDuration = frames.reduce((s, f) => s + (f.duration_seconds || 4), 0);
  const isProducing = storyboard?.production_status === 'producing';

  // Group frames by consecutive beat_type for the grid
  const frameGroups = [];
  let currentGroup = null;
  for (const f of frames) {
    if (currentGroup && currentGroup.beat === f.beat_type) {
      currentGroup.frames.push(f);
    } else {
      currentGroup = { beat: f.beat_type, frames: [f] };
      frameGroups.push(currentGroup);
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  if (!storyboard) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Storyboard not found</p>
        <Button onClick={() => navigate('/storyboards')} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* ── Header ── */}
      <div className="border-b border-gray-200 px-5 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/storyboards')} className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{storyboard.name}</h1>
              {storyboard.logline && <p className="text-xs text-gray-400 italic mt-0.5">"{storyboard.logline}"</p>}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                <span className="text-[10px] text-gray-400">{frames.length} frames · {totalDuration}s · {storyboard.frame_interval}s intervals · {storyboard.aspect_ratio}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!hasScript && (
              <Button onClick={handleGenerateScript} disabled={generatingScript} className="bg-[#2C666E] hover:bg-[#1e4d54] text-white text-xs">
                {generatingScript ? <><Loader2 size={14} className="animate-spin mr-1" /> Generating...</> : <><Sparkles size={14} className="mr-1" /> Generate Script</>}
              </Button>
            )}
            {hasScript && (
              <Button onClick={() => handleGeneratePreviews()} disabled={generatingPreviews} className="bg-[#2C666E] hover:bg-[#1e4d54] text-white text-xs">
                {generatingPreviews ? <><Loader2 size={14} className="animate-spin mr-1" /> Previews...</> : <><ImageIcon size={14} className="mr-1" /> Previews ({previewCount}/{frames.length})</>}
              </Button>
            )}
            {hasScript && (
              <Button onClick={handleGenerateScript} disabled={generatingScript} variant="outline" size="sm" title="Regenerate script">
                <RotateCcw size={14} />
              </Button>
            )}
            <Button onClick={handleExportPdf} disabled={exportingPdf || previewCount === 0} variant="outline" size="sm">
              {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            </Button>
            <Button onClick={handleShare} variant="outline" size="sm"><Share2 size={14} /></Button>
          </div>
        </div>
      </div>

      {/* Share banner */}
      {shareUrl && (
        <div className="flex items-center gap-3 bg-[#2C666E]/5 border-b border-[#2C666E]/20 px-5 py-2">
          <ExternalLink size={12} className="text-[#2C666E] shrink-0" />
          <span className="text-xs text-gray-700 truncate flex-1">{shareUrl}</span>
          <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Copied'); }}
            className="p-1 rounded hover:bg-[#2C666E]/10 text-[#2C666E]"><Copy size={12} /></button>
        </div>
      )}

      {/* Status hint */}
      <div className="px-5 py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-[11px] text-gray-500">{status.desc}</p>
      </div>

      {/* ── Timeline ── */}
      <Timeline frames={frames} selectedId={selectedFrameId} onSelect={setSelectedFrameId} />

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-200 px-5 flex items-center">
        {[
          { key: 'storyboard', label: 'Storyboard', icon: Film, badge: frames.length },
          { key: 'settings', label: 'Settings', icon: Settings },
          { key: 'production', label: 'Production', icon: Zap },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 ${
              activeTab === tab.key ? 'border-[#2C666E] text-[#2C666E]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.badge && <span className="ml-1 px-1.5 py-0.5 text-[9px] font-semibold rounded-full bg-gray-100 text-gray-600">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main area */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Storyboard Tab */}
          {activeTab === 'storyboard' && (
            frames.length === 0 ? (
              <div className="text-center py-16">
                <Film className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">Generate the script to populate frames.</p>
              </div>
            ) : (
              <div>
                {frameGroups.map((group, gi) => (
                  <div key={gi}>
                    <BeatGroupHeader beatType={group.beat} frameCount={group.frames.length} intervalSeconds={storyboard.frame_interval || 4} />
                    <div className="grid grid-cols-4 xl:grid-cols-5 gap-2.5">
                      {group.frames.map(frame => (
                        <FrameCard
                          key={frame.id}
                          frame={frame}
                          isSelected={frame.id === selectedFrameId}
                          onClick={() => setSelectedFrameId(frame.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-3">
              <p className="text-xs text-gray-400 mb-4">
                {isProducing ? 'Settings are locked during production.' : 'Edit settings before starting production.'}
              </p>
              {[
                { label: 'Story', desc: `${storyboard.narrative_style || 'entertaining'} · ${storyboard.target_audience || 'General'}${storyboard.client_brief ? ' · Has client brief' : ''}` },
                { label: 'Visual Style', desc: `${storyboard.visual_style || 'cinematic'}${storyboard.builder_lighting ? ` · ${storyboard.builder_lighting}` : ''}${storyboard.motion_style ? ` · ${storyboard.motion_style}` : ''}` },
                { label: 'Models', desc: `Video: ${storyboard.global_model || 'veo3'} · Image: ${storyboard.image_model || 'fal_nano_banana'}` },
                { label: 'Characters', desc: `${storyboard.elements?.filter(e => e.description).length || 0} elements · ${storyboard.veo_reference_images?.length || 0} reference images` },
                { label: 'Scene Direction', desc: storyboard.location_description ? storyboard.location_description.substring(0, 80) + '...' : 'No location set' },
                { label: 'Audio', desc: `${storyboard.tts_model || 'elevenlabs-v3'} · ${storyboard.voice || 'Rachel'} · Lipsync: ${storyboard.lipsync_model || 'none'} · Captions: ${storyboard.caption_style || 'none'}` },
              ].map(section => (
                <div key={section.label} className={`bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between ${isProducing ? 'opacity-60 cursor-not-allowed' : 'hover:border-gray-300 cursor-pointer'}`}>
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{section.label}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{section.desc}</p>
                  </div>
                  {!isProducing && <Edit2 size={14} className="text-gray-400" />}
                </div>
              ))}
            </div>
          )}

          {/* Production Tab */}
          {activeTab === 'production' && (
            <ProductionTab
              storyboard={storyboard}
              frames={frames}
              job={productionJob}
              onStartProduction={handleStartProduction}
              onPollStatus={pollProductionStatus}
            />
          )}
        </div>

        {/* Detail Panel (storyboard tab only) */}
        {activeTab === 'storyboard' && (
          <div className="w-80 border-l border-gray-200 bg-white flex-shrink-0 overflow-hidden">
            <DetailPanel frame={selectedFrame} onUpdate={updateFrame} />
          </div>
        )}
      </div>
    </div>
  );
}
