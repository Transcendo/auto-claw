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
import type { OpenClawKeyValueRow } from '@/types/openclaw'

type KeyValueTableEditorProps = {
  rows: OpenClawKeyValueRow[]
  onChange: (rows: OpenClawKeyValueRow[]) => void
  isSaving?: boolean
}

export function KeyValueTableEditor({
  rows,
  onChange,
  isSaving = false,
}: KeyValueTableEditorProps) {
  return (
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
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={3}
                className='py-6 text-center text-sm text-muted-foreground'
              >
                No entries yet.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row, index) => (
            <TableRow key={`${index}-${row.key}`}>
              <TableCell>
                <Input
                  value={row.key}
                  onChange={(event) => {
                    const nextRows = [...rows]
                    nextRows[index] = {
                      ...nextRows[index],
                      key: event.target.value,
                    }
                    onChange(nextRows)
                  }}
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.value}
                  onChange={(event) => {
                    const nextRows = [...rows]
                    nextRows[index] = {
                      ...nextRows[index],
                      value: event.target.value,
                    }
                    onChange(nextRows)
                  }}
                />
              </TableCell>
              <TableCell>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() =>
                    onChange(rows.filter((_, rowIndex) => rowIndex !== index))
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
          onChange([...rows, { key: '', value: '' }])
        }
        disabled={isSaving}
      >
        <Plus className='size-4' />
        Add row
      </Button>
    </div>
  )
}
