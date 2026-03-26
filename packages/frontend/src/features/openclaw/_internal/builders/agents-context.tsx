/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react'
import type {
  OpenClawConfigMetadataEntry,
  OpenClawJsonSchemaNode,
  OpenClawAgentsPayload,
} from '@/types/openclaw'
import {
  getArrayItemSchema,
  getObjectPropertySchema,
} from '@/lib/json-schema'
import { buildCombinedAgentsSchema } from '../../utils'
import { buildAgentsMetadataMap } from '../lib/agents-fields'
import { getAgentIndexById, getBindingsForAgent } from '../lib/agents-editor'

type AgentsEditorContextValue = {
  value: OpenClawAgentsPayload
  onChange: (value: OpenClawAgentsPayload) => void
  onSave: (value?: OpenClawAgentsPayload) => Promise<boolean>
  isSaving: boolean
  schema: OpenClawJsonSchemaNode
  entries: OpenClawConfigMetadataEntry[]
  metadataMap: Map<string, OpenClawConfigMetadataEntry>
  agentsSchema: OpenClawJsonSchemaNode
  bindingsSchema: OpenClawJsonSchemaNode
  defaultsSchema: OpenClawJsonSchemaNode | undefined
  agentItemSchema: OpenClawJsonSchemaNode | undefined
  bindingItemSchema: OpenClawJsonSchemaNode | undefined
  saveVersion: number
  resolveAgentId: (routeAgentId: string) => string
  setAgentRouteAlias: (
    routeAgentId: string,
    currentAgentId: string
  ) => void
  resolveBindingIndex: (
    routeAgentId: string,
    routeBindingIndex: string
  ) => number
}

const AgentsEditorContext = createContext<AgentsEditorContextValue | null>(null)

type AgentsEditorProviderProps = {
  value: OpenClawAgentsPayload
  onChange: (value: OpenClawAgentsPayload) => void
  onSave: (value?: OpenClawAgentsPayload) => Promise<boolean>
  isSaving: boolean
  agentsSchema: OpenClawJsonSchemaNode
  bindingsSchema: OpenClawJsonSchemaNode
  entries: OpenClawConfigMetadataEntry[]
  saveVersion: number
  children: React.ReactNode
}

function buildAgentRouteKey(routeAgentId: string) {
  return routeAgentId
}

function buildBindingRouteKey(routeAgentId: string, routeBindingIndex: string) {
  return `${routeAgentId}::${routeBindingIndex}`
}

export function AgentsEditorProvider({
  value,
  onChange,
  onSave,
  isSaving,
  agentsSchema,
  bindingsSchema,
  entries,
  saveVersion,
  children,
}: AgentsEditorProviderProps) {
  const agentRouteAliasesRef = useRef<Record<string, string>>({})
  const bindingRouteIndicesRef = useRef<Record<string, number>>({})

  const metadataMap = useMemo(() => buildAgentsMetadataMap(entries), [entries])
  const defaultsSchema = useMemo(
    () => getObjectPropertySchema(agentsSchema, 'defaults'),
    [agentsSchema]
  )
  const agentListSchema = useMemo(
    () => getObjectPropertySchema(agentsSchema, 'list'),
    [agentsSchema]
  )
  const agentItemSchema = useMemo(
    () => getArrayItemSchema(agentListSchema),
    [agentListSchema]
  )
  const bindingItemSchema = useMemo(
    () => getArrayItemSchema(bindingsSchema),
    [bindingsSchema]
  )

  const schema = useMemo(
    () => buildCombinedAgentsSchema(agentsSchema, bindingsSchema),
    [agentsSchema, bindingsSchema]
  )

  const resolveAgentId = useCallback(
    (routeAgentId: string) => {
      let currentAgentId = routeAgentId
      const visited = new Set<string>()

      while (
        agentRouteAliasesRef.current[currentAgentId] &&
        !visited.has(currentAgentId)
      ) {
        visited.add(currentAgentId)
        currentAgentId = agentRouteAliasesRef.current[currentAgentId]
      }

      return getAgentIndexById(value, currentAgentId) >= 0
        ? currentAgentId
        : routeAgentId
    },
    [value]
  )

  const setAgentRouteAlias = useCallback(
    (routeAgentId: string, currentAgentId: string) => {
      if (routeAgentId === currentAgentId) {
        delete agentRouteAliasesRef.current[routeAgentId]
        return
      }

      agentRouteAliasesRef.current[buildAgentRouteKey(routeAgentId)] =
        currentAgentId
    },
    []
  )

  const resolveBindingIndex = useCallback(
    (routeAgentId: string, routeBindingIndex: string) => {
      const bindingIndex = Number(routeBindingIndex)
      if (!Number.isInteger(bindingIndex) || bindingIndex < 0) {
        return -1
      }

      const agentId = resolveAgentId(routeAgentId)
      if (agentId !== routeAgentId) {
        const routeKey = buildBindingRouteKey(routeAgentId, routeBindingIndex)
        const currentBindings = getBindingsForAgent(value.bindings, agentId)
        const existingIndex = bindingRouteIndicesRef.current[routeKey]

        if (
          existingIndex !== undefined &&
          existingIndex >= 0 &&
          existingIndex < currentBindings.length
        ) {
          return existingIndex
        }

        if (bindingIndex < currentBindings.length) {
          bindingRouteIndicesRef.current[routeKey] = bindingIndex
          return bindingIndex
        }
      }

      return bindingIndex
    },
    [resolveAgentId, value.bindings]
  )

  const contextValue = useMemo<AgentsEditorContextValue>(() => {
    return {
      value,
      onChange,
      onSave,
      isSaving,
      schema,
      entries,
      metadataMap,
      agentsSchema,
      bindingsSchema,
      defaultsSchema,
      agentItemSchema,
      bindingItemSchema,
      saveVersion,
      resolveAgentId,
      setAgentRouteAlias,
      resolveBindingIndex,
    }
  }, [
    agentItemSchema,
    agentsSchema,
    bindingsSchema,
    bindingItemSchema,
    defaultsSchema,
    entries,
    metadataMap,
    onSave,
    onChange,
    resolveAgentId,
    resolveBindingIndex,
    saveVersion,
    schema,
    setAgentRouteAlias,
    isSaving,
    value,
  ])

  return (
    <AgentsEditorContext.Provider value={contextValue}>
      {children}
    </AgentsEditorContext.Provider>
  )
}

export function useAgentsEditor() {
  const context = useContext(AgentsEditorContext)

  if (!context) {
    throw new Error('useAgentsEditor must be used within AgentsEditorProvider')
  }

  return context
}
