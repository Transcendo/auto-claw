import { createFileRoute } from '@tanstack/react-router'
import { createGenericSectionPage } from '@/features/openclaw/create-section-page'

const HooksSettingsPage = createGenericSectionPage('hooks')

export const Route = createFileRoute('/_authenticated/hooks/settings')({
  component: HooksSettingsPage,
})
