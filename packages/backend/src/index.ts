import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import {
  buildGreeting,
  checkOpenClawVersion,
  createEnvironment,
  deleteEnvironment,
  getEnvironmentStatus,
  getAutoClawSettings,
  initializeAutoClawConfig,
  getOpenClawAgentsSection,
  getOpenClawBackupContent,
  getOpenClawChannelsSection,
  getOpenClawConfigMetadataPayload,
  getOpenClawGenericSection,
  getOpenClawModelsSection,
  getOpenClawServiceStatus,
  isCoreError,
  listEnvironments,
  listOpenClawBackups,
  restoreOpenClawBackup,
  restartOpenClawService,
  startOpenClawService,
  stopOpenClawService,
  installOpenClawService,
  updateEnvironment,
  updateGlobalSettings,
  updateOpenClawAgentsSection,
  updateOpenClawChannelsSection,
  updateOpenClawGenericSection,
  updateOpenClawModelsSection,
} from '@auto-code/core'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

type ApiErrorBody = {
  title: string
  message?: string
  details?: unknown
}

const genericSectionKeys = [
  'env',
  'skills',
  'plugins',
  'gateway',
  'hooks',
  'mcp',
  'cron',
] as const

const app = new Hono()

function jsonBody<T extends Record<string, unknown>>(value: unknown) {
  return typeof value === 'object' && value !== null ? (value as T) : ({} as T)
}

function getRequiredString(
  body: Record<string, unknown>,
  key: string
) {
  const value = body[key]
  return typeof value === 'string' ? value : ''
}

function getOptionalString(
  body: Record<string, unknown>,
  key: string
) {
  const value = body[key]
  return typeof value === 'string' ? value : undefined
}

function getRequiredInteger(
  body: Record<string, unknown>,
  key: string
) {
  const value = body[key]
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }

  const error: ApiErrorBody = {
    title: 'Invalid Request',
    message: `${key} must be a positive integer`,
  }
  throw Object.assign(new Error(error.message), {
    statusCode: 400,
    title: error.title,
    details: undefined,
  })
}

function getRequiredNumber(value: string, field: string) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    const error: ApiErrorBody = {
      title: 'Invalid Backup Version',
      message: `${field} must be a positive integer`,
    }
    throw Object.assign(new Error(error.message), {
      statusCode: 400,
      title: error.title,
      details: undefined,
    })
  }

  return parsed
}

function toContentfulStatusCode(statusCode: number): ContentfulStatusCode {
  if ([101, 204, 205, 304].includes(statusCode)) {
    return 500
  }

  return statusCode as ContentfulStatusCode
}

app.onError((error, c) => {
  if (isCoreError(error)) {
    return c.json(
      {
        title: error.title,
        message: error.message,
        details: error.details,
      } satisfies ApiErrorBody,
      toContentfulStatusCode(error.statusCode)
    )
  }

  const statusCode
    = typeof error === 'object'
      && error !== null
      && 'statusCode' in error
      && typeof error.statusCode === 'number'
      ? toContentfulStatusCode(error.statusCode)
      : 500
  const title
    = typeof error === 'object'
      && error !== null
      && 'title' in error
      && typeof error.title === 'string'
      ? error.title
      : 'Internal Server Error'
  const message = error instanceof Error ? error.message : 'Unexpected server error'

  console.error('[backend] request failed')
  console.error(error)

  return c.json(
    {
      title,
      message,
    } satisfies ApiErrorBody,
    statusCode
  )
})

app.get('/api/hello', (c) => {
  return c.json({
    message: buildGreeting('backend'),
    time: new Date().toISOString(),
  })
})

app.get('/api/environments', (c) => {
  return c.json({
    items: listEnvironments(),
  })
})

app.get('/api/settings', (c) => {
  return c.json(getAutoClawSettings())
})

app.put('/api/settings/global', async (c) => {
  const body = jsonBody<{
    runMode?: 'global' | 'source'
    sourcePath?: string | null
    launchMode?: 'daemon' | 'runtime'
  }>(await c.req.json())

  const global = updateGlobalSettings({
    runMode: body.runMode,
    sourcePath:
      body.sourcePath === null ? null : getOptionalString(body, 'sourcePath'),
    launchMode: body.launchMode,
  })

  return c.json({ global })
})

app.post('/api/environments', async (c) => {
  const body = jsonBody<{ openclawPath?: string, port?: number | string }>(
    await c.req.json()
  )
  const item = createEnvironment({
    openclawPath: getRequiredString(body, 'openclawPath'),
    port: getRequiredInteger(body, 'port'),
  })

  return c.json({ item }, 201)
})

app.put('/api/environments/:id', async (c) => {
  const body = jsonBody<{ openclawPath?: string, port?: number | string }>(
    await c.req.json()
  )
  const item = updateEnvironment(c.req.param('id'), {
    openclawPath: getRequiredString(body, 'openclawPath'),
    port: getRequiredInteger(body, 'port'),
  })

  return c.json({ item })
})

app.delete('/api/environments/:id', (c) => {
  deleteEnvironment(c.req.param('id'))
  return c.json({ ok: true })
})

