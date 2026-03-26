import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { getSqlite, initializeDatabase } from './db'
import { CoreError } from './errors'
import type { EnvironmentRecord } from './openclaw/types'

type EnvironmentRow = {
  id: string
  openclaw_path: string
  created_at: string
  updated_at: string
}

function mapEnvironmentRow(row: EnvironmentRow): EnvironmentRecord {
  return {
    id: row.id,
    openclawPath: row.openclaw_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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
  initializeDatabase()
  const sqlite = getSqlite()
  return sqlite
    .prepare(
      'SELECT id, openclaw_path, created_at, updated_at FROM environments WHERE id = ?'
    )
    .get(id) as EnvironmentRow | undefined
}

export function listEnvironments() {
  initializeDatabase()
  const sqlite = getSqlite()
  const rows = sqlite
    .prepare(
      'SELECT id, openclaw_path, created_at, updated_at FROM environments ORDER BY created_at ASC'
    )
    .all() as EnvironmentRow[]

  return rows.map(mapEnvironmentRow)
}

export function getEnvironmentById(id: string) {
  const row = findEnvironmentById(id)
  if (!row) {
    throw new CoreError({
      statusCode: 404,
      title: 'Environment Not Found',
      message: `Environment ${id} was not found`,
    })
  }

  return mapEnvironmentRow(row)
}

export function getFirstEnvironment() {
  const environment = listEnvironments()[0]
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
  const sqlite = getSqlite()
  const existing = sqlite
    .prepare('SELECT id FROM environments WHERE openclaw_path = ?')
    .get(openclawPath) as { id: string } | undefined

  if (existing) {
    return getEnvironmentById(existing.id)
  }

  const now = new Date().toISOString()
  const environment: EnvironmentRecord = {
    id: randomUUID(),
    openclawPath,
    createdAt: now,
    updatedAt: now,
  }

  sqlite
    .prepare(`
      INSERT INTO environments (id, openclaw_path, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `)
    .run(
      environment.id,
      environment.openclawPath,
      environment.createdAt,
      environment.updatedAt
    )

  return environment
}

export function deleteEnvironment(id: string) {
  const sqlite = getSqlite()
  const result = sqlite
    .prepare('DELETE FROM environments WHERE id = ?')
    .run(id)

  if (result.changes === 0) {
    throw new CoreError({
      statusCode: 404,
      title: 'Environment Not Found',
      message: `Environment ${id} was not found`,
    })
  }
}
