/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { AgentsAgentDetail } from '@/features/openclaw/_internal/builders/agents-agent-detail'

export const Route = createFileRoute('/_authenticated/agents/agent/$agentId/')(
  {
    component: AgentsAgentRoute,
  }
)

function AgentsAgentRoute() {
  const { agentId } = Route.useParams()

  return <AgentsAgentDetail routeAgentId={agentId} />
}
