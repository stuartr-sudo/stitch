import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

// ── Niche labels ──────────────────────────────────────────────────────────────
const NICHE_LABELS = {
  ai_tech_news: 'AI & Tech News',
  finance_money: 'Finance & Money',
  motivation: 'Motivation',
  scary_horror: 'Scary & Horror',
  history: 'History & Did You Know',
  true_crime: 'True Crime',
  science_nature: 'Science & Nature',
  relationships: 'Relationships & Dating',
  health_fitness: 'Health & Fitness',
  gaming_popculture: 'Gaming & Pop Culture',
  conspiracy_mystery: 'Conspiracy & Mystery',
  business: 'Business',
  food_cooking: 'Food & Cooking',
  travel_adventure: 'Travel & Adventure',
  psychology: 'Psychology',
  space_cosmos: 'Space & Cosmos',
  animals_wildlife: 'Animals & Wildlife',
  sports: 'Sports',
  education: 'Education',
  paranormal_ufo: 'Paranormal & UFO',
};

// ── Image model options ───────────────────────────────────────────────────────
const IMAGE_MODELS = [
  { id: 'nano-banana-2', label: 'Nano Banana 2', description: 'Fastest, great all-rounder' },
  { id: 'fal-flux', label: 'FLUX 2', description: 'High quality, LoRA support' },
  { id: 'fal-flux-klein-4b', label: 'FLUX Klein 4B', description: 'Fast FLUX variant' },
  { id: 'fal-flux-klein-9b', label: 'FLUX Klein 9B', description: 'Balanced FLUX variant' },
  { id: 'seeddream-v4', label: 'SeedDream v4.5', description: 'Excellent detail & composition' },
  { id: 'imagen-4', label: 'Imagen 4', description: 'Google, strong text rendering' },
  { id: 'kling-image-v3', label: 'Kling Image v3', description: 'Character consistency' },
  { id: 'grok-imagine', label: 'Grok Imagine', description: 'xAI, creative styles' },
  { id: 'ideogram-v2', label: 'Ideogram v2', description: 'Best text-in-image' },
  { id: 'wavespeed', label: 'Wavespeed', description: 'Budget-friendly' },
  { id: 'wan-22-t2i', label: 'Wan 2.2 T2I', description: 'LoRA support' },
];

// ── Video model options ───────────────────────────────────────────────────────
const VIDEO_MODELS = [
  { id: 'kling-2.0-master', label: 'Kling 2.0 Master', description: 'Great all-rounder, 5-10s' },
  { id: 'kling-v3-pro', label: 'Kling V3 Pro', description: 'Multi-shot, high quality' },
  { id: 'kling-o3-pro', label: 'Kling O3 Pro', description: 'R2V capable, top tier' },
  { id: 'veo-2', label: 'Veo 2', description: 'Google, cinematic quality' },
  { id: 'veo-3.1-fast', label: 'Veo 3.1', description: 'Best quality, FLF support' },
  { id: 'veo-3.1-lite', label: 'Veo 3.1 Lite', description: '60% cheaper, good quality' },
  { id: 'pixverse-v6', label: 'PixVerse V6', description: 'Audio generation support' },
  { id: 'pixverse-v4.5', label: 'PixVerse v4.5', description: 'Reliable, fast' },
  { id: 'wan-2.5', label: 'Wan 2.5', description: 'Open source, versatile' },
  { id: 'wan-pro', label: 'Wan Pro', description: 'Premium Wan variant' },
  { id: 'hailuo', label: 'Hailuo (MiniMax)', description: 'Smooth motion' },
  { id: 'grok-imagine-i2v', label: 'Grok I2V', description: 'xAI, with audio' },
  { id: 'wavespeed-wan', label: 'Wavespeed WAN', description: 'Budget-friendly' },
];

