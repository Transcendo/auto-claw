import type {
  OpenClawAgentsPayload,
  OpenClawJsonSchemaNode,
  OpenClawValidationIssue,
} from '@/types/openclaw'

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function cloneJsonValue<T>(value: T): T {
  if (value === undefined) {
    return value
  }

  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

export function prettyJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function normalizeTypes(type?: string | string[]) {
  return Array.isArray(type) ? type : type ? [type] : []
}

function valueMatchesType(value: unknown, type: string) {
  switch (type) {
    case 'array':
      return Array.isArray(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
    case 'null':
      return value === null
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'object':
      return isPlainObject(value)
    case 'string':
      return typeof value === 'string'
    default:
      return true
  }
}

function getValueType(value: unknown) {
  if (Array.isArray(value)) {
    return 'array'
  }

  if (value === null) {
    return 'null'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number'
  }

  if (isPlainObject(value)) {
    return 'object'
  }

  return typeof value
}

export function inferSchemaFromValue(value: unknown): OpenClawJsonSchemaNode {
  if (Array.isArray(value)) {
    const firstDefined = value.find(item => item !== undefined)
    return {
      type: 'array',
      items: firstDefined === undefined ? {} : inferSchemaFromValue(firstDefined),
    }
  }

  if (isPlainObject(value)) {
    return {
      type: 'object',
      additionalProperties: true,
    }
  }

  if (value === null) {
    return {
      type: 'null',
    }
  }

  return {
    type: getValueType(value),
  }
}

function pickSchemaType(
  schema: OpenClawJsonSchemaNode | undefined,
  value: unknown
) {
  const schemaTypes = normalizeTypes(schema?.type)
  if (schemaTypes.length === 0) {
    return getValueType(value ?? {})
  }

  const matching = schemaTypes.find(type => valueMatchesType(value, type))
  return matching ?? schemaTypes[0]
}

export function buildDefaultValue(
  schema?: OpenClawJsonSchemaNode,
  preferredType?: string
): unknown {
  if (schema?.default !== undefined) {
    return cloneJsonValue(schema.default)
  }

  const type = preferredType ?? pickSchemaType(schema, undefined)

  switch (type) {
    case 'array':
      return []
    case 'boolean':
      return false
    case 'integer':
    case 'number':
      return 0
    case 'null':
      return null
    case 'object': {
      const value: Record<string, unknown> = {}
      for (const requiredKey of schema?.required ?? []) {
        const propertySchema = schema?.properties?.[requiredKey]
        value[requiredKey] = buildDefaultValue(propertySchema)
      }
      return value
    }
    case 'string':
    default:
      return ''
  }
}

function formatType(type?: string | string[]) {
  if (!type) {
    return 'valid value'
  }

  return Array.isArray(type) ? type.join(' | ') : type
}

function validateNode(
  value: unknown,
  schema: OpenClawJsonSchemaNode,
  path: string,
  issues: OpenClawValidationIssue[]
) {
  const types = normalizeTypes(schema.type)
  if (types.length > 0 && !types.some(type => valueMatchesType(value, type))) {
    issues.push({
      path,
      message: `Expected ${formatType(schema.type)}`,
    })
    return
  }

  if (schema.enum && !schema.enum.some(candidate => candidate === value)) {
    issues.push({
      path,
      message: 'Expected one of the allowed values',
    })
    return
  }

  if (Array.isArray(value)) {
    if (schema.items) {
      value.forEach((item, index) => {
        validateNode(item, schema.items as OpenClawJsonSchemaNode, `${path}[${index}]`, issues)
      })
    }
    return
  }

  if (!isPlainObject(value)) {
    return
  }

  for (const requiredKey of schema.required ?? []) {
    if (!(requiredKey in value)) {
      issues.push({
        path: path ? `${path}.${requiredKey}` : requiredKey,
        message: 'Required field is missing',
      })
    }
  }

  for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
    if (!(key in value)) {
      continue
    }

    validateNode(
      value[key],
      childSchema,
      path ? `${path}.${key}` : key,
      issues
    )
  }

  for (const [key, childValue] of Object.entries(value)) {
    if (key in (schema.properties ?? {})) {
      continue
    }

    if (schema.additionalProperties === true || schema.additionalProperties === undefined) {
      continue
    }

    if (schema.additionalProperties === false) {
      issues.push({
        path: path ? `${path}.${key}` : key,
        message: 'Unexpected field',
      })
      continue
    }

    validateNode(
      childValue,
      schema.additionalProperties,
      path ? `${path}.${key}` : key,
      issues
    )
  }
}

export function validateAgainstSchema(
  value: unknown,
  schema: OpenClawJsonSchemaNode,
  rootPath: string
) {
  const issues: OpenClawValidationIssue[] = []
  validateNode(value, schema, rootPath, issues)
  return issues
}

export function validateAgentsPayload(payload: OpenClawAgentsPayload) {
  const issues: OpenClawValidationIssue[] = []
  const agents = Array.isArray(payload.agents?.list) ? payload.agents.list : []
  const bindings = Array.isArray(payload.bindings) ? payload.bindings : []
  const seenAgentIds = new Set<string>()
  let defaultCount = 0

  for (const [index, agent] of agents.entries()) {
    if (!isPlainObject(agent)) {
      continue
    }

    const agentId = typeof agent.id === 'string' ? agent.id.trim() : ''
    if (!agentId) {
      continue
    }

    if (seenAgentIds.has(agentId)) {
      issues.push({
        path: `agents.list[${index}].id`,
        message: 'Agent id must be unique',
      })
    }
    else {
      seenAgentIds.add(agentId)
    }

    if (agent.default === true) {
      defaultCount += 1
    }
  }

  if (defaultCount > 1) {
    issues.push({
      path: 'agents.list',
      message: 'Only one agent can be marked as default',
    })
  }

  const validAgentIds = seenAgentIds.size > 0 ? seenAgentIds : new Set(['main'])
  for (const [index, binding] of bindings.entries()) {
    if (!isPlainObject(binding)) {
      continue
    }

    const agentId = typeof binding.agentId === 'string' ? binding.agentId.trim() : ''
    if (!agentId || !validAgentIds.has(agentId)) {
      issues.push({
        path: `bindings[${index}].agentId`,
        message: 'Binding agentId must reference an existing agent',
      })
    }
  }

  return issues
}

export function isSensitivePath(path: string) {
  return /(api.?key|token|secret|password|auth)/i.test(path)
}

export function formatFieldLabel(label: string | undefined, path: string) {
  if (label) {
    return label
  }

  const segments = path.split('.')
  const rawSegment = (segments[segments.length - 1] ?? path).replace(/\[\d+\]/g, '')
  return rawSegment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char: string) => char.toUpperCase())
}

