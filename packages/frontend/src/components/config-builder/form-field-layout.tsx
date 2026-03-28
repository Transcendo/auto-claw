import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { FieldHelpTooltip } from './field-help-tooltip'

type FormFieldLayoutProps = {
  label: string
  description?: string
  required?: boolean
  action?: ReactNode
  variant: 'detail' | 'compact-stacked' | 'compact-inline'
  className?: string
  contentClassName?: string
  labelClassName?: string
  headerClassName?: string
  children: ReactNode
}

function formatDisplayLabel(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 1) {
        return word.toUpperCase()
      }

      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

export function FormFieldLayout({
  label,
  description,
  required = false,
  action,
  variant,
  className,
  contentClassName,
  labelClassName,
  headerClassName,
  children,
}: FormFieldLayoutProps) {
  const labelNode = (
    <div
      className={cn(
        variant === 'detail'
          ? 'flex items-center gap-2 text-sm font-medium text-foreground'
          : 'flex min-w-0 items-center gap-2 text-sm font-medium text-foreground',
        labelClassName
      )}
    >
      <Label
        className={cn(
          variant !== 'detail' && 'text-sm font-medium text-foreground'
        )}
      >
        {formatDisplayLabel(label)}
      </Label>
      {required && variant !== 'detail' && (
        <Badge variant='outline' className='rounded-full px-2 py-0 text-[10px]'>
          Required
        </Badge>
      )}
      <FieldHelpTooltip content={description} />
    </div>
  )

  if (variant === 'detail') {
    return (
      <div
        className={cn(
          'grid gap-3 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center',
          className
        )}
      >
        {labelNode}
        <div className={cn('min-w-0', contentClassName)}>{children}</div>
      </div>
    )
  }

  if (variant === 'compact-inline') {
    return (
      <div className={cn('py-3', className)}>
        <div
          className={cn(
            'grid gap-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center',
            headerClassName
          )}
        >
          {labelNode}
          <div className='flex min-w-0 items-center gap-2'>
            {action}
            <div className={cn('min-w-0 flex-1', contentClassName)}>
              {children}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2 py-3', className)}>
      <div
        className={cn(
          'flex flex-wrap items-start justify-between gap-3',
          headerClassName
        )}
      >
        {labelNode}
        {action}
      </div>
      <div className={cn('min-w-0', contentClassName)}>{children}</div>
    </div>
  )
}
