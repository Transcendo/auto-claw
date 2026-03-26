import { createFileRoute } from '@tanstack/react-router'
import { AgentsDefaultsDetail } from '@/features/openclaw/_internal/builders/agents-defaults-detail'

export const Route = createFileRoute('/_authenticated/agents/defaults')({
  component: AgentsDefaultsDetail,
})
