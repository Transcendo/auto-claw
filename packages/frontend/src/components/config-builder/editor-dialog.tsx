import type { ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const dialogSizeClassName = {
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-6xl',
} as const

type EditorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: keyof typeof dialogSizeClassName
  footer?: ReactNode
  children: ReactNode
}

export function EditorDialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'xl',
  footer,
  children,
}: EditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[90vh] gap-0 overflow-hidden p-0',
          dialogSizeClassName[size]
        )}
      >
        <DialogHeader className='border-b border-border/60 px-6 py-4'>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className='max-h-[calc(90vh-8rem)]'>
          <div className='px-6 py-4'>{children}</div>
        </ScrollArea>
        {footer && (
          <DialogFooter className='border-t border-border/60 px-6 py-4'>
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
