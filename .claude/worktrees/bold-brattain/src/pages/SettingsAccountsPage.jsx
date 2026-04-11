import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Loader2, ExternalLink, AlertTriangle, Check, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { OAUTH_PLATFORMS as PLATFORMS } from '@/lib/platforms';

function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function SettingsAccountsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(null);

  const loadConnections = useCallback(async () => {
    try {
      const res = await apiFetch('/api/accounts/connections');
      const data = await res.json();
      if (!data.error) {
        setConnections(data.connections || []);
      }
    } catch (err) {
      console.error('[SettingsAccounts] load error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  // Show toast for newly connected platforms
  useEffect(() => {
    const connected = searchParams.get('connected');
    if (connected) {
      const platforms = connected.split(',');
      platforms.forEach(p => {
        toast.warning(`${p.charAt(0).toUpperCase() + p.slice(1)} connected`);
      });
    }
  }, [searchParams]);

  function getConnection(platformKey) {
    return connections.find(c => c.platform === platformKey);
  }

  async function handleConnect(platform) {
    if (!platform.authUrl) {
      toast.error(`${platform.label} connection is managed from the publishing dialog`);
      return;
    }

    try {
      let url = platform.authUrl;
      // YouTube auth requires brand_username — fetch first brand kit if available
      if (platform.key === 'youtube') {
        const brandRes = await apiFetch('/api/brand/kit').then(r => r.json()).catch(() => null);
        const brand = brandRes?.brands?.[0] || brandRes?.brand;
        const username = brand?.brand_username || 'default';
        url = `${platform.authUrl}?brand_username=${encodeURIComponent(username)}`;
      }
      const res = await apiFetch(url);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error(`Failed to start ${platform.label} connection`);
    }
  }

  async function handleDisconnect(platformKey) {
    setDisconnecting(platformKey);
    try {
      const res = await apiFetch(`/api/accounts/connections/${platformKey}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setConnections(prev => prev.filter(c => c.platform !== platformKey));
      } else {
        toast.error(data.error || 'Failed to disconnect');
      }
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="h-14 flex items-center gap-3 px-6 bg-white border-b border-slate-200">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">Connected Accounts</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <p className="text-sm text-slate-500">
          Connect your social media accounts to publish directly from Stitch.
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {PLATFORMS.map(platform => {
              const conn = getConnection(platform.key);
              const days = conn ? daysUntilExpiry(conn.token_expires_at) : null;
              const expiringSoon = days !== null && days < 7 && days >= 0;
              const expired = days !== null && days < 0;

              return (
                <div
                  key={platform.key}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    {/* Platform icon dot */}
                    <div className={`w-10 h-10 rounded-lg ${platform.color} flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">
                        {platform.label.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{platform.label}</span>
                        {conn && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                            <Check className="w-2.5 h-2.5" />
                            Connected
                          </span>
                        )}
                      </div>
                      {conn ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {conn.platform_username || conn.platform_page_name || 'Connected'}
                          </span>
                          {expiringSoon && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Expires in {days}d
                            </span>
                          )}
                          {expired && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-red-600">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Expired — reconnect
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">{platform.description}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {conn ? (
                      <>
                        {(expiringSoon || expired) && platform.authUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConnect(platform)}
                          >
                            Reconnect
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDisconnect(platform.key)}
                          disabled={disconnecting === platform.key}
                        >
                          {disconnecting === platform.key ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(platform)}
                        disabled={!platform.authUrl}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
