import { createFileRoute } from '@tanstack/react-router'
import { AgentsBuilder } from '@/features/openclaw/_internal/builders/agents-builder'

export const Route = createFileRoute('/_authenticated/agents/')({
  component: AgentsBuilder,
})
