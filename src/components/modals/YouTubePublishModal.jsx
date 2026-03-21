import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Youtube, Loader2, Upload } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function YouTubePublishModal({ draftId, brandUsername, campaignName, scriptText, onClose, onPublished }) {
  const [ytStatus, setYtStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState((campaignName || '').slice(0, 100));
  const [description, setDescription] = useState(
    (scriptText || '').slice(0, 200) + (scriptText?.length > 200 ? '...' : '') + '\n\nMade with Stitch Studios'
  );
  const [tags, setTags] = useState('');
  const [privacy, setPrivacy] = useState('unlisted');

  useEffect(() => {
    if (!brandUsername) { setLoading(false); return; }
    apiFetch(`/api/youtube/status?brand_username=${encodeURIComponent(brandUsername)}`)
      .then(r => r.json())
      .then(d => { setYtStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [brandUsername]);

  const handleUpload = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setUploading(true);
    try {
      const res = await apiFetch('/api/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_id: draftId,
          brand_username: brandUsername,
          title: title.trim(),
          description: description.trim(),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          privacy,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Uploaded to YouTube!');
      if (data.youtube_url) {
        toast.info(`Video: ${data.youtube_url}`, { duration: 8000 });
      }
      onPublished?.(data);
      onClose();
    } catch (err) {
      toast.error(err.message || 'YouTube upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-slate-900">Publish to YouTube</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : !ytStatus?.connected ? (
          <div className="p-6 text-center space-y-3">
            <Youtube className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600">YouTube not connected for this brand.</p>
            <p className="text-xs text-slate-400">Connect your YouTube channel in Brand Kit first.</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-500">
              Publishing to <strong>{ytStatus.channel_title || ytStatus.channel_id}</strong>
            </p>

            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="text-amber-600 text-xs">AI</span>
              <p className="text-xs text-amber-700">This video will be labeled as AI-generated content on YouTube</p>
            </div>

            <div>
              <Label className="text-sm text-slate-700">Title</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, 100))}
                placeholder="Video title"
                className="mt-1"
                maxLength={100}
              />
              <p className="text-[10px] text-slate-400 mt-0.5 text-right">{title.length}/100</p>
            </div>

            <div>
              <Label className="text-sm text-slate-700">Description</Label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Video description..."
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1 h-24 resize-none"
              />
            </div>

            <div>
              <Label className="text-sm text-slate-700">Tags (comma-separated)</Label>
              <Input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="ai, tech, news"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm text-slate-700">Visibility</Label>
              <select
                value={privacy}
                onChange={e => setPrivacy(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              >
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {ytStatus?.connected && (
            <Button
              onClick={handleUpload}
              disabled={uploading || !title.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? 'Uploading...' : 'Upload to YouTube'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
