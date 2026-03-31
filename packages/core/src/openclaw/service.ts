import { spawn } from 'node:child_process'
import { closeSync, openSync } from 'node:fs'
import { basename, join } from 'node:path'
import { createLogger, createRuntimeLogPath } from '../logger'
import { getEnvironmentById } from '../environments'
import { CoreError } from '../errors'
import {
  getEnvironmentLaunchMode,
  getEnvironmentRuntimeProcess,
  getGlobalSettings,
  setEnvironmentRuntimeProcess,
} from '../settings'
import type {
  ManagedRuntimeProcess,
  OpenClawCommandResult,
  OpenClawServiceAction,
  OpenClawServiceActionResult,
  OpenClawServiceStatus,
  OpenClawVersionCheckResult,
} from './types'

const logger = createLogger('openclaw.service')

type CommandContext = {
  environmentId: string
  openclawPath: string
  port: number
  command: string[]
  cwd: string | null
  env: NodeJS.ProcessEnv
  runMode: OpenClawServiceStatus['runMode']
  launchMode: OpenClawServiceStatus['launchMode']
}

type DaemonActionPayload = {
  service?: {
    loaded?: boolean
  }
}

type DaemonStatusPayload = {
  service?: {
    loaded?: boolean
    runtime?: {
      status?: string
    }
  }
  rpc?: {
    ok?: boolean
  }
}

function createCommandError(title: string, message: string) {
  return new CoreError({
    statusCode: 400,
    title,
    message,
  })
}

function ensureSourcePathForExecution() {
  const settings = getGlobalSettings()
  if (settings.runMode === 'source' && !settings.sourcePath) {
    throw createCommandError(
      'Source Path Required',
      'Set the OpenClaw source path before running source-mode commands'
    )
  }

  return settings
}

function buildCommandContext(
  environmentId: string,
  args: string[]
): CommandContext {
  const settings = ensureSourcePathForExecution()
  const environment = getEnvironmentById(environmentId)
  const env = {
    ...process.env,
    OPENCLAW_STATE_DIR: environment.openclawPath,
    OPENCLAW_CONFIG_PATH: join(environment.openclawPath, 'openclaw.json'),
    OPENCLAW_GATEWAY_PORT: String(environment.port),
    OPENCLAW_PROFILE: environment.profile,
  } satisfies NodeJS.ProcessEnv

  return {
    environmentId,
    openclawPath: environment.openclawPath,
    port: environment.port,
    command:
      settings.runMode === 'source'
        ? ['pnpm', 'openclaw', ...args]
        : ['openclaw', ...args],
    cwd: settings.runMode === 'source' ? settings.sourcePath : null,
    env,
    runMode: settings.runMode,
    launchMode: getEnvironmentLaunchMode(environmentId),
  }
}

function runCommand(
  context: CommandContext,
  timeoutMs = 20000
): Promise<OpenClawCommandResult> {
  logger.info('running command', {
    environmentId: context.environmentId,
    command: context.command,
    cwd: context.cwd,
  })

  return new Promise((resolveResult) => {
    const [file, ...args] = context.command
    const child = spawn(file, args, {
      cwd: context.cwd ?? undefined,
      env: context.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let finished = false
    let killedByTimeout = false

    const timeout = setTimeout(() => {
      killedByTimeout = true
      child.kill('SIGTERM')
    }, timeoutMs)

    const finish = (payload: OpenClawCommandResult) => {
      if (finished) {
        return
      }

      finished = true
      clearTimeout(timeout)

      logger.info('command finished', {
        environmentId: context.environmentId,
        command: context.command,
        ok: payload.ok,
        exitCode: payload.exitCode,
        error: payload.error,
      })

      resolveResult(payload)
    }

    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')

    child.stdout?.on('data', (chunk) => {
      stdout += chunk
    })

    child.stderr?.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', (error) => {
      finish({
        ok: false,
        command: context.command,
        cwd: context.cwd,
        stdout,
        stderr,
        exitCode: null,
        error: error.message,
      })
    })

    child.on('close', (code) => {
      finish({
        ok: !killedByTimeout && code === 0,
        command: context.command,
        cwd: context.cwd,
        stdout,
        stderr,
        exitCode: code,
        error: killedByTimeout ? 'Command timed out' : undefined,
      })
    })
  })
}

