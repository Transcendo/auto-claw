import { createFileRoute } from '@tanstack/react-router'
import { ModelsBuilder } from '@/features/openclaw/_internal/builders/models-builder'

export const Route = createFileRoute('/_authenticated/models/')({
  component: ModelsBuilder,
})
