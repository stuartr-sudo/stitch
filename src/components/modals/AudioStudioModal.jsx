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
import { supabase } from '@/lib/supabase';

const AUDIO_MODELS = [
  { id: 'beatoven/music-generation', label: 'Beatoven Music', type: 'music', provider: 'fal' },
  { id: 'beatoven/sound-effect-generation', label: 'Beatoven Sound Effects', type: 'sfx', provider: 'fal' },
  { id: 'fal-ai/minimax-music/v2', label: 'MiniMax Music v2 (requires lyrics)', type: 'music', provider: 'fal', requiresLyrics: true },
  { id: 'fal-ai/elevenlabs/music', label: 'ElevenLabs Music', type: 'music', provider: 'fal' },
];

export default function AudioStudioModal({ isOpen, onClose, onAudioGenerated }) {
  const [model, setModel] = useState('beatoven/music-generation');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [duration, setDuration] = useState(90);
  const [refinement, setRefinement] = useState(100);
  const [creativity, setCreativity] = useState(16);
  const [seed, setSeed] = useState('');
  const [musicLengthSeconds, setMusicLengthSeconds] = useState(30);
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
          negativePrompt: negativePrompt || undefined,
          lyrics: lyrics || undefined,
          duration_seconds: duration,
          refinement: refinement,
          creativity: creativity,
          seed: seed ? parseInt(seed) : undefined,
          musicLengthMs: model === 'fal-ai/elevenlabs/music' ? musicLengthSeconds * 1000 : undefined,
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

  const handleInsert = async () => {
    if (!generatedUrl || !onAudioGenerated) return;

    const audioItem = {
      url: generatedUrl,
      title: `${selectedModelInfo.type === 'voice' ? 'Voiceover' : 'Audio Track'} - ${prompt.substring(0, 20)}`,
      type: 'audio',
      source: model
    };

    try {
      // Save to library if Supabase is available
      if (supabase?.auth?.getUser) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('generated_audio').insert({
            user_id: user.id,
            title: audioItem.title,
            prompt: prompt,
            negative_prompt: negativePrompt || null,
            model: model,
            audio_url: generatedUrl,
            duration_seconds: model === 'fal-ai/elevenlabs/music' ? musicLengthSeconds : duration,
            refinement: refinement,
            creativity: creativity,
            seed: seed ? parseInt(seed) : null
          });
          toast.success('Audio saved to library!');
        }
      }
    } catch (error) {
      console.error('Error saving audio to library:', error);
      toast.warning('Audio generated but not saved to library');
    }

    onAudioGenerated(audioItem);
    setPrompt('');
    setNegativePrompt('');
    onClose();
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

          {(model === 'beatoven/music-generation' || model === 'beatoven/sound-effect-generation') && (
            <div className="space-y-2">
              <Label className="text-slate-300">Negative Prompt (what to avoid)</Label>
              <Textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder={model === 'beatoven/music-generation' ? 'e.g., noise, distortion, heavy drums' : 'e.g., noise, high-pitched screech'}
                className="bg-slate-800 border-slate-700 text-white h-16"
              />
            </div>
          )}

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

          {(model === 'beatoven/music-generation' || model === 'beatoven/sound-effect-generation') && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Duration (seconds)
                    <span className="text-xs text-slate-400 ml-1">
                      {model === 'beatoven/sound-effect-generation' ? '(1-35)' : '(5-150)'}
                    </span>
                  </Label>
                  <Input
                    type="number"
                    min={model === 'beatoven/sound-effect-generation' ? 1 : 5}
                    max={model === 'beatoven/sound-effect-generation' ? 35 : 150}
                    step="1"
                    value={duration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || (model === 'beatoven/sound-effect-generation' ? 5 : 90);
                      const min = model === 'beatoven/sound-effect-generation' ? 1 : 5;
                      const max = model === 'beatoven/sound-effect-generation' ? 35 : 150;
                      setDuration(Math.max(min, Math.min(max, val)));
                    }}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Refinement
                    <span className="text-xs text-slate-400 ml-1">(10-200)</span>
                  </Label>
                  <Input
                    type="number"
                    min="10"
                    max="200"
                    step="10"
                    value={refinement}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 100;
                      setRefinement(Math.max(10, Math.min(200, val)));
                    }}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Creativity
                    <span className="text-xs text-slate-400 ml-1">(1-20)</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    step="0.5"
                    value={creativity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 16;
                      setCreativity(Math.max(1, Math.min(20, val)));
                    }}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">
                    Seed (optional)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Leave empty for random"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </>
          )}

          {model === 'fal-ai/elevenlabs/music' && (
            <div className="space-y-2">
              <Label className="text-slate-300">
                Music Length (seconds)
                <span className="text-xs text-slate-400 ml-2">(3 - 600 seconds)</span>
              </Label>
              <Input
                type="number"
                min="3"
                max="600"
                step="1"
                value={musicLengthSeconds}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 30;
                  setMusicLengthSeconds(Math.max(3, Math.min(600, value)));
                }}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="30"
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
