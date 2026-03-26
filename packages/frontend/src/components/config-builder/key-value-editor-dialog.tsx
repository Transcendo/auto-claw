import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EditorDialog } from './editor-dialog'

type KeyValueRow = {
  key: string
  value: string
}

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
      <div className='space-y-4'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-1/2'>Key</TableHead>
              <TableHead className='w-1/2'>Value</TableHead>
              <TableHead className='w-[72px]' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {draftRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className='py-6 text-center text-sm text-muted-foreground'
                >
                  No entries yet.
                </TableCell>
              </TableRow>
            )}
            {draftRows.map((row, index) => (
              <TableRow key={`${index}-${row.key}`}>
                <TableCell>
                  <Input
                    value={row.key}
                    onChange={(event) => {
                      const nextRows = [...draftRows]
                      nextRows[index] = {
                        ...nextRows[index],
                        key: event.target.value,
                      }
                      setDraftRows(nextRows)
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={row.value}
                    onChange={(event) => {
                      const nextRows = [...draftRows]
                      nextRows[index] = {
                        ...nextRows[index],
                        value: event.target.value,
                      }
                      setDraftRows(nextRows)
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                  onClick={() =>
                    setDraftRows((currentRows) =>
                      currentRows.filter((_, rowIndex) => rowIndex !== index)
                    )
                  }
                  disabled={isSaving}
                >
                  <Trash2 className='size-4' />
                </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button
          type='button'
          variant='outline'
          className='gap-2'
          onClick={() =>
            setDraftRows((currentRows) => [
              ...currentRows,
              { key: '', value: '' },
            ])
          }
          disabled={isSaving}
        >
          <Plus className='size-4' />
          Add row
        </Button>
      </div>
    </EditorDialog>
  )
}
