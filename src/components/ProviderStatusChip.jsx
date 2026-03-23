import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';

const PROVIDERS = [
  { key: 'openai',    label: 'OpenAI' },
  { key: 'fal',       label: 'FAL' },
  { key: 'wavespeed', label: 'Wave' },
];

const DOT_COLORS = {
  healthy:   'bg-emerald-500',
  low:       'bg-amber-500',
  exhausted: 'bg-red-500',
  invalid:   'bg-red-500',
  no_key:    'bg-slate-300',
  unknown:   'bg-slate-300',
};

const POLL_MS = 5 * 60 * 1000;

export default function ProviderStatusChip() {
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastFetch = useRef(0);

  const fetchHealth = async () => {
    if (Date.now() - lastFetch.current < POLL_MS - 60000) return;
    try {
      const res = await apiFetch('/api/providers/health');
      const json = await res.json();
      setHealth(json);
      lastFetch.current = Date.now();
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, POLL_MS);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !health) return null;

  // Check if all are no_key
  const allNoKey = PROVIDERS.every(p => health[p.key]?.status === 'no_key');
  if (allNoKey) return null;

  const hasAlert = PROVIDERS.some(p =>
    health[p.key]?.status === 'exhausted' || health[p.key]?.status === 'invalid'
  );

  return (
    <button
      onClick={() => navigate('/costs')}
      title="API provider status — click for details"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${
        hasAlert
          ? 'bg-red-50 border border-red-200 hover:bg-red-100'
          : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
      }`}
    >
      {PROVIDERS.map(p => {
        const status = health[p.key]?.status || 'unknown';
        if (status === 'no_key') return null;
        const dotColor = DOT_COLORS[status] || DOT_COLORS.unknown;
        const shouldPulse = status === 'exhausted' || status === 'low';

        return (
          <span key={p.key} className="inline-flex items-center gap-1" title={`${p.label}: ${status}`}>
            <span className={`w-2 h-2 rounded-full ${dotColor} ${shouldPulse ? 'animate-pulse' : ''}`} />
            <span className="text-slate-500">{p.label}</span>
          </span>
        );
      })}
    </button>
  );
}
