import type { ReactNode } from 'react'
import { FormFieldLayout } from './form-field-layout'

type CompactFormSectionProps = {
  label: string
  description?: string
  required?: boolean
  action?: ReactNode
  layout?: 'stacked' | 'inline'
  className?: string
  contentClassName?: string
  headerClassName?: string
  children: ReactNode
}

export function CompactFormSection({
  label,
  description,
  required = false,
  action,
  layout = 'stacked',
  className,
  contentClassName,
  headerClassName,
  children,
}: CompactFormSectionProps) {
  return (
    <FormFieldLayout
      variant={layout === 'inline' ? 'compact-inline' : 'compact-stacked'}
      label={label}
      description={description}
      required={required}
      action={action}
      className={className}
      contentClassName={contentClassName}
      headerClassName={headerClassName}
    >
      {children}
    </FormFieldLayout>
  )
}
