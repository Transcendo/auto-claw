import { Button } from '@/components/ui/button'
import type { OpenClawKeyValueRow } from '@/types/openclaw'
import { KeyValueTableEditor } from './key-value-table-editor'

type KeyValueInlineEditorProps = {
  title: string
  description?: string
  rows: OpenClawKeyValueRow[]
  onChange: (rows: OpenClawKeyValueRow[]) => void
  onSave: () => void
  isSaving?: boolean
}

export function KeyValueInlineEditor({
  title,
  description,
  rows,
  onChange,
  onSave,
  isSaving = false,
}: KeyValueInlineEditorProps) {
  return (
    <div className='space-y-4 rounded-xl border border-border/60 bg-background/70 p-4'>
      <div className='space-y-1'>
        <h2 className='text-lg font-semibold tracking-tight'>{title}</h2>
        {description && (
          <p className='text-sm text-muted-foreground'>{description}</p>
        )}
      </div>
      <KeyValueTableEditor
        rows={rows}
        onChange={onChange}
        isSaving={isSaving}
      />
      <div className='flex justify-end'>
        <Button type='button' onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
