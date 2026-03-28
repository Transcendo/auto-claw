import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  OpenClawConfigSectionKey,
  OpenClawGenericSection,
} from '@/types/openclaw'
import {
  fetchGenericConfigSection,
  updateGenericConfigSection,
} from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'

type SectionKey = Exclude<OpenClawConfigSectionKey, 'agents' | 'bindings'>

export function useOpenClawSection<T extends OpenClawGenericSection>(
  sectionKey: SectionKey,
  queryKey: string,
  title: string
) {
  const queryClient = useQueryClient()
  const { selectedEnvironmentId, environmentStatus } = useEnvironmentContext()

  const sectionQuery = useQuery({
    queryKey: [queryKey, selectedEnvironmentId],
    queryFn: () =>
      fetchGenericConfigSection(selectedEnvironmentId as string, sectionKey) as Promise<T>,
    enabled:
      Boolean(selectedEnvironmentId) &&
      environmentStatus?.canLoadConfig === true,
  })

  const saveMutation = useMutation({
    mutationFn: async (nextValue: T) =>
      updateGenericConfigSection(
        selectedEnvironmentId as string,
        sectionKey,
        nextValue
      ) as Promise<T>,
    onSuccess: async () => {
      toast.success(`${title} saved`)
      await queryClient.invalidateQueries({
        queryKey: [queryKey, selectedEnvironmentId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['environment-status', selectedEnvironmentId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['backups', selectedEnvironmentId],
      })
    },
    onError: () => {
      toast.error(`Failed to save ${title.toLowerCase()}`)
    },
  })

  return {
    selectedEnvironmentId,
    sectionQuery,
    saveMutation,
  }
}
