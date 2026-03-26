import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/models/provider/$providerId'
)({
  component: Outlet,
})