// ── Voice options ─────────────────────────────────────────────────────────────
const VOICE_OPTIONS = [
  { id: 'Kore', label: 'Kore', description: 'Strong, firm female' },
  { id: 'Puck', label: 'Puck', description: 'Upbeat, lively male' },
  { id: 'Charon', label: 'Charon', description: 'Calm, professional male' },
  { id: 'Zephyr', label: 'Zephyr', description: 'Bright, clear female' },
  { id: 'Aoede', label: 'Aoede', description: 'Warm, melodic female' },
  { id: 'Achernar', label: 'Achernar', description: 'Deep, resonant' },
  { id: 'Achird', label: 'Achird', description: 'Gentle, measured' },
  { id: 'Algenib', label: 'Algenib', description: 'Energetic, bright' },
  { id: 'Algieba', label: 'Algieba', description: 'Warm, conversational' },
  { id: 'Alnilam', label: 'Alnilam', description: 'Steady, authoritative' },
  { id: 'Autonoe', label: 'Autonoe', description: 'Soft, thoughtful' },
  { id: 'Callirrhoe', label: 'Callirrhoe', description: 'Clear, articulate' },
  { id: 'Despina', label: 'Despina', description: 'Light, airy' },
  { id: 'Enceladus', label: 'Enceladus', description: 'Rich, dramatic' },
  { id: 'Erinome', label: 'Erinome', description: 'Crisp, professional' },
  { id: 'Fenrir', label: 'Fenrir', description: 'Bold, commanding' },
  { id: 'Gacrux', label: 'Gacrux', description: 'Smooth, reassuring' },
  { id: 'Iapetus', label: 'Iapetus', description: 'Neutral, versatile' },
  { id: 'Laomedeia', label: 'Laomedeia', description: 'Melodious, flowing' },
  { id: 'Leda', label: 'Leda', description: 'Quiet, intimate' },
  { id: 'Orus', label: 'Orus', description: 'Strong, grounded' },
  { id: 'Pulcherrima', label: 'Pulcherrima', description: 'Elegant, refined' },
  { id: 'Rasalgethi', label: 'Rasalgethi', description: 'Deep, sonorous' },
  { id: 'Sadachbia', label: 'Sadachbia', description: 'Cheerful, warm' },
  { id: 'Sadaltager', label: 'Sadaltager', description: 'Measured, precise' },
  { id: 'Schedar', label: 'Schedar', description: 'Bright, enthusiastic' },
  { id: 'Sulafat', label: 'Sulafat', description: 'Calm, soothing' },
  { id: 'Umbriel', label: 'Umbriel', description: 'Low, mysterious' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix', description: 'Clear, confident' },
  { id: 'Zubenelgenubi', label: 'Zubenelgenubi', description: 'Animated, expressive' },
];

// ── Caption style options ─────────────────────────────────────────────────────
const CAPTION_STYLES = [
  { id: 'word_pop', label: 'Word Pop', description: 'Words appear one at a time with scale animation' },
  { id: 'karaoke_glow', label: 'Karaoke Glow', description: 'Words highlight as spoken' },
  { id: 'word_highlight', label: 'Word Highlight', description: 'Subtle purple highlight on current word' },
  { id: 'news_ticker', label: 'News Ticker', description: 'Scrolling lower-third bar' },
];

// ── Carousel style descriptions ───────────────────────────────────────────────
const CAROUSEL_STYLE_DESCRIPTIONS = {
  'modern-clean': 'Clean lines, minimal layout',
  'bold-impact': 'Strong typography, high contrast',
  'gradient-wave': 'Gradient backgrounds, flowing shapes',
  'minimal-zen': 'Minimalist, lots of whitespace',
  'corporate-blue': 'Professional, corporate tones',
  'creative-pop': 'Colorful, playful design',
  'dark-luxe': 'Dark backgrounds, luxury feel',
  'organic-natural': 'Earth tones, organic shapes',
};

// ── Shared helper components ──────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function CardSelect({ options, value, onChange, columns = 3 }) {
  const gridClass = columns === 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div className={`grid ${gridClass} gap-2`}>
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
            value === opt.id
              ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
          }`}
        >
          {opt.icon && <span className="text-base mr-1.5">{opt.icon}</span>}
          <span className="text-sm font-medium text-gray-200 block">{opt.label}</span>
          {opt.description && <span className="text-[11px] text-gray-500 block mt-0.5 leading-snug">{opt.description}</span>}
        </button>
      ))}
    </div>
  );
}

function LabeledTextarea({ label, value, onChange, placeholder, rows = 3, description }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-medium text-gray-400 block mb-1.5">{label}</label>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-y"
      />
      {description && <p className="text-[11px] text-gray-600 mt-1">{description}</p>}
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder, description }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-medium text-gray-400 block mb-1.5">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      />
      {description && <p className="text-[11px] text-gray-600 mt-1">{description}</p>}
    </div>
  );
}

function LabeledSelect({ label, value, onChange, options, description }) {
  return (
    <div className="mb-4">
      <label className="text-xs font-medium text-gray-400 block mb-1.5">{label}</label>
      <select
        value={value || (typeof options[0] === 'string' ? options[0] : options[0]?.id)}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
      >
        {options.map(opt => {
          const id = typeof opt === 'string' ? opt : opt.id;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          return <option key={id} value={id} className="bg-gray-900">{optLabel}</option>;
        })}
      </select>
      {description && <p className="text-[11px] text-gray-600 mt-1">{description}</p>}
    </div>
  );
}

function PillSelect({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const id = typeof opt === 'string' ? opt : opt.id;
        const label = typeof opt === 'string' ? opt : opt.label;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
              value === id
                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'
                : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:border-white/20'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function AspectRatioSelect({ value, onChange, options }) {
  const ratios = options || ['16:9', '9:16', '1:1', '4:5', '3:2'];
  const icons = {
    '16:9': { w: 'w-7', h: 'h-4' },
    '9:16': { w: 'w-4', h: 'h-7' },
    '1:1': { w: 'w-5', h: 'h-5' },
    '4:5': { w: 'w-5', h: 'h-6' },
    '3:2': { w: 'w-6', h: 'h-4' },
  };
  return (
    <div className="flex gap-2">
      {ratios.map(ratio => (
        <button
          key={ratio}
          onClick={() => onChange(ratio)}
          className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-lg border transition-all ${
            value === ratio
              ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30'
              : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
          }`}
        >
          <div className={`${icons[ratio]?.w || 'w-5'} ${icons[ratio]?.h || 'h-5'} border-2 rounded-sm ${
            value === ratio ? 'border-indigo-400' : 'border-gray-500'
          }`} />
          <span className={`text-[11px] font-medium ${value === ratio ? 'text-indigo-300' : 'text-gray-500'}`}>{ratio}</span>
        </button>
      ))}
    </div>
  );
}


