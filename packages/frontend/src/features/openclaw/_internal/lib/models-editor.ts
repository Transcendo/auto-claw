import type { OpenClawJsonSchemaNode } from '@/types/openclaw'
import {
  appendItem,
  removeItem,
  renameRecordEntry,
  replaceItem,
  removeRecordEntry,
} from '@/lib/collection-updates'
import { buildDefaultValue, getNextEntryKey } from '../../utils'
import {
  asArray,
  asObject,
  compactSummary,
  readBoolean,
  readString,
} from './value-readers'

export function getProviders(value: unknown) {
  return asObject(asObject(value).providers)
}

export function setProviders(
  value: unknown,
  providers: Record<string, unknown>
) {
  return {
    ...asObject(value),
    providers,
  }
}

export function getProviderModels(value: unknown) {
  return asArray(asObject(value).models)
}

export function setProviderModels(provider: unknown, models: unknown[]) {
  return {
    ...asObject(provider),
    models,
  }
}

export function renameProviderKey(
  providers: Record<string, unknown>,
  currentKey: string,
  nextKey: string
) {
  return renameRecordEntry(providers, currentKey, nextKey)
}

export function removeProviderKey(
  providers: Record<string, unknown>,
  key: string
) {
  return removeRecordEntry(providers, key)
}

export function findModelIndexById(provider: unknown, modelId: string) {
  return getProviderModels(provider).findIndex((model) => {
    return readString(model, 'id') === modelId
  })
}

export function getModelByIndex(provider: unknown, index: number) {
  return getProviderModels(provider)[index]
}

export function appendProviderModel(provider: unknown, model: unknown) {
  return setProviderModels(
    provider,
    appendItem(getProviderModels(provider), model)
  )
}

export function replaceProviderModel(
  provider: unknown,
  index: number,
  model: unknown
) {
  return setProviderModels(
    provider,
    replaceItem(getProviderModels(provider), index, model)
  )
}

export function removeProviderModel(provider: unknown, index: number) {
  return setProviderModels(
    provider,
    removeItem(getProviderModels(provider), index)
  )
}

export function createDefaultProviderValue(
  schema: OpenClawJsonSchemaNode | undefined
) {
  const providerValue = asObject(buildDefaultValue(schema))
  return {
    ...providerValue,
    api: readString(providerValue, 'api') ?? 'openai-completions',
    auth: readString(providerValue, 'auth') ?? 'api-key',
    authHeader: readBoolean(providerValue, 'authHeader') ?? false,
    injectNumCtxForOpenAICompat:
      readBoolean(providerValue, 'injectNumCtxForOpenAICompat') ?? true,
    models: getProviderModels(providerValue),
  }
}

export function createDefaultModelValue(
  schema: OpenClawJsonSchemaNode | undefined,
  provider: unknown
) {
  const modelValue = asObject(buildDefaultValue(schema))
  const providerApi = readString(provider, 'api')

  return {
    ...modelValue,
    api: readString(modelValue, 'api') ?? providerApi ?? 'openai-completions',
    reasoning: readBoolean(modelValue, 'reasoning') ?? false,
    input:
      asArray(modelValue.input).length > 0
        ? asArray(modelValue.input)
        : ['text'],
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      ...asObject(modelValue.cost),
    },
  }
}

export function getNextModelId(provider: unknown) {
  const ids = new Set(
    getProviderModels(provider)
      .map((model) => readString(model, 'id'))
      .filter((value): value is string => Boolean(value))
  )

  let counter = 1
  let candidate = `model-${counter}`

  while (ids.has(candidate)) {
    counter += 1
    candidate = `model-${counter}`
  }

  return candidate
}

export function getNextProviderId(value: unknown) {
  return getNextEntryKey('models.providers', getProviders(value))
}

export function summarizeProvider(providerId: string, value: unknown) {
  const provider = asObject(value)
  return {
    title: providerId,
    subtitle: readString(provider, 'api') ?? 'Custom provider',
    meta: compactSummary([
      readString(provider, 'baseUrl'),
      `${getProviderModels(provider).length} model${getProviderModels(provider).length === 1 ? '' : 's'}`,
    ]),
  }
}

export function summarizeModel(value: unknown) {
  const model = asObject(value)
  const api = readString(model, 'api')
  const reasoning = readBoolean(model, 'reasoning')

  return {
    title:
      readString(model, 'name') ?? readString(model, 'id') ?? 'Untitled model',
    subtitle: readString(model, 'id') ?? 'Missing id',
    badges: compactSummary([api, reasoning ? 'Reasoning' : undefined]),
  }
}
