import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Key,
  Shield,
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';

/**
 * SetupKeys - Secure page for users to add their own API keys to Vercel
 * Keys are sent directly from browser to Vercel API (never touches our server)
 */
export default function SetupKeys() {
  const [vercelToken, setVercelToken] = useState('');
  const [projectId, setProjectId] = useState('');
  const [wavespeedKey, setWavespeedKey] = useState('');
  const [falKey, setFalKey] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState([]);
  const [showVercelToken, setShowVercelToken] = useState(false);
  const [showWavespeed, setShowWavespeed] = useState(false);
  const [showFal, setShowFal] = useState(false);

  const addEnvVariable = async (key, value, target = ['production', 'preview', 'development']) => {
    const response = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        value,
        type: 'encrypted',
        target,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      // Check if variable already exists
      if (error.error?.code === 'ENV_ALREADY_EXISTS') {
        // Try to update instead
        return updateEnvVariable(key, value, target);
      }
      throw new Error(error.error?.message || `Failed to add ${key}`);
    }

    return { key, success: true };
  };

  const updateEnvVariable = async (key, value, target) => {
    // First, get the env var ID
    const listResponse = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
      },
    });

    if (!listResponse.ok) {
      throw new Error(`Failed to list env vars for ${key}`);
    }

    const { envs } = await listResponse.json();
    const existingEnv = envs.find(e => e.key === key);

    if (!existingEnv) {
      throw new Error(`Could not find existing ${key} to update`);
    }

    // Update the variable
    const updateResponse = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env/${existingEnv.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value,
        target,
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(error.error?.message || `Failed to update ${key}`);
    }

    return { key, success: true, updated: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!vercelToken.trim()) {
      toast.error('Please enter your Vercel Access Token');
      return;
    }
    if (!projectId.trim()) {
      toast.error('Please enter your Vercel Project ID');
      return;
    }
    if (!wavespeedKey.trim() && !falKey.trim()) {
      toast.error('Please enter at least one API key');
      return;
    }

    setIsSubmitting(true);
    setResults([]);

    const keysToAdd = [];
    if (wavespeedKey.trim()) {
      keysToAdd.push({ key: 'WAVESPEED_API_KEY', value: wavespeedKey.trim() });
    }
    if (falKey.trim()) {
      keysToAdd.push({ key: 'FAL_KEY', value: falKey.trim() });
    }

    const newResults = [];

    for (const { key, value } of keysToAdd) {
      try {
        const result = await addEnvVariable(key, value);
        newResults.push({ 
          key, 
          success: true, 
          message: result.updated ? 'Updated successfully' : 'Added successfully' 
        });
      } catch (error) {
        newResults.push({ 
          key, 
          success: false, 
          message: error.message 
        });
      }
    }

    setResults(newResults);
    setIsSubmitting(false);

    const successCount = newResults.filter(r => r.success).length;
    if (successCount === newResults.length) {
      toast.success('All API keys saved to Vercel!');
    } else if (successCount > 0) {
      toast.warning('Some keys saved, but there were errors');
    } else {
      toast.error('Failed to save keys. Check your Vercel token and project ID.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0EDEE] to-slate-100 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white mb-4 shadow-lg">
            <Key className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Setup Your API Keys</h1>
          <p className="text-slate-600">Securely add your AI service keys to your Vercel project</p>
        </div>

        {/* Security Notice */}
        <div className="bg-[#90DDF0]/20 border border-[#2C666E]/20 rounded-xl p-4 mb-6">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-[#2C666E] shrink-0 mt-0.5" />
            <div className="text-sm text-[#07393C]">
              <p className="font-semibold mb-1">Your keys are secure</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Keys are sent directly from your browser to Vercel's API</li>
                <li>They never pass through our servers</li>
                <li>Keys are encrypted in Vercel's environment</li>
                <li>Your Vercel token is only used locally and not stored</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
          {/* Vercel Credentials */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#2C666E]" />
              Vercel Authorization
            </h2>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Vercel Access Token
                <a 
                  href="https://vercel.com/account/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-2 text-[#2C666E] hover:underline text-xs inline-flex items-center"
                >
                  Get token <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Label>
              <div className="relative">
                <Input
                  type={showVercelToken ? 'text' : 'password'}
                  value={vercelToken}
                  onChange={(e) => setVercelToken(e.target.value)}
                  placeholder="Enter your Vercel access token"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowVercelToken(!showVercelToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showVercelToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Create a token with "Full Account" scope</p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Vercel Project ID
                <span className="ml-2 text-slate-400 text-xs">(Found in Project Settings → General)</span>
              </Label>
              <Input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="prj_xxxxxxxxxxxx"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* API Keys */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#2C666E]" />
              AI Service Keys
            </h2>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Wavespeed API Key
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
              <p className="text-xs text-slate-500 mt-1">Required for image & video generation</p>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                FAL.ai API Key
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
              <p className="text-xs text-slate-500 mt-1">Required for Try Style & Lens features</p>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    result.success 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="font-medium">{result.key}:</span>
                  <span>{result.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 bg-[#2C666E] hover:bg-[#07393C] text-white text-lg"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving to Vercel...</>
            ) : (
              <><Key className="w-5 h-5 mr-2" /> Save Keys to Vercel</>
            )}
          </Button>

          <p className="text-xs text-center text-slate-500">
            After saving, you may need to redeploy your project for changes to take effect.
          </p>
        </form>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-slate-800 mb-4">How to get your Vercel credentials:</h3>
          <ol className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Go to <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-[#2C666E] hover:underline">vercel.com/account/tokens</a> and create a new token with "Full Account" scope</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Go to your Vercel project → Settings → General, and copy the "Project ID"</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Enter your credentials above along with your AI service API keys</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-xs font-bold shrink-0">4</span>
              <span>Click "Save Keys to Vercel" - keys go directly to Vercel, never through our servers</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
