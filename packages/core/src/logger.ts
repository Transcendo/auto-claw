import {
  appendFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  closeSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import { getAutoClawDirectoryPath } from './app-config'
import type { LogFileType } from './openclaw/types'

type LogNamespace = 'backend' | 'runtime'
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function ensureLogsDirectory(namespace?: LogNamespace) {
  const baseDirectory = join(getAutoClawDirectoryPath(), 'logs')
  const directory = namespace ? join(baseDirectory, namespace) : baseDirectory
  mkdirSync(directory, { recursive: true })
  return directory
}

function getBackendLogPath() {
  return join(ensureLogsDirectory(), 'backend.log')
}

function formatLogValue(value: unknown) {
  if (value instanceof Error) {
    return value.stack ?? value.message
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value)
  }
  catch {
    return String(value)
  }
}

function writeLogLine(level: LogLevel, message: string) {
  if (level === 'error') {
    console.error(message)
    return
  }

  if (level === 'warn') {
    console.warn(message)
    return
  }

  console.log(message)
}

export function getLogsDirectory(namespace?: LogNamespace) {
  return ensureLogsDirectory(namespace)
}

export function createRuntimeLogPath(environmentId: string) {
  return join(
    ensureLogsDirectory('runtime'),
    `runtime-${environmentId}-${Date.now()}.log`
  )
}

export type RuntimeLogLine = {
  time?: string
  level?: string
  subsystem?: string
  module?: string
  message: string
  raw: string
}

export type RuntimeLogsPayload = {
  lines: RuntimeLogLine[]
  logPath: string
  offset: number
  hasMore: boolean
}

function parseMetaName(raw?: unknown): { subsystem?: string, module?: string } {
  if (typeof raw !== 'string') {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      subsystem: typeof parsed.subsystem === 'string' ? parsed.subsystem : undefined,
      module: typeof parsed.module === 'string' ? parsed.module : undefined,
    }
  }
  catch {
    return {}
  }
}

function extractLogMessage(value: Record<string, unknown>) {
  const parts: string[] = []
  for (const key of Object.keys(value)) {
    if (!/^\d+$/.test(key)) {
      continue
    }

    const item = value[key]
    if (typeof item === 'string') {
      parts.push(item)
    }
    else if (item != null) {
      parts.push(JSON.stringify(item))
    }
  }

  return parts.join(' ')
}

const PLAIN_LOG_RE = /^(\d{4}-\d{2}-\d{2}T[\d:.+Z-]+)\s+(.*)$/

function parsePlainLogLine(raw: string): RuntimeLogLine | null {
  const match = PLAIN_LOG_RE.exec(raw)
  if (!match) {
    return null
  }

  const time = match[1]
  const rest = match[2]

  const bracketMatch = /^\[([^\]]+)\]\s*(.*)$/.exec(rest)
  if (bracketMatch) {
    return {
      time,
      level: 'info',
      subsystem: bracketMatch[1],
      message: bracketMatch[2],
      raw,
    }
  }

  return {
    time,
    level: 'info',
    message: rest,
    raw,
  }
}

function parseRuntimeLogLine(raw: string): RuntimeLogLine | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      const meta = parsed._meta as Record<string, unknown> | undefined
      const nameMeta = parseMetaName(meta?.name)
      const levelRaw = typeof meta?.logLevelName === 'string' ? meta.logLevelName : undefined

      return {
        time:
          typeof parsed.time === 'string'
            ? parsed.time
            : typeof meta?.date === 'string'
              ? meta.date
              : undefined,
        level: levelRaw ? levelRaw.toLowerCase() : undefined,
        subsystem: nameMeta.subsystem,
        module: nameMeta.module,
        message: extractLogMessage(parsed),
        raw,
      }
    }
    catch {
      // fall through to plain text parsing
    }
  }

  return parsePlainLogLine(raw)
}

