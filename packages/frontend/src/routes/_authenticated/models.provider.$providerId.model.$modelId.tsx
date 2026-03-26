/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'
import { ModelsModelDetail } from '@/features/openclaw/_internal/builders/models-model-detail'

export const Route = createFileRoute(
  '/_authenticated/models/provider/$providerId/model/$modelId'
)({
  component: ModelsModelRoute,
})

function ModelsModelRoute() {
  const { modelId, providerId } = Route.useParams()

  return (
    <ModelsModelDetail routeProviderId={providerId} routeModelId={modelId} />
  )
}
