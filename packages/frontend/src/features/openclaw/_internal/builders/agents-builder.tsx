import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  appendAgent,
  createDefaultAgentValue,
  getAgentList,
  getNextAgentId,
  removeAgent,
  summarizeAgent,
} from '../lib/agents-editor'
import { readString } from '../lib/value-readers'
import { useAgentsEditor } from './agents-context'

export function AgentsBuilder() {
  const navigate = useNavigate()
  const { value, onChange, onSave, isSaving, agentItemSchema } =
    useAgentsEditor()
  const agents = getAgentList(value)

  const addAgent = async () => {
    const agentId = getNextAgentId(value)
    const nextAgent = createDefaultAgentValue(agentItemSchema, agentId)
    const nextValue = appendAgent(value, nextAgent)

    onChange(nextValue)
    const saved = await onSave(nextValue)
    if (!saved) {
      onChange(value)
      return
    }

    void navigate({
      to: '/agents/agent/$agentId',
      params: { agentId },
    })
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold tracking-tight'>Agents</h2>
          <p className='text-sm text-muted-foreground'>
            Edit defaults separately, then jump into each agent and its
            bindings from the overview cards.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => void navigate({ to: '/agents/defaults' })}
          >
            Default Agent
          </Button>
          <Button type='button' onClick={() => void addAgent()} disabled={isSaving}>
            Add Agent
          </Button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className='rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground'>
          Create an agent to start configuring details and bindings.
        </div>
      ) : (
        <div className='divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/80'>
          {agents.map((agent, index) => {
            const summary = summarizeAgent(agent)
            const agentId = readString(agent, 'id') ?? `agent-${index + 1}`

            return (
              <div
                key={`${agentId}-${index}`}
                className='flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between'
              >
                <button
                  type='button'
                  className='min-w-0 flex-1 text-left'
                  onClick={() =>
                    void navigate({
                      to: '/agents/agent/$agentId',
                      params: { agentId },
                    })
                  }
                >
                  <div className='truncate text-sm font-semibold text-foreground'>
                    {summary.title}
                  </div>
                  {summary.subtitle && (
                    <div className='truncate text-xs text-muted-foreground'>
                      {summary.subtitle}
                    </div>
                  )}
                  {summary.badges.length > 0 && (
                    <div className='mt-1 truncate text-xs text-muted-foreground'>
                      {summary.badges.join(' · ')}
                    </div>
                  )}
                  {summary.meta.length > 0 && (
                    <div className='mt-1 truncate text-xs text-muted-foreground'>
                      {summary.meta.join(' · ')}
                    </div>
                  )}
                </button>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      void navigate({
                        to: '/agents/agent/$agentId',
                        params: { agentId },
                      })
                    }
                  >
                    Details
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() =>
                      void navigate({
                        to: '/agents/agent/$agentId/bindings',
                        params: { agentId },
                      })
                    }
                  >
                    Bindings
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='ghost'
                    onClick={async () => {
                      const nextValue = removeAgent(value, index)
                      onChange(nextValue)
                      const saved = await onSave(nextValue)
                      if (!saved) {
                        onChange(value)
                        return
                      }

                      void navigate({ to: '/agents' })
                    }}
                    disabled={isSaving}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
