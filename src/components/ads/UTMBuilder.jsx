import React, { useState } from 'react';
import { ChevronDown, Link2, Copy, Check } from 'lucide-react';

const UTM_FIELDS = [
  { key: 'utm_source', label: 'Source', placeholder: 'e.g. linkedin, google, facebook', required: true },
  { key: 'utm_medium', label: 'Medium', placeholder: 'e.g. cpc, paid_social, display', required: true },
  { key: 'utm_campaign', label: 'Campaign', placeholder: 'e.g. q2_launch, summer_sale', required: true },
  { key: 'utm_term', label: 'Term', placeholder: 'e.g. keyword or audience segment', required: false },
  { key: 'utm_content', label: 'Content', placeholder: 'e.g. variation_a, blue_banner', required: false },
];

/** Suggested presets per platform */
const PLATFORM_PRESETS = {
  linkedin: { utm_source: 'linkedin', utm_medium: 'paid_social' },
  google: { utm_source: 'google', utm_medium: 'cpc' },
  meta: { utm_source: 'facebook', utm_medium: 'paid_social' },
};

/** Build full URL with UTM params */
export function buildTrackedUrl(baseUrl, utmParams) {
  if (!baseUrl) return '';
  try {
    const url = new URL(baseUrl);
    for (const [key, value] of Object.entries(utmParams || {})) {
      if (value?.trim()) {
        url.searchParams.set(key, value.trim());
      }
    }
    return url.toString();
  } catch {
    // If not a valid URL, just append as query string
    const params = Object.entries(utmParams || {})
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `${k}=${encodeURIComponent(v.trim())}`)
      .join('&');
    if (!params) return baseUrl;
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params}`;
  }
}

export default function UTMBuilder({ utmParams, onChange, landingUrl, platform }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const params = utmParams || {};

  const handleChange = (key, value) => {
    onChange({ ...params, [key]: value });
  };

  const applyPreset = () => {
    const preset = PLATFORM_PRESETS[platform] || {};
    onChange({ ...params, ...preset });
  };

  const trackedUrl = buildTrackedUrl(landingUrl, params);
  const hasParams = Object.values(params).some(v => v?.trim());

  const handleCopy = () => {
    if (trackedUrl) {
      navigator.clipboard.writeText(trackedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-[#2C666E]" />
          <span className="text-sm font-medium text-gray-700">UTM Tracking</span>
          {hasParams && (
            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Active</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t space-y-2.5 pt-2.5">
          {/* Quick preset */}
          {platform && (
            <button
              onClick={applyPreset}
              className="text-xs text-[#2C666E] hover:underline"
            >
              Auto-fill for {platform === 'meta' ? 'Facebook' : platform.charAt(0).toUpperCase() + platform.slice(1)}
            </button>
          )}

          {UTM_FIELDS.map(field => (
            <div key={field.key}>
              <label className="text-xs font-medium text-gray-600 mb-0.5 block">
                {field.label}
                {field.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input
                type="text"
                value={params[field.key] || ''}
                onChange={e => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full border rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#2C666E]"
              />
            </div>
          ))}

          {/* Preview tracked URL */}
          {landingUrl && hasParams && (
            <div className="mt-2 pt-2 border-t">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tracked URL</label>
              <div className="flex items-start gap-1.5">
                <div className="flex-1 bg-gray-50 rounded px-2 py-1.5 text-[10px] text-gray-600 break-all font-mono leading-relaxed">
                  {trackedUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="Copy URL"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
