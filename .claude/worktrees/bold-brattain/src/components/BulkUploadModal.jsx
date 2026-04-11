import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Upload, Loader2, Link, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function BulkUploadModal({ onClose, onBatchCreated }) {
  const [urls, setUrls] = useState(['']);
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [writingStructure, setWritingStructure] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch('/api/brand/usernames')
      .then(r => r.json())
      .then(d => {
        const list = d.usernames || [];
        setBrands(list);
        if (list.length > 0) setSelectedBrand(list[0]);
      })
      .catch(() => {});
  }, []);

  const addUrl = () => setUrls([...urls, '']);
  const removeUrl = (idx) => setUrls(urls.filter((_, i) => i !== idx));
  const updateUrl = (idx, val) => {
    const next = [...urls];
    next[idx] = val;
    setUrls(next);
  };

  const handlePaste = (e) => {
    const text = e.clipboardData?.getData('text') || '';
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
    if (lines.length > 1) {
      e.preventDefault();
      setUrls(lines.slice(0, 20));
    }
  };

  const validUrls = urls.filter(u => u.trim().startsWith('http'));

  const handleSubmit = async () => {
    if (validUrls.length === 0) { toast.error('Add at least one valid URL'); return; }
    if (!selectedBrand) { toast.error('Select a brand'); return; }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/article/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: validUrls,
          brand_username: selectedBrand,
          writing_structure: writingStructure || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(data.message);
      onBatchCreated?.(data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-bold text-slate-900">Bulk Article Import</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Brand selector */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Brand</label>
            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Writing structure */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Writing Structure (optional)</label>
            <Input
              value={writingStructure}
              onChange={e => setWritingStructure(e.target.value)}
              placeholder="e.g., BRAND-LISTICLE"
            />
          </div>

          {/* URL list */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Article URLs <span className="text-slate-400">({validUrls.length}/20)</span>
            </label>
            <p className="text-xs text-slate-400 mb-2">Paste multiple URLs — one per line — or add them individually.</p>
            <div className="space-y-2">
              {urls.map((url, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input
                      value={url}
                      onChange={e => updateUrl(idx, e.target.value)}
                      onPaste={idx === 0 ? handlePaste : undefined}
                      placeholder="https://example.com/article"
                      className="pl-9"
                    />
                  </div>
                  {urls.length > 1 && (
                    <button onClick={() => removeUrl(idx)} className="p-2 text-slate-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {urls.length < 20 && (
              <button onClick={addUrl} className="mt-2 flex items-center gap-1 text-xs text-[#2C666E] hover:underline">
                <Plus className="w-3 h-3" /> Add another URL
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || validUrls.length === 0 || !selectedBrand}
            className="bg-[#2C666E] hover:bg-[#07393C] text-white"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
            Queue {validUrls.length} Article{validUrls.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
