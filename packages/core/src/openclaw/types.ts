export type OpenClawJsonPrimitive = null | boolean | number | string

export type OpenClawJsonValue =
  | OpenClawJsonPrimitive
  | OpenClawJsonValue[]
  | { [key: string]: OpenClawJsonValue }

export type OpenClawConfigMetadataEntry = {
  path: string
  kind?: 'core' | 'channel' | 'plugin'
  type?: string | string[]
  required: boolean
  deprecated: boolean
  sensitive: boolean
  tags: string[]
  label?: string
  help?: string
  hasChildren: boolean
  enumValues?: OpenClawJsonValue[]
  defaultValue?: OpenClawJsonValue
}

export type OpenClawJsonSchemaNode = {
  type?: string | string[]
  title?: string
  description?: string
  enum?: OpenClawJsonValue[]
  default?: OpenClawJsonValue
  properties?: Record<string, OpenClawJsonSchemaNode>
  required?: string[]
  additionalProperties?: boolean | OpenClawJsonSchemaNode
  items?: OpenClawJsonSchemaNode
}

export const OPENCLAW_CONFIG_SECTIONS = [
  'models',
  'channels',
  'agents',
  'bindings',
  'env',
  'skills',
  'plugins',
  'gateway',
  'hooks',
  'mcp',
  'cron',
] as const

export type OpenClawConfigSectionKey =
  (typeof OPENCLAW_CONFIG_SECTIONS)[number]

export type OpenClawConfigSectionMetadata = {
  section: OpenClawConfigSectionKey
  rootPath: OpenClawConfigSectionKey
  entries: OpenClawConfigMetadataEntry[]
  schema: OpenClawJsonSchemaNode
}

export type OpenClawConfigMetadata = {
  generatedBy?: string
  sections: Record<OpenClawConfigSectionKey, OpenClawConfigSectionMetadata>
}

export type OpenClawValidationIssue = {
  path: string
  message: string
}

export type EnvironmentRecord = {
  id: string
  openclawPath: string
  createdAt: string
  updatedAt: string
}

export type EnvironmentStatus = {
  environmentId: string
  openclawPath: string
  configPath: string
  directoryExists: boolean
  configExists: boolean
  canLoadConfig: boolean
  error?: string
}

export type OpenClawBackupRecord = {
  version: number
  filename: string
  path: string
  createdAt: string
  size: number
}

export type OpenClawModelsSection = Record<string, unknown>
export type OpenClawChannelsSection = Record<string, unknown>
export type OpenClawGenericSection = Record<string, unknown>
export type OpenClawAgentsSection = {
  agents?: Record<string, unknown>
  bindings?: unknown[]
}
