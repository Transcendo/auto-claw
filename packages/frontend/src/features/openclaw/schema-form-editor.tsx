import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { OpenClawJsonSchemaNode } from '@/types/openclaw'
import {
  buildDefaultValue,
  formatFieldLabel,
  getAddLabel,
  getNextEntryKey,
  inferSchemaFromValue,
  isPlainObject,
  isSensitivePath,
  normalizeTypes,
} from './utils'

type SchemaFormEditorProps = {
  path: string
  schema?: OpenClawJsonSchemaNode
  value: unknown
  onChange: (value: unknown) => void
  depth?: number
}

function getActiveType(
  schema: OpenClawJsonSchemaNode | undefined,
  value: unknown
): string {
  const supportedTypes = normalizeTypes(schema?.type)

  if (supportedTypes.length === 0) {
    const inferredType = inferSchemaFromValue(value).type
    return typeof inferredType === 'string'
      ? inferredType
      : inferredType?.[0] ?? 'object'
  }

  if (Array.isArray(value) && supportedTypes.includes('array')) {
    return 'array'
  }

  if (value === null && supportedTypes.includes('null')) {
    return 'null'
  }

  if (isPlainObject(value) && supportedTypes.includes('object')) {
    return 'object'
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value) && supportedTypes.includes('integer')) {
      return 'integer'
    }

    if (supportedTypes.includes('number')) {
      return 'number'
    }
  }

  if (typeof value === 'boolean' && supportedTypes.includes('boolean')) {
    return 'boolean'
  }

  if (typeof value === 'string' && supportedTypes.includes('string')) {
    return 'string'
  }

  return supportedTypes[0]
}

function shouldUseTextarea(path: string, value: unknown) {
  return (
    typeof value === 'string'
    && (value.length > 120
      || /(prompt|instructions|message|template|summary|system)/i.test(path))
  )
}

