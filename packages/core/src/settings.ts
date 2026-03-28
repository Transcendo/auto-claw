import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createDefaultGlobalSettings,
  readAutoClawConfig,
  writeAutoClawConfig,
} from './app-config'
import { CoreError } from './errors'
import type {
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
  launchMode?: OpenClawLaunchMode
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
    launchMode:
      input.launchMode === undefined
        ? current.launchMode
        : assertValidLaunchMode(input.launchMode),
  }

  writeAutoClawConfig({
    ...config,
    global: next,
  })

  return next
}

export function setManagedRuntimeProcess(runtimeProcess: ManagedRuntimeProcess | null) {
  const config = readAutoClawConfig()

  writeAutoClawConfig({
    ...config,
    global: {
      ...config.global,
      runtimeProcess,
    },
  })
}
