import type { ReactNode } from 'react'
import { FormFieldLayout } from './form-field-layout'

type DetailFormRowProps = {
  label: string
  description?: string
  className?: string
  contentClassName?: string
  labelClassName?: string
  children: ReactNode
}

export function DetailFormRow({
  label,
  description,
  className,
  contentClassName,
  labelClassName,
  children,
}: DetailFormRowProps) {
  return (
    <FormFieldLayout
      variant='detail'
      label={label}
      description={description}
      className={className}
      contentClassName={contentClassName}
      labelClassName={labelClassName}
    >
      {children}
    </FormFieldLayout>
  )
}
