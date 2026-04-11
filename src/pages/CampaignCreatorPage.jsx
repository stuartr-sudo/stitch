import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { ChevronDown, ChevronRight, Check, Loader2, AlertCircle, Zap } from 'lucide-react';

const STEPS = [
  { id: 'name', label: 'Name' },
  { id: 'brand', label: 'Brand' },
  { id: 'modules', label: 'Context' },
  { id: 'generate', label: 'Generate' },
];

/** Module card with expand/collapse for field preview */
function ModuleCard({ mod, selected, onToggle, expanded, onExpand }) {
  const isConnected = mod.status === 'connected';
  const isExpired = mod.status === 'expired';
  const isDisabled = mod.fieldCount === 0 && mod.table !== 'platform_connections';

  return (
    <div
      className={`rounded-xl border transition-all ${
        selected
          ? 'border-[#2C666E]/50 bg-[#2C666E]/5 ring-1 ring-[#2C666E]/20'
          : isDisabled
          ? 'border-slate-700/20 bg-slate-800/20 opacity-40'
          : 'border-slate-700/30 bg-slate-800/30 hover:border-slate-600/40'
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => !isDisabled && onToggle(mod)}>
        {/* Checkbox */}
        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
          selected ? 'bg-[#2C666E] border-[#2C666E]' : 'border-slate-600 bg-slate-800/50'
        }`}>
          {selected && <Check className="w-3.5 h-3.5 text-white" />}
        </div>

        {/* Icon */}
        <span className="text-lg flex-shrink-0">{mod.icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200 truncate">{mod.label}</span>
            {isExpired && (
              <span className="text-[9px] bg-red-900/40 text-red-400 border border-red-800/40 px-1.5 py-0.5 rounded font-medium">EXPIRED</span>
            )}
            {isConnected && (
              <span className="text-[9px] bg-emerald-900/30 text-emerald-400 border border-emerald-800/40 px-1.5 py-0.5 rounded font-medium">CONNECTED</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">{mod.description}</div>
        </div>

        {/* Field count + expand */}
        {mod.fields && Object.keys(mod.fields).length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onExpand(mod.table + (mod.id || '')); }}
            className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Expanded field preview */}
      {expanded && mod.fields && (
        <div className="px-4 pb-3 pt-0 border-t border-slate-700/20 mt-0">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {Object.entries(mod.fields).slice(0, 12).map(([key, value]) => (
              <div key={key} className="flex items-baseline gap-2 py-0.5">
                <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">{key}:</span>
                <span className="text-[10px] text-slate-400 truncate">
                  {typeof value === 'object' ? JSON.stringify(value).slice(0, 30) + '...' : String(value).slice(0, 40)}
                </span>
              </div>
            ))}
            {Object.keys(mod.fields).length > 12 && (
              <div className="text-[10px] text-slate-600 col-span-2">+{Object.keys(mod.fields).length - 12} more fields</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampaignCreatorPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('name');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Brand selection
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [loadingBrands, setLoadingBrands] = useState(true);

  // Module selection
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [selectedModules, setSelectedModules] = useState(new Set());
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [saveDefaults, setSaveDefaults] = useState(true);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Load brands on mount
  useEffect(() => {
    setLoadingBrands(true);
    apiFetch('/api/brand/kit').then(r => r.json()).then(data => {
      const kits = data?.brands || [];
      setBrands(kits);
      setLoadingBrands(false);
    }).catch(() => setLoadingBrands(false));
  }, []);

  // Load modules when brand selected
  useEffect(() => {
    if (!selectedBrand?.brand_username) return;
    setLoadingModules(true);
    setModules([]);
    setSelectedModules(new Set());

    Promise.all([
      apiFetch(`/api/flows/campaigns/brand-context/${selectedBrand.brand_username}`).then(r => r.json()),
      apiFetch(`/api/flows/campaigns/defaults/${selectedBrand.brand_username}`).then(r => r.json()),
    ]).then(([contextData, defaultsData]) => {
      const mods = contextData?.modules || [];
      setModules(mods);

      // Pre-select from saved defaults
      if (defaultsData?.defaults?.selected_modules?.length) {
        const savedKeys = new Set(defaultsData.defaults.selected_modules.map(m => m.table + (m.id || '')));
        setSelectedModules(savedKeys);
      } else {
        // Auto-select brand_kit and brand_guidelines by default
        const autoSelect = new Set();
        mods.forEach(m => {
          if (['brand_kit', 'brand_guidelines', 'brand_image_styles'].includes(m.table)) {
            autoSelect.add(m.table + (m.id || ''));
          }
        });
        setSelectedModules(autoSelect);
      }
      setLoadingModules(false);
    }).catch(() => setLoadingModules(false));
  }, [selectedBrand]);

  const toggleModule = (mod) => {
    const key = mod.table + (mod.id || '');
    setSelectedModules(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleExpand = (key) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    const selectedMods = modules.filter(m => selectedModules.has(m.table + (m.id || '')));

    try {
      const data = await apiFetch('/api/flows/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'Untitled Campaign',
          brand_username: selectedBrand?.brand_username || null,
          selected_modules: selectedMods.map(m => ({ table: m.table, id: m.id, label: m.label, icon: m.icon, platform: m.platform })),
          save_defaults: saveDefaults,
        }),
      }).then(r => r.json());

      if (data?.flow?.id) {
        navigate(`/flows/${data.flow.id}`);
      } else {
        setError(data?.error || 'Failed to create campaign flow');
        setGenerating(false);
      }
    } catch (err) {
      setError(err.message);
      setGenerating(false);
    }
  };

  const selectedCount = selectedModules.size;
  const canProceedToModules = selectedBrand !== null;
  const canGenerate = selectedCount > 0 && name.trim().length > 0;

  // Group modules by category for the selector
  const moduleGroups = {};
  modules.forEach(m => {
    const group = m.table === 'platform_connections' ? 'Publishing' :
      ['brand_kit', 'company_information'].includes(m.table) ? 'Brand Identity' :
      ['brand_guidelines', 'brand_image_styles'].includes(m.table) ? 'Creative Guidelines' :
      ['brand_loras', 'visual_subjects', 'characters'].includes(m.table) ? 'Visual Assets' :
      m.table === 'target_market' ? 'Audience' :
      'Content & Templates';
    if (!moduleGroups[group]) moduleGroups[group] = [];
    moduleGroups[group].push(m);
  });

  return (
    <div className="min-h-screen bg-[#0a0a12] text-slate-200">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-[#0f0f18]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/flows')} className="text-slate-500 hover:text-slate-200 text-sm">&larr; Flows</button>
            <h1 className="text-lg font-bold text-slate-100">New Campaign</h1>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const isActive = s.id === step;
              const stepIndex = STEPS.findIndex(x => x.id === step);
              const isPast = STEPS.findIndex(x => x.id === s.id) < stepIndex;
              return (
                <div key={s.id} className="flex items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isActive ? 'bg-[#2C666E] text-white' :
                    isPast ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40' :
                    'bg-slate-800 text-slate-500 border border-slate-700/40'
                  }`}>
                    {isPast ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-[11px] mr-2 ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{s.label}</span>
                  {i < STEPS.length - 1 && <div className="w-6 h-px bg-slate-700/50 mr-1" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Step 1: Name */}
        {step === 'name' && (
          <div className="max-w-lg mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-100 mb-1">Name your campaign</h2>
              <p className="text-sm text-slate-500">Give it a descriptive name so you can find it later.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Campaign Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Q3 Product Launch Shorts"
                className="w-full bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#2C666E]/50 focus:ring-2 focus:ring-[#2C666E]/20"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Description (optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What's this campaign about?"
                rows={3}
                className="w-full bg-slate-800/50 border border-slate-700/40 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#2C666E]/50 focus:ring-2 focus:ring-[#2C666E]/20 resize-y"
              />
            </div>
            <button
              onClick={() => name.trim() && setStep('brand')}
              disabled={!name.trim()}
              className="w-full py-3 bg-[#2C666E] text-white font-semibold rounded-xl hover:bg-[#07393C] transition-colors disabled:opacity-40"
            >
              Next: Select Brand →
            </button>
          </div>
        )}

        {/* Step 2: Brand Selection */}
        {step === 'brand' && (
          <div className="max-w-lg mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-100 mb-1">Select a brand</h2>
              <p className="text-sm text-slate-500">Choose which brand this campaign is for. All related data will be loaded.</p>
            </div>

            {loadingBrands ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading brands...
              </div>
            ) : brands.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 mb-3">No brands configured yet.</p>
                <button onClick={() => navigate('/studio')} className="text-sm text-[#2C666E] hover:underline">Set up a Brand Kit →</button>
              </div>
            ) : (
              <div className="space-y-2">
                {brands.map(brand => (
                  <button
                    key={brand.id}
                    onClick={() => setSelectedBrand(brand)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                      selectedBrand?.id === brand.id
                        ? 'border-[#2C666E]/50 bg-[#2C666E]/10 ring-1 ring-[#2C666E]/20'
                        : 'border-slate-700/30 bg-slate-800/30 hover:border-slate-600/40'
                    }`}
                  >
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center text-lg">🏷️</div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-slate-200">{brand.brand_name || 'Unnamed Brand'}</div>
                      <div className="text-[11px] text-slate-500">{brand.brand_username || 'no username'}</div>
                    </div>
                    {selectedBrand?.id === brand.id && <Check className="w-5 h-5 text-[#2C666E] ml-auto" />}
                  </button>
                ))}

                {/* Skip brand option */}
                <button
                  onClick={() => { setSelectedBrand({ brand_username: null, brand_name: 'No Brand' }); }}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    selectedBrand?.brand_name === 'No Brand'
                      ? 'border-slate-500/50 bg-slate-700/30'
                      : 'border-slate-700/20 bg-slate-800/20 hover:border-slate-600/30 text-slate-500'
                  }`}
                >
                  <span className="text-sm">Skip — no brand context</span>
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('name')} className="px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors">← Back</button>
              <button
                onClick={() => canProceedToModules && setStep('modules')}
                disabled={!canProceedToModules}
                className="flex-1 py-3 bg-[#2C666E] text-white font-semibold rounded-xl hover:bg-[#07393C] transition-colors disabled:opacity-40"
              >
                Next: Select Context →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Module Selection */}
        {step === 'modules' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-1">Select context modules</h2>
                <p className="text-sm text-slate-500">
                  Each selected module becomes a source node in your workspace with individually wirable outputs.
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[#2C666E]">{selectedCount}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">selected</div>
              </div>
            </div>

            {loadingModules ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading brand data...
              </div>
            ) : modules.length === 0 && selectedBrand?.brand_username ? (
              <div className="text-center py-16 text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No brand data found for this username.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(moduleGroups).map(([group, mods]) => (
                  <div key={group}>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium mb-2 px-1">{group}</div>
                    <div className="space-y-2">
                      {mods.map(mod => (
                        <ModuleCard
                          key={mod.table + (mod.id || '')}
                          mod={mod}
                          selected={selectedModules.has(mod.table + (mod.id || ''))}
                          onToggle={toggleModule}
                          expanded={expandedModules.has(mod.table + (mod.id || ''))}
                          onExpand={toggleExpand}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Save defaults toggle */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/30 border border-slate-700/30 rounded-xl">
              <button
                onClick={() => setSaveDefaults(!saveDefaults)}
                className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${
                  saveDefaults ? 'bg-[#2C666E] border-[#2C666E]' : 'border-slate-600'
                }`}
              >
                {saveDefaults && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
              <div>
                <span className="text-sm text-slate-300">Save as default for this brand</span>
                <span className="block text-[11px] text-slate-500">Pre-select these modules next time you create a campaign for {selectedBrand?.brand_name || 'this brand'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('brand')} className="px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors">← Back</button>
              <button
                onClick={() => canGenerate && setStep('generate')}
                disabled={!canGenerate}
                className="flex-1 py-3 bg-[#2C666E] text-white font-semibold rounded-xl hover:bg-[#07393C] transition-colors disabled:opacity-40"
              >
                Review & Generate →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Generate Workspace */}
        {step === 'generate' && (
          <div className="max-w-lg mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-100 mb-1">Generate Workspace</h2>
              <p className="text-sm text-slate-500">Your flow canvas will be pre-loaded with these brand context nodes.</p>
            </div>

            {/* Summary */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Campaign</span>
                <span className="text-slate-200 font-medium">{name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Brand</span>
                <span className="text-slate-200 font-medium">{selectedBrand?.brand_name || 'None'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Context modules</span>
                <span className="text-slate-200 font-medium">{selectedCount}</span>
              </div>
              <div className="border-t border-slate-700/30 pt-3 mt-3">
                <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-2">Selected modules</div>
                <div className="flex flex-wrap gap-1.5">
                  {modules.filter(m => selectedModules.has(m.table + (m.id || ''))).map(m => (
                    <span key={m.table + (m.id || '')} className="text-[11px] px-2 py-1 bg-slate-700/50 text-slate-300 rounded-lg">
                      {m.icon} {m.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800/40 rounded-xl px-4 py-3 text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('modules')} className="px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors">← Back</button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 py-3 bg-[#2C666E] text-white font-semibold rounded-xl hover:bg-[#07393C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating Workspace...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Generate Workspace</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
