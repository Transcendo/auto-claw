import type { OpenClawConfigMetadataEntry } from '@/types/openclaw'
import type { ModelsMetadataMap } from './models-fields'

export type AgentsMetadataMap = ModelsMetadataMap

export function buildAgentsMetadataMap(
  entries: OpenClawConfigMetadataEntry[]
) {
  return new Map(entries.map((entry) => [entry.path, entry]))
}

export function getMetadataDescription(
  metadataMap: AgentsMetadataMap,
  path: string
) {
  return metadataMap.get(path)?.help
}

export function getEnumOptions(metadataMap: AgentsMetadataMap, path: string) {
  const values = metadataMap.get(path)?.enumValues ?? []

  return values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => ({
      label: value,
      value,
    }))
}
