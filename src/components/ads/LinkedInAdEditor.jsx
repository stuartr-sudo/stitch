import React from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UTMBuilder from './UTMBuilder';

const CTA_OPTIONS = [
  'Apply Now', 'Download', 'Get Quote', 'Learn More',
  'Sign Up', 'Subscribe', 'Register', 'Request Demo', 'Contact Us',
];

const MAX_LENGTHS = {
  introText: 600,
  headline: 200,
  description: 300,
};

function CharCounter({ current, max }) {
  const over = current > max;
  return (
    <span className={`text-xs ${over ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
      {current}/{max}
    </span>
  );
}

export default function LinkedInAdEditor({ variation, onUpdate, onRegenerate, regenerating, landingUrl }) {
  const copy = variation?.copy_data || {};

  const handleChange = (field, value) => {
    onUpdate({
      ...variation,
      copy_data: { ...copy, [field]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">LinkedIn Sponsored Content</h3>
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

      {/* Intro Text */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Intro Text</label>
          <CharCounter current={copy.introText?.length || 0} max={MAX_LENGTHS.introText} />
        </div>
        <textarea
          value={copy.introText || ''}
          onChange={e => handleChange('introText', e.target.value)}
          rows={5}
          placeholder="Main post text that appears above the image..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E] resize-none"
        />
      </div>

      {/* Headline */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Headline</label>
          <CharCounter current={copy.headline?.length || 0} max={MAX_LENGTHS.headline} />
        </div>
        <input
          type="text"
          value={copy.headline || ''}
          onChange={e => handleChange('headline', e.target.value)}
          placeholder="Punchy headline below the image..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]"
        />
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <CharCounter current={copy.description?.length || 0} max={MAX_LENGTHS.description} />
        </div>
        <textarea
          value={copy.description || ''}
          onChange={e => handleChange('description', e.target.value)}
          rows={2}
          placeholder="Supporting text below the headline..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E] resize-none"
        />
      </div>

      {/* CTA */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Call to Action</label>
        <div className="flex flex-wrap gap-1.5">
          {CTA_OPTIONS.map(cta => (
            <button
              key={cta}
              onClick={() => handleChange('cta', cta)}
              className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                copy.cta === cta
                  ? 'bg-[#2C666E] text-white border-[#2C666E]'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cta}
            </button>
          ))}
        </div>
      </div>

      {/* Image */}
      {variation?.image_urls?.[0] && (
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Ad Image</label>
          <div className="relative rounded-lg overflow-hidden border">
            <img
              src={variation.image_urls[0]}
              alt="Ad creative"
              className="w-full aspect-[1.91/1] object-cover"
            />
            <button
              onClick={() => onRegenerate(variation.id, true)}
              disabled={regenerating}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-lg p-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* UTM Tracking */}
      <UTMBuilder
        utmParams={copy.utm_params || {}}
        onChange={(params) => handleChange('utm_params', params)}
        landingUrl={landingUrl}
        platform="linkedin"
      />
    </div>
  );
}
