import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Save, User, AtSign, ChevronDown, ChevronUp, Link2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

function Section({ title, children, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
      >
        <span className="flex items-center gap-2">
          {title}
          {badge}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function AvatarCard({ avatar, onDelete }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
      {avatar.reference_image_url ? (
        <img src={avatar.reference_image_url} alt={avatar.name}
          className="w-12 h-12 rounded-full object-cover border border-slate-300 flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-slate-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{avatar.name}</p>
        {avatar.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{avatar.description}</p>}
        {avatar.lora_trigger_word && (
          <p className="text-xs text-[#2C666E] mt-0.5">Trigger: <code className="bg-slate-200 px-1 rounded">{avatar.lora_trigger_word}</code></p>
        )}
        {avatar.lora_url ? (
          <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">LoRA trained</span>
        ) : (
          <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">No LoRA yet</span>
        )}
      </div>
      <button type="button" onClick={() => onDelete(avatar.id)} className="text-red-400 hover:text-red-600 flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function GuidelinePreview({ label, value }) {
  if (!value) return null;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text.trim()) return null;
  return (
    <div>
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <p className="text-xs text-slate-700 mt-0.5 line-clamp-3">{text}</p>
    </div>
  );
}

export default function BrandKitModal({ isOpen, onClose }) {
  const { user } = useAuth();

  // SEWO connection state
  const [sewoBrands, setSewoBrands] = useState([]);
  const [selectedSewoBrand, setSelectedSewoBrand] = useState('');
  const [sewoGuidelines, setSewoGuidelines] = useState(null);
  const [sewoImageStyle, setSewoImageStyle] = useState(null);
  const [sewoCompany, setSewoCompany] = useState(null);
  const [isLoadingSewo, setIsLoadingSewo] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Brand kit state
  const [brandName, setBrandName] = useState('');
  const [brandUsername, setBrandUsername] = useState('');
  const [colors, setColors] = useState([]);
  const [newColor, setNewColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('professional');
  const [taglines, setTaglines] = useState([]);
  const [newTagline, setNewTagline] = useState('');
  const [stylePreset, setStylePreset] = useState('modern');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Avatar state
  const [avatars, setAvatars] = useState([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [showNewAvatar, setShowNewAvatar] = useState(false);
  const [newAvatar, setNewAvatar] = useState({ name: '', description: '', reference_image_url: '', lora_url: '', lora_trigger_word: '' });
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadBrandKit();
      loadAvatars();
      loadSewoBrands();
    }
  }, [isOpen, user]);

  const loadSewoBrands = async () => {
    try {
      const res = await apiFetch('/api/brand/usernames');
      const data = await res.json();
      if (data.usernames) {
        // usernames can be array of strings or objects { username, brand_name }
        const list = data.usernames.map(u => typeof u === 'string' ? { username: u, brand_name: u } : u);
        setSewoBrands(list);
      }
    } catch (err) {
      console.error('Failed to load SEWO brands:', err);
    }
  };

  const handleSewoBrandSelect = async (username) => {
    setSelectedSewoBrand(username);
    if (!username) {
      setSewoGuidelines(null);
      setSewoImageStyle(null);
      setSewoCompany(null);
      setIsConnected(false);
      return;
    }

    setIsLoadingSewo(true);
    try {
      const res = await apiFetch(`/api/brand/guidelines?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSewoCompany(data.company);
      setSewoGuidelines(data.guidelines);
      setSewoImageStyle(data.image_style);

      // Auto-populate brand kit fields from SEWO data
      const co = data.company || {};
      const gl = data.guidelines || {};
      const is = data.image_style || {};

      setBrandUsername(username);
      setBrandName(co.brand_name || co.client_namespace || username);
      if (co.logo_url || gl.logo_url) setLogoUrl(co.logo_url || gl.logo_url);

      // Map voice_and_tone to closest voice_style enum
      if (gl.voice_and_tone) {
        const tone = gl.voice_and_tone.toLowerCase();
        if (tone.includes('energetic') || tone.includes('exciting') || tone.includes('bold')) setVoiceStyle('energetic');
        else if (tone.includes('casual') || tone.includes('friendly') || tone.includes('conversational')) setVoiceStyle('casual');
        else if (tone.includes('luxury') || tone.includes('premium') || tone.includes('elegant')) setVoiceStyle('luxury');
        else if (tone.includes('playful') || tone.includes('fun') || tone.includes('witty')) setVoiceStyle('playful');
        else setVoiceStyle('professional');
      }

      // Map visual_style to closest style_preset
      if (is.visual_style) {
        const vs = is.visual_style.toLowerCase();
        if (vs.includes('minimal') || vs.includes('clean')) setStylePreset('minimal');
        else if (vs.includes('bold') || vs.includes('vibrant') || vs.includes('graphic')) setStylePreset('bold');
        else if (vs.includes('luxury') || vs.includes('premium') || vs.includes('elegant')) setStylePreset('luxury');
        else if (vs.includes('playful') || vs.includes('colorful') || vs.includes('fun')) setStylePreset('playful');
        else if (vs.includes('corporate') || vs.includes('formal')) setStylePreset('corporate');
        else setStylePreset('modern');
      }

      // Extract hex colors from color_palette text
      if (is.color_palette) {
        const hexMatches = is.color_palette.match(/#[0-9A-Fa-f]{3,8}/g);
        if (hexMatches?.length) setColors(hexMatches);
      } else if (co.primary_color) {
        setColors([co.primary_color]);
      }

      setIsConnected(true);
      toast.success(`Connected to ${co.brand_name || username}`);
    } catch (err) {
      toast.error(err.message || 'Failed to load brand guidelines');
    } finally {
      setIsLoadingSewo(false);
    }
  };

  const loadBrandKit = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/brand/kit', { method: 'GET' });
      const data = await response.json();
      if (data.brandKit) {
        setBrandName(data.brandKit.brand_name || '');
        setBrandUsername(data.brandKit.brand_username || '');
        setColors(data.brandKit.colors || []);
        setLogoUrl(data.brandKit.logo_url || '');
        setVoiceStyle(data.brandKit.voice_style || 'professional');
        setTaglines(data.brandKit.taglines || []);
        setStylePreset(data.brandKit.style_preset || 'modern');

        // If already connected to a SEWO brand, mark it
        if (data.brandKit.brand_username) {
          setSelectedSewoBrand(data.brandKit.brand_username);
        }
      }
    } catch (error) {
      console.error('Failed to load brand kit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvatars = async () => {
    setIsLoadingAvatars(true);
    try {
      const res = await apiFetch('/api/brand/avatars', { method: 'GET' });
      const data = await res.json();
      if (data.success) setAvatars(data.avatars || []);
    } catch (err) {
      console.error('Failed to load avatars:', err);
    } finally {
      setIsLoadingAvatars(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/brand/kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: brandName.trim() || null,
          brand_username: brandUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || null,
          colors,
          logo_url: logoUrl.trim() || null,
          voice_style: voiceStyle,
          taglines,
          style_preset: stylePreset,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Brand kit saved!');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save brand kit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!newAvatar.name.trim()) { toast.error('Give your avatar a name'); return; }
    setIsSavingAvatar(true);
    try {
      const res = await apiFetch('/api/brand/avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_username: brandUsername.trim() || 'default',
          name: newAvatar.name.trim(),
          description: newAvatar.description.trim(),
          reference_image_url: newAvatar.reference_image_url.trim() || null,
          lora_url: newAvatar.lora_url.trim() || null,
          lora_trigger_word: newAvatar.lora_trigger_word.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Avatar saved');
      setNewAvatar({ name: '', description: '', reference_image_url: '', lora_url: '', lora_trigger_word: '' });
      setShowNewAvatar(false);
      loadAvatars();
    } catch (err) {
      toast.error(err.message || 'Failed to save avatar');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleDeleteAvatar = async (id) => {
    if (!confirm('Delete this avatar?')) return;
    try {
      const res = await apiFetch(`/api/brand/avatars/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Avatar deleted');
      loadAvatars();
    } catch (err) {
      toast.error(err.message || 'Failed to delete avatar');
    }
  };

  const hasGuidelines = sewoGuidelines && (sewoGuidelines.voice_and_tone || sewoGuidelines.target_market || sewoGuidelines.brand_personality);
  const hasImageStyle = sewoImageStyle && (sewoImageStyle.visual_style || sewoImageStyle.ai_prompt_instructions);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-lg font-bold">Brand Kit</DialogTitle>
        <DialogDescription className="text-slate-500">
          Connect to a SEWO brand or set up your brand identity manually.
        </DialogDescription>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
          </div>
        ) : (
          <div className="space-y-4 mt-2">

            {/* Connect to SEWO */}
            <Section
              title={<span className="flex items-center gap-2"><Link2 className="w-4 h-4 text-[#2C666E]" /> Connect to SEWO</span>}
              defaultOpen
              badge={isConnected ? <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Connected</span> : null}
            >
              <div>
                <Label className="text-sm text-slate-700">Select a brand from your SEWO account</Label>
                <p className="text-xs text-slate-500 mb-2">
                  Pulls brand voice, target market, image style and colors from Doubleclicker automatically.
                </p>
                <div className="flex gap-2">
                  <select
                    value={selectedSewoBrand}
                    onChange={e => handleSewoBrandSelect(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    disabled={isLoadingSewo}
                  >
                    <option value="">-- Select a brand --</option>
                    {sewoBrands.map(b => (
                      <option key={b.username} value={b.username}>
                        {b.brand_name || b.username}
                      </option>
                    ))}
                  </select>
                  {isLoadingSewo && <Loader2 className="w-5 h-5 animate-spin text-[#2C666E] self-center" />}
                </div>
              </div>

              {/* Show SEWO guidelines preview when connected */}
              {isConnected && (hasGuidelines || hasImageStyle) && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-2">
                  <p className="text-[10px] font-bold text-[#2C666E] uppercase tracking-wider">Imported from SEWO</p>
                  {sewoGuidelines && (
                    <>
                      <GuidelinePreview label="Voice & Tone" value={sewoGuidelines.voice_and_tone} />
                      <GuidelinePreview label="Target Market" value={sewoGuidelines.target_market} />
                      <GuidelinePreview label="Brand Personality" value={sewoGuidelines.brand_personality} />
                      <GuidelinePreview label="Content Style" value={sewoGuidelines.content_style_rules} />
                      <GuidelinePreview label="Preferred Elements" value={sewoGuidelines.preferred_elements} />
                      <GuidelinePreview label="Prohibited Elements" value={sewoGuidelines.prohibited_elements} />
                    </>
                  )}
                  {sewoImageStyle && (
                    <>
                      <GuidelinePreview label="Visual Style" value={sewoImageStyle.visual_style} />
                      <GuidelinePreview label="Color Palette" value={sewoImageStyle.color_palette} />
                      <GuidelinePreview label="Mood & Atmosphere" value={sewoImageStyle.mood_and_atmosphere} />
                      <GuidelinePreview label="Lighting" value={sewoImageStyle.lighting_preferences} />
                      <GuidelinePreview label="Composition" value={sewoImageStyle.composition_style} />
                      <GuidelinePreview label="AI Prompt Instructions" value={sewoImageStyle.ai_prompt_instructions} />
                    </>
                  )}
                </div>
              )}

              {isConnected && !hasGuidelines && !hasImageStyle && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  Brand found but no guidelines or image style set yet. Set them up in Doubleclicker and they'll sync here automatically.
                </p>
              )}
            </Section>

            {/* Identity */}
            <Section title="Identity" defaultOpen={!isConnected}>
              <div>
                <Label className="text-sm font-medium mb-2 block">Brand Name</Label>
                <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g., Acme Corp" />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 flex items-center gap-1.5 block">
                  <AtSign className="w-3.5 h-3.5 text-slate-500" /> Brand Username
                </Label>
                <p className="text-xs text-slate-500 mb-2">
                  Shared identifier across SEWO, Doubleclicker and Stitch. Lowercase, no spaces.
                </p>
                <Input
                  value={brandUsername}
                  onChange={e => setBrandUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g., acmecorp"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Logo URL</Label>
                <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
              </div>
            </Section>

            {/* Visual */}
            <Section title="Visual Style" defaultOpen={false}>
              <div>
                <Label className="text-sm font-medium mb-2 block">Brand Colors</Label>
                <div className="space-y-2">
                  {colors.map((color, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded border flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm text-slate-600 flex-1">{color}</span>
                      <button type="button" onClick={() => setColors(colors.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input type="text" value={newColor} onChange={e => setNewColor(e.target.value)}
                    placeholder="#000000" className="flex-1"
                    onKeyDown={e => { if (e.key === 'Enter' && newColor.trim()) { setColors([...colors, newColor.trim()]); setNewColor(''); } }} />
                  <Button size="sm" onClick={() => { if (newColor.trim()) { setColors([...colors, newColor.trim()]); setNewColor(''); } }}
                    className="bg-[#2C666E] hover:bg-[#07393C]">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Style Preset</Label>
                <Select value={stylePreset} onValueChange={setStylePreset}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['modern', 'minimal', 'bold', 'luxury', 'playful', 'corporate'].map(v => (
                      <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Section>

            {/* Voice */}
            <Section title="Voice & Messaging" defaultOpen={false}>
              <div>
                <Label className="text-sm font-medium mb-2 block">Voice Style</Label>
                <Select value={voiceStyle} onValueChange={setVoiceStyle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['professional', 'energetic', 'casual', 'luxury', 'playful'].map(v => (
                      <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Taglines</Label>
                <div className="space-y-2">
                  {taglines.map((tagline, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 flex-1">{tagline}</span>
                      <button type="button" onClick={() => setTaglines(taglines.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input value={newTagline} onChange={e => setNewTagline(e.target.value)}
                    placeholder="e.g., Innovation at scale" className="flex-1"
                    onKeyDown={e => { if (e.key === 'Enter' && newTagline.trim()) { setTaglines([...taglines, newTagline.trim()]); setNewTagline(''); } }} />
                  <Button size="sm" onClick={() => { if (newTagline.trim()) { setTaglines([...taglines, newTagline.trim()]); setNewTagline(''); } }}
                    className="bg-[#2C666E] hover:bg-[#07393C]">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Section>

            {/* Avatars */}
            <Section title="Brand Avatars" defaultOpen={false}>
              <p className="text-xs text-slate-500">
                Avatars are characters or personas used in your video ads. Add a reference image and optional LoRA weights for consistent character generation.
              </p>

              {isLoadingAvatars ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : (
                <div className="space-y-2">
                  {avatars.map(a => <AvatarCard key={a.id} avatar={a} onDelete={handleDeleteAvatar} />)}
                  {avatars.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No avatars yet</p>}
                </div>
              )}

              {!showNewAvatar ? (
                <Button size="sm" variant="outline" onClick={() => setShowNewAvatar(true)} className="w-full border-dashed">
                  <Plus className="w-4 h-4 mr-2" /> Add Avatar
                </Button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">New Avatar</p>
                  <div>
                    <Label className="text-xs mb-1 block">Name <span className="text-red-500">*</span></Label>
                    <Input value={newAvatar.name} onChange={e => setNewAvatar(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Sarah (presenter)" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Description</Label>
                    <Input value={newAvatar.description} onChange={e => setNewAvatar(p => ({ ...p, description: e.target.value }))}
                      placeholder="e.g., Young woman, 30s, professional, dark hair" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">Reference Image URL</Label>
                    <Input value={newAvatar.reference_image_url} onChange={e => setNewAvatar(p => ({ ...p, reference_image_url: e.target.value }))}
                      placeholder="https://... (JPEG/PNG of the character)" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">LoRA Weights URL <span className="text-slate-400">(optional)</span></Label>
                    <Input value={newAvatar.lora_url} onChange={e => setNewAvatar(p => ({ ...p, lora_url: e.target.value }))}
                      placeholder="https://... (trained LoRA .safetensors)" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">LoRA Trigger Word <span className="text-slate-400">(optional)</span></Label>
                    <Input value={newAvatar.lora_trigger_word} onChange={e => setNewAvatar(p => ({ ...p, lora_trigger_word: e.target.value }))}
                      placeholder="e.g., sks woman" className="h-8 text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveAvatar} disabled={isSavingAvatar} className="bg-[#2C666E] hover:bg-[#07393C] text-white flex-1">
                      {isSavingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                      Save Avatar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewAvatar(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </Section>

            {/* Save */}
            <Button onClick={handleSave} disabled={isSaving} className="w-full h-11 bg-[#2C666E] hover:bg-[#37AEAE] text-white">
              {isSaving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                : <><Save className="w-4 h-4 mr-2" /> Save Brand Kit</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
