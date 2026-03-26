import type { OpenClawJsonSchemaNode } from '@/types/openclaw'

export function getObjectPropertySchema(
  schema: OpenClawJsonSchemaNode | undefined,
  key: string
) {
  return schema?.properties?.[key]
}

export function getRecordValueSchema(schema: OpenClawJsonSchemaNode | undefined) {
  if (!schema || schema.additionalProperties === true || schema.additionalProperties === false) {
    return undefined
  }

  return schema.additionalProperties
}

export function getArrayItemSchema(schema: OpenClawJsonSchemaNode | undefined) {
  return schema?.items
}

export function pickSchemaProperties(
  schema: OpenClawJsonSchemaNode | undefined,
  keys: string[]
): OpenClawJsonSchemaNode {
  const properties = Object.fromEntries(
    keys
      .map(key => [key, schema?.properties?.[key]])
      .filter((entry): entry is [string, OpenClawJsonSchemaNode] => Boolean(entry[1]))
  )
  const required = (schema?.required ?? []).filter(key => key in properties)

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
    additionalProperties: false,
  }
}

export function listSchemaPropertyKeys(
  schema: OpenClawJsonSchemaNode | undefined
) {
  return Object.keys(schema?.properties ?? {})
}
