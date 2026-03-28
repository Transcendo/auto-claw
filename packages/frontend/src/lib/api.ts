import axios from 'axios'
import type {
  EnvironmentRecord,
  EnvironmentStatus,
  OpenClawAgentsPayload,
  OpenClawBackupRecord,
  OpenClawChannelsSection,
  OpenClawConfigMetadata,
  OpenClawConfigSectionKey,
  OpenClawGenericSection,
  OpenClawModelsSection,
} from '@/types/openclaw'

export const api = axios.create({
  baseURL: '/api',
})

export async function fetchEnvironments() {
  const { data } = await api.get<{ items: EnvironmentRecord[] }>('/environments')
  return data.items
}

export async function createEnvironmentRequest(openclawPath: string) {
  const { data } = await api.post<{ item: EnvironmentRecord }>('/environments', {
    openclawPath,
  })
  return data.item
}

export async function deleteEnvironmentRequest(environmentId: string) {
  await api.delete(`/environments/${environmentId}`)
}

export async function fetchEnvironmentStatus(environmentId: string) {
  const { data } = await api.get<EnvironmentStatus>(
    `/environments/${environmentId}/status`
  )
  return data
}

export async function fetchConfigMetadata() {
  const { data } = await api.get<OpenClawConfigMetadata>('/config/metadata')
  return data
}

export async function fetchGenericConfigSection(
  environmentId: string,
  section: Exclude<OpenClawConfigSectionKey, 'agents' | 'bindings'>
) {
  const { data } = await api.get<{ data: OpenClawGenericSection }>(
    `/environments/${environmentId}/config/${section}`
  )
  return data.data
}

export async function updateGenericConfigSection(
  environmentId: string,
  section: Exclude<OpenClawConfigSectionKey, 'agents' | 'bindings'>,
  payload: OpenClawGenericSection
) {
  const { data } = await api.put<{ data: OpenClawGenericSection }>(
    `/environments/${environmentId}/config/${section}`,
    { data: payload }
  )
  return data.data
}

export async function fetchModelsSection(environmentId: string) {
  const { data } = await api.get<{ data: OpenClawModelsSection }>(
    `/environments/${environmentId}/config/models`
  )
  return data.data
}

export async function updateModelsSection(
  environmentId: string,
  payload: OpenClawModelsSection
) {
  const { data } = await api.put<{ data: OpenClawModelsSection }>(
    `/environments/${environmentId}/config/models`,
    { data: payload }
  )
  return data.data
}

export async function fetchChannelsSection(environmentId: string) {
  const { data } = await api.get<{ data: OpenClawChannelsSection }>(
    `/environments/${environmentId}/config/channels`
  )
  return data.data
}

export async function updateChannelsSection(
  environmentId: string,
  payload: OpenClawChannelsSection
) {
  const { data } = await api.put<{ data: OpenClawChannelsSection }>(
    `/environments/${environmentId}/config/channels`,
    { data: payload }
  )
  return data.data
}

export async function fetchAgentsSection(environmentId: string) {
  const { data } = await api.get<{ data: OpenClawAgentsPayload }>(
    `/environments/${environmentId}/config/agents`
  )
  return data.data
}

export async function updateAgentsSection(
  environmentId: string,
  payload: OpenClawAgentsPayload
) {
  const { data } = await api.put<{ data: OpenClawAgentsPayload }>(
    `/environments/${environmentId}/config/agents`,
    { data: payload }
  )
  return data.data
}

export async function fetchBackups(environmentId: string) {
  const { data } = await api.get<{ items: OpenClawBackupRecord[] }>(
    `/environments/${environmentId}/backups`
  )
  return data.items
}

export async function fetchBackupContent(
  environmentId: string,
  version: number
) {
  const { data } = await api.get<{
    version: number
    raw: string
    parsed: Record<string, unknown>
  }>(`/environments/${environmentId}/backups/${version}`)
  return data
}

export async function restoreBackup(environmentId: string, version: number) {
  const { data } = await api.post<{ status: EnvironmentStatus }>(
    `/environments/${environmentId}/backups/${version}/restore`
  )
  return data.status
}
