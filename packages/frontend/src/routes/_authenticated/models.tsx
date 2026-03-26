import { createFileRoute } from '@tanstack/react-router'
import { ModelsPage } from '@/features/openclaw/models-page'

export const Route = createFileRoute('/_authenticated/models')({
  component: ModelsPage,
})
