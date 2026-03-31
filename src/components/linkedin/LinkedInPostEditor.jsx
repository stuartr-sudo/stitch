import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2, Send, Download, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { CAROUSEL_STYLE_TEMPLATES } from '@/lib/carouselStyleTemplates';
import { FONT_FAMILIES } from '@/lib/fontFamilies';

const STYLE_BADGE = {
  contrarian: 'bg-blue-100 text-blue-700',
  story:      'bg-amber-100 text-amber-700',
  data:       'bg-green-100 text-green-700',
};

export default function LinkedInPostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');

  // Style controls
  const [carouselStyle, setCarouselStyle] = useState('bold_editorial');
  const [gradientColor, setGradientColor] = useState('#1a1a2e');
  const [headlineScale, setHeadlineScale] = useState(100);
  const [bodyScale, setBodyScale] = useState(100);
  const [fontFamily, setFontFamily] = useState('inter');
  const [showStylePanel, setShowStylePanel] = useState(false);

  // Action states
  const [regeneratingText, setRegeneratingText] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [recomposing, setRecomposing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load post
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/linkedin/posts/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          toast.error(data.error);
          navigate('/linkedin');
          return;
        }
        const p = data.post;
        setPost(p);
        setBody(p.body || '');
        setCarouselStyle(p.carousel_style || 'bold_editorial');
        // Restore overrides if present
        const so = p.style_overrides || {};
        if (so.gradient_color) setGradientColor(so.gradient_color);
        if (so.headline_scale) setHeadlineScale(Math.round(so.headline_scale * 100));
        if (so.body_scale) setBodyScale(Math.round(so.body_scale * 100));
        if (so.font_family) setFontFamily(so.font_family);
      })
      .catch(() => toast.error('Failed to load post'))
      .finally(() => setLoading(false));
  }, [id]);

  // Build style overrides object from current controls
  const buildOverrides = useCallback(() => ({
    gradient_color: gradientColor,
    headline_scale: headlineScale / 100,
    body_scale: bodyScale / 100,
    font_family: fontFamily,
  }), [gradientColor, headlineScale, bodyScale, fontFamily]);

  // Save text on blur
  async function handleSaveBody() {
    if (!post || body === post.body) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/linkedin/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: body }),
      });
      const data = await res.json();
      if (!data.error) setPost(prev => ({ ...prev, body, ...data.post }));
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // Regenerate text
  async function handleRegenerateText() {
    setRegeneratingText(true);
    try {
      const res = await apiFetch(`/api/linkedin/posts/${id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style_overrides: buildOverrides() }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      const updated = data.post;
      setPost(updated);
      setBody(updated.body || '');
    } catch {
      toast.error('Regeneration failed');
    } finally {
      setRegeneratingText(false);
    }
  }

  // Regenerate image (new FAL image + recompose)
  async function handleRegenerateImage() {
    setRegeneratingImage(true);
    try {
      const res = await apiFetch(`/api/linkedin/posts/${id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style_overrides: buildOverrides(),
          regenerate_image: true,
        }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setPost(data.post);
      setBody(data.post.body || '');
    } catch {
      toast.error('Image regeneration failed');
    } finally {
      setRegeneratingImage(false);
    }
  }

  // Recompose image (no new FAL call — just re-render with new style)
  async function handleRecompose() {
    setRecomposing(true);
    try {
      const res = await apiFetch(`/api/linkedin/posts/${id}/recompose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style_overrides: buildOverrides() }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setPost(data.post);
    } catch {
      toast.error('Recompose failed');
    } finally {
      setRecomposing(false);
    }
  }

  // Publish
  async function handlePublish() {
    setPublishing(true);
    try {
      const res = await apiFetch(`/api/linkedin/posts/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      setPost(prev => ({ ...prev, status: 'published', ...data.post }));
    } catch {
      toast.error('Publishing failed');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!post) return null;

  const topic = post.linkedin_topics;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/linkedin')} className="p-1.5 rounded-md hover:bg-slate-100">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 truncate max-w-md">
              {topic?.headline || 'LinkedIn Post'}
            </h1>
            <div className="flex items-center gap-2">
              <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${STYLE_BADGE[post.style] || 'bg-slate-100 text-slate-600'}`}>
                {post.style}
              </span>
              <span className="text-xs text-slate-400">Post #{post.post_number}</span>
              {saving && <span className="text-[10px] text-slate-400">Saving...</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowStylePanel(p => !p)}
          >
            <Palette className="w-3.5 h-3.5 mr-1.5" />
            Style
          </Button>
          {post.status !== 'published' && (
            <Button size="sm" onClick={handlePublish} disabled={publishing}>
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Publish
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Text editor */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Source article link */}
            {topic?.url && (
              <a
                href={topic.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline truncate block"
              >
                Source: {topic.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 80)}
              </a>
            )}

            {/* Post body textarea */}
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              onBlur={handleSaveBody}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm min-h-[300px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Post body..."
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{body.length} / 3000</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleRegenerateText} disabled={regeneratingText}>
                  {regeneratingText ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Regenerate Text
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Image preview + style controls */}
        <div className={`border-l border-slate-200 bg-white overflow-y-auto transition-all ${showStylePanel ? 'w-[420px]' : 'w-[340px]'}`}>
          <div className="p-4 space-y-4">
            {/* Image preview */}
            <div className="rounded-lg overflow-hidden bg-slate-100 aspect-square">
              {post.featured_image_square ? (
                <img
                  src={post.featured_image_square}
                  alt="Post image"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                  No image yet
                </div>
              )}
            </div>

            {/* Image action buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={handleRecompose}
                disabled={recomposing || !post.base_image_url}
                title={!post.base_image_url ? 'No base image — regenerate image first' : 'Recompose with current style'}
              >
                {recomposing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Palette className="w-3.5 h-3.5 mr-1.5" />}
                Recompose
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={handleRegenerateImage}
                disabled={regeneratingImage}
              >
                {regeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                New Image
              </Button>
            </div>

            {post.featured_image_square && (
              <a
                href={post.featured_image_square}
                download={`linkedin-post-${post.post_number || ''}.png`}
                className="flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                <Download className="w-3 h-3" />
                Download Image
              </a>
            )}

            {/* Style controls (collapsible) */}
            {showStylePanel && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Style Controls</h3>

                {/* Layout template */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Layout</label>
                  <select
                    value={carouselStyle}
                    onChange={e => setCarouselStyle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  >
                    {CAROUSEL_STYLE_TEMPLATES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Gradient color */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Gradient Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gradientColor}
                      onChange={e => setGradientColor(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                    />
                    <span className="text-xs text-slate-400 font-mono">{gradientColor}</span>
                  </div>
                </div>

                {/* Font */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Font</label>
                  <select
                    value={fontFamily}
                    onChange={e => setFontFamily(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  >
                    {Object.entries(FONT_FAMILIES).map(([key, fam]) => (
                      <option key={key} value={key}>{fam.label} ({fam.category})</option>
                    ))}
                  </select>
                </div>

                {/* Headline size */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Headline Size: {headlineScale}%
                  </label>
                  <input
                    type="range"
                    min="60"
                    max="160"
                    value={headlineScale}
                    onChange={e => setHeadlineScale(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Body size */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Body Size: {bodyScale}%
                  </label>
                  <input
                    type="range"
                    min="60"
                    max="160"
                    value={bodyScale}
                    onChange={e => setBodyScale(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Apply button */}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleRecompose}
                  disabled={recomposing || !post.base_image_url}
                >
                  {recomposing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Apply Style Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
