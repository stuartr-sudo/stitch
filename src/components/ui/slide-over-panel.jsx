"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const SlideOverPanel = React.forwardRef(({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  width,
  className,
  children,
}, ref) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-300"
      />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl outline-none",
          "w-[95vw] sm:w-[75vw] md:w-[65vw] max-w-[1200px]",
          "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
          "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
          "duration-300",
          className
        )}
        style={width ? { width } : undefined}
      >
        {/* Fixed header */}
        <div className="flex-shrink-0 px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#2C666E] to-[#07393C] text-white shadow-sm">
                  {icon}
                </div>
              )}
              <div>
                <DialogPrimitive.Title className="text-lg font-semibold text-slate-900">
                  {title}
                </DialogPrimitive.Title>
                {subtitle && (
                  <DialogPrimitive.Description className="text-sm text-slate-500 mt-0.5">
                    {subtitle}
                  </DialogPrimitive.Description>
                )}
              </div>
            </div>
            <DialogPrimitive.Close className="rounded-lg p-2 hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
        </div>

        {/* Content area — children manage their own scrolling */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
))
SlideOverPanel.displayName = "SlideOverPanel"

const SlideOverBody = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1 overflow-y-auto", className)} {...props}>
    {children}
  </div>
))
SlideOverBody.displayName = "SlideOverBody"

const SlideOverFooter = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex-shrink-0 px-5 py-3 border-t bg-white", className)} {...props}>
    {children}
  </div>
))
SlideOverFooter.displayName = "SlideOverFooter"

export { SlideOverPanel, SlideOverBody, SlideOverFooter }
