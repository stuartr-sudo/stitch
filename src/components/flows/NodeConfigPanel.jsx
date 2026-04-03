import { useState } from 'react';

const CATEGORY_COLORS = {
  input: 'bg-emerald-500/20 text-emerald-300',
  image: 'bg-violet-500/20 text-violet-300',
  video: 'bg-blue-500/20 text-blue-300',
  audio: 'bg-pink-500/20 text-pink-300',
  content: 'bg-amber-500/20 text-amber-300',
  publish: 'bg-sky-500/20 text-sky-300',
  utility: 'bg-gray-500/20 text-gray-300',
};

const PORT_TYPE_COLORS = {
  string: 'text-gray-400 bg-white/[0.06]',
  image: 'text-violet-400 bg-violet-500/10',
  video: 'text-blue-400 bg-blue-500/10',
  audio: 'text-pink-400 bg-pink-500/10',
  json: 'text-amber-400 bg-amber-500/10',
};

const TEXTAREA_KEYS = ['prompt', 'description', 'text', 'script', 'topic', 'instructions'];

function humanizeKey(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function isTextareaField(key) {
  const lower = key.toLowerCase();
  return TEXTAREA_KEYS.some(k => lower.includes(k));
}

export default function NodeConfigPanel({ node, nodeType, onConfigChange }) {
  const [portsOpen, setPortsOpen] = useState(false);

  if (!node || !nodeType) {
    return (
      <div className="w-[320px] border-l border-white/[0.08] bg-[#0a0a0f] flex flex-col items-center justify-center p-6 flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 text-center leading-relaxed">
          Click a node on the canvas to configure it.
        </p>
        <p className="text-xs text-gray-600 text-center mt-1">
          Drag nodes from the palette on the left.
        </p>
      </div>
    );
  }

  const config = node.data?.config || {};
  const schema = nodeType.configSchema || {};
  const catColor = CATEGORY_COLORS[nodeType.category] || CATEGORY_COLORS.utility;

  const handleChange = (key, value) => {
    onConfigChange(node.id, { ...config, [key]: value });
  };

  const inputClasses = 'w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-colors';

  return (
    <div className="w-[320px] border-l border-white/[0.08] bg-[#0a0a0f] overflow-y-auto flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-lg flex-shrink-0">
            {nodeType.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-100 truncate">
              {nodeType.label}
            </h3>
            <span className={`inline-block mt-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${catColor}`}>
              {nodeType.category}
            </span>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      {Object.keys(schema).length > 0 && (
        <div className="p-4 border-b border-white/[0.06]">
          <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-3">
            Configuration
          </h4>
          <div className="space-y-4">
            {Object.entries(schema).map(([key, fieldSchema]) => {
              const value = config[key] ?? fieldSchema.default ?? '';
              const label = humanizeKey(key);

              return (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-400 block mb-1.5">
                    {label}
                  </label>

                  {fieldSchema.type === 'select' ? (
                    <select
                      value={value}
                      onChange={e => handleChange(key, e.target.value)}
                      className={inputClasses + ' cursor-pointer appearance-none bg-[length:16px] bg-[right_8px_center] bg-no-repeat'}
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`
                      }}
                    >
                      {fieldSchema.options.map(opt => (
                        <option key={opt} value={opt} className="bg-gray-900 text-gray-200">
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : isTextareaField(key) ? (
                    <textarea
                      value={value}
                      onChange={e => handleChange(key, e.target.value)}
                      rows={3}
                      placeholder={`Enter ${label.toLowerCase()}...`}
                      className={inputClasses + ' resize-y min-h-[72px]'}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={e => handleChange(key, e.target.value)}
                      placeholder={`Enter ${label.toLowerCase()}...`}
                      className={inputClasses}
                    />
                  )}

                  {fieldSchema.description && (
                    <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                      {fieldSchema.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Handling Section */}
      <div className="p-4 border-b border-white/[0.06]">
        <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium mb-3">
          Error Handling
        </h4>
        <select
          value={config.errorHandling || 'stop'}
          onChange={e => handleChange('errorHandling', e.target.value)}
          className={inputClasses + ' cursor-pointer appearance-none bg-[length:16px] bg-[right_8px_center] bg-no-repeat'}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`
          }}
        >
          <option value="stop" className="bg-gray-900 text-gray-200">Stop flow on error</option>
          <option value="skip" className="bg-gray-900 text-gray-200">Skip and continue</option>
          <option value="retry" className="bg-gray-900 text-gray-200">Retry (3 attempts)</option>
        </select>
      </div>

      {/* Ports Section — collapsible */}
      <div className="p-4">
        <button
          onClick={() => setPortsOpen(!portsOpen)}
          className="flex items-center justify-between w-full group"
        >
          <h4 className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
            Ports
          </h4>
          <svg
            className={`w-3.5 h-3.5 text-gray-600 transition-transform ${portsOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {portsOpen && (
          <div className="mt-3 space-y-3">
            {nodeType.inputs.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">Inputs</div>
                <div className="space-y-1.5">
                  {nodeType.inputs.map(input => (
                    <div key={input.id} className="flex items-center justify-between py-1 px-2 rounded-md bg-white/[0.03]">
                      <span className="text-xs text-gray-400">{humanizeKey(input.id)}</span>
                      <div className="flex items-center gap-1.5">
                        {input.required && (
                          <span className="text-[9px] text-red-400/60 font-medium">REQ</span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${PORT_TYPE_COLORS[input.type] || PORT_TYPE_COLORS.string}`}>
                          {input.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nodeType.outputs.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-1.5">Outputs</div>
                <div className="space-y-1.5">
                  {nodeType.outputs.map(output => (
                    <div key={output.id} className="flex items-center justify-between py-1 px-2 rounded-md bg-white/[0.03]">
                      <span className="text-xs text-gray-400">{humanizeKey(output.id)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${PORT_TYPE_COLORS[output.type] || PORT_TYPE_COLORS.string}`}>
                        {output.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
