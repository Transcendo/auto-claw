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
  port: number
  launchMode: OpenClawLaunchMode
  runtimeProcess: ManagedRuntimeProcess | null
  createdAt: string
  updatedAt: string
}

export type OpenClawRunMode = 'global' | 'source'

export type OpenClawLaunchMode = 'daemon' | 'runtime'

export type ManagedRuntimeProcess = {
  pid: number
  startedAt: string
  environmentId: string
  openclawPath: string
  port: number
  command: string[]
  cwd: string | null
  logPath: string
}

export type GlobalSettings = {
  runMode: OpenClawRunMode
  sourcePath: string | null
}

export type AutoClawSettingsPayload = {
  global: GlobalSettings
}

export type EnvironmentStatus = {
  environmentId: string
  openclawPath: string
  port: number
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

export type OpenClawKeyValueRow = {
  key: string
  value: string
}

export type OpenClawEnvFilePayload = {
  path: string
  exists: boolean
  rows: OpenClawKeyValueRow[]
  raw: string
}

export type OpenClawSkillCatalogItem = {
  id: string
  name: string
  path: string
  summary?: string
  sourceType: 'environment' | 'workspace' | 'user'
  sourceLabel: string
}

export type OpenClawSkillCatalogGroup = {
  id: string
  title: string
  path: string
  sourceType: 'environment' | 'workspace' | 'user'
  items: OpenClawSkillCatalogItem[]
}

export type OpenClawSkillCatalogPayload = {
  groups: OpenClawSkillCatalogGroup[]
}

export type OpenClawSkillContentPayload = {
  item: OpenClawSkillCatalogItem
  content: string
}

export type OpenClawModelsSection = Record<string, unknown>
export type OpenClawChannelsSection = Record<string, unknown>
export type OpenClawGenericSection = Record<string, unknown>
export type OpenClawAgentsSection = {
  agents?: Record<string, unknown>
  bindings?: unknown[]
}

export type OpenClawCommandResult = {
  ok: boolean
  command: string[]
  cwd: string | null
  stdout: string
  stderr: string
  exitCode: number | null
  error?: string
}

export type OpenClawVersionCheckResult = OpenClawCommandResult & {
  version?: string
}

export type OpenClawServiceStatus = {
  launchMode: OpenClawLaunchMode
  runMode: OpenClawRunMode
  environmentId: string
  command: string[]
  cwd: string | null
  environmentVariables: {
    OPENCLAW_STATE_DIR: string
    OPENCLAW_CONFIG_PATH: string
    OPENCLAW_GATEWAY_PORT: string
  }
  installed: boolean
  running: boolean
  pid?: number
  startedAt?: string
  logPath?: string
  activeEnvironmentId?: string
  stdout: string
  stderr: string
  error?: string
  statusPayload?: Record<string, unknown>
}

export type OpenClawServiceAction = 'install' | 'start' | 'stop' | 'restart'

export type OpenClawServiceActionResult = OpenClawServiceStatus & {
  action: OpenClawServiceAction
}
