import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getObjectPropertySchema } from '@/lib/json-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DetailFormRow,
  DetailFormSection,
  DetailNotFound,
  DetailPageShell,
} from '@/components/config-builder'
import { SchemaFormEditor } from '../../schema-form-editor'
import { useAgentsEditor } from './agents-context'
import {
  ensureSingleDefaultAgent,
  getAgentDefaults,
  getAgentList,
  getDefaultAgentId,
  setAgentDefaults,
  setAgentList,
} from '../lib/agents-editor'
import { getMetadataDescription, getEnumOptions } from '../lib/agents-fields'
import { asObject } from '../lib/value-readers'
import { readInputValue, readNumberInputValue, setOptionalNumberValue, setOptionalStringValue } from '../lib/form-fields'

export function AgentsDefaultsDetail() {
  const navigate = useNavigate()
  const {
    value,
    onChange,
    onSave,
    isSaving,
    defaultsSchema,
    metadataMap,
    saveVersion,
  } = useAgentsEditor()
  const agents = getAgentList(value)
  const currentDefaultAgentId = useMemo(() => getDefaultAgentId(value), [value])
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const defaultsValue = getAgentDefaults(value)

  const applyDefaultAgentSelection = (nextDefaultAgentId: string) => {
    const nextAgents = ensureSingleDefaultAgent(
      agents,
      nextDefaultAgentId || undefined
    )

    onChange(setAgentList(value, nextAgents))
  }

  const updateDefaults = (
    updater:
      | Record<string, unknown>
      | ((currentDefaults: Record<string, unknown>) => Record<string, unknown>)
  ) => {
    const nextDefaults =
      typeof updater === 'function' ? updater(defaultsValue) : updater

    onChange(setAgentDefaults(value, nextDefaults))
  }

  if (saveVersion > 1 && currentDefaultAgentId && !agents.some((agent) => asObject(agent).id === currentDefaultAgentId)) {
    return (
      <DetailNotFound
        title='Default agent not found'
        description='The selected default agent no longer exists in the current draft.'
        backLabel='Back to Agents'
        onBack={() => void navigate({ to: '/agents' })}
      />
    )
  }

  return (
    <DetailPageShell
      title='Default Agent'
      description='Configure shared defaults and choose which agent should be marked as the runtime default.'
      backLabel='Back to Agents'
      onBack={() => void navigate({ to: '/agents' })}
      actions={
        <Button
          type='button'
          onClick={() => void onSave()}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      }
    >
      <DetailFormSection
        advancedOpen={advancedOpen}
        onAdvancedOpenChange={setAdvancedOpen}
        advancedChildren={
          <SchemaFormEditor
            path='agents.defaults'
            schema={defaultsSchema}
            value={defaultsValue}
            onChange={(nextValue) => onChange(setAgentDefaults(value, asObject(nextValue)))}
            layout='compact'
            descriptionMode='tooltip'
            hiddenPaths={[
              'agents.defaults.model',
              'agents.defaults.workspace',
              'agents.defaults.thinkingDefault',
              'agents.defaults.humanDelay',
              'agents.defaults.timeoutSeconds',
            ]}
            compactFieldLayout='inline'
            compactBooleanColumns
          />
        }
      >
        <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
          <DetailFormRow
            label='Default Agent'
            description='Choose which agent is marked as the default runtime entry.'
            className='xl:col-span-2'
          >
            <Select
              value={currentDefaultAgentId || '__none__'}
              onValueChange={(nextValue) => {
                applyDefaultAgentSelection(
                  nextValue === '__none__' ? '' : nextValue
                )
              }}
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select default agent' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__none__'>No default agent</SelectItem>
                {agents.map((agent, index) => {
                  const agentId = asObject(agent).id as string | undefined
                  const agentName = asObject(agent).name as string | undefined
                  const valueKey = agentId ?? `agent-${index + 1}`

                  return (
                    <SelectItem key={valueKey} value={valueKey}>
                      {agentName ? `${agentName} (${valueKey})` : valueKey}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </DetailFormRow>

          <DetailFormRow
            label='Model'
            description={getMetadataDescription(metadataMap, 'agents.defaults.model')}
            className='xl:col-span-2'
          >
            <SchemaFormEditor
              path='agents.defaults.model'
              schema={getObjectPropertySchema(defaultsSchema, 'model')}
              value={defaultsValue.model}
              onChange={(nextValue) =>
                updateDefaults((currentDefaults) => ({
                  ...currentDefaults,
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
              'agents.defaults.workspace'
            )}
          >
            <Input
              value={readInputValue(defaultsValue.workspace)}
              onChange={(event) =>
                updateDefaults((currentDefaults) =>
                  setOptionalStringValue(
                    currentDefaults,
                    'workspace',
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
              'agents.defaults.thinkingDefault'
            )}
          >
            <Select
              value={readInputValue(defaultsValue.thinkingDefault)}
              onValueChange={(nextValue) =>
                updateDefaults((currentDefaults) => ({
                  ...currentDefaults,
                  thinkingDefault: nextValue,
                }))
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Select a thinking level' />
              </SelectTrigger>
              <SelectContent>
                {getEnumOptions(metadataMap, 'agents.defaults.thinkingDefault').map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DetailFormRow>

          <DetailFormRow
            label='Human Delay'
            description={getMetadataDescription(
              metadataMap,
              'agents.defaults.humanDelay'
            )}
            className='xl:col-span-2'
          >
            <SchemaFormEditor
              path='agents.defaults.humanDelay'
              schema={getObjectPropertySchema(defaultsSchema, 'humanDelay')}
              value={defaultsValue.humanDelay}
              onChange={(nextValue) =>
                updateDefaults((currentDefaults) => ({
                  ...currentDefaults,
                  humanDelay: nextValue,
                }))
              }
              layout='compact'
              descriptionMode='tooltip'
              compactFieldLayout='inline'
              compactBooleanColumns
            />
          </DetailFormRow>

          <DetailFormRow
            label='Timeout Seconds'
            description={getMetadataDescription(
              metadataMap,
              'agents.defaults.timeoutSeconds'
            )}
          >
            <Input
              type='number'
              value={readNumberInputValue(defaultsValue.timeoutSeconds)}
              onChange={(event) =>
                updateDefaults((currentDefaults) =>
                  setOptionalNumberValue(
                    currentDefaults,
                    'timeoutSeconds',
                    event.target.value
                  )
                )
              }
            />
          </DetailFormRow>
        </div>
      </DetailFormSection>
    </DetailPageShell>
  )
}
