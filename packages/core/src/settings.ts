import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createDefaultGlobalSettings,
  readAutoClawConfig,
  writeAutoClawConfig,
} from './app-config'
import { CoreError } from './errors'
import type {
  EnvironmentRecord,
  GlobalSettings,
  ManagedRuntimeProcess,
  OpenClawLaunchMode,
  OpenClawRunMode,
} from './openclaw/types'

function assertValidSourcePath(sourcePath: string | null) {
  if (sourcePath === null) {
    return null
  }

  const normalizedPath = resolve(sourcePath.trim())
  if (!normalizedPath) {
    return null
  }

  if (!existsSync(normalizedPath)) {
    throw new CoreError({
      statusCode: 400,
      title: 'Invalid Source Path',
      message: 'Source path does not exist',
    })
  }

  if (!statSync(normalizedPath).isDirectory()) {
    throw new CoreError({
      statusCode: 400,
      title: 'Invalid Source Path',
      message: 'Source path must be a directory',
    })
  }

  return normalizedPath
}

function assertValidRunMode(runMode: string): OpenClawRunMode {
  if (runMode === 'global' || runMode === 'source') {
    return runMode
  }

  throw new CoreError({
    statusCode: 400,
    title: 'Invalid Run Mode',
    message: 'runMode must be "global" or "source"',
  })
}

function assertValidLaunchMode(launchMode: string): OpenClawLaunchMode {
  if (launchMode === 'daemon' || launchMode === 'runtime') {
    return launchMode
  }

  throw new CoreError({
    statusCode: 400,
    title: 'Invalid Launch Mode',
    message: 'launchMode must be "daemon" or "runtime"',
  })
}

function getEnvironmentIndexOrThrow(environmentId: string) {
  const config = readAutoClawConfig()
  const index = config.environments.findIndex(
    environment => environment.id === environmentId
  )

  if (index < 0) {
    throw new CoreError({
      statusCode: 404,
      title: 'Environment Not Found',
      message: `Environment ${environmentId} was not found`,
    })
  }

  return { config, index }
}

function updateEnvironmentRecord(
  environmentId: string,
  updater: (environment: EnvironmentRecord) => EnvironmentRecord
) {
  const { config, index } = getEnvironmentIndexOrThrow(environmentId)
  const current = config.environments[index]
  const next = updater(current)
  const environments = [...config.environments]
  environments[index] = next

  writeAutoClawConfig({
    ...config,
    environments,
  })

  return next
}

export function getGlobalSettings() {
  return readAutoClawConfig().global
}

export function getAutoClawSettings() {
  const config = readAutoClawConfig()
  return {
    global: config.global,
  }
}

type UpdateGlobalSettingsInput = {
  runMode?: OpenClawRunMode
  sourcePath?: string | null
}

export function updateGlobalSettings(input: UpdateGlobalSettingsInput) {
  const config = readAutoClawConfig()
  const current = config.global ?? createDefaultGlobalSettings()

  const next: GlobalSettings = {
    ...current,
    runMode:
      input.runMode === undefined
        ? current.runMode
        : assertValidRunMode(input.runMode),
    sourcePath:
      input.sourcePath === undefined
        ? current.sourcePath
        : assertValidSourcePath(input.sourcePath),
  }

  writeAutoClawConfig({
    ...config,
    global: next,
  })

  return next
}

type UpdateEnvironmentSettingsInput = {
  launchMode?: OpenClawLaunchMode
}

export function updateEnvironmentSettings(
  environmentId: string,
  input: UpdateEnvironmentSettingsInput
) {
  return updateEnvironmentRecord(environmentId, (environment) => {
    const nextLaunchMode
      = input.launchMode === undefined
        ? environment.launchMode
        : assertValidLaunchMode(input.launchMode)

    if (
      environment.launchMode === 'runtime'
      && nextLaunchMode === 'daemon'
      && environment.runtimeProcess
    ) {
      try {
        process.kill(environment.runtimeProcess.pid, 'SIGTERM')
      }
      catch {}
    }

    return {
      ...environment,
      launchMode: nextLaunchMode,
      runtimeProcess:
        nextLaunchMode === 'runtime' ? environment.runtimeProcess : null,
      updatedAt: new Date().toISOString(),
    }
  })
}

export function getEnvironmentLaunchMode(environmentId: string) {
  const { config, index } = getEnvironmentIndexOrThrow(environmentId)
  return config.environments[index].launchMode
}

export function getEnvironmentRuntimeProcess(environmentId: string) {
  const { config, index } = getEnvironmentIndexOrThrow(environmentId)
  return config.environments[index].runtimeProcess
}

export function setEnvironmentRuntimeProcess(
  environmentId: string,
  runtimeProcess: ManagedRuntimeProcess | null
) {
  return updateEnvironmentRecord(environmentId, environment => ({
    ...environment,
    runtimeProcess,
    updatedAt: new Date().toISOString(),
  }))
}
