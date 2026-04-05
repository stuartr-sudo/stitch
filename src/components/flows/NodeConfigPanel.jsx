/**
 * NodeConfigPanel — slim right-side info strip for the Flow Builder.
 *
 * Shows selected node name, category, ports, and a hint to double-click
 * for full configuration. All real config happens in NodeConfigModal.
 */

const CATEGORY_COLORS = {
  input: 'bg-slate-100 text-slate-600',
  image: 'bg-purple-100 text-purple-700',
  video: 'bg-blue-100 text-blue-700',
  audio: 'bg-emerald-100 text-emerald-700',
  content: 'bg-amber-100 text-amber-700',
  publish: 'bg-red-100 text-red-700',
  utility: 'bg-slate-100 text-slate-600',
};

const PORT_TYPE_COLORS = {
  string: 'text-slate-500 bg-slate-100',
  image: 'text-purple-600 bg-purple-50',
  video: 'text-blue-600 bg-blue-50',
  audio: 'text-emerald-600 bg-emerald-50',
  json: 'text-amber-600 bg-amber-50',
};

function humanizeKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function NodeConfigPanel({ node, nodeType }) {
  if (!node || !nodeType) {
    return (
      <div className="w-[240px] border-l border-slate-200 bg-white flex flex-col items-center justify-center p-5 flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
          </svg>
        </div>
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          Click a node to see info.
        </p>
        <p className="text-[11px] text-slate-400 text-center mt-1">
          Double-click to configure.
        </p>
      </div>
    );
  }

  const catColor = CATEGORY_COLORS[nodeType.category] || CATEGORY_COLORS.utility;
  const config = node.data?.config || {};
  const configCount = Object.keys(config).filter(k => k !== 'errorHandling' && config[k] !== undefined && config[k] !== '' && config[k] !== null).length;

  return (
    <div className="w-[240px] border-l border-slate-200 bg-white overflow-y-auto flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-base flex-shrink-0">
            {nodeType.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-800 truncate">{nodeType.label}</h3>
            <span className={`inline-block mt-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${catColor}`}>
              {nodeType.category}
            </span>
          </div>
        </div>
      </div>

      {/* Double-click hint */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#2C666E]/5 border border-[#2C666E]/15">
          <svg className="w-4 h-4 text-[#2C666E] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672z" />
          </svg>
          <p className="text-[11px] text-[#2C666E] leading-relaxed">
            <strong>Double-click</strong> this node to open the full configuration panel
          </p>
        </div>
        {configCount > 0 && (
          <p className="text-[11px] text-slate-400 mt-2 px-1">
            {configCount} setting{configCount !== 1 ? 's' : ''} configured
          </p>
        )}
      </div>

      {/* Ports */}
      <div className="p-4 space-y-3">
        {nodeType.inputs.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-medium">Inputs</div>
            <div className="space-y-1">
              {nodeType.inputs.map(input => (
                <div key={input.id} className="flex items-center justify-between py-1 px-2 rounded-md bg-slate-50">
                  <span className="text-[11px] text-slate-600">{humanizeKey(input.id)}</span>
                  <div className="flex items-center gap-1">
                    {input.required && <span className="text-[9px] text-red-400 font-medium">REQ</span>}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${PORT_TYPE_COLORS[input.type] || PORT_TYPE_COLORS.string}`}>{input.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {nodeType.outputs.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 font-medium">Outputs</div>
            <div className="space-y-1">
              {nodeType.outputs.map(output => (
                <div key={output.id} className="flex items-center justify-between py-1 px-2 rounded-md bg-slate-50">
                  <span className="text-[11px] text-slate-600">{humanizeKey(output.id)}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${PORT_TYPE_COLORS[output.type] || PORT_TYPE_COLORS.string}`}>{output.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error handling status */}
      <div className="p-4 border-t border-slate-200 mt-auto">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-medium">Error Mode</div>
        <span className={`text-xs font-medium ${
          config.errorHandling === 'retry' ? 'text-blue-600' :
          config.errorHandling === 'skip' ? 'text-amber-600' :
          'text-slate-500'
        }`}>
          {config.errorHandling === 'retry' ? 'Retry (3x)' :
           config.errorHandling === 'skip' ? 'Skip & Continue' :
           'Stop on Error'}
        </span>
      </div>
    </div>
  );
}
