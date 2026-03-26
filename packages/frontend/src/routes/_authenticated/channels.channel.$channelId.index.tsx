/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ChannelsChannelDetail } from '@/features/openclaw/_internal/builders/channels-channel-detail'

export const Route = createFileRoute(
  '/_authenticated/channels/channel/$channelId/'
)({
  component: ChannelsChannelRoute,
})

function ChannelsChannelRoute() {
  const { channelId } = Route.useParams()

  return <ChannelsChannelDetail routeChannelId={channelId} />
}
