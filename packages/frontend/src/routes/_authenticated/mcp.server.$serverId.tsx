/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { McpServerDetail } from '@/features/openclaw/mcp-server-detail'

export const Route = createFileRoute('/_authenticated/mcp/server/$serverId')({
  component: McpServerRoute,
})

function McpServerRoute() {
  const { serverId } = Route.useParams()

  return <McpServerDetail routeServerId={serverId} />
}