function FieldShell({
  path,
  label,
  description,
  required,
  depth,
  action,
  children,
}: {
  path: string
  label?: string
  description?: string
  required?: boolean
  depth: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
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
            <Label className='text-sm font-semibold'>
              {formatFieldLabel(label, path)}
            </Label>
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

function DynamicObjectEntry({
  entryKey,
  path,
  schema,
  value,
  onRename,
  onChange,
  onRemove,
  depth,
}: {
  entryKey: string
  path: string
  schema?: OpenClawJsonSchemaNode
  value: unknown
  onRename: (nextKey: string) => void
  onChange: (nextValue: unknown) => void
  onRemove: () => void
  depth: number
}) {
  const [draftKey, setDraftKey] = useState(entryKey)

  useEffect(() => {
    setDraftKey(entryKey)
  }, [entryKey])

  const handleCommitRename = () => {
    const trimmed = draftKey.trim()
    if (trimmed && trimmed !== entryKey) {
      onRename(trimmed)
    }
    else {
      setDraftKey(entryKey)
    }
  }

  return (
    <div className='space-y-3 rounded-xl border border-border/60 bg-background/70 p-4'>
      <div className='flex items-center gap-3'>
        <Input
          value={draftKey}
          onChange={event => setDraftKey(event.target.value)}
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
      <SchemaFormEditor
        path={path}
        schema={schema}
        value={value}
        onChange={onChange}
        depth={depth + 1}
      />
    </div>
  )
}

function ObjectEditor({
  path,
  schema,
  value,
  onChange,
  depth,
}: Required<SchemaFormEditorProps>) {
  const objectValue = isPlainObject(value) ? value : {}
  const fixedProperties = schema.properties ?? {}
  const requiredKeys = new Set(schema.required ?? [])
  const visibleFixedKeys = Object.keys(fixedProperties).filter(
    key => requiredKeys.has(key) || key in objectValue
  )
  const missingFixedKeys = Object.keys(fixedProperties).filter(
    key => !requiredKeys.has(key) && !(key in objectValue)
  )
  const dynamicEntries = Object.entries(objectValue).filter(
    ([key]) => !(key in fixedProperties)
  )
  const [pendingField, setPendingField] = useState('')

  const addableDynamicSchema
    = schema.additionalProperties === true
      ? undefined
      : schema.additionalProperties === false
        ? undefined
        : schema.additionalProperties

  const hasActions
    = missingFixedKeys.length > 0
      || schema.additionalProperties === true
      || Boolean(addableDynamicSchema)

  return (
    <div className='space-y-4'>
      {visibleFixedKeys.map((key) => {
        const propertySchema = fixedProperties[key]

        return (
          <FieldShell
            key={`${path}.${key}`}
            path={`${path}.${key}`}
            label={propertySchema.title}
            description={propertySchema.description}
            required={requiredKeys.has(key)}
            depth={depth}
            action={
              !requiredKeys.has(key) && key in objectValue
                ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => {
                        const nextValue = { ...objectValue }
                        delete nextValue[key]
                        onChange(nextValue)
                      }}
                      aria-label={`Remove ${key}`}
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  )
                : undefined
            }
          >
            <SchemaFormEditor
              path={`${path}.${key}`}
              schema={propertySchema}
              value={objectValue[key]}
              onChange={(nextPropertyValue) => {
                onChange({
                  ...objectValue,
                  [key]: nextPropertyValue,
                })
              }}
              depth={depth + 1}
            />
          </FieldShell>
        )
      })}

      {dynamicEntries.map(([entryKey, entryValue]) => {
        const nextPath = `${path}.${entryKey}`
        const entrySchema
          = addableDynamicSchema === undefined
            ? inferSchemaFromValue(entryValue)
            : addableDynamicSchema

        return (
          <DynamicObjectEntry
            key={nextPath}
            entryKey={entryKey}
            path={nextPath}
            schema={entrySchema}
            value={entryValue}
            depth={depth}
            onRename={(nextKey) => {
              if (!nextKey || nextKey === entryKey || nextKey in objectValue) {
                return
              }

              const nextValue = { ...objectValue }
              delete nextValue[entryKey]
              nextValue[nextKey] = entryValue
              onChange(nextValue)
            }}
            onChange={(nextEntryValue) => {
              onChange({
                ...objectValue,
                [entryKey]: nextEntryValue,
              })
            }}
            onRemove={() => {
              const nextValue = { ...objectValue }
              delete nextValue[entryKey]
              onChange(nextValue)
            }}
          />
        )
      })}

      {hasActions && (
        <div className='flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/70 bg-background/50 p-4'>
          {missingFixedKeys.length > 0 && (
            <Select
              value={pendingField}
              onValueChange={(nextField) => {
                setPendingField('')
                onChange({
                  ...objectValue,
                  [nextField]: buildDefaultValue(fixedProperties[nextField]),
                })
              }}
            >
              <SelectTrigger className='w-full min-w-56 sm:w-56'>
                <SelectValue placeholder='Add field' />
              </SelectTrigger>
              <SelectContent>
                {missingFixedKeys.map(key => (
                  <SelectItem key={key} value={key}>
                    {formatFieldLabel(fixedProperties[key]?.title, `${path}.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(schema.additionalProperties === true || addableDynamicSchema) && (
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                const nextKey = getNextEntryKey(path, objectValue)
                const nextValue = {
                  ...objectValue,
                  [nextKey]: buildDefaultValue(addableDynamicSchema),
                }
                onChange(nextValue)
              }}
            >
              {getAddLabel(path)}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ArrayEditor({
  path,
  schema,
  value,
  onChange,
  depth,
}: Required<SchemaFormEditorProps>) {
  const arrayValue = Array.isArray(value) ? value : []
  const itemSchema = schema.items ?? {}

  return (
    <div className='space-y-4'>
      {arrayValue.map((itemValue, index) => (
        <FieldShell
          key={`${path}[${index}]`}
          path={`${path}[${index}]`}
          label={`Item ${index + 1}`}
          depth={depth}
          action={
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => {
                const nextValue = arrayValue.filter((_, itemIndex) => itemIndex !== index)
                onChange(nextValue)
              }}
              aria-label={`Remove item ${index + 1}`}
            >
              <Trash2 className='size-4' />
            </Button>
          }
        >
          <SchemaFormEditor
            path={`${path}[${index}]`}
            schema={itemSchema}
            value={itemValue}
            onChange={(nextItemValue) => {
              const nextValue = arrayValue.map((currentValue, itemIndex) =>
                itemIndex === index ? nextItemValue : currentValue
              )
              onChange(nextValue)
            }}
            depth={depth + 1}
          />
        </FieldShell>
      ))}

      <div className='rounded-xl border border-dashed border-border/70 bg-background/50 p-4'>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            onChange([...arrayValue, buildDefaultValue(itemSchema)])
          }}
        >
          {getAddLabel(path)}
        </Button>
      </div>
    </div>
  )
}

function PrimitiveEditor({
  path,
  schema,
  value,
  onChange,
}: Required<Pick<SchemaFormEditorProps, 'path' | 'schema' | 'value' | 'onChange'>>) {
  if (schema.enum && schema.enum.length > 0) {
    const currentValue
      = typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : ''

    return (
      <Select
        value={currentValue}
        onValueChange={(nextValue) => {
          const resolved = schema.enum?.find(candidate => String(candidate) === nextValue)
          onChange(resolved ?? nextValue)
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder='Select a value' />
        </SelectTrigger>
        <SelectContent>
          {schema.enum.map(option => (
            <SelectItem key={String(option)} value={String(option)}>
              {String(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const activeType = getActiveType(schema, value)
  if (activeType === 'boolean') {
    return (
      <div className='flex items-center justify-between rounded-lg border border-border/60 px-4 py-3'>
        <div className='text-sm text-muted-foreground'>
          Toggle this value on or off.
        </div>
        <Switch checked={value === true} onCheckedChange={checked => onChange(checked)} />
      </div>
    )
  }

  if (activeType === 'number' || activeType === 'integer') {
    return (
      <Input
        type='number'
        step={activeType === 'integer' ? '1' : 'any'}
        value={typeof value === 'number' ? String(value) : ''}
        onChange={(event) => {
          const nextValue = Number(event.target.value)
          onChange(Number.isFinite(nextValue) ? nextValue : 0)
        }}
      />
    )
  }

  if (activeType === 'null') {
    return (
      <div className='rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground'>
        This value is set to null.
      </div>
    )
  }

  const inputType = isSensitivePath(path) ? 'password' : 'text'
  const stringValue = typeof value === 'string' ? value : ''
  if (shouldUseTextarea(path, stringValue)) {
    return (
      <Textarea
        value={stringValue}
        onChange={event => onChange(event.target.value)}
        className='min-h-32'
      />
    )
  }

  return (
    <Input
      type={inputType}
      value={stringValue}
      onChange={event => onChange(event.target.value)}
    />
  )
}

export function SchemaFormEditor({
  path,
  schema,
  value,
  onChange,
  depth = 0,
}: SchemaFormEditorProps) {
  const resolvedSchema = useMemo(() => {
    if (schema) {
      return schema
    }

    return inferSchemaFromValue(value)
  }, [schema, value])

  const typeOptions = normalizeTypes(resolvedSchema.type)
  const activeType = getActiveType(resolvedSchema, value)

  const body = (() => {
    if (activeType === 'object') {
      return (
        <ObjectEditor
          path={path}
          schema={resolvedSchema}
          value={value}
          onChange={onChange}
          depth={depth}
        />
      )
    }

    if (activeType === 'array') {
      return (
        <ArrayEditor
          path={path}
          schema={resolvedSchema}
          value={value}
          onChange={onChange}
          depth={depth}
        />
      )
    }

    return (
      <PrimitiveEditor
        path={path}
        schema={resolvedSchema}
        value={value}
        onChange={onChange}
      />
    )
  })()

  if (typeOptions.length <= 1) {
    return body
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-end gap-3'>
        <Select
          value={activeType}
          onValueChange={(nextType) => {
            onChange(buildDefaultValue(resolvedSchema, nextType))
          }}
        >
          <SelectTrigger className='w-full min-w-44 sm:w-44'>
            <SelectValue placeholder='Value type' />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(type => (
              <SelectItem key={type} value={type}>
                {formatFieldLabel(undefined, type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {body}
    </div>
  )
}
