import { useState } from 'react';
import { Variable, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Flow-level variables editor — sits in the toolbar area.
 * Variables are stored in graph_json.variables and can be referenced
 * in any node config field as {{variable_name}}.
 */
export default function FlowVariables({ variables = {}, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const varEntries = Object.entries(variables);

  const addVariable = () => {
    const key = newKey.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (!key || variables[key] !== undefined) return;
    onChange({ ...variables, [key]: newValue });
    setNewKey('');
    setNewValue('');
  };

  const updateVariable = (key, value) => {
    onChange({ ...variables, [key]: value });
  };

  const removeVariable = (key) => {
    const next = { ...variables };
    delete next[key];
    onChange(next);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addVariable();
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
          varEntries.length > 0
            ? 'bg-violet-900/30 border border-violet-700/40 text-violet-300 hover:bg-violet-900/50'
            : 'bg-slate-800 border border-slate-600/40 text-slate-400 hover:bg-slate-700'
        }`}
      >
        <Variable className="w-3.5 h-3.5" />
        Variables
        {varEntries.length > 0 && (
          <span className="bg-violet-800/50 text-violet-300 text-[10px] px-1.5 py-0.5 rounded-full font-medium">{varEntries.length}</span>
        )}
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Dropdown panel */}
      {expanded && (
        <div className="absolute top-full mt-1 right-0 w-[360px] bg-[#12121f] border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700/30">
            <div className="text-xs font-semibold text-slate-200">Flow Variables</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Reference in any config field as <code className="text-violet-400 bg-violet-900/20 px-1 rounded">{'{{name}}'}</code>
            </div>
          </div>

          {/* Variable list */}
          <div className="max-h-[240px] overflow-y-auto">
            {varEntries.length === 0 ? (
              <div className="px-4 py-6 text-center text-[11px] text-slate-600">
                No variables defined yet.
              </div>
            ) : (
              <div className="px-3 py-2 space-y-1.5">
                {varEntries.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 group">
                    <div className="flex-shrink-0 text-[10px] text-violet-400 font-mono bg-violet-900/20 px-1.5 py-1 rounded min-w-[80px]">
                      {`{{${key}}}`}
                    </div>
                    <input
                      type="text"
                      value={value}
                      onChange={e => updateVariable(key, e.target.value)}
                      className="flex-1 bg-slate-800/50 border border-slate-700/40 rounded px-2 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-600/40"
                      placeholder="Value..."
                    />
                    <button
                      onClick={() => removeVariable(key)}
                      className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add new variable */}
          <div className="px-3 py-3 border-t border-slate-700/30 flex items-center gap-2">
            <input
              type="text"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="name"
              className="w-[100px] bg-slate-800/50 border border-slate-700/40 rounded px-2 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-600/40 font-mono"
            />
            <input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="value"
              className="flex-1 bg-slate-800/50 border border-slate-700/40 rounded px-2 py-1 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-600/40"
            />
            <button
              onClick={addVariable}
              disabled={!newKey.trim()}
              className="flex-shrink-0 p-1 bg-violet-900/40 border border-violet-700/40 text-violet-300 rounded hover:bg-violet-900/60 disabled:opacity-30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
