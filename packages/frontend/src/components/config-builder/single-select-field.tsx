import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SingleSelectFieldOption = {
  label: string
  value: string
}

type SingleSelectFieldProps = {
  options: SingleSelectFieldOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SingleSelectField({
  options,
  value,
  onChange,
  placeholder,
}: SingleSelectFieldProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className='w-full'>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
