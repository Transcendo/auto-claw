import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ensureModelOption,
  normalizeModelSelectionValue,
  type ModelSelectOption,
} from '@/lib/model-select'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

type ModelMultiSelectFieldProps = {
  options: ModelSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

export function ModelMultiSelectField({
  options,
  value,
  onChange,
  placeholder = 'Select models',
}: ModelMultiSelectFieldProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const mergedOptions = useMemo(() => {
    const nextOptions = [...options]
    for (const item of value) {
      if (!item.trim()) {
        continue
      }

      const option = ensureModelOption(item, nextOptions)
      if (!nextOptions.some((entry) => entry.value === option.value)) {
        nextOptions.unshift(option)
      }
    }
    return nextOptions
  }, [options, value])

  const selectedLabels = value.map((item) => {
    return mergedOptions.find((option) => option.value === item)?.label ?? item
  })
  const createValue = normalizeModelSelectionValue(query, options)
  const canCreate =
    query.trim() !== '' &&
    !mergedOptions.some(
      (option) => option.value.toLowerCase() === createValue.toLowerCase()
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className={cn(
            'w-full justify-between font-normal',
            value.length === 0 && 'text-muted-foreground'
          )}
        >
          <span className='truncate'>
            {selectedLabels.length > 0
              ? selectedLabels.join(', ')
              : placeholder}
          </span>
          <ChevronDown className='size-4 text-muted-foreground' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[340px] p-0' align='start'>
        <Command shouldFilter>
          <CommandInput
            placeholder='Search or enter model...'
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            <CommandGroup>
              {mergedOptions.map((option) => {
                const checked = value.includes(option.value)

                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.description ?? ''}`}
                    onSelect={() => {
                      if (checked) {
                        onChange(
                          value.filter((item) => item !== option.value)
                        )
                        return
                      }

                      onChange([...value, option.value])
                      setQuery('')
                    }}
                  >
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-sm border border-primary',
                        checked
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible'
                      )}
                    >
                      <Check className='size-3.5' />
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate'>{option.label}</div>
                      {option.description && (
                        <div className='truncate text-xs text-muted-foreground'>
                          {option.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
              {canCreate && (
                <CommandItem
                  value={`Use ${createValue}`}
                  onSelect={() => {
                    onChange([...value, createValue])
                    setQuery('')
                  }}
                >
                  <div className='min-w-0 flex-1'>
                    <div className='truncate'>Use {createValue}</div>
                    <div className='truncate text-xs text-muted-foreground'>
                      Add custom model value
                    </div>
                  </div>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