// ── Category-specific forms ───────────────────────────────────────────────────

function ImageForm({ config, updateConfig, nodeType, brandKits }) {
  const nodeId = nodeType.id;
  const schema = nodeType.configSchema || {};

  // Determine which model list to use — full list for imagineer-generate/turnaround, otherwise from schema
  const showFullModels = nodeId === 'imagineer-generate' || nodeId === 'turnaround-sheet';
  const modelOptions = showFullModels
    ? IMAGE_MODELS
    : schema.model?.options
      ? IMAGE_MODELS.filter(m => schema.model.options.includes(m.id))
      : [];

  return (
    <>
      {schema.model && modelOptions.length > 0 && (
        <Section title="Model">
          <CardSelect
            options={modelOptions}
            value={config.model || schema.model?.default || modelOptions[0]?.id}
            onChange={v => updateConfig('model', v)}
          />
        </Section>
      )}

      {nodeId === 'imagineer-generate' && (
        <Section title="Prompt">
          <LabeledTextarea
            label="Default Prompt"
            value={config.prompt}
            onChange={v => updateConfig('prompt', v)}
            placeholder="Connected via input port, or set default here..."
            rows={3}
            description="Will be used if no prompt is connected via input port."
          />
        </Section>
      )}

      {schema.aspect_ratio && (
        <Section title="Aspect Ratio">
          <AspectRatioSelect
            value={config.aspect_ratio || schema.aspect_ratio?.default || '16:9'}
            onChange={v => updateConfig('aspect_ratio', v)}
            options={schema.aspect_ratio.options}
          />
        </Section>
      )}

      {nodeId === 'imagineer-generate' && (
        <Section title="Style & Brand">
          {brandKits && brandKits.length > 0 && (
            <LabeledSelect
              label="Brand Kit"
              value={config.brand_kit || ''}
              onChange={v => updateConfig('brand_kit', v)}
              options={[{ id: '', label: 'None' }, ...brandKits.map(bk => ({ id: bk.id, label: bk.brand_name || bk.id }))]}
            />
          )}
          <LabeledTextarea
            label="Negative Prompt"
            value={config.negative_prompt}
            onChange={v => updateConfig('negative_prompt', v)}
            placeholder="Things to avoid..."
            rows={2}
          />
        </Section>
      )}

      {nodeId === 'turnaround-sheet' && schema.pose_set && (
        <Section title="Pose Set">
          <CardSelect
            options={schema.pose_set.options.map(id => ({
              id,
              label: { 'standard-24': 'Standard 24', '3d-angles': '3D Angles', '3d-action': '3D Action', 'r2v-reference': 'R2V Reference' }[id] || id,
              description: { 'standard-24': 'Classic turnaround, 4x6 grid', '3d-angles': 'Orthographic views, 2x2', '3d-action': 'Dynamic poses, 2x2', 'r2v-reference': 'R2V-optimized, 3x2' }[id] || '',
            }))}
            value={config.pose_set || schema.pose_set?.default || 'standard-24'}
            onChange={v => updateConfig('pose_set', v)}
            columns={2}
          />
        </Section>
      )}

      {nodeId === 'turnaround-sheet' && schema.background_mode && (
        <Section title="Background Mode">
          <CardSelect
            options={[
              { id: 'white', label: 'White', description: 'Clean white background' },
              { id: 'gray', label: 'Gray', description: 'Industry standard for production' },
              { id: 'scene', label: 'Scene', description: 'Contextual environment for R2V' },
            ]}
            value={config.background_mode || schema.background_mode?.default || 'white'}
            onChange={v => updateConfig('background_mode', v)}
          />
        </Section>
      )}

      {nodeId === 'upscale-image' && schema.upscale_factor && (
        <Section title="Upscale Factor">
          <PillSelect
            options={schema.upscale_factor.options.map(v => ({ id: v, label: `${v}x` }))}
            value={config.upscale_factor || schema.upscale_factor?.default || '2'}
            onChange={v => updateConfig('upscale_factor', v)}
          />
        </Section>
      )}

      {nodeId === 'smoosh' && schema.blend_prompt && (
        <Section title="Blend Instructions">
          <LabeledTextarea
            label="Blend Prompt"
            value={config.blend_prompt}
            onChange={v => updateConfig('blend_prompt', v)}
            placeholder="e.g. blend these images together seamlessly, matching lighting and perspective"
            rows={3}
          />
        </Section>
      )}
    </>
  );
}

