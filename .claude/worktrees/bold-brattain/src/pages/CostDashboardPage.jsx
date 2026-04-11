import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, DollarSign, TrendingUp, Loader2, BarChart3, ExternalLink, Zap, AlertCircle, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const RANGES = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

const PROVIDERS = [
  {
    key: 'openai',
    name: 'OpenAI',
    color: 'bg-emerald-500',
    colorLight: 'bg-emerald-50 border-emerald-200',
    colorBar: 'bg-emerald-500',
    billingUrl: 'https://platform.openai.com/settings/organization/billing/overview',
    icon: '🤖',
  },
  {
    key: 'fal',
    name: 'FAL.ai',
    color: 'bg-violet-500',
    colorLight: 'bg-violet-50 border-violet-200',
    colorBar: 'bg-violet-500',
    billingUrl: 'https://fal.ai/dashboard/billing',
    icon: '⚡',
  },
  {
    key: 'wavespeed',
    name: 'Wavespeed',
    color: 'bg-blue-500',
    colorLight: 'bg-blue-50 border-blue-200',
    colorBar: 'bg-blue-500',
    billingUrl: 'https://wavespeed.ai/dashboard',
    icon: '🌊',
  },
  {
    key: 'serpapi',
    name: 'SerpAPI',
    color: 'bg-orange-500',
    colorLight: 'bg-orange-50 border-orange-200',
    colorBar: 'bg-orange-500',
    billingUrl: 'https://serpapi.com/dashboard',
    icon: '🔍',
  },
  {
    key: 'exa',
    name: 'Exa',
    color: 'bg-cyan-500',
    colorLight: 'bg-cyan-50 border-cyan-200',
    colorBar: 'bg-cyan-500',
    billingUrl: 'https://dashboard.exa.ai',
    icon: '📄',
  },
];

const STATUS_BADGE = {
  healthy:   { label: 'Active',    icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-50' },
  low:       { label: 'Low',       icon: AlertCircle,  className: 'text-amber-600 bg-amber-50' },
  exhausted: { label: 'Exhausted', icon: XCircle,      className: 'text-red-600 bg-red-50' },
  invalid:   { label: 'Invalid',   icon: XCircle,      className: 'text-red-600 bg-red-50' },
  no_key:    { label: 'No Key',    icon: AlertCircle,  className: 'text-slate-400 bg-slate-50' },
  unknown:   { label: 'Unknown',   icon: AlertCircle,  className: 'text-slate-400 bg-slate-50' },
};

function BarRow({ label, value, maxValue, color = 'bg-[#2C666E]' }) {
  const pct = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 w-32 truncate text-right" title={label}>{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2`} style={{ width: `${pct}%` }}>
          {pct > 15 && <span className="text-[10px] text-white font-medium">${value.toFixed(2)}</span>}
        </div>
      </div>
      {pct <= 15 && <span className="text-xs text-slate-500 w-14">${value.toFixed(2)}</span>}
    </div>
  );
}

function StackedDayBar({ day, values, maxValue }) {
  // values: { openai: n, fal: n, wavespeed: n }
  const total = Object.values(values).reduce((s, v) => s + v, 0);
  const pct = maxValue > 0 ? Math.max((total / maxValue) * 100, 2) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 w-20 text-right">{day.slice(5)}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden flex">
        {PROVIDERS.map(p => {
          const segPct = maxValue > 0 ? (values[p.key] || 0) / maxValue * 100 : 0;
          if (segPct < 0.5) return null;
          return (
            <div
              key={p.key}
              className={`${p.colorBar} h-full first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${segPct}%` }}
              title={`${p.name}: $${(values[p.key] || 0).toFixed(2)}`}
            />
          );
        })}
      </div>
      <span className="text-xs text-slate-500 w-14">${total.toFixed(2)}</span>
    </div>
  );
}

