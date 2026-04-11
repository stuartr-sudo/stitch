import { useState, useEffect, useRef } from 'react';
import { Upload, X, Link2, Loader2, Zap, Image as ImageIcon, Film, Mic, FileText, Type } from 'lucide-react';
import { apiFetch } from '@/lib/api';

/**
 * FlowRunnerForm — dynamic form generated from a flow's source nodes.
 *
 * Scans graph_json for nodes with no incoming edges (source nodes),
 * renders a typed input field per source node, and injects values
 * into the flow before execution.
 *
 * Used in two contexts:
 * 1. Pre-run modal inside FlowBuilderPage
 * 2. Standalone shareable page at /flows/:id/run
 */

const TYPE_ICONS = {
  string: Type,
  image: ImageIcon,
  video: Film,
  audio: Mic,
  json: FileText,
};

const TYPE_COLORS = {
  string: 'border-slate-500/30',
  image: 'border-purple-500/30',
  video: 'border-blue-500/30',
  audio: 'border-emerald-500/30',
  json: 'border-amber-500/30',
};

function FieldLabel({ icon: Icon, label, type, required }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{type}</span>
      {required && <span className="text-red-400 text-xs">*</span>}
    </div>
  );
}

function ImageUploadField({ value, onChange, flowId }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiFetch('/api/library/upload', { method: 'POST', body: formData }).then(r => r.json());
      const url = data?.url || data?.publicUrl || '';
      setPreview(url);
      onChange(url);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handlePaste = (e) => {
    const text = e.target.value.trim();
    if (text.startsWith('http')) {
      setPreview(text);
      onChange(text);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => { onChange(e.target.value); handlePaste(e); }}
          placeholder="Paste image URL..."
          className="flex-1 bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/40"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2 bg-slate-800 border border-slate-700/40 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-sm"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>
      {preview && (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-700/40">
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
          <button
            onClick={() => { setPreview(''); onChange(''); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Extract source nodes from a flow's graph — nodes with no incoming edges.
 * These are the nodes that need user input to run.
 */
function getSourceNodes(graphJson) {
  if (!graphJson?.nodes || !graphJson?.edges) return [];
  const nodesWithIncoming = new Set(graphJson.edges.map(e => e.target));
  return graphJson.nodes.filter(n => {
    // Node has no incoming edges
    if (nodesWithIncoming.has(n.id)) return false;
    // Must have at least one output port or be a manual-input type
    const nodeType = n.data?.nodeType;
    if (!nodeType) return false;
    // Source nodes: input category, brand category, or no inputs defined
    return nodeType.category === 'input' || nodeType.category === 'brand' ||
      (nodeType.inputs?.length === 0) ||
      nodeType.id === 'manual-input';
  });
}

/**
 * Determine what type of field to render for a source node.
 */
function getFieldType(node) {
  const nodeType = node.data?.nodeType;
  if (!nodeType) return 'string';
  // Check config schema for inputType (manual-input has this)
  if (node.data?.config?.inputType) return node.data.config.inputType;
  // Check the first output port type
  const firstOutput = nodeType.outputs?.[0];
  if (firstOutput) return firstOutput.type;
  return 'string';
}

export default function FlowRunnerForm({ flow, onSubmit, loading, standalone = false }) {
  const [values, setValues] = useState({});
  const graphJson = flow?.graph_json;
  const sourceNodes = graphJson ? getSourceNodes(graphJson) : [];

  // Initialize from existing config defaults
  useEffect(() => {
    if (!sourceNodes.length) return;
    const initial = {};
    sourceNodes.forEach(n => {
      const config = n.data?.config || {};
      // Use defaultValue, resolvedValue, or existing config values
      initial[n.id] = config.resolvedValue || config.defaultValue || config.style_text || config.template || '';
    });
    setValues(initial);
  }, [flow?.id]);

  const updateValue = (nodeId, val) => {
    setValues(prev => ({ ...prev, [nodeId]: val }));
  };

  const handleSubmit = () => {
    // Build the node value map: nodeId → value to inject
    onSubmit(values);
  };

  const allRequiredFilled = sourceNodes.every(n => {
    const nodeType = n.data?.nodeType;
    // If it has required outputs but no default, check if user filled it
    if (nodeType?.id === 'manual-input') {
      return (values[n.id] || '').trim().length > 0;
    }
    return true; // Non-manual nodes have config defaults
  });

  if (sourceNodes.length === 0) {
    return (
      <div className={`${standalone ? 'max-w-2xl mx-auto py-16' : ''} text-center`}>
        <Zap className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-400">This flow has no input nodes — it runs with its configured values.</p>
        <button
          onClick={() => onSubmit({})}
          disabled={loading}
          className="mt-4 px-6 py-2.5 bg-[#2C666E] text-white font-semibold rounded-xl hover:bg-[#07393C] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <>&#9654; Run Flow</>}
        </button>
      </div>
    );
  }

  return (
    <div className={standalone ? 'max-w-2xl mx-auto' : ''}>
      <div className="space-y-5">
        {sourceNodes.map(node => {
          const nodeType = node.data?.nodeType;
          const fieldType = getFieldType(node);
          const Icon = TYPE_ICONS[fieldType] || TYPE_ICONS.string;
          const borderColor = TYPE_COLORS[fieldType] || TYPE_COLORS.string;
          const label = node.data?.config?.label || nodeType?.label || 'Input';
          const description = nodeType?.description || '';

          return (
            <div key={node.id} className={`bg-slate-800/30 border ${borderColor} rounded-xl p-4`}>
              <FieldLabel icon={Icon} label={label} type={fieldType} required={nodeType?.id === 'manual-input'} />
              {description && <p className="text-[11px] text-slate-500 mb-2">{description}</p>}

              {/* Render field based on type */}
              {fieldType === 'image' ? (
                <ImageUploadField
                  value={values[node.id] || ''}
                  onChange={v => updateValue(node.id, v)}
                  flowId={flow?.id}
                />
              ) : fieldType === 'video' || fieldType === 'audio' ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={values[node.id] || ''}
                    onChange={e => updateValue(node.id, e.target.value)}
                    placeholder={`Paste ${fieldType} URL...`}
                    className="flex-1 bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#2C666E]/40"
                  />
                  <div className="px-3 py-2 bg-slate-800/50 border border-slate-700/40 rounded-lg text-slate-500 flex items-center">
                    <Link2 className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <textarea
                  value={values[node.id] || ''}
                  onChange={e => updateValue(node.id, e.target.value)}
                  placeholder={node.data?.config?.defaultValue ? `Default: ${node.data.config.defaultValue}` : 'Enter value...'}
                  rows={fieldType === 'json' ? 4 : 2}
                  className="w-full bg-slate-800/50 border border-slate-700/40 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#2C666E]/40 resize-y font-mono"
                />
              )}

              {/* Show what this feeds into */}
              {nodeType?.outputs?.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
                  <span>Outputs:</span>
                  {nodeType.outputs.map(o => (
                    <span key={o.id} className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">{o.id} ({o.type})</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs text-slate-500">{sourceNodes.length} input{sourceNodes.length > 1 ? 's' : ''}</span>
        <button
          onClick={handleSubmit}
          disabled={loading || !allRequiredFilled}
          className="px-6 py-2.5 bg-[#2C666E] text-white font-semibold rounded-xl hover:bg-[#07393C] transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : <>&#9654; Run Flow</>}
        </button>
      </div>
    </div>
  );
}
