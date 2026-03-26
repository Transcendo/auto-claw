/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ModelsProviderDetail } from '@/features/openclaw/_internal/builders/models-provider-detail'

export const Route = createFileRoute(
  '/_authenticated/models/provider/$providerId/'
)({
  component: ModelsProviderRoute,
})

function ModelsProviderRoute() {
  const { providerId } = Route.useParams()

  return <ModelsProviderDetail routeProviderId={providerId} />
}
