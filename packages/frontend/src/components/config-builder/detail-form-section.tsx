import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AdvancedSection } from './advanced-section'

type DetailFormSectionProps = {
  advancedOpen: boolean
  onAdvancedOpenChange: (open: boolean) => void
  className?: string
  children: ReactNode
  advancedChildren?: ReactNode
}

export function DetailFormSection({
  advancedOpen,
  onAdvancedOpenChange,
  className,
  children,
  advancedChildren,
}: DetailFormSectionProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {children}
      {advancedChildren ? (
        <AdvancedSection
          open={advancedOpen}
          onOpenChange={onAdvancedOpenChange}
        >
          {advancedChildren}
        </AdvancedSection>
      ) : null}
    </div>
  )
}
