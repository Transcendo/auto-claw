import type { OpenClawConfigMetadataEntry } from '@/types/openclaw'
import { asArray, asObject } from './value-readers'

export type ModelsMetadataMap = Map<string, OpenClawConfigMetadataEntry>

export type KeyValueRow = {
  key: string
  value: string
}

export type SelectOption = {
  label: string
  value: string
}

const MODEL_INPUT_OPTIONS: SelectOption[] = [
  { label: 'text', value: 'text' },
  { label: 'image', value: 'image' },
]

const PROVIDER_AUTH_OPTIONS: SelectOption[] = [
  { label: 'api-key', value: 'api-key' },
  { label: 'token', value: 'token' },
  { label: 'oauth', value: 'oauth' },
  { label: 'aws-sdk', value: 'aws-sdk' },
]

export function buildModelsMetadataMap(entries: OpenClawConfigMetadataEntry[]) {
  return new Map(entries.map((entry) => [entry.path, entry]))
}

export function getMetadataDescription(
  metadataMap: ModelsMetadataMap,
  path: string
) {
  return metadataMap.get(path)?.help
}

export function getEnumOptions(metadataMap: ModelsMetadataMap, path: string) {
  const values = metadataMap.get(path)?.enumValues ?? []

  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => ({
      label: value,
      value,
    }))
}

export function getProviderApiOptions(metadataMap: ModelsMetadataMap) {
  return getEnumOptions(metadataMap, 'models.providers.*.api')
}

export function getModelApiOptions(metadataMap: ModelsMetadataMap) {
  return getEnumOptions(metadataMap, 'models.providers.*.models.*.api')
}

export function getProviderAuthOptions() {
  return PROVIDER_AUTH_OPTIONS
}

export function getModelInputOptions() {
  return MODEL_INPUT_OPTIONS
}

export function stripFieldPrefix(label: string | undefined) {
  if (!label) {
    return undefined
  }

  return label.replace(/^Model Provider\s+/i, '').replace(/^Model\s+/i, '')
}

export function readInputValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function readNumberInputValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}` : ''
}

export function readBooleanInputValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

export function readStringArrayValue(value: unknown, fallback: string[] = []) {
  const values = asArray(value).filter(
    (item): item is string => typeof item === 'string'
  )

  return values.length > 0 ? values : fallback
}

export function setOptionalStringValue(
  record: Record<string, unknown>,
  key: string,
  nextValue: string
) {
  const normalized = nextValue.trim()
  const nextRecord = {
    ...record,
  }

  if (!normalized) {
    delete nextRecord[key]
    return nextRecord
  }

  nextRecord[key] = nextValue
  return nextRecord
}

export function setBooleanValue(
  record: Record<string, unknown>,
  key: string,
  nextValue: boolean
) {
  return {
    ...record,
    [key]: nextValue,
  }
}

export function setOptionalNumberValue(
  record: Record<string, unknown>,
  key: string,
  nextValue: string
) {
  const normalized = nextValue.trim()
  const nextRecord = {
    ...record,
  }

  if (!normalized) {
    delete nextRecord[key]
    return nextRecord
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return nextRecord
  }

  nextRecord[key] = parsed
  return nextRecord
}

export function setStringArrayValue(
  record: Record<string, unknown>,
  key: string,
  nextValue: string[]
) {
  return {
    ...record,
    [key]: nextValue,
  }
}

export function setNestedOptionalNumberValue(
  record: Record<string, unknown>,
  parentKey: string,
  key: string,
  nextValue: string
) {
  const parentValue = {
    ...asObject(record[parentKey]),
  }
  const normalized = nextValue.trim()

  if (!normalized) {
    delete parentValue[key]
  } else {
    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) {
      return record
    }
    parentValue[key] = parsed
  }

  const nextRecord = {
    ...record,
  }

  if (Object.keys(parentValue).length === 0) {
    delete nextRecord[parentKey]
    return nextRecord
  }

  nextRecord[parentKey] = parentValue
  return nextRecord
}

export function readNestedValue(
  record: Record<string, unknown>,
  parentKey: string,
  key: string
) {
  return asObject(record[parentKey])[key]
}

export function formatJsonLikeValue(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value)
  }

  return ''
}

export function parseJsonLikeValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      return value
    }
  }

  return value
}

export function readKeyValueRows(
  value: unknown,
  formatter: (value: unknown) => string = formatJsonLikeValue
) {
  return Object.entries(asObject(value)).map(([key, entryValue]) => ({
    key,
    value: formatter(entryValue),
  }))
}

export function parseKeyValueRows(
  rows: KeyValueRow[],
  parser: (value: string) => unknown = (value) => value
) {
  const nextEntries = rows
    .map((row) => ({
      key: row.key.trim(),
      value: row.value,
    }))
    .filter((row) => row.key !== '')

  if (nextEntries.length === 0) {
    return undefined
  }

  return Object.fromEntries(
    nextEntries.map((row) => [row.key, parser(row.value)])
  )
}

export function compactConfigValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim() === '' ? undefined : value
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  if (typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    const nextItems = value
      .map((item) => compactConfigValue(item))
      .filter((item) => item !== undefined)

    return nextItems.length > 0 ? nextItems : undefined
  }

  if (value && typeof value === 'object') {
    const nextEntries = Object.entries(value)
      .map(
        ([key, entryValue]) => [key, compactConfigValue(entryValue)] as const
      )
      .filter(([, entryValue]) => entryValue !== undefined)

    if (nextEntries.length === 0) {
      return undefined
    }

    return Object.fromEntries(nextEntries)
  }

  return undefined
}
