export default function ExecutionLog({ execution, nodes }) {
  if (!execution) return null;

  // Build nodeId → label map from flow nodes
  const nodeLabels = {};
  if (nodes) {
    for (const n of nodes) {
      nodeLabels[n.id] = n.data?.nodeType?.label || n.id;
    }
  }

  const stepStates = execution.step_states || {};
  const entries = Object.entries(stepStates)
    .flatMap(([nodeId, state]) => {
      const events = [];
      if (state.started_at) events.push({ time: state.started_at, nodeId, type: 'start', status: state.status });
      if (state.completed_at) events.push({ time: state.completed_at, nodeId, type: 'end', status: state.status, error: state.error, output: state.output });
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

  // Count completed/total for progress
  const total = nodes?.length || Object.keys(stepStates).length;
  const completed = Object.values(stepStates).filter(s => s.status === 'completed').length;
  const failed = Object.values(stepStates).filter(s => s.status === 'failed').length;
  const running = Object.values(stepStates).filter(s => s.status === 'running').length;

  return (
    <div className="border-t border-slate-700/40 bg-[#0c0c14] flex flex-col max-h-[240px]">
      <div className="px-4 py-2 border-b border-slate-700/30 flex-shrink-0 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Execution Log</div>
        <div className="flex items-center gap-3 text-[10px]">
          {running > 0 && <span className="text-blue-400">{running} running</span>}
          <span className="text-emerald-500">{completed}/{total} done</span>
          {failed > 0 && <span className="text-red-400">{failed} failed</span>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="text-[10px] text-slate-600 w-10 flex-shrink-0 pt-0.5 font-mono">{formatElapsed(entry.time)}</div>
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] flex items-center gap-1.5 ${
                entry.status === 'completed' ? 'text-emerald-400' :
                entry.status === 'failed' ? 'text-red-400' :
                entry.status === 'running' ? 'text-blue-400' :
                'text-slate-500'
              }`}>
                {entry.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />}
                {entry.status === 'completed' && <span className="flex-shrink-0">&#10003;</span>}
                {entry.status === 'failed' && <span className="flex-shrink-0">&#10005;</span>}
                <span className="font-medium truncate">{nodeLabels[entry.nodeId] || entry.nodeId}</span>
                <span className="text-slate-600 text-[10px]">{entry.type === 'start' ? 'started' : entry.status}</span>
              </div>
              {entry.error && (
                <div className="text-[10px] text-red-400/80 mt-0.5 pl-3 border-l border-red-500/30 line-clamp-2">{entry.error}</div>
              )}
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
            Waiting for execution to start...
          </div>
        )}
      </div>
    </div>
  );
}
