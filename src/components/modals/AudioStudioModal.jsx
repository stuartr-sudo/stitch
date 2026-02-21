import React, { useState } from 'react';
import { Music, Mic, Settings2, Play, CheckCircle2, Loader2, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

const AUDIO_MODELS = [
  { id: 'beatoven/music-generation', label: 'Beatoven Music', type: 'music', provider: 'fal' },
  { id: 'beatoven/sound-effect-generation', label: 'Beatoven Sound Effects', type: 'sfx', provider: 'fal' },
  { id: 'fal-ai/minimax-music/v2', label: 'MiniMax Music v2 (requires lyrics)', type: 'music', provider: 'fal', requiresLyrics: true },
  { id: 'fal-ai/elevenlabs/music', label: 'ElevenLabs Music', type: 'music', provider: 'fal' },
];

export default function AudioStudioModal({ isOpen, onClose, onAudioGenerated }) {
  const [model, setModel] = useState('beatoven/music-generation');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState(null);

  const selectedModelInfo = AUDIO_MODELS.find(m => m.id === model);

  const handleGenerate = async () => {
    if (!prompt) {
      toast.error('Please enter a prompt or description.');
      return;
    }

    setIsGenerating(true);
    setGeneratedUrl(null);

    try {
      toast.info(`Generating ${selectedModelInfo.type}...`);

      const response = await apiFetch('/api/audio/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          model: model,
          lyrics: lyrics || undefined,
        }),
      });

      // 2. Safely parse the response to prevent "Unexpected end of JSON" crashes
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate audio');
      }

      // 3. Set the generated URL
      if (data.audioUrl) {
        setGeneratedUrl(data.audioUrl);
        toast.success('Audio generated successfully!');
      } else {
        throw new Error('No audio URL returned from server');
      }

    } catch (error) {
      console.error('Audio generation error:', error);
      toast.error(error.message || 'Error generating audio');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsert = () => {
    if (generatedUrl && onAudioGenerated) {
      onAudioGenerated({
        url: generatedUrl,
        title: `${selectedModelInfo.type === 'voice' ? 'Voiceover' : 'Audio Track'} - ${prompt.substring(0, 20)}`,
        type: 'audio',
        source: model
      });
      setPrompt(''); // Clear the prompt after successful generation
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

          {selectedModelInfo?.requiresLyrics && (
            <div className="space-y-2">
              <Label className="text-slate-300">
                Lyrics (use [Verse], [Chorus], [Bridge] tags)
              </Label>
              <Textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="[verse]\nYour lyrics here...\n[chorus]\nChorus lyrics..."
                className="bg-slate-800 border-slate-700 text-white h-24"
              />
            </div>
          )}

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
