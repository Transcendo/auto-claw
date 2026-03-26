import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getObjectPropertySchema } from '@/lib/json-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import { asObject } from '../lib/value-readers'
import {
  readBooleanInputValue,
  readInputValue,
  setBooleanValue,
  setOptionalStringValue,
} from '../lib/form-fields'

type AgentsAgentDetailProps = {
  routeAgentId: string
}

export function AgentsAgentDetail({
  routeAgentId,
}: AgentsAgentDetailProps) {
  const navigate = useNavigate()
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
      <DetailFormSection
        advancedOpen={advancedOpen}
        onAdvancedOpenChange={setAdvancedOpen}
        advancedChildren={
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
            ]}
            compactFieldLayout='inline'
            compactBooleanColumns
          />
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
            <SchemaFormEditor
              path={`agents.list[${agentIndex}].model`}
              schema={getObjectPropertySchema(agentSchema, 'model')}
              value={agent.model}
              onChange={(nextValue) =>
                updateAgent((currentAgent) => ({
                  ...currentAgent,
                  model: nextValue,
                }))
              }
              layout='compact'
              descriptionMode='tooltip'
              compactFieldLayout='inline'
              compactBooleanColumns
            />
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
            <SchemaFormEditor
              path={`agents.list[${agentIndex}].humanDelay`}
              schema={getObjectPropertySchema(agentSchema, 'humanDelay')}
              value={agent.humanDelay}
              onChange={(nextValue) =>
                updateAgent((currentAgent) => ({
                  ...currentAgent,
                  humanDelay: nextValue,
                }))
              }
              layout='compact'
              descriptionMode='tooltip'
              compactFieldLayout='inline'
              compactBooleanColumns
            />
          </DetailFormRow>
        </div>
      </DetailFormSection>
    </DetailPageShell>
  )
}
