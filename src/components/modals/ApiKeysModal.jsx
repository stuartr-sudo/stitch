import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Key,
  Shield,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  Save,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function ApiKeysModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [wavespeedKey, setWavespeedKey] = useState('');
  const [falKey, setFalKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [huggingfaceKey, setHuggingfaceKey] = useState('');
  const [showWavespeed, setShowWavespeed] = useState(false);
  const [showFal, setShowFal] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showElevenlabs, setShowElevenlabs] = useState(false);
  const [showHuggingface, setShowHuggingface] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingKeys, setHasExistingKeys] = useState({ fal: false, wavespeed: false, openai: false, elevenlabs: false, huggingface: false });

  useEffect(() => {
    if (isOpen && user && supabase) {
      loadKeys();
    }
  }, [isOpen, user]);

  const loadKeys = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('fal_key, wavespeed_key, openai_key, elevenlabs_key, huggingface_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasExistingKeys({
          fal: !!data.fal_key,
          wavespeed: !!data.wavespeed_key,
          openai: !!data.openai_key,
          elevenlabs: !!data.elevenlabs_key,
          huggingface: !!data.huggingface_key,
        });
        // Show masked versions if keys exist
        setFalKey(data.fal_key || '');
        setWavespeedKey(data.wavespeed_key || '');
        setOpenaiKey(data.openai_key || '');
        setElevenlabsKey(data.elevenlabs_key || '');
        setHuggingfaceKey(data.huggingface_key || '');
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !supabase) return;

    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        fal_key: falKey.trim() || null,
        wavespeed_key: wavespeedKey.trim() || null,
        openai_key: openaiKey.trim() || null,
        elevenlabs_key: elevenlabsKey.trim() || null,
        huggingface_key: huggingfaceKey.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_api_keys')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      setHasExistingKeys({
        fal: !!payload.fal_key,
        wavespeed: !!payload.wavespeed_key,
        openai: !!payload.openai_key,
        elevenlabs: !!payload.elevenlabs_key,
        huggingface: !!payload.huggingface_key,
      });

      toast.success('API keys saved!');
      onClose();
    } catch (error) {
      console.error('Failed to save API keys:', error);
      toast.error('Failed to save keys: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
          <Key className="w-5 h-5 text-[#2C666E]" />
          API Keys
        </DialogTitle>
        <DialogDescription className="text-slate-500">
          Add your own API keys. They're stored securely and used only for your generations.
        </DialogDescription>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Security note */}
            <div className="bg-[#90DDF0]/20 border border-[#2C666E]/20 rounded-xl p-3">
              <div className="flex gap-2">
                <Shield className="w-4 h-4 text-[#2C666E] shrink-0 mt-0.5" />
                <p className="text-xs text-[#07393C]">
                  Your keys are stored in your account and never shared. Each user uses their own keys for AI generation.
                </p>
              </div>
            </div>

            {/* Wavespeed Key */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Wavespeed API Key
                {hasExistingKeys.wavespeed && (
                  <CheckCircle2 className="w-3.5 h-3.5 inline ml-1.5 text-green-500" />
                )}
                <a
                  href="https://wavespeed.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-[#2C666E] hover:underline text-xs inline-flex items-center"
                >
                  Get key <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Label>
              <div className="relative">
                <Input
                  type={showWavespeed ? 'text' : 'password'}
                  value={wavespeedKey}
                  onChange={(e) => setWavespeedKey(e.target.value)}
                  placeholder="Enter your Wavespeed API key"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowWavespeed(!showWavespeed)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showWavespeed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Used for image generation, video creation, and editing</p>
            </div>

            {/* FAL Key */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                FAL.ai API Key
                {hasExistingKeys.fal && (
                  <CheckCircle2 className="w-3.5 h-3.5 inline ml-1.5 text-green-500" />
                )}
                <a
                  href="https://fal.ai/dashboard/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-[#2C666E] hover:underline text-xs inline-flex items-center"
                >
                  Get key <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Label>
              <div className="relative">
                <Input
                  type={showFal ? 'text' : 'password'}
                  value={falKey}
                  onChange={(e) => setFalKey(e.target.value)}
                  placeholder="Enter your FAL.ai API key"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowFal(!showFal)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showFal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Used for Try Style, Lens, JumpStart video models, and more</p>
            </div>

            {/* OpenAI Key */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                OpenAI API Key
                {hasExistingKeys.openai && (
                  <CheckCircle2 className="w-3.5 h-3.5 inline ml-1.5 text-green-500" />
                )}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-[#2C666E] hover:underline text-xs inline-flex items-center"
                >
                  Get key <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Label>
              <div className="relative">
                <Input
                  type={showOpenai ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="Enter your OpenAI API key (sk-...)"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowOpenai(!showOpenai)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOpenai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Used for AI storyboard generation (gpt-4o-mini)</p>
            </div>

            {/* ElevenLabs Key */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                ElevenLabs API Key
                {hasExistingKeys.elevenlabs && (
                  <CheckCircle2 className="w-3.5 h-3.5 inline ml-1.5 text-green-500" />
                )}
                <a
                  href="https://elevenlabs.io/app/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-[#2C666E] hover:underline text-xs inline-flex items-center"
                >
                  Get key <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Label>
              <div className="relative">
                <Input
                  type={showElevenlabs ? 'text' : 'password'}
                  value={elevenlabsKey}
                  onChange={(e) => setElevenlabsKey(e.target.value)}
                  placeholder="Enter your ElevenLabs API key"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowElevenlabs(!showElevenlabs)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showElevenlabs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Used for production-quality text-to-speech voiceovers</p>
            </div>

            {/* HuggingFace Key */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                HuggingFace API Key
                {hasExistingKeys.huggingface && (
                  <CheckCircle2 className="w-3.5 h-3.5 inline ml-1.5 text-green-500" />
                )}
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-[#2C666E] hover:underline text-xs inline-flex items-center"
                >
                  Get key <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Label>
              <div className="relative">
                <Input
                  type={showHuggingface ? 'text' : 'password'}
                  value={huggingfaceKey}
                  onChange={(e) => setHuggingfaceKey(e.target.value)}
                  placeholder="Enter your HuggingFace API token"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowHuggingface(!showHuggingface)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showHuggingface ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Used for Parler-TTS voiceovers and MusicGen background music</p>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-11 bg-[#2C666E] hover:bg-[#07393C] text-white"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Keys</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
