import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useEnvironmentContext } from '@/context/environment-provider'
import { fetchModelsSection } from '@/lib/api'
import { buildModelSelectOptions } from '@/lib/model-select'

export function useModelSelectOptions() {
  const {
    selectedEnvironmentId,
    environmentStatus,
    isCheckingEnvironmentStatus,
  } = useEnvironmentContext()

  const modelsQuery = useQuery({
    queryKey: ['config-models', selectedEnvironmentId],
    queryFn: () => fetchModelsSection(selectedEnvironmentId as string),
    enabled:
      Boolean(selectedEnvironmentId) &&
      environmentStatus?.canLoadConfig === true &&
      !isCheckingEnvironmentStatus,
  })

  const options = useMemo(() => {
    if (!modelsQuery.data) {
      return []
    }

    return buildModelSelectOptions(modelsQuery.data)
  }, [modelsQuery.data])

  return {
    options,
    isLoading: modelsQuery.isLoading,
  }
}
