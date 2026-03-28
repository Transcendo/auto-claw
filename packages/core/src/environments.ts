import { existsSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import {
  readAutoClawConfig,
  writeAutoClawConfig,
} from './app-config'
import { CoreError } from './errors'
import type { EnvironmentRecord } from './openclaw/types'

function normalizeOpenClawPath(openclawPath: string) {
  return resolve(openclawPath.trim())
}

function assertValidEnvironmentPath(openclawPath: string) {
  const normalizedPath = normalizeOpenClawPath(openclawPath)

  if (!normalizedPath) {
    throw new CoreError({
      statusCode: 400,
      title: 'Invalid Environment Path',
      message: 'openclawPath is required',
    })
  }

  if (!existsSync(normalizedPath)) {
    throw new CoreError({
      statusCode: 400,
      title: 'Invalid Environment Path',
      message: 'Environment path does not exist',
    })
  }

  if (!statSync(normalizedPath).isDirectory()) {
    throw new CoreError({
      statusCode: 400,
      title: 'Invalid Environment Path',
      message: 'Environment path must be a directory',
    })
  }

  return normalizedPath
}

function findEnvironmentById(id: string) {
  return readAutoClawConfig().environments.find(environment => environment.id === id)
}

export function listEnvironments() {
  return readAutoClawConfig().environments
}

export function getEnvironmentById(id: string) {
  const environment = findEnvironmentById(id)
  if (!environment) {
    throw new CoreError({
      statusCode: 404,
      title: 'Environment Not Found',
      message: `Environment ${id} was not found`,
    })
  }

  return environment
}

export function getFirstEnvironment() {
  const config = readAutoClawConfig()
  const environment
    = config.environments.find(
      item => item.id === config.defaultEnvironmentId
    ) ?? config.environments[0]

  if (!environment) {
    throw new CoreError({
      statusCode: 404,
      title: 'Environments Not Found',
      message: 'No environments have been configured',
    })
  }

  return environment
}

export function createEnvironment(input: { openclawPath: string }) {
  const openclawPath = assertValidEnvironmentPath(input.openclawPath)
  const config = readAutoClawConfig()
  const existing = config.environments.find(
    environment => environment.openclawPath === openclawPath
  )

  if (existing) {
    return existing
  }

  const now = new Date().toISOString()
  const environment: EnvironmentRecord = {
    id: randomUUID(),
    openclawPath,
    createdAt: now,
    updatedAt: now,
  }

  const nextConfig = {
    ...config,
    defaultEnvironmentId: config.defaultEnvironmentId ?? environment.id,
    environments: [...config.environments, environment],
  }

  writeAutoClawConfig(nextConfig)

  return environment
}

export function deleteEnvironment(id: string) {
  const config = readAutoClawConfig()
  const nextEnvironments = config.environments.filter(environment => environment.id !== id)

  if (nextEnvironments.length === config.environments.length) {
    throw new CoreError({
      statusCode: 404,
      title: 'Environment Not Found',
      message: `Environment ${id} was not found`,
    })
  }

  const defaultEnvironmentId
    = config.defaultEnvironmentId === id
      ? (nextEnvironments[0]?.id ?? null)
      : config.defaultEnvironmentId

  writeAutoClawConfig({
    ...config,
    defaultEnvironmentId,
    environments: nextEnvironments,
  })
}
