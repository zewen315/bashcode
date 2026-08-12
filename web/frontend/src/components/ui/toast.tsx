"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitive.Provider
const useToastManager = ToastPrimitive.useToastManager

function ToastList() {
  const { toasts } = useToastManager()
  return toasts.map((toast) => (
    <ToastPrimitive.Root
      key={toast.id}
      toast={toast}
      data-slot="toast"
      className={cn(
        "absolute right-0 bottom-0 left-auto z-[calc(100-var(--toast-index))] mr-0 w-72 rounded-lg bg-popover p-3 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 transition-all select-none",
        "[transform:translateX(var(--toast-swipe-move-x,0))_translateY(calc(var(--toast-offset-y)*-1))] [scale:calc(1-var(--toast-index)*0.05)]",
        "data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        "data-[limited]:opacity-0"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {toast.title && (
            <ToastPrimitive.Title data-slot="toast-title" className="font-medium" />
          )}
          {toast.description && (
            <ToastPrimitive.Description data-slot="toast-description" className="text-muted-foreground" />
          )}
        </div>
        <ToastPrimitive.Close
          data-slot="toast-close"
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </ToastPrimitive.Close>
      </div>
    </ToastPrimitive.Root>
  ))
}

function Toaster() {
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        className="fixed right-4 bottom-4 z-50 w-72"
      >
        <ToastList />
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

export { ToastProvider, Toaster, useToastManager }
