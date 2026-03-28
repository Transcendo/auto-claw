import { createFileRoute } from '@tanstack/react-router'
import { HooksPage } from '@/features/openclaw/hooks-page'

export const Route = createFileRoute('/_authenticated/hooks')({
  component: HooksPage,
})
