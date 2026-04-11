import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, ArrowRight, Check, Loader2, Send, Target, Users, Mic2, Monitor, Package, Settings, ClipboardList } from 'lucide-react';

const GOALS = [
  { key: 'brand_awareness', label: 'Brand Awareness', icon: '📢', desc: 'Get your name out there' },
  { key: 'lead_generation', label: 'Lead Generation', icon: '🧲', desc: 'Capture potential customers' },
  { key: 'sales', label: 'Sales', icon: '💰', desc: 'Drive direct revenue' },
  { key: 'engagement', label: 'Engagement', icon: '💬', desc: 'Build community interaction' },
  { key: 'content_calendar', label: 'Content Calendar', icon: '📅', desc: 'Fill your content schedule' },
  { key: 'product_launch', label: 'Product Launch', icon: '🚀', desc: 'Launch something new' },
  { key: 'event_promotion', label: 'Event Promotion', icon: '🎉', desc: 'Promote an upcoming event' },
  { key: 'other', label: 'Other', icon: '✨', desc: 'Custom goal' },
];

const TONES = ['professional', 'casual', 'edgy', 'humorous', 'inspirational', 'educational', 'luxury', 'friendly'];

const PLATFORMS = [
  { key: 'youtube', label: 'YouTube', icon: '📺' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { key: 'instagram', label: 'Instagram', icon: '📷' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵' },
  { key: 'facebook', label: 'Facebook', icon: '👤' },
  { key: 'google_ads', label: 'Google Ads', icon: '🔍' },
  { key: 'meta_ads', label: 'Meta Ads', icon: '🎯' },
  { key: 'website', label: 'Website', icon: '🌐' },
];

const DELIVERABLE_TYPES = [
  { key: 'short', label: 'Short Video' },
  { key: 'carousel', label: 'Carousel Post' },
  { key: 'linkedin_post', label: 'LinkedIn Post' },
  { key: 'ad_set', label: 'Ad Campaign' },
  { key: 'storyboard', label: 'Storyboard' },
  { key: 'longform', label: 'Long Video' },
  { key: 'image_set', label: 'Image Set' },
];

const BUDGETS = [
  { key: 'under_50', label: 'Under $50' },
  { key: '50_200', label: '$50 - $200' },
  { key: '200_500', label: '$200 - $500' },
  { key: '500_plus', label: '$500+' },
  { key: 'unlimited', label: 'Unlimited' },
  { key: 'not_specified', label: 'Not specified' },
];

const STEPS = [
  { key: 'goal', label: 'Goal', icon: Target },
  { key: 'audience', label: 'Audience', icon: Users },
  { key: 'tone', label: 'Tone', icon: Mic2 },
  { key: 'platforms', label: 'Platforms', icon: Monitor },
  { key: 'deliverables', label: 'Deliverables', icon: Package },
  { key: 'details', label: 'Details', icon: Settings },
  { key: 'review', label: 'Review', icon: ClipboardList },
];

export default function BriefWizardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState({ title: 'New Brief', deliverables: [], platforms: [], tone: [], competitors: [], kpis: [] });
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    if (id) {
      apiFetch(`/api/briefs/${id}`).then(r => r.json()).then(data => {
        if (data?.brief) setBrief(data.brief);
        setLoading(false);
      });
    }
    // Load brand kits for selector
    apiFetch('/api/brand/kit').then(r => r.json()).then(data => {
      if (data?.brands) setBrands(data.brands);
      else if (data?.brand) setBrands([data.brand]);
    }).catch(() => {});
  }, [id]);

  const update = useCallback((field, value) => {
    setBrief(prev => ({ ...prev, [field]: value }));
  }, []);

  const autoSave = useCallback(async () => {
    if (!brief.id) return;
    setSaving(true);
    await apiFetch(`/api/briefs/${brief.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brief)
    });
    setSaving(false);
  }, [brief]);

  const handleNext = async () => {
    if (step === 0 && !brief.id) {
      // Create brief on first next
      const data = await apiFetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brief)
      }).then(r => r.json());
      if (data?.brief) {
        setBrief(data.brief);
        window.history.replaceState(null, '', `/briefs/${data.brief.id}/edit`);
      }
    } else {
      await autoSave();
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await autoSave();
    const data = await apiFetch(`/api/briefs/${brief.id}/submit`, { method: 'POST' }).then(r => r.json());
    if (data?.brief) navigate(`/briefs/${data.brief.id}`);
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/briefs')} className="text-slate-400 hover:text-slate-600"><ArrowLeft className="w-5 h-5" /></button>
          <input value={brief.title} onChange={e => update('title', e.target.value)}
            className="text-lg font-semibold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 w-64" placeholder="Brief title..." />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {saving && <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>}
          <span>Step {step + 1} of {STEPS.length}</span>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center gap-1 max-w-4xl mx-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <button key={s.key} onClick={() => { if (i <= step) { autoSave(); setStep(i); } }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center
                  ${active ? 'bg-[#2C666E] text-white' : done ? 'bg-emerald-50 text-emerald-700' : 'text-slate-400'}`}>
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-3xl mx-auto p-6">
        {step === 0 && /* Goal */ (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">What's the goal?</h2>
            <p className="text-sm text-slate-500 mb-4">What does the client want to achieve?</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {GOALS.map(g => (
                <button key={g.key} onClick={() => update('goal', g.key)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${brief.goal === g.key ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className="text-xl">{g.icon}</span>
                  <p className="text-xs font-semibold mt-1">{g.label}</p>
                  <p className="text-[10px] text-slate-500">{g.desc}</p>
                </button>
              ))}
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Describe the goal</label>
            <textarea value={brief.goal_description || ''} onChange={e => update('goal_description', e.target.value)}
              className="w-full border rounded-lg p-3 text-sm min-h-[80px] focus:ring-[#2C666E] focus:border-[#2C666E]" placeholder="What specifically should this campaign achieve?" />
            <label className="block text-sm font-medium text-slate-700 mt-4 mb-1">Client Name (optional)</label>
            <input value={brief.client_name || ''} onChange={e => update('client_name', e.target.value)}
              className="w-full border rounded-lg p-2.5 text-sm focus:ring-[#2C666E] focus:border-[#2C666E]" placeholder="e.g., Acme Corp" />
            {brands.length > 0 && (
              <>
                <label className="block text-sm font-medium text-slate-700 mt-4 mb-1">Brand Kit</label>
                <select value={brief.brand_kit_id || ''} onChange={e => update('brand_kit_id', e.target.value || null)}
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-[#2C666E] focus:border-[#2C666E]">
                  <option value="">No brand kit</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name || b.brand_username}</option>)}
                </select>
              </>
            )}
          </div>
        )}

        {step === 1 && /* Audience */ (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Who's the audience?</h2>
            <p className="text-sm text-slate-500 mb-4">Describe who this content is for</p>
            <label className="block text-sm font-medium text-slate-700 mb-1">Demographics</label>
            <textarea value={brief.audience_demographics || ''} onChange={e => update('audience_demographics', e.target.value)}
              className="w-full border rounded-lg p-3 text-sm min-h-[70px] mb-4 focus:ring-[#2C666E] focus:border-[#2C666E]" placeholder="Age, gender, location, income level..." />
            <label className="block text-sm font-medium text-slate-700 mb-1">Psychographics</label>
            <textarea value={brief.audience_psychographics || ''} onChange={e => update('audience_psychographics', e.target.value)}
              className="w-full border rounded-lg p-3 text-sm min-h-[70px] mb-4 focus:ring-[#2C666E] focus:border-[#2C666E]" placeholder="Interests, values, lifestyle, motivations..." />
            <label className="block text-sm font-medium text-slate-700 mb-1">Pain Points</label>
            <textarea value={brief.audience_pain_points || ''} onChange={e => update('audience_pain_points', e.target.value)}
              className="w-full border rounded-lg p-3 text-sm min-h-[70px] focus:ring-[#2C666E] focus:border-[#2C666E]" placeholder="What problems does the audience face that this campaign addresses?" />
          </div>
        )}

        {step === 2 && /* Tone */ (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">What's the tone?</h2>
            <p className="text-sm text-slate-500 mb-4">How should the content sound? Select all that apply.</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {TONES.map(t => {
                const selected = (brief.tone || []).includes(t);
                return (
                  <button key={t} onClick={() => update('tone', selected ? (brief.tone || []).filter(x => x !== t) : [...(brief.tone || []), t])}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all capitalize
                      ${selected ? 'bg-[#2C666E] text-white border-[#2C666E]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                    {t}
                  </button>
                );
              })}
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tone Notes</label>
            <textarea value={brief.tone_notes || ''} onChange={e => update('tone_notes', e.target.value)}
              className="w-full border rounded-lg p-3 text-sm min-h-[70px] focus:ring-[#2C666E] focus:border-[#2C666E]" placeholder="Any additional notes on voice, language, or communication style..." />
          </div>
        )}

        {step === 3 && /* Platforms */ (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Which platforms?</h2>
            <p className="text-sm text-slate-500 mb-4">Where will this content be published?</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PLATFORMS.map(p => {
                const selected = (brief.platforms || []).includes(p.key);
                return (
                  <button key={p.key} onClick={() => update('platforms', selected ? (brief.platforms || []).filter(x => x !== p.key) : [...(brief.platforms || []), p.key])}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${selected ? 'border-[#2C666E] bg-[#2C666E]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className="text-2xl block">{p.icon}</span>
                    <p className="text-xs font-medium mt-1">{p.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && /* Deliverables */ (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">What deliverables?</h2>
            <p className="text-sm text-slate-500 mb-4">What specific content pieces are needed?</p>
            {(brief.deliverables || []).map((d, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 bg-white rounded-lg border p-2">
                <select value={d.type} onChange={e => { const arr = [...brief.deliverables]; arr[i].type = e.target.value; update('deliverables', arr); }}
                  className="border rounded p-1.5 text-sm flex-1">
                  {DELIVERABLE_TYPES.map(dt => <option key={dt.key} value={dt.key}>{dt.label}</option>)}
                </select>
                <input type="number" min="1" value={d.quantity || 1} onChange={e => { const arr = [...brief.deliverables]; arr[i].quantity = parseInt(e.target.value) || 1; update('deliverables', arr); }}
                  className="border rounded p-1.5 text-sm w-16 text-center" />
                <select value={d.platform || ''} onChange={e => { const arr = [...brief.deliverables]; arr[i].platform = e.target.value; update('deliverables', arr); }}
                  className="border rounded p-1.5 text-sm flex-1">
                  <option value="">Any platform</option>
                  {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
                <button onClick={() => update('deliverables', (brief.deliverables || []).filter((_, j) => j !== i))}
                  className="text-slate-400 hover:text-red-500 p-1">x</button>
              </div>
            ))}
            <button onClick={() => update('deliverables', [...(brief.deliverables || []), { type: 'short', quantity: 1, platform: '' }])}
              className="text-sm text-[#2C666E] hover:underline mt-2">+ Add deliverable</button>
          </div>
        )}

        {step === 5 && /* Details */ (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Additional Details</h2>
            <p className="text-sm text-slate-500 mb-4">Budget, timeline, competitors, and KPIs</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Budget Range</label>
                <select value={brief.budget_range || 'not_specified'} onChange={e => update('budget_range', e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm">
                  {BUDGETS.map(b => <option key={b.key} value={b.key}>{b.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
                <select value={brief.urgency || 'normal'} onChange={e => update('urgency', e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm">
                  <option value="asap">ASAP</option>
                  <option value="urgent">Urgent</option>
                  <option value="normal">Normal</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
            <input type="date" value={brief.deadline ? brief.deadline.split('T')[0] : ''} onChange={e => update('deadline', e.target.value ? new Date(e.target.value).toISOString() : null)}
              className="w-full border rounded-lg p-2.5 text-sm mb-4" />
            <label className="block text-sm font-medium text-slate-700 mb-1">Competitors (one per line)</label>
            <textarea value={(brief.competitors || []).map(c => c.name || c).join('\n')} onChange={e => update('competitors', e.target.value.split('\n').filter(Boolean).map(name => ({ name })))}
              className="w-full border rounded-lg p-3 text-sm min-h-[60px] mb-4" placeholder="Competitor 1&#10;Competitor 2" />
            <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
            <textarea value={brief.additional_notes || ''} onChange={e => update('additional_notes', e.target.value)}
              className="w-full border rounded-lg p-3 text-sm min-h-[70px]" placeholder="Any other context, requirements, or constraints..." />
          </div>
        )}

        {step === 6 && /* Review */ (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Review Brief</h2>
            <p className="text-sm text-slate-500 mb-4">Review everything before submitting for AI recommendations</p>
            <div className="space-y-3">
              <ReviewRow label="Title" value={brief.title} />
              <ReviewRow label="Client" value={brief.client_name} />
              <ReviewRow label="Goal" value={GOALS.find(g => g.key === brief.goal)?.label} />
              <ReviewRow label="Goal Description" value={brief.goal_description} />
              <ReviewRow label="Audience" value={[brief.audience_demographics, brief.audience_psychographics].filter(Boolean).join(' | ')} />
              <ReviewRow label="Tone" value={(brief.tone || []).join(', ')} />
              <ReviewRow label="Platforms" value={(brief.platforms || []).map(p => PLATFORMS.find(x => x.key === p)?.label).filter(Boolean).join(', ')} />
              <ReviewRow label="Deliverables" value={(brief.deliverables || []).map(d => `${d.quantity || 1}x ${DELIVERABLE_TYPES.find(t => t.key === d.type)?.label || d.type}`).join(', ')} />
              <ReviewRow label="Budget" value={BUDGETS.find(b => b.key === brief.budget_range)?.label} />
              <ReviewRow label="Urgency" value={brief.urgency} />
              {brief.deadline && <ReviewRow label="Deadline" value={new Date(brief.deadline).toLocaleDateString()} />}
              {(brief.competitors || []).length > 0 && <ReviewRow label="Competitors" value={brief.competitors.map(c => c.name || c).join(', ')} />}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-4 border-t">
          <button onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={handleNext}
              className="flex items-center gap-1.5 bg-[#2C666E] hover:bg-[#1f4f56] text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Brief
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-500 w-32 shrink-0 font-medium">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  );
}
