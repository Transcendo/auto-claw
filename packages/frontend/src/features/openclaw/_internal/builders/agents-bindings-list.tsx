import { useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  DetailNotFound,
  DetailPageShell,
  EntityCard,
  EntityGrid,
} from '@/components/config-builder'
import { useAgentsEditor } from './agents-context'
import {
  appendBindingForAgent,
  createDefaultBindingValue,
  getAgentById,
  getAgentIndexById,
  getBindingsForAgent,
  removeBindingForAgent,
  summarizeBinding,
} from '../lib/agents-editor'
import { asObject, readString } from '../lib/value-readers'

type AgentsBindingsListProps = {
  routeAgentId: string
}

export function AgentsBindingsList({
  routeAgentId,
}: AgentsBindingsListProps) {
  const navigate = useNavigate()
  const {
    value,
    onChange,
    onSave,
    isSaving,
    bindingItemSchema,
    resolveAgentId,
    saveVersion,
  } = useAgentsEditor()
  const currentAgentId = resolveAgentId(routeAgentId)
  const agentIndex = getAgentIndexById(value, currentAgentId)
  const agent = useMemo(
    () => (agentIndex >= 0 ? asObject(getAgentById(value, currentAgentId)) : {}),
    [agentIndex, currentAgentId, value]
  )
  const bindings = getBindingsForAgent(value.bindings, currentAgentId)

  useEffect(() => {
    if (agentIndex < 0) {
      return
    }

    if (saveVersion > 1 && currentAgentId !== routeAgentId) {
      void navigate({
        to: '/agents/agent/$agentId/bindings',
        params: { agentId: currentAgentId },
        replace: true,
      })
    }
  }, [agentIndex, currentAgentId, navigate, routeAgentId, saveVersion])

  const openBindingDetail = (bindingIndex: number) => {
    void navigate({
      to: '/agents/agent/$agentId/bindings/$bindingIndex',
      params: {
        agentId: currentAgentId,
        bindingIndex: `${bindingIndex}`,
      },
    })
  }

  const addBinding = async () => {
    if (!bindingItemSchema || agentIndex < 0) {
      return
    }

    const nextBinding = createDefaultBindingValue(
      bindingItemSchema,
      currentAgentId
    )
    const nextBindingIndex = bindings.length

    const nextValue = appendBindingForAgent(value, currentAgentId, nextBinding)

    onChange(nextValue)
    const saved = await onSave(nextValue)
    if (!saved) {
      onChange(value)
      return
    }

    void navigate({
      to: '/agents/agent/$agentId/bindings/$bindingIndex',
      params: {
        agentId: currentAgentId,
        bindingIndex: `${nextBindingIndex}`,
      },
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

  return (
    <DetailPageShell
      title={`${readString(agent, 'name') ?? currentAgentId} Bindings`}
      description='Bindings are scoped to the current agent and edited from a dedicated detail page.'
      backLabel='Back to Agent'
      onBack={() =>
        void navigate({
          to: '/agents/agent/$agentId',
          params: { agentId: currentAgentId },
        })
      }
      actions={(
        <Button onClick={() => void addBinding()} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Add Binding'}
        </Button>
      )}
    >
      <EntityGrid
        emptyTitle='No bindings yet'
        emptyDescription='Create a binding to connect this agent to a channel route.'
      >
        {bindings.map((binding, index) => {
          const summary = summarizeBinding(binding)

          return (
            <EntityCard
              key={`${summary.title}-${index}`}
              title={summary.title}
              subtitle={summary.subtitle}
              meta={summary.meta}
              onClick={() => openBindingDetail(index)}
              actions={(
                <>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => openBindingDetail(index)}
                  >
                    Details
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={async () => {
                      const nextValue = {
                        ...value,
                        bindings: removeBindingForAgent(
                          value,
                          currentAgentId,
                          index
                        ),
                      }
                      onChange(nextValue)
                      const saved = await onSave(nextValue)
                      if (!saved) {
                        onChange(value)
                      }
                    }}
                    disabled={isSaving}
                  >
                    Remove
                  </Button>
                </>
              )}
            />
          )
        })}
      </EntityGrid>
    </DetailPageShell>
  )
}
