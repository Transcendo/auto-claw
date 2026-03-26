import { Outlet } from '@tanstack/react-router'
import { fetchAgentsSection, updateAgentsSection } from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'
import type { OpenClawAgentsPayload } from '@/types/openclaw'
import { AgentsEditorProvider } from './_internal/builders/agents-context'
import { ConfigSectionPage } from './config-section-page'
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
      builder={({ value, onChange, onSave, isSaving, saveVersion }) => (
        <AgentsEditorProvider
          value={value}
          onChange={onChange}
          onSave={onSave}
          isSaving={isSaving}
          agentsSchema={agentsMetadata.schema}
          bindingsSchema={bindingsMetadata.schema}
          entries={[
            ...agentsMetadata.entries,
            ...bindingsMetadata.entries,
          ]}
          saveVersion={saveVersion}
        >
          <Outlet />
        </AgentsEditorProvider>
      )}
    />
  )
}
