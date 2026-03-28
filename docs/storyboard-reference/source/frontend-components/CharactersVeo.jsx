import React, { useRef } from 'react';
import { Plus, Trash2, Upload, Sparkles, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Veo 3.1 Reference-to-Video character UI.
 * Uses a FLAT image_urls array — NOT @Element, NOT R2V.
 * Up to 5 reference images for subject consistency.
 */
export default function CharactersVeo({
  referenceImages = [],
  onChange,
  onOpenLibrary,
  onOpenImagineer,
}) {
  const fileInputRef = useRef(null);
  const MAX_IMAGES = 5;

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - referenceImages.length;
    const filesToProcess = files.slice(0, remaining);

    for (const file of filesToProcess) {
      const reader = new FileReader();
      reader.onload = () => {
        onChange(prev => {
          // Guard against exceeding max after async reads
          if (prev.length >= MAX_IMAGES) return prev;
          return [...prev, reader.result];
        });
      };
      reader.readAsDataURL(file);
    }

    if (filesToProcess.length < files.length) {
      toast.info(`Only ${filesToProcess.length} of ${files.length} images added (max ${MAX_IMAGES})`);
    }
    e.target.value = '';
  };

  const removeImage = (index) => {
    const updated = referenceImages.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Reference Images (Veo 3.1)
        </p>
        <span className="text-xs text-gray-400">
          {referenceImages.length}/{MAX_IMAGES} images
        </span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        Upload reference images for subject consistency. Veo 3.1 uses these to maintain
        visual appearance across scenes. These are passed as a flat image_urls array to the API.
      </p>

      {/* Image grid */}
      <div className="grid grid-cols-5 gap-2">
        {referenceImages.map((url, i) => (
          <div key={i} className="relative group aspect-square">
            <img
              src={url}
              alt={`Reference ${i + 1}`}
              className="w-full h-full rounded-lg object-cover border border-gray-200"
            />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: MAX_IMAGES - referenceImages.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-gray-300" />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {referenceImages.length < MAX_IMAGES && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenLibrary}
          >
            <FolderOpen className="w-3.5 h-3.5" /> Library
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImagineer}
          >
            <Sparkles className="w-3.5 h-3.5" /> Generate
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
