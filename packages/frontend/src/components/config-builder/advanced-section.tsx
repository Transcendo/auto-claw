import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

type AdvancedSectionProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
  children: React.ReactNode
}

export function AdvancedSection({
  open,
  onOpenChange,
  className,
  children,
}: AdvancedSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className={className}>
      <CollapsibleTrigger
        type='button'
        className='group flex w-full items-center gap-4 pt-5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none'
      >
        <span className='h-px flex-1 bg-border/70 transition-colors group-hover:bg-border' />
        <span className='inline-flex items-center gap-2 text-sm font-medium'>
          <span>Advance</span>
          <ChevronRight
            className={cn(
              'size-4 transition-transform duration-200',
              open && 'rotate-90'
            )}
          />
        </span>
        <span className='h-px flex-1 bg-border/70 transition-colors group-hover:bg-border' />
      </CollapsibleTrigger>
      <CollapsibleContent className='space-y-4 pt-4'>
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
