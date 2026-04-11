import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { CreditCard } from 'lucide-react';

const STATUS_CONFIG = {
  healthy:   { dot: 'bg-emerald-500', label: null, pulse: false },
  low:       { dot: 'bg-amber-500',   label: 'Low credits', pulse: true },
  exhausted: { dot: 'bg-red-500',     label: 'Credits exhausted', pulse: true },
  invalid:   { dot: 'bg-red-500',     label: 'Key invalid', pulse: false },
  unknown:   { dot: 'bg-slate-400',   label: null, pulse: false },
};

const BILLING_URL = 'https://platform.openai.com/settings/organization/billing/overview';
const POLL_MS = 5 * 60 * 1000; // 5 minutes

export default function OpenAiBalanceChip() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastFetch = useRef(0);

  const fetchBalance = async () => {
    // Skip if fetched less than 4 min ago (buffer for interval drift)
    if (Date.now() - lastFetch.current < POLL_MS - 60000) return;
    try {
      const res = await apiFetch('/api/openai/balance');
      const json = await res.json();
      setData(json);
      lastFetch.current = Date.now();
    } catch {
      setData({ status: 'unknown' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, POLL_MS);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if no key or still loading
  if (loading || !data || data.status === 'no_key') return null;

  const config = STATUS_CONFIG[data.status] || STATUS_CONFIG.unknown;
  const spendText = data.spend_usd != null ? `$${data.spend_usd.toFixed(2)} this month` : null;
  const displayLabel = config.label || spendText;
  const isAlert = data.status === 'exhausted' || data.status === 'invalid';

  return (
    <a
      href={BILLING_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={data.status === 'exhausted'
        ? 'OpenAI credits exhausted — click to top up'
        : data.status === 'invalid'
          ? 'OpenAI API key is invalid — click to check'
          : spendText
            ? `OpenAI spend: ${spendText}`
            : 'OpenAI key active — click to view billing'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${
        isAlert
          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
          : data.status === 'low'
            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
      }`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${config.dot} ${config.pulse ? 'animate-pulse' : ''}`} />
      {isAlert ? (
        <span className="font-medium">{displayLabel}</span>
      ) : (
        <>
          <CreditCard className="w-3 h-3" />
          {displayLabel && <span>{displayLabel}</span>}
        </>
      )}
    </a>
  );
}
