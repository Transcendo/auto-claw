import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { OpenClawKeyValueRow as KeyValueRow } from '@/types/openclaw'
import { EditorDialog } from './editor-dialog'
import { KeyValueTableEditor } from './key-value-table-editor'

export type { KeyValueRow }

type KeyValueEditorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  rows: KeyValueRow[]
  onApply: (rows: KeyValueRow[]) => void
  isSaving?: boolean
}

export function KeyValueEditorDialog({
  open,
  onOpenChange,
  title,
  description,
  rows,
  onApply,
  isSaving = false,
}: KeyValueEditorDialogProps) {
  const [draftRows, setDraftRows] = useState<KeyValueRow[]>(rows)

  const applyRows = () => {
    onApply(
      draftRows.filter(
        (row) => row.key.trim() !== '' || row.value.trim() !== ''
      )
    )
  }

  return (
    <EditorDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setDraftRows(rows)
        onOpenChange(nextOpen)
      }}
      title={title}
      description={description}
      size='lg'
      footer={
        <>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type='button' onClick={applyRows} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <KeyValueTableEditor
        rows={draftRows}
        onChange={setDraftRows}
        isSaving={isSaving}
      />
    </EditorDialog>
  )
}
