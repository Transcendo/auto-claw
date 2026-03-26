import type { ComponentProps, ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type EntityBadge = {
  label: string
  variant?: ComponentProps<typeof Badge>['variant']
}

type EntityCardProps = {
  title: string
  subtitle?: string
  description?: string
  meta?: string[]
  badges?: EntityBadge[]
  onClick?: () => void
  actions?: ReactNode
  className?: string
}

export function EntityCard({
  title,
  subtitle,
  description,
  meta = [],
  badges = [],
  onClick,
  actions,
  className,
}: EntityCardProps) {
  const body = (
    <>
      <div className='space-y-2'>
        <div className='space-y-1'>
          <div className='truncate text-sm font-semibold'>{title}</div>
          {subtitle && (
            <div className='truncate text-xs text-muted-foreground'>{subtitle}</div>
          )}
        </div>
        {badges.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {badges.map(badge => (
              <Badge
                key={`${badge.label}-${badge.variant ?? 'default'}`}
                variant={badge.variant ?? 'secondary'}
                className='rounded-full px-2 py-0 text-[10px]'
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        )}
        {description && (
          <p className='line-clamp-2 text-xs leading-5 text-muted-foreground'>
            {description}
          </p>
        )}
        {meta.length > 0 && (
          <div className='space-y-1'>
            {meta.map(item => (
              <div key={item} className='truncate text-xs text-muted-foreground'>
                {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/70 bg-background shadow-xs transition-colors',
        onClick && 'hover:border-border hover:bg-accent/20',
        className
      )}
    >
      {onClick
        ? (
            <button
              type='button'
              onClick={onClick}
              className='block w-full px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
            >
              {body}
            </button>
          )
        : (
            <div className='px-4 py-3'>{body}</div>
          )}
      {actions && (
        <div className='flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-3'>
          {actions}
        </div>
      )}
    </div>
  )
}
