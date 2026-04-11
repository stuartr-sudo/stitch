import React, { useState } from 'react';
import { RefreshCw, Loader2, Pin, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UTMBuilder from './UTMBuilder';

const MAX_HEADLINE = 30;
const MAX_DESCRIPTION = 90;
const HEADLINE_COUNT = 15;
const DESCRIPTION_COUNT = 4;

function CharCounter({ current, max }) {
  const over = current > max;
  return (
    <span className={`text-[10px] tabular-nums ${over ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
      {current}/{max}
    </span>
  );
}

/** Ad strength meter (like Google's own) */
function AdStrength({ headlines, descriptions }) {
  const filledH = headlines.filter(h => h.trim()).length;
  const filledD = descriptions.filter(d => d.trim()).length;
  const overH = headlines.filter(h => h.length > MAX_HEADLINE).length;
  const overD = descriptions.filter(d => d.length > MAX_DESCRIPTION).length;

  let score = 0;
  if (filledH >= 3) score++;
  if (filledH >= 8) score++;
  if (filledH >= 12) score++;
  if (filledH >= 15) score++;
  if (filledD >= 2) score++;
  if (filledD >= 4) score++;
  if (overH === 0 && overD === 0) score++;

  const labels = ['Poor', 'Poor', 'Average', 'Good', 'Good', 'Excellent', 'Excellent', 'Excellent'];
  const colors = ['bg-red-500', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-500', 'bg-green-500', 'bg-green-600'];
  const label = labels[score] || 'Poor';
  const color = colors[score] || 'bg-red-500';
  const pct = Math.min(100, (score / 7) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${score >= 5 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
        {label}
      </span>
    </div>
  );
}

/** Export to Google Ads Editor CSV format */
function exportCSV(headlines, descriptions, campaignName) {
  const rows = [['Campaign', 'Ad Group', 'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5', 'Headline 6', 'Headline 7', 'Headline 8', 'Headline 9', 'Headline 10', 'Headline 11', 'Headline 12', 'Headline 13', 'Headline 14', 'Headline 15', 'Description 1', 'Description 2', 'Description 3', 'Description 4']];
  const row = [campaignName || 'Campaign 1', 'Ad Group 1'];
  for (let i = 0; i < 15; i++) row.push(headlines[i] || '');
  for (let i = 0; i < 4; i++) row.push(descriptions[i] || '');
  rows.push(row);

  const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(campaignName || 'google-ads').replace(/\s+/g, '-').toLowerCase()}-rsa.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GoogleRSAEditor({ variation, onUpdate, onRegenerate, regenerating, campaignName, landingUrl }) {
  const copy = variation?.copy_data || {};
  const headlines = copy.headlines || Array(15).fill('');
  const descriptions = copy.descriptions || Array(4).fill('');
  const pinned = copy.pinned || {};

  const updateHeadline = (idx, value) => {
    const next = [...headlines];
    next[idx] = value;
    onUpdate({
      ...variation,
      copy_data: { ...copy, headlines: next },
    });
  };

  const updateDescription = (idx, value) => {
    const next = [...descriptions];
    next[idx] = value;
    onUpdate({
      ...variation,
      copy_data: { ...copy, descriptions: next },
    });
  };

  const togglePin = (idx, position) => {
    const next = { ...pinned };
    if (next[idx] === position) {
      delete next[idx];
    } else {
      // Remove any other headline pinned to this position
      for (const k of Object.keys(next)) {
        if (next[k] === position) delete next[k];
      }
      next[idx] = position;
    }
    onUpdate({
      ...variation,
      copy_data: { ...copy, pinned: next },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Responsive Search Ad</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCSV(headlines, descriptions, campaignName)}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRegenerate(variation.id)}
            disabled={regenerating}
          >
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Regenerate
          </Button>
        </div>
      </div>

      {/* Ad Strength */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Ad Strength</label>
        <AdStrength headlines={headlines} descriptions={descriptions} />
      </div>

      {/* Headlines */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Headlines ({headlines.filter(h => h.trim()).length}/15)</label>
          <span className="text-[10px] text-gray-400">Max 30 chars each</span>
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: HEADLINE_COUNT }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 w-4 text-right flex-shrink-0">{idx + 1}</span>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={headlines[idx] || ''}
                  onChange={e => updateHeadline(idx, e.target.value)}
                  placeholder={`Headline ${idx + 1}`}
                  maxLength={50}
                  className={`w-full border rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#2C666E] ${
                    (headlines[idx]?.length || 0) > MAX_HEADLINE ? 'border-red-300 bg-red-50' : ''
                  }`}
                />
              </div>
              <CharCounter current={headlines[idx]?.length || 0} max={MAX_HEADLINE} />
              {/* Pin controls for positions 1-3 */}
              <div className="flex gap-0.5">
                {[1, 2, 3].map(pos => (
                  <button
                    key={pos}
                    onClick={() => togglePin(idx, pos)}
                    title={`Pin to position ${pos}`}
                    className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center transition-colors ${
                      pinned[idx] === pos
                        ? 'bg-[#2C666E] text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Descriptions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Descriptions ({descriptions.filter(d => d.trim()).length}/4)</label>
          <span className="text-[10px] text-gray-400">Max 90 chars each</span>
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: DESCRIPTION_COUNT }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 w-4 text-right flex-shrink-0">{idx + 1}</span>
              <textarea
                value={descriptions[idx] || ''}
                onChange={e => updateDescription(idx, e.target.value)}
                placeholder={`Description ${idx + 1}`}
                rows={2}
                className={`flex-1 border rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#2C666E] resize-none ${
                  (descriptions[idx]?.length || 0) > MAX_DESCRIPTION ? 'border-red-300 bg-red-50' : ''
                }`}
              />
              <CharCounter current={descriptions[idx]?.length || 0} max={MAX_DESCRIPTION} />
            </div>
          ))}
        </div>
      </div>

      {/* UTM Tracking */}
      <UTMBuilder
        utmParams={copy.utm_params || {}}
        onChange={(params) => {
          onUpdate({
            ...variation,
            copy_data: { ...copy, utm_params: params },
          });
        }}
        landingUrl={landingUrl}
        platform="google"
      />
    </div>
  );
}
