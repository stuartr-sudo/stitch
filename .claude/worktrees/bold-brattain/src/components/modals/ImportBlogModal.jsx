import React, { useState } from 'react';
import { Link2, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ImportBlogModal({ isOpen, onClose, onImport }) {
  const [url, setUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [step, setStep] = useState(1); // 1: input, 2: processing, 3: success

  const handleImport = async () => {
    if (!url) {
      toast.error('Please enter a valid URL');
      return;
    }
    
    setIsImporting(true);
    setStep(2);
    
    // Simulate scraping and parsing with Firecrawl/etc.
    await new Promise(r => setTimeout(r, 2500));
    
    setIsImporting(false);
    setStep(3);
    toast.success('Blog post parsed successfully!');
    
    setTimeout(() => {
      onImport({
        title: 'Extracted Blog Title',
        url: url,
        content: 'This is the mocked extracted content from the blog post...',
      });
      onClose();
      setStep(1);
      setUrl('');
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#90DDF0]" />
            Import Blog Post
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {step === 1 && (
            <>
              <p className="text-sm text-slate-400">
                Enter a blog post or article URL. We will extract its content and generate a starting point for your video.
              </p>
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-slate-500 absolute ml-3" />
                <Input
                  autoFocus
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourblog.com/article..."
                  className="pl-9 bg-slate-800 border-slate-700 text-white h-10"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancel</Button>
                <Button onClick={handleImport} disabled={!url} className="bg-[#2C666E] hover:bg-[#07393C] text-white">
                  Import Content
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#90DDF0]" />
              <p className="text-sm text-slate-300 font-medium">Scraping and analyzing content...</p>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <p className="text-sm text-green-400 font-medium">Content Ready!</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
