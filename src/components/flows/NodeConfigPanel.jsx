export default function NodeConfigPanel({ node, nodeType, onConfigChange }) {
  if (!node || !nodeType) {
    return (
      <div className="w-[260px] border-l border-white/[0.08] p-4 flex items-center justify-center">
        <p className="text-xs text-gray-600">Select a node to configure</p>
      </div>
    );
  }

  const config = node.data?.config || {};

  const handleChange = (key, value) => {
    onConfigChange(node.id, { ...config, [key]: value });
  };

  return (
    <div className="w-[260px] border-l border-white/[0.08] p-4 overflow-y-auto flex-shrink-0">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Node Config</div>
      <div className="text-sm font-semibold mb-4" style={{ color: '#c4b5fd' }}>
        {nodeType.icon} {nodeType.label}
      </div>

      {Object.entries(nodeType.configSchema || {}).map(([key, schema]) => (
        <div key={key} className="mb-4">
          <label className="text-[11px] text-gray-500 block mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
          {schema.type === 'select' ? (
            <select
              value={config[key] || schema.default}
              onChange={e => handleChange(key, e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
            >
              {schema.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={config[key] || schema.default || ''}
              onChange={e => handleChange(key, e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
            />
          )}
        </div>
      ))}

      {/* Error handling mode */}
      <div className="mb-4">
        <label className="text-[11px] text-gray-500 block mb-1">Error Handling</label>
        <select
          value={config.errorHandling || 'stop'}
          onChange={e => handleChange('errorHandling', e.target.value)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500/50"
        >
          <option value="stop">Stop flow on error</option>
          <option value="skip">Skip and continue</option>
          <option value="retry">Retry (3 attempts)</option>
        </select>
      </div>

      {/* Port summary */}
      <div className="border-t border-white/[0.06] pt-4 mt-4">
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Inputs</div>
        {nodeType.inputs.map(input => (
          <div key={input.id} className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">{input.id}</span>
            <span className="text-[10px] text-gray-600 bg-white/[0.04] px-1.5 py-0.5 rounded">{input.type}</span>
          </div>
        ))}
        <div className="text-[11px] uppercase tracking-wider text-gray-500 mt-3 mb-2">Outputs</div>
        {nodeType.outputs.map(output => (
          <div key={output.id} className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-400">{output.id}</span>
            <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">{output.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
