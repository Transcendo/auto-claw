import { appendItem, removeItem, replaceItem } from '@/lib/collection-updates'
import type {
  OpenClawAgentsPayload,
  OpenClawJsonSchemaNode,
} from '@/types/openclaw'
import { buildDefaultValue } from '../../utils'
import {
  asArray,
  asObject,
  compactSummary,
  describeModelSelection,
  readBoolean,
  readString,
} from './value-readers'

export function getAgentsRoot(payload: OpenClawAgentsPayload) {
  return asObject(payload.agents)
}

export function getAgentDefaults(payload: OpenClawAgentsPayload) {
  return asObject(getAgentsRoot(payload).defaults)
}

export function getAgentList(payload: OpenClawAgentsPayload) {
  return asArray(getAgentsRoot(payload).list)
}

export function getAgentByIndex(payload: OpenClawAgentsPayload, index: number) {
  return asObject(getAgentList(payload)[index])
}

export function getAgentIndexById(
  payload: OpenClawAgentsPayload,
  agentId: string
) {
  return getAgentList(payload).findIndex(
    (agent) => readString(agent, 'id') === agentId
  )
}

export function getAgentById(
  payload: OpenClawAgentsPayload,
  agentId: string
) {
  const index = getAgentIndexById(payload, agentId)
  return index >= 0 ? getAgentByIndex(payload, index) : undefined
}

export function getNextAgentId(payload: OpenClawAgentsPayload) {
  const existingIds = new Set(
    getAgentList(payload)
      .map((agent) => readString(agent, 'id'))
      .filter((value): value is string => Boolean(value))
  )

  let counter = 1
  let candidate = `agent-${counter}`

  while (existingIds.has(candidate)) {
    counter += 1
    candidate = `agent-${counter}`
  }

  return candidate
}

export function setAgentDefaults(
  payload: OpenClawAgentsPayload,
  defaults: Record<string, unknown>
) {
  return {
    ...payload,
    agents: {
      ...getAgentsRoot(payload),
      defaults,
    },
  }
}

export function setAgentList(
  payload: OpenClawAgentsPayload,
  list: unknown[]
) {
  return {
    ...payload,
    agents: {
      ...getAgentsRoot(payload),
      list,
    },
  }
}

export function appendAgent(
  payload: OpenClawAgentsPayload,
  agent: unknown
) {
  return setAgentList(payload, appendItem(getAgentList(payload), agent))
}

export function createDefaultAgentValue(
  schema: OpenClawJsonSchemaNode | undefined,
  nextAgentId: string
) {
  const agentValue = asObject(buildDefaultValue(schema))

  return {
    ...agentValue,
    id: nextAgentId,
    name: readString(agentValue, 'name') ?? nextAgentId,
    default: readBoolean(agentValue, 'default') ?? false,
  }
}

export function replaceAgent(
  payload: OpenClawAgentsPayload,
  index: number,
  agent: unknown
) {
  return setAgentList(payload, replaceItem(getAgentList(payload), index, agent))
}

export function renameAgent(
  payload: OpenClawAgentsPayload,
  index: number,
  agent: unknown
) {
  const nextAgent = asObject(agent)
  const previousAgent = asObject(getAgentList(payload)[index])
  const previousAgentId = readString(previousAgent, 'id')
  const nextAgentId = readString(nextAgent, 'id')
  const nextPayload = replaceAgent(payload, index, nextAgent)

  if (
    !previousAgentId ||
    !nextAgentId ||
    previousAgentId === nextAgentId
  ) {
    return nextPayload
  }

  return {
    ...nextPayload,
    bindings: nextPayload.bindings.map((binding) => {
      if (readString(binding, 'agentId') !== previousAgentId) {
        return binding
      }

      return {
        ...asObject(binding),
        agentId: nextAgentId,
      }
    }),
  }
}

