import axios from 'axios'
import type {
  AutoClawSettingsPayload,
  EnvironmentRecord,
  EnvironmentStatus,
  GlobalSettings,
  OpenClawAgentsPayload,
  OpenClawBackupRecord,
  OpenClawChannelsSection,
  OpenClawConfigMetadata,
  OpenClawConfigSectionKey,
  OpenClawEnvFilePayload,
  OpenClawGenericSection,
  OpenClawKeyValueRow,
  OpenClawModelsSection,
  OpenClawServiceAction,
  OpenClawServiceActionResult,
  OpenClawServiceStatus,
  OpenClawVersionCheckResult,
  OpenClawSkillCatalogPayload,
  OpenClawSkillContentPayload,
} from '@/types/openclaw'

export const api = axios.create({
  baseURL: '/api',
})

export async function fetchEnvironments() {
  const { data } = await api.get<{ items: EnvironmentRecord[] }>('/environments')
  return data.items
}

export async function fetchSettings() {
  const { data } = await api.get<AutoClawSettingsPayload>('/settings')
  return data
}

export async function updateGlobalSettingsRequest(payload: {
  runMode: GlobalSettings['runMode']
  sourcePath: string | null
}) {
  const { data } = await api.put<{ global: GlobalSettings }>('/settings/global', payload)
  return data.global
}

export async function updateEnvironmentSettingsRequest(
  environmentId: string,
  payload: {
    launchMode: EnvironmentRecord['launchMode']
  }
) {
  const { data } = await api.put<{ item: EnvironmentRecord }>(
    `/environments/${environmentId}/settings`,
    payload
  )
  return data.item
}

export async function createEnvironmentRequest(payload: {
  openclawPath: string
  port: number
}) {
  const { data } = await api.post<{ item: EnvironmentRecord }>('/environments', {
    openclawPath: payload.openclawPath,
    port: payload.port,
  })
  return data.item
}

export async function updateEnvironmentRequest(
  environmentId: string,
  payload: {
    openclawPath: string
    port: number
  }
) {
  const { data } = await api.put<{ item: EnvironmentRecord }>(
    `/environments/${environmentId}`,
    payload
  )
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

export async function setupEnvironmentRequest(environmentId: string) {
  const { data } = await api.post(`/environments/${environmentId}/setup`)
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

export async function fetchEnvFile(environmentId: string) {
  const { data } = await api.get<OpenClawEnvFilePayload>(
    `/environments/${environmentId}/env-file`
  )
  return data
}

export async function updateEnvFile(
  environmentId: string,
  rows: OpenClawKeyValueRow[]
) {
  const { data } = await api.put<OpenClawEnvFilePayload>(
    `/environments/${environmentId}/env-file`,
    { rows }
  )
  return data
}

export async function fetchSkillsCatalog(environmentId: string) {
  const { data } = await api.get<OpenClawSkillCatalogPayload>(
    `/environments/${environmentId}/skills/catalog`
  )
  return data
}

export async function fetchAgentSkillsCatalog(
  environmentId: string,
  agentId: string
) {
  const { data } = await api.get<OpenClawSkillCatalogPayload>(
    `/environments/${environmentId}/agents/${agentId}/skills/catalog`
  )
  return data
}

export async function fetchSkillContent(
  environmentId: string,
  path: string
) {
  const { data } = await api.get<OpenClawSkillContentPayload>(
    `/environments/${environmentId}/skills/content`,
    { params: { path } }
  )
  return data
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

export async function checkOpenClawVersionRequest(environmentId: string) {
  const { data } = await api.post<OpenClawVersionCheckResult>(
    '/settings/check-version',
    { environmentId }
  )
  return data
}

export async function fetchOpenClawServiceStatus(environmentId: string) {
  const { data } = await api.get<OpenClawServiceStatus>(
    '/settings/service/status',
    {
      params: { environmentId },
    }
  )
  return data
}

export async function runOpenClawServiceAction(
  action: OpenClawServiceAction,
  environmentId: string
) {
  const { data } = await api.post<OpenClawServiceActionResult>(
    `/settings/service/${action}`,
    { environmentId }
  )
  return data
}
