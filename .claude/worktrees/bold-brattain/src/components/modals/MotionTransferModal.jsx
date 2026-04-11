import React, { useState } from 'react';
import { SlideOverPanel } from '@/components/ui/slide-over-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Play,
  Loader2,
  ImageIcon,
  FolderOpen,
  Wand2,
  RotateCcw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import LibraryModal from './LibraryModal';
import MotionReferenceInput from '@/components/MotionReferenceInput';

const MotionTransferModal = ({ isOpen, onClose, onMotionGenerated }) => {
  const [characterImage, setCharacterImage] = useState('');
  const [motionRef, setMotionRef] = useState({ model: 'kling_motion_control' });
  const [isLoading, setIsLoading] = useState(false);
  const [showImageLibrary, setShowImageLibrary] = useState(false);

  const handleGenerateMotion = async () => {
    if (!characterImage || !motionRef?.videoUrl) {
      toast.error('Please provide both a character image and a motion video.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiFetch('/api/motion-transfer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: motionRef.model || 'kling_motion_control',
          image_url: characterImage,
          video_url: motionRef.trimmedUrl || motionRef.videoUrl,
          character_orientation: motionRef.characterOrientation || 'image',
          prompt: motionRef.prompt || '',
          keep_original_sound: motionRef.keepOriginalSound !== false,
          elements: motionRef.elements,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed');

      onMotionGenerated?.({
        url: data.outputUrl,
        title: 'Motion Transfer',
        type: 'video',
        durationInFrames: 300,
      });
      onClose();
    } catch (err) {
      console.error('Motion transfer error:', err);
      toast.error(err.message || 'Motion transfer failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCharacterImage('');
    setMotionRef({ model: 'kling_motion_control' });
  };

  return (
    <>
      <SlideOverPanel
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title="Motion Transfer"
        subtitle={`Transfer motion from a video onto a still image · ${motionRef.model === 'wan_motion' ? 'WAN 2.2' : 'Kling V3 Pro'}`}
        icon={<Wand2 className="w-5 h-5" />}
      >
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main content - two column layout */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {/* LEFT: Character Image */}
              <div className="space-y-5">
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
              </div>

              {/* RIGHT: Motion Reference + How it works */}
              <div className="space-y-5">
                <MotionReferenceInput
                  motionRef={motionRef}
                  onChange={setMotionRef}
                  onClear={() => setMotionRef({ model: 'kling_motion_control' })}
                />

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
              disabled={isLoading || !characterImage || !motionRef?.videoUrl}
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
    </>
  );
};

export default MotionTransferModal;
