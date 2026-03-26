/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef } from 'react'
import type {
  OpenClawChannelsSection,
  OpenClawConfigMetadataEntry,
  OpenClawJsonSchemaNode,
} from '@/types/openclaw'
import {
  getObjectPropertySchema,
  getRecordValueSchema,
  listSchemaPropertyKeys,
} from '@/lib/json-schema'
import { buildMetadataMap } from '../lib/form-fields'
import { getChannelAccounts, getChannels } from '../lib/channels-editor'
import { asObject } from '../lib/value-readers'

type ChannelsEditorContextValue = {
  value: OpenClawChannelsSection
  onChange: (value: OpenClawChannelsSection) => void
  onSave: (value?: OpenClawChannelsSection) => Promise<boolean>
  isSaving: boolean
  schema: OpenClawJsonSchemaNode
  entries: OpenClawConfigMetadataEntry[]
  metadataMap: ReturnType<typeof buildMetadataMap>
  saveVersion: number
  knownChannelKeys: string[]
  resolveAccountKey: (routeChannelId: string, routeAccountId: string) => string
  setAccountRouteAlias: (
    routeChannelId: string,
    routeAccountId: string,
    currentAccountId: string
  ) => void
  getChannelSchema: (channelId: string) => OpenClawJsonSchemaNode | undefined
  getAccountSchema: (channelId: string) => OpenClawJsonSchemaNode | undefined
}

const ChannelsEditorContext = createContext<ChannelsEditorContextValue | null>(
  null
)

type ChannelsEditorProviderProps = {
  value: OpenClawChannelsSection
  onChange: (value: OpenClawChannelsSection) => void
  onSave: (value?: OpenClawChannelsSection) => Promise<boolean>
  isSaving: boolean
  schema: OpenClawJsonSchemaNode
  entries: OpenClawConfigMetadataEntry[]
  saveVersion: number
  children: React.ReactNode
}

function buildAccountRouteKey(routeChannelId: string, routeAccountId: string) {
  return `${routeChannelId}::${routeAccountId}`
}

export function ChannelsEditorProvider({
  value,
  onChange,
  onSave,
  isSaving,
  schema,
  entries,
  saveVersion,
  children,
}: ChannelsEditorProviderProps) {
  const accountRouteAliasesRef = useRef<Record<string, string>>({})
  const metadataMap = useMemo(() => buildMetadataMap(entries), [entries])
  const knownChannelKeys = useMemo(() => listSchemaPropertyKeys(schema), [schema])

  const getChannelSchema = useCallback(
    (channelId: string) => getObjectPropertySchema(schema, channelId),
    [schema]
  )

  const getAccountSchema = useCallback(
    (channelId: string) =>
      getRecordValueSchema(getObjectPropertySchema(getChannelSchema(channelId), 'accounts')),
    [getChannelSchema]
  )

  const resolveAccountKey = useCallback(
    (routeChannelId: string, routeAccountId: string) => {
      const accounts = getChannelAccounts(getChannels(asObject(value))[routeChannelId])
      const routeKey = buildAccountRouteKey(routeChannelId, routeAccountId)
      let currentAccountId = routeAccountId
      const visited = new Set<string>()

      while (
        accountRouteAliasesRef.current[routeKey] &&
        !visited.has(currentAccountId)
      ) {
        visited.add(currentAccountId)
        currentAccountId = accountRouteAliasesRef.current[routeKey]
      }

      if (currentAccountId in accounts) {
        return currentAccountId
      }

      return routeAccountId
    },
    [value]
  )

  const setAccountRouteAlias = useCallback(
    (routeChannelId: string, routeAccountId: string, currentAccountId: string) => {
      const routeKey = buildAccountRouteKey(routeChannelId, routeAccountId)
      if (routeAccountId === currentAccountId) {
        delete accountRouteAliasesRef.current[routeKey]
        return
      }

      accountRouteAliasesRef.current[routeKey] = currentAccountId
    },
    []
  )

  const contextValue = useMemo<ChannelsEditorContextValue>(
    () => ({
      value,
      onChange,
      onSave,
      isSaving,
      schema,
      entries,
      metadataMap,
      saveVersion,
      knownChannelKeys,
      resolveAccountKey,
      setAccountRouteAlias,
      getChannelSchema,
      getAccountSchema,
    }),
    [
      entries,
      getAccountSchema,
      getChannelSchema,
      knownChannelKeys,
      metadataMap,
      onSave,
      onChange,
      resolveAccountKey,
      saveVersion,
      schema,
      setAccountRouteAlias,
      isSaving,
      value,
    ]
  )

  return (
    <ChannelsEditorContext.Provider value={contextValue}>
      {children}
    </ChannelsEditorContext.Provider>
  )
}

export function useChannelsEditor() {
  const context = useContext(ChannelsEditorContext)

  if (!context) {
    throw new Error(
      'useChannelsEditor must be used within ChannelsEditorProvider'
    )
  }

  return context
}
