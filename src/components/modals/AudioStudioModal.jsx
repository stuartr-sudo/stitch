import React, { useState } from 'react';
import { Music, Mic, Settings2, Play, CheckCircle2, Loader2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const AUDIO_MODELS = [
  { id: 'elevenlabs-tts', label: 'ElevenLabs Voice (TTS)', type: 'voice', provider: 'elevenlabs' },
  { id: 'suno-music', label: 'Suno AI Music (v3.5)', type: 'music', provider: 'suno' },
  { id: 'stable-audio', label: 'Stable Audio Open', type: 'music', provider: 'stability' },
  { id: 'foley-gen', label: 'Foley Sound Effects (AudioGen)', type: 'sfx', provider: 'meta' }
];

export default function AudioStudioModal({ isOpen, onClose, onAudioGenerated }) {
  const [model, setModel] = useState('elevenlabs-tts');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState(null);

  const selectedModelInfo = AUDIO_MODELS.find(m => m.id === model);

  const handleGenerate = async () => {
    if (!prompt) {
      toast.error('Please enter a prompt or script.');
      return;
    }

    setIsGenerating(true);
    setGeneratedUrl(null);
    
    // Mock generation for now since we don't have the backend route wired to Fal for all these yet
    toast.info(`Generating ${selectedModelInfo.type} via ${selectedModelInfo.label}...`);
    
    setTimeout(() => {
      setIsGenerating(false);
      // Mock audio file URL (a real royalty-free sound)
      const mockAudio = 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=chill-abstract-intention-110855.mp3';
      setGeneratedUrl(mockAudio);
      toast.success('Audio generated successfully!');
    }, 3000);
  };

  const handleInsert = () => {
    if (generatedUrl && onAudioGenerated) {
      onAudioGenerated({
        url: generatedUrl,
        title: `${selectedModelInfo.type === 'voice' ? 'Voiceover' : 'Audio Track'} - ${prompt.substring(0, 20)}`,
        type: 'audio',
        source: model
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-[#90DDF0]" />
            Audio Studio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Audio Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {AUDIO_MODELS.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">
              {selectedModelInfo?.type === 'voice' ? 'Voiceover Script' : 'Audio Description (Prompt)'}
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={selectedModelInfo?.type === 'voice' ? "Enter the text you want spoken..." : "Describe the music or sound effect..."}
              className="bg-slate-800 border-slate-700 text-white h-24"
            />
          </div>

          {generatedUrl ? (
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-3">
              <div className="flex items-center gap-2 text-[#90DDF0]">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-semibold text-sm">Generation Complete</span>
              </div>
              <audio src={generatedUrl} controls className="w-full h-10" />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setGeneratedUrl(null)} className="text-slate-400">
                  Discard
                </Button>
                <Button onClick={handleInsert} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                  Add to Timeline
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt}
              className="w-full bg-[#2C666E] hover:bg-[#07393C] text-white"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Audio...</>
              ) : (
                <><Play className="w-4 h-4 mr-2" /> Generate Audio</>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
