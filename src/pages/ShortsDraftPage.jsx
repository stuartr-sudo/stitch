import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Loader2, Download, Play, Youtube, Send,
  Calendar, Hash, Palette, Film, Volume2, Music,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api';
import YouTubePublishModal from '@/components/modals/YouTubePublishModal';

export default function ShortsDraftPage() {
  const { draftId } = useParams(); // may be a draft ID or campaign ID
  const navigate = useNavigate();
  const { user } = useAuth();

  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showYouTubePublish, setShowYouTubePublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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
        const { data: job } = await supabase
          .from('jobs')
          .select('id, status, current_step, total_steps, completed_steps, last_error')
          .eq('campaign_id', draftId)
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
              .eq('campaign_id', draftId)
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

  // ── Publish handler ──────────────────────────────────────────────────────────
  const handlePublishNow = async () => {
    if (!confirm('Publish this draft now?')) return;
    setIsPublishing(true);
    try {
      const res = await apiFetch('/api/campaigns/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draft.id, action: 'publish_now' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Published!');
      setDraft(prev => ({ ...prev, ...data.draft }));
    } catch (err) {
      toast.error(err.message || 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

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
      research: 'Researching topic…',
      script: 'Writing script…',
      images: 'Generating images…',
      videos: 'Animating scenes…',
      voiceover: 'Creating voiceover…',
      music: 'Generating music…',
      captions: 'Adding captions…',
      assembly: 'Assembling video…',
      finalizing: 'Finalizing draft…',
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
        </section>

        {/* ── Scene Breakdown ───────────────────────────────────────────────── */}
        {sceneInputs.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Scene Breakdown ({sceneInputs.length} scenes)
            </h2>
            <div className="space-y-4">
              {sceneInputs.map((scene, i) => {
                const scriptScene = scriptScenes[i] || {};
                const narration = scriptScene.narration_segment || scriptScene.narration || '';

                return (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-start"
                  >
                    {/* Scene number */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </div>

                    {/* Thumbnail */}
                    {scene.image_url && (
                      <div className="flex-shrink-0 w-20 h-36 rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={scene.image_url}
                          alt={`Scene ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {narration && (
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {narration}
                        </p>
                      )}

                      {/* Clip player */}
                      {scene.clip_url && (
                        <div>
                          {playingClip === i ? (
                            <video
                              src={scene.clip_url}
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

          {isReady && !isPublished && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowYouTubePublish(true)}
                className="text-sm"
              >
                <Youtube className="w-4 h-4 mr-2 text-red-600" /> YouTube
              </Button>

              <Button
                onClick={handlePublishNow}
                disabled={isPublishing}
                className="bg-[#2C666E] hover:bg-[#07393C] text-white text-sm"
              >
                {isPublishing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Publish
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            onClick={() => navigate('/campaigns')}
            className="text-sm text-slate-500"
          >
            Back to Campaigns
          </Button>
        </section>
      </main>

      {/* ── YouTube Publish Modal ──────────────────────────────────────────── */}
      {showYouTubePublish && (
        <YouTubePublishModal
          draftId={draft.id}
          brandUsername={draft.brand_username}
          campaignName={meta.script?.title || 'Short'}
          scriptText={meta.script?.narration_full || ''}
          onClose={() => setShowYouTubePublish(false)}
          onPublished={(updated) => {
            setDraft(prev => ({ ...prev, ...updated }));
            setShowYouTubePublish(false);
          }}
        />
      )}
    </div>
  );
}

// ── Helper Components ────────────────────────────────────────────────────────

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
