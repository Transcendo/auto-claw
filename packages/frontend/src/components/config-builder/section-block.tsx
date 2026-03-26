import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SectionBlockProps = {
  title: string
  description?: string
  summary?: ReactNode
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function SectionBlock({
  title,
  description,
  summary,
  actions,
  className,
  children,
}: SectionBlockProps) {
  return (
    <section
      className={cn(
        'space-y-4 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-xs sm:p-5',
        className
      )}
    >
      <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold tracking-tight'>{title}</h2>
          {description && (
            <p className='text-sm leading-6 text-muted-foreground'>{description}</p>
          )}
          {summary && <div className='text-xs text-muted-foreground'>{summary}</div>}
        </div>
        {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
      </div>
      <div className='space-y-4'>{children}</div>
    </section>
  )
}
