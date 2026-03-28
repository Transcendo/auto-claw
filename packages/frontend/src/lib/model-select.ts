import type { OpenClawModelsSection } from '@/types/openclaw'

export type ModelSelectOption = {
  label: string
  value: string
  modelId: string
  providerId: string
  description?: string
}

function asObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function readString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === 'string' ? value[key] : undefined
}

export function buildModelSelectOptions(value: OpenClawModelsSection) {
  const providers = asObject(asObject(value).providers)

  return Object.entries(providers).flatMap(([providerId, providerValue]) => {
    const provider = asObject(providerValue)
    const providerModels = asArray(provider.models)

    return providerModels.flatMap((modelValue) => {
      const model = asObject(modelValue)
      const modelId = readString(model, 'id')
      if (!modelId) {
        return []
      }

      const modelName = readString(model, 'name')
      const api = readString(model, 'api')

      return {
        label: `${providerId}/${modelId}`,
        value: `${providerId}/${modelId}`,
        modelId,
        providerId,
        description: compactSummary([modelName, api]).join(' · ') || undefined,
      }
    })
  })
}

export function ensureModelOption(
  value: string,
  options: ModelSelectOption[]
): ModelSelectOption {
  const existing = options.find((option) => option.value === value)
  if (existing) {
    return existing
  }

  const normalized = value.trim()
  const [providerId, modelId] = normalized.includes('/')
    ? normalized.split('/', 2)
    : ['', normalized]

  return {
    label: normalized,
    value: normalized,
    providerId,
    modelId,
  }
}

export function normalizeModelSelectionValue(
  input: string,
  options: ModelSelectOption[]
) {
  const normalized = input.trim()
  if (!normalized) {
    return ''
  }

  const exactOption = options.find((option) => option.value === normalized)
  if (exactOption) {
    return exactOption.value
  }

  const suffixMatches = options.filter((option) => option.modelId === normalized)
  if (suffixMatches.length === 1) {
    return suffixMatches[0]!.value
  }

  return normalized
}
function compactSummary(parts: Array<string | undefined | false>) {
  return parts.filter(Boolean) as string[]
}
