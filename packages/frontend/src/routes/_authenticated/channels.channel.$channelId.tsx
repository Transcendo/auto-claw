import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/channels/channel/$channelId'
)({
  component: Outlet,
})
