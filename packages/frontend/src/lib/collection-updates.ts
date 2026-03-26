export function appendItem<T>(items: T[], item: T) {
  return [...items, item]
}

export function removeItem<T>(items: T[], index: number) {
  return items.filter((_, itemIndex) => itemIndex !== index)
}

export function replaceItem<T>(items: T[], index: number, item: T) {
  return items.map((currentItem, itemIndex) =>
    itemIndex === index ? item : currentItem
  )
}

export function upsertRecordEntry<T>(
  record: Record<string, T>,
  key: string,
  value: T
) {
  return {
    ...record,
    [key]: value,
  }
}

export function removeRecordEntry<T>(
  record: Record<string, T>,
  key: string
) {
  const nextRecord = { ...record }
  delete nextRecord[key]
  return nextRecord
}

export function renameRecordEntry<T>(
  record: Record<string, T>,
  currentKey: string,
  nextKey: string
) {
  if (currentKey === nextKey) {
    return { ...record }
  }

  const nextRecord = { ...record }
  const value = nextRecord[currentKey]
  delete nextRecord[currentKey]
  nextRecord[nextKey] = value
  return nextRecord
}
