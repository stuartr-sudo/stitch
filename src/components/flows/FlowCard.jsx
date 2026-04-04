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
      className="bg-white/[0.03] border border-white/[0.08] rounded-xl cursor-pointer hover:border-white/[0.15] transition-colors overflow-hidden"
    >
      {/* Mini preview area */}
      <div className="h-24 bg-gradient-to-br from-purple-500/[0.06] to-blue-500/[0.06] border-b border-white/[0.05] flex items-center justify-center px-4">
        <div className="text-xs text-gray-600 truncate">{flow.description || 'No description'}</div>
      </div>
      <div className="p-4">
        <div className="text-sm font-semibold text-white mb-1 truncate">{flow.name}</div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            {isScheduled && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-300 rounded">Scheduled</span>
            )}
            {runCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 rounded">{runCount} runs</span>
            )}
            {lastRun && (
              <span className="text-[10px] text-gray-600">Last: {new Date(lastRun).toLocaleDateString()}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="px-2 py-1 text-[11px] bg-red-500/10 border border-red-500/20 text-red-400 rounded-md hover:bg-red-500/20 transition-colors"
              title="Delete flow"
            >
              Delete
            </button>
            <button
              onClick={handleRun}
              className="px-3 py-1 text-[11px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-md hover:bg-indigo-500/25 transition-colors"
            >
              ▶ Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
