import { createFileRoute } from '@tanstack/react-router'
import { ChannelsBuilder } from '@/features/openclaw/_internal/builders/channels-builder'

export const Route = createFileRoute('/_authenticated/channels/')({
  component: ChannelsBuilder,
})
