import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

/**
 * LoadingModal - Shows progress for AI operations
 */
const LoadingModal = ({ isOpen, message = 'Processing...', progress = null }) => {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden z-[200]" 
        aria-describedby="loading-description"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="sr-only">
          <DialogTitle>Loading</DialogTitle>
        </div>
        <DialogDescription id="loading-description" className="sr-only">
          Please wait while we process your request
        </DialogDescription>
        <div className="flex flex-col items-center justify-center space-y-4 py-6 pointer-events-none">
          <Loader2 className="h-12 w-12 animate-spin text-[#2C666E]" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">{message}</p>
            {progress !== null && (
              <p className="mt-2 text-sm text-gray-500">{Math.round(progress)}%</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoadingModal;
