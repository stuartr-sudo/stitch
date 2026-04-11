import React, { useState, useEffect, useRef } from 'react';
import { PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { ALL_TOOLS, TOOL_ENDPOINTS, REQUEST_TYPES } from './reviewToolMap';
import { ReviewPanel } from './ReviewPanel';
import ReviewDashboard from './ReviewDashboard';

const PRIORITIES = ['low', 'medium', 'high'];

const EMPTY_FORM = {
  tool: '',
  endpoint: '',
  type: '',
  priority: 'medium',
  title: '',
  description: '',
  screenshotUrl: '',
};

export default function ReviewWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [requests, setRequests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [screenshotUploading, setScreenshotUploading] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  // Fetch all requests on mount
  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const res = await apiFetch('/api/reviews');
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests || []);
    } catch { /* ignore */ }
  }

  const pendingCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'needs_info'
  ).length;

  function handleField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      // Reset endpoint if tool changes
      ...(key === 'tool' ? { endpoint: '' } : {}),
    }));
  }

  async function uploadFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Screenshot must be under 5MB');
      return;
    }
    setScreenshotUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await apiFetch('/api/reviews/upload', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const url = data.url || data.screenshot_url || '';
      setForm((prev) => ({ ...prev, screenshotUrl: url }));
      setScreenshotPreview(URL.createObjectURL(file));
    } catch (err) {
      toast.error('Screenshot upload failed');
    }
    setScreenshotUploading(false);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) uploadFile(file);
        break;
      }
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.tool || !form.type || !form.title.trim()) {
      toast.error('Please fill in Tool, Type, and Title');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: form.tool,
          endpoint: (form.endpoint && form.endpoint !== '__other__') ? form.endpoint : null,
          type: form.type,
          priority: form.priority,
          title: form.title.trim(),
          description: form.description.trim() || null,
          screenshot_url: form.screenshotUrl || null,
        }),
      });
      if (!res.ok) throw new Error('Submit failed');
      toast.warning('Request submitted');
      setForm(EMPTY_FORM);
      setScreenshotPreview(null);
      setIsOpen(false);
      await fetchRequests();
    } catch (err) {
      toast.error('Failed to submit request');
    }
    setSubmitting(false);
  }

  const endpoints = form.tool ? (TOOL_ENDPOINTS[form.tool] || []) : [];

  return (
    <>
      {/* Floating button — hidden when dashboard is open */}
      {!showDashboard && (
        <div className="fixed bottom-6 left-6 z-50">
          {/* Submit form popup */}
          {isOpen && (
            <div
              className="absolute bottom-16 left-0 w-[350px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4"
              onPaste={handlePaste}
              ref={formRef}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-100">New Request</h3>
                <button
                  type="button"
                  onClick={() => { setIsOpen(false); setShowDashboard(true); }}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View All
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2.5">
                {/* Tool */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Tool *</label>
                  <select
                    required
                    value={form.tool}
                    onChange={(e) => handleField('tool', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60"
                  >
                    <option value="">Select tool...</option>
                    {ALL_TOOLS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Endpoint / Feature */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Endpoint / Feature</label>
                  <select
                    value={
                      form.endpoint === '__other__' || (form.endpoint && !endpoints.includes(form.endpoint))
                        ? '__other__'
                        : form.endpoint
                    }
                    onChange={(e) => {
                      if (e.target.value === '__other__') {
                        handleField('endpoint', '__other__');
                      } else {
                        handleField('endpoint', e.target.value);
                      }
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60"
                  >
                    <option value="">Select endpoint...</option>
                    {endpoints.map((ep) => (
                      <option key={ep} value={ep}>{ep}</option>
                    ))}
                    <option value="__other__">Other...</option>
                  </select>
                  {(form.endpoint === '__other__' || (form.endpoint && !endpoints.includes(form.endpoint) && form.endpoint !== '')) && (
                    <input
                      type="text"
                      value={form.endpoint === '__other__' ? '' : form.endpoint}
                      onChange={(e) => setForm((prev) => ({ ...prev, endpoint: e.target.value || '__other__' }))}
                      placeholder="Type feature or location..."
                      className="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
                      autoFocus
                    />
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Type *</label>
                  <select
                    required
                    value={form.type}
                    onChange={(e) => handleField('type', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500/60"
                  >
                    <option value="">Select type...</option>
                    {REQUEST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Priority</label>
                  <div className="flex gap-1.5">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleField('priority', p)}
                        className={`flex-1 text-xs py-1 rounded border capitalize transition-colors ${
                          form.priority === p
                            ? 'bg-blue-600/40 border-blue-500/60 text-blue-200 ring-1 ring-blue-500/40'
                            : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Title *</label>
                  <input
                    required
                    type="text"
                    value={form.title}
                    onChange={(e) => handleField('title', e.target.value)}
                    placeholder="Short summary..."
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/60"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => handleField('description', e.target.value)}
                    placeholder="Steps to reproduce, expected vs actual, console logs..."
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/60"
                  />
                </div>

                {/* Screenshot */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Screenshot</label>
                  {screenshotPreview ? (
                    <div className="relative">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot preview"
                        className="w-full max-h-24 object-cover rounded border border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => { setScreenshotPreview(null); handleField('screenshotUrl', ''); }}
                        className="absolute top-1 right-1 bg-slate-900/80 text-slate-300 rounded px-1.5 py-0.5 text-xs hover:bg-slate-800"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={screenshotUploading}
                      className="w-full text-xs py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded border border-dashed border-slate-600 transition-colors disabled:opacity-50"
                    >
                      {screenshotUploading ? 'Uploading...' : 'Click to attach or paste an image'}
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-[#0a1628] hover:bg-slate-700 text-white text-sm font-medium rounded border border-blue-500/40 ring-1 ring-blue-500/20 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>
          )}

          {/* The floating button itself */}
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="relative w-14 h-14 rounded-full bg-[#0a1628] ring-2 ring-blue-500/60 shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center justify-center hover:ring-blue-400/80 transition-all"
            title="Submit a review request"
          >
            <PenLine className="w-5 h-5 text-white" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Left-side panel */}
      <ReviewPanel open={showDashboard} onOpenChange={(open) => { setShowDashboard(open); }}>
        <ReviewDashboard
          requests={requests}
          onRefresh={fetchRequests}
          onClose={() => setShowDashboard(false)}
        />
      </ReviewPanel>
    </>
  );
}
