import { type ReactNode, useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CompactFormSection } from '@/components/config-builder'
import { formatFieldLabel } from '../../utils'

type SchemaFieldShellProps = {
  path: string
  label?: string
  description?: string
  required?: boolean
  depth: number
  layout: 'default' | 'compact'
  compactFieldLayout?: 'stacked' | 'inline'
  descriptionMode: 'inline' | 'tooltip'
  action?: ReactNode
  children: ReactNode
}

export function SchemaFieldShell({
  path,
  label,
  description,
  required,
  depth,
  layout,
  compactFieldLayout = 'stacked',
  descriptionMode,
  action,
  children,
}: SchemaFieldShellProps) {
  const resolvedLabel = formatFieldLabel(label, path)

  if (layout === 'compact') {
    return (
      <div
        className={cn(
          depth > 0 && 'border-b border-border/50 last:border-b-0',
          depth === 0 && 'space-y-1'
        )}
      >
        <CompactFormSection
          label={resolvedLabel}
          description={descriptionMode === 'tooltip' ? description : undefined}
          required={required}
          action={action}
          layout={compactFieldLayout}
          className='py-2'
        >
          {descriptionMode === 'inline' && description && (
            <p className='mb-2 text-sm leading-6 text-muted-foreground'>
              {description}
            </p>
          )}
          {children}
        </CompactFormSection>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'space-y-3 rounded-xl border border-border/60 bg-card/50 p-4',
        depth === 0 && 'border-0 bg-transparent p-0'
      )}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <Label className='text-sm font-semibold'>{resolvedLabel}</Label>
            {required && <Badge variant='secondary'>Required</Badge>}
          </div>
          {description && (
            <p className='text-sm leading-6 text-muted-foreground'>
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

type SchemaDynamicObjectEntryProps = {
  entryKey: string
  layout: 'default' | 'compact'
  children: ReactNode
  onRemove: () => void
  onRename: (nextKey: string) => void
}

export function SchemaDynamicObjectEntry({
  entryKey,
  layout,
  children,
  onRemove,
  onRename,
}: SchemaDynamicObjectEntryProps) {
  const [draftKey, setDraftKey] = useState(entryKey)

  useEffect(() => {
    setDraftKey(entryKey)
  }, [entryKey])

  const handleCommitRename = () => {
    const trimmed = draftKey.trim()
    if (trimmed && trimmed !== entryKey) {
      onRename(trimmed)
      return
    }

    setDraftKey(entryKey)
  }

  return (
    <div
      className={cn(
        'space-y-3 rounded-xl border border-border/60 bg-background/70 p-4',
        layout === 'compact' && 'rounded-none border-0 bg-transparent p-0'
      )}
    >
      <div className='flex items-center gap-3'>
        <Input
          value={draftKey}
          onChange={(event) => setDraftKey(event.target.value)}
          onBlur={handleCommitRename}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleCommitRename()
            }
          }}
          className='font-medium'
        />
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={onRemove}
          aria-label='Remove item'
        >
          <Trash2 className='size-4' />
        </Button>
      </div>
      {children}
    </div>
  )
}
