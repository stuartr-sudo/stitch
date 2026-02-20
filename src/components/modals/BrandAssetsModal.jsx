import React, { useState } from 'react';
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
  Loader2,
  Upload,
  Zap,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function BrandAssetsModal({ isOpen, onClose }) {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [processedImages, setProcessedImages] = useState({});
  const [loraName, setLoraName] = useState('');
  const [triggerWord, setTriggerWord] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(null);

  const handleFileUpload = async (files) => {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImages(prev => [...prev, {
          id: Date.now() + Math.random(),
          dataUrl: e.target.result,
          file: file,
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = async (imageId, dataUrl) => {
    setIsProcessing(true);
    try {
      const response = await apiFetch('/api/brand/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: dataUrl }),
      });

      const data = await response.json();
      if (data.success) {
        setProcessedImages(prev => ({
          ...prev,
          [imageId]: data.imageUrl,
        }));
        toast.success('Background removed!');
      } else {
        toast.error('Failed to remove background');
      }
    } catch (error) {
      console.error('Background removal error:', error);
      toast.error('Error removing background');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTrainLora = async () => {
    if (!loraName.trim()) {
      toast.error('Please enter a LoRA name');
      return;
    }
    if (!triggerWord.trim()) {
      toast.error('Please enter a trigger word');
      return;
    }
    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setIsTraining(true);
    try {
      const imageUrls = uploadedImages.map(img => processedImages[img.id] || img.dataUrl);

      const response = await apiFetch('/api/lora/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loraName.trim(),
          trigger_word: triggerWord.trim(),
          image_urls: imageUrls,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTrainingProgress({
          requestId: data.requestId,
          loraId: data.loraId,
          statusUrl: data.statusUrl,
          responseUrl: data.responseUrl,
        });
        toast.success('LoRA training started! This will take 5-10 minutes.');
        
        // Poll for training result
        await pollLoraTraining(data.requestId, data.loraId, data.statusUrl, data.responseUrl);
      } else {
        toast.error('Failed to start LoRA training');
      }
    } catch (error) {
      console.error('LoRA training error:', error);
      toast.error('Error starting LoRA training');
    } finally {
      setIsTraining(false);
    }
  };

  const pollLoraTraining = async (requestId, loraId, statusUrl, responseUrl) => {
    let attempts = 0;
    const maxAttempts = 120;

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));
      
      try {
        const response = await apiFetch('/api/lora/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, loraId, statusUrl, responseUrl }),
        });

        const result = await response.json();

        if (result.status === 'completed') {
          toast.success('LoRA training complete!');
          setTrainingProgress(null);
          onClose();
          return;
        }

        setTrainingProgress(prev => ({
          ...prev,
          queuePosition: result.queuePosition,
        }));
      } catch (err) {
        console.warn('Poll attempt failed:', err);
      }

      attempts++;
    }

    toast.error('LoRA training timed out');
    setTrainingProgress(null);
  };

  const handleDeleteImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    setProcessedImages(prev => {
      const newProcessed = { ...prev };
      delete newProcessed[imageId];
      return newProcessed;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pt-[15px] pb-[15px] pl-5 pr-5">
        <DialogTitle className="text-lg font-bold">Brand Assets</DialogTitle>
        <DialogDescription className="text-slate-500">
          Upload product photos and train a custom LoRA model for your brand.
        </DialogDescription>

        <div className="space-y-5 mt-4">
          {/* File Upload */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Upload Product Photos (5-15 images)</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 cursor-pointer transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600">Click to upload or drag and drop</p>
              </label>
            </div>
          </div>

          {/* Uploaded Images Grid */}
          {uploadedImages.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                Uploaded Images ({uploadedImages.length})
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {uploadedImages.map(img => (
                  <div key={img.id} className="relative group">
                    <img
                      src={processedImages[img.id] || img.dataUrl}
                      alt="preview"
                      className="w-full h-24 object-cover rounded border"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveBackground(img.id, img.dataUrl)}
                        disabled={isProcessing || processedImages[img.id]}
                        className="text-white bg-[#2C666E] hover:bg-[#07393C] disabled:opacity-50 px-2 py-1 rounded text-xs flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" /> {processedImages[img.id] ? 'Done' : 'Remove BG'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LoRA Configuration */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
            <h3 className="font-semibold text-slate-800">Train LoRA Model</h3>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">LoRA Name</Label>
              <Input
                value={loraName}
                onChange={(e) => setLoraName(e.target.value)}
                placeholder="e.g., Red Sneakers v1"
                disabled={isTraining || trainingProgress}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Trigger Word</Label>
              <Input
                value={triggerWord}
                onChange={(e) => setTriggerWord(e.target.value)}
                placeholder="e.g., redsneaker"
                disabled={isTraining || trainingProgress}
              />
              <p className="text-xs text-slate-500 mt-1">This word will activate the LoRA in your prompts</p>
            </div>

            <Button
              onClick={handleTrainLora}
              disabled={isTraining || trainingProgress || uploadedImages.length === 0}
              className="w-full bg-[#2C666E] hover:bg-[#07393C] text-white"
            >
              {isTraining ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Training...</>
              ) : trainingProgress ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Training in progress...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Start LoRA Training</>
              )}
            </Button>

            {trainingProgress && (
              <div className="text-xs text-slate-600">
                <p>LoRA training in progress...</p>
                {trainingProgress.queuePosition && (
                  <p>Queue position: {trainingProgress.queuePosition}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
