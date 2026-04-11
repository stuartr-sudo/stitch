import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Loader2, Play, RefreshCw, ExternalLink, Target, Users, Mic2, Monitor, Package } from 'lucide-react';
import { toast } from 'sonner';

const GOAL_LABELS = {
  brand_awareness: 'Brand Awareness', lead_generation: 'Lead Generation', sales: 'Sales',
  engagement: 'Engagement', content_calendar: 'Content Calendar', product_launch: 'Product Launch',
  event_promotion: 'Event Promotion', other: 'Other',
};

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-600', submitted: 'bg-blue-100 text-blue-700',
  planning: 'bg-purple-100 text-purple-700', in_progress: 'bg-amber-100 text-amber-700',
  review: 'bg-orange-100 text-orange-700', completed: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

const PLATFORM_ICONS = {
  youtube: '📺', linkedin: '💼', instagram: '📷', tiktok: '🎵',
  facebook: '👤', google_ads: '🔍', meta_ads: '🎯', website: '🌐',
};

const OUTPUT_LINKS = {
  command_center_campaign: { label: 'Command Center', path: '/command-center' },
  automation_flow: { label: 'Flow', path: '/flows' },
  short: { label: 'Short', path: '/shorts/workbench' },
  carousel: { label: 'Carousel', path: '/carousels' },
  linkedin_post: { label: 'LinkedIn Post', path: '/linkedin' },
  ad_campaign: { label: 'Ad Campaign', path: '/ads' },
  storyboard: { label: 'Storyboard', path: '/storyboards' },
  longform: { label: 'Longform', path: '/longform/workbench' },
  image_set: { label: 'Images', path: '/studio' },
};

export default function BriefDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [brief, setBrief] = useState(null);
  const [outputs, setOutputs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => { loadBrief(); }, [id]);

  const loadBrief = async () => {
    setLoading(true);
    const data = await apiFetch(`/api/briefs/${id}`).then(r => r.json());
    if (data?.brief) setBrief(data.brief);
    if (data?.outputs) setOutputs(data.outputs);
    setLoading(false);
  };

  const handleExecute = async () => {
    setExecuting(true);
    const data = await apiFetch(`/api/briefs/${id}/execute`, { method: 'POST' }).then(r => r.json());
    if (data?.success) {
      await loadBrief();
    } else {
      toast.error(data?.error || 'Failed to execute plan');
    }
    setExecuting(false);
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    const data = await apiFetch(`/api/briefs/${id}/generate-plan`, { method: 'POST' }).then(r => r.json());
    if (data?.brief) setBrief(data.brief);
    setRegenerating(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (!brief) return <div className="min-h-screen flex items-center justify-center text-slate-500">Brief not found</div>;

  const plan = brief.recommended_plan;

  return (
    <div className="min-h-screen bg-slate-50 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/briefs')} className="text-slate-400 hover:text-slate-600"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{brief.title}</h1>
            {brief.client_name && <p className="text-sm text-slate-500">{brief.client_name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${STATUS_COLORS[brief.status] || ''}`}>{brief.status}</span>
          <button onClick={() => navigate(`/briefs/${id}/edit`)} className="text-sm text-[#2C666E] hover:underline">Edit</button>
        </div>
      </div>

      {/* Brief Summary */}
      <div className="bg-white rounded-xl border p-5 mb-6">
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Brief Summary</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {brief.goal && <div><span className="text-slate-500">Goal:</span> <span className="ml-1 font-medium">{GOAL_LABELS[brief.goal]}</span></div>}
          {brief.goal_description && <div className="col-span-2"><span className="text-slate-500">Description:</span> <span className="ml-1">{brief.goal_description}</span></div>}
          {(brief.platforms || []).length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Platforms:</span>
              {(brief.platforms || []).map(p => <span key={p} title={p} className="text-base">{PLATFORM_ICONS[p]}</span>)}
            </div>
          )}
          {(brief.tone || []).length > 0 && <div><span className="text-slate-500">Tone:</span> <span className="ml-1 capitalize">{(brief.tone || []).join(', ')}</span></div>}
          {brief.budget_range && <div><span className="text-slate-500">Budget:</span> <span className="ml-1">{brief.budget_range.replace(/_/g, ' ')}</span></div>}
          {brief.urgency && <div><span className="text-slate-500">Urgency:</span> <span className="ml-1 capitalize">{brief.urgency}</span></div>}
        </div>
        {(brief.deliverables || []).length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <span className="text-sm text-slate-500 flex items-center gap-1 mb-2"><Package className="w-3.5 h-3.5" /> Deliverables</span>
            <div className="flex flex-wrap gap-2">
              {(brief.deliverables || []).map((d, i) => (
                <span key={i} className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium">
                  {d.quantity || 1}x {d.type}{d.platform ? ` (${d.platform})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommended Plan */}
      {plan && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">AI Recommended Plan</h2>
            <button onClick={handleRegenerate} disabled={regenerating}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#2C666E]">
              {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Regenerate
            </button>
          </div>
          {plan.summary && <p className="text-sm text-slate-600 mb-4">{plan.summary}</p>}
          <div className="space-y-3">
            {(plan.phases || []).map((phase, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-xs font-bold shrink-0">{phase.order}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">{phase.label}</h3>
                    <span className="text-xs text-emerald-600 font-medium">~${phase.estimated_cost}</span>
                  </div>
                  {phase.reasoning && <p className="text-xs text-slate-500 mt-0.5">{phase.reasoning}</p>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="text-sm">
              <span className="text-slate-500">Estimated cost:</span> <span className="font-semibold text-emerald-600">${plan.total_estimated_cost}</span>
              {plan.timeline_estimate && <span className="text-slate-400 ml-3">{plan.timeline_estimate}</span>}
            </div>
            <button onClick={handleExecute} disabled={executing || brief.status === 'in_progress'}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Execute Plan
            </button>
          </div>
        </div>
      )}

      {/* Outputs */}
      {outputs.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Created Content</h2>
          <div className="space-y-2">
            {outputs.map(o => {
              const link = OUTPUT_LINKS[o.output_type];
              return (
                <div key={o.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">{link?.label || o.output_type}</span>
                  <button onClick={() => navigate(link?.path || '/studio')}
                    className="flex items-center gap-1 text-xs text-[#2C666E] hover:underline">
                    Open <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
