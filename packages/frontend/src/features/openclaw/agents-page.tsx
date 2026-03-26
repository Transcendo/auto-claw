import { fetchAgentsSection, updateAgentsSection } from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { OpenClawAgentsPayload } from '@/types/openclaw'
import { ConfigSectionPage } from './config-section-page'
import { SchemaFormEditor } from './schema-form-editor'
import {
  buildCombinedAgentsSchema,
  validateAgainstSchema,
  validateAgentsPayload,
} from './utils'

export function AgentsPage() {
  const { metadata, isLoadingMetadata } = useEnvironmentContext()
  const agentsMetadata = metadata?.sections.agents
  const bindingsMetadata = metadata?.sections.bindings

  if (isLoadingMetadata || !agentsMetadata || !bindingsMetadata) {
    return null
  }

  const combinedSchema = buildCombinedAgentsSchema(
    agentsMetadata.schema,
    bindingsMetadata.schema
  )

  return (
    <ConfigSectionPage<OpenClawAgentsPayload>
      title='Agents'
      description='Manage agent defaults, individual agent instances, and the bindings that connect agents to channels.'
      queryKey='config-agents'
      fetcher={fetchAgentsSection}
      saver={updateAgentsSection}
      schema={combinedSchema}
      rawPath='inmemory://openclaw/agents.json'
      validate={(value) => {
        return [
          ...validateAgainstSchema(value.agents, agentsMetadata.schema, 'agents'),
          ...validateAgainstSchema(
            value.bindings,
            bindingsMetadata.schema,
            'bindings'
          ),
          ...validateAgentsPayload(value),
        ]
      }}
      builder={({ value, onChange }) => (
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Agents</CardTitle>
              <CardDescription>
                Configure agent defaults and the full agent list for the selected
                environment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchemaFormEditor
                path='agents'
                schema={agentsMetadata.schema}
                value={value.agents}
                onChange={(nextAgentsValue) => {
                  onChange({
                    ...value,
                    agents: (nextAgentsValue ?? {}) as Record<string, unknown>,
                  })
                }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bindings</CardTitle>
              <CardDescription>
                Bind channel and account matches to the appropriate agent id.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SchemaFormEditor
                path='bindings'
                schema={bindingsMetadata.schema}
                value={value.bindings}
                onChange={(nextBindingsValue) => {
                  onChange({
                    ...value,
                    bindings: Array.isArray(nextBindingsValue)
                      ? nextBindingsValue
                      : [],
                  })
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    />
  )
}
