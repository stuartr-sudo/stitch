import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShortsWizard } from '@/contexts/ShortsWizardContext';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

function SummaryRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0 mr-4">{label}</span>
      <span className="text-sm text-slate-700 text-right font-medium">{value}</span>
    </div>
  );
}

export default function ReviewGenerateStep() {
  const navigate = useNavigate();
  const wizard = useShortsWizard();
  const {
    niche, visualStyle, primaryTopic, topics, videoLengthPreset,
    script, videoModel, motionStyle, voiceId, musicMood, captionStyle, previewImage,
  } = wizard;

  const [mode, setMode] = useState('review'); // 'review' | 'progress' | 'completed' | 'failed'
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  // Kick off generation
  const handleGenerate = async () => {
    setMode('progress');
    setError(null);
    try {
      const res = await apiFetch('/api/campaigns/create', {
        method: 'POST',
        body: JSON.stringify({
          content_type: 'shorts',
          niche,
          topic: primaryTopic,
          topics,
          video_length_preset: videoLengthPreset,
          script,
          visual_style: visualStyle,
          video_model: videoModel,
          motion_style: motionStyle,
          voice_id: voiceId,
          music_mood: musicMood,
          caption_style: captionStyle,
          preview_image: previewImage,
        }),
      });
      const data = await res.json();
      const id = data.job_id || data.jobId || data.id;
      if (!id) {
        setError('No job ID returned from server.');
        setMode('failed');
        return;
      }
      setJobId(id);
    } catch (err) {
      setError(err.message || 'Failed to start generation.');
      setMode('failed');
    }
  };

  // Poll for progress
  useEffect(() => {
    if (!jobId || mode !== 'progress') return;

    const poll = async () => {
      try {
        const res = await apiFetch(`/api/jobs/poll?id=${jobId}`);
        const data = await res.json();
        setProgress(data);

        if (data.status === 'completed') {
          setMode('completed');
          clearInterval(pollRef.current);
        } else if (data.status === 'failed') {
          setError(data.error || data.last_error || 'Job failed.');
          setMode('failed');
          clearInterval(pollRef.current);
        }
      } catch {
        // Ignore transient poll errors
      }
    };

    poll(); // immediate first poll
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [jobId, mode]);

  // Derive progress info
  const currentStep = progress?.current_step || progress?.step || '';
  const stepResults = progress?.step_results || {};
  const totalScenes = script?.scenes?.length || 0;
  const completedScenes = Object.keys(stepResults).filter((k) => k.startsWith('scene_')).length;
  const progressPct = progress?.progress || 0;

  // Review mode
  if (mode === 'review') {
    return (
      <div className="max-w-2xl mx-auto w-full p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Review & Generate</h2>
        <p className="text-sm text-slate-500 mb-6">Confirm your settings and start generating your short.</p>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <SummaryRow label="Niche" value={niche} />
          <SummaryRow label="Primary Topic" value={primaryTopic} />
          <SummaryRow label="Topics" value={(topics || []).length ? `${topics.length} selected` : null} />
          <SummaryRow label="Video Length" value={videoLengthPreset ? `${videoLengthPreset}s` : null} />
          <SummaryRow label="Script" value={script?.title || (script ? 'Generated' : 'Not set')} />
          <SummaryRow label="Visual Style" value={visualStyle} />
          <SummaryRow label="Video Model" value={videoModel} />
          <SummaryRow label="Motion Style" value={motionStyle} />
          <SummaryRow label="Voice" value={voiceId ? 'Selected' : 'Not set'} />
          <SummaryRow label="Music Mood" value={musicMood || 'Not set'} />
          <SummaryRow label="Captions" value={captionStyle} />
          <SummaryRow label="Preview Image" value={previewImage ? 'Generated' : 'Not set'} />
        </div>

        {previewImage && (
          <div className="rounded-xl overflow-hidden border border-slate-200 mb-6">
            <img src={previewImage} alt="Preview" className="w-full object-contain max-h-48" />
          </div>
        )}

        <Button
          onClick={handleGenerate}
          size="lg"
          className="w-full bg-[#2C666E] hover:bg-[#24555c] text-white"
        >
          Generate Short
        </Button>
      </div>
    );
  }

  // Progress mode
  if (mode === 'progress') {
    return (
      <div className="max-w-md mx-auto w-full p-6 flex flex-col items-center justify-center py-16">
        <Loader2 className="w-12 h-12 animate-spin text-[#2C666E] mb-6" />
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Generating your short...</h2>
        {currentStep && (
          <p className="text-sm text-slate-500 mb-4 capitalize">{currentStep.replace(/_/g, ' ')}</p>
        )}
        {/* Progress bar */}
        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-3">
          <div
            className="bg-[#2C666E] h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-400">
          {progressPct > 0 && `${Math.round(progressPct)}%`}
          {totalScenes > 0 && completedScenes > 0 && ` — Scene ${completedScenes}/${totalScenes}`}
        </p>
      </div>
    );
  }

  // Completed
  if (mode === 'completed') {
    return (
      <div className="max-w-md mx-auto w-full p-6 flex flex-col items-center justify-center py-16">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Short Generated!</h2>
        <p className="text-sm text-slate-500 mb-6">Your video has been created successfully.</p>
        <Button
          onClick={() => navigate('/campaigns')}
          className="bg-[#2C666E] hover:bg-[#24555c] text-white"
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          View in Campaigns
        </Button>
      </div>
    );
  }

  // Failed
  return (
    <div className="max-w-md mx-auto w-full p-6 flex flex-col items-center justify-center py-16">
      <XCircle className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Generation Failed</h2>
      <p className="text-sm text-red-600 mb-6 text-center">{error || 'An unknown error occurred.'}</p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setMode('review')}>
          Back to Review
        </Button>
        <Button
          onClick={handleGenerate}
          className="bg-[#2C666E] hover:bg-[#24555c] text-white"
        >
          Retry
        </Button>
      </div>
    </div>
  );
}
