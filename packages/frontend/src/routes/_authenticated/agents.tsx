import { createFileRoute } from '@tanstack/react-router'
import { AgentsPage } from '@/features/openclaw/agents-page'

export const Route = createFileRoute('/_authenticated/agents')({
  component: AgentsPage,
})
