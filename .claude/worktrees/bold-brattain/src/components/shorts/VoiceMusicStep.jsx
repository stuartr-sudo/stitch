import React from 'react';
import { useShortsWizard } from '@/contexts/ShortsWizardContext';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Mic, Music } from 'lucide-react';

const VOICE_PRESETS = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, warm male' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Smooth, articulate male' },
  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', description: 'Gruff, deep male' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, clear female' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Energetic, young male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft, expressive female' },
];

export default function VoiceMusicStep() {
  const { voiceId, musicMood, updateField } = useShortsWizard();

  return (
    <div className="max-w-2xl mx-auto w-full p-6 space-y-8">
      {/* Voice section */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Mic className="w-5 h-5 text-slate-600" />
          <h2 className="text-xl font-semibold text-slate-800">Voice</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Choose a narrator voice for your short.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {VOICE_PRESETS.map((voice) => (
            <button
              key={voice.id}
              type="button"
              onClick={() => updateField('voiceId', voice.id)}
              className={cn(
                'flex flex-col p-4 rounded-xl border-2 transition-all text-left',
                'hover:border-[#2C666E]/50 hover:bg-[#2C666E]/5',
                voiceId === voice.id
                  ? 'border-[#2C666E] bg-[#2C666E]/10 shadow-sm'
                  : 'border-slate-200 bg-white',
              )}
            >
              <span className="text-sm font-medium text-slate-700">{voice.name}</span>
              <span className="text-xs text-slate-400">{voice.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Music mood section */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Music className="w-5 h-5 text-slate-600" />
          <h2 className="text-xl font-semibold text-slate-800">Music Mood</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Describe the background music vibe.</p>

        <Input
          value={musicMood || ''}
          onChange={(e) => updateField('musicMood', e.target.value)}
          placeholder="e.g. dark cinematic, upbeat lo-fi, tense suspense, epic orchestral"
          className="text-sm"
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {['dark cinematic', 'upbeat lo-fi', 'tense suspense', 'epic orchestral', 'calm ambient', 'energetic trap'].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => updateField('musicMood', suggestion)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-all',
                musicMood === suggestion
                  ? 'border-[#2C666E] bg-[#2C666E]/10 text-[#2C666E]'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300',
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
