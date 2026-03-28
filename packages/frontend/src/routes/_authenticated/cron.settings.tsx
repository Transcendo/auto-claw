import { createFileRoute } from '@tanstack/react-router'
import { createGenericSectionPage } from '@/features/openclaw/create-section-page'

const CronSettingsPage = createGenericSectionPage('cron')

export const Route = createFileRoute('/_authenticated/cron/settings')({
  component: CronSettingsPage,
})