function VideoForm({ config, updateConfig, nodeType }) {
  const schema = nodeType.configSchema || {};

  // Filter VIDEO_MODELS to only those in the schema
  const modelOptions = schema.model?.options
    ? VIDEO_MODELS.filter(m => schema.model.options.includes(m.id))
    : [];

  const durationOptions = schema.duration?.options || [];

  return (
    <>
      {schema.model && modelOptions.length > 0 && (
        <Section title="Model">
          <CardSelect
            options={modelOptions}
            value={config.model || schema.model?.default || modelOptions[0]?.id}
            onChange={v => updateConfig('model', v)}
          />
        </Section>
      )}

      {schema.duration && durationOptions.length > 0 && (
        <Section title="Duration">
          <PillSelect
            options={durationOptions.map(d => ({ id: d, label: `${d}s` }))}
            value={config.duration || schema.duration?.default || durationOptions[0]}
            onChange={v => updateConfig('duration', v)}
          />
        </Section>
      )}

      {schema.aspect_ratio && (
        <Section title="Aspect Ratio">
          <AspectRatioSelect
            value={config.aspect_ratio || schema.aspect_ratio?.default || '16:9'}
            onChange={v => updateConfig('aspect_ratio', v)}
            options={schema.aspect_ratio.options}
          />
        </Section>
      )}
    </>
  );
}

function AudioForm({ config, updateConfig, nodeType }) {
  const nodeId = nodeType.id;
  const schema = nodeType.configSchema || {};

  if (nodeId === 'voiceover') {
    return (
      <>
        <Section title="Voice">
          <div className="max-h-[400px] overflow-y-auto pr-1">
            <CardSelect
              options={VOICE_OPTIONS}
              value={config.voice || schema.voice?.default || 'Kore'}
              onChange={v => updateConfig('voice', v)}
              columns={2}
            />
          </div>
        </Section>
        <Section title="Speed">
          <PillSelect
            options={[
              { id: '1.0', label: '1.0x (Normal)' },
              { id: '1.15', label: '1.15x (Recommended)' },
              { id: '1.3', label: '1.3x (Fast)' },
            ]}
            value={config.speed || schema.speed?.default || '1.15'}
            onChange={v => updateConfig('speed', v)}
          />
        </Section>
        <Section title="Style Instructions">
          <LabeledTextarea
            label="Voice Direction"
            value={config.style_instructions}
            onChange={v => updateConfig('style_instructions', v)}
            placeholder="e.g. Speak with dramatic tension and pauses"
            rows={3}
          />
        </Section>
      </>
    );
  }

  if (nodeId === 'music') {
    return (
      <>
        <Section title="Mood">
          <LabeledTextarea
            label="Music Mood"
            value={config.mood}
            onChange={v => updateConfig('mood', v)}
            placeholder="e.g. cinematic tension, lo-fi chill, upbeat electronic"
            rows={3}
          />
        </Section>
        <Section title="Duration">
          <PillSelect
            options={(schema.duration?.options || ['10', '15', '20', '30', '45', '60', '90']).map(d => ({ id: d, label: `${d}s` }))}
            value={config.duration || schema.duration?.default || '30'}
            onChange={v => updateConfig('duration', v)}
          />
        </Section>
      </>
    );
  }

  if (nodeId === 'captions') {
    return (
      <>
        <Section title="Caption Style">
          <CardSelect
            options={CAPTION_STYLES}
            value={config.style || schema.style?.default || 'word_pop'}
            onChange={v => updateConfig('style', v)}
            columns={2}
          />
        </Section>
        <Section title="Font Size">
          <PillSelect
            options={[
              { id: 'small', label: 'Small' },
              { id: 'medium', label: 'Medium' },
              { id: 'large', label: 'Large' },
            ]}
            value={config.font_size || schema.font_size?.default || 'medium'}
            onChange={v => updateConfig('font_size', v)}
          />
        </Section>
        <Section title="Position">
          <PillSelect
            options={[
              { id: 'bottom', label: 'Bottom' },
              { id: 'center', label: 'Center' },
              { id: 'top', label: 'Top' },
            ]}
            value={config.position || schema.position?.default || 'bottom'}
            onChange={v => updateConfig('position', v)}
          />
        </Section>
      </>
    );
  }

  // Fallback — generic schema-based form
  return <GenericSchemaForm config={config} updateConfig={updateConfig} schema={schema} />;
}

