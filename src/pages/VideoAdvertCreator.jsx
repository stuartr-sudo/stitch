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
  ExternalLink
} from 'lucide-react';

import JumpStartModal from '@/components/modals/JumpStartModal';
import JumpStartVideoStudioModal from '@/components/modals/JumpStartVideoStudioModal';
import TripModal from '@/components/modals/TripModal';
import ImagineerModal from '@/components/modals/ImagineerModal';

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
  const handleVideoCreated = (videoUrl) => {
    const newVideo = {
      id: Date.now().toString(),
      url: videoUrl,
      title: `Video ${createdVideos.length + 1}`,
      createdAt: new Date().toISOString(),
      source: activeModal || 'unknown'
    };
    setCreatedVideos(prev => [newVideo, ...prev]);
    toast.success('Video added to your collection!');
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
            <TabsTrigger value="videos" className="gap-2">
              <Video className="w-4 h-4" /> Videos ({createdVideos.length})
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <Image className="w-4 h-4" /> Images ({createdImages.length})
            </TabsTrigger>
          </TabsList>

          {/* Create Tab */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Generate Image Card */}
              <div 
                onClick={() => setActiveModal('imagineer')}
                className="group bg-white rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-all cursor-pointer hover:border-[#2C666E]/30"
              >
                <div className="p-3 bg-gradient-to-br from-[#90DDF0]/30 to-[#2C666E]/20 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6 text-[#2C666E]" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">Generate Image</h3>
                <p className="text-sm text-slate-500 mb-4">Create stunning images from text with AI</p>
                <Button className="w-full bg-[#2C666E] hover:bg-[#07393C]">
                  <Sparkles className="w-4 h-4 mr-2" /> Create Image
                </Button>
              </div>

              {/* Image to Video Card */}
              <div 
                onClick={() => setActiveModal('jumpstart')}
                className="group bg-white rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-all cursor-pointer hover:border-[#07393C]/30"
              >
                <div className="p-3 bg-gradient-to-br from-[#90DDF0]/40 to-[#2C666E]/30 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                  <Video className="w-6 h-6 text-[#07393C]" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">Image to Video</h3>
                <p className="text-sm text-slate-500 mb-4">Transform images into animated videos</p>
                <Button className="w-full bg-[#07393C] hover:bg-[#0A090C]">
                  <Play className="w-4 h-4 mr-2" /> Create Video
                </Button>
              </div>

              {/* Video Edit/Extend Card */}
              <div 
                onClick={() => setActiveModal('videostudio')}
                className="group bg-white rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-all cursor-pointer hover:border-[#90DDF0]/50"
              >
                <div className="p-3 bg-gradient-to-br from-[#90DDF0]/50 to-[#90DDF0]/30 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                  <Edit3 className="w-6 h-6 text-[#2C666E]" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">Edit & Extend</h3>
                <p className="text-sm text-slate-500 mb-4">Modify or extend existing videos</p>
                <Button className="w-full bg-[#2C666E] hover:bg-[#07393C]">
                  <Edit3 className="w-4 h-4 mr-2" /> Edit Video
                </Button>
              </div>

              {/* Video Restyle Card */}
              <div 
                onClick={() => setActiveModal('trip')}
                className="group bg-white rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-all cursor-pointer hover:border-[#2C666E]/40"
              >
                <div className="p-3 bg-gradient-to-br from-[#2C666E]/20 to-[#07393C]/30 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform">
                  <Wand2 className="w-6 h-6 text-[#07393C]" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-2">Restyle Video</h3>
                <p className="text-sm text-slate-500 mb-4">Transform video style with AI</p>
                <Button className="w-full bg-gradient-to-r from-[#2C666E] to-[#07393C] hover:from-[#07393C] hover:to-[#0A090C]">
                  <Wand2 className="w-4 h-4 mr-2" /> Restyle
                </Button>
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
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownloadVideo(video)}>
                          <Download className="w-4 h-4 mr-1" /> Download
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
                        <Button size="sm" variant="secondary" asChild>
                          <a href={image.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => { setSelectedTab('create'); setActiveModal('jumpstart'); }}>
                          <Video className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteImage(image.id)}>
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
    </div>
  );
}
