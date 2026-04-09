import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X, Upload, CheckCircle2, Globe, Palette } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const VOICE_STYLES = ['professional', 'energetic', 'casual', 'luxury', 'playful'];

export default function OnboardingBrandKit({ onComplete, onSkip }) {
  const { user } = useAuth();
  const [brandName, setBrandName] = useState('');
  const [colors, setColors] = useState(['#2C666E', '#07393C', '#F0EDEE']);
  const [logoUrl, setLogoUrl] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('professional');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [existingBrand, setExistingBrand] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkExistingBrand();
  }, []);

  async function checkExistingBrand() {
    try {
      const res = await apiFetch('/api/brand/kit');
      const data = await res.json();
      if (data.brands?.length > 0) {
        setExistingBrand(data.brands[0]);
        // Pre-populate form with existing brand
        const b = data.brands[0];
        setBrandName(b.brand_name || '');
        setColors(b.colors?.length > 0 ? b.colors : ['#2C666E', '#07393C', '#F0EDEE']);
        setLogoUrl(b.logo_url || '');
        setVoiceStyle(b.voice_style || 'professional');
        setWebsite(b.website || '');
      }
    } catch {
      // No existing brand — start fresh
    } finally {
      setChecking(false);
    }
  }

  function addColor() {
    if (colors.length < 8) setColors([...colors, '#000000']);
  }

  function removeColor(idx) {
    setColors(colors.filter((_, i) => i !== idx));
  }

  function updateColor(idx, value) {
    const next = [...colors];
    next[idx] = value;
    setColors(next);
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `media/logos/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
      setLogoUrl(publicUrl);
    } catch (err) {
      console.error('[OnboardingBrandKit] Logo upload error:', err);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!brandName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        brand_name: brandName.trim(),
        colors: colors.filter(c => c),
        logo_url: logoUrl || null,
        voice_style: voiceStyle,
        website: website.trim() || null,
      };
      // Update existing brand or create new
      if (existingBrand?.id) payload.id = existingBrand.id;

      await apiFetch('/api/brand/kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Mark brand kit created in onboarding status
      await apiFetch('/api/onboarding/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_kit_created: true }),
      });

      onComplete();
    } catch (err) {
      console.error('[OnboardingBrandKit] Save error:', err);
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
      </div>
    );
  }

  // If brand already exists, show summary with option to proceed
  if (existingBrand && !brandName) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Brand kit already set up</p>
            <p className="text-xs text-green-600 mt-1">
              <strong>{existingBrand.brand_name}</strong> is configured with {existingBrand.colors?.length || 0} colors.
            </p>
          </div>
        </div>
        <Button onClick={onComplete} className="w-full h-11 bg-[#2C666E] hover:bg-[#07393C] text-white">
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Brand Name */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Brand Name <span className="text-red-500">*</span></Label>
        <Input
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder="e.g. Assureful"
          className="h-10"
        />
      </div>

      {/* Colors */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" /> Brand Colors
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          {colors.map((color, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
              <input
                type="color"
                value={color}
                onChange={(e) => updateColor(i, e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => updateColor(i, e.target.value)}
                className="w-[72px] text-xs font-mono bg-transparent border-0 outline-none"
              />
              {colors.length > 1 && (
                <button onClick={() => removeColor(i)} className="text-gray-400 hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {colors.length < 8 && (
            <button
              onClick={addColor}
              className="w-9 h-9 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Logo Upload */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Logo</Label>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="relative">
              <img src={logoUrl} alt="Logo" className="w-14 h-14 rounded-lg object-contain border border-gray-200 bg-white" />
              <button
                onClick={() => setLogoUrl('')}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading...' : 'Upload logo'}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Voice Style */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Voice Style</Label>
        <Select value={voiceStyle} onValueChange={setVoiceStyle}>
          <SelectTrigger className="h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICE_STYLES.map(style => (
              <SelectItem key={style} value={style}>
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">Sets the tone for AI-generated scripts and copy</p>
      </div>

      {/* Website */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" /> Website <span className="text-xs text-gray-400 font-normal">(optional)</span>
        </Label>
        <Input
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://www.assureful.com"
          className="h-10"
        />
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={!brandName.trim() || saving}
        className="w-full h-11 bg-[#2C666E] hover:bg-[#07393C] text-white text-base"
      >
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Brand Kit'}
      </Button>

      <p className="text-xs text-center text-gray-400">
        You can add more details later in the full Brand Kit editor
      </p>
    </div>
  );
}
