import { basename, join, resolve } from 'node:path'
import process from 'node:process'
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { CoreError } from '../errors'
import {
  createEnvironment,
  getEnvironmentById,
  listEnvironments,
} from '../environments'
import { getOpenClawConfigMetadata } from './metadata'
import { assertValidAgentsSection, assertValidOpenClawSection } from './validate'
import type {
  EnvironmentStatus,
  OpenClawAgentsSection,
  OpenClawBackupRecord,
  OpenClawChannelsSection,
  OpenClawConfigSectionKey,
  OpenClawEnvFilePayload,
  OpenClawGenericSection,
  OpenClawKeyValueRow,
  OpenClawModelsSection,
  OpenClawSkillCatalogGroup,
  OpenClawSkillCatalogItem,
  OpenClawSkillCatalogPayload,
  OpenClawSkillContentPayload,
} from './types'

type OpenClawDocument = Record<string, unknown>

type OpenClawSectionMap = {
  models: OpenClawModelsSection
  channels: OpenClawChannelsSection
  agents: OpenClawAgentsSection
}

const GENERIC_OBJECT_SECTION_KEYS = [
  'models',
  'channels',
  'env',
  'skills',
  'plugins',
  'gateway',
  'hooks',
  'mcp',
  'cron',
] as const

type OpenClawGenericSectionKey = (typeof GENERIC_OBJECT_SECTION_KEYS)[number]

function toConfigPath(openclawPath: string) {
  return resolve(openclawPath, 'openclaw.json')
}

function toEnvFilePath(openclawPath: string) {
  return resolve(openclawPath, '.env')
}

function toBackupFilename(version: number) {
  return `openclaw.json.bak.${version}`
}

function toBackupPath(openclawPath: string, version: number) {
  return join(openclawPath, toBackupFilename(version))
}

function parseConfigDocument(raw: string, configPath: string) {
  try {
    return JSON.parse(raw) as OpenClawDocument
  }
  catch (error) {
    throw new CoreError({
      statusCode: 400,
      title: 'Invalid OpenClaw Config',
      message: `Failed to parse ${basename(configPath)}`,
      cause: error,
    })
  }
}

function prettyPrintConfig(document: OpenClawDocument) {
  return `${JSON.stringify(document, null, 2)}\n`
}

function sanitizeUnknownObject(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function sanitizeUnknownArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function readWorkspacePathFromDocument(
  openclawPath: string,
  document: OpenClawDocument
) {
  const agents = sanitizeUnknownObject(document.agents)
  const defaults = sanitizeUnknownObject(agents.defaults)
  const workspace = defaults.workspace

  return typeof workspace === 'string' && workspace.trim()
    ? resolve(workspace)
    : resolve(openclawPath, 'workspace')
}

function resolveStateDirFromEnv() {
  const stateDir = process.env.OPENCLAW_STATE_DIR?.trim()
  if (stateDir) {
    return resolve(stateDir.replace(/^~/, process.env.OPENCLAW_HOME ?? process.env.HOME ?? ''))
  }

  const homeDir = process.env.OPENCLAW_HOME ?? process.env.HOME ?? ''
  return resolve(homeDir, '.openclaw')
}

function resolveDefaultAgentWorkspaceDirFromEnv() {
  const profile = process.env.OPENCLAW_PROFILE?.trim()
  const stateDir = resolveStateDirFromEnv()

  if (profile && profile.toLowerCase() !== 'default') {
    return resolve(stateDir, `workspace-${profile}`)
  }

  return resolve(stateDir, 'workspace')
}

function normalizeAgentId(input: string) {
  const trimmed = input.trim().toLowerCase()
  return trimmed || 'main'
}

function listAgentEntriesFromDocument(document: OpenClawDocument) {
  const agents = sanitizeUnknownObject(document.agents)
  const list = sanitizeUnknownArray(agents.list)
  return list.map((entry) => sanitizeUnknownObject(entry))
}

function resolveDefaultAgentIdFromDocument(document: OpenClawDocument) {
  const entries = listAgentEntriesFromDocument(document)
  if (entries.length === 0) {
    return 'main'
  }

  const defaultEntry
    = entries.find((entry) => entry.default === true) ?? entries[0]
  return normalizeAgentId(typeof defaultEntry.id === 'string' ? defaultEntry.id : '')
}

function resolveAgentWorkspacePathFromDocument(
  document: OpenClawDocument,
  agentId: string
) {
  const normalizedAgentId = normalizeAgentId(agentId)
  const agentEntry = listAgentEntriesFromDocument(document).find((entry) => {
    return normalizeAgentId(typeof entry.id === 'string' ? entry.id : '') === normalizedAgentId
  })
  const explicitWorkspace = typeof agentEntry?.workspace === 'string'
    ? agentEntry.workspace.trim()
    : ''

  if (explicitWorkspace) {
    return resolve(explicitWorkspace)
  }

  const defaultAgentId = resolveDefaultAgentIdFromDocument(document)
  if (normalizedAgentId === defaultAgentId) {
    const defaults = sanitizeUnknownObject(sanitizeUnknownObject(document.agents).defaults)
    const fallbackWorkspace = typeof defaults.workspace === 'string'
      ? defaults.workspace.trim()
      : ''

    if (fallbackWorkspace) {
      return resolve(fallbackWorkspace)
    }

    return resolveDefaultAgentWorkspaceDirFromEnv()
  }

  return resolve(resolveStateDirFromEnv(), `workspace-${normalizedAgentId}`)
}

function parseEnvFile(raw: string): OpenClawKeyValueRow[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const separatorIndex = line.indexOf('=')
      if (separatorIndex < 0) {
        return {
          key: line,
          value: '',
        }
      }

      return {
        key: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1),
      }
    })
    .filter((row) => row.key.trim() !== '')
}

