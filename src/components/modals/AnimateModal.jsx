import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LibraryModal from './LibraryModal';
import {
  Video,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  RefreshCw,
  Plus,
  Link2,
  FolderOpen,
  Sparkles,
  Users,
  Image,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

const EXAMPLE_VIDEO_URL = 'https://v3b.fal.media/files/b/panda/a6SvJg96V8eoglMlYFShU_5385885-hd_1080_1920_25fps.mp4';
const EXAMPLE_IMAGE_URL = 'https://v3b.fal.media/files/b/panda/-oMlZo9Yyj_Nzoza_tgds_GmLF86r5bOt50eMMKCszy_eacc949b3933443c9915a83c98fbe85e.png';

const MODES = [
  {
    value: 'move',
    label: 'Move',
    description: 'Animate a character with the motion from a reference video',
    detail: 'You provide: a video of a person moving + a character photo. You get: your character performing those exact same movements.',
  },
  {
    value: 'replace',
    label: 'Replace',
    description: 'Swap the character in a video while keeping the scene',
    detail: 'You provide: a video with a person in it + a character photo. You get: the same video but with your character in place of the original person.',
  },
];

const RESOLUTIONS = [
  { value: '480p', label: '480p (fastest, $0.04/sec)' },
  { value: '580p', label: '580p ($0.06/sec)' },
  { value: '720p', label: '720p (best quality, $0.08/sec)' },
];

export default function AnimateModal({ isOpen, onClose, onInsert, isEmbedded = false }) {
  const [mode, setMode] = useState('move');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [resolution, setResolution] = useState('480p');
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [requestId, setRequestId] = useState(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState(null);
  const [lastSavedVideoUrl, setLastSavedVideoUrl] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showImageLibrary, setShowImageLibrary] = useState(false);

  const pollIntervalRef = useRef(null);

  const resetState = () => {
    setMode('move');
    setVideoUrl('');
    setImageUrl('');
    setVideoInput('');
    setImageInput('');
    setResolution('480p');
    setCurrentStep(1);
    setIsGenerating(false);
    setGenerationStatus('');
    setRequestId(null);
    setGeneratedVideoUrl(null);
    setLastSavedVideoUrl(null);
  };

  useEffect(() => {
    if (isOpen || isEmbedded) {
      resetState();
    }
  }, [isOpen, isEmbedded]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleClose = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    onClose();
  };

  const handleVideoImport = () => {
    if (!videoInput.trim()) return;
    try { new URL(videoInput); } catch { toast.error('Please enter a valid URL'); return; }
    setVideoUrl(videoInput.trim());
    toast.success('Video URL set');
  };

  const handleImageImport = () => {
    if (!imageInput.trim()) return;
    try { new URL(imageInput); } catch { toast.error('Please enter a valid URL'); return; }
    setImageUrl(imageInput.trim());
    toast.success('Image URL set');
  };

  const handleVideoLibrarySelect = (item) => {
    const url = item.url || item.video_url;
    if (url) {
      setVideoUrl(url);
      setVideoInput(url);
      toast.success('Video selected from library');
    }
    setShowLibrary(false);
  };

  const handleImageLibrarySelect = (item) => {
    const url = item.url || item.image_url;
    if (url) {
      setImageUrl(url);
      setImageInput(url);
      toast.success('Image selected from library');
    }
    setShowImageLibrary(false);
  };

  const pollForResult = useCallback(async (id, currentMode) => {
    try {
      const response = await apiFetch('/api/animate/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: id, mode: currentMode }),
      });

      if (!response.ok) return;

      const data = await response.json();

      if (data.status === 'completed' && data.videoUrl) {
        clearInterval(pollIntervalRef.current);
        setGeneratedVideoUrl(data.videoUrl);
        setIsGenerating(false);
        setCurrentStep(3);
        toast.success('Video generated successfully!');
      } else if (data.status === 'failed') {
        clearInterval(pollIntervalRef.current);
        setIsGenerating(false);
        toast.error('Generation failed: ' + (data.error || 'Unknown error'));
      } else if (data.queuePosition) {
        setGenerationStatus(`In queue (position ${data.queuePosition})...`);
      }
    } catch (error) {
      console.error('[Animate] Polling error:', error);
    }
  }, []);

  const handleGenerate = async () => {
    if (!videoUrl || !imageUrl) {
      toast.error('Please provide both a video URL and character image URL');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Submitting animation job...');

    try {
      const response = await apiFetch('/api/animate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: videoUrl,
          image_url: imageUrl,
          mode,
          resolution,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start animation');

      if (data.status === 'completed' && data.videoUrl) {
        setGeneratedVideoUrl(data.videoUrl);
        setIsGenerating(false);
        setCurrentStep(3);
        return;
      }

      if (data.requestId) {
        setRequestId(data.requestId);
        setGenerationStatus('Animating your video (2-5 minutes)...');
        const capturedMode = mode;
        pollIntervalRef.current = setInterval(
          () => pollForResult(data.requestId, capturedMode),
          5000
        );
      }
    } catch (error) {
      console.error('[Animate] Generation error:', error);
      setIsGenerating(false);
      toast.error(error.message || 'Failed to start animation');
    }
  };

  const handleInsertIntoEditor = () => {
    const url = lastSavedVideoUrl || generatedVideoUrl;
    if (onInsert) onInsert(url, 'Animated Video', 'animate');
    onClose();
  };

  const handleSaveToLibrary = async () => {
    if (!generatedVideoUrl) return;
    setIsGenerating(true);
    setGenerationStatus('Saving to library...');
    try {
      const res = await apiFetch('/api/library/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: generatedVideoUrl,
          type: 'video',
          title: `Animate ${mode} result`,
          source: 'animate',
        }),
      });
      const saveData = await res.json();
      if (!res.ok) throw new Error(saveData.error);
      setLastSavedVideoUrl(saveData.url || generatedVideoUrl);
      toast.success('Saved to library!');
    } catch (error) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const renderContent = () => (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b shrink-0 bg-gradient-to-r from-[#90DDF0]/20 to-[#2C666E]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white shadow-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Animate</h2>
              <p className="text-slate-500 text-sm">Character animation using Wan2.2</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all ${
                  currentStep === step
                    ? 'w-8 bg-gradient-to-r from-[#2C666E] to-[#07393C]'
                    : currentStep > step
                    ? 'w-2 bg-[#90DDF0]'
                    : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Step 1: Select Inputs */}
        {currentStep === 1 && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full space-y-6">

              {/* Mode Selector */}
              <div>
                <Label className="text-sm font-semibold text-slate-800 mb-3 block">Animation Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  {MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMode(m.value)}
                      className={`text-left rounded-lg border-2 p-4 transition-all ${
                        mode === m.value
                          ? 'border-[#2C666E] bg-[#2C666E]/5'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-medium text-sm text-slate-900 mb-0.5">{m.label}</div>
                      <div className="text-xs text-slate-600 font-medium">{m.description}</div>
                      <div className="text-xs text-slate-400 mt-1.5 leading-relaxed">{m.detail}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference Video */}
              <div>
                <Label className="text-sm font-semibold text-slate-800 mb-2 block">
                  Reference Video <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-500 mb-3">
                  {mode === 'move'
                    ? 'The video whose motion will be replicated by your character. The model copies all movements, expressions, and timing exactly.'
                    : 'The video containing the person you want to replace. The model keeps the background, lighting, and scene intact.'}
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVideoImport()}
                    placeholder="https://example.com/video.mp4"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleVideoImport} disabled={!videoInput.trim()}>
                    <Link2 className="w-4 h-4 mr-1" /> Import
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowLibrary(true)}>
                    <FolderOpen className="w-4 h-4 mr-1" /> Library
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => { setVideoUrl(EXAMPLE_VIDEO_URL); setVideoInput(EXAMPLE_VIDEO_URL); }}
                  className="text-xs text-[#2C666E] hover:text-[#07393C] underline underline-offset-2 mb-3 block"
                >
                  Try an example video
                </button>
                {videoUrl && (
                  <div className="rounded-xl overflow-hidden bg-slate-900 border border-green-200">
                    <div className="aspect-video">
                      <video src={videoUrl} controls className="w-full h-full object-contain" />
                    </div>
                    <div className="px-3 py-2 flex items-center gap-2 bg-green-50">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <p className="text-xs text-green-700 truncate">{videoUrl}</p>
                    </div>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3 mt-3">
                  <p className="text-xs font-medium text-slate-600 mb-1.5">Tips for best results:</p>
                  <ul className="space-y-1 text-xs text-slate-500 list-disc list-inside">
                    <li>One person clearly visible, with room to move in frame</li>
                    <li>3–15 seconds is ideal — longer clips may be trimmed</li>
                    <li>Clear lighting and minimal camera shake</li>
                  </ul>
                </div>
              </div>

              {/* Character Image */}
              <div>
                <Label className="text-sm font-semibold text-slate-800 mb-2 block">
                  Character Image <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-500 mb-3">
                  {mode === 'move'
                    ? 'The character that will perform the movements from your reference video. Can be a photo, illustration, or AI-generated image.'
                    : 'The character that will be placed into the scene. The model adapts their appearance to the lighting and perspective of the video.'}
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleImageImport()}
                    placeholder="https://example.com/character.jpg"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleImageImport} disabled={!imageInput.trim()}>
                    <Link2 className="w-4 h-4 mr-1" /> Import
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowImageLibrary(true)}>
                    <FolderOpen className="w-4 h-4 mr-1" /> Library
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={() => { setImageUrl(EXAMPLE_IMAGE_URL); setImageInput(EXAMPLE_IMAGE_URL); }}
                  className="text-xs text-[#2C666E] hover:text-[#07393C] underline underline-offset-2 mb-3 block"
                >
                  Try an example character
                </button>
                {imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-green-200 bg-slate-50">
                    <div className="flex items-center justify-center bg-slate-100 h-40">
                      <img src={imageUrl} alt="Character" className="max-h-40 object-contain" />
                    </div>
                    <div className="px-3 py-2 flex items-center gap-2 bg-green-50">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <p className="text-xs text-green-700 truncate">{imageUrl}</p>
                    </div>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3 mt-3">
                  <p className="text-xs font-medium text-slate-600 mb-1.5">Tips for best results:</p>
                  <ul className="space-y-1 text-xs text-slate-500 list-disc list-inside">
                    <li>Front-facing photo or illustration works best</li>
                    <li>Full body preferred for Move mode; portrait works for Replace</li>
                    <li>Plain or simple background produces the cleanest result</li>
                  </ul>
                </div>
              </div>

              {/* Continue */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!videoUrl || !imageUrl}
                  className="gap-2 bg-gradient-to-r from-[#2C666E] to-[#07393C] hover:from-[#07393C] hover:to-[#0A090C]"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Configure & Generate */}
        {currentStep === 2 && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full space-y-6">

              {/* Previews */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Reference Video</Label>
                  <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden shadow">
                    <video src={videoUrl} controls className="w-full h-full object-contain" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Character Image</Label>
                  <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden shadow flex items-center justify-center">
                    <img src={imageUrl} alt="Character" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Resolution */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900">
                    {RESOLUTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-sm">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Info Box */}
              <div className="bg-[#90DDF0]/20 border border-[#2C666E]/30 rounded-xl p-4">
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-[#2C666E] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-[#07393C] mb-2">What the model does</p>
                    <p className="text-sm text-[#2C666E] mb-3">
                      {mode === 'move'
                        ? 'Generates a high-fidelity video of your character replicating the exact expressions and movements from the reference video.'
                        : 'Seamlessly replaces the character in your video while preserving the original scene\'s lighting, color tone, and environment.'}
                    </p>
                    <div className="grid grid-cols-2 gap-3 border-t border-[#2C666E]/20 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-[#07393C] mb-1">What you will receive</p>
                        <ul className="space-y-1 text-xs text-[#2C666E]">
                          <li>• An .mp4 video at the resolution you selected</li>
                          <li>• Matching the length and frame rate of your reference video</li>
                          <li>• {mode === 'move' ? 'Your character performing the recorded movements' : 'Your character seamlessly placed into the original scene'}</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#07393C] mb-1">Expected generation time</p>
                        <ul className="space-y-1 text-xs text-[#2C666E]">
                          <li>• <span className="font-medium">480p</span> — approx. 2–5 minutes</li>
                          <li>• <span className="font-medium">720p</span> — approx. 8–10 minutes</li>
                          <li>• <span className="font-medium">1080p</span> — approx. 12–15 minutes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={isGenerating}>
                  Back
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="gap-2 bg-gradient-to-r from-[#2C666E] to-[#07393C] hover:from-[#07393C] hover:to-[#0A090C]"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {generationStatus || 'Generating...'}</>
                  ) : (
                    <><Users className="w-4 h-4" /> Generate Animation</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {currentStep === 3 && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-2">
                  <CheckCircle2 className="w-4 h-4" /> Animation Complete!
                </div>
                <p className="text-slate-600">Your character has been animated</p>
              </div>

              {/* Generated Video */}
              <div className="mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#2C666E]/10 text-[#07393C] border border-[#2C666E]/20">
                    {mode === 'move' ? '🎬 Move mode' : '🔄 Replace mode'}
                  </span>
                </div>
                <Label className="text-sm font-medium mb-2 block text-center">Generated Video</Label>
                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg ring-2 ring-[#2C666E]">
                  <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Source thumbnails */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <Label className="text-xs font-medium mb-1 block text-slate-500">Source Video</Label>
                  <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
                    <video src={videoUrl} className="w-full h-full object-contain" muted />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block text-slate-500">Character Image</Label>
                  <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <img src={imageUrl} alt="Character" className="max-h-full max-w-full object-contain" />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Try Again
                </Button>
                <Button variant="outline" onClick={resetState} className="gap-2">
                  <Video className="w-4 h-4" /> New Animation
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveToLibrary}
                  disabled={isGenerating || !!lastSavedVideoUrl}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : lastSavedVideoUrl ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {lastSavedVideoUrl ? 'Saved!' : 'Save to Library'}
                </Button>
                <a
                  href={generatedVideoUrl}
                  download="animate-result.mp4"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2C666E] rounded-lg hover:bg-[#07393C]"
                >
                  <Download className="w-4 h-4" /> Download to Device
                </a>
                <a
                  href={generatedVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <ExternalLink className="w-4 h-4" /> Open in New Tab
                </a>
                {onInsert && (
                  <Button
                    onClick={handleInsertIntoEditor}
                    className="gap-2 bg-gradient-to-r from-[#2C666E] to-[#07393C] hover:from-[#07393C] hover:to-[#0A090C]"
                  >
                    <Plus className="w-4 h-4" /> Use Video
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading overlay (shown while generating in step 2) */}
      {isGenerating && currentStep === 2 && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[#2C666E] to-[#07393C] animate-pulse" />
            <Users className="w-8 h-8 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-lg font-medium text-slate-800 mb-2">Animating Your Character</p>
          <p className="text-sm text-slate-500">{generationStatus}</p>
          <p className="text-xs text-slate-400 mt-4">This typically takes 2–5 minutes</p>
        </div>
      )}
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden relative">
        {renderContent()}
        <LibraryModal
          isOpen={showLibrary}
          onClose={() => setShowLibrary(false)}
          onSelect={handleVideoLibrarySelect}
          mediaType="videos"
        />
        <LibraryModal
          isOpen={showImageLibrary}
          onClose={() => setShowImageLibrary(false)}
          onSelect={handleImageLibrarySelect}
          mediaType="images"
        />
      </div>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] overflow-hidden flex flex-col p-0">
          <VisuallyHidden>
            <DialogTitle>Animate - Character Animation</DialogTitle>
            <DialogDescription>Animate characters using Wan2.2</DialogDescription>
          </VisuallyHidden>
          {renderContent()}
        </DialogContent>
      </Dialog>
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onSelect={handleVideoLibrarySelect}
        mediaType="videos"
      />
      <LibraryModal
        isOpen={showImageLibrary}
        onClose={() => setShowImageLibrary(false)}
        onSelect={handleImageLibrarySelect}
        mediaType="images"
      />
    </>
  );
}