function parseJsonOutput<T>(stdout: string) {
  const trimmed = stdout.trim()
  if (!trimmed) {
    return null
  }

  try {
    return JSON.parse(trimmed) as T
  }
  catch {
    return null
  }
}

function pickVersionOutput(result: OpenClawCommandResult) {
  const stdout = result.stdout.trim()
  if (stdout) {
    return stdout.split(/\r?\n/)[0]?.trim()
  }

  const stderr = result.stderr.trim()
  if (stderr) {
    return stderr.split(/\r?\n/)[0]?.trim()
  }

  return undefined
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0)
    return true
  }
  catch (error) {
    const code
      = typeof error === 'object' && error !== null && 'code' in error
        ? error.code
        : undefined

    return code === 'EPERM'
  }
}

function buildRuntimeProcessRecord(
  context: CommandContext,
  pid: number,
  logPath: string
): ManagedRuntimeProcess {
  return {
    pid,
    startedAt: new Date().toISOString(),
    environmentId: context.environmentId,
    openclawPath: context.openclawPath,
    port: context.port,
    command: context.command,
    cwd: context.cwd,
    logPath,
  }
}

function toStatusBase(
  context: CommandContext,
  extra?: Partial<OpenClawServiceStatus>
): OpenClawServiceStatus {
  return {
    launchMode: context.launchMode,
    runMode: context.runMode,
    environmentId: context.environmentId,
    command: context.command,
    cwd: context.cwd,
    environmentVariables: {
      OPENCLAW_STATE_DIR: context.env.OPENCLAW_STATE_DIR ?? '',
      OPENCLAW_CONFIG_PATH: context.env.OPENCLAW_CONFIG_PATH ?? '',
      OPENCLAW_GATEWAY_PORT: context.env.OPENCLAW_GATEWAY_PORT ?? '',
    },
    installed: false,
    running: false,
    stdout: '',
    stderr: '',
    ...extra,
  }
}

async function waitForRuntimeStart(child: ReturnType<typeof spawn>) {
  return await new Promise<{ ok: boolean, error?: string }>((resolveResult) => {
    let settled = false

    const finish = (payload: { ok: boolean, error?: string }) => {
      if (settled) {
        return
      }

      settled = true
      resolveResult(payload)
    }

    const timer = setTimeout(() => finish({ ok: true }), 1200)

    child.once('error', (error) => {
      clearTimeout(timer)
      finish({ ok: false, error: error.message })
    })

    child.once('exit', (code) => {
      clearTimeout(timer)
      finish({
        ok: false,
        error: `Runtime exited early with code ${code ?? 'unknown'}`,
      })
    })
  })
}

function getHealthyRuntimeProcess(environmentId: string) {
  const runtimeProcess = getEnvironmentRuntimeProcess(environmentId)
  if (!runtimeProcess) {
    return null
  }

  if (isProcessAlive(runtimeProcess.pid)) {
    return runtimeProcess
  }

  logger.warn('runtime process is no longer alive, clearing record', {
    environmentId,
    pid: runtimeProcess.pid,
  })
  setEnvironmentRuntimeProcess(environmentId, null)
  return null
}

async function stopRuntimeProcess(environmentId: string) {
  const runtimeProcess = getHealthyRuntimeProcess(environmentId)
  if (!runtimeProcess) {
    return false
  }

  logger.info('stopping runtime process', {
    environmentId,
    pid: runtimeProcess.pid,
  })
  process.kill(runtimeProcess.pid, 'SIGTERM')

  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if (!isProcessAlive(runtimeProcess.pid)) {
      setEnvironmentRuntimeProcess(environmentId, null)
      return true
    }

    await new Promise(resolvePromise => setTimeout(resolvePromise, 200))
  }

  process.kill(runtimeProcess.pid, 'SIGKILL')
  setEnvironmentRuntimeProcess(environmentId, null)
  return true
}

