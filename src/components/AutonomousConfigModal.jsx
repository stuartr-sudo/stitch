import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Zap, Loader2, Clock, Send, Layers } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function AutonomousConfigModal({ brandUsername, onClose }) {
  const [config, setConfig] = useState({
    is_active: true,
    auto_publish: false,
    publish_delay_hours: 24,
    schedule_times: [],
    ab_variants: false,
    max_daily_publishes: 3,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    if (!brandUsername) return;
    apiFetch(`/api/autonomous/config?brand_username=${encodeURIComponent(brandUsername)}`)
      .then(r => r.json())
      .then(d => {
        if (d.config) setConfig(d.config);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [brandUsername]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/autonomous/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_username: brandUsername, ...config }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      toast.success('Autonomous config saved');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const addTime = () => {
    if (newTime && !config.schedule_times.includes(newTime)) {
      setConfig({ ...config, schedule_times: [...config.schedule_times, newTime].sort() });
      setNewTime('');
    }
  };

  const removeTime = (t) => {
    setConfig({ ...config, schedule_times: config.schedule_times.filter(x => x !== t) });
  };

  const toggle = (key) => setConfig({ ...config, [key]: !config[key] });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#2C666E]" />
            <h2 className="text-lg font-bold text-slate-900">Autonomous Config</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <p className="text-xs text-slate-500">Configure autonomous pipeline for <strong>{brandUsername}</strong>. Articles will auto-generate and optionally auto-publish.</p>

            {/* Toggle: Active */}
            <ToggleRow label="Autonomous Active" description="Enable autonomous pipeline for this brand" checked={config.is_active} onChange={() => toggle('is_active')} icon={<Zap className="w-4 h-4" />} />

            {/* Toggle: Auto-publish */}
            <ToggleRow label="Auto-Publish" description="Automatically schedule ready drafts for publication" checked={config.auto_publish} onChange={() => toggle('auto_publish')} icon={<Send className="w-4 h-4" />} />

            {/* Toggle: A/B Variants */}
            <ToggleRow label="A/B Variants" description="Generate 2 additional style variants per template" checked={config.ab_variants} onChange={() => toggle('ab_variants')} icon={<Layers className="w-4 h-4" />} />

            {/* Publish delay */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Publish Delay (hours after generation)</label>
              <Input
                type="number"
                min={0}
                max={168}
                value={config.publish_delay_hours}
                onChange={e => setConfig({ ...config, publish_delay_hours: parseInt(e.target.value) || 0 })}
              />
            </div>

            {/* Max daily publishes */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Max Daily Publishes</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={config.max_daily_publishes}
                onChange={e => setConfig({ ...config, max_daily_publishes: parseInt(e.target.value) || 1 })}
              />
            </div>

            {/* Preferred times */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Preferred Publish Times
              </label>
              <div className="flex gap-2 mb-2">
                <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="flex-1" />
                <Button onClick={addTime} variant="outline" size="sm" disabled={!newTime}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {config.schedule_times.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full">
                    {t}
                    <button onClick={() => removeTime(t)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {config.schedule_times.length === 0 && <span className="text-xs text-slate-400">No preferred times — will use delay only</span>}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Config
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange, icon }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer" onClick={onChange}>
      <div className="flex items-center gap-3">
        <div className={`${checked ? 'text-[#2C666E]' : 'text-slate-400'}`}>{icon}</div>
        <div>
          <div className="text-sm font-medium text-slate-800">{label}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
      </div>
      <div className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#2C666E]' : 'bg-slate-300'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </div>
  );
}
