import { basename, join, resolve } from 'node:path'
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
  OpenClawGenericSection,
  OpenClawModelsSection,
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

function toBackupFilename(version: number) {
  return `openclaw.${version}.json`
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

    const match = entry.name.match(/^openclaw\.(\d+)\.json$/)
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

    const match = entry.name.match(/^openclaw\.(\d+)\.json$/)
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

  return createEnvironment({ openclawPath: seedPath })
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
