/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ChannelsAccountDetail } from '@/features/openclaw/_internal/builders/channels-account-detail'

export const Route = createFileRoute(
  '/_authenticated/channels/channel/$channelId/account/$accountId'
)({
  component: ChannelsAccountRoute,
})

function ChannelsAccountRoute() {
  const { accountId, channelId } = Route.useParams()

  return (
    <ChannelsAccountDetail
      routeChannelId={channelId}
      routeAccountId={accountId}
    />
  )
}
