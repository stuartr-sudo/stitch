import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Video,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Key,
  Shield,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

export default function SetupKeys() {
  const navigate = useNavigate();
  const { signIn, signUp, user, hasKeys, refreshKeys } = useAuth();

  // If user is logged in and already has keys, go straight to studio
  React.useEffect(() => {
    if (user && hasKeys) {
      navigate('/studio', { replace: true });
    }
  }, [user, hasKeys, navigate]);

  // Step: 'auth' or 'keys'
  const [step, setStep] = useState(user ? 'keys' : 'auth');

  // Auth state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API keys state
  const [falKey, setFalKey] = useState('');
  const [wavespeedKey, setWavespeedKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [showFal, setShowFal] = useState(false);
  const [showWavespeed, setShowWavespeed] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showElevenlabs, setShowElevenlabs] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (isSignUp && password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.warning('Check your email to confirm your account, then sign in.');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        // Check if user already has keys — if so, skip to studio
        const { data } = await supabase
          .from('user_api_keys')
          .select('fal_key, openai_key')
          .eq('user_id', (await supabase.auth.getUser()).data.user.id)
          .maybeSingle();

        if (data?.fal_key && data?.openai_key) {
          navigate('/studio');
        } else {
          setStep('keys');
        }
      }
    } catch (error) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveKeys = async () => {
    if (!falKey.trim() || !openaiKey.trim()) {
      toast.error('FAL.ai and OpenAI keys are required to use the app');
      return;
    }

    setIsSavingKeys(true);
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) {
        toast.error('Not authenticated — please sign in first');
        setStep('auth');
        return;
      }

      const { error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: currentUser.id,
          fal_key: falKey.trim() || null,
          wavespeed_key: wavespeedKey.trim() || null,
          openai_key: openaiKey.trim() || null,
          elevenlabs_key: elevenlabsKey.trim() || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      await refreshKeys();
      navigate('/studio');
    } catch (error) {
      toast.error('Failed to save keys: ' + error.message);
    } finally {
      setIsSavingKeys(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0EDEE] to-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white mb-4 shadow-lg">
            {step === 'auth' ? <Video className="w-8 h-8" /> : <Key className="w-8 h-8" />}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Stitch Studios</h1>
          <p className="text-slate-600">
            {step === 'auth'
              ? (isSignUp ? 'Create your account' : 'Sign in to your account')
              : 'Set up your API keys to get started'}
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`h-1.5 w-12 rounded-full ${step === 'auth' ? 'bg-[#2C666E]' : 'bg-[#2C666E]/30'}`} />
          <div className={`h-1.5 w-12 rounded-full ${step === 'keys' ? 'bg-[#2C666E]' : 'bg-[#2C666E]/30'}`} />
        </div>

        {step === 'auth' ? (
          /* ─── Auth Form ─── */
          <form onSubmit={handleAuth} className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
            <div>
              <Label className="text-sm font-medium mb-2 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                  className="pl-10 pr-10"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="pl-10"
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[#2C666E] hover:bg-[#07393C] text-white text-lg"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {isSignUp ? 'Creating account...' : 'Signing in...'}</>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setConfirmPassword('');
                }}
                className="text-sm text-[#2C666E] hover:underline"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        ) : (
          /* ─── API Keys Form ─── */
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
            <div className="bg-[#90DDF0]/20 border border-[#2C666E]/20 rounded-xl p-3">
              <div className="flex gap-2">
                <Shield className="w-4 h-4 text-[#2C666E] shrink-0 mt-0.5" />
                <p className="text-xs text-[#07393C]">
                  Your keys are stored securely in your account and never shared. Each user's generations use their own keys.
                </p>
              </div>
            </div>

            {/* FAL Key — required */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                FAL.ai API Key <span className="text-red-500">*</span>
                <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer"
                  className="ml-2 text-[#2C666E] hover:underline text-xs inline-flex items-center">
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
                <button type="button" onClick={() => setShowFal(!showFal)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showFal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Powers video generation, image models, TTS, and more</p>
            </div>

            {/* OpenAI Key — required */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                OpenAI API Key <span className="text-red-500">*</span>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer"
                  className="ml-2 text-[#2C666E] hover:underline text-xs inline-flex items-center">
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
                <button type="button" onClick={() => setShowOpenai(!showOpenai)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showOpenai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Powers AI scripts, prompts, and content generation</p>
            </div>

            {/* Wavespeed Key — optional */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Wavespeed API Key
                <span className="text-xs text-slate-400 ml-1">(optional)</span>
                <a href="https://wavespeed.ai" target="_blank" rel="noopener noreferrer"
                  className="ml-2 text-[#2C666E] hover:underline text-xs inline-flex items-center">
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
                <button type="button" onClick={() => setShowWavespeed(!showWavespeed)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showWavespeed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Used for select image and video models</p>
            </div>

            {/* ElevenLabs Key — optional */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                ElevenLabs API Key
                <span className="text-xs text-slate-400 ml-1">(optional)</span>
                <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer"
                  className="ml-2 text-[#2C666E] hover:underline text-xs inline-flex items-center">
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
                <button type="button" onClick={() => setShowElevenlabs(!showElevenlabs)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showElevenlabs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Used for premium text-to-speech voiceovers</p>
            </div>

            <Button
              onClick={handleSaveKeys}
              disabled={isSavingKeys}
              className="w-full h-12 bg-[#2C666E] hover:bg-[#07393C] text-white text-lg"
            >
              {isSavingKeys ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...</>
              ) : (
                <>Get Started <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
