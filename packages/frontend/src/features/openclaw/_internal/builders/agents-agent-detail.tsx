import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { getObjectPropertySchema } from '@/lib/json-schema'
import { fetchAgentSkillsCatalog } from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DetailFormRow,
  DetailFormSection,
  DetailNotFound,
  DetailPageShell,
  SingleSelectField,
} from '@/components/config-builder'
import { SchemaFormEditor } from '../../schema-form-editor'
import { useAgentsEditor } from './agents-context'
import {
  getAgentById,
  getAgentIndexById,
  removeAgent,
  renameAgent,
  replaceAgent,
} from '../lib/agents-editor'
import {
  getEnumOptions,
  getMetadataDescription,
} from '../lib/agents-fields'
import { asArray, asObject } from '../lib/value-readers'
import {
  readBooleanInputValue,
  readInputValue,
  readNumberInputValue,
  setBooleanValue,
  setOptionalNumberValue,
  setOptionalStringValue,
} from '../lib/form-fields'
import { AgentModelFields } from './agent-model-fields'
import { AgentSubagentsFields } from './agent-subagents-fields'
import { SkillCatalogBrowser } from '../../skill-catalog-browser'

type AgentsAgentDetailProps = {
  routeAgentId: string
}

export function AgentsAgentDetail({
  routeAgentId,
}: AgentsAgentDetailProps) {
  const navigate = useNavigate()
  const { selectedEnvironmentId, environmentStatus } = useEnvironmentContext()
  const {
    value,
    onChange,
    onSave,
    isSaving,
    agentItemSchema,
    metadataMap,
    saveVersion,
    resolveAgentId,
    setAgentRouteAlias,
  } = useAgentsEditor()
  const currentAgentId = resolveAgentId(routeAgentId)
  const agentIndex = getAgentIndexById(value, currentAgentId)
  const agent = useMemo(
    () => (agentIndex >= 0 ? asObject(getAgentById(value, currentAgentId)) : {}),
    [agentIndex, currentAgentId, value]
  )
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [agentIdInput, setAgentIdInput] = useState(currentAgentId)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    setAgentIdInput(currentAgentId)
  }, [currentAgentId])

  useEffect(() => {
    if (agentIndex < 0) {
      return
    }

    if (saveVersion > 1 && currentAgentId !== routeAgentId) {
      void navigate({
        to: '/agents/agent/$agentId',
        params: { agentId: currentAgentId },
        replace: true,
      })
    }
  }, [agentIndex, currentAgentId, navigate, routeAgentId, saveVersion])

  const updateAgent = (
    updater:
      | Record<string, unknown>
      | ((agentValue: Record<string, unknown>) => Record<string, unknown>)
  ) => {
    if (agentIndex < 0) {
      return
    }

    const nextAgent = typeof updater === 'function' ? updater(agent) : updater

    onChange(
      replaceAgent(value, agentIndex, {
        ...nextAgent,
      })
    )
  }

  const commitAgentId = () => {
    const nextAgentId = agentIdInput.trim()

    if (!nextAgentId) {
      setAgentIdInput(currentAgentId)
      return
    }

    if (
      nextAgentId !== currentAgentId &&
      getAgentIndexById(value, nextAgentId) >= 0
    ) {
      setAgentIdInput(currentAgentId)
      return
    }

    if (nextAgentId === currentAgentId) {
      setAgentRouteAlias(routeAgentId, currentAgentId)
      return
    }

    onChange(
      renameAgent(value, agentIndex, {
        ...agent,
        id: nextAgentId,
      })
    )
    setAgentRouteAlias(routeAgentId, nextAgentId)
    setAgentIdInput(nextAgentId)
  }

  if (agentIndex < 0) {
    return (
      <DetailNotFound
        title='Agent not found'
        description='The selected agent no longer exists in the current draft.'
        backLabel='Back to Agents'
        onBack={() => void navigate({ to: '/agents' })}
      />
    )
  }

  const agentSchema = agentItemSchema
  const humanDelay = asObject(agent.humanDelay)
  const subagentsSchema = getObjectPropertySchema(agentSchema, 'subagents')
  const agentOptions = asArray(asObject(value.agents).list)
    .map((item) => asObject(item))
    .map((item) => {
      const itemId = readInputValue(item.id)

      return itemId
        ? {
            label: readInputValue(item.name) || itemId,
            value: itemId,
          }
        : null
    })
    .filter((item): item is { label: string; value: string } => item !== null)
  const agentSkillsQuery = useQuery({
    queryKey: ['agent-skills-catalog', selectedEnvironmentId, currentAgentId],
    queryFn: () =>
      fetchAgentSkillsCatalog(selectedEnvironmentId as string, currentAgentId),
    enabled:
      Boolean(selectedEnvironmentId) &&
      environmentStatus?.canLoadConfig === true,
  })

  return (
    <DetailPageShell
      title={readInputValue(agent.name) || currentAgentId}
      description='Edit agent-specific settings. Default selection is handled separately.'
      backLabel='Back to Agents'
      onBack={() => void navigate({ to: '/agents' })}
      actions={(
        <>
          <Button
            type='button'
            onClick={() => void onSave()}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            type='button'
            variant='ghost'
            onClick={async () => {
              const nextValue = removeAgent(value, agentIndex)
              onChange(nextValue)
              const saved = await onSave(nextValue)
              if (saved) {
                void navigate({ to: '/agents' })
              }
            }}
            disabled={isSaving}
          >
            Remove Agent
          </Button>
        </>
      )}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
        <TabsList>
          <TabsTrigger value='details'>Details</TabsTrigger>
          <TabsTrigger value='skills'>Skills</TabsTrigger>
        </TabsList>

        <TabsContent value='details' className='space-y-4'>
          <DetailFormSection
            advancedOpen={advancedOpen}
            onAdvancedOpenChange={setAdvancedOpen}
            advancedChildren={
              <div className='space-y-4'>
                <AgentSubagentsFields
                  pathPrefix={`agents.list[${agentIndex}].subagents`}
                  value={agent.subagents}
                  metadataMap={metadataMap}
                  schema={subagentsSchema}
                  agentOptions={agentOptions}
                  onChange={(nextValue) =>
                    updateAgent((currentAgent) => ({
                      ...currentAgent,
                      subagents: nextValue,
                    }))
                  }
                />

                <SchemaFormEditor
                  path={`agents.list[${agentIndex}]`}
                  schema={agentSchema}
                  value={agent}
                  onChange={(nextValue) => updateAgent(asObject(nextValue))}
                  layout='compact'
                  descriptionMode='tooltip'
                  hiddenPaths={[
                    `agents.list[${agentIndex}].default`,
                    `agents.list[${agentIndex}].id`,
                    `agents.list[${agentIndex}].name`,
                    `agents.list[${agentIndex}].model`,
                    `agents.list[${agentIndex}].workspace`,
                    `agents.list[${agentIndex}].agentDir`,
                    `agents.list[${agentIndex}].thinkingDefault`,
                    `agents.list[${agentIndex}].reasoningDefault`,
                    `agents.list[${agentIndex}].fastModeDefault`,
                    `agents.list[${agentIndex}].humanDelay`,
                    `agents.list[${agentIndex}].subagents`,
                  ]}
                  compactFieldLayout='inline'
                  compactBooleanColumns
                />
              </div>
            }
          >
            <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
              <DetailFormRow
                label='ID'
                description={getMetadataDescription(metadataMap, 'agents.list.*.id')}
              >
                <Input
                  value={agentIdInput}
                  onChange={(event) => setAgentIdInput(event.target.value)}
                  onBlur={commitAgentId}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitAgentId()
                    }
                  }}
                />
              </DetailFormRow>

              <DetailFormRow
                label='Name'
                description={getMetadataDescription(metadataMap, 'agents.list.*.name')}
              >
                <Input
                  value={readInputValue(agent.name)}
                  onChange={(event) =>
                    updateAgent((currentAgent) =>
                      setOptionalStringValue(currentAgent, 'name', event.target.value)
                    )
                  }
                />
              </DetailFormRow>

              <DetailFormRow
                label='Model'
                description={getMetadataDescription(metadataMap, 'agents.list.*.model')}
                className='xl:col-span-2'
              >
                <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
                  <AgentModelFields
                    labelPathPrefix='agents.list.*.model'
                    value={agent.model}
                    metadataMap={metadataMap}
                    onChange={(nextValue) =>
                      updateAgent((currentAgent) => ({
                        ...currentAgent,
                        model: nextValue,
                      }))
                    }
                  />
                </div>
              </DetailFormRow>

              <DetailFormRow
                label='Workspace'
                description={getMetadataDescription(
                  metadataMap,
                  'agents.list.*.workspace'
                )}
              >
                <Input
                  value={readInputValue(agent.workspace)}
                  onChange={(event) =>
                    updateAgent((currentAgent) =>
                      setOptionalStringValue(
                        currentAgent,
                        'workspace',
                        event.target.value
                      )
                    )
                  }
                />
              </DetailFormRow>

              <DetailFormRow
                label='Agent Dir'
                description={getMetadataDescription(
                  metadataMap,
                  'agents.list.*.agentDir'
                )}
              >
                <Input
                  value={readInputValue(agent.agentDir)}
                  onChange={(event) =>
                    updateAgent((currentAgent) =>
                      setOptionalStringValue(
                        currentAgent,
                        'agentDir',
                        event.target.value
                      )
                    )
                  }
                />
              </DetailFormRow>

              <DetailFormRow
                label='Thinking Default'
                description={getMetadataDescription(
                  metadataMap,
                  'agents.list.*.thinkingDefault'
                )}
              >
                <SingleSelectField
                  options={getEnumOptions(metadataMap, 'agents.list.*.thinkingDefault')}
                  value={readInputValue(agent.thinkingDefault)}
                  onChange={(nextValue) =>
                    updateAgent((currentAgent) => ({
                      ...currentAgent,
                      thinkingDefault: nextValue,
                    }))
                  }
                  placeholder='Select thinking level'
                />
              </DetailFormRow>

              <DetailFormRow
                label='Reasoning Default'
                description={getMetadataDescription(
                  metadataMap,
                  'agents.list.*.reasoningDefault'
                )}
              >
                <SingleSelectField
                  options={getEnumOptions(metadataMap, 'agents.list.*.reasoningDefault')}
                  value={readInputValue(agent.reasoningDefault)}
                  onChange={(nextValue) =>
                    updateAgent((currentAgent) => ({
                      ...currentAgent,
                      reasoningDefault: nextValue,
                    }))
                  }
                  placeholder='Select reasoning mode'
                />
              </DetailFormRow>

              <DetailFormRow
                label='Fast Mode Default'
                description={getMetadataDescription(
                  metadataMap,
                  'agents.list.*.fastModeDefault'
                )}
              >
                <div className='flex justify-end'>
                  <Switch
                    checked={readBooleanInputValue(agent.fastModeDefault, false)}
                    onCheckedChange={(checked) =>
                      updateAgent((currentAgent) =>
                        setBooleanValue(currentAgent, 'fastModeDefault', checked)
                      )
                    }
                  />
                </div>
              </DetailFormRow>

              <DetailFormRow
                label='Human Delay'
                description={getMetadataDescription(
                  metadataMap,
                  'agents.list.*.humanDelay'
                )}
                className='xl:col-span-2'
              >
                <div className='grid gap-3 md:grid-cols-3'>
                  <div className='space-y-2'>
                    <Label className='text-xs text-muted-foreground'>Min Ms</Label>
                    <Input
                      type='number'
                      value={readNumberInputValue(humanDelay.minMs)}
                      onChange={(event) =>
                        updateAgent((currentAgent) => ({
                          ...currentAgent,
                          humanDelay: setOptionalNumberValue(
                            asObject(currentAgent.humanDelay),
                            'minMs',
                            event.target.value
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label className='text-xs text-muted-foreground'>Max Ms</Label>
                    <Input
                      type='number'
                      value={readNumberInputValue(humanDelay.maxMs)}
                      onChange={(event) =>
                        updateAgent((currentAgent) => ({
                          ...currentAgent,
                          humanDelay: setOptionalNumberValue(
                            asObject(currentAgent.humanDelay),
                            'maxMs',
                            event.target.value
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label className='text-xs text-muted-foreground'>Mode</Label>
                    <SingleSelectField
                      options={getEnumOptions(metadataMap, 'agents.list.*.humanDelay.mode')}
                      value={readInputValue(humanDelay.mode)}
                      onChange={(nextValue) =>
                        updateAgent((currentAgent) => ({
                          ...currentAgent,
                          humanDelay: {
                            ...asObject(currentAgent.humanDelay),
                            mode: nextValue,
                          },
                        }))
                      }
                      placeholder='Select delay mode'
                    />
                  </div>
                </div>
              </DetailFormRow>
            </div>
          </DetailFormSection>
        </TabsContent>

        <TabsContent value='skills' className='space-y-4'>
          {selectedEnvironmentId && !agentSkillsQuery.isLoading && (
            <SkillCatalogBrowser
              environmentId={selectedEnvironmentId}
              groups={agentSkillsQuery.data?.groups ?? []}
              emptyTitle='No workspace skills found'
              emptyDescription='No SKILL.md files were discovered in this agent workspace.'
            />
          )}
        </TabsContent>
      </Tabs>
    </DetailPageShell>
  )
}
