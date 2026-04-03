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
    <div className="w-[280px] border-l border-white/[0.08] flex flex-col flex-shrink-0">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="text-[11px] uppercase tracking-wider text-gray-500">Execution Log</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {entries.map((entry, i) => (
          <div key={i}>
            <div className="text-[10px] text-gray-600">{formatElapsed(entry.time)}</div>
            <div className={`text-[11px] ${
              entry.status === 'completed' ? 'text-emerald-400' :
              entry.status === 'failed' ? 'text-red-400' :
              'text-gray-400'
            }`}>
              {entry.nodeId} → {entry.type === 'start' ? 'running' : entry.status}
            </div>
            {entry.error && (
              <div className="text-[10px] text-red-400/70 mt-0.5 pl-2 border-l-2 border-white/[0.06]">{entry.error}</div>
            )}
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-[11px] text-gray-600">Waiting for execution to start...</div>
        )}
      </div>
    </div>
  );
}