function ProviderCard({ provider, health, costData }) {
  const status = STATUS_BADGE[health?.status] || STATUS_BADGE.unknown;
  const StatusIcon = status.icon;
  const spend = health?.spend_usd ?? costData ?? 0;
  const calls = health?.calls ?? 0;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header accent */}
      <div className={`h-1.5 ${provider.color}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{provider.icon}</span>
            <h3 className="font-semibold text-slate-900">{provider.name}</h3>
          </div>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>

        <div className="text-3xl font-bold text-slate-900 mb-1">
          ${spend.toFixed(2)}
        </div>
        <div className="text-xs text-slate-400 mb-4">
          {calls.toLocaleString()} API calls this month
        </div>

        <a
          href={provider.billingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-slate-50 ${
            health?.status === 'exhausted' || health?.status === 'invalid'
              ? 'text-red-600 border-red-200 hover:bg-red-50'
              : 'text-slate-600 border-slate-200'
          }`}
        >
          {health?.status === 'exhausted' ? 'Top Up Credits' : 'View Billing'}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export default function CostDashboardPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/costs/summary?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { toast.error(err.message); setLoading(false); });
  }, [range]);

  useEffect(() => {
    apiFetch('/api/providers/health')
      .then(r => r.json())
      .then(h => setHealth(h))
      .catch(() => {});
  }, []);

  const maxModelCost = data?.by_model?.length ? Math.max(...data.by_model.map(m => m.cost)) : 0;
  const maxOpCost = data?.by_operation?.length ? Math.max(...data.by_operation.map(o => o.cost)) : 0;

  // Build stacked daily data
  const dailyStacked = [];
  if (data?.provider_daily) {
    const allDays = new Set();
    for (const prov of Object.values(data.provider_daily)) {
      for (const d of prov) allDays.add(d.day);
    }
    const sortedDays = [...allDays].sort();
    const lastN = sortedDays.slice(-14);

    for (const day of lastN) {
      const values = {};
      for (const p of PROVIDERS) {
        const entry = (data.provider_daily[p.key] || []).find(d => d.day === day);
        values[p.key] = entry?.cost || 0;
      }
      dailyStacked.push({ day, values });
    }
  }
  const maxDayTotal = dailyStacked.length
    ? Math.max(...dailyStacked.map(d => Object.values(d.values).reduce((s, v) => s + v, 0)))
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/studio')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">API Usage & Costs</h1>
                <p className="text-sm text-slate-500">Monitor spend across all AI providers</p>
              </div>
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    range === r.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#2C666E]" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Provider cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PROVIDERS.map(p => {
                const provCost = data?.by_provider?.find(bp => bp.name === p.key)?.cost || 0;
                return (
                  <ProviderCard
                    key={p.key}
                    provider={p}
                    health={health?.[p.key]}
                    costData={provCost}
                  />
                );
              })}
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <DollarSign className="w-4 h-4" /> Total Spend
                </div>
                <div className="text-3xl font-bold text-slate-900">${(data?.total || 0).toFixed(2)}</div>
                <div className="text-xs text-slate-400 mt-1">Last {range === '7d' ? '7' : range === '90d' ? '90' : '30'} days</div>
              </div>
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <Activity className="w-4 h-4" /> API Calls
                </div>
                <div className="text-3xl font-bold text-slate-900">{(data?.entry_count || 0).toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-1">Total operations</div>
              </div>
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <TrendingUp className="w-4 h-4" /> Avg per Day
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  ${data?.by_day?.length > 0 ? (data.total / data.by_day.length).toFixed(2) : '0.00'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Average daily spend</div>
              </div>
            </div>

            {/* Daily spend (stacked by provider) */}
            {dailyStacked.length > 0 && (
              <div className="bg-white rounded-xl border p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#2C666E]" /> Daily Spend by Provider
                </h3>
                <div className="flex gap-4 mb-4">
                  {PROVIDERS.map(p => (
                    <div key={p.key} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                      {p.name}
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {dailyStacked.map(d => (
                    <StackedDayBar key={d.day} day={d.day} values={d.values} maxValue={maxDayTotal} />
                  ))}
                </div>
              </div>
            )}

            {/* Spend by model */}
            {data?.by_model?.length > 0 && (
              <div className="bg-white rounded-xl border p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#2C666E]" /> Spend by Model
                </h3>
                <div className="space-y-2">
                  {data.by_model.slice(0, 15).map(m => (
                    <BarRow key={m.model} label={m.model} value={m.cost} maxValue={maxModelCost} />
                  ))}
                </div>
              </div>
            )}

            {/* Spend by operation */}
            {data?.by_operation?.length > 0 && (
              <div className="bg-white rounded-xl border p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#2C666E]" /> Spend by Operation
                </h3>
                <div className="space-y-2">
                  {data.by_operation.map(o => (
                    <BarRow key={o.name} label={o.name.replace(/_/g, ' ')} value={o.cost} maxValue={maxOpCost} color="bg-amber-500" />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {(!data || data.entry_count === 0) && (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-slate-700">No cost data yet</h2>
                <p className="text-sm text-slate-500">Generate some content to see cost tracking here.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