function serializeEnvFile(rows: OpenClawKeyValueRow[]) {
  const normalizedRows = rows
    .map((row) => ({
      key: row.key.trim(),
      value: row.value,
    }))
    .filter((row) => row.key !== '')

  if (normalizedRows.length === 0) {
    return ''
  }

  return `${normalizedRows.map((row) => `${row.key}=${row.value}`).join('\n')}\n`
}

async function listSkillItemsInRoot(
  rootPath: string,
  sourceType: OpenClawSkillCatalogItem['sourceType'],
  sourceLabel: string
) {
  if (!existsSync(rootPath)) {
    return [] as OpenClawSkillCatalogItem[]
  }

  const entries = await readdir(rootPath, { withFileTypes: true })
  const items: OpenClawSkillCatalogItem[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue
    }

    const skillPath = join(rootPath, entry.name, 'SKILL.md')
    if (!existsSync(skillPath)) {
      continue
    }

    const content = await readFile(skillPath, 'utf8')
    const summaryLine = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line !== '' && !line.startsWith('#'))

    items.push({
      id: skillPath,
      name: entry.name,
      path: skillPath,
      summary: summaryLine,
      sourceType,
      sourceLabel,
    })
  }

  return items.sort((left, right) => left.name.localeCompare(right.name))
}

async function readConfigDocumentByPath(configPath: string) {
  if (!existsSync(configPath)) {
    throw new CoreError({
      statusCode: 404,
      title: 'Config Not Found',
      message: `${basename(configPath)} was not found`,
    })
  }

  const raw = await readFile(configPath, 'utf8')
  return {
    raw,
    document: parseConfigDocument(raw, configPath),
  }
}

async function readEnvironmentConfigDocument(environmentId: string) {
  const environment = getEnvironmentById(environmentId)
  const configPath = toConfigPath(environment.openclawPath)
  const { raw, document } = await readConfigDocumentByPath(configPath)

  return {
    environment,
    configPath,
    raw,
    document,
  }
}

async function getNextBackupVersion(openclawPath: string) {
  const entries = await readdir(openclawPath, { withFileTypes: true })
  let maxVersion = 0

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    const match = entry.name.match(/^openclaw\.json\.bak\.(\d+)$/)
    if (!match) {
      continue
    }

    const version = Number(match[1])
    if (Number.isFinite(version)) {
      maxVersion = Math.max(maxVersion, version)
    }
  }

  return maxVersion + 1
}

