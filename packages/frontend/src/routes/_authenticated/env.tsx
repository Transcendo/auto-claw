import { createFileRoute } from '@tanstack/react-router'
import { EnvPage } from '@/features/openclaw/env-page'

export const Route = createFileRoute('/_authenticated/env')({
  component: EnvPage,
})
