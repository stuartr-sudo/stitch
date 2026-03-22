import React, { useState } from 'react';
import { useShortsWizard } from '@/contexts/ShortsWizardContext';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, ImageIcon } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function PreviewImageStep() {
  const { niche, script, visualStyle, previewImage, updateField } = useShortsWizard();
  const [loading, setLoading] = useState(false);

  const generatePreview = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/campaigns/preview-image', {
        method: 'POST',
        body: JSON.stringify({ niche, script, visual_style: visualStyle }),
      });
      const data = await res.json();
      const imageUrl = data.url || data.image_url || data.imageUrl || null;
      updateField('previewImage', imageUrl);
    } catch (err) {
      console.error('Failed to generate preview image:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-1">Preview Image</h2>
      <p className="text-sm text-slate-500 mb-6">
        Generate a preview of Scene 1 to confirm the visual style before generating the full video.
      </p>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-[#2C666E] mb-4" />
          <p className="text-sm text-slate-500">Generating preview image...</p>
        </div>
      ) : previewImage ? (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full object-contain max-h-[400px]"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={generatePreview}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Regenerate
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
          <ImageIcon className="w-12 h-12 text-slate-300 mb-4" />
          <p className="text-sm text-slate-500 mb-4">No preview generated yet.</p>
          <Button
            onClick={generatePreview}
            className="bg-[#2C666E] hover:bg-[#24555c] text-white"
          >
            Generate Preview Image
          </Button>
        </div>
      )}
    </div>
  );
}
