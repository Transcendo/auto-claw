import { useMemo, useState } from 'react'
import type { OpenClawJsonSchemaNode } from '@/types/openclaw'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  SchemaDynamicObjectEntry,
  SchemaFieldShell,
} from '@/features/openclaw/_internal/schema-form/schema-field-shell'
import {
  buildDefaultValue,
  getAddLabel,
  getNextEntryKey,
  inferSchemaFromValue,
  isPlainObject,
  isSensitivePath,
  formatFieldLabel,
  normalizeTypes,
} from './utils'

type SchemaFormEditorProps = {
  path: string
  schema?: OpenClawJsonSchemaNode
  value: unknown
  onChange: (value: unknown) => void
  depth?: number
  layout?: 'default' | 'compact'
  hiddenPaths?: string[]
  omitKeys?: string[]
  descriptionMode?: 'inline' | 'tooltip'
  showAllFields?: boolean
  allowRemoveOptionalFields?: boolean
  compactFieldLayout?: 'stacked' | 'inline'
  compactBooleanColumns?: boolean
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
      : (inferredType?.[0] ?? 'object')
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
    typeof value === 'string' &&
    (value.length > 120 ||
      /(prompt|instructions|message|template|summary|system)/i.test(path))
  )
}

function pathIsHidden(path: string, hiddenPaths: string[]) {
  return hiddenPaths.some(
    (hiddenPath) =>
      path === hiddenPath ||
      path.startsWith(`${hiddenPath}.`) ||
      path.startsWith(`${hiddenPath}[`)
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
  layout,
  hiddenPaths,
  omitKeys,
  descriptionMode,
  showAllFields,
  allowRemoveOptionalFields,
  compactFieldLayout,
  compactBooleanColumns,
}: {
  entryKey: string
  path: string
  schema?: OpenClawJsonSchemaNode
  value: unknown
  onRename: (nextKey: string) => void
  onChange: (nextValue: unknown) => void
  onRemove: () => void
  depth: number
  layout: 'default' | 'compact'
  hiddenPaths: string[]
  omitKeys: string[]
  descriptionMode: 'inline' | 'tooltip'
  showAllFields: boolean
  allowRemoveOptionalFields: boolean
  compactFieldLayout: 'stacked' | 'inline'
  compactBooleanColumns: boolean
}) {
  return (
    <SchemaDynamicObjectEntry
      entryKey={entryKey}
      layout={layout}
      onRemove={onRemove}
      onRename={onRename}
    >
      <SchemaFormEditor
        path={path}
        schema={schema}
        value={value}
        onChange={onChange}
        depth={depth + 1}
        layout={layout}
        hiddenPaths={hiddenPaths}
        omitKeys={omitKeys}
        descriptionMode={descriptionMode}
        showAllFields={showAllFields}
        allowRemoveOptionalFields={allowRemoveOptionalFields}
        compactFieldLayout={compactFieldLayout}
        compactBooleanColumns={compactBooleanColumns}
      />
    </SchemaDynamicObjectEntry>
  )
}

