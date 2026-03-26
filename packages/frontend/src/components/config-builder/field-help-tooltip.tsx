import { CircleHelp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type FieldHelpTooltipProps = {
  content?: string
  className?: string
}

export function FieldHelpTooltip({
  content,
  className,
}: FieldHelpTooltipProps) {
  if (!content) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          className={cn(
            'inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            className
          )}
          aria-label='Show field help'
        >
          <CircleHelp className='size-3.5' />
        </button>
      </TooltipTrigger>
      <TooltipContent className='max-w-sm px-3 py-2 text-left leading-5' sideOffset={6}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
