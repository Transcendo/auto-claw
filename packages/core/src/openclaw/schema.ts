import {
  type OpenClawConfigMetadataEntry,
  type OpenClawJsonSchemaNode,
} from './types'

type MetadataTreeNode = {
  segment: string
  path: string
  entry?: OpenClawConfigMetadataEntry
  children: Map<string, MetadataTreeNode>
}

function createNode(segment: string, path: string): MetadataTreeNode {
  return {
    segment,
    path,
    children: new Map(),
  }
}

function splitEntryPath(path: string) {
  return path
    .trim()
    .replace(/\[\]/g, '.*')
    .replace(/\[(\*|\d+)\]/g, '.*')
    .replace(/^\.+|\.+$/g, '')
    .split('.')
    .filter(Boolean)
}

function normalizeType(type?: string | string[]) {
  const rawTypes = Array.isArray(type) ? type : type ? [type] : []
  const normalized = Array.from(
    new Set(
      rawTypes.flatMap((value) =>
        value
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
      )
    )
  ).filter((value) => value !== 'undefined')

  if (normalized.length === 0) {
    return undefined
  }

  return normalized.length === 1 ? normalized[0] : normalized
}

function hasType(
  type: string | string[] | undefined,
  expected: string
) {
  if (!type) {
    return false
  }

  return Array.isArray(type) ? type.includes(expected) : type === expected
}

function insertEntry(root: MetadataTreeNode, entry: OpenClawConfigMetadataEntry) {
  const segments = splitEntryPath(entry.path)
  let current = root
  let currentPath = ''

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}.${segment}` : segment
    const existing = current.children.get(segment)
    if (existing) {
      current = existing
      continue
    }

    const next = createNode(segment, currentPath)
    current.children.set(segment, next)
    current = next
  }

  current.entry = entry
}

function buildMetadataTree(entries: OpenClawConfigMetadataEntry[]) {
  const root = createNode('', '')

  for (const entry of entries) {
    insertEntry(root, entry)
  }

  return root
}

function toSchemaNode(node: MetadataTreeNode): OpenClawJsonSchemaNode {
  const entry = node.entry
  const schemaType = normalizeType(entry?.type)
  const schema: OpenClawJsonSchemaNode = {}

  if (schemaType) {
    schema.type = schemaType
  }
  if (entry?.label) {
    schema.title = entry.label
  }
  if (entry?.help) {
    schema.description = entry.help
  }
  if (entry?.enumValues && entry.enumValues.length > 0) {
    schema.enum = entry.enumValues
  }
  if (entry?.defaultValue !== undefined) {
    schema.default = entry.defaultValue
  }

  const fixedChildren = Array.from(node.children.entries()).filter(
    ([segment]) => segment !== '*'
  )
  const wildcardChild = node.children.get('*')

  if (fixedChildren.length > 0) {
    schema.properties = Object.fromEntries(
      fixedChildren.map(([segment, child]) => [segment, toSchemaNode(child)])
    )

    const required = fixedChildren
      .filter(([, child]) => child.entry?.required)
      .map(([segment]) => segment)

    if (required.length > 0) {
      schema.required = required
    }
  }

  if (wildcardChild) {
    if (hasType(schemaType, 'array')) {
      schema.items = toSchemaNode(wildcardChild)
    }
    else {
      schema.additionalProperties = toSchemaNode(wildcardChild)
    }
  }

  if (hasType(schemaType, 'array') && !schema.items) {
    schema.items = {}
  }

  return schema
}

export function buildSectionSchemaFromEntries(
  entries: OpenClawConfigMetadataEntry[],
  section: string
) {
  const tree = buildMetadataTree(entries)
  const rootNode = tree.children.get(section)

  if (!rootNode) {
    return { type: 'object' } satisfies OpenClawJsonSchemaNode
  }

  return toSchemaNode(rootNode)
}
