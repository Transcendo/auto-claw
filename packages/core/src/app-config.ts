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
import type { EnvironmentRecord } from './openclaw/types'

const CONFIG_DIR_NAME = '.auto-claw'
const CONFIG_FILE_NAME = 'config.json'
const CONFIG_VERSION = 1

export type AutoClawConfig = {
  version: number
  defaultEnvironmentId: string | null
  environments: EnvironmentRecord[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isEnvironmentRecord(value: unknown): value is EnvironmentRecord {
  if (!isObject(value)) {
    return false
  }

  return (
    typeof value.id === 'string'
    && typeof value.openclawPath === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
  )
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

  if (!Array.isArray(environments) || !environments.every(isEnvironmentRecord)) {
    throw new CoreError({
      statusCode: 500,
      title: 'Invalid Auto Claw Config',
      message: 'config.json contains an invalid environments list',
    })
  }

  return {
    version,
    defaultEnvironmentId,
    environments,
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
