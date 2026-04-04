import React, { useState } from 'react';
import { SlideOverPanel, SlideOverBody } from '@/components/ui/slide-over-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Film,
  Clock,
  Eye,
  Music,
  Lightbulb,
  ArrowRight,
  Copy,
  Image as ImageIcon,
  Zap,
  Microscope,
  Palette,
  Move,
  Star,
  Type,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
          {Icon && <Icon className="w-4 h-4 text-[#2C666E] dark:text-[#5AABB5]" />}
          {title}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 space-y-2">{children}</div>}
    </div>
  );
}

export default function VideoAnalyzerModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [analysisMode, setAnalysisMode] = useState('quick'); // 'quick' or 'deep'

  const handleAnalyze = async () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    setLoading(true);
    setResult(null);

    const isDeep = analysisMode === 'deep';
    setProgress(isDeep
      ? 'Extracting 12 frames and transcribing audio (deep analysis)...'
      : 'Extracting frames and transcribing audio...'
    );

    const endpoint = isDeep ? '/api/analyze/video-gemini' : '/api/analyze/video';

    try {
      const data = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: videoUrl.trim(), duration_seconds: Number(duration) || 30 }),
      });

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setResult(data);
      setProgress('');
    } catch (err) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRecreate = () => {
    if (!result?.analysis?.recreation_config) return;
    const config = result.analysis.recreation_config;
    const params = new URLSearchParams({
      niche: config.niche_suggestion || '',
      duration: String(config.duration || 30),
      topic: `Recreate: ${config.framework_suggestion} style, ${config.music_mood} mood`,
    });
    navigate(`/shorts/workbench?${params.toString()}`);
    onClose();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const analysis = result?.analysis;

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Video Analyzer"
      subtitle="Paste a video URL to get a full structural breakdown"
      icon={<Search className="w-5 h-5" />}
    >
      <SlideOverBody>
        <div className="space-y-6">
          {/* Input Section */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-700">Video URL</Label>
              <Input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://example.com/video.mp4"
                className="mt-1"
                disabled={loading}
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Estimated Duration (seconds)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min={5}
                max={120}
                className="mt-1 w-32"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">Used for frame timing. Doesn't need to be exact.</p>
            </div>
            {/* Analysis Mode Toggle */}
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Analysis Mode</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAnalysisMode('quick')}
                  disabled={loading}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    analysisMode === 'quick'
                      ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E] dark:bg-[#2C666E]/20 dark:text-[#5AABB5]'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Quick Analysis
                </button>
                <button
                  onClick={() => setAnalysisMode('deep')}
                  disabled={loading}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    analysisMode === 'deep'
                      ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E] dark:bg-[#2C666E]/20 dark:text-[#5AABB5]'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <Microscope className="w-4 h-4" />
                  Deep Analysis
                </button>
              </div>
              {analysisMode === 'deep' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                  12-frame sampling with scene transitions, color grading, motion analysis, and production scoring. Takes ~30s.
                </p>
              )}
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={loading || !videoUrl.trim()}
              className="bg-[#2C666E] hover:bg-[#07393C] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  {analysisMode === 'deep' ? <Microscope className="w-4 h-4 mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                  {analysisMode === 'deep' ? 'Deep Analyze Video' : 'Analyze Video'}
                </>
              )}
            </Button>
            {loading && progress && (
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                {progress}
              </p>
            )}
          </div>

          {/* Extracted Frames Preview */}
          {result?.frames?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Extracted Frames ({result.frames.length})
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {result.frames.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Frame ${i + 1}`}
                    className="rounded-md border border-gray-200 w-full aspect-video object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {analysis && (
            <div className="space-y-3">
              {/* Script Structure */}
              <CollapsibleSection title="Script Structure" icon={Film} defaultOpen={true}>
                <div className="space-y-2">
                  {Object.entries(analysis.script_structure).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium text-gray-800 capitalize">{key}:</span>{' '}
                      <span className="text-gray-600">{value}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Scenes */}
              <CollapsibleSection title={`Scenes (${analysis.scenes?.length || 0})`} icon={Clock}>
                <div className="space-y-3">
                  {analysis.scenes?.map((scene, i) => (
                    <div key={i} className="border-l-2 border-[#2C666E] pl-3 space-y-1">
                      <div className="font-medium text-gray-800">{scene.timestamp}</div>
                      <div className="text-gray-600">{scene.description}</div>
                      <div className="text-xs text-gray-400">
                        {scene.camera} | {scene.framing} | {scene.movement}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>

              {/* Pacing */}
              <CollapsibleSection title="Pacing" icon={Clock}>
                <div>
                  <span className="font-medium">Avg scene duration:</span> {analysis.pacing?.avg_scene_duration}s
                </div>
                <div>
                  <span className="font-medium">Rhythm:</span> {analysis.pacing?.rhythm}
                </div>
              </CollapsibleSection>

              {/* Visual Style */}
              <CollapsibleSection title="Visual Style" icon={Eye}>
                <div>
                  <span className="font-medium">Palette:</span> {analysis.visual_style?.palette}
                </div>
                <div>
                  <span className="font-medium">Lighting:</span> {analysis.visual_style?.lighting}
                </div>
                <div>
                  <span className="font-medium">Mood:</span> {analysis.visual_style?.mood}
                </div>
              </CollapsibleSection>

              {/* Audio */}
              <CollapsibleSection title="Audio Design" icon={Music}>
                <div>
                  <span className="font-medium">Music:</span> {analysis.audio?.music_type}
                </div>
                <div>
                  <span className="font-medium">Voiceover:</span> {analysis.audio?.voiceover_style}
                </div>
                <div>
                  <span className="font-medium">SFX:</span> {analysis.audio?.sfx}
                </div>
              </CollapsibleSection>

              {/* What Works */}
              <CollapsibleSection title="What Works" icon={Lightbulb} defaultOpen={true}>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.what_works?.map((item, i) => (
                    <li key={i} className="text-gray-600">{item}</li>
                  ))}
                </ul>
              </CollapsibleSection>

              {/* Deep Analysis: Scene Transitions */}
              {analysis.scene_transitions?.length > 0 && (
                <CollapsibleSection title={`Scene Transitions (${analysis.scene_transitions.length})`} icon={Film}>
                  <div className="space-y-2">
                    {analysis.scene_transitions.map((t, i) => (
                      <div key={i} className="flex items-start gap-3 border-l-2 border-purple-400 pl-3">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap mt-0.5">{t.timestamp}</span>
                        <div>
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 capitalize">{t.type}</span>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">{t.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Deep Analysis: Text Overlays */}
              {analysis.text_overlays?.length > 0 && (
                <CollapsibleSection title={`Text Overlays (${analysis.text_overlays.length})`} icon={Type}>
                  <div className="space-y-2">
                    {analysis.text_overlays.map((overlay, i) => (
                      <div key={i} className="border-l-2 border-blue-400 pl-3 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{overlay.timestamp}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{overlay.position}</span>
                        </div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">"{overlay.text}"</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{overlay.style}</div>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Deep Analysis: Color Grading */}
              {analysis.color_grading && (
                <CollapsibleSection title="Color Grading" icon={Palette}>
                  <div className="space-y-2">
                    {analysis.color_grading.dominant_palette?.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-800 dark:text-gray-200">Palette:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {analysis.color_grading.dominant_palette.map((color, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                              {color}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">Contrast:</span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{analysis.color_grading.contrast}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">Saturation:</span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{analysis.color_grading.saturation}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-800 dark:text-gray-200">Mood:</span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">{analysis.color_grading.mood}</span>
                    </div>
                  </div>
                </CollapsibleSection>
              )}

              {/* Deep Analysis: Motion Analysis */}
              {analysis.motion_analysis?.length > 0 && (
                <CollapsibleSection title={`Motion Analysis (${analysis.motion_analysis.length} scenes)`} icon={Move}>
                  <div className="space-y-2">
                    {analysis.motion_analysis.map((m, i) => (
                      <div key={i} className="border-l-2 border-green-400 pl-3 space-y-0.5">
                        <div className="font-medium text-gray-800 dark:text-gray-200 text-xs">{m.scene}</div>
                        <div className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Camera:</span> {m.camera_movement}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Subject:</span> {m.subject_movement}
                        </div>
                        <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          {m.speed}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}

              {/* Deep Analysis: Production Quality */}
              {analysis.production_quality && (
                <CollapsibleSection title="Production Quality" icon={Star} defaultOpen={true}>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Lighting', score: analysis.production_quality.lighting },
                        { label: 'Composition', score: analysis.production_quality.composition },
                        { label: 'Audio Mix', score: analysis.production_quality.audio_mix },
                        { label: 'Overall', score: analysis.production_quality.overall_score },
                      ].map(({ label, score }) => (
                        <div key={label} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${(score / 10) * 100}%`,
                                  backgroundColor: score >= 8 ? '#22c55e' : score >= 6 ? '#eab308' : score >= 4 ? '#f97316' : '#ef4444',
                                }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 w-6 text-right">{score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {analysis.production_quality.notes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">{analysis.production_quality.notes}</p>
                    )}
                  </div>
                </CollapsibleSection>
              )}

              {/* Transcript */}
              {result.transcript && (
                <CollapsibleSection title="Transcript" icon={Film}>
                  <div className="relative">
                    <p className="text-gray-600 whitespace-pre-wrap text-xs leading-relaxed max-h-40 overflow-y-auto">
                      {result.transcript}
                    </p>
                    <button
                      onClick={() => copyToClipboard(result.transcript)}
                      className="absolute top-0 right-0 p-1 text-gray-400 hover:text-gray-600"
                      title="Copy transcript"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CollapsibleSection>
              )}

              {/* Recreation Config */}
              {analysis.recreation_config && (
                <div className="border border-[#2C666E]/20 rounded-lg bg-[#2C666E]/5 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-[#2C666E] flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Recreation Config
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="font-medium text-gray-700">Niche:</span> <span className="text-gray-600">{analysis.recreation_config.niche_suggestion}</span></div>
                    <div><span className="font-medium text-gray-700">Framework:</span> <span className="text-gray-600">{analysis.recreation_config.framework_suggestion}</span></div>
                    <div><span className="font-medium text-gray-700">Style:</span> <span className="text-gray-600">{analysis.recreation_config.video_style_suggestion}</span></div>
                    <div><span className="font-medium text-gray-700">Scenes:</span> <span className="text-gray-600">{analysis.recreation_config.scene_count}</span></div>
                    <div><span className="font-medium text-gray-700">Duration:</span> <span className="text-gray-600">{analysis.recreation_config.duration}s</span></div>
                    <div><span className="font-medium text-gray-700">Music:</span> <span className="text-gray-600">{analysis.recreation_config.music_mood}</span></div>
                  </div>
                  <Button
                    onClick={handleRecreate}
                    className="w-full bg-[#2C666E] hover:bg-[#07393C] text-white mt-2"
                  >
                    Recreate in Shorts Workbench
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SlideOverBody>
    </SlideOverPanel>
  );
}