function ObjectEditor({
  path,
  schema,
  value,
  onChange,
  depth,
  layout,
  hiddenPaths,
  omitKeys,
  descriptionMode,
  showAllFields,
  allowRemoveOptionalFields,
  compactFieldLayout,
  compactBooleanColumns,
}: Required<SchemaFormEditorProps>) {
  const objectValue = isPlainObject(value) ? value : {}
  const fixedProperties = schema.properties ?? {}
  const requiredKeys = new Set(schema.required ?? [])
  const visibleFixedKeys = Object.keys(fixedProperties).filter((key) => {
    const nextPath = `${path}.${key}`
    if (omitKeys.includes(key) || pathIsHidden(nextPath, hiddenPaths)) {
      return false
    }

    return showAllFields || requiredKeys.has(key) || key in objectValue
  })
  const missingFixedKeys = showAllFields
    ? []
    : Object.keys(fixedProperties).filter((key) => {
        const nextPath = `${path}.${key}`
        if (omitKeys.includes(key) || pathIsHidden(nextPath, hiddenPaths)) {
          return false
        }

        return !requiredKeys.has(key) && !(key in objectValue)
      })
  const dynamicEntries = Object.entries(objectValue).filter(([key]) => {
    const nextPath = `${path}.${key}`
    return !(key in fixedProperties) && !pathIsHidden(nextPath, hiddenPaths)
  })
  const [pendingField, setPendingField] = useState('')

  const addableDynamicSchema =
    schema.additionalProperties === true
      ? undefined
      : schema.additionalProperties === false
        ? undefined
        : schema.additionalProperties

  const hasActions =
    (!showAllFields && missingFixedKeys.length > 0) ||
    schema.additionalProperties === true ||
    Boolean(addableDynamicSchema)

  return (
    <div
      className={cn(
        'space-y-4',
        layout === 'compact' && 'space-y-3',
        layout === 'compact' &&
          compactBooleanColumns &&
          'grid grid-cols-1 gap-x-4 gap-y-0 xl:grid-cols-2'
      )}
    >
      {visibleFixedKeys.map((key) => {
        const propertySchema = fixedProperties[key]
        const propertyTypes = normalizeTypes(propertySchema?.type)
        const isBooleanField = propertyTypes.includes('boolean')

        return (
          <div
            key={`${path}.${key}`}
            className={cn(
              layout === 'compact' &&
                compactBooleanColumns &&
                (isBooleanField ? 'xl:col-span-1' : 'xl:col-span-2')
            )}
          >
            <SchemaFieldShell
              path={`${path}.${key}`}
              label={propertySchema.title}
              description={propertySchema.description}
              required={requiredKeys.has(key)}
              depth={depth}
              layout={layout}
              compactFieldLayout={compactFieldLayout}
              descriptionMode={descriptionMode}
              action={
                allowRemoveOptionalFields &&
                !requiredKeys.has(key) &&
                key in objectValue ? (
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
                ) : undefined
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
                layout={layout}
                hiddenPaths={hiddenPaths}
                omitKeys={omitKeys}
                descriptionMode={descriptionMode}
                showAllFields={showAllFields}
                allowRemoveOptionalFields={allowRemoveOptionalFields}
                compactFieldLayout={compactFieldLayout}
                compactBooleanColumns={compactBooleanColumns}
              />
            </SchemaFieldShell>
          </div>
        )
      })}

      {dynamicEntries.map(([entryKey, entryValue]) => {
        const nextPath = `${path}.${entryKey}`
        const entrySchema =
          addableDynamicSchema === undefined
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
            layout={layout}
            hiddenPaths={hiddenPaths}
            omitKeys={omitKeys}
            descriptionMode={descriptionMode}
            showAllFields={showAllFields}
            allowRemoveOptionalFields={allowRemoveOptionalFields}
            compactFieldLayout={compactFieldLayout}
            compactBooleanColumns={compactBooleanColumns}
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
        <div
          className={cn(
            'flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/70 bg-background/50 p-4',
            layout === 'compact' && 'rounded-lg px-3 py-2',
            layout === 'compact' && compactBooleanColumns && 'xl:col-span-2'
          )}
        >
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
                {missingFixedKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {formatFieldLabel(
                      fixedProperties[key]?.title,
                      `${path}.${key}`
                    )}
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
  layout,
  hiddenPaths,
  omitKeys,
  descriptionMode,
  showAllFields,
  allowRemoveOptionalFields,
  compactFieldLayout,
  compactBooleanColumns,
}: Required<SchemaFormEditorProps>) {
  const arrayValue = Array.isArray(value) ? value : []
  const itemSchema = schema.items ?? {}

  return (
    <div className={cn('space-y-4', layout === 'compact' && 'space-y-3')}>
      {arrayValue.map((itemValue, index) => {
        const itemPath = `${path}[${index}]`
        const itemType = getActiveType(itemSchema, itemValue)
        const isPrimitiveItem =
          itemType === 'string' ||
          itemType === 'number' ||
          itemType === 'integer' ||
          itemType === 'boolean'

        if (layout === 'compact' && isPrimitiveItem) {
          return (
            <div
              key={itemPath}
              className='py-1'
            >
              <div className='flex items-center gap-2'>
                <div className='min-w-0 flex-1'>
                  <SchemaFormEditor
                    path={itemPath}
                    schema={itemSchema}
                    value={itemValue}
                    onChange={(nextItemValue) => {
                      const nextValue = arrayValue.map((currentValue, itemIndex) =>
                        itemIndex === index ? nextItemValue : currentValue
                      )
                      onChange(nextValue)
                    }}
                    depth={depth + 1}
                    layout={layout}
                    hiddenPaths={hiddenPaths}
                    omitKeys={omitKeys}
                    descriptionMode={descriptionMode}
                    showAllFields={showAllFields}
                    allowRemoveOptionalFields={allowRemoveOptionalFields}
                    compactFieldLayout={compactFieldLayout}
                    compactBooleanColumns={compactBooleanColumns}
                  />
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  onClick={() => {
                    const nextValue = arrayValue.filter(
                      (_, itemIndex) => itemIndex !== index
                    )
                    onChange(nextValue)
                  }}
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2 className='size-4' />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div
            key={itemPath}
            className='space-y-3 py-1'
          >
            <div className='flex justify-end'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => {
                  const nextValue = arrayValue.filter(
                    (_, itemIndex) => itemIndex !== index
                  )
                  onChange(nextValue)
                }}
                aria-label={`Remove item ${index + 1}`}
              >
                <Trash2 className='size-4' />
              </Button>
            </div>
            <SchemaFormEditor
              path={itemPath}
              schema={itemSchema}
              value={itemValue}
              onChange={(nextItemValue) => {
                const nextValue = arrayValue.map((currentValue, itemIndex) =>
                  itemIndex === index ? nextItemValue : currentValue
                )
                onChange(nextValue)
              }}
              depth={depth + 1}
              layout={layout}
              hiddenPaths={hiddenPaths}
              omitKeys={omitKeys}
              descriptionMode={descriptionMode}
              showAllFields={showAllFields}
              allowRemoveOptionalFields={allowRemoveOptionalFields}
              compactFieldLayout={compactFieldLayout}
              compactBooleanColumns={compactBooleanColumns}
            />
          </div>
        )
      })}

      <div
        className={cn(
          'rounded-xl border border-dashed border-border/70 bg-background/50 p-4',
          layout === 'compact' && 'rounded-lg px-3 py-2'
        )}
      >
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
  layout,
}: Required<
  Pick<
    SchemaFormEditorProps,
    'path' | 'schema' | 'value' | 'onChange' | 'layout'
  >
>) {
  if (schema.enum && schema.enum.length > 0) {
    const currentValue =
      typeof value === 'string' || typeof value === 'number'
        ? String(value)
        : ''

    return (
      <Select
        value={currentValue}
        onValueChange={(nextValue) => {
          const resolved = schema.enum?.find(
            (candidate) => String(candidate) === nextValue
          )
          onChange(resolved ?? nextValue)
        }}
      >
        <SelectTrigger className='w-full'>
          <SelectValue placeholder='Select a value' />
        </SelectTrigger>
        <SelectContent>
          {schema.enum.map((option) => (
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
    if (layout === 'compact') {
      return (
        <div className='flex justify-end py-1'>
          <Switch
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      )
    }

    return (
      <div className='flex items-center justify-between rounded-lg border border-border/60 px-4 py-3'>
        <div className='text-sm text-muted-foreground'>
          Toggle this value on or off.
        </div>
        <Switch
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked)}
        />
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
        onChange={(event) => onChange(event.target.value)}
        className={cn(layout === 'compact' ? 'min-h-24' : 'min-h-32')}
      />
    )
  }

  return (
    <Input
      type={inputType}
      value={stringValue}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export function SchemaFormEditor({
  path,
  schema,
  value,
  onChange,
  depth = 0,
  layout = 'default',
  hiddenPaths = [],
  omitKeys = [],
  descriptionMode = 'inline',
  showAllFields = false,
  allowRemoveOptionalFields = true,
  compactFieldLayout = 'stacked',
  compactBooleanColumns = false,
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
          layout={layout}
          hiddenPaths={hiddenPaths}
          omitKeys={omitKeys}
          descriptionMode={descriptionMode}
          showAllFields={showAllFields}
          allowRemoveOptionalFields={allowRemoveOptionalFields}
          compactFieldLayout={compactFieldLayout}
          compactBooleanColumns={compactBooleanColumns}
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
          layout={layout}
          hiddenPaths={hiddenPaths}
          omitKeys={omitKeys}
          descriptionMode={descriptionMode}
          showAllFields={showAllFields}
          allowRemoveOptionalFields={allowRemoveOptionalFields}
          compactFieldLayout={compactFieldLayout}
          compactBooleanColumns={compactBooleanColumns}
        />
      )
    }

    return (
      <PrimitiveEditor
        path={path}
        schema={resolvedSchema}
        value={value}
        onChange={onChange}
        layout={layout}
      />
    )
  })()

  if (typeOptions.length <= 1) {
    return body
  }

  return (
    <div className={cn('space-y-3', layout === 'compact' && 'space-y-2')}>
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
            {typeOptions.map((type) => (
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
