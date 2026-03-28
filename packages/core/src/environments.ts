import { existsSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import {
  getDefaultEnvironmentPort,
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

function assertValidEnvironmentPort(port: number) {
  if (!Number.isInteger(port) || port < 1) {
    throw new CoreError({
      statusCode: 400,
      title: 'Invalid Environment Port',
      message: 'port must be a positive integer',
    })
  }

  return port
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

type EnvironmentInput = {
  openclawPath: string
  port: number
}

function matchesEnvironment(
  environment: EnvironmentRecord,
  input: EnvironmentInput,
  excludeId?: string
) {
  if (excludeId && environment.id === excludeId) {
    return false
  }

  return (
    environment.openclawPath === input.openclawPath
    && environment.port === input.port
  )
}

export function createEnvironment(input: EnvironmentInput) {
  const openclawPath = assertValidEnvironmentPath(input.openclawPath)
  const port = assertValidEnvironmentPort(input.port)
  const config = readAutoClawConfig()
  const existing = config.environments.find(environment =>
    matchesEnvironment(environment, { openclawPath, port })
  )

  if (existing) {
    return existing
  }

  const now = new Date().toISOString()
  const environment: EnvironmentRecord = {
    id: randomUUID(),
    openclawPath,
    port,
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

export function updateEnvironment(
  id: string,
  input: EnvironmentInput
) {
  const openclawPath = assertValidEnvironmentPath(input.openclawPath)
  const port = assertValidEnvironmentPort(input.port)
  const config = readAutoClawConfig()
  const current = config.environments.find(environment => environment.id === id)

  if (!current) {
    throw new CoreError({
      statusCode: 404,
      title: 'Environment Not Found',
      message: `Environment ${id} was not found`,
    })
  }

  const duplicate = config.environments.find(environment =>
    matchesEnvironment(environment, { openclawPath, port }, id)
  )

  if (duplicate) {
    return duplicate
  }

  const nextEnvironment: EnvironmentRecord = {
    ...current,
    openclawPath,
    port,
    updatedAt: new Date().toISOString(),
  }

  writeAutoClawConfig({
    ...config,
    environments: config.environments.map(environment =>
      environment.id === id ? nextEnvironment : environment
    ),
  })

  return nextEnvironment
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

export function getDefaultPortForEnvironment() {
  return getDefaultEnvironmentPort()
}
