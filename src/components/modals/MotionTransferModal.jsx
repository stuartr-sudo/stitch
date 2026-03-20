import React, { useState } from 'react';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Upload,
  Play,
  Loader2,
  ImageIcon,
  Video,
  FolderOpen,
  Wand2,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import LibraryModal from './LibraryModal';

const ORIENTATION_OPTIONS = [
  { id: 'image', label: 'Match Image', description: 'Keep character facing as in the image' },
  { id: 'video', label: 'Match Video', description: 'Adjust character to match video orientation' },
];

const MotionTransferModal = ({ isOpen, onClose, onMotionGenerated }) => {
  const [characterImage, setCharacterImage] = useState('');
  const [motionVideo, setMotionVideo] = useState('');
  const [characterOrientation, setCharacterOrientation] = useState('image');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showImageLibrary, setShowImageLibrary] = useState(false);
  const [showVideoLibrary, setShowVideoLibrary] = useState(false);

  const handleGenerateMotion = async () => {
    if (!characterImage || !motionVideo) {
      toast.error('Please provide both a character image and a motion video.');
      return;
    }

    setIsLoading(true);
    try {
      toast.info('Generating motion transfer...');

      const response = await apiFetch('/api/motion-transfer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: characterImage,
          video: motionVideo,
          character_orientation: characterOrientation,
          prompt,
          negative_prompt: negativePrompt,
          keep_original_sound: keepOriginalSound,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate motion transfer');
      }

      if (result.predictionId) {
        toast.info('Motion transfer is being processed, please wait...');
        const motionVideoUrl = await pollForMotionResult(result.predictionId);
        if (motionVideoUrl) {
          onMotionGenerated({
            url: motionVideoUrl,
            title: 'Motion Transfer',
            type: 'video',
            durationInFrames: 300,
          });
          onClose();
          toast.success('Motion transfer generated successfully!');
        } else {
          toast.error('Motion transfer timed out or failed. Please try again.');
        }
      } else {
        throw new Error('No prediction ID received.');
      }
    } catch (error) {
      console.error('Motion transfer error:', error);
      toast.error(error.message || 'Failed to generate motion transfer');
    } finally {
      setIsLoading(false);
    }
  };

  const pollForMotionResult = async (predictionId, maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await apiFetch(`/api/motion-transfer/result?predictionId=${predictionId}`);
        const result = await res.json();
        if (result.status === 'completed' && result.outputUrl) return result.outputUrl;
        if (result.status === 'failed' || result.error) {
          toast.error(result.error || 'Motion transfer failed');
          return null;
        }
      } catch (err) {
        console.warn('Poll attempt failed:', err);
      }
    }
    return null;
  };

  const handleReset = () => {
    setCharacterImage('');
    setMotionVideo('');
    setPrompt('');
    setNegativePrompt('');
    setCharacterOrientation('image');
    setKeepOriginalSound(true);
  };

  return (
    <>
      <SlideOverPanel
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title="Motion Transfer"
        subtitle="Transfer motion from a video onto a still image using Kling 2.6"
        icon={<Wand2 className="w-5 h-5" />}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content - two column layout */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {/* LEFT: Inputs */}
              <div className="space-y-5">
                {/* Character Image */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#2C666E]" /> Character Image
                  </Label>
                  <div className="relative">
                    {characterImage ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-[#2C666E]/30 bg-slate-900">
                        <img src={characterImage} alt="Character" className="w-full aspect-video object-contain" />
                        <button onClick={() => setCharacterImage('')} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80 transition">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-3">
                        <ImageIcon className="w-10 h-10 text-slate-300" />
                        <p className="text-xs text-slate-400">Paste URL or browse library</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste image URL (JPG, PNG)"
                      value={characterImage}
                      onChange={(e) => setCharacterImage(e.target.value)}
                      className="text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={() => setShowImageLibrary(true)} className="shrink-0">
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Motion Video */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#07393C]" /> Motion Video
                  </Label>
                  <div className="relative">
                    {motionVideo ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-[#07393C]/30 bg-slate-900">
                        <video src={motionVideo} className="w-full aspect-video object-contain" controls />
                        <button onClick={() => setMotionVideo('')} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-white hover:bg-black/80 transition">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-3">
                        <Video className="w-10 h-10 text-slate-300" />
                        <p className="text-xs text-slate-400">Paste URL or browse library</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste video URL (MP4, MOV)"
                      value={motionVideo}
                      onChange={(e) => setMotionVideo(e.target.value)}
                      className="text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={() => setShowVideoLibrary(true)} className="shrink-0">
                      <FolderOpen className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* RIGHT: Settings */}
              <div className="space-y-5">
                {/* Character Orientation */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700">Character Orientation</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ORIENTATION_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setCharacterOrientation(opt.id)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          characterOrientation === opt.id
                            ? 'border-[#2C666E] bg-[#2C666E]/5'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className={`text-sm font-semibold ${characterOrientation === opt.id ? 'text-[#07393C]' : 'text-slate-700'}`}>{opt.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700">Prompt (Optional)</Label>
                  <textarea
                    placeholder="Describe the scene — e.g., 'A person dancing energetically in a park, bright daylight, cinematic quality'"
                    className="w-full h-28 p-3 text-sm border rounded-xl focus:ring-2 focus:ring-[#2C666E] bg-slate-50 resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>

                {/* Negative Prompt */}
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700">Negative Prompt (Optional)</Label>
                  <textarea
                    placeholder="blurry, low quality, distorted, watermark, extra limbs"
                    className="w-full h-16 p-3 text-sm border rounded-xl focus:ring-2 focus:ring-[#2C666E] bg-slate-50 resize-none"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                  />
                </div>

                {/* Keep Original Sound Toggle */}
                <div
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => setKeepOriginalSound(!keepOriginalSound)}
                >
                  <div className="flex items-center gap-3">
                    {keepOriginalSound ? <Volume2 className="w-5 h-5 text-[#2C666E]" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Keep Original Sound</p>
                      <p className="text-[10px] text-slate-400">Preserve audio from the motion video</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full relative transition-colors ${keepOriginalSound ? 'bg-[#2C666E]' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${keepOriginalSound ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </div>

                {/* How it works */}
                <div className="p-4 bg-gradient-to-br from-[#2C666E]/5 to-[#90DDF0]/10 rounded-xl border border-[#2C666E]/15">
                  <p className="text-xs font-bold text-[#07393C] mb-2">How it works</p>
                  <ul className="text-[11px] text-[#07393C]/80 space-y-1.5">
                    <li>1. Upload a still character image (the subject)</li>
                    <li>2. Upload a motion video (the movement source)</li>
                    <li>3. The AI transfers the motion onto your character</li>
                    <li>4. Your character performs the same movements naturally</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-white flex items-center justify-between shrink-0">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="outline" onClick={handleReset} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>
            <Button
              onClick={handleGenerateMotion}
              disabled={isLoading || !characterImage || !motionVideo}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-2 h-12 px-8 font-bold rounded-xl shadow-lg"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              ) : (
                <><Play className="w-4 h-4 fill-current" /> Generate Motion</>
              )}
            </Button>
          </div>
        </div>
      </SlideOverPanel>

      <LibraryModal
        isOpen={showImageLibrary}
        onClose={() => setShowImageLibrary(false)}
        onSelect={(item) => {
          const url = item.url || item.image_url;
          if (url) setCharacterImage(url);
          setShowImageLibrary(false);
        }}
        mediaType="images"
      />

      <LibraryModal
        isOpen={showVideoLibrary}
        onClose={() => setShowVideoLibrary(false)}
        onSelect={(item) => {
          const url = item.url || item.video_url;
          if (url) setMotionVideo(url);
          setShowVideoLibrary(false);
        }}
        mediaType="videos"
      />
    </>
  );
};

export default MotionTransferModal;
