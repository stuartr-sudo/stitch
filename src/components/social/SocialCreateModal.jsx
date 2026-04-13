import React, { useState, useEffect } from 'react';
import { Loader2, Instagram, Facebook, Link, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: Instagram, cls: 'from-purple-500 to-pink-500' },
  { key: 'facebook',  label: 'Facebook',  icon: Facebook,  cls: 'from-blue-600 to-blue-500' },
];

export default function SocialCreateModal({ isOpen, onClose, onCreated }) {
  const [platform, setPlatform]       = useState('instagram');
  const [sourceType, setSourceType]   = useState('topic');
  const [sourceUrl, setSourceUrl]     = useState('');
  const [sourceTopic, setSourceTopic] = useState('');
  const [brandKitId, setBrandKitId]   = useState('');
  const [brands, setBrands]           = useState([]);
  const [creating, setCreating]       = useState(false);

  // Load brand kits on open
  useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/brand/kit').then(r => r.json()).then(d => {
      if (d.brands) setBrands(d.brands);
    }).catch(() => {});
  }, [isOpen]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setSourceUrl('');
      setSourceTopic('');
      setBrandKitId('');
      setSourceType('topic');
      setPlatform('instagram');
    }
  }, [isOpen]);

  async function handleCreate() {
    const hasSource = sourceType === 'url' ? sourceUrl.trim() : sourceTopic.trim();
    if (!hasSource) {
      toast.error(sourceType === 'url' ? 'Enter a URL' : 'Enter a topic');
      return;
    }

    setCreating(true);
    try {
      const body = { platform };
      if (sourceType === 'url') body.source_url = sourceUrl.trim();
      else body.source_title = sourceTopic.trim();
      if (brandKitId) body.brand_kit_id = brandKitId;

      const res  = await apiFetch('/api/social/add-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }

      const topic = data.topic;
      onCreated(topic);
      onClose();

      // Fire generation immediately (don't await -- runs in background)
      apiFetch(`/api/social/topics/${topic.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_kit_id: brandKitId || null }),
      }).catch(() => {});
    } catch (err) {
      console.error('[Social] create error', err);
      toast.error('Failed to create topic');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="New Social Post"
      subtitle="Create an Instagram or Facebook post"
      width="480px"
    >
      <SlideOverBody className="p-5 space-y-6">
        {/* Platform selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
          <div className="flex gap-2">
            {PLATFORMS.map(p => {
              const Icon = p.icon;
              const active = platform === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setPlatform(p.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? `bg-gradient-to-r ${p.cls} text-white shadow-sm`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Source type toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSourceType('topic')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                sourceType === 'topic'
                  ? 'bg-[#2C666E] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Topic
            </button>
            <button
              onClick={() => setSourceType('url')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                sourceType === 'url'
                  ? 'bg-[#2C666E] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Link className="w-3.5 h-3.5" />
              URL
            </button>
          </div>

          {sourceType === 'url' ? (
            <Input
              placeholder="https://example.com/article..."
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
            />
          ) : (
            <Input
              placeholder="Enter a topic or idea..."
              value={sourceTopic}
              onChange={e => setSourceTopic(e.target.value)}
            />
          )}
        </div>

        {/* Brand kit selector */}
        {brands.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Kit</label>
            <p className="text-xs text-gray-400 mb-2">Optional -- post will match your brand style</p>
            <select
              value={brandKitId}
              onChange={e => setBrandKitId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">No brand kit</option>
              {brands.map(b => (
                <option key={b.id} value={b.id}>{b.brand_name}</option>
              ))}
            </select>
          </div>
        )}
      </SlideOverBody>

      <SlideOverFooter>
        <div className="flex justify-end gap-3 px-5 py-4 border-t">
          <Button variant="ghost" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="bg-[#2C666E] hover:bg-[#07393C] text-white"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
            ) : (
              'Create Post'
            )}
          </Button>
        </div>
      </SlideOverFooter>
    </SlideOverPanel>
  );
}
