export default function ExecutionLog({ execution }) {
  if (!execution) return null;

  const stepStates = execution.step_states || {};
  const entries = Object.entries(stepStates)
    .flatMap(([nodeId, state]) => {
      const events = [];
      if (state.started_at) events.push({ time: state.started_at, nodeId, type: 'start', status: state.status });
      if (state.completed_at) events.push({ time: state.completed_at, nodeId, type: 'end', status: state.status, error: state.error });
      return events;
    })
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  const startTime = execution.started_at ? new Date(execution.started_at) : null;
  const formatElapsed = (time) => {
    if (!startTime) return '00:00';
    const diff = (new Date(time) - startTime) / 1000;
    const m = Math.floor(diff / 60).toString().padStart(2, '0');
    const s = Math.floor(diff % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="border-t border-slate-700/40 bg-[#0c0c14] flex flex-col max-h-[200px]">
      <div className="px-4 py-2 border-b border-slate-700/30 flex-shrink-0">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Execution Log</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {entries.map((entry, i) => (
          <div key={i}>
            <div className="text-[10px] text-slate-400">{formatElapsed(entry.time)}</div>
            <div className={`text-[11px] ${
              entry.status === 'completed' ? 'text-emerald-600' :
              entry.status === 'failed' ? 'text-red-500' :
              'text-slate-500'
            }`}>
              {entry.nodeId} &rarr; {entry.type === 'start' ? 'running' : entry.status}
            </div>
            {entry.error && (
              <div className="text-[10px] text-red-400 mt-0.5 pl-2 border-l-2 border-slate-200">{entry.error}</div>
            )}
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-[11px] text-slate-500">Waiting for execution to start...</div>
        )}
      </div>
    </div>
  );
}
