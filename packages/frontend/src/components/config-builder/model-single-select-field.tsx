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

type ModelSingleSelectFieldProps = {
  options: ModelSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ModelSingleSelectField({
  options,
  value,
  onChange,
  placeholder = 'Select model',
}: ModelSingleSelectFieldProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const mergedOptions = useMemo(() => {
    const nextOptions = [...options]
    if (value.trim()) {
      const selectedOption = ensureModelOption(value, nextOptions)
      if (!nextOptions.some((option) => option.value === selectedOption.value)) {
        nextOptions.unshift(selectedOption)
      }
    }
    return nextOptions
  }, [options, value])

  const selectedOption = mergedOptions.find((option) => option.value === value)
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
            !selectedOption && 'text-muted-foreground'
          )}
        >
          <span className='truncate'>
            {selectedOption?.label || value || placeholder}
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
                const checked = option.value === value

                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.description ?? ''}`}
                    onSelect={() => {
                      onChange(option.value)
                      setOpen(false)
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
                    onChange(createValue)
                    setOpen(false)
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
