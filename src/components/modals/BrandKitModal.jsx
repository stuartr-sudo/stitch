import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Plus,
  Trash2,
  Save,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

export default function BrandKitModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [brandName, setBrandName] = useState('');
  const [colors, setColors] = useState([]);
  const [newColor, setNewColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('professional');
  const [taglines, setTaglines] = useState([]);
  const [newTagline, setNewTagline] = useState('');
  const [stylePreset, setStylePreset] = useState('modern');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadBrandKit();
    }
  }, [isOpen, user]);

  const loadBrandKit = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/brand/kit', { method: 'GET' });
      const data = await response.json();
      
      if (data.brandKit) {
        setBrandName(data.brandKit.brand_name || '');
        setColors(data.brandKit.colors || []);
        setLogoUrl(data.brandKit.logo_url || '');
        setVoiceStyle(data.brandKit.voice_style || 'professional');
        setTaglines(data.brandKit.taglines || []);
        setStylePreset(data.brandKit.style_preset || 'modern');
      }
    } catch (error) {
      console.error('Failed to load brand kit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddColor = () => {
    if (newColor.trim()) {
      setColors([...colors, newColor.trim()]);
      setNewColor('');
    }
  };

  const handleRemoveColor = (index) => {
    setColors(colors.filter((_, i) => i !== index));
  };

  const handleAddTagline = () => {
    if (newTagline.trim()) {
      setTaglines([...taglines, newTagline.trim()]);
      setNewTagline('');
    }
  };

  const handleRemoveTagline = (index) => {
    setTaglines(taglines.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiFetch('/api/brand/kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: brandName.trim() || null,
          colors,
          logo_url: logoUrl.trim() || null,
          voice_style: voiceStyle,
          taglines,
          style_preset: stylePreset,
        }),
      });
      toast.success('Brand kit saved!');
      onClose();
    } catch (error) {
      console.error('Failed to save brand kit:', error);
      toast.error('Failed to save brand kit');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-lg font-bold">Brand Kit</DialogTitle>
        <DialogDescription className="text-slate-500">
          Set up your brand identity to use across ad creations.
        </DialogDescription>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
          </div>
        ) : (
          <div className="space-y-5 mt-4">
            {/* Brand Name */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Brand Name</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Acme Corp"
              />
            </div>

            {/* Colors */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Brand Colors</Label>
              <div className="space-y-2">
                {colors.map((color, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-slate-600">{color}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveColor(i)}
                      className="ml-auto text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddColor} className="bg-[#2C666E] hover:bg-[#07393C]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Logo URL */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Logo URL</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>

            {/* Voice Style */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Voice Style</Label>
              <Select value={voiceStyle} onValueChange={setVoiceStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="energetic">Energetic</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Taglines */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Taglines</Label>
              <div className="space-y-2">
                {taglines.map((tagline, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 flex-1">{tagline}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTagline(i)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newTagline}
                  onChange={(e) => setNewTagline(e.target.value)}
                  placeholder="e.g., Innovation at scale"
                  className="flex-1"
                />
                <Button size="sm" onClick={handleAddTagline} className="bg-[#2C666E] hover:bg-[#07393C]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Style Preset */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Style Preset</Label>
              <Select value={stylePreset} onValueChange={setStylePreset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                  <SelectItem value="playful">Playful</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-11 bg-[#2C666E] hover:bg-[#37AEAE] text-white"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Brand Kit</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
