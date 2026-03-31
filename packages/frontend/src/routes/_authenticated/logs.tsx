import { createFileRoute } from '@tanstack/react-router'
import { LogsPage } from '@/features/openclaw/logs-page'

export const Route = createFileRoute('/_authenticated/logs')({
  component: LogsPage,
})