function normalizeDaemonStatus(
  environmentId: string,
  context: CommandContext,
  result: OpenClawCommandResult
) {
  const payload = parseJsonOutput<DaemonStatusPayload & Record<string, unknown>>(
    result.stdout
  )

  return toStatusBase(context, {
    environmentId,
    installed: Boolean(payload?.service?.loaded),
    running:
      payload?.service?.runtime?.status === 'running'
      || payload?.rpc?.ok === true,
    stdout: result.stdout,
    stderr: result.stderr,
    error: result.ok
      ? undefined
      : ((result.error ?? result.stderr.trim()) || 'Command failed'),
    statusPayload: payload ?? undefined,
  })
}

async function runDaemonAction(
  environmentId: string,
  action: OpenClawServiceAction
): Promise<OpenClawServiceActionResult> {
  const context = buildCommandContext(environmentId, ['gateway', action, '--json'])
  const result = await runCommand(context)
  const payload = parseJsonOutput<DaemonActionPayload>(result.stdout)
  const succeeded = result.ok

  return {
    ...toStatusBase(context, {
      installed: Boolean(payload?.service?.loaded),
      running: succeeded && (action === 'start' || action === 'restart'),
      stdout: result.stdout,
      stderr: result.stderr,
      error: succeeded
        ? undefined
        : ((result.error ?? result.stderr.trim()) || 'Command failed'),
    }),
    action,
  }
}

function getRuntimeStatusForEnvironment(environmentId: string) {
  const context = buildCommandContext(environmentId, ['gateway', 'run'])
  const runtimeProcess = getHealthyRuntimeProcess(environmentId)

  if (!runtimeProcess) {
    return toStatusBase(context)
  }

  return toStatusBase(context, {
    running: true,
    pid: runtimeProcess.pid,
    startedAt: runtimeProcess.startedAt,
    logPath: runtimeProcess.logPath,
  })
}

export async function getOpenClawServiceStatus(environmentId: string) {
  const launchMode = getEnvironmentLaunchMode(environmentId)
  if (launchMode === 'runtime') {
    return getRuntimeStatusForEnvironment(environmentId)
  }

  const context = buildCommandContext(environmentId, ['gateway', 'status', '--json'])
  const result = await runCommand(context)
  return normalizeDaemonStatus(environmentId, context, result)
}

export async function checkOpenClawVersion(
  environmentId: string
): Promise<OpenClawVersionCheckResult> {
  const context = buildCommandContext(environmentId, ['--version'])
  const result = await runCommand(context)

  return {
    ...result,
    version: pickVersionOutput(result),
  }
}

export async function runOpenClawDoctorFix(environmentId: string): Promise<OpenClawCommandResult> {
  const context = buildCommandContext(environmentId, ['doctor', '--fix'])
  return await runCommand(context, 60000)
}

export async function setupOpenClawEnvironment(environmentId: string) {
  const context = buildCommandContext(environmentId, ['setup'])
  return await runCommand(context, 120000)
}

export async function installOpenClawService(environmentId: string) {
  return await runDaemonAction(environmentId, 'install')
}

export async function startOpenClawService(environmentId: string) {
  const launchMode = getEnvironmentLaunchMode(environmentId)
  if (launchMode === 'runtime') {
    return await startOpenClawRuntime(environmentId)
  }

  return await runDaemonAction(environmentId, 'start')
}

export async function stopOpenClawService(environmentId: string) {
  const launchMode = getEnvironmentLaunchMode(environmentId)
  if (launchMode === 'runtime') {
    return await stopOpenClawRuntime(environmentId)
  }

  return await runDaemonAction(environmentId, 'stop')
}

export async function restartOpenClawService(environmentId: string) {
  const launchMode = getEnvironmentLaunchMode(environmentId)
  if (launchMode === 'runtime') {
    return await restartOpenClawRuntime(environmentId)
  }

  return await runDaemonAction(environmentId, 'restart')
}

