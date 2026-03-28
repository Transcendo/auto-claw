import { createFileRoute } from '@tanstack/react-router'
import { GatewayPage } from '@/features/openclaw/gateway-page'

export const Route = createFileRoute('/_authenticated/gateway')({
  component: GatewayPage,
})
