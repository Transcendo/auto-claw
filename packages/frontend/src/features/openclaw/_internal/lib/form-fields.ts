import type { OpenClawConfigMetadataEntry } from '@/types/openclaw'
import { asArray, asObject } from './value-readers'

export type MetadataMap = Map<string, OpenClawConfigMetadataEntry>

export type SelectOption = {
  label: string
  value: string
}

export function buildMetadataMap(entries: OpenClawConfigMetadataEntry[]) {
  return new Map(entries.map((entry) => [entry.path, entry]))
}

export function getMetadataDescription(metadataMap: MetadataMap, path: string) {
  return metadataMap.get(path)?.help
}

export function getEnumOptions(metadataMap: MetadataMap, path: string) {
  return (metadataMap.get(path)?.enumValues ?? [])
    .filter((value): value is string => typeof value === 'string')
    .map((value) => ({
      label: value,
      value,
    }))
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

export function readNestedValue(
  record: Record<string, unknown>,
  parentKey: string,
  key: string
) {
  return asObject(record[parentKey])[key]
}

export function setNestedOptionalStringValue(
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
    parentValue[key] = nextValue
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

export function readDeepValue(
  record: Record<string, unknown>,
  path: string[]
): unknown {
  let current: unknown = record

  for (const segment of path) {
    current = asObject(current)[segment]
  }

  return current
}

export function setDeepOptionalStringValue(
  record: Record<string, unknown>,
  path: string[],
  nextValue: string
) {
  const normalized = nextValue.trim()
  const nextRecord = {
    ...record,
  }
  let current: Record<string, unknown> = nextRecord

  for (const segment of path.slice(0, -1)) {
    current[segment] = {
      ...asObject(current[segment]),
    }
    current = asObject(current[segment])
  }

  const leafKey = path[path.length - 1]
  if (!leafKey) {
    return nextRecord
  }

  if (!normalized) {
    delete current[leafKey]
  } else {
    current[leafKey] = nextValue
  }

  return nextRecord
}

export function setDeepStringArrayValue(
  record: Record<string, unknown>,
  path: string[],
  nextValue: string[]
) {
  const nextRecord = {
    ...record,
  }
  let current: Record<string, unknown> = nextRecord

  for (const segment of path.slice(0, -1)) {
    current[segment] = {
      ...asObject(current[segment]),
    }
    current = asObject(current[segment])
  }

  const leafKey = path[path.length - 1]
  if (!leafKey) {
    return nextRecord
  }

  current[leafKey] = nextValue
  return nextRecord
}
