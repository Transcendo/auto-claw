import { Children, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type EntityGridProps = {
  children?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

export function EntityGrid({
  children,
  emptyTitle = 'No items yet',
  emptyDescription,
  className,
}: EntityGridProps) {
  const hasChildren = Children.count(children) > 0

  if (!hasChildren) {
    return (
      <div className='rounded-xl border border-dashed border-border/70 px-4 py-8 text-center'>
        <p className='text-sm font-medium'>{emptyTitle}</p>
        {emptyDescription && (
          <p className='mt-1 text-sm text-muted-foreground'>{emptyDescription}</p>
        )}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {children}
    </div>
  )
}
