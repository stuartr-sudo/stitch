import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FlowCard({ flow, onRun, onDelete, selected, onSelect }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const executions = flow.automation_executions || [];
  const runCount = executions.length;
  const lastRun = executions[0]?.created_at;
  const isScheduled = flow.trigger_type === 'scheduled';

  const handleRun = (e) => {
    e.stopPropagation();
    if (onRun) onRun(flow.id);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setConfirming(true);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    if (onDelete) onDelete(flow.id);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setConfirming(false);
  };

  const handleCheckbox = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(flow.id);
  };

  return (
    <div
      onClick={() => navigate(`/flows/${flow.id}`)}
      className={`bg-white border rounded-xl cursor-pointer hover:shadow-md transition-all overflow-hidden ${
        selected ? 'border-[#2C666E] ring-2 ring-[#2C666E]/20' : 'border-slate-200 hover:border-[#2C666E]/30'
      }`}
    >
      {/* Mini preview area */}
      <div className="h-24 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-100 flex items-center justify-center px-4 relative">
        <input
          type="checkbox"
          checked={selected || false}
          onChange={handleCheckbox}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 left-3 w-4 h-4 rounded border-slate-300 text-[#2C666E] focus:ring-[#2C666E]/30 cursor-pointer"
        />
        <div className="text-xs text-slate-400 truncate">{flow.description || 'No description'}</div>
      </div>
      <div className="p-4">
        <div className="text-sm font-semibold text-slate-800 mb-1 truncate">{flow.name}</div>

        {/* Inline delete confirmation */}
        {confirming ? (
          <div className="flex items-center justify-between mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <span className="text-[11px] text-red-700">Delete this flow?</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCancelDelete}
                className="px-2 py-0.5 text-[11px] text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-2 py-0.5 text-[11px] text-white bg-red-500 border border-red-500 rounded hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
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
                onClick={handleDeleteClick}
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
        )}
      </div>
    </div>
  );
}
