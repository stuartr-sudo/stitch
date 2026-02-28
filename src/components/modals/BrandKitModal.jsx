import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Plus, Trash2, Save, User, AtSign, Link2, CheckCircle2,
  FileText, Upload, Palette, MessageSquare, Eye, Shield, Globe, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import LoRAPicker from '@/components/LoRAPicker';

const VOICE_STYLES = ['professional', 'energetic', 'casual', 'luxury', 'playful'];
const STYLE_PRESETS = ['modern', 'minimal', 'bold', 'luxury', 'playful', 'corporate'];

function FieldGroup({ label, description, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      {children}
    </div>
  );
}

function AvatarCard({ avatar, onDelete, onTrain }) {
  const isTraining = avatar.training_status === 'training';
  const isFailed = avatar.training_status === 'failed';
  const canTrain = !avatar.lora_url && !isTraining && avatar.reference_image_url;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
      {avatar.reference_image_url ? (
        <img src={avatar.reference_image_url} alt={avatar.name}
          className="w-12 h-12 rounded-full object-cover border border-gray-300 flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{avatar.name}</p>
        {avatar.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{avatar.description}</p>}
        {avatar.lora_trigger_word && (
          <p className="text-xs text-[#2C666E] mt-0.5">Trigger: <code className="bg-gray-200 px-1 rounded">{avatar.lora_trigger_word}</code></p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {avatar.lora_url ? (
            <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">LoRA trained</span>
          ) : isTraining ? (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" /> Training...
            </span>
          ) : isFailed ? (
            <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Training failed</span>
          ) : (
            <span className="inline-block text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">No LoRA yet</span>
          )}
          {(canTrain || isFailed) && (
            <button
              type="button"
              onClick={() => onTrain(avatar)}
              className="inline-flex items-center gap-1 text-xs text-[#2C666E] hover:text-[#07393C] font-medium"
            >
              <Sparkles className="w-3 h-3" /> Train LoRA
            </button>
          )}
        </div>
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
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      <p className="text-xs text-gray-700 mt-0.5 line-clamp-3">{text}</p>
    </div>
  );
}

const emptyBrand = () => ({
  id: null,
  brand_name: '',
  brand_username: '',
  colors: [],
  logo_url: '',
  voice_style: 'professional',
  taglines: [],
  style_preset: 'modern',
  target_market: '',
  brand_personality: '',
  brand_voice_detail: '',
  content_style_rules: '',
  preferred_elements: '',
  prohibited_elements: '',
  visual_style_notes: '',
  mood_atmosphere: '',
  lighting_prefs: '',
  composition_style: '',
  ai_prompt_rules: '',
  blurb: '',
  website: '',
  default_loras: [],
});

export default function BrandKitModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const pdfInputRef = useRef(null);

  // Brand list
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);

  // Current brand being edited
  const [form, setForm] = useState(emptyBrand());
  const [newColor, setNewColor] = useState('');
  const [newTagline, setNewTagline] = useState('');

  // SEWO connection
  const [sewoBrands, setSewoBrands] = useState([]);
  const [selectedSewoBrand, setSelectedSewoBrand] = useState('');
  const [sewoGuidelines, setSewoGuidelines] = useState(null);
  const [sewoImageStyle, setSewoImageStyle] = useState(null);
  const [sewoCompany, setSewoCompany] = useState(null);
  const [isLoadingSewo, setIsLoadingSewo] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // PDF extraction
  const [isExtracting, setIsExtracting] = useState(false);

  // Save / delete
  const [isSaving, setIsSaving] = useState(false);

  // Avatars
  const [avatars, setAvatars] = useState([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [showNewAvatar, setShowNewAvatar] = useState(false);
  const [newAvatar, setNewAvatar] = useState({ name: '', description: '', reference_image_url: '', lora_url: '', lora_trigger_word: '' });
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('identity');

  useEffect(() => {
    if (isOpen && user) {
      loadBrands();
      loadAvatars();
      loadSewoBrands();
    }
  }, [isOpen, user]);

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  // ── Load brands ──────────────────────────────────────────────────────────────
  const loadBrands = async () => {
    setIsLoadingBrands(true);
    try {
      const res = await apiFetch('/api/brand/kit', { method: 'GET' });
      const data = await res.json();
      const list = data.brands || (data.brandKit ? [data.brandKit] : []);
      setBrands(list);
      if (list.length > 0 && !selectedBrandId) {
        selectBrand(list[0]);
      } else if (list.length === 0) {
        setForm(emptyBrand());
        setSelectedBrandId(null);
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const selectBrand = (brand) => {
    setSelectedBrandId(brand.id);
    setForm({
      id: brand.id,
      brand_name: brand.brand_name || '',
      brand_username: brand.brand_username || '',
      colors: brand.colors || [],
      logo_url: brand.logo_url || '',
      voice_style: brand.voice_style || 'professional',
      taglines: brand.taglines || [],
      style_preset: brand.style_preset || 'modern',
      target_market: brand.target_market || '',
      brand_personality: brand.brand_personality || '',
      brand_voice_detail: brand.brand_voice_detail || '',
      content_style_rules: brand.content_style_rules || '',
      preferred_elements: brand.preferred_elements || '',
      prohibited_elements: brand.prohibited_elements || '',
      visual_style_notes: brand.visual_style_notes || '',
      mood_atmosphere: brand.mood_atmosphere || '',
      lighting_prefs: brand.lighting_prefs || '',
      composition_style: brand.composition_style || '',
      ai_prompt_rules: brand.ai_prompt_rules || '',
      blurb: brand.blurb || '',
      website: brand.website || '',
      default_loras: brand.default_loras || [],
    });
    setSelectedSewoBrand(brand.brand_username || '');
    setIsConnected(false);
    setSewoGuidelines(null);
    setSewoImageStyle(null);
    setSewoCompany(null);
  };

  const handleNewBrand = () => {
    setSelectedBrandId(null);
    setForm(emptyBrand());
    setNewColor('');
    setNewTagline('');
    setSelectedSewoBrand('');
    setIsConnected(false);
    setActiveTab('identity');
  };

  // ── SEWO ─────────────────────────────────────────────────────────────────────
  const loadSewoBrands = async () => {
    try {
      const res = await apiFetch('/api/brand/usernames');
      const data = await res.json();
      if (data.usernames) {
        setSewoBrands(data.usernames.map(u => typeof u === 'string' ? { username: u, brand_name: u } : u));
      }
    } catch (err) {
      console.error('Failed to load SEWO brands:', err);
    }
  };

  const handleSewoBrandSelect = async (username) => {
    setSelectedSewoBrand(username);
    if (!username) {
      setSewoGuidelines(null); setSewoImageStyle(null); setSewoCompany(null); setIsConnected(false);
      return;
    }
    setIsLoadingSewo(true);
    try {
      const res = await apiFetch(`/api/brand/guidelines?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSewoCompany(data.company); setSewoGuidelines(data.guidelines); setSewoImageStyle(data.image_style);

      const co = data.company || {};
      const gl = data.guidelines || {};
      const is = data.image_style || {};

      setField('brand_username', username);
      setField('brand_name', co.brand_name || co.client_namespace || username);
      if (co.logo_url || gl.logo_url) setField('logo_url', co.logo_url || gl.logo_url);
      if (co.client_website) setField('website', co.client_website);
      if (co.blurb) setField('blurb', co.blurb);

      // Map voice
      if (gl.voice_and_tone) {
        const tone = gl.voice_and_tone.toLowerCase();
        if (tone.includes('energetic') || tone.includes('exciting') || tone.includes('bold')) setField('voice_style', 'energetic');
        else if (tone.includes('casual') || tone.includes('friendly') || tone.includes('conversational')) setField('voice_style', 'casual');
        else if (tone.includes('luxury') || tone.includes('premium') || tone.includes('elegant')) setField('voice_style', 'luxury');
        else if (tone.includes('playful') || tone.includes('fun') || tone.includes('witty')) setField('voice_style', 'playful');
        else setField('voice_style', 'professional');
        setField('brand_voice_detail', gl.voice_and_tone);
      }
      if (gl.target_market) setField('target_market', gl.target_market);
      if (gl.brand_personality) setField('brand_personality', gl.brand_personality);
      if (gl.content_style_rules) setField('content_style_rules', gl.content_style_rules);
      if (gl.preferred_elements) setField('preferred_elements', gl.preferred_elements);
      if (gl.prohibited_elements) setField('prohibited_elements', gl.prohibited_elements);

      // Map visual style
      if (is.visual_style) {
        const vs = is.visual_style.toLowerCase();
        if (vs.includes('minimal') || vs.includes('clean')) setField('style_preset', 'minimal');
        else if (vs.includes('bold') || vs.includes('vibrant')) setField('style_preset', 'bold');
        else if (vs.includes('luxury') || vs.includes('premium')) setField('style_preset', 'luxury');
        else if (vs.includes('playful') || vs.includes('colorful')) setField('style_preset', 'playful');
        else if (vs.includes('corporate') || vs.includes('formal')) setField('style_preset', 'corporate');
        else setField('style_preset', 'modern');
        setField('visual_style_notes', is.visual_style);
      }
      if (is.mood_and_atmosphere) setField('mood_atmosphere', is.mood_and_atmosphere);
      if (is.lighting_preferences) setField('lighting_prefs', is.lighting_preferences);
      if (is.composition_style) setField('composition_style', is.composition_style);
      if (is.ai_prompt_instructions) setField('ai_prompt_rules', is.ai_prompt_instructions);
      if (is.color_palette) {
        const hexMatches = is.color_palette.match(/#[0-9A-Fa-f]{3,8}/g);
        if (hexMatches?.length) setField('colors', hexMatches);
      } else if (co.primary_color) {
        setField('colors', [co.primary_color]);
      }

      setIsConnected(true);
      toast.success(`Connected to ${co.brand_name || username}`);
    } catch (err) {
      toast.error(err.message || 'Failed to load brand guidelines');
    } finally {
      setIsLoadingSewo(false);
    }
  };

  // ── PDF extraction ───────────────────────────────────────────────────────────
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please upload a PDF file'); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error('PDF must be under 20 MB'); return; }

    setIsExtracting(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await apiFetch('/api/brand/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_base64: base64 }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const ex = data.extracted;
      // Apply all extracted fields to form
      setForm(prev => ({
        ...prev,
        brand_name: ex.brand_name || prev.brand_name,
        brand_username: ex.brand_username || prev.brand_username,
        blurb: ex.blurb || prev.blurb,
        website: ex.website || prev.website,
        target_market: ex.target_market || prev.target_market,
        brand_personality: ex.brand_personality || prev.brand_personality,
        brand_voice_detail: ex.brand_voice_detail || prev.brand_voice_detail,
        voice_style: ex.voice_style || prev.voice_style,
        content_style_rules: ex.content_style_rules || prev.content_style_rules,
        preferred_elements: ex.preferred_elements || prev.preferred_elements,
        prohibited_elements: ex.prohibited_elements || prev.prohibited_elements,
        taglines: ex.taglines?.length ? ex.taglines : prev.taglines,
        colors: ex.colors?.length ? ex.colors : prev.colors,
        style_preset: ex.style_preset || prev.style_preset,
        visual_style_notes: ex.visual_style_notes || prev.visual_style_notes,
        mood_atmosphere: ex.mood_atmosphere || prev.mood_atmosphere,
        lighting_prefs: ex.lighting_prefs || prev.lighting_prefs,
        composition_style: ex.composition_style || prev.composition_style,
        ai_prompt_rules: ex.ai_prompt_rules || prev.ai_prompt_rules,
        logo_url: ex.logo_url || prev.logo_url,
      }));

      toast.success(`Extracted brand guidelines from "${file.name}" — review and save`);
    } catch (err) {
      toast.error(err.message || 'Failed to extract from PDF');
    } finally {
      setIsExtracting(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.brand_name.trim()) { toast.error('Give your brand a name'); return; }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        brand_username: form.brand_username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || null,
        brand_name: form.brand_name.trim(),
      };
      if (selectedBrandId) payload.id = selectedBrandId;

      const res = await apiFetch('/api/brand/kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(selectedBrandId ? 'Brand updated' : 'Brand created');
      const savedId = data.brandKit?.id;
      if (savedId) setSelectedBrandId(savedId);
      loadBrands();
    } catch (err) {
      toast.error(err.message || 'Failed to save brand');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand? This cannot be undone.')) return;
    try {
      const res = await apiFetch(`/api/brand/kit?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Brand deleted');
      if (selectedBrandId === id) handleNewBrand();
      loadBrands();
    } catch (err) {
      toast.error(err.message || 'Failed to delete brand');
    }
  };

  // ── Avatars ──────────────────────────────────────────────────────────────────
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

  const handleSaveAvatar = async () => {
    if (!newAvatar.name.trim()) { toast.error('Give your avatar a name'); return; }
    setIsSavingAvatar(true);
    try {
      const res = await apiFetch('/api/brand/avatars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_username: form.brand_username.trim() || 'default',
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

  const handleTrainAvatar = async (avatar) => {
    const triggerWord = prompt('Enter a trigger word for this LoRA:', avatar.name.toLowerCase().replace(/\s+/g, '_'));
    if (!triggerWord) return;

    const trainingType = avatar.description?.toLowerCase().includes('person') || avatar.description?.toLowerCase().includes('face')
      ? 'character'
      : 'product';

    try {
      const res = await apiFetch(`/api/brand/avatars/${avatar.id}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger_word: triggerWord, training_type: trainingType }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(`LoRA training started for "${avatar.name}". This may take 10-20 minutes.`);
      loadAvatars();
    } catch (err) {
      toast.error(err.message || 'Failed to start training');
    }
  };

  // Filter avatars for the selected brand
  const brandAvatars = avatars.filter(a => !form.brand_username || a.brand_username === form.brand_username);
  const hasGuidelines = sewoGuidelines && (sewoGuidelines.voice_and_tone || sewoGuidelines.target_market || sewoGuidelines.brand_personality);
  const hasImageStyle = sewoImageStyle && (sewoImageStyle.visual_style || sewoImageStyle.ai_prompt_instructions);

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="Brand Guidelines"
      subtitle="Create and manage your brand identities"
      icon={<Shield className="w-5 h-5" />}
    >
      <div className="flex h-full overflow-hidden">
        {/* ── Left sidebar: brand list ── */}
        <div className="w-56 border-r border-gray-200 flex flex-col flex-shrink-0 bg-gray-50/50">
          <div className="p-3 border-b border-gray-200">
            <Button onClick={handleNewBrand} size="sm" className="w-full bg-[#2C666E] hover:bg-[#07393C] text-white text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New Brand
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingBrands ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : brands.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No brands yet</p>
            ) : brands.map(b => (
              <div
                key={b.id}
                className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectedBrandId === b.id
                    ? 'bg-[#2C666E]/10 border border-[#2C666E]'
                    : 'hover:bg-gray-100 border border-transparent'
                }`}
                onClick={() => selectBrand(b)}
              >
                {b.logo_url ? (
                  <img src={b.logo_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-gray-200" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#2C666E]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#2C666E]">{(b.brand_name || 'B')[0].toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{b.brand_name || 'Untitled'}</div>
                  {b.brand_username && <div className="text-xs text-gray-500 truncate">@{b.brand_username}</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); handleDelete(b.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: editor ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          {/* PDF upload bar */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/80 flex items-center gap-3">
            <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" onChange={handlePdfUpload} className="hidden" />
            <Button
              size="sm"
              variant="outline"
              onClick={() => pdfInputRef.current?.click()}
              disabled={isExtracting}
              className="border-[#2C666E]/40 text-[#2C666E] hover:bg-[#2C666E]/10"
            >
              {isExtracting
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Extracting...</>
                : <><Upload className="w-3.5 h-3.5 mr-1.5" /> Upload PDF Guidelines</>}
            </Button>
            <span className="text-xs text-gray-500">Upload a brand guidelines PDF to auto-fill all fields</span>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 pt-3">
              <TabsList className="grid w-full grid-cols-5 bg-gray-100">
                <TabsTrigger value="identity" className="text-xs data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">Identity</TabsTrigger>
                <TabsTrigger value="voice" className="text-xs data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">Voice</TabsTrigger>
                <TabsTrigger value="visual" className="text-xs data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">Visual</TabsTrigger>
                <TabsTrigger value="avatars" className="text-xs data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">Avatars</TabsTrigger>
                <TabsTrigger value="connect" className="text-xs data-[state=active]:bg-[#2C666E] data-[state=active]:text-white">SEWO</TabsTrigger>
              </TabsList>
            </div>

            <SlideOverBody className="flex-1">
              {/* ── Tab: Identity ── */}
              <TabsContent value="identity" className="space-y-5 p-4">
                <FieldGroup label="Brand Name" description="The official name of this brand">
                  <Input value={form.brand_name} onChange={e => setField('brand_name', e.target.value)}
                    placeholder="e.g., Acme Corporation" className="bg-white border-gray-300 text-gray-900" />
                </FieldGroup>

                <FieldGroup label="Brand Username" description="Shared identifier across SEWO, Doubleclicker, and Stitch. Lowercase, no spaces.">
                  <div className="flex items-center gap-2">
                    <AtSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <Input
                      value={form.brand_username}
                      onChange={e => setField('brand_username', e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="e.g., acmecorp" className="bg-white border-gray-300 text-gray-900" />
                  </div>
                </FieldGroup>

                <FieldGroup label="Brand Description" description="A short elevator pitch for this brand">
                  <Textarea value={form.blurb} onChange={e => setField('blurb', e.target.value)}
                    placeholder="What does this brand do? Who is it for?"
                    className="bg-white border-gray-300 text-gray-900 h-20 resize-none" />
                </FieldGroup>

                <FieldGroup label="Website">
                  <Input value={form.website} onChange={e => setField('website', e.target.value)}
                    placeholder="https://example.com" className="bg-white border-gray-300 text-gray-900" />
                </FieldGroup>

                <FieldGroup label="Logo URL">
                  <Input value={form.logo_url} onChange={e => setField('logo_url', e.target.value)}
                    placeholder="https://example.com/logo.png" className="bg-white border-gray-300 text-gray-900" />
                  {form.logo_url && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={form.logo_url} alt="Logo" className="w-10 h-10 rounded object-contain border border-gray-200" />
                      <span className="text-xs text-gray-500">Preview</span>
                    </div>
                  )}
                </FieldGroup>

                <FieldGroup label="Target Market" description="Who does this brand serve? Demographics, psychographics, market segments.">
                  <Textarea value={form.target_market} onChange={e => setField('target_market', e.target.value)}
                    placeholder="e.g., B2B SaaS companies, 50-500 employees, tech-forward..."
                    className="bg-white border-gray-300 text-gray-900 h-20 resize-none" />
                </FieldGroup>

                <FieldGroup label="Brand Personality" description="Character traits that define the brand">
                  <Textarea value={form.brand_personality} onChange={e => setField('brand_personality', e.target.value)}
                    placeholder="e.g., Innovative, trustworthy, approachable, confident"
                    className="bg-white border-gray-300 text-gray-900 h-16 resize-none" />
                </FieldGroup>

                <FieldGroup label="Taglines">
                  <div className="space-y-2">
                    {form.taglines.map((tagline, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 flex-1">{tagline}</span>
                        <button type="button" onClick={() => setField('taglines', form.taglines.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input value={newTagline} onChange={e => setNewTagline(e.target.value)}
                      placeholder="e.g., Innovation at scale" className="flex-1 bg-white border-gray-300 text-gray-900"
                      onKeyDown={e => { if (e.key === 'Enter' && newTagline.trim()) { setField('taglines', [...form.taglines, newTagline.trim()]); setNewTagline(''); } }} />
                    <Button size="sm" onClick={() => { if (newTagline.trim()) { setField('taglines', [...form.taglines, newTagline.trim()]); setNewTagline(''); } }}
                      className="bg-[#2C666E] hover:bg-[#07393C] text-white"><Plus className="w-4 h-4" /></Button>
                  </div>
                </FieldGroup>
              </TabsContent>

              {/* ── Tab: Voice & Messaging ── */}
              <TabsContent value="voice" className="space-y-5 p-4">
                <FieldGroup label="Voice Style" description="The overall tone category">
                  <Select value={form.voice_style} onValueChange={v => setField('voice_style', v)}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                      {VOICE_STYLES.map(v => <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Detailed Voice & Tone" description="How the brand communicates — tone, language style, formality level">
                  <Textarea value={form.brand_voice_detail} onChange={e => setField('brand_voice_detail', e.target.value)}
                    placeholder="e.g., Professional yet approachable. Uses clear, jargon-free language. Addresses the reader directly. Avoids slang but keeps things conversational."
                    className="bg-white border-gray-300 text-gray-900 h-28 resize-none" />
                </FieldGroup>

                <FieldGroup label="Content Style Rules" description="Formatting preferences, dos and don'ts for content creation">
                  <Textarea value={form.content_style_rules} onChange={e => setField('content_style_rules', e.target.value)}
                    placeholder="e.g., Use short paragraphs (2-3 sentences). Always include a CTA. Use data to back up claims. Avoid superlatives."
                    className="bg-white border-gray-300 text-gray-900 h-24 resize-none" />
                </FieldGroup>

                <FieldGroup label="Preferred Elements" description="Things the brand wants to include in content">
                  <Textarea value={form.preferred_elements} onChange={e => setField('preferred_elements', e.target.value)}
                    placeholder="e.g., Customer testimonials, data visualizations, before/after comparisons, product close-ups"
                    className="bg-white border-gray-300 text-gray-900 h-20 resize-none" />
                </FieldGroup>

                <FieldGroup label="Prohibited Elements" description="Things to avoid in all brand content">
                  <Textarea value={form.prohibited_elements} onChange={e => setField('prohibited_elements', e.target.value)}
                    placeholder="e.g., Competitor mentions by name, political content, unverified claims, stock photo cliches"
                    className="bg-white border-gray-300 text-gray-900 h-20 resize-none" />
                </FieldGroup>
              </TabsContent>

              {/* ── Tab: Visual ── */}
              <TabsContent value="visual" className="space-y-5 p-4">
                <FieldGroup label="Brand Colors">
                  <div className="space-y-2">
                    {form.colors.map((color, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-gray-300 flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm text-gray-700 flex-1 font-mono">{color}</span>
                        <button type="button" onClick={() => setField('colors', form.colors.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input type="text" value={newColor} onChange={e => setNewColor(e.target.value)}
                      placeholder="#000000" className="flex-1 bg-white border-gray-300 text-gray-900 font-mono"
                      onKeyDown={e => { if (e.key === 'Enter' && newColor.trim()) { setField('colors', [...form.colors, newColor.trim()]); setNewColor(''); } }} />
                    <Button size="sm" onClick={() => { if (newColor.trim()) { setField('colors', [...form.colors, newColor.trim()]); setNewColor(''); } }}
                      className="bg-[#2C666E] hover:bg-[#07393C] text-white"><Plus className="w-4 h-4" /></Button>
                  </div>
                </FieldGroup>

                <FieldGroup label="Style Preset" description="Overall visual style category">
                  <Select value={form.style_preset} onValueChange={v => setField('style_preset', v)}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                      {STYLE_PRESETS.map(v => <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Visual Style Notes" description="Photography style, illustration approach, graphic elements">
                  <Textarea value={form.visual_style_notes} onChange={e => setField('visual_style_notes', e.target.value)}
                    placeholder="e.g., Clean, modern photography. Product-focused with neutral backgrounds. Minimal text overlays with sans-serif typography."
                    className="bg-white border-gray-300 text-gray-900 h-24 resize-none" />
                </FieldGroup>

                <FieldGroup label="Mood & Atmosphere" description="The emotional feel the brand aims for in visuals">
                  <Textarea value={form.mood_atmosphere} onChange={e => setField('mood_atmosphere', e.target.value)}
                    placeholder="e.g., Professional, trustworthy, calm confidence. Aspirational without being unapproachable."
                    className="bg-white border-gray-300 text-gray-900 h-20 resize-none" />
                </FieldGroup>

                <FieldGroup label="Lighting Preferences" description="Preferred lighting for photography and video">
                  <Textarea value={form.lighting_prefs} onChange={e => setField('lighting_prefs', e.target.value)}
                    placeholder="e.g., Natural, bright lighting. Soft shadows. Avoid harsh studio lighting."
                    className="bg-white border-gray-300 text-gray-900 h-16 resize-none" />
                </FieldGroup>

                <FieldGroup label="Composition Style" description="Layout and framing preferences">
                  <Textarea value={form.composition_style} onChange={e => setField('composition_style', e.target.value)}
                    placeholder="e.g., Rule of thirds. Product centered with negative space. Clean backgrounds."
                    className="bg-white border-gray-300 text-gray-900 h-16 resize-none" />
                </FieldGroup>

                <FieldGroup label="AI Prompt Rules" description="Special instructions for AI-generated imagery">
                  <Textarea value={form.ai_prompt_rules} onChange={e => setField('ai_prompt_rules', e.target.value)}
                    placeholder="e.g., Always include brand colors. Avoid cartoonish styles. Use photorealistic rendering. Include product in every scene."
                    className="bg-white border-gray-300 text-gray-900 h-20 resize-none" />
                </FieldGroup>

                <FieldGroup label="Default LoRAs" description="Applied to all image generation unless a template overrides">
                  <LoRAPicker
                    value={(form.default_loras || []).map(l => ({
                      id: l.lora_id || l.id, type: l.source || l.type || 'custom',
                      url: l.url || '', triggerWord: l.trigger_word || l.triggerWord || null, scale: l.scale ?? 1.0,
                    }))}
                    onChange={val => setField('default_loras', val.map(l => ({
                      lora_id: l.id, scale: l.scale, source: l.type, url: l.url, trigger_word: l.triggerWord,
                    })))}
                    brandUsername={form.brand_username || undefined}
                  />
                </FieldGroup>
              </TabsContent>

              {/* ── Tab: Avatars ── */}
              <TabsContent value="avatars" className="space-y-4 p-4">
                <p className="text-xs text-gray-500">
                  Avatars are characters or personas used in your video ads. Add a reference image and optional LoRA weights for consistent character generation.
                </p>

                {isLoadingAvatars ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : (
                  <div className="space-y-2">
                    {brandAvatars.map(a => <AvatarCard key={a.id} avatar={a} onDelete={handleDeleteAvatar} onTrain={handleTrainAvatar} />)}
                    {brandAvatars.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No avatars for this brand yet</p>}
                  </div>
                )}

                {!showNewAvatar ? (
                  <Button size="sm" variant="outline" onClick={() => setShowNewAvatar(true)} className="w-full border-dashed border-gray-300 text-gray-600">
                    <Plus className="w-4 h-4 mr-2" /> Add Avatar
                  </Button>
                ) : (
                  <div className="space-y-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-700">New Avatar</p>
                    <FieldGroup label={<>Name <span className="text-red-500">*</span></>}>
                      <Input value={newAvatar.name} onChange={e => setNewAvatar(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g., Sarah (presenter)" className="h-8 text-sm bg-white border-gray-300" />
                    </FieldGroup>
                    <FieldGroup label="Description">
                      <Input value={newAvatar.description} onChange={e => setNewAvatar(p => ({ ...p, description: e.target.value }))}
                        placeholder="e.g., Young woman, 30s, professional" className="h-8 text-sm bg-white border-gray-300" />
                    </FieldGroup>
                    <FieldGroup label="Reference Image URL">
                      <Input value={newAvatar.reference_image_url} onChange={e => setNewAvatar(p => ({ ...p, reference_image_url: e.target.value }))}
                        placeholder="https://..." className="h-8 text-sm bg-white border-gray-300" />
                    </FieldGroup>
                    <FieldGroup label={<>LoRA Weights URL <span className="text-gray-400">(optional)</span></>}>
                      <Input value={newAvatar.lora_url} onChange={e => setNewAvatar(p => ({ ...p, lora_url: e.target.value }))}
                        placeholder="https://... (.safetensors)" className="h-8 text-sm bg-white border-gray-300" />
                    </FieldGroup>
                    <FieldGroup label={<>LoRA Trigger Word <span className="text-gray-400">(optional)</span></>}>
                      <Input value={newAvatar.lora_trigger_word} onChange={e => setNewAvatar(p => ({ ...p, lora_trigger_word: e.target.value }))}
                        placeholder="e.g., sks woman" className="h-8 text-sm bg-white border-gray-300" />
                    </FieldGroup>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={handleSaveAvatar} disabled={isSavingAvatar} className="bg-[#2C666E] hover:bg-[#07393C] text-white flex-1">
                        {isSavingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                        Save Avatar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNewAvatar(false)} className="text-gray-500">Cancel</Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ── Tab: SEWO Connect ── */}
              <TabsContent value="connect" className="space-y-4 p-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[#2C666E]" />
                    <h3 className="text-sm font-semibold text-gray-900">Connect to SEWO</h3>
                    {isConnected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Pull brand voice, target market, image style and colors from Doubleclicker automatically.
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={selectedSewoBrand}
                      onChange={e => handleSewoBrandSelect(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"
                      disabled={isLoadingSewo}
                    >
                      <option value="">-- Select a brand --</option>
                      {sewoBrands.map(b => (
                        <option key={b.username} value={b.username}>{b.brand_name || b.username}</option>
                      ))}
                    </select>
                    {isLoadingSewo && <Loader2 className="w-5 h-5 animate-spin text-[#2C666E] self-center" />}
                  </div>
                </div>

                {isConnected && (hasGuidelines || hasImageStyle) && (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
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
                  <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                    Brand found but no guidelines or image style set yet. Set them up in Doubleclicker and they'll sync here automatically.
                  </p>
                )}
              </TabsContent>
            </SlideOverBody>
          </Tabs>

          {/* Fixed footer */}
          <SlideOverFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-gray-500">
                {selectedBrandId ? `Editing: ${form.brand_name || 'Untitled'}` : 'New brand'}
              </span>
              <Button onClick={handleSave} disabled={isSaving} className="bg-[#2C666E] hover:bg-[#07393C] text-white px-6">
                {isSaving
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  : <><Save className="w-4 h-4 mr-2" /> {selectedBrandId ? 'Update Brand' : 'Create Brand'}</>}
              </Button>
            </div>
          </SlideOverFooter>
        </div>
      </div>
    </SlideOverPanel>
  );
}
