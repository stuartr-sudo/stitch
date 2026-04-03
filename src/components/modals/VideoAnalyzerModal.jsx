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
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
          {Icon && <Icon className="w-4 h-4 text-[#2C666E]" />}
          {title}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 py-3 text-sm text-gray-700 space-y-2">{children}</div>}
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

  const handleAnalyze = async () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    setLoading(true);
    setProgress('Extracting frames and transcribing audio...');
    setResult(null);

    try {
      const data = await apiFetch('/api/analyze/video', {
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
                  <Search className="w-4 h-4 mr-2" />
                  Analyze Video
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