async function writeConfigDocumentWithBackup(
  openclawPath: string,
  nextDocument: OpenClawDocument
) {
  const configPath = toConfigPath(openclawPath)
  if (!existsSync(configPath)) {
    throw new CoreError({
      statusCode: 404,
      title: 'Config Not Found',
      message: `${basename(configPath)} was not found`,
    })
  }

  const backupVersion = await getNextBackupVersion(openclawPath)
  const backupPath = toBackupPath(openclawPath, backupVersion)
  const tempPath = join(
    openclawPath,
    `.openclaw.json.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )

  await mkdir(openclawPath, { recursive: true })
  await writeFile(tempPath, prettyPrintConfig(nextDocument), 'utf8')

  try {
    await rename(configPath, backupPath)
  }
  catch (error) {
    await rm(tempPath, { force: true })
    throw new CoreError({
      statusCode: 500,
      title: 'Backup Failed',
      message: 'Failed to create the next config backup',
      cause: error,
    })
  }

  try {
    await rename(tempPath, configPath)
  }
  catch (error) {
    try {
      await rename(backupPath, configPath)
    }
    finally {
      await rm(tempPath, { force: true })
    }

    throw new CoreError({
      statusCode: 500,
      title: 'Save Failed',
      message: 'Failed to write the updated config file',
      cause: error,
    })
  }

  return {
    backupVersion,
    backupPath,
  }
}

export async function getEnvironmentStatus(
  environmentId: string
): Promise<EnvironmentStatus> {
  const environment = getEnvironmentById(environmentId)
  const configPath = toConfigPath(environment.openclawPath)
  const directoryExists = existsSync(environment.openclawPath)
  const configExists = existsSync(configPath)

  if (!directoryExists) {
    return {
      environmentId,
      openclawPath: environment.openclawPath,
      port: environment.port,
      configPath,
      directoryExists,
      configExists,
      canLoadConfig: false,
      error: 'Environment path does not exist',
    }
  }

  if (!configExists) {
    return {
      environmentId,
      openclawPath: environment.openclawPath,
      port: environment.port,
      configPath,
      directoryExists,
      configExists,
      canLoadConfig: false,
      error: 'openclaw.json was not found',
    }
  }

  try {
    const raw = await readFile(configPath, 'utf8')
    parseConfigDocument(raw, configPath)

    return {
      environmentId,
      openclawPath: environment.openclawPath,
      port: environment.port,
      configPath,
      directoryExists,
      configExists,
      canLoadConfig: true,
    }
  }
  catch (error) {
    return {
      environmentId,
      openclawPath: environment.openclawPath,
      port: environment.port,
      configPath,
      directoryExists,
      configExists,
      canLoadConfig: false,
      error: error instanceof Error ? error.message : 'Failed to load config',
    }
  }
}

export async function getOpenClawModelsSection(
  environmentId: string
): Promise<OpenClawModelsSection> {
  const { document } = await readEnvironmentConfigDocument(environmentId)
  return sanitizeUnknownObject(document.models)
}

export async function updateOpenClawModelsSection(
  environmentId: string,
  models: OpenClawModelsSection
) {
  assertValidOpenClawSection('models', models)
  const { document, environment } = await readEnvironmentConfigDocument(environmentId)
  const nextDocument = {
    ...document,
    models,
  }

  await writeConfigDocumentWithBackup(environment.openclawPath, nextDocument)
  return models
}

export async function getOpenClawChannelsSection(
  environmentId: string
): Promise<OpenClawChannelsSection> {
  const { document } = await readEnvironmentConfigDocument(environmentId)
  return sanitizeUnknownObject(document.channels)
}

export async function updateOpenClawChannelsSection(
  environmentId: string,
  channels: OpenClawChannelsSection
) {
  assertValidOpenClawSection('channels', channels)
  const { document, environment } = await readEnvironmentConfigDocument(environmentId)
  const nextDocument = {
    ...document,
    channels,
  }

  await writeConfigDocumentWithBackup(environment.openclawPath, nextDocument)
  return channels
}

export async function getOpenClawGenericSection(
  environmentId: string,
  section: OpenClawGenericSectionKey
): Promise<OpenClawGenericSection> {
  const { document } = await readEnvironmentConfigDocument(environmentId)
  return sanitizeUnknownObject(document[section])
}

export async function updateOpenClawGenericSection(
  environmentId: string,
  section: OpenClawGenericSectionKey,
  value: OpenClawGenericSection
) {
  assertValidOpenClawSection(section, value)
  const { document, environment } = await readEnvironmentConfigDocument(environmentId)
  const nextDocument = {
    ...document,
    [section]: value,
  }

  await writeConfigDocumentWithBackup(environment.openclawPath, nextDocument)
  return value
}

export async function getOpenClawEnvFile(
  environmentId: string
): Promise<OpenClawEnvFilePayload> {
  const environment = getEnvironmentById(environmentId)
  const envFilePath = toEnvFilePath(environment.openclawPath)

  if (!existsSync(envFilePath)) {
    return {
      path: envFilePath,
      exists: false,
      rows: [],
      raw: '',
    }
  }

  const raw = await readFile(envFilePath, 'utf8')
  return {
    path: envFilePath,
    exists: true,
    rows: parseEnvFile(raw),
    raw,
  }
}

export async function updateOpenClawEnvFile(
  environmentId: string,
  rows: OpenClawKeyValueRow[]
): Promise<OpenClawEnvFilePayload> {
  const environment = getEnvironmentById(environmentId)
  const envFilePath = toEnvFilePath(environment.openclawPath)
  const raw = serializeEnvFile(rows)

  await writeFile(envFilePath, raw, 'utf8')

  return {
    path: envFilePath,
    exists: true,
    rows: parseEnvFile(raw),
    raw,
  }
}

export async function getOpenClawSkillsCatalog(
  environmentId: string
): Promise<OpenClawSkillCatalogPayload> {
  const { environment, document } = await readEnvironmentConfigDocument(environmentId)
  const workspacePath = readWorkspacePathFromDocument(
    environment.openclawPath,
    document
  )

  const groupDefinitions = [
    {
      id: 'environment-skills',
      title: 'Environment Skills',
      path: resolve(environment.openclawPath, 'skills'),
      sourceType: 'environment' as const,
      sourceLabel: 'Environment skills',
    },
    {
      id: 'workspace-skills',
      title: 'Workspace Skills',
      path: resolve(workspacePath, 'skills'),
      sourceType: 'workspace' as const,
      sourceLabel: 'Workspace skills',
    },
    {
      id: 'user-skills',
      title: 'User Skills',
      path: resolve('~/.agents/skills'.replace(/^~/, process.env.HOME ?? '')),
      sourceType: 'user' as const,
      sourceLabel: 'User skills',
    },
  ]

  const groups: OpenClawSkillCatalogGroup[] = []
  for (const definition of groupDefinitions) {
    groups.push({
      id: definition.id,
      title: definition.title,
      path: definition.path,
      sourceType: definition.sourceType,
      items: await listSkillItemsInRoot(
        definition.path,
        definition.sourceType,
        definition.sourceLabel
      ),
    })
  }

  return { groups }
}

export async function getOpenClawAgentSkillsCatalog(
  environmentId: string,
  agentId: string
): Promise<OpenClawSkillCatalogPayload> {
  const { document } = await readEnvironmentConfigDocument(environmentId)
  const workspacePath = resolveAgentWorkspacePathFromDocument(document, agentId)

  return {
    groups: [
      {
        id: `agent-workspace-skills:${normalizeAgentId(agentId)}`,
        title: 'Workspace Skills',
        path: resolve(workspacePath, 'skills'),
        sourceType: 'workspace',
        items: await listSkillItemsInRoot(
          resolve(workspacePath, 'skills'),
          'workspace',
          'Workspace skills'
        ),
      },
    ],
  }
}

export async function getOpenClawSkillContent(
  environmentId: string,
  skillPath: string
): Promise<OpenClawSkillContentPayload> {
  const catalog = await getOpenClawSkillsCatalog(environmentId)
  const item = catalog.groups
    .flatMap((group) => group.items)
    .find((entry) => resolve(entry.path) === resolve(skillPath))

  if (!item) {
    throw new CoreError({
      statusCode: 404,
      title: 'Skill Not Found',
      message: 'The requested skill file was not found in the allowed skill roots',
    })
  }

  return {
    item,
    content: await readFile(item.path, 'utf8'),
  }
}

export async function getOpenClawAgentsSection(
  environmentId: string
): Promise<OpenClawAgentsSection> {
  const { document } = await readEnvironmentConfigDocument(environmentId)
  return {
    agents: sanitizeUnknownObject(document.agents),
    bindings: sanitizeUnknownArray(document.bindings),
  }
}

export async function updateOpenClawAgentsSection(
  environmentId: string,
  section: OpenClawAgentsSection
) {
  assertValidAgentsSection(section)
  const { document, environment } = await readEnvironmentConfigDocument(environmentId)
  const nextDocument = {
    ...document,
    agents: section.agents ?? {},
    bindings: section.bindings ?? [],
  }

  await writeConfigDocumentWithBackup(environment.openclawPath, nextDocument)
  return section
}

export async function listOpenClawBackups(
  environmentId: string
): Promise<OpenClawBackupRecord[]> {
  const environment = getEnvironmentById(environmentId)
  const entries = await readdir(environment.openclawPath, { withFileTypes: true })
  const backups: OpenClawBackupRecord[] = []

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    const match = entry.name.match(/^openclaw\.json\.bak\.(\d+)$/)
    if (!match) {
      continue
    }

    const version = Number(match[1])
    const fullPath = join(environment.openclawPath, entry.name)
    const fileStat = await stat(fullPath)

    backups.push({
      version,
      filename: entry.name,
      path: fullPath,
      createdAt: fileStat.mtime.toISOString(),
      size: fileStat.size,
    })
  }

  return backups.sort((left, right) => right.version - left.version)
}

export async function getOpenClawBackupContent(
  environmentId: string,
  version: number
) {
  const environment = getEnvironmentById(environmentId)
  const backupPath = toBackupPath(environment.openclawPath, version)

  if (!existsSync(backupPath)) {
    throw new CoreError({
      statusCode: 404,
      title: 'Backup Not Found',
      message: `${toBackupFilename(version)} was not found`,
    })
  }

  const raw = await readFile(backupPath, 'utf8')
  const parsed = parseConfigDocument(raw, backupPath)

  return {
    version,
    raw,
    parsed,
  }
}

export async function restoreOpenClawBackup(
  environmentId: string,
  version: number
) {
  const environment = getEnvironmentById(environmentId)
  const backupPath = toBackupPath(environment.openclawPath, version)
  const configPath = toConfigPath(environment.openclawPath)

  if (!existsSync(backupPath)) {
    throw new CoreError({
      statusCode: 404,
      title: 'Backup Not Found',
      message: `${toBackupFilename(version)} was not found`,
    })
  }

  const tempPath = join(
    environment.openclawPath,
    `.openclaw.restore.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )

  await copyFile(backupPath, tempPath)
  try {
    await rename(tempPath, configPath)
  }
  catch (error) {
    await rm(tempPath, { force: true })
    throw new CoreError({
      statusCode: 500,
      title: 'Restore Failed',
      message: 'Failed to restore the selected backup',
      cause: error,
    })
  }

  return getEnvironmentStatus(environmentId)
}

export function getOpenClawConfigMetadataPayload() {
  return getOpenClawConfigMetadata()
}

export async function seedDefaultEnvironment() {
  const seedPath = '/Users/gjssss/Documents/openclaw'
  if (!existsSync(seedPath)) {
    return null
  }

  const existing = listEnvironments().find(
    (environment) => environment.openclawPath === resolve(seedPath)
  )

  if (existing) {
    return existing
  }

  return createEnvironment({
    profile: 'seed',
    openclawPath: seedPath,
    port: 18789,
  })
}

export function getConfigSectionKinds(): OpenClawConfigSectionKey[] {
  return [
    'models',
    'channels',
    'agents',
    'env',
    'skills',
    'plugins',
    'gateway',
    'hooks',
    'mcp',
    'cron',
  ]
}

export type { OpenClawSectionMap }
