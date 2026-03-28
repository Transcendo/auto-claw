import {
  DetailFormRow,
  ModelMultiSelectField,
  ModelSingleSelectField,
} from '@/components/config-builder'
import { useModelSelectOptions } from '@/hooks/use-model-select-options'
import type { OpenClawConfigMetadataEntry } from '@/types/openclaw'
import { getMetadataDescription } from '../lib/agents-fields'
import { asArray, asObject } from '../lib/value-readers'

type AgentModelFieldsProps = {
  labelPathPrefix: string
  value: unknown
  metadataMap: Map<string, OpenClawConfigMetadataEntry>
  onChange: (value: unknown) => void
}

function readModelPrimary(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  const record = asObject(value)
  return typeof record.primary === 'string' ? record.primary : ''
}

function readModelFallbacks(value: unknown) {
  const record = asObject(value)
  return asArray(record.fallbacks).filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  )
}

function buildModelValue(primary: string, fallbacks: string[]) {
  const nextValue: Record<string, unknown> = {}

  if (primary.trim()) {
    nextValue.primary = primary.trim()
  }

  if (fallbacks.length > 0) {
    nextValue.fallbacks = fallbacks
  }

  return nextValue
}

export function AgentModelFields({
  labelPathPrefix,
  value,
  metadataMap,
  onChange,
}: AgentModelFieldsProps) {
  const { options } = useModelSelectOptions()
  const primary = readModelPrimary(value)
  const fallbacks = readModelFallbacks(value)

  return (
    <>
      <DetailFormRow
        label='Primary'
        description={getMetadataDescription(
          metadataMap,
          `${labelPathPrefix}.primary`
        )}
      >
        <ModelSingleSelectField
          options={options}
          value={primary}
          onChange={(nextValue) => onChange(buildModelValue(nextValue, fallbacks))}
          placeholder='Select primary model'
        />
      </DetailFormRow>

      <DetailFormRow
        label='Fallbacks'
        description={getMetadataDescription(
          metadataMap,
          `${labelPathPrefix}.fallbacks`
        )}
      >
        <ModelMultiSelectField
          options={options}
          value={fallbacks}
          onChange={(nextValue) => onChange(buildModelValue(primary, nextValue))}
          placeholder='Select fallback models'
        />
      </DetailFormRow>
    </>
  )
}
