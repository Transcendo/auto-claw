import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getAutoClawDirectoryPath } from './app-config'

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
