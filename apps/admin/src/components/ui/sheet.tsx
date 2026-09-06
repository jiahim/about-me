'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) { return <DialogPrimitive.Overlay data-slot="sheet-overlay" className={cn('fixed inset-0 z-50 bg-black/50', className)} {...props} /> }

function SheetContent({ className, children, side = 'right', ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return <SheetPortal><SheetOverlay /><DialogPrimitive.Content data-slot="sheet-content" className={cn('fixed z-50 flex flex-col gap-4 bg-background shadow-lg', side === 'right' && 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm', side === 'left' && 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm', side === 'top' && 'inset-x-0 top-0 h-auto border-b', side === 'bottom' && 'inset-x-0 bottom-0 h-auto border-t', className)} {...props}>{children}<DialogPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 hover:opacity-100"><XIcon className="size-4" /><span className="sr-only">关闭</span></DialogPrimitive.Close></DialogPrimitive.Content></SheetPortal>
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5 p-4', className)} {...props} /> }
function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) { return <div data-slot="sheet-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} /> }
function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) { return <DialogPrimitive.Title data-slot="sheet-title" className={cn('font-semibold text-foreground', className)} {...props} /> }
function SheetDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) { return <DialogPrimitive.Description data-slot="sheet-description" className={cn('text-sm text-muted-foreground', className)} {...props} /> }

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger }
