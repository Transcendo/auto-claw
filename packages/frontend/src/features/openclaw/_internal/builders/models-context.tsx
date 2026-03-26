/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import type {
  OpenClawConfigMetadataEntry,
  OpenClawJsonSchemaNode,
  OpenClawModelsSection,
} from '@/types/openclaw'
import {
  getArrayItemSchema,
  getObjectPropertySchema,
  getRecordValueSchema,
  pickSchemaProperties,
} from '@/lib/json-schema'
import { getProviderModels, getProviders } from '../lib/models-editor'
import { buildModelsMetadataMap } from '../lib/models-fields'
import { asObject, readString } from '../lib/value-readers'

type ModelsEditorContextValue = {
  value: OpenClawModelsSection
  onChange: (value: OpenClawModelsSection) => void
  onSave: (value?: OpenClawModelsSection) => Promise<boolean>
  isSaving: boolean
  schema: OpenClawJsonSchemaNode
  entries: OpenClawConfigMetadataEntry[]
  metadataMap: Map<string, OpenClawConfigMetadataEntry>
  globalSchema: OpenClawJsonSchemaNode
  providerSchema: OpenClawJsonSchemaNode | undefined
  modelSchema: OpenClawJsonSchemaNode | undefined
  saveVersion: number
  resolveProviderKey: (routeProviderId: string) => string
  setProviderRouteAlias: (
    routeProviderId: string,
    currentProviderId: string
  ) => void
  resolveModelIndex: (routeProviderId: string, routeModelId: string) => number
  setModelRouteIndex: (
    routeProviderId: string,
    routeModelId: string,
    index: number
  ) => void
}

const ModelsEditorContext = createContext<ModelsEditorContextValue | null>(null)

type ModelsEditorProviderProps = {
  value: OpenClawModelsSection
  onChange: (value: OpenClawModelsSection) => void
  onSave: (value?: OpenClawModelsSection) => Promise<boolean>
  isSaving: boolean
  schema: OpenClawJsonSchemaNode
  entries: OpenClawConfigMetadataEntry[]
  saveVersion: number
  children: React.ReactNode
}

function buildModelRouteKey(routeProviderId: string, routeModelId: string) {
  return `${routeProviderId}::${routeModelId}`
}

export function ModelsEditorProvider({
  value,
  onChange,
  onSave,
  isSaving,
  schema,
  entries,
  saveVersion,
  children,
}: ModelsEditorProviderProps) {
  const providerRouteAliasesRef = useRef<Record<string, string>>({})
  const modelRouteIndicesRef = useRef<Record<string, number>>({})

  const metadataMap = useMemo(() => buildModelsMetadataMap(entries), [entries])
  const globalSchema = useMemo(
    () => pickSchemaProperties(schema, ['mode', 'bedrockDiscovery']),
    [schema]
  )
  const providerSchema = useMemo(() => {
    return getRecordValueSchema(getObjectPropertySchema(schema, 'providers'))
  }, [schema])
  const modelSchema = useMemo(() => {
    return getArrayItemSchema(getObjectPropertySchema(providerSchema, 'models'))
  }, [providerSchema])

  const resolveProviderKey = useCallback(
    (routeProviderId: string) => {
      const providers = getProviders(asObject(value))
      let currentProviderId = routeProviderId
      const visited = new Set<string>()

      while (
        providerRouteAliasesRef.current[currentProviderId] &&
        !visited.has(currentProviderId)
      ) {
        visited.add(currentProviderId)
        currentProviderId = providerRouteAliasesRef.current[currentProviderId]
      }

      if (currentProviderId in providers) {
        return currentProviderId
      }

      return routeProviderId
    },
    [value]
  )

  const setProviderRouteAlias = useCallback(
    (routeProviderId: string, currentProviderId: string) => {
      if (routeProviderId === currentProviderId) {
        delete providerRouteAliasesRef.current[routeProviderId]
        return
      }

      providerRouteAliasesRef.current[routeProviderId] = currentProviderId
    },
    []
  )

  const resolveModelIndex = useCallback(
    (routeProviderId: string, routeModelId: string) => {
      const routeKey = buildModelRouteKey(routeProviderId, routeModelId)
      const currentProviderId = resolveProviderKey(routeProviderId)
      const provider = getProviders(asObject(value))[currentProviderId]
      const models = getProviderModels(provider)
      const existingIndex = modelRouteIndicesRef.current[routeKey]

      if (
        existingIndex !== undefined &&
        existingIndex >= 0 &&
        existingIndex < models.length
      ) {
        return existingIndex
      }

      const matchedIndex = models.findIndex(
        (model) => readString(model, 'id') === routeModelId
      )

      if (matchedIndex >= 0) {
        modelRouteIndicesRef.current[routeKey] = matchedIndex
      }

      return matchedIndex
    },
    [resolveProviderKey, value]
  )

  const setModelRouteIndex = useCallback(
    (routeProviderId: string, routeModelId: string, index: number) => {
      modelRouteIndicesRef.current[
        buildModelRouteKey(routeProviderId, routeModelId)
      ] = index
    },
    []
  )

  const contextValue = useMemo<ModelsEditorContextValue>(() => {
    return {
      value,
      onChange,
      onSave,
      isSaving,
      schema,
      entries,
      metadataMap,
      globalSchema,
      providerSchema,
      modelSchema,
      saveVersion,
      resolveProviderKey,
      setProviderRouteAlias,
      resolveModelIndex,
      setModelRouteIndex,
    }
  }, [
    entries,
    globalSchema,
    metadataMap,
    modelSchema,
    onSave,
    onChange,
    providerSchema,
    resolveModelIndex,
    resolveProviderKey,
    saveVersion,
    schema,
    setModelRouteIndex,
    setProviderRouteAlias,
    isSaving,
    value,
  ])

  return (
    <ModelsEditorContext.Provider value={contextValue}>
      {children}
    </ModelsEditorContext.Provider>
  )
}

export function useModelsEditor() {
  const context = useContext(ModelsEditorContext)

  if (!context) {
    throw new Error('useModelsEditor must be used within ModelsEditorProvider')
  }

  return context
}
