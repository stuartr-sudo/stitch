import React from 'react';
import { X, ExternalLink, Loader2, Globe, Sparkles, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LandingPageAnalysis from './LandingPageAnalysis';

export default function AdTeardownPanel({ open, onClose, ad, analysis, landingAnalysis, onAnalyzeLanding, onSave, onCreateCampaign, onUseInCommandCenter, analyzingLanding }) {
  if (!open || !ad) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-gray-900">Ad Teardown</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Ad Info */}
          <div className="flex gap-4">
            <div className="w-48 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm shrink-0">
              {ad.thumbnail_url ? <img src={ad.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" /> : 'Ad Preview'}
            </div>
            <div className="space-y-2 min-w-0">
              <h3 className="font-semibold text-gray-900">{ad.title || ad.advertiser}</h3>
              <p className="text-sm text-gray-500">{ad.description || ad.ad_copy}</p>
              {ad.source_url && (
                <a href={ad.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> {ad.platform} — View original
                </a>
              )}
              {ad.landing_page_url && (
                <div className="text-xs text-gray-400">Landing: {ad.landing_page_url}</div>
              )}
            </div>
          </div>

          {analysis && (
            <>
              {/* Hook */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                <div className="text-xs font-semibold text-indigo-600 mb-1">HOOK</div>
                <p className="text-sm text-gray-700">{analysis.hook}</p>
              </div>

              {/* Copy Breakdown */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-purple-600 mb-2">COPY BREAKDOWN</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-400">Headline:</span> <span className="text-gray-700">{analysis.copy_breakdown?.headline}</span></div>
                  <div><span className="text-gray-400">Body:</span> <span className="text-gray-700">{analysis.copy_breakdown?.body}</span></div>
                  <div><span className="text-gray-400">CTA:</span> <span className="text-gray-700">{analysis.copy_breakdown?.cta}</span></div>
                  <div><span className="text-gray-400">Tone:</span> <span className="text-gray-700">{analysis.copy_breakdown?.tone || 'N/A'}</span></div>
                </div>
              </div>

              {/* Emotional Triggers */}
              {analysis.emotional_triggers?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-purple-600 mb-2">EMOTIONAL TRIGGERS</div>
                  <div className="flex gap-2 flex-wrap">
                    {analysis.emotional_triggers.map((t, i) => (
                      <span key={i} className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths / Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                  <div className="text-xs font-semibold text-green-600 mb-2">STRENGTHS</div>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    {analysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                  <div className="text-xs font-semibold text-red-600 mb-2">WEAKNESSES</div>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    {analysis.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>

              {/* Clone Suggestions */}
              {analysis.clone_suggestions?.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <div className="text-xs font-semibold text-amber-600 mb-2">HOW TO BEAT THIS AD</div>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    {analysis.clone_suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Landing Page Analysis */}
          {landingAnalysis && (
            <LandingPageAnalysis analysis={landingAnalysis} url={ad.landing_page_url} />
          )}

          {/* Action Bar */}
          <div className="flex gap-3 pt-4 border-t flex-wrap">
            <Button onClick={() => onCreateCampaign(ad, analysis)} className="flex-1 bg-green-600 hover:bg-green-700">
              <Sparkles className="w-4 h-4 mr-2" /> Create Ad Campaign
            </Button>
            {onUseInCommandCenter && (
              <Button onClick={() => { onUseInCommandCenter(ad, analysis); onClose(); }} className="flex-1 bg-[#2C666E] hover:bg-[#3a7a83]">
                <Bot className="w-4 h-4 mr-2" /> Use in Command Center
              </Button>
            )}
            {ad.landing_page_url && !landingAnalysis && (
              <Button onClick={() => onAnalyzeLanding(ad.landing_page_url)} disabled={analyzingLanding} variant="outline" className="border-indigo-300 text-indigo-600">
                {analyzingLanding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                Analyze Landing Page
              </Button>
            )}
            <Button onClick={() => onSave(ad, analysis)} variant="outline">
              Save to Library
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