export function getAddLabel(path: string) {
  if (path === 'channels') {
    return 'Add channel'
  }
  if (path.endsWith('.accounts')) {
    return 'Add account'
  }
  if (path === 'models.providers') {
    return 'Add provider'
  }
  if (path.endsWith('.models')) {
    return 'Add model'
  }
  if (path === 'agents.list') {
    return 'Add agent'
  }
  if (path === 'bindings') {
    return 'Add binding'
  }

  return 'Add item'
}

export function getNextEntryKey(
  path: string,
  value: Record<string, unknown>
) {
  const prefix
    = path === 'channels'
      ? 'channel'
      : path.endsWith('.accounts')
        ? 'account'
        : path === 'models.providers'
          ? 'provider'
          : 'item'
  let counter = 1
  let candidate = `${prefix}-${counter}`

  while (candidate in value) {
    counter += 1
    candidate = `${prefix}-${counter}`
  }

  return candidate
}

export function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function buildCombinedAgentsSchema(
  agentsSchema: OpenClawJsonSchemaNode,
  bindingsSchema: OpenClawJsonSchemaNode
): OpenClawJsonSchemaNode {
  return {
    type: 'object',
    required: ['agents', 'bindings'],
    additionalProperties: false,
    properties: {
      agents: agentsSchema,
      bindings: bindingsSchema,
    },
  }
}
