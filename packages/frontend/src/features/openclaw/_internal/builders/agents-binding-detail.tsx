import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getObjectPropertySchema } from '@/lib/json-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  getAgentIndexById,
  getBindingsForAgent,
  removeBindingForAgent,
  replaceBindingForAgent,
} from '../lib/agents-editor'
import { getEnumOptions, getMetadataDescription } from '../lib/agents-fields'
import { asObject } from '../lib/value-readers'
import { readInputValue, setOptionalStringValue } from '../lib/form-fields'

type AgentsBindingDetailProps = {
  routeAgentId: string
  routeBindingIndex: string
}

export function AgentsBindingDetail({
  routeAgentId,
  routeBindingIndex,
}: AgentsBindingDetailProps) {
  const navigate = useNavigate()
  const {
    value,
    onChange,
    onSave,
    isSaving,
    bindingItemSchema,
    metadataMap,
    resolveAgentId,
    saveVersion,
  } = useAgentsEditor()
  const currentAgentId = resolveAgentId(routeAgentId)
  const agentIndex = getAgentIndexById(value, currentAgentId)
  const currentBindingIndex = Number(routeBindingIndex)
  const bindings = getBindingsForAgent(value.bindings, currentAgentId)
  const binding = useMemo(
    () =>
      Number.isInteger(currentBindingIndex) && currentBindingIndex >= 0
        ? asObject(bindings[currentBindingIndex])
        : {},
    [bindings, currentBindingIndex]
  )
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => {
    if (agentIndex < 0) {
      return
    }

    if (saveVersion > 1 && currentAgentId !== routeAgentId) {
      void navigate({
        to: '/agents/agent/$agentId/bindings/$bindingIndex',
        params: {
          agentId: currentAgentId,
          bindingIndex: routeBindingIndex,
        },
        replace: true,
      })
    }
  }, [
    agentIndex,
    currentAgentId,
    navigate,
    routeAgentId,
    routeBindingIndex,
    saveVersion,
  ])

  const updateBinding = (
    updater:
      | Record<string, unknown>
      | ((bindingValue: Record<string, unknown>) => Record<string, unknown>)
  ) => {
    if (
      agentIndex < 0 ||
      currentBindingIndex < 0 ||
      currentBindingIndex >= bindings.length
    ) {
      return
    }

    const nextBinding =
      typeof updater === 'function' ? updater(binding) : updater

    onChange({
      ...value,
      bindings: replaceBindingForAgent(
        value,
        currentAgentId,
        currentBindingIndex,
        nextBinding
      ),
    })
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

  if (
    !Number.isInteger(currentBindingIndex) ||
    currentBindingIndex < 0 ||
    currentBindingIndex >= bindings.length
  ) {
    return (
      <DetailNotFound
        title='Binding not found'
        description='The selected binding no longer exists in the current draft.'
        backLabel='Back to Bindings'
        onBack={() =>
          void navigate({
            to: '/agents/agent/$agentId/bindings',
            params: { agentId: currentAgentId },
          })
        }
      />
    )
  }

  const matchSchema = getObjectPropertySchema(bindingItemSchema, 'match')

  return (
    <DetailPageShell
      title={`Binding ${currentBindingIndex + 1}`}
      description='Edit the current agent binding and its channel match conditions.'
      backLabel='Back to Bindings'
      onBack={() =>
        void navigate({
          to: '/agents/agent/$agentId/bindings',
          params: { agentId: currentAgentId },
        })
      }
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
              const nextValue = {
                ...value,
                bindings: removeBindingForAgent(
                  value,
                  currentAgentId,
                  currentBindingIndex
                ),
              }
              onChange(nextValue)
              const saved = await onSave(nextValue)
              if (saved) {
                void navigate({
                  to: '/agents/agent/$agentId/bindings',
                  params: { agentId: currentAgentId },
                })
              }
            }}
            disabled={isSaving}
          >
            Remove Binding
          </Button>
        </>
      )}
    >
      <DetailFormSection
        advancedOpen={advancedOpen}
        onAdvancedOpenChange={setAdvancedOpen}
        advancedChildren={
          <SchemaFormEditor
            path={`bindings[${currentBindingIndex}]`}
            schema={bindingItemSchema}
            value={binding}
            onChange={(nextValue) => updateBinding(asObject(nextValue))}
            layout='compact'
            descriptionMode='tooltip'
            hiddenPaths={[
              `bindings[${currentBindingIndex}].agentId`,
              `bindings[${currentBindingIndex}].type`,
              `bindings[${currentBindingIndex}].comment`,
              `bindings[${currentBindingIndex}].match.channel`,
              `bindings[${currentBindingIndex}].match.accountId`,
              `bindings[${currentBindingIndex}].match.teamId`,
              `bindings[${currentBindingIndex}].match.guildId`,
              `bindings[${currentBindingIndex}].match.peer.kind`,
              `bindings[${currentBindingIndex}].match.peer.id`,
              `bindings[${currentBindingIndex}].match.roles`,
              `bindings[${currentBindingIndex}].acp.backend`,
              `bindings[${currentBindingIndex}].acp.cwd`,
              `bindings[${currentBindingIndex}].acp.label`,
              `bindings[${currentBindingIndex}].acp.mode`,
            ]}
            compactFieldLayout='inline'
            compactBooleanColumns
          />
        }
      >
        <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
          <DetailFormRow
            label='Agent Id'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.agentId'
            )}
            className='xl:col-span-2'
          >
            <div className='rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm'>
              {currentAgentId}
            </div>
          </DetailFormRow>

          <DetailFormRow
            label='Type'
            description={getMetadataDescription(metadataMap, 'bindings.*.type')}
          >
            <SingleSelectField
              options={getEnumOptions(metadataMap, 'bindings.*.type')}
              value={readInputValue(binding.type)}
              onChange={(nextValue) =>
                updateBinding((currentBinding) => ({
                  ...currentBinding,
                  type: nextValue,
                }))
              }
              placeholder='Select binding type'
            />
          </DetailFormRow>

          <DetailFormRow
            label='Comment'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.comment'
            )}
          >
            <Input
              value={readInputValue(binding.comment)}
              onChange={(event) =>
                updateBinding((currentBinding) =>
                  setOptionalStringValue(
                    currentBinding,
                    'comment',
                    event.target.value
                  )
                )
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Match Channel'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.match.channel'
            )}
          >
            <Input
              value={readInputValue(asObject(binding.match).channel)}
              onChange={(event) =>
                updateBinding((currentBinding) => {
                  const nextMatch = {
                    ...asObject(currentBinding.match),
                  }
                  const nextValue = event.target.value.trim()
                  if (!nextValue) {
                    delete nextMatch.channel
                  } else {
                    nextMatch.channel = nextValue
                  }

                  return {
                    ...currentBinding,
                    match: nextMatch,
                  }
                })
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Match Account'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.match.accountId'
            )}
          >
            <Input
              value={readInputValue(asObject(binding.match).accountId)}
              onChange={(event) =>
                updateBinding((currentBinding) => {
                  const nextMatch = {
                    ...asObject(currentBinding.match),
                  }
                  const nextValue = event.target.value.trim()
                  if (!nextValue) {
                    delete nextMatch.accountId
                  } else {
                    nextMatch.accountId = nextValue
                  }

                  return {
                    ...currentBinding,
                    match: nextMatch,
                  }
                })
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Match Team'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.match.teamId'
            )}
          >
            <Input
              value={readInputValue(asObject(binding.match).teamId)}
              onChange={(event) =>
                updateBinding((currentBinding) => {
                  const nextMatch = {
                    ...asObject(currentBinding.match),
                  }
                  const nextValue = event.target.value.trim()
                  if (!nextValue) {
                    delete nextMatch.teamId
                  } else {
                    nextMatch.teamId = nextValue
                  }

                  return {
                    ...currentBinding,
                    match: nextMatch,
                  }
                })
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Match Guild'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.match.guildId'
            )}
          >
            <Input
              value={readInputValue(asObject(binding.match).guildId)}
              onChange={(event) =>
                updateBinding((currentBinding) => {
                  const nextMatch = {
                    ...asObject(currentBinding.match),
                  }
                  const nextValue = event.target.value.trim()
                  if (!nextValue) {
                    delete nextMatch.guildId
                  } else {
                    nextMatch.guildId = nextValue
                  }

                  return {
                    ...currentBinding,
                    match: nextMatch,
                  }
                })
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Peer Kind'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.match.peer.kind'
            )}
          >
            <SingleSelectField
              options={getEnumOptions(metadataMap, 'bindings.*.match.peer.kind')}
              value={readInputValue(asObject(asObject(binding.match).peer).kind)}
              onChange={(nextValue) =>
                updateBinding((currentBinding) => ({
                  ...currentBinding,
                  match: {
                    ...asObject(currentBinding.match),
                    peer: {
                      ...asObject(asObject(currentBinding.match).peer),
                      kind: nextValue,
                    },
                  },
                }))
              }
              placeholder='Select peer kind'
            />
          </DetailFormRow>

          <DetailFormRow
            label='Peer Id'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.match.peer.id'
            )}
          >
            <Input
              value={readInputValue(asObject(asObject(binding.match).peer).id)}
              onChange={(event) =>
                updateBinding((currentBinding) => ({
                  ...currentBinding,
                  match: {
                    ...asObject(currentBinding.match),
                    peer: setOptionalStringValue(
                      asObject(asObject(currentBinding.match).peer),
                      'id',
                      event.target.value
                    ),
                  },
                }))
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Match Roles'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.match.roles'
            )}
            className='xl:col-span-2'
          >
            <SchemaFormEditor
              path={`bindings[${currentBindingIndex}].match.roles`}
              schema={getObjectPropertySchema(matchSchema, 'roles')}
              value={asObject(binding.match).roles}
              onChange={(nextValue) =>
                updateBinding((currentBinding) => ({
                  ...currentBinding,
                  match: {
                    ...asObject(currentBinding.match),
                    roles: nextValue,
                  },
                }))
              }
              layout='compact'
              descriptionMode='tooltip'
              compactFieldLayout='inline'
              compactBooleanColumns
            />
          </DetailFormRow>

          <DetailFormRow
            label='ACP Backend'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.acp.backend'
            )}
          >
            <Input
              value={readInputValue(asObject(binding.acp).backend)}
              onChange={(event) =>
                updateBinding((currentBinding) => {
                  const nextAcp = {
                    ...asObject(currentBinding.acp),
                  }
                  const nextValue = event.target.value.trim()
                  if (!nextValue) {
                    delete nextAcp.backend
                  } else {
                    nextAcp.backend = nextValue
                  }

                  return {
                    ...currentBinding,
                    acp: nextAcp,
                  }
                })
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='ACP Cwd'
            description={getMetadataDescription(metadataMap, 'bindings.*.acp.cwd')}
          >
            <Input
              value={readInputValue(asObject(binding.acp).cwd)}
              onChange={(event) =>
                updateBinding((currentBinding) => {
                  const nextAcp = {
                    ...asObject(currentBinding.acp),
                  }
                  const nextValue = event.target.value.trim()
                  if (!nextValue) {
                    delete nextAcp.cwd
                  } else {
                    nextAcp.cwd = nextValue
                  }

                  return {
                    ...currentBinding,
                    acp: nextAcp,
                  }
                })
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='ACP Label'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.acp.label'
            )}
          >
            <Input
              value={readInputValue(asObject(binding.acp).label)}
              onChange={(event) =>
                updateBinding((currentBinding) => {
                  const nextAcp = {
                    ...asObject(currentBinding.acp),
                  }
                  const nextValue = event.target.value.trim()
                  if (!nextValue) {
                    delete nextAcp.label
                  } else {
                    nextAcp.label = nextValue
                  }

                  return {
                    ...currentBinding,
                    acp: nextAcp,
                  }
                })
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='ACP Mode'
            description={getMetadataDescription(
              metadataMap,
              'bindings.*.acp.mode'
            )}
          >
            <SingleSelectField
              options={getEnumOptions(metadataMap, 'bindings.*.acp.mode')}
              value={readInputValue(asObject(binding.acp).mode)}
              onChange={(nextValue) =>
                updateBinding((currentBinding) => ({
                  ...currentBinding,
                  acp: {
                    ...asObject(currentBinding.acp),
                    mode: nextValue,
                  },
                }))
              }
              placeholder='Select ACP mode'
            />
          </DetailFormRow>
        </div>
      </DetailFormSection>
    </DetailPageShell>
  )
}
