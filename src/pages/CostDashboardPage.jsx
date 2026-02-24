import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft, DollarSign, TrendingUp, Loader2, BarChart3, PieChart } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const RANGES = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

function BarRow({ label, value, maxValue, color = 'bg-[#2C666E]' }) {
  const pct = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 w-28 truncate text-right" title={label}>{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2`} style={{ width: `${pct}%` }}>
          {pct > 15 && <span className="text-[10px] text-white font-medium">${value.toFixed(2)}</span>}
        </div>
      </div>
      {pct <= 15 && <span className="text-xs text-slate-500 w-14">${value.toFixed(2)}</span>}
    </div>
  );
}

export default function CostDashboardPage() {
  const navigate = useNavigate();
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/costs/summary?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { toast.error(err.message); setLoading(false); });
  }, [range]);

  const maxModelCost = data?.by_model?.length ? Math.max(...data.by_model.map(m => m.cost)) : 0;
  const maxDayCost = data?.by_day?.length ? Math.max(...data.by_day.map(d => d.cost)) : 0;

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
                <h1 className="text-xl font-bold text-slate-900">Cost Dashboard</h1>
                <p className="text-sm text-slate-500">API spend by model and day</p>
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
        ) : !data || data.entry_count === 0 ? (
          <div className="text-center py-20">
            <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-700">No cost data yet</h2>
            <p className="text-sm text-slate-500">Generate some content to see cost tracking here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <DollarSign className="w-4 h-4" /> Total Spend
                </div>
                <div className="text-3xl font-bold text-slate-900">${data.total.toFixed(2)}</div>
                <div className="text-xs text-slate-400 mt-1">Last {range === '7d' ? '7' : range === '90d' ? '90' : '30'} days</div>
              </div>
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <TrendingUp className="w-4 h-4" /> API Calls
                </div>
                <div className="text-3xl font-bold text-slate-900">{data.entry_count.toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-1">Total operations</div>
              </div>
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <BarChart3 className="w-4 h-4" /> Avg per Day
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  ${data.by_day.length > 0 ? (data.total / data.by_day.length).toFixed(2) : '0.00'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Average daily spend</div>
              </div>
            </div>

            {/* Spend by model */}
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#2C666E]" /> Spend by Model
              </h3>
              <div className="space-y-2">
                {data.by_model.map(m => (
                  <BarRow key={m.model} label={m.model} value={m.cost} maxValue={maxModelCost} />
                ))}
              </div>
            </div>

            {/* Spend by day */}
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#2C666E]" /> Daily Spend
              </h3>
              <div className="space-y-1">
                {data.by_day.slice(-14).map(d => (
                  <BarRow key={d.day} label={d.day} value={d.cost} maxValue={maxDayCost} color="bg-emerald-500" />
                ))}
              </div>
            </div>

            {/* Spend by category */}
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#2C666E]" /> Spend by Category
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {data.by_category.map(c => (
                  <div key={c.category} className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-slate-800">${c.cost.toFixed(2)}</div>
                    <div className="text-xs text-slate-500 capitalize">{c.category}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
