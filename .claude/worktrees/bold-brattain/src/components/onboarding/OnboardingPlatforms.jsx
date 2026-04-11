import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink, Check, Info } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useSearchParams } from 'react-router-dom';
import { OAUTH_PLATFORMS } from '@/lib/platforms';
import { toast } from 'sonner';

export default function OnboardingPlatforms({ onComplete, onSkip }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [searchParams] = useSearchParams();

  const loadConnections = useCallback(async () => {
    try {
      const res = await apiFetch('/api/accounts/connections');
      const data = await res.json();
      if (!data.error) {
        setConnections(data.connections || []);
      }
    } catch {
      // Ignore — show all as disconnected
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Handle OAuth return
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      const platforms = connected.split(',');
      platforms.forEach(p => {
        toast.warning(`${p.charAt(0).toUpperCase() + p.slice(1)} connected`);
      });
      loadConnections();
    }
  }, [searchParams, loadConnections]);

  function isConnected(platformKey) {
    return connections.some(c => c.platform === platformKey);
  }

  async function handleConnect(platform) {
    if (!platform.authUrl) return;
    setConnecting(platform.key);
    try {
      const res = await apiFetch(`${platform.authUrl}?returnTo=/onboarding`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        toast.error(data.error);
        setConnecting(null);
      }
    } catch {
      toast.error(`Failed to start ${platform.label} connection`);
      setConnecting(null);
    }
  }

  async function handleContinue() {
    // Mark platforms step as prompted
    await apiFetch('/api/onboarding/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms_prompted: true }),
    });
    onComplete();
  }

  const connectedCount = OAUTH_PLATFORMS.filter(p => isConnected(p.key)).length;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Connect your social accounts to publish directly from Stitch. You can always do this later.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {OAUTH_PLATFORMS.map(platform => {
            const connected = isConnected(platform.key);
            const isYouTube = platform.key === 'youtube';

            return (
              <div
                key={platform.key}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors ${
                  connected ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${platform.color} flex items-center justify-center`}>
                    <span className="text-white text-[10px] font-bold">
                      {platform.label.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">{platform.label}</span>
                    <p className="text-xs text-gray-400">{platform.description}</p>
                  </div>
                </div>

                {connected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                    <Check className="w-3 h-3" /> Connected
                  </span>
                ) : isYouTube ? (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Info className="w-3 h-3" /> Via publish
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConnect(platform)}
                    disabled={connecting === platform.key}
                    className="text-xs"
                  >
                    {connecting === platform.key ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <><ExternalLink className="w-3 h-3 mr-1" /> Connect</>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Button
        onClick={handleContinue}
        className="w-full h-11 bg-[#2C666E] hover:bg-[#07393C] text-white text-base"
      >
        {connectedCount > 0 ? 'Continue' : 'Skip for now'}
      </Button>
    </div>
  );
}
