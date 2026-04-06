import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

export function ReviewPanel({ open, onOpenChange, children }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-300" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 w-[600px] max-w-[95vw] bg-slate-900 border-r border-slate-700 shadow-2xl data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left duration-300 flex flex-col"
          onPointerDownOutside={(e) => {
            const target = e.detail?.originalEvent?.target || e.target;
            if (
              target?.closest?.('.fixed.bottom-6') ||
              target?.closest?.('[data-sonner-toast]') ||
              target?.closest?.('[role="status"]')
            ) {
              e.preventDefault();
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">Review Requests</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
