import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import FlowCard from '@/components/flows/FlowCard';

export default function FlowsListPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('flows');
  const [flows, setFlows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [flowsData, templatesData] = await Promise.all([
      apiFetch('/api/flows').then(r => r.json()),
      apiFetch('/api/flows/templates').then(r => r.json()),
    ]);
    if (flowsData?.flows) setFlows(flowsData.flows);
    if (templatesData?.templates) setTemplates(templatesData.templates);

    // Gather all executions from flows
    const allExecs = (flowsData?.flows || []).flatMap(f =>
      (f.automation_executions || []).map(e => ({ ...e, flow_name: f.name }))
    );
    setExecutions(allExecs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    setLoading(false);
  };

  const handleNewFlow = async () => {
    const data = await apiFetch('/api/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Untitled Flow' })
    }).then(r => r.json());
    if (data?.flow) navigate(`/flows/${data.flow.id}`);
  };

  const handleCloneTemplate = async (templateId) => {
    const data = await apiFetch(`/api/flows/templates/${templateId}/clone`, { method: 'POST' }).then(r => r.json());
    if (data?.flow) navigate(`/flows/${data.flow.id}`);
  };

  const handleRunFlow = async (flowId) => {
    const data = await apiFetch(`/api/flows/${flowId}/execute`, { method: 'POST' }).then(r => r.json());
    if (data?.execution) navigate(`/flows/${flowId}/run/${data.execution.id}`);
  };

  const handleDeleteFlow = async (flowId) => {
    await apiFetch(`/api/flows/${flowId}`, { method: 'DELETE' });
    setFlows(prev => prev.filter(f => f.id !== flowId));
    setSelected(prev => { const next = new Set(prev); next.delete(flowId); return next; });
  };

  const toggleSelect = (flowId) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(flowId) ? next.delete(flowId) : next.add(flowId);
      return next;
    });
    setBulkConfirming(false);
  };

  const toggleSelectAll = () => {
    if (selected.size === flows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(flows.map(f => f.id)));
    }
    setBulkConfirming(false);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    await Promise.all([...selected].map(id => apiFetch(`/api/flows/${id}`, { method: 'DELETE' })));
    setFlows(prev => prev.filter(f => !selected.has(f.id)));
    setSelected(new Set());
    setBulkConfirming(false);
    setBulkDeleting(false);
  };

  const completedCount = executions.filter(e => e.status === 'completed').length;
  const successRate = executions.length > 0 ? Math.round((completedCount / executions.length) * 100) : 0;
  const scheduledCount = flows.filter(f => f.trigger_type === 'scheduled').length;

  const TABS = [
    { id: 'flows', label: 'My Flows' },
    { id: 'templates', label: 'Templates' },
    { id: 'executions', label: 'Executions' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/studio')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors" title="Back to Studio">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            </button>
            <h1 className="text-xl font-bold text-slate-800">Automation Flows</h1>
          </div>
          <button onClick={handleNewFlow} className="px-5 py-2 text-sm bg-[#2C666E] text-white font-semibold rounded-lg hover:bg-[#07393C] transition-colors">
            + New Flow
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6 border-b border-slate-200">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 text-sm transition-colors ${tab === t.id ? 'text-[#2C666E] border-b-2 border-[#2C666E] font-medium' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Bulk action bar */}
        {tab === 'flows' && selected.size > 0 && (
          <div className="mb-4 flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
            <input
              type="checkbox"
              checked={selected.size === flows.length}
              ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < flows.length; }}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-[#2C666E] focus:ring-[#2C666E]/30 cursor-pointer"
            />
            <span className="text-sm text-slate-600">{selected.size} selected</span>

            {bulkConfirming ? (
              <div className="flex items-center gap-2 ml-auto bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-red-700">Delete {selected.size} flow{selected.size > 1 ? 's' : ''}? This cannot be undone.</span>
                <button
                  onClick={() => setBulkConfirming(false)}
                  className="px-2.5 py-0.5 text-xs text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="px-2.5 py-0.5 text-xs text-white bg-red-500 border border-red-500 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {bulkDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setBulkConfirming(true)}
                  className="ml-auto px-3 py-1 text-xs bg-red-50 border border-red-200 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                >
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-slate-400 text-sm">Loading...</div>
        ) : tab === 'flows' ? (
          <div className="grid grid-cols-3 gap-4">
            {flows.map(flow => (
              <FlowCard key={flow.id} flow={flow} onRun={handleRunFlow} onDelete={handleDeleteFlow} selected={selected.has(flow.id)} onSelect={toggleSelect} />
            ))}
            {flows.length === 0 && <p className="text-slate-400 text-sm col-span-3">No flows yet. Create one or start from a template.</p>}
          </div>
        ) : tab === 'templates' ? (
          <div className="grid grid-cols-3 gap-4">
            {templates.map(t => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-[#2C666E]/30 hover:shadow-md transition-all">
                <div className="text-sm font-semibold text-slate-800 mb-1">{t.name}</div>
                <div className="text-xs text-slate-500 mb-4">{t.description}</div>
                <button
                  onClick={() => handleCloneTemplate(t.id)}
                  className="px-3 py-1.5 text-xs bg-[#2C666E]/10 border border-[#2C666E]/20 text-[#2C666E] font-medium rounded-md hover:bg-[#2C666E]/20"
                >
                  Use Template
                </button>
              </div>
            ))}
            {templates.length === 0 && <p className="text-slate-400 text-sm col-span-3">No templates available yet.</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
                <div>
                  <span className="text-sm text-slate-800">{e.flow_name}</span>
                  <span className="text-xs text-slate-400 ml-3">{new Date(e.created_at).toLocaleString()}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border ${
                  e.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  e.status === 'failed' ? 'bg-red-50 text-red-600 border-red-100' :
                  e.status === 'running' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  'bg-slate-50 text-slate-500 border-slate-200'
                }`}>{e.status}</span>
              </div>
            ))}
            {executions.length === 0 && <p className="text-slate-400 text-sm">No executions yet.</p>}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 mt-6">
          {[
            { label: 'Active Flows', value: flows.length, color: 'text-slate-800' },
            { label: 'Total Runs', value: executions.length, color: 'text-emerald-600' },
            { label: 'Scheduled', value: scheduledCount, color: 'text-blue-600' },
            { label: 'Success Rate', value: `${successRate}%`, color: 'text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="flex-1 p-4 bg-white border border-slate-200 rounded-lg text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[11px] text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
