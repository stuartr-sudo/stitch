import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Video,
  Image,
  Sparkles,
  Wand2,
  Edit3,
  Play,
  Download,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  Eraser,
  Focus,
  FolderOpen,
  Palette,
  Shirt
} from 'lucide-react';

import JumpStartModal from '@/components/modals/JumpStartModal';
import JumpStartVideoStudioModal from '@/components/modals/JumpStartVideoStudioModal';
import TripModal from '@/components/modals/TripModal';
import ImagineerModal from '@/components/modals/ImagineerModal';
import EditImageModal from '@/components/modals/EditImageModal';
import InpaintModal from '@/components/modals/InpaintModal';
import LensModal from '@/components/modals/LensModal';
import SmooshModal from '@/components/modals/SmooshModal';
import LibraryModal from '@/components/modals/LibraryModal';
import TryStyleModal from '@/components/modals/TryStyleModal';

/**
 * VideoAdvertCreator - Main page for creating video adverts
 * 
 * Features:
 * - Generate images with AI (Imagineer)
 * - Create videos from images (JumpStart)
 * - Edit existing videos (Video Studio)
 * - Restyle videos with AI (Trip)
 * - Manage created videos
 */
export default function VideoAdvertCreator() {
  const [activeModal, setActiveModal] = useState(null);
  const [createdVideos, setCreatedVideos] = useState([]);
  const [createdImages, setCreatedImages] = useState([]);
  const [selectedTab, setSelectedTab] = useState('create');

  // Handle new video created
  const handleVideoCreated = (videoUrl, title = null, source = null) => {
    const newVideo = {
      id: Date.now().toString(),
      url: videoUrl,
      title: title || `Video ${createdVideos.length + 1}`,
      createdAt: new Date().toISOString(),
      source: source || activeModal || 'unknown'
    };
    setCreatedVideos(prev => [newVideo, ...prev]);
    toast.success('Video added to your collection!');
    
    // Save to Supabase library
    fetch('/api/library/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: videoUrl,
        type: 'video',
        title: newVideo.title,
        source: newVideo.source,
      }),
    }).catch(err => console.warn('Failed to save video to library:', err));
  };

  // Handle new image created
  const handleImageCreated = async (params) => {
    try {
      toast.info('Generating image...');
      
      const response = await fetch('/api/imagineer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      if (data.imageUrl) {
        const newImage = {
          id: Date.now().toString(),
          url: data.imageUrl,
          prompt: params.prompt,
          createdAt: new Date().toISOString(),
        };
        setCreatedImages(prev => [newImage, ...prev]);
        toast.success('Image generated successfully!');
        
        // Save to Supabase library
        fetch('/api/library/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: data.imageUrl,
            type: 'image',
            title: 'Imagineer Image',
            prompt: params.prompt,
            source: 'imagineer',
          }),
        }).catch(err => console.warn('Failed to save image to library:', err));
      } else {
        toast.info('Image generation started. Check back in a moment.');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    }
  };

  // Delete video
  const handleDeleteVideo = (id) => {
    setCreatedVideos(prev => prev.filter(v => v.id !== id));
    toast.success('Video removed');
  };

  // Delete image
  const handleDeleteImage = (id) => {
    setCreatedImages(prev => prev.filter(i => i.id !== id));
    toast.success('Image removed');
  };

  // Download video
  const handleDownloadVideo = (video) => {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `${video.title || 'video'}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#2C666E] to-[#07393C] rounded-xl shadow-lg">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Stitch Video Advert Creator</h1>
                <p className="text-sm text-slate-500">Create stunning video ads with AI</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 mr-4">
                {createdVideos.length} videos • {createdImages.length} images
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="bg-white p-1 shadow-sm border">
            <TabsTrigger value="create" className="gap-2">
              <Sparkles className="w-4 h-4" /> Create
            </TabsTrigger>
            <TabsTrigger value="library" className="gap-2">
              <FolderOpen className="w-4 h-4" /> Library
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video className="w-4 h-4" /> Videos ({createdVideos.length})
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <Image className="w-4 h-4" /> Images ({createdImages.length})
            </TabsTrigger>
          </TabsList>

          {/* Create Tab */}
          <TabsContent value="create" className="space-y-6">
            {/* Image Tools */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-[#2C666E]" /> Image Tools
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Generate Image */}
                <div 
                  onClick={() => setActiveModal('imagineer')}
                  className="group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2C666E]/30"
                >
                  <div className="p-2 bg-gradient-to-br from-[#90DDF0]/30 to-[#2C666E]/20 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5 text-[#2C666E]" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Imagineer</h4>
                  <p className="text-xs text-slate-500">Generate images from text</p>
                </div>

                {/* Edit Image */}
                <div 
                  onClick={() => setActiveModal('editimage')}
                  className="group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2C666E]/30"
                >
                  <div className="p-2 bg-gradient-to-br from-[#2C666E]/20 to-[#07393C]/20 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                    <Palette className="w-5 h-5 text-[#2C666E]" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Edit Image</h4>
                  <p className="text-xs text-slate-500">AI-powered image editing</p>
                </div>

                {/* Inpaint */}
                <div 
                  onClick={() => setActiveModal('inpaint')}
                  className="group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2C666E]/30"
                >
                  <div className="p-2 bg-gradient-to-br from-[#90DDF0]/40 to-[#2C666E]/30 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                    <Eraser className="w-5 h-5 text-[#07393C]" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Inpaint</h4>
                  <p className="text-xs text-slate-500">Remove or replace objects</p>
                </div>

                {/* Smoosh */}
                <div 
                  onClick={() => setActiveModal('smoosh')}
                  className="group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2C666E]/30"
                >
                  <div className="p-2 bg-gradient-to-br from-[#2C666E]/30 to-[#07393C]/20 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                    <Layers className="w-5 h-5 text-[#2C666E]" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Smoosh</h4>
                  <p className="text-xs text-slate-500">Infinite canvas compositor</p>
                </div>

                {/* Lens */}
                <div 
                  onClick={() => setActiveModal('lens')}
                  className="group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2C666E]/30"
                >
                  <div className="p-2 bg-gradient-to-br from-[#90DDF0]/50 to-[#90DDF0]/30 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                    <Focus className="w-5 h-5 text-[#07393C]" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Lens</h4>
                  <p className="text-xs text-slate-500">Adjust viewing angles</p>
                </div>

                {/* Try Style */}
                <div 
                  onClick={() => setActiveModal('trystyle')}
                  className="group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2C666E]/30"
                >
                  <div className="p-2 bg-gradient-to-br from-[#2C666E]/30 to-[#07393C]/20 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                    <Shirt className="w-5 h-5 text-[#2C666E]" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Try Style</h4>
                  <p className="text-xs text-slate-500">Virtual clothing try-on</p>
                </div>
              </div>
            </div>

            {/* Video Tools */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-[#07393C]" /> Video Tools
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* JumpStart */}
                <div 
                  onClick={() => setActiveModal('jumpstart')}
                  className="group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#07393C]/30"
                >
                  <div className="p-2 bg-gradient-to-br from-[#90DDF0]/40 to-[#2C666E]/30 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 text-[#07393C]" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">JumpStart</h4>
                  <p className="text-xs text-slate-500">Image to video</p>
                </div>

                {/* Video Edit */}
                <div 
                  onClick={() => setActiveModal('videostudio')}
                  className="group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#90DDF0]/50"
                >
                  <div className="p-2 bg-gradient-to-br from-[#90DDF0]/50 to-[#90DDF0]/30 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                    <Edit3 className="w-5 h-5 text-[#2C666E]" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Video Studio</h4>
                  <p className="text-xs text-slate-500">Edit & extend videos</p>
                </div>

                {/* Trip */}
                <div 
                  onClick={() => setActiveModal('trip')}
                  className="group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2C666E]/40"
                >
                  <div className="p-2 bg-gradient-to-br from-[#2C666E]/20 to-[#07393C]/30 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                    <Wand2 className="w-5 h-5 text-[#07393C]" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Trip</h4>
                  <p className="text-xs text-slate-500">Restyle videos with AI</p>
                </div>

                {/* Library */}
                <div 
                  onClick={() => setActiveModal('library')}
                  className="group bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-[#2C666E]/30"
                >
                  <div className="p-2 bg-gradient-to-br from-[#2C666E]/10 to-[#07393C]/10 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-5 h-5 text-[#2C666E]" />
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1">Library</h4>
                  <p className="text-xs text-slate-500">Browse saved media</p>
                </div>
              </div>
            </div>

            {/* Quick Start Guide */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Quick Start Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#2C666E] rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-semibold mb-1">Generate Images</h4>
                    <p className="text-slate-300 text-sm">Create AI images using the Imagineer tool with detailed prompts</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#07393C] rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-semibold mb-1">Create Videos</h4>
                    <p className="text-slate-300 text-sm">Use JumpStart to turn your images into animated video ads</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#90DDF0] text-[#07393C] rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-semibold mb-1">Refine & Export</h4>
                    <p className="text-slate-300 text-sm">Edit, extend, or restyle your videos for the perfect result</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="h-[calc(100vh-200px)]">
            <div className="bg-white rounded-2xl border shadow-sm h-full overflow-hidden">
              <LibraryModal 
                isOpen={false}
                onClose={() => {}}
                isEmbedded={true}
                onSelect={(item) => {
                  if (item.type === 'video') {
                    handleVideoCreated(item.url || item.video_url, item.title);
                    toast.success('Video added to your collection!');
                  } else {
                    const newImage = {
                      id: Date.now().toString(),
                      url: item.url || item.image_url,
                      prompt: item.title || 'Library image',
                      createdAt: new Date().toISOString(),
                    };
                    setCreatedImages(prev => [newImage, ...prev]);
                    toast.success('Image added to your collection!');
                  }
                }}
              />
            </div>
          </TabsContent>

          {/* Videos Tab */}
          <TabsContent value="videos" className="space-y-6">
            {createdVideos.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border">
                <Video className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No videos yet</h3>
                <p className="text-slate-500 mb-6">Create your first video using the tools above</p>
                <Button onClick={() => { setSelectedTab('create'); setActiveModal('jumpstart'); }}>
                  <Plus className="w-4 h-4 mr-2" /> Create Your First Video
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {createdVideos.map(video => (
                  <div key={video.id} className="bg-white rounded-2xl overflow-hidden border shadow-sm group">
                    <div className="aspect-video bg-slate-900 relative">
                      <video 
                        src={video.url} 
                        className="w-full h-full object-contain"
                        controls
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white">
                        {video.source}
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold text-slate-900 mb-1">{video.title}</h4>
                      <p className="text-xs text-slate-500 mb-3">
                        Created {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-[#2C666E] hover:bg-[#07393C] text-white" onClick={() => handleDownloadVideo(video)}>
                          <Download className="w-4 h-4 mr-1" /> Download to Device
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={video.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteVideo(video.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images" className="space-y-6">
            {createdImages.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border">
                <Image className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No images yet</h3>
                <p className="text-slate-500 mb-6">Generate your first image using Imagineer</p>
                <Button onClick={() => { setSelectedTab('create'); setActiveModal('imagineer'); }}>
                  <Plus className="w-4 h-4 mr-2" /> Generate Your First Image
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {createdImages.map(image => (
                  <div key={image.id} className="bg-white rounded-2xl overflow-hidden border shadow-sm group">
                    <div className="aspect-square bg-slate-100 relative overflow-hidden">
                      <img 
                        src={image.url} 
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <a 
                          href={image.url} 
                          download={`stitch-image-${image.id}.png`}
                          className="inline-flex items-center justify-center w-8 h-8 text-sm font-medium text-slate-900 bg-white rounded-lg hover:bg-slate-100"
                          title="Download to Device"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <Button size="sm" variant="secondary" asChild title="Open in new tab">
                          <a href={image.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => { setSelectedTab('create'); setActiveModal('jumpstart'); }} title="Create video">
                          <Video className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteImage(image.id)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-slate-600 line-clamp-2">{image.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Modals */}
      <ImagineerModal 
        isOpen={activeModal === 'imagineer'} 
        onClose={() => setActiveModal(null)}
        onGenerate={handleImageCreated}
      />
      
      <JumpStartModal 
        isOpen={activeModal === 'jumpstart'} 
        onClose={() => setActiveModal(null)}
        onVideoGenerated={handleVideoCreated}
      />
      
      <JumpStartVideoStudioModal 
        isOpen={activeModal === 'videostudio'} 
        onClose={() => setActiveModal(null)}
        onInsert={handleVideoCreated}
      />
      
      <TripModal 
        isOpen={activeModal === 'trip'} 
        onClose={() => setActiveModal(null)}
        onInsert={handleVideoCreated}
      />

      <EditImageModal 
        isOpen={activeModal === 'editimage'} 
        onClose={() => setActiveModal(null)}
        onImageEdited={(url) => {
          const newImage = {
            id: Date.now().toString(),
            url,
            prompt: 'Edited image',
            createdAt: new Date().toISOString(),
          };
          setCreatedImages(prev => [newImage, ...prev]);
          toast.success('Image added!');
          
          // Save to Supabase library
          fetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'image', title: 'Edited Image', source: 'editimage' }),
          }).catch(err => console.warn('Failed to save to library:', err));
        }}
      />

      <InpaintModal 
        isOpen={activeModal === 'inpaint'} 
        onClose={() => setActiveModal(null)}
        onImageEdited={(url) => {
          const newImage = {
            id: Date.now().toString(),
            url,
            prompt: 'Inpainted image',
            createdAt: new Date().toISOString(),
          };
          setCreatedImages(prev => [newImage, ...prev]);
          toast.success('Image added!');
          
          // Save to Supabase library
          fetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'image', title: 'Inpainted Image', source: 'inpaint' }),
          }).catch(err => console.warn('Failed to save to library:', err));
        }}
      />

      <LensModal 
        isOpen={activeModal === 'lens'} 
        onClose={() => setActiveModal(null)}
        onImageEdited={(url) => {
          const newImage = {
            id: Date.now().toString(),
            url,
            prompt: 'Angle adjusted image',
            createdAt: new Date().toISOString(),
          };
          setCreatedImages(prev => [newImage, ...prev]);
          toast.success('Image added!');
          
          // Save to Supabase library
          fetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'image', title: 'Lens Adjusted Image', source: 'lens' }),
          }).catch(err => console.warn('Failed to save to library:', err));
        }}
      />

      <SmooshModal 
        isOpen={activeModal === 'smoosh'} 
        onClose={() => setActiveModal(null)}
        onImageGenerated={(url) => {
          const newImage = {
            id: Date.now().toString(),
            url,
            prompt: 'Canvas composition',
            createdAt: new Date().toISOString(),
          };
          setCreatedImages(prev => [newImage, ...prev]);
          toast.success('Image added!');
          
          // Save to Supabase library
          fetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'image', title: 'Smoosh Composition', source: 'smoosh' }),
          }).catch(err => console.warn('Failed to save to library:', err));
        }}
      />

      <LibraryModal 
        isOpen={activeModal === 'library'} 
        onClose={() => setActiveModal(null)}
        onSelect={(item) => {
          if (item.type === 'video') {
            handleVideoCreated(item.url || item.video_url);
          } else {
            const newImage = {
              id: Date.now().toString(),
              url: item.url || item.image_url,
              prompt: item.title || 'Library image',
              createdAt: new Date().toISOString(),
            };
            setCreatedImages(prev => [newImage, ...prev]);
          }
        }}
      />

      <TryStyleModal 
        isOpen={activeModal === 'trystyle'} 
        onClose={() => setActiveModal(null)}
        onImageGenerated={(url) => {
          const newImage = {
            id: Date.now().toString(),
            url,
            prompt: 'Virtual try-on result',
            createdAt: new Date().toISOString(),
          };
          setCreatedImages(prev => [newImage, ...prev]);
          toast.success('Try-on image added!');
          
          // Save to Supabase library  
          fetch('/api/library/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'image', title: 'Try Style Result', source: 'trystyle' }),
          }).catch(err => console.warn('Failed to save to library:', err));
        }}
      />
    </div>
  );
}