function ContentForm({ config, updateConfig, nodeType }) {
  const nodeId = nodeType.id;
  const schema = nodeType.configSchema || {};

  if (nodeId === 'script-generator') {
    const nicheOptions = (schema.niche?.options || Object.keys(NICHE_LABELS)).map(id => ({
      id,
      label: NICHE_LABELS[id] || id,
    }));

    return (
      <>
        <Section title="Niche">
          <div className="max-h-[360px] overflow-y-auto pr-1">
            <CardSelect
              options={nicheOptions}
              value={config.niche || schema.niche?.default || 'ai_tech_news'}
              onChange={v => updateConfig('niche', v)}
            />
          </div>
        </Section>
        <Section title="Duration">
          <PillSelect
            options={(schema.duration?.options || ['30', '60', '90']).map(d => ({ id: d, label: `${d}s` }))}
            value={config.duration || schema.duration?.default || '60'}
            onChange={v => updateConfig('duration', v)}
          />
        </Section>
        <Section title="Tone">
          <LabeledInput
            label="Tone"
            value={config.tone}
            onChange={v => updateConfig('tone', v)}
            placeholder="e.g. dramatic, conversational, urgent"
          />
        </Section>
      </>
    );
  }

  if (nodeId === 'ads-generate') {
    return (
      <>
        <Section title="Platform">
          <CardSelect
            options={[
              { id: 'linkedin', label: 'LinkedIn', icon: '\uD83D\uDCBC' },
              { id: 'google', label: 'Google', icon: '\uD83D\uDCCA' },
              { id: 'meta', label: 'Meta', icon: '\uD83D\uDCF1' },
            ]}
            value={config.platform || schema.platform?.default || 'linkedin'}
            onChange={v => updateConfig('platform', v)}
          />
        </Section>
        <Section title="Objective">
          <CardSelect
            options={[
              { id: 'traffic', label: 'Traffic', description: 'Drive visitors to your site' },
              { id: 'conversions', label: 'Conversions', description: 'Maximize purchases or signups' },
              { id: 'awareness', label: 'Awareness', description: 'Reach new audiences' },
              { id: 'leads', label: 'Leads', description: 'Collect contact information' },
            ]}
            value={config.objective || schema.objective?.default || 'traffic'}
            onChange={v => updateConfig('objective', v)}
            columns={2}
          />
        </Section>
        <Section title="Details">
          <LabeledInput
            label="Landing URL"
            value={config.landing_url}
            onChange={v => updateConfig('landing_url', v)}
            placeholder="https://..."
          />
          <LabeledTextarea
            label="Target Audience"
            value={config.target_audience}
            onChange={v => updateConfig('target_audience', v)}
            placeholder="e.g. SaaS founders, 25-45, US/UK"
            rows={2}
          />
        </Section>
      </>
    );
  }

  if (nodeId === 'carousel-create') {
    const carouselStyles = (schema.style?.options || Object.keys(CAROUSEL_STYLE_DESCRIPTIONS)).map(id => ({
      id,
      label: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: CAROUSEL_STYLE_DESCRIPTIONS[id] || '',
    }));

    return (
      <>
        <Section title="Platform">
          <CardSelect
            options={[
              { id: 'instagram', label: 'Instagram', description: '1:1 square slides' },
              { id: 'linkedin', label: 'LinkedIn', description: '1:1 or 4:5 slides' },
              { id: 'tiktok', label: 'TikTok', description: '9:16 vertical slides' },
              { id: 'facebook', label: 'Facebook', description: '1:1 square slides' },
            ]}
            value={config.platform || schema.platform?.default || 'instagram'}
            onChange={v => updateConfig('platform', v)}
            columns={2}
          />
        </Section>
        <Section title="Style">
          <CardSelect
            options={carouselStyles}
            value={config.style || schema.style?.default || 'modern-clean'}
            onChange={v => updateConfig('style', v)}
            columns={2}
          />
        </Section>
      </>
    );
  }

  if (nodeId === 'prompt-builder') {
    return (
      <Section title="About This Node">
        <div className="px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <p className="text-sm text-gray-400 leading-relaxed">
            This node assembles a cohesive prompt from connected inputs (description, style, props). Connect other nodes to its input ports.
          </p>
        </div>
      </Section>
    );
  }

  // shorts-create, storyboard-create, or any other content node — use schema-based form
  if (nodeId === 'shorts-create') {
    const nicheOptions = (schema.niche?.options || Object.keys(NICHE_LABELS)).map(id => ({
      id,
      label: NICHE_LABELS[id] || id,
    }));

    return (
      <>
        <Section title="Niche">
          <div className="max-h-[360px] overflow-y-auto pr-1">
            <CardSelect
              options={nicheOptions}
              value={config.niche || schema.niche?.default || 'ai_tech_news'}
              onChange={v => updateConfig('niche', v)}
            />
          </div>
        </Section>
        <Section title="Duration">
          <PillSelect
            options={(schema.duration?.options || ['30', '45', '60', '90']).map(d => ({ id: d, label: `${d}s` }))}
            value={config.duration || schema.duration?.default || '60'}
            onChange={v => updateConfig('duration', v)}
          />
        </Section>
        {schema.video_model && (
          <Section title="Video Model">
            <CardSelect
              options={VIDEO_MODELS.filter(m => schema.video_model.options.includes(m.id))}
              value={config.video_model || schema.video_model?.default || 'kling-2.0-master'}
              onChange={v => updateConfig('video_model', v)}
            />
          </Section>
        )}
      </>
    );
  }

  // Fallback for storyboard-create and others
  return <GenericSchemaForm config={config} updateConfig={updateConfig} schema={schema} />;
}

