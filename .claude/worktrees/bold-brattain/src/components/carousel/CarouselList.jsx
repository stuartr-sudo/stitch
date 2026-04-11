import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, LayoutGrid, Trash2, Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import CarouselCreateModal from './CarouselCreateModal';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  generating: 'bg-purple-50 text-purple-700',
  ready: 'bg-green-50 text-green-700',
  published: 'bg-blue-50 text-blue-700',
  failed: 'bg-red-50 text-red-700',
};

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CarouselList() {
  const navigate = useNavigate();
  const [carousels, setCarousels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadCarousels();
  }, []);

  async function loadCarousels() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/carousel');
      const data = await res.json();
      if (!data.error) setCarousels(data.carousels || []);
    } catch (err) {
      toast.error('Failed to load carousels');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(id);
    try {
      await apiFetch(`/api/carousel/${id}`, { method: 'DELETE' });
      setCarousels(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      toast.error('Failed to delete carousel');
    } finally {
      setDeleting(null);
    }
  }

  async function handleCreated(carousel) {
    setShowCreate(false);
    navigate(`/carousels/${carousel.id}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Carousels</h1>
            <p className="text-sm text-gray-500 mt-1">Create branded carousel posts for social media</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Carousel
        </Button>
      </div>

      {carousels.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No carousels yet</h3>
          <p className="text-sm text-gray-400 mb-6">Create your first carousel from a blog post or topic</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Carousel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {carousels.map(c => {
            const firstSlide = c.carousel_slides?.sort((a, b) => a.slide_number - b.slide_number)[0];
            const thumbUrl = firstSlide?.composed_image_url;

            return (
              <div
                key={c.id}
                onClick={() => navigate(`/carousels/${c.id}`)}
                className="group border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {thumbUrl ? (
                    <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-200" />
                    </div>
                  )}
                  {/* Platform badge */}
                  <span className="absolute top-3 left-3 px-2 py-0.5 text-xs font-medium bg-black/60 text-white rounded-full">
                    {PLATFORM_LABELS[c.platform] || c.platform}
                  </span>
                  {/* Status badge */}
                  <span className={`absolute top-3 right-3 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[c.status] || STATUS_COLORS.draft}`}>
                    {c.status}
                  </span>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate">{c.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {c.slide_count || c.carousel_slides?.length || 0} slides - {c.aspect_ratio} - {timeAgo(c.updated_at || c.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, c.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      {deleting === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CarouselCreateModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
