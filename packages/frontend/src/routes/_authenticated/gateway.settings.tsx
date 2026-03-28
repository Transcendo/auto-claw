import { createFileRoute } from '@tanstack/react-router'
import { createGenericSectionPage } from '@/features/openclaw/create-section-page'

const GatewaySettingsPage = createGenericSectionPage('gateway')

export const Route = createFileRoute('/_authenticated/gateway/settings')({
  component: GatewaySettingsPage,
})
