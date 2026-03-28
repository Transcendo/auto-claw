import type {
  OpenClawConfigSectionKey,
  OpenClawGenericSection,
  OpenClawJsonSchemaNode,
} from '@/types/openclaw'
import { SchemaFormEditor } from './schema-form-editor'

type GenericSchemaSectionBuilderProps = {
  sectionKey: Exclude<OpenClawConfigSectionKey, 'agents' | 'bindings'>
  schema: OpenClawJsonSchemaNode
  value: OpenClawGenericSection
  onChange: (value: OpenClawGenericSection) => void
  validationIssues?: Array<{ path: string; message: string }>
}

function buildIssueMap(issues: Array<{ path: string; message: string }>) {
  const map = new Map<string, string[]>()
  for (const issue of issues) {
    const current = map.get(issue.path) ?? []
    current.push(issue.message)
    map.set(issue.path, current)
  }

  return map
}

export function GenericSchemaSectionBuilder({
  sectionKey,
  schema,
  value,
  onChange,
  validationIssues = [],
}: GenericSchemaSectionBuilderProps) {
  const issueMap = buildIssueMap(validationIssues)

  return (
    <SchemaFormEditor
      path={sectionKey}
      schema={schema}
      value={value}
      onChange={(nextValue) => onChange(nextValue as OpenClawGenericSection)}
      layout='compact'
      descriptionMode='tooltip'
      showAllFields
      compactFieldLayout='inline'
      compactBooleanColumns
      issuesByPath={issueMap}
    />
  )
}
