import React from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UTMBuilder from './UTMBuilder';
import AdImageSection from './AdImageSection';

const CTA_OPTIONS = [
  'Book Now', 'Contact Us', 'Download', 'Get Offer',
  'Get Quote', 'Learn More', 'Shop Now', 'Sign Up', 'Watch More',
];

const MAX_LENGTHS = {
  primaryText: 125,
  headline: 40,
  description: 30,
};

function CharCounter({ current, max }) {
  const over = current > max;
  return (
    <span className={`text-xs ${over ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
      {current}/{max}
    </span>
  );
}

export default function MetaAdEditor({ variation, onUpdate, onRegenerate, regenerating, landingUrl }) {
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
        <h3 className="font-medium text-gray-900">Facebook / Instagram Ad</h3>
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

      {/* Primary Text */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Primary Text</label>
          <CharCounter current={copy.primaryText?.length || 0} max={MAX_LENGTHS.primaryText} />
        </div>
        <textarea
          value={copy.primaryText || ''}
          onChange={e => handleChange('primaryText', e.target.value)}
          rows={3}
          placeholder="Main text above the image — first 125 chars shown above fold..."
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
          placeholder="Bold text below image..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]"
        />
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <CharCounter current={copy.description?.length || 0} max={MAX_LENGTHS.description} />
        </div>
        <input
          type="text"
          value={copy.description || ''}
          onChange={e => handleChange('description', e.target.value)}
          placeholder="Below headline..."
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2C666E]"
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

      {/* Image with style picker */}
      <AdImageSection
        imageUrl={variation?.image_urls?.[0]}
        imagePrompt={variation?.image_prompt}
        onRegenerate={(style) => onRegenerate(variation.id, true, style)}
        regenerating={regenerating}
        aspectClass="aspect-square"
      />

      {/* UTM Tracking */}
      <UTMBuilder
        utmParams={copy.utm_params || {}}
        onChange={(params) => handleChange('utm_params', params)}
        landingUrl={landingUrl}
        platform="meta"
      />
    </div>
  );
}
