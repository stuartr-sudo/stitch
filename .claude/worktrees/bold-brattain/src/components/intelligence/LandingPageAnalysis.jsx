import React from 'react';

export default function LandingPageAnalysis({ analysis, url }) {
  if (!analysis) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Landing Page Analysis</h3>
        {url && <span className="text-xs text-gray-400 truncate ml-4">{url}</span>}
      </div>

      {/* Page Structure */}
      {analysis.page_structure?.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-500 mb-2">PAGE STRUCTURE</div>
          <div className="space-y-1">
            {analysis.page_structure.map((s, i) => (
              <div key={i} className="text-xs bg-white border border-gray-100 rounded px-3 py-1.5">
                <span className="font-medium text-indigo-600">{s.section}</span> — <span className="text-gray-600">{s.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy Analysis */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-xs font-semibold text-indigo-600 mb-2">COPY ANALYSIS</div>
        <div className="space-y-2 text-sm">
          <div><span className="font-medium text-gray-800">Headline:</span> <span className="text-gray-600">{analysis.copy_analysis?.headline}</span></div>
          <div><span className="font-medium text-gray-800">Subhead:</span> <span className="text-gray-600">{analysis.copy_analysis?.subhead}</span></div>
          <div><span className="font-medium text-gray-800">CTA:</span> <span className="text-gray-600">{analysis.copy_analysis?.cta}</span></div>
        </div>
      </div>

      {/* Conversion Tactics */}
      {analysis.conversion_tactics?.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-purple-600 mb-2">CONVERSION TACTICS</div>
          <div className="flex gap-2 flex-wrap">
            {analysis.conversion_tactics.map((t, i) => (
              <span key={i} className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs">{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Design Patterns */}
      {analysis.design_patterns && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">DESIGN PATTERNS</div>
          <p className="text-xs text-gray-600">{analysis.design_patterns}</p>
        </div>
      )}

      {/* Technical */}
      {analysis.technical && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-gray-500 mb-2">TECHNICAL</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-gray-400">Load:</span> {analysis.technical.load_time}</div>
            <div><span className="text-gray-400">Mobile:</span> {analysis.technical.mobile}</div>
            <div><span className="text-gray-400">Pixels:</span> {analysis.technical.tracking_pixels?.join(', ') || 'None detected'}</div>
            <div><span className="text-gray-400">A/B Test:</span> {analysis.technical.ab_test_indicators}</div>
          </div>
        </div>
      )}

      {/* Opportunities */}
      {analysis.opportunities?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-amber-600 mb-2">OPPORTUNITIES TO BEAT THIS</div>
          <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
            {analysis.opportunities.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
