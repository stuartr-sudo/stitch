import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { SlideOverPanel, SlideOverBody, SlideOverFooter } from '@/components/ui/slide-over-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, Upload, Zap, Trash2, ImagePlus, Sparkles, CheckCircle2,
  ArrowRight, Info, Clock, Layers, FolderOpen, Check, Library, ChevronDown,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const STEPS = [
  { key: 'upload', label: 'Upload Photos', icon: ImagePlus },
  { key: 'configure', label: 'Configure', icon: Sparkles },
  { key: 'train', label: 'Train', icon: Zap },
];

function StepIndicator({ currentStep, steps }) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  return (
    <div className="flex items-center gap-1 px-4 py-3 border-b border-gray-200 bg-gray-50/80">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={`flex-1 h-px ${isDone ? 'bg-[#2C666E]' : 'bg-gray-200'}`} />
            )}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              isActive ? 'bg-[#2C666E] text-white' :
              isDone ? 'bg-[#2C666E]/10 text-[#2C666E]' :
              'bg-gray-100 text-gray-400'
            }`}>
              {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function BrandAssetsModal({ isOpen, onClose }) {
  const fileInputRef = useRef(null);
  const [currentStep, setCurrentStep] = useState('upload');

  // Upload state
  const [uploadedImages, setUploadedImages] = useState([]);
  const [processedImages, setProcessedImages] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  // Library import state
  const [showLibraryBrowser, setShowLibraryBrowser] = useState(false);
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryFolders, setLibraryFolders] = useState([]); // unique folder prefixes
  const [selectedFolder, setSelectedFolder] = useState(null); // null = all images
  const [selectedLibraryIds, setSelectedLibraryIds] = useState(new Set());
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [loadingMoreLibrary, setLoadingMoreLibrary] = useState(false);
  const [libraryHasMore, setLibraryHasMore] = useState(true);
  const [libraryOffset, setLibraryOffset] = useState(0);
  const LIBRARY_PAGE_SIZE = 24;

  // Config state
  const [loraName, setLoraName] = useState('');
  const [triggerWord, setTriggerWord] = useState('');
  const [trainingModels, setTrainingModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('flux-lora-fast');
  const [trainingType, setTrainingType] = useState('subject');
  const [createMasks, setCreateMasks] = useState(true);
  const [autoCaption, setAutoCaption] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [steps, setSteps] = useState(1000);
  const [learningRate, setLearningRate] = useState(null);

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [trainingStage, setTrainingStage] = useState(''); // uploading, queued, training, complete
  const [trainingResult, setTrainingResult] = useState(null);
  const [trainingError, setTrainingError] = useState(null);

  // Reset all state when the modal closes so user can train again
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep('upload');
      setUploadedImages([]);
      setProcessedImages({});
      setIsProcessing(false);
      setProcessingId(null);
      setShowLibraryBrowser(false);
      setLibraryItems([]);
      setLibraryFolders([]);
      setSelectedFolder(null);
      setSelectedLibraryIds(new Set());
      setLoadingLibrary(false);
      setLoadingMoreLibrary(false);
      setLibraryHasMore(true);
      setLibraryOffset(0);
      setLoraName('');
      setTriggerWord('');
      setIsTraining(false);
      setTrainingProgress(null);
      setTrainingStage('');
      setTrainingResult(null);
      setTrainingError(null);
      setTrainingModels([]);
      setSelectedModel('flux-lora-fast');
      setTrainingType('subject');
      setCreateMasks(true);
      setAutoCaption(true);
      setShowAdvanced(false);
      setSteps(1000);
      setLearningRate(null);
    }
  }, [isOpen]);

  // Fetch available training models when modal opens
  useEffect(() => {
    if (isOpen) {
      (async () => {
        try {
          const res = await apiFetch('/api/lora/models');
          const data = await res.json();
          if (data.success && data.models?.length) {
            setTrainingModels(data.models);
            const defaultModel = data.models.find(m => m.id === 'flux-lora-fast') || data.models[0];
            if (defaultModel) {
              setSteps(defaultModel.defaultSteps);
              setLearningRate(defaultModel.defaultLearningRate || null);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch training models:', err);
        }
      })();
    }
  }, [isOpen]);

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    const model = trainingModels.find(m => m.id === modelId);
    if (model) {
      setSteps(model.defaultSteps);
      setLearningRate(model.defaultLearningRate || null);
      setCreateMasks(model.supportsMasks);
    }
  };
  const selectedModelInfo = trainingModels.find(m => m.id === selectedModel);

  const handleFileUpload = async (files) => {
    const newImages = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      newImages.push({
        id: Date.now() + Math.random(),
        dataUrl,
        fileName: file.name,
        size: file.size,
      });
    }
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveBackground = async (imageId, dataUrl) => {
    setIsProcessing(true);
    setProcessingId(imageId);
    try {
      const response = await apiFetch('/api/brand/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: dataUrl }),
      });
      const data = await response.json();
      if (data.success) {
        setProcessedImages(prev => ({ ...prev, [imageId]: data.imageUrl }));
        toast.success('Background removed');
      } else {
        toast.error('Failed to remove background');
      }
    } catch (error) {
      toast.error('Error removing background');
    } finally {
      setIsProcessing(false);
      setProcessingId(null);
    }
  };

  const handleRemoveAllBackgrounds = async () => {
    const unprocessed = uploadedImages.filter(img => !processedImages[img.id]);
    if (unprocessed.length === 0) { toast.info('All backgrounds already removed'); return; }

    for (const img of unprocessed) {
      await handleRemoveBackground(img.id, img.dataUrl);
    }
    toast.success(`Processed ${unprocessed.length} images`);
  };

  const handleDeleteImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
    setProcessedImages(prev => {
      const next = { ...prev };
      delete next[imageId];
      return next;
    });
  };

  // ─── Library Import ─────────────────────────────────────────────────────

  const loadLibraryFolders = async () => {
    try {
      const { data: allTitles } = await supabase
        .from('image_library_items')
        .select('title');
      if (allTitles) {
        const folders = new Set();
        allTitles.forEach(item => {
          const match = item.title?.match(/^\[([^\]]+)\]/);
          if (match) folders.add(match[1]);
        });
        setLibraryFolders(Array.from(folders).sort());
      }
    } catch (err) {
      console.error('Failed to load library folders:', err);
    }
  };

  const loadLibraryItems = async (isInitial = true, folder = selectedFolder) => {
    if (isInitial) {
      setLoadingLibrary(true);
      setLibraryOffset(0);
      setLibraryHasMore(true);
    } else {
      setLoadingMoreLibrary(true);
    }

    const offset = isInitial ? 0 : libraryOffset;

    try {
      let query = supabase
        .from('image_library_items')
        .select('id, url, title, created_at')
        .order('created_at', { ascending: false });

      if (folder) {
        query = query.like('title', `[${folder}]%`);
      }

      const { data: images } = await query.range(offset, offset + LIBRARY_PAGE_SIZE - 1);

      if (images) {
        const hasMore = images.length === LIBRARY_PAGE_SIZE;
        setLibraryHasMore(hasMore);
        setLibraryOffset(offset + images.length);

        if (isInitial) {
          setLibraryItems(images);
        } else {
          setLibraryItems(prev => {
            const existingIds = new Set(prev.map(i => i.id));
            const newItems = images.filter(i => !existingIds.has(i.id));
            return [...prev, ...newItems];
          });
        }
      } else {
        setLibraryHasMore(false);
      }
    } catch (err) {
      console.error('Failed to load library:', err);
      toast.error('Failed to load library');
    } finally {
      setLoadingLibrary(false);
      setLoadingMoreLibrary(false);
    }
  };

  const handleOpenLibrary = () => {
    setShowLibraryBrowser(true);
    setSelectedLibraryIds(new Set());
    setSelectedFolder(null);
    setLibraryItems([]);
    loadLibraryFolders();
    loadLibraryItems(true, null);
  };

  const toggleLibraryItem = (id) => {
    setSelectedLibraryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInFolder = () => {
    const allIds = new Set(libraryItems.map(item => item.id));
    setSelectedLibraryIds(allIds);
  };

  const handleImportFromLibrary = () => {
    const selected = libraryItems.filter(item => selectedLibraryIds.has(item.id));
    if (selected.length === 0) { toast.error('No images selected'); return; }

    const imported = selected.map(item => ({
      id: Date.now() + Math.random(),
      dataUrl: item.url,
      fileName: item.title || 'Library image',
      size: 0,
      fromLibrary: true,
    }));

    setUploadedImages(prev => [...prev, ...imported]);
    setShowLibraryBrowser(false);
    setSelectedLibraryIds(new Set());
    toast.success(`Imported ${imported.length} images from library`);
  };

  const filteredLibraryItems = libraryItems;

  const handleStartTraining = async () => {
    if (!loraName.trim()) { toast.error('Enter a name for your LoRA model'); return; }
    if (!triggerWord.trim()) { toast.error('Enter a trigger word'); return; }
    if (uploadedImages.length < 3) { toast.error('Upload at least 3 images for good results'); return; }

    setIsTraining(true);
    setCurrentStep('train');
    setTrainingStage('uploading');

    try {
      // Stage 1: Upload images to storage
      const publicUrls = [];
      for (let i = 0; i < uploadedImages.length; i++) {
        setTrainingStage('uploading');
        setTrainingProgress({ current: i + 1, total: uploadedImages.length });

        const img = uploadedImages[i];
        const base64Data = processedImages[img.id] || img.dataUrl;
        const uploadRes = await apiFetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: base64Data,
            type: 'image',
            title: `LoRA Training - ${loraName}`,
            source: 'lora-trainer',
          }),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) publicUrls.push(uploadData.url);
      }

      if (publicUrls.length === 0) {
        throw new Error('No images could be uploaded');
      }

      // Stage 1.5: Auto-caption if enabled
      let captions = null;
      if (autoCaption && publicUrls.length > 0) {
        setTrainingStage('captioning');
        try {
          const captionRes = await apiFetch('/api/lora/caption', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_urls: publicUrls,
              trigger_word: triggerWord.trim(),
              training_type: trainingType,
            }),
          });
          const captionData = await captionRes.json();
          if (captionData.success && captionData.captions?.length) {
            captions = captionData.captions;
          }
        } catch (err) {
          console.warn('Auto-captioning failed, using template captions:', err);
        }
      }

      // Stage 2: Start training
      setTrainingStage('queued');
      setTrainingProgress(null);

      const response = await apiFetch('/api/lora/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loraName.trim(),
          trigger_word: triggerWord.trim(),
          image_urls: publicUrls,
          model: selectedModel,
          training_type: trainingType,
          is_style: trainingType === 'style',
          create_masks: createMasks,
          steps,
          learning_rate: learningRate,
          captions,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg;
        try { errMsg = JSON.parse(errText).error; } catch { errMsg = errText; }
        throw new Error(errMsg || `Server error ${response.status}`);
      }
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to start training');

      setTrainingStage('training');
      toast.success('LoRA training started');

      // Stage 3: Poll for completion
      await pollLoraTraining(data.requestId, data.loraId, data.statusUrl, data.responseUrl, data.endpoint, data.model);
    } catch (error) {
      console.error('LoRA training error:', error);
      toast.error(error.message || 'Error starting LoRA training');
      setTrainingError(error.message || 'Unknown error');
      setTrainingStage('');
      setIsTraining(false);
    }
  };

  const pollLoraTraining = async (requestId, loraId, statusUrl, responseUrl, endpoint, model) => {
    let attempts = 0;
    const maxAttempts = 120;

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 5000));

      try {
        const response = await apiFetch('/api/lora/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, loraId, statusUrl, responseUrl, endpoint, model }),
        });
        const result = await response.json();

        if (result.status === 'completed') {
          if (result.modelUrl) {
            setTrainingStage('complete');
            setTrainingResult({
              modelUrl: result.modelUrl,
              triggerWord: triggerWord.trim(),
              loraName: loraName.trim(),
            });
            toast.success('LoRA training complete! Your model is ready to use.');
          } else {
            setTrainingStage('failed');
            toast.error('Training finished but no model was produced. Try again with different images.');
          }
          setIsTraining(false);
          return;
        }

        if (result.status === 'failed') {
          setTrainingStage('failed');
          toast.error('LoRA training failed. Try again with different images.');
          setIsTraining(false);
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

    toast.error('LoRA training timed out — check back in a few minutes');
    setTrainingStage('');
    setIsTraining(false);
  };

  const processedCount = Object.keys(processedImages).length;
  const canProceedToConfigure = uploadedImages.length >= 3;
  const canStartTraining = loraName.trim() && triggerWord.trim() && uploadedImages.length >= 3;

  return (
    <SlideOverPanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="LoRA Model Trainer"
      subtitle="Train a custom AI model to generate your product or character consistently"
      icon={<Layers className="w-5 h-5" />}
    >
      <StepIndicator currentStep={currentStep} steps={STEPS} />

      <SlideOverBody>
        {/* ── Step 1: Upload ── */}
        {currentStep === 'upload' && (
          <div className="p-5 space-y-5">
            {/* Explainer */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-900">What is LoRA training?</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    LoRA (Low-Rank Adaptation) teaches an AI image model to recognize your specific product,
                    person, or character. Upload 5-15 clear photos from different angles — the AI learns
                    what makes your subject unique, then generates new images that look like the real thing.
                  </p>
                  <div className="border-t border-blue-200 pt-2 mt-1">
                    <p className="text-xs font-medium text-blue-800 mb-1.5">Example use cases:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/70 rounded-md p-2">
                        <p className="text-[11px] font-semibold text-blue-900">Product Shots</p>
                        <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">
                          Upload 10 photos of your product from different angles. Then generate lifestyle scenes, flat lays, and ad creatives featuring it.
                        </p>
                      </div>
                      <div className="bg-white/70 rounded-md p-2">
                        <p className="text-[11px] font-semibold text-blue-900">Brand Character</p>
                        <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">
                          Upload headshots and full-body photos of a spokesperson or mascot. Generate them in new settings for ads and social content.
                        </p>
                      </div>
                      <div className="bg-white/70 rounded-md p-2">
                        <p className="text-[11px] font-semibold text-blue-900">Visual Style</p>
                        <p className="text-[10px] text-blue-600 mt-0.5 leading-relaxed">
                          Upload 8-15 on-brand images with a consistent aesthetic. The model learns your visual style and applies it to new generations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-gray-700">
                  Training Photos <span className="text-gray-400">({uploadedImages.length} uploaded)</span>
                </Label>
                {uploadedImages.length > 0 && processedCount < uploadedImages.length && (
                  <Button size="sm" variant="outline" onClick={handleRemoveAllBackgrounds} disabled={isProcessing}
                    className="text-xs border-[#2C666E]/40 text-[#2C666E]">
                    <Zap className="w-3 h-3 mr-1" /> Remove All Backgrounds
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                className="hidden"
              />

              {uploadedImages.length === 0 ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#2C666E] hover:bg-[#2C666E]/5 cursor-pointer transition-all group"
                  >
                    <Upload className="w-10 h-10 mx-auto mb-3 text-gray-300 group-hover:text-[#2C666E] transition-colors" />
                    <p className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Click to upload photos</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WebP. 5-15 images recommended.</p>
                  </button>
                  <div className="text-center">
                    <span className="text-xs text-gray-400">or</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenLibrary}
                    className="w-full border-2 border-dashed border-[#2C666E]/30 rounded-xl p-6 text-center hover:border-[#2C666E] hover:bg-[#2C666E]/5 cursor-pointer transition-all group"
                  >
                    <FolderOpen className="w-8 h-8 mx-auto mb-2 text-[#2C666E]/40 group-hover:text-[#2C666E] transition-colors" />
                    <p className="text-sm font-medium text-[#2C666E]/70 group-hover:text-[#2C666E]">Import from Library</p>
                    <p className="text-xs text-gray-400 mt-1">Select images or folders from your saved library</p>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    {uploadedImages.map(img => {
                      const isProcessed = !!processedImages[img.id];
                      const isBeingProcessed = processingId === img.id;
                      return (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                          <img
                            src={processedImages[img.id] || img.dataUrl}
                            alt="preview"
                            className="w-full aspect-square object-cover"
                          />
                          {/* Status badge */}
                          <div className="absolute top-1.5 left-1.5">
                            {isBeingProcessed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white/90 text-gray-600 px-1.5 py-0.5 rounded-full shadow-sm">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Processing
                              </span>
                            ) : isProcessed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-green-100/90 text-green-700 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5" /> BG Removed
                              </span>
                            ) : null}
                          </div>
                          {/* Hover actions */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {!isProcessed && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBackground(img.id, img.dataUrl)}
                                disabled={isProcessing}
                                className="text-white bg-[#2C666E] hover:bg-[#07393C] disabled:opacity-50 px-2 py-1.5 rounded-md text-xs font-medium flex items-center gap-1"
                              >
                                <Zap className="w-3 h-3" /> Remove BG
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(img.id)}
                              className="text-white bg-red-500 hover:bg-red-600 px-2 py-1.5 rounded-md text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add more button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-all cursor-pointer"
                    >
                      <ImagePlus className="w-6 h-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Upload</span>
                    </button>
                    {/* Import from library */}
                    <button
                      type="button"
                      onClick={handleOpenLibrary}
                      className="aspect-square rounded-lg border-2 border-dashed border-[#2C666E]/30 flex flex-col items-center justify-center hover:border-[#2C666E] hover:bg-[#2C666E]/5 transition-all cursor-pointer"
                    >
                      <FolderOpen className="w-6 h-6 text-[#2C666E]/40" />
                      <span className="text-xs text-[#2C666E]/60 mt-1">Library</span>
                    </button>
                  </div>

                  {/* Tips */}
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Tips for best results:</p>
                    <ul className="text-xs text-gray-500 space-y-0.5 list-disc list-inside">
                      <li>Use 5-15 high-quality photos from different angles</li>
                      <li>Keep consistent lighting across images</li>
                      <li>Removing backgrounds helps the AI focus on your subject</li>
                      <li>Avoid busy backgrounds or other prominent objects</li>
                    </ul>
                  </div>

                  {uploadedImages.length < 3 && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Upload at least 3 images to proceed (5-15 recommended for best quality)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Configure ── */}
        {currentStep === 'configure' && (
          <div className="p-5 space-y-5">
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Model Configuration</h3>
                <p className="text-xs text-gray-500 mt-0.5">Name your model and choose a trigger word that activates it in prompts.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">LoRA Model Name</Label>
                <Input
                  value={loraName}
                  onChange={(e) => setLoraName(e.target.value)}
                  placeholder="e.g., Red Sneakers v1, Sarah Presenter, Acme Product"
                  className="bg-white border-gray-300 text-gray-900"
                />
                <p className="text-xs text-gray-500">A descriptive name to identify this model later</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Trigger Word</Label>
                <Input
                  value={triggerWord}
                  onChange={(e) => setTriggerWord(e.target.value)}
                  placeholder="e.g., redsneaker, sarahpresenter, acmewidget"
                  className="bg-white border-gray-300 text-gray-900 font-mono"
                />
                <p className="text-xs text-gray-500">
                  This unique word activates your LoRA in image prompts. Use something distinctive that won't appear naturally
                  in other prompts — e.g., <code className="bg-gray-100 px-1 rounded text-[#2C666E]">redsneaker</code> or{' '}
                  <code className="bg-gray-100 px-1 rounded text-[#2C666E]">sks person</code>.
                </p>
              </div>

              {/* Training Type */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Training Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTrainingType('subject')}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      trainingType === 'subject'
                        ? 'border-[#2C666E] bg-[#2C666E]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${trainingType === 'subject' ? 'text-[#2C666E]' : 'text-gray-700'}`}>Subject / Character</p>
                    <p className="text-xs text-gray-500 mt-0.5">Product, person, mascot, or object</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrainingType('style')}
                    className={`rounded-lg border-2 p-3 text-left transition-all ${
                      trainingType === 'style'
                        ? 'border-[#2C666E] bg-[#2C666E]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${trainingType === 'style' ? 'text-[#2C666E]' : 'text-gray-700'}`}>Visual Style</p>
                    <p className="text-xs text-gray-500 mt-0.5">Art style, aesthetic, or brand look</p>
                  </button>
                </div>
              </div>

              {/* Model Selector */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Training Model</Label>
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#2C666E] focus:ring-1 focus:ring-[#2C666E] outline-none"
                >
                  {trainingModels.filter(m => m.category === 'image').length > 0 && (
                    <optgroup label="Image Models">
                      {trainingModels.filter(m => m.category === 'image').map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.baseModel} ({m.pricing})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {trainingModels.filter(m => m.category === 'video').length > 0 && (
                    <optgroup label="Video Models">
                      {trainingModels.filter(m => m.category === 'video').map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.baseModel} ({m.pricing})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {trainingModels.length === 0 && (
                    <option value="flux-lora-fast">Loading models...</option>
                  )}
                </select>
                {selectedModelInfo?.pricingNote && (
                  <p className="text-[10px] text-gray-400">{selectedModelInfo.pricingNote}</p>
                )}
                {selectedModelInfo?.category === 'video' && (
                  <div className="flex gap-1.5 items-start bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2 mt-1.5">
                    <span className="text-amber-600 text-xs mt-0.5">⚠</span>
                    <p className="text-[11px] text-amber-800">
                      <strong>Video models require video clips</strong> as training data, not still images.
                      If you only have images, use an <strong>Image Model</strong> instead (e.g. FLUX LoRA Fast).
                    </p>
                  </div>
                )}
              </div>

              {/* Auto-Caption Toggle */}
              <div className="flex items-center justify-between py-2">
                <div className="flex-1 mr-4">
                  <p className="text-sm font-medium text-gray-700">AI Auto-Captioning</p>
                  <p className="text-xs text-gray-500 mt-0.5">Uses GPT-4o to describe each image — produces better LoRAs than generic captions</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoCaption}
                  onClick={() => setAutoCaption(!autoCaption)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    autoCaption ? 'bg-[#2C666E]' : 'bg-gray-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autoCaption ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Advanced Settings */}
              <div className="border-t border-gray-200 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  Advanced Settings
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-4 pl-1">
                    {/* Steps slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Training Steps</Label>
                        <span className="text-sm font-mono text-[#2C666E] font-medium">{steps.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min={selectedModelInfo?.stepRange?.[0] || 100}
                        max={selectedModelInfo?.stepRange?.[1] || 4000}
                        step={100}
                        value={steps}
                        onChange={(e) => setSteps(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2C666E]"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{(selectedModelInfo?.stepRange?.[0] || 100).toLocaleString()}</span>
                        <span>{(selectedModelInfo?.stepRange?.[1] || 4000).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Learning Rate slider */}
                    {selectedModelInfo?.defaultLearningRate && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium text-gray-700">Learning Rate</Label>
                          <span className="text-sm font-mono text-[#2C666E] font-medium">{learningRate ?? selectedModelInfo.defaultLearningRate}</span>
                        </div>
                        <input
                          type="range"
                          min={0.00001}
                          max={0.001}
                          step={0.00001}
                          value={learningRate ?? selectedModelInfo.defaultLearningRate}
                          onChange={(e) => setLearningRate(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2C666E]"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>0.00001</span>
                          <span>0.001</span>
                        </div>
                      </div>
                    )}

                    {/* Create Masks toggle */}
                    {selectedModelInfo?.supportsMasks && (
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <p className="text-sm font-medium text-gray-700">Create Masks</p>
                          <p className="text-xs text-gray-500 mt-0.5">Uses segmentation to focus training on the subject. Best for people.</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={createMasks}
                          onClick={() => setCreateMasks(!createMasks)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            createMasks ? 'bg-[#2C666E]' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            createMasks ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Training Summary */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Training Summary</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Images:</span>{' '}
                  <span className="font-medium text-gray-900">{uploadedImages.length} photos</span>
                  {processedCount > 0 && (
                    <span className="text-green-600 ml-1">({processedCount} BG removed)</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500">Model:</span>{' '}
                  <span className="font-medium text-gray-900">{selectedModelInfo?.name || 'FLUX LoRA'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Steps:</span>{' '}
                  <span className="font-medium text-gray-900">{steps.toLocaleString()} iterations</span>
                </div>
                <div>
                  <span className="text-gray-500">Type:</span>{' '}
                  <span className="font-medium text-gray-900">{trainingType === 'subject' ? 'Subject' : 'Style'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Pricing:</span>{' '}
                  <span className="font-medium text-gray-900">{selectedModelInfo?.pricing || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Captions:</span>{' '}
                  <span className="font-medium text-gray-900">{autoCaption ? 'AI (GPT-4o)' : 'Template'}</span>
                </div>
              </div>

              {/* Thumbnail strip */}
              <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                {uploadedImages.slice(0, 8).map(img => (
                  <img
                    key={img.id}
                    src={processedImages[img.id] || img.dataUrl}
                    alt=""
                    className="w-12 h-12 rounded object-cover border border-gray-200 flex-shrink-0"
                  />
                ))}
                {uploadedImages.length > 8 && (
                  <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                    +{uploadedImages.length - 8}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex gap-2">
                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-800 font-medium">What happens next?</p>
                  <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                    Your images will be uploaded to secure storage, then sent to Fal.ai for LoRA training.
                    The AI will study your subject across all photos and learn to reproduce it. Training
                    takes about 5-10 minutes. Once complete, the model is saved to your brand and available
                    in any image generation tool.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Training ── */}
        {currentStep === 'train' && (
          <div className="p-5 space-y-5">
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center space-y-4">
              {/* Stage: Uploading */}
              {trainingStage === 'uploading' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#2C666E]/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-[#2C666E] animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Uploading images...</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {trainingProgress
                        ? `Image ${trainingProgress.current} of ${trainingProgress.total}`
                        : 'Preparing your photos for training'}
                    </p>
                  </div>
                  {trainingProgress && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#2C666E] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(trainingProgress.current / trainingProgress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Stage: Captioning */}
              {trainingStage === 'captioning' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Captioning Images...</h3>
                    <p className="text-sm text-gray-500 mt-1">AI is describing each image for better training quality</p>
                  </div>
                </>
              )}

              {/* Stage: Queued */}
              {trainingStage === 'queued' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Queued for training</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Images uploaded. Waiting for a training slot on Fal.ai...
                    </p>
                  </div>
                </>
              )}

              {/* Stage: Training */}
              {trainingStage === 'training' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#2C666E]/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-[#2C666E] animate-bounce" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Training your LoRA model...</p>
                    <p className="text-xs text-gray-500 mt-1">
                      The AI is learning what makes <span className="font-medium text-gray-700">{loraName}</span> unique.
                      This takes about 5-10 minutes.
                    </p>
                    {trainingProgress?.queuePosition != null && (
                      <p className="text-xs text-[#2C666E] mt-2 font-medium">
                        Queue position: {trainingProgress.queuePosition}
                      </p>
                    )}
                  </div>
                  {/* Pulsing bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#2C666E] h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                  <p className="text-xs text-gray-400">You can close this panel — training continues in the background</p>
                </>
              )}

              {/* Stage: Complete */}
              {trainingStage === 'complete' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Training complete!</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Your LoRA model <span className="font-medium text-gray-700">"{trainingResult?.loraName}"</span> is ready.
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-left space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Trigger word:</span>
                      <code className="bg-[#2C666E]/10 text-[#2C666E] px-2 py-0.5 rounded text-sm font-mono font-medium">
                        {trainingResult?.triggerWord}
                      </code>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Use this trigger word in any image prompt to generate images of your subject.
                      It's been saved to your brand and will appear in the Imagineer and JumpStart tools.
                    </p>
                  </div>

                  <Button
                    onClick={onClose}
                    className="bg-[#2C666E] hover:bg-[#07393C] text-white px-8"
                  >
                    Done
                  </Button>
                </>
              )}

              {/* Stage: Failed */}
              {trainingStage === 'failed' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                    <Info className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Training failed</p>
                    <p className="text-sm text-gray-500 mt-1">
                      The model could not be produced. This can happen with low-quality images or incompatible training data.
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-left space-y-1">
                    <p className="text-xs font-medium text-amber-800">Tips for next attempt:</p>
                    <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
                      <li>Use 5-15 high-quality, consistent photos</li>
                      <li>Remove busy backgrounds before training</li>
                      <li>Keep lighting and style consistent across images</li>
                      <li>Avoid very small or low-resolution images</li>
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => { setCurrentStep('upload'); setTrainingStage(''); }} className="border-gray-300">
                      Try Again
                    </Button>
                    <Button onClick={onClose} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                      Close
                    </Button>
                  </div>
                </>
              )}

              {/* Stage: Empty (returned from error) */}
              {!trainingStage && currentStep === 'train' && (
                <>
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                    <Info className="w-8 h-8 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Training could not start</p>
                    {trainingError && (
                      <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 max-w-sm mx-auto text-left break-words">
                        <p className="font-medium text-red-800 mb-0.5">Error details:</p>
                        {trainingError}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Go back and check your settings, then try again.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => { setCurrentStep('configure'); setTrainingError(null); }} className="border-gray-300">
                    Back to Configuration
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </SlideOverBody>

      {/* Footer navigation */}
      {currentStep !== 'train' && (
        <SlideOverFooter>
          <div className="flex items-center justify-between w-full">
            {currentStep === 'upload' ? (
              <>
                <span className="text-xs text-gray-500">
                  {uploadedImages.length} of 5-15 images uploaded
                </span>
                <Button
                  onClick={() => setCurrentStep('configure')}
                  disabled={!canProceedToConfigure}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white px-6"
                >
                  Next: Configure <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setCurrentStep('upload')} className="text-gray-500">
                  Back to Photos
                </Button>
                <Button
                  onClick={handleStartTraining}
                  disabled={!canStartTraining || isTraining}
                  className="bg-[#2C666E] hover:bg-[#07393C] text-white px-6"
                >
                  {isTraining
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                    : <><Zap className="w-4 h-4 mr-2" /> Start Training</>}
                </Button>
              </>
            )}
          </div>
        </SlideOverFooter>
      )}
      {/* Library Browser Overlay */}
      {showLibraryBrowser && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#2C666E]" />
              <h3 className="text-sm font-semibold text-gray-900">Import from Library</h3>
              {selectedLibraryIds.size > 0 && (
                <span className="text-xs bg-[#2C666E] text-white px-2 py-0.5 rounded-full">
                  {selectedLibraryIds.size} selected
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowLibraryBrowser(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Folder tabs */}
          {libraryFolders.length > 0 && (
            <div className="flex items-center gap-1.5 px-5 py-2 border-b border-gray-100 overflow-x-auto">
              <button
                type="button"
                onClick={() => { setSelectedFolder(null); loadLibraryItems(true, null); }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedFolder === null
                    ? 'bg-[#2C666E] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Images
              </button>
              {libraryFolders.map(folder => (
                <button
                  key={folder}
                  type="button"
                  onClick={() => { setSelectedFolder(folder); loadLibraryItems(true, folder); }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedFolder === folder
                      ? 'bg-[#2C666E] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FolderOpen className="w-3 h-3" /> {folder}
                </button>
              ))}
            </div>
          )}

          {/* Image grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingLibrary ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-[#2C666E]" />
                <span className="ml-2 text-sm text-gray-500">Loading library...</span>
              </div>
            ) : filteredLibraryItems.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No images found in library</p>
                <p className="text-xs text-gray-400 mt-1">Save images from Turnaround or Imagineer to see them here</p>
              </div>
            ) : (
              <>
                {selectedFolder !== null && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">{filteredLibraryItems.length} images in "{selectedFolder}"</span>
                    <button
                      type="button"
                      onClick={() => selectAllInFolder()}
                      className="text-xs text-[#2C666E] hover:underline font-medium"
                    >
                      Select all in folder
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {filteredLibraryItems.map(item => {
                    const isSelected = selectedLibraryIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleLibraryItem(item.id)}
                        className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-[#2C666E] ring-2 ring-[#2C666E]/20'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.title || ''}
                          className="w-full aspect-square object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#2C666E] flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                          <p className="text-[10px] text-white truncate">{item.title || 'Untitled'}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {libraryHasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadLibraryItems(false)}
                      disabled={loadingMoreLibrary}
                      className="px-6 text-xs border-gray-300"
                    >
                      {loadingMoreLibrary
                        ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Loading...</>
                        : 'Load More'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
            <Button variant="ghost" onClick={() => setShowLibraryBrowser(false)} className="text-gray-500">
              Cancel
            </Button>
            <Button
              onClick={handleImportFromLibrary}
              disabled={selectedLibraryIds.size === 0}
              className="bg-[#2C666E] hover:bg-[#07393C] text-white px-6"
            >
              Import {selectedLibraryIds.size > 0 ? `${selectedLibraryIds.size} Images` : ''}
            </Button>
          </div>
        </div>
      )}
    </SlideOverPanel>
  );
}
