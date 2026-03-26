import { isPlainObject } from '../../utils'

export function asObject(value: unknown) {
  return isPlainObject(value) ? value : {}
}

export function asArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

export function readString(value: unknown, key: string) {
  const record = asObject(value)
  return typeof record[key] === 'string' ? record[key] : undefined
}

export function readBoolean(value: unknown, key: string) {
  const record = asObject(value)
  return typeof record[key] === 'boolean' ? record[key] : undefined
}

export function readNestedObject(value: unknown, key: string) {
  return asObject(asObject(value)[key])
}

export function readNestedArray(value: unknown, key: string) {
  return asArray(asObject(value)[key])
}

export function describeModelSelection(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  const record = asObject(value)
  const primary = readString(record, 'primary')
  if (primary) {
    return primary
  }

  const alias = readString(record, 'alias')
  if (alias) {
    return alias
  }

  return undefined
}

export function compactSummary(parts: Array<string | undefined | false>) {
  return parts.filter(Boolean) as string[]
}
