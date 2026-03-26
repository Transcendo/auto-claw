import { createFileRoute } from '@tanstack/react-router'
import { ChannelsPage } from '@/features/openclaw/channels-page'

export const Route = createFileRoute('/_authenticated/channels')({
  component: ChannelsPage,
})
