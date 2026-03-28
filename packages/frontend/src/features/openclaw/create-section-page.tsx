import { Outlet } from '@tanstack/react-router'
import type {
  OpenClawAgentsPayload,
  OpenClawGenericSection,
} from '@/types/openclaw'
import {
  fetchAgentsSection,
  fetchGenericConfigSection,
  updateAgentsSection,
  updateGenericConfigSection,
} from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'
import { GenericSchemaSectionBuilder } from './generic-schema-section-builder'
import { AgentsEditorProvider } from './_internal/builders/agents-context'
import { ChannelsEditorProvider } from './_internal/builders/channels-context'
import { ModelsEditorProvider } from './_internal/builders/models-context'
import { ConfigSectionPage } from './config-section-page'
import { getOpenClawSectionDefinition } from './section-registry'
import {
  buildCombinedAgentsSchema,
  validateAgainstSchema,
  validateAgentsPayload,
} from './utils'

export function createGenericSectionPage(
  sectionKey: Exclude<
    ReturnType<typeof getOpenClawSectionDefinition>['sectionKey'],
    'models' | 'channels' | 'agents'
  >
) {
  const definition = getOpenClawSectionDefinition(sectionKey)

  return function GenericSectionPage() {
    const { metadata, isLoadingMetadata } = useEnvironmentContext()
    const sectionMetadata = metadata?.sections[sectionKey]

    if (isLoadingMetadata || !sectionMetadata) {
      return null
    }

    return (
      <ConfigSectionPage<OpenClawGenericSection>
        title={definition.title}
        description={definition.description}
        queryKey={definition.queryKey}
        fetcher={environmentId =>
          fetchGenericConfigSection(environmentId, sectionKey)}
        saver={(environmentId, value) =>
          updateGenericConfigSection(environmentId, sectionKey, value)}
        schema={sectionMetadata.schema}
        rawPath={definition.rawPath}
        validate={value =>
          validateAgainstSchema(value, sectionMetadata.schema, sectionKey)}
        builder={({ value, onChange, validationIssues }) => (
          <GenericSchemaSectionBuilder
            sectionKey={sectionKey}
            schema={sectionMetadata.schema}
            value={value}
            onChange={onChange}
            validationIssues={validationIssues}
          />
        )}
      />
    )
  }
}

export function ModelsSectionPage() {
  const { metadata, isLoadingMetadata } = useEnvironmentContext()
  const definition = getOpenClawSectionDefinition('models')
  const sectionMetadata = metadata?.sections.models

  if (isLoadingMetadata || !sectionMetadata) {
    return null
  }

  return (
    <ConfigSectionPage<Record<string, unknown>>
      title={definition.title}
      description={definition.description}
      queryKey={definition.queryKey}
      fetcher={environmentId => fetchGenericConfigSection(environmentId, 'models')}
      saver={(environmentId, value) =>
        updateGenericConfigSection(environmentId, 'models', value)}
      schema={sectionMetadata.schema}
      rawPath={definition.rawPath}
      validate={value =>
        validateAgainstSchema(value, sectionMetadata.schema, 'models')}
      builder={({ value, onChange, onSave, isSaving, saveVersion }) => (
        <ModelsEditorProvider
          value={value}
          onChange={onChange}
          onSave={onSave}
          isSaving={isSaving}
          schema={sectionMetadata.schema}
          entries={sectionMetadata.entries}
          saveVersion={saveVersion}
        >
          <Outlet />
        </ModelsEditorProvider>
      )}
    />
  )
}

export function ChannelsSectionPage() {
  const { metadata, isLoadingMetadata } = useEnvironmentContext()
  const definition = getOpenClawSectionDefinition('channels')
  const sectionMetadata = metadata?.sections.channels

  if (isLoadingMetadata || !sectionMetadata) {
    return null
  }

  return (
    <ConfigSectionPage<Record<string, unknown>>
      title={definition.title}
      description={definition.description}
      queryKey={definition.queryKey}
      fetcher={environmentId =>
        fetchGenericConfigSection(environmentId, 'channels')}
      saver={(environmentId, value) =>
        updateGenericConfigSection(environmentId, 'channels', value)}
      schema={sectionMetadata.schema}
      rawPath={definition.rawPath}
      validate={value =>
        validateAgainstSchema(value, sectionMetadata.schema, 'channels')}
      builder={({ value, onChange, onSave, isSaving, saveVersion }) => (
        <ChannelsEditorProvider
          value={value}
          onChange={onChange}
          onSave={onSave}
          isSaving={isSaving}
          schema={sectionMetadata.schema}
          entries={sectionMetadata.entries}
          saveVersion={saveVersion}
        >
          <Outlet />
        </ChannelsEditorProvider>
      )}
    />
  )
}

export function AgentsSectionPage() {
  const { metadata, isLoadingMetadata } = useEnvironmentContext()
  const definition = getOpenClawSectionDefinition('agents')
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
      title={definition.title}
      description={definition.description}
      queryKey={definition.queryKey}
      fetcher={fetchAgentsSection}
      saver={updateAgentsSection}
      schema={combinedSchema}
      rawPath={definition.rawPath}
      validate={value => [
        ...validateAgainstSchema(value.agents, agentsMetadata.schema, 'agents'),
        ...validateAgainstSchema(value.bindings, bindingsMetadata.schema, 'bindings'),
        ...validateAgentsPayload(value),
      ]}
      builder={({ value, onChange, onSave, isSaving, saveVersion }) => (
        <AgentsEditorProvider
          value={value}
          onChange={onChange}
          onSave={onSave}
          isSaving={isSaving}
          agentsSchema={agentsMetadata.schema}
          bindingsSchema={bindingsMetadata.schema}
          entries={[...agentsMetadata.entries, ...bindingsMetadata.entries]}
          saveVersion={saveVersion}
        >
          <Outlet />
        </AgentsEditorProvider>
      )}
    />
  )
}