export async function startOpenClawRuntime(
  environmentId: string
): Promise<OpenClawServiceActionResult> {
  const context = buildCommandContext(environmentId, ['gateway', 'run'])
  await stopRuntimeProcess(environmentId)

  const logPath = createRuntimeLogPath(environmentId)
  const logFd = openSync(logPath, 'a')
  const [file, ...args] = context.command
  const child = spawn(file, args, {
    cwd: context.cwd ?? undefined,
    env: context.env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  })
  const startResult = await waitForRuntimeStart(child)
  closeSync(logFd)

  if (!startResult.ok || !child.pid) {
    logger.error('failed to start runtime process', {
      environmentId,
      error: startResult.error,
    })
    return {
      ...toStatusBase(context, {
        stderr: startResult.error ?? '',
        error: startResult.error ?? 'Failed to start runtime process',
      }),
      action: 'start',
    }
  }

  child.unref()
  const runtimeProcess = buildRuntimeProcessRecord(context, child.pid, logPath)
  setEnvironmentRuntimeProcess(environmentId, runtimeProcess)
  logger.info('runtime process started', {
    environmentId,
    pid: child.pid,
    logPath,
  })

  return {
    ...toStatusBase(context, {
      running: true,
      pid: child.pid,
      startedAt: runtimeProcess.startedAt,
      logPath,
    }),
    action: 'start',
  }
}

export async function stopOpenClawRuntime(
  environmentId: string
): Promise<OpenClawServiceActionResult> {
  const context = buildCommandContext(environmentId, ['gateway', 'run'])
  const stopped = await stopRuntimeProcess(environmentId)

  return {
    ...toStatusBase(context, {
      running: false,
      stdout: stopped ? 'Runtime stopped' : '',
    }),
    action: 'stop',
  }
}

export async function restartOpenClawRuntime(
  environmentId: string
): Promise<OpenClawServiceActionResult> {
  await stopOpenClawRuntime(environmentId)
  const result = await startOpenClawRuntime(environmentId)

  return {
    ...result,
    action: 'restart',
  }
}

export function getOpenClawCommandPreview(environmentId: string) {
  const context = buildCommandContext(environmentId, ['gateway', 'run'])
  return {
    command: context.command,
    cwd: context.cwd,
    env: {
      OPENCLAW_STATE_DIR: context.env.OPENCLAW_STATE_DIR,
      OPENCLAW_CONFIG_PATH: context.env.OPENCLAW_CONFIG_PATH,
      OPENCLAW_GATEWAY_PORT: context.env.OPENCLAW_GATEWAY_PORT,
    },
  }
}

export function getRuntimeLogName(logPath: string) {
  return basename(logPath)
}

export async function uninstallOpenClawService(environmentId: string) {
  return await runDaemonAction(environmentId, 'uninstall')
}

export async function cleanupEnvironmentService(environmentId: string) {
  const launchMode = getEnvironmentLaunchMode(environmentId)

  if (launchMode === 'runtime') {
    try {
      await stopRuntimeProcess(environmentId)
    }
    catch (error) {
      logger.warn('failed to stop runtime process during cleanup', { environmentId, error })
    }
    return
  }

  try {
    await runDaemonAction(environmentId, 'stop')
  }
  catch (error) {
    logger.warn('failed to stop daemon during cleanup', { environmentId, error })
  }

  try {
    await runDaemonAction(environmentId, 'uninstall')
  }
  catch (error) {
    logger.warn('failed to uninstall daemon during cleanup', { environmentId, error })
  }
}

export async function stopAndUninstallDaemon(environmentId: string) {
  try {
    await runDaemonAction(environmentId, 'stop')
  }
  catch (error) {
    logger.warn('failed to stop daemon during mode switch', { environmentId, error })
  }

  try {
    await runDaemonAction(environmentId, 'uninstall')
  }
  catch (error) {
    logger.warn('failed to uninstall daemon during mode switch', { environmentId, error })
  }
}
