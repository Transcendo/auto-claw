import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { CoreError } from './errors'
import type {
  EnvironmentRecord,
  GlobalSettings,
  ManagedRuntimeProcess,
} from './openclaw/types'

const CONFIG_DIR_NAME = '.auto-claw'
const CONFIG_FILE_NAME = 'config.json'
const CONFIG_VERSION = 3
const DEFAULT_ENVIRONMENT_PORT = 18789

export type AutoClawConfig = {
  version: number
  defaultEnvironmentId: string | null
  environments: EnvironmentRecord[]
  global: GlobalSettings
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizePort(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return DEFAULT_ENVIRONMENT_PORT
  }

  return value
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeRuntimeProcess(value: unknown): ManagedRuntimeProcess | null {
  if (!isObject(value)) {
    return null
  }

  const command = Array.isArray(value.command)
    ? value.command.filter(
        item => typeof item === 'string' && item.trim().length > 0
      )
    : []

  if (
    typeof value.pid !== 'number'
    || !Number.isInteger(value.pid)
    || value.pid < 1
    || typeof value.startedAt !== 'string'
    || typeof value.environmentId !== 'string'
    || typeof value.openclawPath !== 'string'
    || typeof value.logPath !== 'string'
  ) {
    return null
  }

  return {
    pid: value.pid,
    startedAt: value.startedAt,
    environmentId: value.environmentId,
    openclawPath: value.openclawPath,
    port: normalizePort(value.port),
    command,
    cwd:
      typeof value.cwd === 'string' && value.cwd.trim().length > 0
        ? value.cwd
        : null,
    logPath: value.logPath,
  }
}

export function createDefaultGlobalSettings(): GlobalSettings {
  return {
    runMode: 'global',
    sourcePath: null,
  }
}

function normalizeGlobalSettings(value: unknown): GlobalSettings {
  const defaults = createDefaultGlobalSettings()
  if (!isObject(value)) {
    return defaults
  }

  return {
    runMode: value.runMode === 'source' ? 'source' : 'global',
    sourcePath:
      typeof value.sourcePath === 'string' && value.sourcePath.trim().length > 0
        ? resolve(value.sourcePath.trim())
        : null,
  }
}

function normalizeEnvironmentRecord(value: unknown): EnvironmentRecord | null {
  if (!isObject(value)) {
    return null
  }

  const id = normalizeString(value.id)
  const openclawPath = normalizeString(value.openclawPath)
  const createdAt = normalizeString(value.createdAt)
  const updatedAt = normalizeString(value.updatedAt)

  if (!id || !openclawPath || !createdAt || !updatedAt) {
    return null
  }

  return {
    id,
    openclawPath,
    port: normalizePort(value.port),
    launchMode: value.launchMode === 'runtime' ? 'runtime' : 'daemon',
    runtimeProcess: normalizeRuntimeProcess(value.runtimeProcess),
    createdAt,
    updatedAt,
  }
}

export function getDefaultEnvironmentPort() {
  return DEFAULT_ENVIRONMENT_PORT
}

export function getAutoClawDirectoryPath() {
  return resolve(homedir(), CONFIG_DIR_NAME)
}

export function getAutoClawConfigPath() {
  return join(getAutoClawDirectoryPath(), CONFIG_FILE_NAME)
}

export function createDefaultAutoClawConfig(): AutoClawConfig {
  return {
    version: CONFIG_VERSION,
    defaultEnvironmentId: null,
    environments: [],
    global: createDefaultGlobalSettings(),
  }
}

function ensureAutoClawDirectory(configPath: string) {
  mkdirSync(dirname(configPath), { recursive: true })
}

function parseAutoClawConfig(raw: string, configPath: string) {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  }
  catch (error) {
    throw new CoreError({
      statusCode: 500,
      title: 'Invalid Auto Claw Config',
      message: `Failed to parse ${configPath}`,
      cause: error,
    })
  }

  if (!isObject(parsed)) {
    throw new CoreError({
      statusCode: 500,
      title: 'Invalid Auto Claw Config',
      message: 'config.json must contain a JSON object',
    })
  }

  const { version, defaultEnvironmentId, environments } = parsed

  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new CoreError({
      statusCode: 500,
      title: 'Invalid Auto Claw Config',
      message: 'config.json contains an invalid version',
    })
  }

  if (defaultEnvironmentId !== null && typeof defaultEnvironmentId !== 'string') {
    throw new CoreError({
      statusCode: 500,
      title: 'Invalid Auto Claw Config',
      message: 'config.json contains an invalid defaultEnvironmentId',
    })
  }

  if (!Array.isArray(environments)) {
    throw new CoreError({
      statusCode: 500,
      title: 'Invalid Auto Claw Config',
      message: 'config.json contains an invalid environments list',
    })
  }

  const normalizedEnvironments = environments
    .map(normalizeEnvironmentRecord)
    .filter((environment): environment is EnvironmentRecord => environment !== null)

  if (normalizedEnvironments.length !== environments.length) {
    throw new CoreError({
      statusCode: 500,
      title: 'Invalid Auto Claw Config',
      message: 'config.json contains an invalid environments list',
    })
  }

  return {
    version: CONFIG_VERSION,
    defaultEnvironmentId,
    environments: normalizedEnvironments,
    global: normalizeGlobalSettings(parsed.global),
  } satisfies AutoClawConfig
}

function serializeAutoClawConfig(config: AutoClawConfig) {
  return `${JSON.stringify(config, null, 2)}\n`
}

export function readAutoClawConfig() {
  const configPath = getAutoClawConfigPath()
  ensureAutoClawDirectory(configPath)

  if (!existsSync(configPath)) {
    return createDefaultAutoClawConfig()
  }

  const raw = readFileSync(configPath, 'utf8')
  return parseAutoClawConfig(raw, configPath)
}

export function writeAutoClawConfig(config: AutoClawConfig) {
  const configPath = getAutoClawConfigPath()
  ensureAutoClawDirectory(configPath)

  const tempPath = join(
    dirname(configPath),
    `.config.json.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`
  )

  writeFileSync(tempPath, serializeAutoClawConfig(config), 'utf8')
  renameSync(tempPath, configPath)
}

export function initializeAutoClawConfig() {
  const configPath = getAutoClawConfigPath()
  ensureAutoClawDirectory(configPath)

  if (!existsSync(configPath)) {
    writeAutoClawConfig(createDefaultAutoClawConfig())
  }

  return readAutoClawConfig()
}
