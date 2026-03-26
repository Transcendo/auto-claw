import { CoreError } from '../errors'
import { getOpenClawConfigMetadata } from './metadata'
import {
  type OpenClawAgentsSection,
  type OpenClawConfigSectionKey,
  type OpenClawJsonSchemaNode,
  type OpenClawValidationIssue,
} from './types'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeTypes(type?: string | string[]) {
  return Array.isArray(type) ? type : type ? [type] : []
}

function typeMatches(value: unknown, expected: string) {
  switch (expected) {
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
  const normalizedTypes = normalizeTypes(schema.type)

  if (
    normalizedTypes.length > 0
    && !normalizedTypes.some((type) => typeMatches(value, type))
  ) {
    issues.push({
      path,
      message: `Expected ${formatType(schema.type)}`,
    })
    return
  }

  if (schema.enum && !schema.enum.some((candidate) => candidate === value)) {
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

  const knownProperties = schema.properties ?? {}
  for (const [key, childSchema] of Object.entries(knownProperties)) {
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
    if (key in knownProperties) {
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

function validateAgentsSection(section: OpenClawAgentsSection) {
  const issues: OpenClawValidationIssue[] = []
  const agents = Array.isArray(section.agents?.list)
    ? section.agents?.list
    : []

  const seenIds = new Set<string>()
  let defaultCount = 0

  for (const [index, agent] of agents.entries()) {
    if (!isPlainObject(agent)) {
      continue
    }

    const id = typeof agent.id === 'string' ? agent.id.trim() : ''
    if (!id) {
      continue
    }

    if (seenIds.has(id)) {
      issues.push({
        path: `agents.list[${index}].id`,
        message: 'Agent id must be unique',
      })
    }
    else {
      seenIds.add(id)
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

  const validAgentIds = seenIds.size > 0 ? seenIds : new Set(['main'])
  const bindings = Array.isArray(section.bindings) ? section.bindings : []

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

export function validateOpenClawSection(
  section: OpenClawConfigSectionKey,
  value: unknown
) {
  const sectionMetadata = getOpenClawConfigMetadata().sections[section]
  const issues: OpenClawValidationIssue[] = []
  validateNode(value, sectionMetadata.schema, section, issues)
  return issues
}

export function assertValidOpenClawSection(
  section: OpenClawConfigSectionKey,
  value: unknown
) {
  const issues = validateOpenClawSection(section, value)

  if (issues.length > 0) {
    throw new CoreError({
      statusCode: 400,
      title: 'Invalid Config Section',
      message: `${section} contains invalid values`,
      details: issues,
    })
  }
}

export function assertValidAgentsSection(section: OpenClawAgentsSection) {
  assertValidOpenClawSection('agents', section.agents ?? {})
  assertValidOpenClawSection('bindings', section.bindings ?? [])

  const issues = validateAgentsSection(section)
  if (issues.length > 0) {
    throw new CoreError({
      statusCode: 400,
      title: 'Invalid Agents Section',
      message: 'agents or bindings contain invalid values',
      details: issues,
    })
  }
}
