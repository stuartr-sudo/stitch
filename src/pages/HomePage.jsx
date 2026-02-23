import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import {
  Video,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Film,
  ImageIcon,
  Layers,
  Wand2,
  ChevronRight,
  FileText,
  Share2,
  Building2,
  BarChart2,
} from 'lucide-react';

const FEATURES = [
  { icon: Wand2,       title: 'AI Image Editing',          desc: 'Transform images with powerful AI models',                  soon: false },
  { icon: Film,        title: 'Video Generation',          desc: 'Create stunning video adverts from prompts',                soon: false },
  { icon: ImageIcon,   title: 'Smart Library',             desc: 'All your generated assets, organised',                     soon: false },
  { icon: Layers,      title: 'Multi-model Studio',        desc: 'Wavespeed, FAL, and more in one place',                    soon: false },
  { icon: FileText,    title: 'Content Adaptation',        desc: 'Turn blog posts into ready-to-publish video content',      soon: false },
  { icon: Share2,      title: 'Social Media Syndication',  desc: 'Publish to all channels from one place',                   soon: false },
  { icon: Building2,   title: 'Enterprise-grade',          desc: 'Role-based access, team workspaces, and SLA support',      soon: false },
  { icon: BarChart2,   title: 'Tracking & Reporting',      desc: 'Campaign analytics and performance insights',              soon: true  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
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
        toast.success('Account created! Check your email to confirm, then sign in.');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        await signIn(email, password);
        toast.success('Signed in!');
        navigate('/studio');
      }
    } catch (error) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07393C] text-white flex flex-col">
      {/* Nav */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#90DDF0] to-[#2C666E] flex items-center justify-center shadow">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">Stitch Studios</span>
        </div>
      </header>

      {/* Hero + Login */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left – pitch */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2C666E]/60 border border-[#90DDF0]/20 text-[#90DDF0] text-sm font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                AI-Powered Creative Studio
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
                Create stunning<br />
                <span className="text-[#90DDF0]">video adverts</span><br />
                in minutes
              </h1>
              <p className="text-slate-300 text-lg leading-relaxed max-w-md">
                Generate, edit, and animate images and videos using the best AI models — all in one studio.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map(({ icon: Icon, title, desc, soon }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="mt-0.5 w-7 h-7 rounded-lg bg-[#2C666E] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-[#90DDF0]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-white leading-tight">{title}</p>
                      {soon && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#90DDF0]/20 text-[#90DDF0] leading-none whitespace-nowrap">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right – login card */}
          <div className="w-full">
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-slate-900">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  {isSignUp ? 'Create an account' : 'Welcome back'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {isSignUp ? 'Start creating today' : 'Sign in to your studio'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block text-slate-700">Email</Label>
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
                  <Label className="text-sm font-medium mb-1.5 block text-slate-700">Password</Label>
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
                    <Label className="text-sm font-medium mb-1.5 block text-slate-700">Confirm Password</Label>
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
                  className="w-full h-11 bg-[#2C666E] hover:bg-[#07393C] text-white font-semibold mt-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isSignUp ? 'Creating account...' : 'Signing in...'}</>
                  ) : (
                    <>{isSignUp ? 'Create Account' : 'Sign In'}<ChevronRight className="w-4 h-4 ml-1" /></>
                  )}
                </Button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setConfirmPassword('');
                    }}
                    className="text-sm text-[#2C666E] hover:underline font-medium"
                  >
                    {isSignUp
                      ? 'Already have an account? Sign in'
                      : "Don't have an account? Sign up"}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-white/10">
        © {new Date().getFullYear()} Stitch Studios. All rights reserved.
      </footer>
    </div>
  );
}