app.get('/api/environments/:id/status', async (c) => {
  const status = await getEnvironmentStatus(c.req.param('id'))
  return c.json(status)
})

app.get('/api/config/metadata', (c) => {
  return c.json(getOpenClawConfigMetadataPayload())
})

app.get('/api/environments/:id/config/models', async (c) => {
  const data = await getOpenClawModelsSection(c.req.param('id'))
  return c.json({ data })
})

app.put('/api/environments/:id/config/models', async (c) => {
  const body = jsonBody<{ data?: Record<string, unknown> }>(await c.req.json())
  const data = await updateOpenClawModelsSection(
    c.req.param('id'),
    jsonBody(body.data)
  )

  return c.json({ data })
})

app.get('/api/environments/:id/config/channels', async (c) => {
  const data = await getOpenClawChannelsSection(c.req.param('id'))
  return c.json({ data })
})

app.put('/api/environments/:id/config/channels', async (c) => {
  const body = jsonBody<{ data?: Record<string, unknown> }>(await c.req.json())
  const data = await updateOpenClawChannelsSection(
    c.req.param('id'),
    jsonBody(body.data)
  )

  return c.json({ data })
})

app.get('/api/environments/:id/config/agents', async (c) => {
  const data = await getOpenClawAgentsSection(c.req.param('id'))
  return c.json({ data })
})

app.put('/api/environments/:id/config/agents', async (c) => {
  const body = jsonBody<{
    data?: {
      agents?: Record<string, unknown>
      bindings?: unknown[]
    }
  }>(await c.req.json())
  const data = await updateOpenClawAgentsSection(c.req.param('id'), {
    agents: jsonBody(body.data?.agents),
    bindings: Array.isArray(body.data?.bindings) ? body.data?.bindings : [],
  })

  return c.json({ data })
})

for (const section of genericSectionKeys) {
  app.get(`/api/environments/:id/config/${section}`, async (c) => {
    const data = await getOpenClawGenericSection(c.req.param('id'), section)
    return c.json({ data })
  })

  app.put(`/api/environments/:id/config/${section}`, async (c) => {
    const body = jsonBody<{ data?: Record<string, unknown> }>(await c.req.json())
    const data = await updateOpenClawGenericSection(
      c.req.param('id'),
      section,
      jsonBody(body.data)
    )

    return c.json({ data })
  })
}

app.get('/api/environments/:id/backups', async (c) => {
  const items = await listOpenClawBackups(c.req.param('id'))
  return c.json({ items })
})

app.get('/api/environments/:id/backups/:version', async (c) => {
  const version = getRequiredNumber(c.req.param('version'), 'version')
  const backup = await getOpenClawBackupContent(c.req.param('id'), version)
  return c.json(backup)
})

app.post('/api/environments/:id/backups/:version/restore', async (c) => {
  const version = getRequiredNumber(c.req.param('version'), 'version')
  const status = await restoreOpenClawBackup(c.req.param('id'), version)
  return c.json({ status })
})

app.post('/api/settings/check-version', async (c) => {
  const body = jsonBody<{ environmentId?: string }>(await c.req.json())
  const result = await checkOpenClawVersion(getRequiredString(body, 'environmentId'))
  return c.json(result)
})

app.get('/api/settings/service/status', async (c) => {
  const environmentId = c.req.query('environmentId') ?? ''
  const status = await getOpenClawServiceStatus(environmentId)
  return c.json(status)
})

app.post('/api/settings/service/install', async (c) => {
  const body = jsonBody<{ environmentId?: string }>(await c.req.json())
  const result = await installOpenClawService(getRequiredString(body, 'environmentId'))
  return c.json(result)
})

app.post('/api/settings/service/start', async (c) => {
  const body = jsonBody<{ environmentId?: string }>(await c.req.json())
  const result = await startOpenClawService(getRequiredString(body, 'environmentId'))
  return c.json(result)
})

app.post('/api/settings/service/stop', async (c) => {
  const body = jsonBody<{ environmentId?: string }>(await c.req.json())
  const result = await stopOpenClawService(getRequiredString(body, 'environmentId'))
  return c.json(result)
})

app.post('/api/settings/service/restart', async (c) => {
  const body = jsonBody<{ environmentId?: string }>(await c.req.json())
  const result = await restartOpenClawService(getRequiredString(body, 'environmentId'))
  return c.json(result)
})

const distDir = process.env.FRONTEND_DIST
if (distDir && existsSync(distDir)) {
  app.use('/*', serveStatic({ root: distDir }))
  app.get('*', async (c) => {
    if (c.req.path.startsWith('/api/'))
      return c.notFound()
    const indexPath = resolve(distDir, 'index.html')
    const html = await readFile(indexPath, 'utf-8')
    return c.html(html)
  })
}
else if (distDir) {
  console.warn(`[backend] FRONTEND_DIST not found: ${distDir}`)
}

const port = Number(process.env.PORT ?? 3000)

try {
  initializeAutoClawConfig()
}
catch (error) {
  console.error('[backend] failed to initialize config storage')
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

console.log(`[backend] listening on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
