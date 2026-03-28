import { createFileRoute } from '@tanstack/react-router'
import { McpPage } from '@/features/openclaw/mcp-page'

export const Route = createFileRoute('/_authenticated/mcp/')({
  component: McpPage,
})
