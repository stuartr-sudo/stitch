import { useNavigate } from 'react-router-dom';

export default function FlowCard({ flow, onRun, onDelete }) {
  const navigate = useNavigate();
  const executions = flow.automation_executions || [];
  const runCount = executions.length;
  const lastRun = executions[0]?.created_at;
  const isScheduled = flow.trigger_type === 'scheduled';

  const handleRun = async (e) => {
    e.stopPropagation();
    if (onRun) onRun(flow.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm(`Delete "${flow.name}"? This cannot be undone.`)) {
      if (onDelete) onDelete(flow.id);
    }
  };

  return (
    <div
      onClick={() => navigate(`/flows/${flow.id}`)}
      className="bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-[#2C666E]/30 hover:shadow-md transition-all overflow-hidden"
    >
      {/* Mini preview area */}
      <div className="h-24 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-100 flex items-center justify-center px-4">
        <div className="text-xs text-slate-400 truncate">{flow.description || 'No description'}</div>
      </div>
      <div className="p-4">
        <div className="text-sm font-semibold text-slate-800 mb-1 truncate">{flow.name}</div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {isScheduled && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">Scheduled</span>
            )}
            {runCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100">{runCount} runs</span>
            )}
            {lastRun && (
              <span className="text-[10px] text-slate-400">Last: {new Date(lastRun).toLocaleDateString()}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="px-2 py-1 text-[11px] bg-red-50 border border-red-200 text-red-600 rounded-md hover:bg-red-100 transition-colors"
              title="Delete flow"
            >
              Delete
            </button>
            <button
              onClick={handleRun}
              className="px-3 py-1 text-[11px] bg-[#2C666E]/10 border border-[#2C666E]/20 text-[#2C666E] font-medium rounded-md hover:bg-[#2C666E]/20 transition-colors"
            >
              &#9654; Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
