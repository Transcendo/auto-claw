import { createFileRoute } from '@tanstack/react-router'
import { CronPage } from '@/features/openclaw/cron-page'

export const Route = createFileRoute('/_authenticated/cron')({
  component: CronPage,
})
