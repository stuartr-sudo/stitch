import React, { useState } from 'react';
import { Loader2, Youtube, Instagram, Music2, Monitor, Copy, Check, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const PLATFORMS = [
  { key: 'youtube_shorts', label: 'YouTube Shorts', icon: Youtube, desc: 'Vertical short-form, #Shorts tag, < 60s', color: 'text-red-500' },
  { key: 'tiktok', label: 'TikTok', icon: Music2, desc: 'Hook-first caption, trending hashtags', color: 'text-slate-800' },
  { key: 'instagram_reels', label: 'Instagram Reels', icon: Instagram, desc: 'Emoji-rich caption, 30 hashtags', color: 'text-pink-500' },
  { key: 'youtube_landscape', label: 'YouTube Landscape', icon: Monitor, desc: '16:9 letterboxed version with SEO metadata', color: 'text-red-600' },
];

export default function RepurposePanel({ draftId, videoUrl }) {
  const [selected, setSelected] = useState({ youtube_shorts: true, tiktok: true, instagram_reels: true, youtube_landscape: false });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [editState, setEditState] = useState({}); // { platform: { field: value } }
  const [copied, setCopied] = useState(null); // 'platform.field'

  const togglePlatform = (key) => setSelected(prev => ({ ...prev, [key]: !prev[key] }));

  const handleRepurpose = async () => {
    const platforms = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (!platforms.length) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setEditState({});
    try {
      const res = await apiFetch('/api/workbench/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, platforms }),
      });
      if (!res.ok) {
        let msg = `Server error (${res.status})`;
        try { const body = await res.json(); if (body.error) msg = body.error; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.repurposed);
    } catch (err) {
      setError(err.message || 'Repurpose failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text, key) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const getFieldValue = (platform, field, original) => {
    return editState[platform]?.[field] ?? original;
  };

  const setFieldValue = (platform, field, value) => {
    setEditState(prev => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [field]: value },
    }));
  };

  const anySelected = Object.values(selected).some(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-5 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-800">Repurpose for Platforms</h2>
        <span className="text-[11px] text-slate-400">AI-generated metadata per platform</span>
      </div>
      <div className="p-5">
        {/* Platform Selection */}
        {!results && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {PLATFORMS.map(({ key, label, icon: Icon, desc, color }) => (
                <button
                  key={key}
                  onClick={() => togglePlatform(key)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    selected[key]
                      ? 'border-[#2C666E] bg-[#2C666E]/5'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`mt-0.5 ${selected[key] ? 'text-[#2C666E]' : 'text-slate-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{desc}</div>
                  </div>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center mt-0.5 ${
                    selected[key] ? 'border-[#2C666E] bg-[#2C666E]' : 'border-slate-300'
                  }`}>
                    {selected[key] && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleRepurpose}
              disabled={loading || !anySelected}
              className="w-full px-4 py-3 bg-[#2C666E] text-white rounded-xl text-sm font-bold hover:bg-[#1f4f55] disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Generating metadata...</>
              ) : (
                <>Repurpose ({Object.values(selected).filter(Boolean).length} platforms)</>
              )}
            </button>

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
            )}
          </>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-green-600 font-semibold">{results.length} platform version{results.length !== 1 ? 's' : ''} generated</span>
              <button
                onClick={() => { setResults(null); setEditState({}); }}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Start over
              </button>
            </div>

            {results.map((version) => {
              const platformDef = PLATFORMS.find(p => p.key === version.platform);
              const Icon = platformDef?.icon || Monitor;

              return (
                <div key={version.platform} className="border border-slate-200 rounded-xl overflow-hidden">
                  {/* Platform header */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${platformDef?.color || 'text-slate-600'}`} />
                    <span className="text-sm font-semibold text-slate-800">{version.label}</span>
                    {version.aspect_ratio === '16:9' && (
                      <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">16:9 Landscape</span>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Title field (YouTube variants) */}
                    {version.title !== undefined && (
                      <FieldBlock
                        label="Title"
                        value={getFieldValue(version.platform, 'title', version.title)}
                        onChange={(v) => setFieldValue(version.platform, 'title', v)}
                        onCopy={() => copyToClipboard(getFieldValue(version.platform, 'title', version.title), `${version.platform}.title`)}
                        isCopied={copied === `${version.platform}.title`}
                      />
                    )}

                    {/* Caption field (TikTok, Instagram) */}
                    {version.caption !== undefined && (
                      <FieldBlock
                        label="Caption"
                        value={getFieldValue(version.platform, 'caption', version.caption)}
                        onChange={(v) => setFieldValue(version.platform, 'caption', v)}
                        onCopy={() => copyToClipboard(getFieldValue(version.platform, 'caption', version.caption), `${version.platform}.caption`)}
                        isCopied={copied === `${version.platform}.caption`}
                        multiline
                      />
                    )}

                    {/* Description (YouTube) */}
                    {version.description !== undefined && (
                      <FieldBlock
                        label="Description"
                        value={getFieldValue(version.platform, 'description', version.description)}
                        onChange={(v) => setFieldValue(version.platform, 'description', v)}
                        onCopy={() => copyToClipboard(getFieldValue(version.platform, 'description', version.description), `${version.platform}.description`)}
                        isCopied={copied === `${version.platform}.description`}
                        multiline
                      />
                    )}

                    {/* Hashtags */}
                    {version.hashtags && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Hashtags</span>
                          <button
                            onClick={() => copyToClipboard(
                              (getFieldValue(version.platform, 'hashtags', version.hashtags) || version.hashtags).map(h => h.startsWith('#') ? h : `#${h}`).join(' '),
                              `${version.platform}.hashtags`
                            )}
                            className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                          >
                            {copied === `${version.platform}.hashtags` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            Copy
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {version.hashtags.map((tag, i) => (
                            <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {tag.startsWith('#') ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags (YouTube Landscape) */}
                    {version.tags && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SEO Tags</span>
                          <button
                            onClick={() => copyToClipboard(version.tags.join(', '), `${version.platform}.tags`)}
                            className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                          >
                            {copied === `${version.platform}.tags` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            Copy
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {version.tags.map((tag, i) => (
                            <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Landscape video preview */}
                    {version.aspect_ratio === '16:9' && version.video_url && (
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Landscape Preview</span>
                        <video src={version.video_url} controls className="w-full rounded-lg border border-slate-200" style={{ maxHeight: '240px' }} />
                      </div>
                    )}

                    {/* Publish / Connect */}
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      {version.platform === 'youtube_shorts' || version.platform === 'youtube_landscape' ? (
                        <a href="/settings/accounts" className="text-xs text-[#2C666E] hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />Publish via YouTube
                        </a>
                      ) : version.platform === 'tiktok' ? (
                        <a href="/settings/accounts" className="text-xs text-[#2C666E] hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />Publish via TikTok
                        </a>
                      ) : version.platform === 'instagram_reels' ? (
                        <a href="/settings/accounts" className="text-xs text-[#2C666E] hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />Publish via Instagram
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldBlock({ label, value, onChange, onCopy, isCopied, multiline }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <button onClick={onCopy} className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
          {isCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
          {isCopied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 resize-y focus:outline-none focus:ring-1 focus:ring-[#2C666E] focus:border-[#2C666E]"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2C666E] focus:border-[#2C666E]"
        />
      )}
    </div>
  );
}