function findLatestRuntimeLogForEnvironment(environmentId: string) {
  const runtimeLogsDir = join(getAutoClawDirectoryPath(), 'logs', 'runtime')
  if (!existsSync(runtimeLogsDir)) {
    return null
  }

  const prefix = `runtime-${environmentId}-`
  const entries = readdirSync(runtimeLogsDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.startsWith(prefix) && entry.name.endsWith('.log'))
    .map(entry => ({
      name: entry.name,
      path: join(runtimeLogsDir, entry.name),
      mtime: statSync(join(runtimeLogsDir, entry.name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)

  return entries[0]?.path ?? null
}

export function readRuntimeLogs(
  environmentId: string,
  runtimeLogPath: string | null | undefined,
  options?: { tail?: number, after?: number }
): RuntimeLogsPayload {
  const tail = options?.tail ?? 500
  const after = options?.after ?? 0

  const logPath = runtimeLogPath ?? findLatestRuntimeLogForEnvironment(environmentId)
  if (!logPath || !existsSync(logPath)) {
    return { lines: [], logPath: logPath ?? '', offset: 0, hasMore: false }
  }

  const fileSize = statSync(logPath).size
  if (after >= fileSize) {
    return { lines: [], logPath, offset: fileSize, hasMore: false }
  }

  const readFrom = after
  const bytesToRead = fileSize - readFrom
  const buffer = Buffer.alloc(bytesToRead)
  const fd = openSync(logPath, 'r')

  try {
    readSync(fd, buffer, 0, bytesToRead, readFrom)
  }
  finally {
    closeSync(fd)
  }

  const content = buffer.toString('utf8')
  const rawLines = content.split('\n').filter(line => line.trim().length > 0)
  const allParsed: RuntimeLogLine[] = []

  for (const raw of rawLines) {
    const parsed = parseRuntimeLogLine(raw)
    if (parsed) {
      allParsed.push(parsed)
    }
    else {
      allParsed.push({ message: raw, raw })
    }
  }

  const hasMore = allParsed.length > tail
  const lines = hasMore ? allParsed.slice(-tail) : allParsed

  return { lines, logPath, offset: fileSize, hasMore }
}

const LOG_FILE_MAP: Record<LogFileType, string> = {
  'gateway': 'gateway.log',
  'gateway-error': 'gateway.err.log',
  'config-audit': 'config-audit.jsonl',
  'commands': 'commands.log',
}

const ALL_LOG_FILE_TYPES: LogFileType[] = ['gateway', 'gateway-error', 'config-audit', 'commands']

function parseJsonlLogLine(raw: string): RuntimeLogLine | null {
  const trimmed = raw.trim()
  if (!trimmed || !trimmed.startsWith('{')) {
    return null
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    const time = typeof parsed.ts === 'string'
      ? parsed.ts
      : typeof parsed.timestamp === 'string'
        ? parsed.timestamp
        : undefined

    const event = typeof parsed.event === 'string' ? parsed.event : undefined
    const action = typeof parsed.action === 'string' ? parsed.action : undefined
    const source = typeof parsed.source === 'string' ? parsed.source : undefined
    const result = typeof parsed.result === 'string' ? parsed.result : undefined
    const sessionKey = typeof parsed.sessionKey === 'string' ? parsed.sessionKey : undefined
    const configPath = typeof parsed.configPath === 'string' ? parsed.configPath : undefined

    const messageParts: string[] = []
    if (event) messageParts.push(event)
    if (action) messageParts.push(`action=${action}`)
    if (configPath) messageParts.push(configPath)
    if (sessionKey) messageParts.push(sessionKey)
    if (source) messageParts.push(`source=${source}`)
    if (result) messageParts.push(`result=${result}`)

    return {
      time,
      level: action === 'new' ? 'info' : event ? 'info' : undefined,
      subsystem: event ?? (action ? 'command' : undefined),
      message: messageParts.join(' ') || trimmed,
      raw: trimmed,
    }
  }
  catch {
    return null
  }
}

export function listAvailableLogFiles(openclawPath: string): LogFileType[] {
  const logsDir = join(openclawPath, 'logs')
  if (!existsSync(logsDir)) {
    return []
  }

  return ALL_LOG_FILE_TYPES.filter((logType) => {
    const filePath = join(logsDir, LOG_FILE_MAP[logType])
    return existsSync(filePath)
  })
}

export function readOpenClawLogFile(
  openclawPath: string,
  logType: LogFileType,
  options?: { tail?: number, after?: number }
): RuntimeLogsPayload {
  const tail = options?.tail ?? 500
  const after = options?.after ?? 0
  const filename = LOG_FILE_MAP[logType]
  const logPath = join(openclawPath, 'logs', filename)

  if (!existsSync(logPath)) {
    return { lines: [], logPath, offset: 0, hasMore: false }
  }

  const fileSize = statSync(logPath).size
  if (after >= fileSize) {
    return { lines: [], logPath, offset: fileSize, hasMore: false }
  }

  const readFrom = after
  const bytesToRead = fileSize - readFrom
  const buffer = Buffer.alloc(bytesToRead)
  const fd = openSync(logPath, 'r')

  try {
    readSync(fd, buffer, 0, bytesToRead, readFrom)
  }
  finally {
    closeSync(fd)
  }

  const content = buffer.toString('utf8')
  const rawLines = content.split('\n').filter(line => line.trim().length > 0)
  const isJsonl = logType === 'config-audit' || logType === 'commands'
  const allParsed: RuntimeLogLine[] = []

  for (const raw of rawLines) {
    if (isJsonl) {
      const parsed = parseJsonlLogLine(raw)
      if (parsed) {
        allParsed.push(parsed)
      }
      else {
        allParsed.push({ message: raw, raw })
      }
    }
    else {
      const parsed = parseRuntimeLogLine(raw)
      if (parsed) {
        allParsed.push(parsed)
      }
      else {
        allParsed.push({ message: raw, raw })
      }
    }
  }

  const hasMore = allParsed.length > tail
  const lines = hasMore ? allParsed.slice(-tail) : allParsed

  return { lines, logPath, offset: fileSize, hasMore }
}

export function createLogger(scope: string) {
  const logPath = getBackendLogPath()

  function log(level: LogLevel, ...args: unknown[]) {
    const message = args.map(formatLogValue).join(' ')
    const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${scope}] ${message}`
    writeLogLine(level, line)
    appendFileSync(logPath, `${line}\n`, 'utf8')
  }

  return {
    debug: (...args: unknown[]) => log('debug', ...args),
    info: (...args: unknown[]) => log('info', ...args),
    warn: (...args: unknown[]) => log('warn', ...args),
    error: (...args: unknown[]) => log('error', ...args),
  }
}
