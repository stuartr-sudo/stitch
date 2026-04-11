import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export default function LinkedInConfigModal({ open, onOpenChange, config, onSaved }) {
  const [form, setForm] = useState({
    series_title: '',
    linkedin_cta_text: '',
    linkedin_cta_url: '',
    exa_api_key: '',
    linkedin_access_token: '',
    news_search_queries: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        series_title: config.series_title || 'INDUSTRY WATCH',
        linkedin_cta_text: config.linkedin_cta_text || '',
        linkedin_cta_url: config.linkedin_cta_url || '',
        exa_api_key: config.exa_api_key || '',
        linkedin_access_token: config.linkedin_access_token || '',
        news_search_queries: Array.isArray(config.news_search_queries)
          ? config.news_search_queries.join('\n')
          : '',
      });
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const queries = form.news_search_queries
        .split('\n')
        .map(q => q.trim())
        .filter(Boolean);

      const res = await apiFetch('/api/linkedin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          series_title: form.series_title,
          linkedin_cta_text: form.linkedin_cta_text || null,
          linkedin_cta_url: form.linkedin_cta_url || null,
          exa_api_key: form.exa_api_key || null,
          linkedin_access_token: form.linkedin_access_token || null,
          news_search_queries: queries,
        }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('Config save error:', data.error);
      } else {
        onSaved?.(data.config);
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>LinkedIn Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className={labelClass}>Series Title</label>
            <input
              className={inputClass}
              value={form.series_title}
              onChange={e => setForm(f => ({ ...f, series_title: e.target.value }))}
              placeholder="INDUSTRY WATCH"
            />
          </div>

          <div>
            <label className={labelClass}>Search Queries (one per line)</label>
            <textarea
              className={`${inputClass} h-20 resize-none`}
              value={form.news_search_queries}
              onChange={e => setForm(f => ({ ...f, news_search_queries: e.target.value }))}
              placeholder="product liability NZ&#10;insurance regulation"
            />
          </div>

          <div>
            <label className={labelClass}>CTA Text</label>
            <input
              className={inputClass}
              value={form.linkedin_cta_text}
              onChange={e => setForm(f => ({ ...f, linkedin_cta_text: e.target.value }))}
              placeholder="Read more at"
            />
          </div>

          <div>
            <label className={labelClass}>CTA URL</label>
            <input
              className={inputClass}
              value={form.linkedin_cta_url}
              onChange={e => setForm(f => ({ ...f, linkedin_cta_url: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className={labelClass}>Exa API Key</label>
            <input
              type="password"
              className={inputClass}
              value={form.exa_api_key}
              onChange={e => setForm(f => ({ ...f, exa_api_key: e.target.value }))}
              placeholder="Optional — for content extraction"
            />
          </div>

          <div>
            <label className={labelClass}>LinkedIn Access Token</label>
            <input
              type="password"
              className={inputClass}
              value={form.linkedin_access_token}
              onChange={e => setForm(f => ({ ...f, linkedin_access_token: e.target.value }))}
              placeholder="Required for publishing"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
