/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { AgentsBindingsList } from '@/features/openclaw/_internal/builders/agents-bindings-list'

export const Route = createFileRoute(
  '/_authenticated/agents/agent/$agentId/bindings/'
)({
  component: AgentsBindingsRoute,
})

function AgentsBindingsRoute() {
  const { agentId } = Route.useParams()

  return <AgentsBindingsList routeAgentId={agentId} />
}
