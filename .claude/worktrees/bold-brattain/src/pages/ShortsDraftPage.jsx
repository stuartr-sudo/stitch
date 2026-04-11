import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Loader2, Download, Play,
  Calendar, Hash, Palette, Film, Volume2, Music,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

const PLATFORM_COLORS = {
  youtube: '#FF0000',
  tiktok: '#010101',
  instagram: '#E1306C',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
};

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

const PRIVACY_OPTIONS = {
  youtube: [
    { value: 'public', label: 'Public' },
    { value: 'unlisted', label: 'Unlisted' },
    { value: 'private', label: 'Private' },
  ],
  tiktok: [
    { value: 'public', label: 'Public' },
    { value: 'friends', label: 'Friends' },
    { value: 'private', label: 'Private' },
  ],
  instagram: [{ value: 'public', label: 'Public' }],
  facebook: [
    { value: 'public', label: 'Public' },
    { value: 'friends', label: 'Friends' },
    { value: 'only_me', label: 'Only Me' },
  ],
  linkedin: [{ value: 'public', label: 'Public' }],
};

export default function ShortsDraftPage() {
  const { draftId } = useParams(); // may be a draft ID or campaign ID
  const navigate = useNavigate();
  const { user } = useAuth();

  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingClip, setPlayingClip] = useState(null);
  const [jobStatus, setJobStatus] = useState(null); // track pipeline progress
  const [jobStep, setJobStep] = useState(null);

  // ── Fetch draft (tries draft ID first, then campaign_id, then polls job) ───
  useEffect(() => {
    if (!draftId || !user) return;
    let cancelled = false;
    let pollTimer = null;

    async function fetchDraft() {
      setLoading(true);
      try {
        // 1) Try by draft ID
        const { data: byId } = await supabase
          .from('ad_drafts')
          .select('*')
          .eq('id', draftId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!cancelled && byId) { setDraft(byId); setLoading(false); return; }

        // 2) Try by campaign_id (pipeline creates draft with campaign_id column)
        const { data: byCampaign } = await supabase
          .from('ad_drafts')
          .select('*')
          .eq('campaign_id', draftId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && byCampaign) { setDraft(byCampaign); setLoading(false); return; }

        // 3) Draft doesn't exist yet — check if there's a running job for this campaign
        //    campaign_id lives inside input_json, use PostgREST JSONB filter
        const { data: job } = await supabase
          .from('jobs')
          .select('id, status, current_step, total_steps, completed_steps, last_error')
          .eq('input_json->>campaign_id', draftId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && job && (job.status === 'running' || job.status === 'pending')) {
          setJobStatus(job.status);
          setJobStep(job.current_step);
          setLoading(false);
          // Poll until job completes and draft appears
          pollTimer = setInterval(async () => {
            if (cancelled) return;
            // Check for draft
            const { data: newDraft } = await supabase
              .from('ad_drafts')
              .select('*')
              .eq('campaign_id', draftId)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (newDraft) {
              clearInterval(pollTimer);
              if (!cancelled) { setDraft(newDraft); setJobStatus(null); }
              return;
            }
            // Update job status
            const { data: updatedJob } = await supabase
              .from('jobs')
              .select('status, current_step, completed_steps, last_error')
              .eq('input_json->>campaign_id', draftId)
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (!cancelled && updatedJob) {
              setJobStatus(updatedJob.status);
              setJobStep(updatedJob.current_step);
              if (updatedJob.status === 'failed') {
                clearInterval(pollTimer);
                setError(`Generation failed at step: ${updatedJob.current_step}${updatedJob.last_error ? ` — ${typeof updatedJob.last_error === 'string' ? updatedJob.last_error : updatedJob.last_error.message || JSON.stringify(updatedJob.last_error)}` : ''}`);
              }
            }
          }, 5000);
          return;
        }

        // 4) Job failed or doesn't exist
        if (!cancelled) {
          if (job?.status === 'failed') {
            setError(`Generation failed at step: ${job.current_step}${job.last_error ? ` — ${typeof job.last_error === 'string' ? job.last_error : job.last_error.message || JSON.stringify(job.last_error)}` : ''}`);
          } else {
            setError('Draft not found');
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load draft');
      } finally {
        if (!cancelled && !pollTimer) setLoading(false);
      }
    }

    fetchDraft();
    return () => { cancelled = true; if (pollTimer) clearInterval(pollTimer); };
  }, [draftId, user]);

  // ── Download handler ─────────────────────────────────────────────────────────
  const handleDownload = () => {
    const url = draft?.captioned_video_url || draft?.assets_json?.final_video_url;
    if (!url) { toast.error('No video URL available'); return; }
    const link = document.createElement('a');
    link.href = url;
    link.download = `short-${draftId}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Loading / error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  // ── Generating state (pipeline running, draft not yet created) ───────────
  if (!draft && jobStatus && !error) {
    const stepLabels = {
      // V3 pipeline steps
      generating_narrative: 'Writing narrative…',
      generating_voiceover: 'Creating voiceover…',
      analyzing_voiceover: 'Analyzing word timing…',
      aligning_blocks: 'Aligning scene blocks…',
      directing_scenes: 'Directing keyframe prompts…',
      generating_assets: 'Generating images & videos…',
      validating_assembly: 'Validating timing…',
      assembling_video: 'Assembling video…',
      burning_captions: 'Adding captions…',
      finalizing: 'Finalizing draft…',
      // Legacy step labels
      research: 'Researching topic…',
      script: 'Writing script…',
      images: 'Generating images…',
      videos: 'Animating scenes…',
      voiceover: 'Creating voiceover…',
      music: 'Generating music…',
      captions: 'Adding captions…',
      assembly: 'Assembling video…',
    };
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-10 h-10 animate-spin text-[#2C666E]" />
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-slate-800">Generating your Short…</p>
          <p className="text-sm text-slate-500">
            {stepLabels[jobStep] || `Step: ${jobStep || 'starting'}…`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/campaigns')} className="text-slate-400">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Campaigns
        </Button>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">{error || 'Draft not found'}</p>
        <Button variant="outline" onClick={() => navigate('/campaigns')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Campaigns
        </Button>
      </div>
    );
  }

  const meta = draft.shorts_metadata_json || {};
  const sceneInputs = draft.scene_inputs_json || [];
  const scriptScenes = meta.script?.scenes || meta.scenes || [];
  const keyframes = meta.keyframes || [];
  const isV3 = meta.pipeline_version === 'v3';
  const videoUrl = draft.captioned_video_url || draft.assets_json?.final_video_url;
  const posterUrl = sceneInputs[0]?.image_url || null;
  const isReady = draft.generation_status === 'ready';
  const isPublished = draft.publish_status === 'published';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/campaigns')}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">Short Review</h1>
            {meta.script?.title && (
              <p className="text-sm text-slate-500 truncate">{meta.script.title}</p>
            )}
          </div>
          <StatusPill status={draft.generation_status} />
          {isPublished && (
            <span className="text-xs text-emerald-600 font-medium px-2 py-1 bg-emerald-50 rounded-full">
              Published
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* ── Video Player ──────────────────────────────────────────────────── */}
        {videoUrl && (
          <section className="flex justify-center">
            <div className="w-full max-w-sm">
              <video
                src={videoUrl}
                controls
                poster={posterUrl || undefined}
                className="w-full rounded-xl bg-black shadow-lg"
                style={{ aspectRatio: '9/16' }}
              />
            </div>
          </section>
        )}

        {/* ── Metadata Bar ──────────────────────────────────────────────────── */}
        <section className="flex flex-wrap gap-3">
          {meta.niche && (
            <MetaBadge icon={Hash} label="Niche" value={meta.niche} />
          )}
          {meta.visual_style && (
            <MetaBadge icon={Palette} label="Style" value={meta.visual_style} />
          )}
          {meta.video_model && (
            <MetaBadge icon={Film} label="Model" value={meta.video_model} />
          )}
          {meta.voice_id && (
            <MetaBadge icon={Volume2} label="Voice" value={meta.voice_id} />
          )}
          {meta.caption_style && (
            <MetaBadge icon={Calendar} label="Captions" value={meta.caption_style} />
          )}
          {meta.music_url && (
            <MetaBadge icon={Music} label="Music" value="Included" />
          )}
          {isV3 && meta.generation_mode && (
            <MetaBadge icon={Film} label="Mode" value={meta.generation_mode === 'v3_flf' ? 'V3 First+Last Frame' : meta.generation_mode === 'v2_extract' ? 'V2 Extract Last Frame' : meta.generation_mode} />
          )}
          {isV3 && meta.framework && (
            <MetaBadge icon={Hash} label="Framework" value={meta.framework} />
          )}
        </section>

        {/* ── Keyframe Gallery (V3) ──────────────────────────────────────── */}
        {isV3 && keyframes.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Keyframes ({keyframes.length} boundary images)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {keyframes.map((kf, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  {kf.imageUrl && (
                    <img
                      src={kf.imageUrl}
                      alt={`Keyframe ${i}`}
                      className="w-full aspect-[9/16] object-cover"
                    />
                  )}
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-medium text-slate-600">
                      KF {i} {i === 0 ? '(opening)' : i === keyframes.length - 1 ? '(closing)' : `(scene ${i}→${i + 1})`}
                    </p>
                    {kf.imagePrompt && (
                      <p className="text-xs text-slate-500 line-clamp-3">{kf.imagePrompt}</p>
                    )}
                    {kf.motionHint && (
                      <p className="text-xs text-slate-400 italic line-clamp-2">{kf.motionHint}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Scene Breakdown ───────────────────────────────────────────────── */}
        {sceneInputs.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Scene Breakdown ({sceneInputs.length} scenes)
            </h2>
            <div className="space-y-4">
              {sceneInputs.map((scene, i) => {
                const scriptScene = scriptScenes[i] || {};
                const narration = scene.narration || scriptScene.narration_segment || scriptScene.narration || '';

                return (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-start"
                  >
                    {/* Scene number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </div>

                    {/* Thumbnail — V3 shows first+last frame pair, legacy shows single image */}
                    {isV3 && (scene.first_frame_url || scene.last_frame_url) ? (
                      <div className="flex-shrink-0 flex gap-1">
                        {scene.first_frame_url && (
                          <div className="w-16 h-28 rounded-lg overflow-hidden bg-slate-100 relative">
                            <img src={scene.first_frame_url} alt={`Scene ${i + 1} first`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/60 text-white px-1 rounded">1st</span>
                          </div>
                        )}
                        {scene.last_frame_url && (
                          <div className="w-16 h-28 rounded-lg overflow-hidden bg-slate-100 relative">
                            <img src={scene.last_frame_url} alt={`Scene ${i + 1} last`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-black/60 text-white px-1 rounded">last</span>
                          </div>
                        )}
                      </div>
                    ) : scene.image_url ? (
                      <div className="flex-shrink-0 w-20 h-36 rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={scene.image_url}
                          alt={`Scene ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {scene.framework_label && (
                        <p className="text-xs font-semibold text-[#2C666E] uppercase">{scene.framework_label}</p>
                      )}
                      {narration && (
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {narration}
                        </p>
                      )}

                      {/* Clip player */}
                      {(scene.clip_url || scene.video_url) && (
                        <div>
                          {playingClip === i ? (
                            <video
                              src={scene.clip_url || scene.video_url}
                              controls
                              autoPlay
                              className="w-full max-w-xs rounded-lg bg-black"
                              style={{ aspectRatio: '9/16', maxHeight: '240px' }}
                              onEnded={() => setPlayingClip(null)}
                            />
                          ) : (
                            <button
                              onClick={() => setPlayingClip(i)}
                              className="flex items-center gap-1.5 text-xs text-[#2C666E] hover:text-[#07393C] font-medium transition"
                            >
                              <Play className="w-3.5 h-3.5" /> Play clip
                            </button>
                          )}
                        </div>
                      )}

                      {/* Metadata pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {scene.clip_duration && (
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                            {scene.clip_duration}s
                          </span>
                        )}
                        {isV3 && scene.start_time != null && scene.end_time != null && (
                          <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                            {scene.start_time.toFixed(1)}s – {scene.end_time.toFixed(1)}s
                          </span>
                        )}
                        {scene.visual_style && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                            {scene.visual_style}
                          </span>
                        )}
                        {scene.video_model && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                            {scene.video_model}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <section className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
          {videoUrl && (
            <Button
              variant="outline"
              onClick={handleDownload}
              className="text-sm"
            >
              <Download className="w-4 h-4 mr-2" /> Download Video
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => navigate('/campaigns')}
            className="text-sm text-slate-500"
          >
            Back to Campaigns
          </Button>
        </section>

        {/* ── Publish Section ────────────────────────────────────────────── */}
        {isReady && !isPublished && videoUrl && (
          <PublishSection
            draftId={draft.id}
            defaultTitle={meta.script?.title || 'Short'}
          />
        )}
      </main>
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────

function PublishSection({ draftId, defaultTitle }) {
  const [connections, setConnections] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [showOverrides, setShowOverrides] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [scheduleMode, setScheduleMode] = useState('now'); // 'now' | 'schedule'
  const [scheduledFor, setScheduledFor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishResult, setPublishResult] = useState(null); // { queueIds, items } after submission
  const [loadingConnections, setLoadingConnections] = useState(true);
  const pollRef = useRef(null);

  // Fetch connected platforms
  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await apiFetch('/api/accounts/connections');
        const data = await res.json();
        if (data.platforms) setConnections(data.platforms);
        else if (Array.isArray(data)) setConnections(data);
      } catch (err) {
        console.error('[PublishSection] Failed to load connections:', err.message);
      } finally {
        setLoadingConnections(false);
      }
    }
    fetchConnections();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const connectedPlatforms = connections.filter(c => c.connected || c.platform_username);
  const connectedSet = new Set(connectedPlatforms.map(c => c.platform));

  const allPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'linkedin'];

  const togglePlatform = (p) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = async () => {
    if (selectedPlatforms.length === 0) return;
    setIsSubmitting(true);

    const platforms = selectedPlatforms.map(p => ({
      platform: p,
      title: overrides[p]?.title || title,
      description: overrides[p]?.description || description,
      privacy: overrides[p]?.privacy || privacy,
    }));

    try {
      const res = await apiFetch('/api/publish/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draftId,
          platforms,
          scheduled_for: scheduleMode === 'schedule' ? scheduledFor : null,
        }),
      });
      const data = await res.json();
      if (data.queue_ids) {
        setPublishResult({ queueIds: data.queue_ids, items: [] });
        if (scheduleMode === 'now') {
          // Poll for publish status
          pollRef.current = setInterval(async () => {
            try {
              const qRes = await apiFetch('/api/publish/queue');
              const qData = await qRes.json();
              const relevant = (qData.items || []).filter(i => data.queue_ids.includes(i.id));
              setPublishResult(prev => ({ ...prev, items: relevant }));
              const allDone = relevant.every(i => i.status === 'published' || i.status === 'failed');
              if (allDone && relevant.length === data.queue_ids.length) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
            } catch (err) {
              console.error('[PublishSection] Poll error:', err.message);
            }
          }, 5000);
        }
      } else {
        toast.error(data.error || 'Failed to schedule');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show post-submit results
  if (publishResult) {
    const { queueIds, items } = publishResult;
    const allResolved = items.length === queueIds.length && items.every(i => i.status === 'published' || i.status === 'failed');

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">
          {scheduleMode === 'schedule' ? 'Scheduled!' : allResolved ? 'Publishing Complete' : 'Publishing...'}
        </h3>
        {scheduleMode === 'schedule' ? (
          <p className="text-sm text-slate-500">
            Scheduled for {new Date(scheduledFor).toLocaleString()}.{' '}
            <Link to="/publish" className="text-[#2C666E] hover:underline">View Publish Queue</Link>
          </p>
        ) : (
          <div className="space-y-2">
            {items.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Waiting for publisher...
              </div>
            )}
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
                >
                  {PLATFORM_LABELS[item.platform]}
                </span>
                {item.status === 'publishing' && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
                {item.status === 'published' && <span className="text-green-600 text-xs">Published</span>}
                {item.status === 'failed' && <span className="text-red-500 text-xs">Failed: {item.error?.slice(0, 80)}</span>}
                {item.status === 'scheduled' && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
              </div>
            ))}
            {allResolved && (
              <Link to="/publish" className="text-xs text-[#2C666E] hover:underline">View Publish Queue</Link>
            )}
          </div>
        )}
      </div>
    );
  }

  if (loadingConnections) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        <span className="text-sm text-slate-500">Loading platforms...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Publish</h3>

      {/* Platform checkboxes */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Platforms</label>
        <div className="flex flex-wrap gap-2">
          {allPlatforms.map(p => {
            const connected = connectedSet.has(p);
            return (
              <button
                key={p}
                onClick={() => connected && togglePlatform(p)}
                disabled={!connected}
                className={cn(
                  'text-xs py-1.5 px-3 rounded-lg border transition-colors',
                  !connected
                    ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                    : selectedPlatforms.includes(p)
                      ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E] font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {PLATFORM_LABELS[p]}
                {!connected && (
                  <Link to="/settings/accounts" className="text-[10px] text-blue-500 ml-1" onClick={e => e.stopPropagation()}>
                    Connect
                  </Link>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Default metadata */}
      {selectedPlatforms.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Privacy</label>
              <select
                value={privacy}
                onChange={e => setPrivacy(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {/* Per-platform overrides toggle */}
          <button
            onClick={() => setShowOverrides(!showOverrides)}
            className="text-xs text-[#2C666E] hover:underline"
          >
            {showOverrides ? 'Hide per-platform overrides' : 'Customize per platform'}
          </button>

          {showOverrides && (
            <div className="space-y-3 pl-3 border-l-2 border-slate-100">
              {selectedPlatforms.map(p => (
                <div key={p} className="space-y-2">
                  <span className="text-xs font-semibold text-slate-600">{PLATFORM_LABELS[p]}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder={title}
                      value={overrides[p]?.title || ''}
                      onChange={e => setOverrides(prev => ({ ...prev, [p]: { ...prev[p], title: e.target.value } }))}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                    />
                    <select
                      value={overrides[p]?.privacy || privacy}
                      onChange={e => setOverrides(prev => ({ ...prev, [p]: { ...prev[p], privacy: e.target.value } }))}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                    >
                      {(PRIVACY_OPTIONS[p] || [{ value: 'public', label: 'Public' }]).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Schedule picker */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="scheduleMode"
                checked={scheduleMode === 'now'}
                onChange={() => setScheduleMode('now')}
                className="accent-[#2C666E]"
              />
              Publish Now
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="scheduleMode"
                checked={scheduleMode === 'schedule'}
                onChange={() => setScheduleMode('schedule')}
                className="accent-[#2C666E]"
              />
              Schedule
            </label>
            {scheduleMode === 'schedule' && (
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={e => setScheduledFor(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
              />
            )}
          </div>

          {/* Action button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedPlatforms.length === 0 || (scheduleMode === 'schedule' && !scheduledFor)}
            className="w-full bg-[#2C666E] hover:bg-[#2C666E]/90 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : scheduleMode === 'schedule' ? (
              `Schedule to ${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}`
            ) : (
              `Publish Now to ${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}`
            )}
          </button>
        </>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const colors = {
    draft: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    published: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    generating: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
      {status === 'generating' || status === 'processing' ? (
        <span className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> {status}
        </span>
      ) : (
        status
      )}
    </span>
  );
}

function MetaBadge({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
      <Icon className="w-4 h-4 text-slate-400" />
      <div>
        <p className="text-xs text-slate-400 leading-none">{label}</p>
        <p className="text-sm text-slate-700 font-medium truncate max-w-[160px]">{value}</p>
      </div>
    </div>
  );
}
