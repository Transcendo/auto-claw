import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type DetailPageShellProps = {
  title: string
  description?: string
  backLabel?: string
  onBack?: () => void
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function DetailPageShell({
  title,
  description,
  backLabel = 'Back',
  onBack,
  actions,
  className,
  children,
}: DetailPageShellProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className='space-y-3'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='space-y-1'>
            {onBack && (
              <Button
                type='button'
                variant='ghost'
                className='h-auto px-0 text-muted-foreground'
                onClick={onBack}
              >
                <ChevronLeft className='size-4' />
                {backLabel}
              </Button>
            )}
            <h2 className='text-xl font-semibold tracking-tight'>{title}</h2>
            {description && (
              <p className='text-sm text-muted-foreground'>{description}</p>
            )}
          </div>
          {actions && (
            <div className='flex flex-wrap items-center gap-2'>{actions}</div>
          )}
        </div>
      </div>
      <div className='space-y-5'>{children}</div>
    </div>
  )
}
