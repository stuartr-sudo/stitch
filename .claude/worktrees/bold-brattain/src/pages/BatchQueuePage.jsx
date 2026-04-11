/**
 * BatchQueuePage — /shorts/batch (new) and /shorts/batch/:batchId (progress/results)
 *
 * Phase 1: Select niche → discover topics → cherry-pick → shared config → Start Batch
 * Phase 2: Live progress grid (poll every 5s while running)
 * Phase 3: Results grid with video previews and Edit links
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Play, ExternalLink, ChevronLeft, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Niche options (matches ShortsWorkbenchPage) ────────────────────────────────
const NICHES = [
  { key: 'ai_tech_news', label: 'AI & Tech News' },
  { key: 'finance_money', label: 'Finance & Money' },
  { key: 'motivation', label: 'Motivation' },
  { key: 'horror_creepy', label: 'Horror & Creepy' },
  { key: 'history_era', label: 'History' },
  { key: 'crime_mystery', label: 'Crime & Mystery' },
  { key: 'science_nature', label: 'Science & Nature' },
  { key: 'dating_relationships', label: 'Dating & Relationships' },
  { key: 'fitness_health', label: 'Fitness & Health' },
  { key: 'gaming', label: 'Gaming' },
  { key: 'conspiracy', label: 'Conspiracy' },
  { key: 'business_startup', label: 'Business & Startups' },
  { key: 'food_cooking', label: 'Food & Cooking' },
  { key: 'travel', label: 'Travel' },
  { key: 'psychology', label: 'Psychology' },
  { key: 'space_cosmos', label: 'Space & Cosmos' },
  { key: 'animals_nature', label: 'Animals & Nature' },
  { key: 'sports', label: 'Sports' },
  { key: 'education', label: 'Education' },
  { key: 'paranormal_ufo', label: 'Paranormal & UFO' },
];

const VOICES = [
  'Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede', 'Leda', 'Orus', 'Zephyr',
  'Achird', 'Algenib', 'Algieba', 'Alnilam', 'Auva', 'Callirrhoe',
];

const DURATION_OPTIONS = ['15s', '30s', '45s', '60s'];
const VIDEO_MODELS = [
  { key: 'fal_veo3', label: 'Veo 3.1 Fast' },
  { key: 'fal_kling', label: 'Kling 2.0' },
  { key: 'fal_wan25', label: 'Wan 2.5' },
];
const CAPTION_PRESETS = ['word_pop', 'karaoke_glow', 'word_highlight', 'news_ticker'];

const TRENDING_COLOR = { high: 'bg-green-100 text-green-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-slate-100 text-slate-500' };
const COMPETITION_COLOR = { high: 'bg-red-100 text-red-600', medium: 'bg-orange-100 text-orange-600', low: 'bg-blue-100 text-blue-700' };

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

const STATUS_BADGE = {
  pending: 'bg-slate-100 text-slate-500',
  running: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
};

// ── Phase 1: Configure ─────────────────────────────────────────────────────────
function ConfigurePhase({ onBatchCreated }) {
  const [niche, setNiche] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [config, setConfig] = useState({
    voice: 'Kore',
    voiceSpeed: 1.15,
    visualStyle: 'cinematic_realism',
    duration: '30s',
    videoModel: 'fal_veo3',
    framework: null,
    captionConfig: { preset: 'word_pop' },
  });

  const handleDiscoverTopics = async () => {
    if (!niche) return;
    setIsDiscovering(true);
    setTopics([]);
    setSelectedIndices([]);
    try {
      const res = await apiFetch('/api/shorts/discover-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, count: 8 }),
      });
      const data = await res.json();
      if (data.topics) {
        setTopics(data.topics);
      } else {
        toast.error(data.error || 'Topic discovery failed');
      }
    } catch (err) {
      toast.error(err.message || 'Topic discovery failed');
    } finally {
      setIsDiscovering(false);
    }
  };

  const toggleTopic = (i) => {
    setSelectedIndices(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  };

  const handleStartBatch = async () => {
    if (selectedIndices.length === 0) return;
    setIsStarting(true);
    try {
      const selectedTopics = selectedIndices.map(i => ({
        title: topics[i].title,
        story_context: topics[i].story_context,
      }));
      const res = await apiFetch('/api/batch/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, topics: selectedTopics, config }),
      });
      const data = await res.json();
      if (data.batch_id) {
        onBatchCreated(data.batch_id);
      } else {
        toast.error(data.error || 'Failed to start batch');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to start batch');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Batch Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Produce multiple shorts in a single run</p>
        </div>
        <Link to="/shorts/workbench" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to Workbench
        </Link>
      </div>

      {/* Step 1: Pick Niche */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">1. Pick a Niche</h2>
        <div className="grid grid-cols-4 gap-2">
          {NICHES.map(n => (
            <button
              key={n.key}
              onClick={() => { setNiche(n.key); setTopics([]); setSelectedIndices([]); }}
              className={cn(
                'text-xs py-2 px-3 rounded-lg border transition-colors text-left',
                niche === n.key
                  ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E] font-medium'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              {n.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleDiscoverTopics}
          disabled={!niche || isDiscovering}
          className="mt-4 bg-[#2C666E] hover:bg-[#2C666E]/90 text-white text-sm font-medium py-2 px-4 rounded-lg disabled:opacity-50 flex items-center gap-2"
        >
          {isDiscovering ? <><Loader2 className="w-4 h-4 animate-spin" /> Discovering...</> : '🔍 Discover Topics'}
        </button>
      </div>

      {/* Topic Cards */}
      {topics.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">2. Select Topics</h2>
            <span className="text-xs text-slate-500">{selectedIndices.length} of {topics.length} selected</span>
          </div>
          <div className="space-y-2">
            {topics.map((topic, i) => (
              <div
                key={i}
                onClick={() => toggleTopic(i)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedIndices.includes(i)
                    ? 'border-[#2C666E] bg-[#2C666E]/5'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedIndices.includes(i)}
                  onChange={() => toggleTopic(i)}
                  onClick={e => e.stopPropagation()}
                  className="mt-0.5 accent-[#2C666E]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{topic.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{topic.summary}</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', TRENDING_COLOR[topic.trending_score])}>
                      ↑ {topic.trending_score}
                    </span>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', COMPETITION_COLOR[topic.competition_score])}>
                      ⚔ {topic.competition_score} competition
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Config */}
      {topics.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">3. Shared Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Voice</label>
              <select
                value={config.voice}
                onChange={e => setConfig(c => ({ ...c, voice: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              >
                {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Voice Speed</label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="80" max="160" value={Math.round(config.voiceSpeed * 100)}
                  onChange={e => setConfig(c => ({ ...c, voiceSpeed: Number(e.target.value) / 100 }))}
                  className="flex-1 h-1 accent-[#2C666E]"
                />
                <span className="text-xs text-slate-500 w-10">{config.voiceSpeed.toFixed(2)}×</span>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Duration</label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setConfig(c => ({ ...c, duration: d }))}
                    className={cn(
                      'flex-1 text-xs py-1.5 rounded-lg border transition-colors',
                      config.duration === d ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'border-slate-200 text-slate-600'
                    )}
                  >{d}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Video Model</label>
              <select
                value={config.videoModel}
                onChange={e => setConfig(c => ({ ...c, videoModel: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              >
                {VIDEO_MODELS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Captions</label>
              <select
                value={config.captionConfig?.preset || 'word_pop'}
                onChange={e => setConfig(c => ({ ...c, captionConfig: { preset: e.target.value } }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              >
                {CAPTION_PRESETS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Start button */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={handleStartBatch}
              disabled={selectedIndices.length === 0 || isStarting}
              className="w-full bg-[#2C666E] hover:bg-[#2C666E]/90 text-white font-semibold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isStarting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                : `🚀 Start Batch (${selectedIndices.length})`
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Schedule All Section ───────────────────────────────────────────────────────
function ScheduleAllSection({ jobs }) {
  const [connections, setConnections] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [titleTemplate, setTitleTemplate] = useState('{topic}');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [scheduleMode, setScheduleMode] = useState('now');
  const [scheduledFor, setScheduledFor] = useState('');
  const [stagger, setStagger] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);

  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await apiFetch('/api/accounts/connections');
        const data = await res.json();
        if (data.platforms) setConnections(data.platforms);
        else if (Array.isArray(data)) setConnections(data);
      } catch (err) {
        console.error('[ScheduleAll] Failed to load connections:', err.message);
      } finally {
        setLoadingConnections(false);
      }
    }
    fetchConnections();
  }, []);

  const connectedSet = new Set(connections.filter(c => c.connected || c.platform_username).map(c => c.platform));
  const allPlatforms = ['youtube', 'tiktok', 'instagram', 'facebook', 'linkedin'];
  const completedJobs = jobs.filter(j => j.status === 'completed' && j.draft_id);

  const togglePlatform = (p) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleScheduleAll = async () => {
    if (selectedPlatforms.length === 0 || completedJobs.length === 0) return;
    setIsSubmitting(true);

    const baseTime = scheduleMode === 'schedule' ? new Date(scheduledFor) : new Date();
    let successCount = 0;

    for (let i = 0; i < completedJobs.length; i++) {
      const job = completedJobs[i];
      const jobTitle = titleTemplate.replace(/\{topic\}/g, job.topic || 'Untitled');
      const publishTime = stagger
        ? new Date(baseTime.getTime() + i * 60 * 60 * 1000) // +1 hour per draft
        : baseTime;

      const platforms = selectedPlatforms.map(p => ({
        platform: p,
        title: jobTitle,
        description,
        privacy,
      }));

      try {
        const res = await apiFetch('/api/publish/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draft_id: job.draft_id,
            platforms,
            scheduled_for: scheduleMode === 'schedule' || stagger ? publishTime.toISOString() : null,
          }),
        });
        const data = await res.json();
        if (data.queue_ids) successCount++;
      } catch (err) {
        console.error(`[ScheduleAll] Failed for draft ${job.draft_id}:`, err.message);
      }
    }

    setIsSubmitting(false);
    setSubmitted(true);
    if (successCount < completedJobs.length) {
      toast.error(`Scheduled ${successCount} of ${completedJobs.length} — some failed`);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
        All videos scheduled!{' '}
        <Link to="/publish" className="text-[#2C666E] hover:underline font-medium">View Publish Queue</Link>
      </div>
    );
  }

  if (loadingConnections) return null;
  if (completedJobs.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[#2C666E]" />
        <h3 className="text-sm font-semibold text-slate-700">Schedule All</h3>
      </div>

      {/* Platform checkboxes */}
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
                !connected ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                  : selectedPlatforms.includes(p)
                    ? 'border-[#2C666E] bg-[#2C666E]/5 text-[#2C666E] font-medium'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
              )}
            >
              {PLATFORM_LABELS[p]}
            </button>
          );
        })}
      </div>

      {selectedPlatforms.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Title Template</label>
              <input
                type="text"
                value={titleTemplate}
                onChange={e => setTitleTemplate(e.target.value)}
                placeholder="{topic}"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Use {'{topic}'} for each video's topic</p>
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

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none"
            />
          </div>

          {/* Schedule + stagger */}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="batchSchedule" checked={scheduleMode === 'now'} onChange={() => setScheduleMode('now')} className="accent-[#2C666E]" />
              Publish Now
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="batchSchedule" checked={scheduleMode === 'schedule'} onChange={() => setScheduleMode('schedule')} className="accent-[#2C666E]" />
              Schedule
            </label>
            {scheduleMode === 'schedule' && (
              <input type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5" />
            )}
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer ml-auto">
              <input type="checkbox" checked={stagger} onChange={e => setStagger(e.target.checked)} className="accent-[#2C666E]" />
              Space 1 hour apart
            </label>
          </div>

          <button
            onClick={handleScheduleAll}
            disabled={isSubmitting || selectedPlatforms.length === 0}
            className="w-full bg-[#2C666E] hover:bg-[#2C666E]/90 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</>
              : `Schedule ${completedJobs.length} Video${completedJobs.length > 1 ? 's' : ''}`
            }
          </button>
        </>
      )}
    </div>
  );
}

// ── Phase 2+3: Progress / Results ─────────────────────────────────────────────
function ProgressPhase({ batchId }) {
  const [batch, setBatch] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await apiFetch(`/api/batch/${batchId}`);
      const data = await res.json();
      if (data.batch) {
        setBatch(data.batch);
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('[BatchQueue] Poll error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, 5000);
    return () => clearInterval(intervalRef.current);
  }, [batchId]);

  // Stop polling when done
  useEffect(() => {
    if (batch?.status === 'completed') {
      clearInterval(intervalRef.current);
    }
  }, [batch?.status]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!batch) {
    return <div className="text-center text-slate-500 py-16">Batch not found</div>;
  }

  const isDone = batch.status === 'completed';
  const progress = batch.total_items > 0
    ? Math.round(((batch.completed_items + batch.failed_items) / batch.total_items) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isDone ? '✅ Batch Complete' : '⚡ Batch Running'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{batch.niche}</p>
        </div>
        <Link to="/shorts/batch" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> New Batch
        </Link>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            {batch.completed_items} of {batch.total_items} complete
            {batch.failed_items > 0 && <span className="text-red-500 ml-2">({batch.failed_items} failed)</span>}
          </span>
          <span className="text-sm font-bold text-[#2C666E]">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-[#2C666E] h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Job grid */}
      <div className="grid grid-cols-1 gap-3">
        {jobs.map(job => (
          <div key={job.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              {/* Status / Thumbnail */}
              <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                {job.final_video_url ? (
                  <video src={job.final_video_url} className="w-full h-full object-cover" muted playsInline />
                ) : job.status === 'running' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : job.status === 'pending' ? (
                  <span className="text-[10px] text-slate-400">Queued</span>
                ) : job.status === 'failed' ? (
                  <span className="text-lg">❌</span>
                ) : (
                  <span className="text-lg">⏳</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-slate-800 truncate">{job.topic}</p>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0', STATUS_BADGE[job.status])}>
                    {job.status}
                  </span>
                </div>

                {/* Progress bar for running jobs */}
                {job.status === 'running' && (
                  <div className="mb-1">
                    <div className="w-full bg-slate-100 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all"
                        style={{ width: `${((job.completed_steps || 0) / (job.total_steps || 10)) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Step {job.completed_steps || 0}/{job.total_steps || 10} — {(job.current_step || '').replace(/_/g, ' ')}
                    </p>
                  </div>
                )}

                {/* Error message */}
                {job.status === 'failed' && job.error && (
                  <p className="text-xs text-red-500 mt-1">{job.error.slice(0, 120)}</p>
                )}

                {/* Completed actions */}
                {job.status === 'completed' && job.draft_id && (
                  <div className="flex items-center gap-3 mt-1">
                    <Link
                      to={`/shorts/workbench?draft=${job.draft_id}`}
                      className="text-xs text-[#2C666E] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Edit in Workbench
                    </Link>
                    {job.final_video_url && (
                      <a
                        href={job.final_video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" /> Preview
                      </a>
                    )}
                    {job.draft_id && (
                      <Link
                        to={`/shorts/draft/${job.draft_id}`}
                        className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        <Calendar className="w-3 h-3" /> Schedule
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary when done */}
      {isDone && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
            Batch complete — {batch.completed_items} succeeded, {batch.failed_items} failed.
            {batch.failed_items > 0 && ' Failed items can be retried individually in the Workbench.'}
          </div>
          <ScheduleAllSection jobs={jobs} />
        </>
      )}
    </div>
  );
}

// ── Root component — decides which phase to show ───────────────────────────────
export default function BatchQueuePage() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const handleBatchCreated = (id) => {
    navigate(`/shorts/batch/${id}`);
  };

  if (batchId) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <ProgressPhase batchId={batchId} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <ConfigurePhase onBatchCreated={handleBatchCreated} />
    </div>
  );
}