export function removeAgent(
  payload: OpenClawAgentsPayload,
  index: number
) {
  const nextAgentList = removeItem(getAgentList(payload), index)
  const removedAgent = asObject(getAgentList(payload)[index])
  const removedAgentId = readString(removedAgent, 'id')
  return {
    ...setAgentList(payload, nextAgentList),
    bindings: removedAgentId
      ? payload.bindings.filter((binding) => {
          return readString(binding, 'agentId') !== removedAgentId
        })
      : payload.bindings,
  }
}

export function ensureSingleDefaultAgent(
  list: unknown[],
  defaultAgentId?: string
) {
  return list.map((agent) => {
    const record = asObject(agent)
    const nextDefault = defaultAgentId
      ? readString(record, 'id') === defaultAgentId
      : false

    return {
      ...record,
      default: nextDefault,
    }
  })
}

export function getDefaultAgentId(payload: OpenClawAgentsPayload) {
  const defaultAgent = getAgentList(payload).find(
    (agent) => asObject(agent).default === true
  )
  return readString(defaultAgent, 'id') ?? ''
}

export function getBindingsForAgent(
  bindings: unknown[],
  agentId: string
) {
  return bindings.filter(binding => readString(binding, 'agentId') === agentId)
}

export function appendBindingForAgent(
  payload: OpenClawAgentsPayload,
  agentId: string,
  binding: unknown
) {
  return {
    ...payload,
    bindings: [...payload.bindings, { ...asObject(binding), agentId }],
  }
}

export function replaceBindingForAgent(
  payload: OpenClawAgentsPayload,
  agentId: string,
  index: number,
  binding: unknown
) {
  const currentBindings = getBindingsForAgent(payload.bindings, agentId)
  const nextBindings = currentBindings.map((currentBinding, currentIndex) => {
    if (currentIndex !== index) {
      return currentBinding
    }

    return {
      ...asObject(binding),
      agentId,
    }
  })

  return replaceBindingsForAgent(payload.bindings, agentId, nextBindings)
}

export function createDefaultBindingValue(
  schema: OpenClawJsonSchemaNode | undefined,
  agentId: string
) {
  return {
    ...asObject(buildDefaultValue(schema)),
    agentId,
  }
}

export function removeBindingForAgent(
  payload: OpenClawAgentsPayload,
  agentId: string,
  index: number
) {
  const currentBindings = getBindingsForAgent(payload.bindings, agentId)
  const nextBindings = currentBindings.filter(
    (_, currentIndex) => currentIndex !== index
  )

  return replaceBindingsForAgent(payload.bindings, agentId, nextBindings)
}

export function replaceBindingsForAgent(
  bindings: unknown[],
  agentId: string,
  nextBindings: unknown[]
) {
  const otherBindings = bindings.filter(
    binding => readString(binding, 'agentId') !== agentId
  )

  return [...otherBindings, ...nextBindings]
}

export function summarizeAgent(value: unknown) {
  const agent = asObject(value)
  return {
    title: readString(agent, 'name') ?? readString(agent, 'id') ?? 'Untitled agent',
    subtitle: readString(agent, 'id') ?? 'Missing id',
    badges: compactSummary([
      agent.default === true ? 'Default' : undefined,
      describeModelSelection(agent.model),
    ]),
    meta: compactSummary([
      readString(agent, 'workspace'),
      readString(agent, 'agentDir'),
    ]),
  }
}

export function summarizeBinding(value: unknown) {
  const binding = asObject(value)
  const match = asObject(binding.match)
  const peer = asObject(match.peer)

  return {
    title: readString(match, 'channel') ?? 'Unknown channel',
    subtitle: readString(binding, 'type') ?? 'route',
    meta: compactSummary([
      readString(match, 'accountId')
        ? `Account: ${readString(match, 'accountId')}`
        : undefined,
      readString(peer, 'id') ? `Peer: ${readString(peer, 'id')}` : undefined,
      readString(binding, 'comment'),
    ]),
  }
}