function PublishForm({ config, updateConfig, nodeType, connections }) {
  const schema = nodeType.configSchema || {};

  // Map node type to platform
  const platformMap = {
    'youtube-upload': 'youtube',
    'tiktok-publish': 'tiktok',
    'instagram-post': 'instagram',
    'facebook-post': 'facebook',
    'linkedin-post': 'linkedin',
  };
  const platform = platformMap[nodeType.id];
  const connection = connections?.find(c => c.platform === platform);

  return (
    <>
      <Section title="Account Status">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          {connection?.connected ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-emerald-300 font-medium">Connected</p>
                {connection.account_name && (
                  <p className="text-[11px] text-gray-500 mt-0.5">{connection.account_name}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-300 font-medium">Not connected</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Connect in Settings &rarr; Connected Accounts</p>
              </div>
            </>
          )}
        </div>
      </Section>

      {nodeType.id === 'youtube-upload' && schema.privacy && (
        <Section title="Settings">
          <LabeledSelect
            label="Privacy"
            value={config.privacy || schema.privacy?.default || 'private'}
            onChange={v => updateConfig('privacy', v)}
            options={[
              { id: 'public', label: 'Public' },
              { id: 'unlisted', label: 'Unlisted' },
              { id: 'private', label: 'Private' },
            ]}
          />
        </Section>
      )}

      {nodeType.id !== 'youtube-upload' && (
        <Section title="Settings">
          <div className="px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <p className="text-sm text-gray-500 leading-relaxed">
              Configure via the node's input ports. Connect text, image, or video nodes to set the post content.
            </p>
          </div>
        </Section>
      )}
    </>
  );
}

function UtilityForm({ config, updateConfig, nodeType }) {
  const nodeId = nodeType.id;
  const schema = nodeType.configSchema || {};

  const descriptions = {
    'save-to-library': 'Saves media to your permanent library. FAL URLs expire -- always save!',
    'video-trim': 'Trim a video to a specific time range.',
    'extract-frame': 'Extract a single frame from a video.',
    'text-transform': 'Transform text with various operations.',
    'delay': 'Wait a specified number of seconds before continuing.',
    'conditional': 'Route data based on a condition check.',
  };

  return (
    <>
      {descriptions[nodeId] && (
        <Section title="About">
          <div className="px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <p className="text-sm text-gray-400 leading-relaxed">{descriptions[nodeId]}</p>
          </div>
        </Section>
      )}

      {nodeId === 'save-to-library' && Object.keys(schema).length === 0 && (
        <Section title="Configuration">
          <div className="px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <p className="text-sm text-gray-500 leading-relaxed">
              No configuration needed. Connect a URL to the input port and the file will be saved to your library.
            </p>
          </div>
        </Section>
      )}

      {nodeId === 'video-trim' && (
        <Section title="Time Range">
          <LabeledInput
            label="Start Time (seconds)"
            value={config.start_time}
            onChange={v => updateConfig('start_time', v)}
            placeholder="0"
          />
          <LabeledInput
            label="End Time (seconds)"
            value={config.end_time}
            onChange={v => updateConfig('end_time', v)}
            placeholder="10"
          />
        </Section>
      )}

      {nodeId === 'extract-frame' && schema.frame_type && (
        <Section title="Frame Type">
          <PillSelect
            options={[
              { id: 'first', label: 'First' },
              { id: 'middle', label: 'Middle' },
              { id: 'last', label: 'Last' },
            ]}
            value={config.frame_type || schema.frame_type?.default || 'first'}
            onChange={v => updateConfig('frame_type', v)}
          />
        </Section>
      )}

      {nodeId === 'text-transform' && (
        <Section title="Transform">
          <LabeledSelect
            label="Operation"
            value={config.transform || schema.transform?.default || 'trim'}
            onChange={v => updateConfig('transform', v)}
            options={(schema.transform?.options || []).map(id => ({
              id,
              label: { uppercase: 'UPPERCASE', lowercase: 'lowercase', trim: 'Trim whitespace', extract_first_line: 'Extract first line', add_prefix: 'Add prefix', add_suffix: 'Add suffix' }[id] || id,
            }))}
          />
          {(config.transform === 'add_prefix' || config.transform === 'add_suffix') && (
            <LabeledInput
              label="Value"
              value={config.value}
              onChange={v => updateConfig('value', v)}
              placeholder={config.transform === 'add_prefix' ? 'Text to prepend...' : 'Text to append...'}
            />
          )}
        </Section>
      )}

      {nodeId === 'delay' && schema.seconds && (
        <Section title="Delay">
          <PillSelect
            options={(schema.seconds?.options || []).map(s => ({ id: s, label: `${s}s` }))}
            value={config.seconds || schema.seconds?.default || '10'}
            onChange={v => updateConfig('seconds', v)}
          />
        </Section>
      )}

      {nodeId === 'conditional' && (
        <Section title="Condition">
          <LabeledSelect
            label="Check"
            value={config.condition || schema.condition?.default || 'not_empty'}
            onChange={v => updateConfig('condition', v)}
            options={[
              { id: 'not_empty', label: 'Not empty' },
              { id: 'contains', label: 'Contains' },
              { id: 'equals', label: 'Equals' },
            ]}
          />
          {(config.condition === 'contains' || config.condition === 'equals') && (
            <LabeledInput
              label="Compare Value"
              value={config.compare_value}
              onChange={v => updateConfig('compare_value', v)}
              placeholder="Value to compare against..."
            />
          )}
        </Section>
      )}
    </>
  );
}

function InputForm({ config, updateConfig, nodeType }) {
  const schema = nodeType.configSchema || {};
  const inputType = config.inputType || schema.inputType?.default || 'string';

  return (
    <>
      <Section title="Input Type">
        <CardSelect
          options={[
            { id: 'string', label: 'Text', description: 'Plain text or prompt' },
            { id: 'image', label: 'Image', description: 'Image URL' },
            { id: 'video', label: 'Video', description: 'Video URL' },
          ]}
          value={inputType}
          onChange={v => updateConfig('inputType', v)}
        />
      </Section>

      <Section title="Default Value">
        {inputType === 'string' ? (
          <LabeledTextarea
            label="Default Value"
            value={config.defaultValue}
            onChange={v => updateConfig('defaultValue', v)}
            placeholder="Enter default text..."
            rows={4}
          />
        ) : (
          <LabeledInput
            label="URL"
            value={config.defaultValue}
            onChange={v => updateConfig('defaultValue', v)}
            placeholder={`Paste ${inputType} URL`}
          />
        )}
      </Section>

      <Section title="Label">
        <LabeledInput
          label="Display Label"
          value={config.label}
          onChange={v => updateConfig('label', v)}
          placeholder="e.g. Topic, Reference Image..."
        />
      </Section>
    </>
  );
}

// Generic fallback form for any schema
function GenericSchemaForm({ config, updateConfig, schema }) {
  const TEXTAREA_KEYS = ['prompt', 'description', 'text', 'script', 'topic', 'instructions', 'style'];

  if (!schema || Object.keys(schema).length === 0) {
    return (
      <Section title="Configuration">
        <div className="px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <p className="text-sm text-gray-500 leading-relaxed">
            No configuration options for this node. Connect inputs via the canvas.
          </p>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Configuration">
      {Object.entries(schema).map(([key, fieldSchema]) => {
        const value = config[key] ?? fieldSchema.default ?? '';
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        if (fieldSchema.type === 'select' && fieldSchema.options) {
          return (
            <LabeledSelect
              key={key}
              label={label}
              value={value}
              onChange={v => updateConfig(key, v)}
              options={fieldSchema.options}
              description={fieldSchema.description}
            />
          );
        }

        if (TEXTAREA_KEYS.some(k => key.toLowerCase().includes(k))) {
          return (
            <LabeledTextarea
              key={key}
              label={label}
              value={value}
              onChange={v => updateConfig(key, v)}
              placeholder={`Enter ${label.toLowerCase()}...`}
              rows={3}
              description={fieldSchema.description}
            />
          );
        }

        return (
          <LabeledInput
            key={key}
            label={label}
            value={value}
            onChange={v => updateConfig(key, v)}
            placeholder={`Enter ${label.toLowerCase()}...`}
            description={fieldSchema.description}
          />
        );
      })}
    </Section>
  );
}


// ── Main modal component ──────────────────────────────────────────────────────

export default function NodeConfigModal({ open, onOpenChange, node, config: initialConfig, onConfigChange, brandKits, connections }) {
  const [config, setConfig] = useState(initialConfig || {});
  const nodeType = node?.data?.nodeType;

  // Sync when node changes
  useEffect(() => {
    setConfig(initialConfig || {});
  }, [initialConfig, node?.id]);

  const updateConfig = (key, value) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    onConfigChange(next);
  };

  if (!node || !nodeType) return null;

  const categoryLabel = nodeType.category.charAt(0).toUpperCase() + nodeType.category.slice(1);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-300" />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => {
            const target = e.detail?.originalEvent?.target || e.target;
            if (
              target?.closest?.('.fixed.bottom-6') ||
              target?.closest?.('[data-sonner-toast]') ||
              target?.closest?.('[role="status"]')
            ) {
              e.preventDefault();
            }
          }}
          className="fixed inset-y-0 right-0 z-50 flex flex-col w-[600px] max-w-[90vw] bg-[#0f0f17] shadow-2xl border-l border-white/10 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right duration-300 outline-none"
        >
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-xl">
                {nodeType.icon}
              </div>
              <div>
                <DialogPrimitive.Title className="text-base font-semibold text-gray-100">
                  {nodeType.label}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-gray-500 mt-0.5">
                  {categoryLabel} Configuration
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {nodeType.category === 'image' && (
              <ImageForm config={config} updateConfig={updateConfig} nodeType={nodeType} brandKits={brandKits} />
            )}
            {nodeType.category === 'video' && (
              <VideoForm config={config} updateConfig={updateConfig} nodeType={nodeType} />
            )}
            {nodeType.category === 'audio' && (
              <AudioForm config={config} updateConfig={updateConfig} nodeType={nodeType} />
            )}
            {nodeType.category === 'content' && (
              <ContentForm config={config} updateConfig={updateConfig} nodeType={nodeType} />
            )}
            {nodeType.category === 'publish' && (
              <PublishForm config={config} updateConfig={updateConfig} nodeType={nodeType} connections={connections} />
            )}
            {nodeType.category === 'utility' && (
              <UtilityForm config={config} updateConfig={updateConfig} nodeType={nodeType} />
            )}
            {nodeType.category === 'input' && (
              <InputForm config={config} updateConfig={updateConfig} nodeType={nodeType} />
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-3 border-t border-white/[0.08]">
            <button
              onClick={() => onOpenChange(false)}
              className="w-full px-4 py-2.5 bg-indigo-500/80 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
