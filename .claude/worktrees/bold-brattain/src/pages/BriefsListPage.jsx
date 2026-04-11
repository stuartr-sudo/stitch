import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { Plus, FileText, ArrowLeft, Loader2, Trash2 } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  planning: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-amber-100 text-amber-700',
  review: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

const GOAL_LABELS = {
  brand_awareness: 'Brand Awareness',
  lead_generation: 'Lead Generation',
  sales: 'Sales',
  engagement: 'Engagement',
  content_calendar: 'Content Calendar',
  product_launch: 'Product Launch',
  event_promotion: 'Event Promotion',
  other: 'Other',
};

const PLATFORM_ICONS = {
  youtube: '📺', linkedin: '💼', instagram: '📷', tiktok: '🎵',
  facebook: '👤', google_ads: '🔍', meta_ads: '🎯', website: '🌐',
};

export default function BriefsListPage() {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadBriefs(); }, []);

  const loadBriefs = async () => {
    setLoading(true);
    const data = await apiFetch('/api/briefs').then(r => r.json());
    if (data?.briefs) setBriefs(data.briefs);
    setLoading(false);
  };

  const handleNew = async () => {
    const data = await apiFetch('/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Brief' })
    }).then(r => r.json());
    if (data?.brief) navigate(`/briefs/${data.brief.id}/edit`);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await apiFetch(`/api/briefs/${id}`, { method: 'DELETE' });
    setBriefs(b => b.filter(x => x.id !== id));
  };

  const filtered = filter === 'all' ? briefs : briefs.filter(b => b.status === filter);
  const counts = briefs.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/studio')} className="text-slate-400 hover:text-slate-600"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-slate-900">Client Briefs</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6 ml-8">Capture what the client wants, get AI-recommended workflows</p>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {['all', 'draft', 'in_progress', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f ? 'bg-[#2C666E] text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
              {f === 'all' ? `All ${briefs.length}` : `${f.replace('_', ' ')} ${counts[f] || 0}`}
            </button>
          ))}
        </div>
        <button onClick={handleNew} className="flex items-center gap-2 bg-[#2C666E] hover:bg-[#1f4f56] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> New Brief
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No briefs yet</p>
          <button onClick={handleNew} className="mt-3 text-sm text-[#2C666E] hover:underline">Create your first brief</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(brief => (
            <div key={brief.id} onClick={() => navigate(brief.status === 'draft' ? `/briefs/${brief.id}/edit` : `/briefs/${brief.id}`)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 cursor-pointer transition-all group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-slate-900 text-sm truncate flex-1">{brief.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${STATUS_COLORS[brief.status] || STATUS_COLORS.draft}`}>
                  {brief.status}
                </span>
              </div>
              {brief.client_name && <p className="text-xs text-slate-500 mb-2">{brief.client_name}</p>}
              {brief.goal && <p className="text-xs text-slate-600 mb-2">{GOAL_LABELS[brief.goal] || brief.goal}</p>}
              <div className="flex items-center gap-1 mb-2">
                {(brief.platforms || []).map(p => (
                  <span key={p} className="text-sm" title={p}>{PLATFORM_ICONS[p] || '📌'}</span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {(brief.deliverables || []).reduce((s, d) => s + (d.quantity || 1), 0)} deliverables
                </span>
                <button onClick={(e) => handleDelete(brief.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
