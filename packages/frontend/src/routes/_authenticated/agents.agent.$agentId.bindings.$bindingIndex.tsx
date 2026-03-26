/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { AgentsBindingDetail } from '@/features/openclaw/_internal/builders/agents-binding-detail'

export const Route = createFileRoute(
  '/_authenticated/agents/agent/$agentId/bindings/$bindingIndex'
)({
  component: AgentsBindingRoute,
})

function AgentsBindingRoute() {
  const { agentId, bindingIndex } = Route.useParams()

  return (
    <AgentsBindingDetail
      routeAgentId={agentId}
      routeBindingIndex={bindingIndex}
    />
  )
}
