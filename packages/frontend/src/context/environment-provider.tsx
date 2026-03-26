import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  fetchConfigMetadata,
  fetchEnvironmentStatus,
  fetchEnvironments,
} from '@/lib/api'
import type {
  EnvironmentRecord,
  EnvironmentStatus,
  OpenClawConfigMetadata,
} from '@/types/openclaw'

const STORAGE_KEY = 'auto-claw.selected-environment-id'

type EnvironmentContextValue = {
  environments: EnvironmentRecord[]
  isLoadingEnvironments: boolean
  selectedEnvironmentId: string | null
  selectedEnvironment: EnvironmentRecord | null
  setSelectedEnvironmentId: (environmentId: string) => void
  environmentStatus: EnvironmentStatus | null
  isCheckingEnvironmentStatus: boolean
  metadata: OpenClawConfigMetadata | null
  isLoadingMetadata: boolean
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null)

function isSettingsPath(pathname: string) {
  return pathname === '/settings'
}

function isErrorPath(pathname: string) {
  return /^\/(401|403|404|500|503)$/.test(pathname)
}

function shouldGuardAppPath(pathname: string) {
  return !isSettingsPath(pathname) && !isErrorPath(pathname)
}

function readStoredEnvironmentId() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(STORAGE_KEY)
}

export function EnvironmentProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedEnvironmentId, setSelectedEnvironmentIdState] = useState<
    string | null
  >(readStoredEnvironmentId)
  const lastToastKeyRef = useRef<string | null>(null)

  const environmentsQuery = useQuery({
    queryKey: ['environments'],
    queryFn: fetchEnvironments,
  })

  const metadataQuery = useQuery({
    queryKey: ['config-metadata'],
    queryFn: fetchConfigMetadata,
    staleTime: Infinity,
  })

  const selectedEnvironment
    = environmentsQuery.data?.find(
      environment => environment.id === selectedEnvironmentId
    ) ?? null

  useEffect(() => {
    const environments = environmentsQuery.data
    if (!environments) {
      return
    }

    if (environments.length === 0) {
      if (selectedEnvironmentId !== null) {
        setSelectedEnvironmentIdState(null)
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY)
      }

      return
    }

    const nextEnvironment
      = environments.find(environment => environment.id === selectedEnvironmentId)
        ?? environments.find(environment => environment.id === readStoredEnvironmentId())
        ?? environments[0]

    if (nextEnvironment && nextEnvironment.id !== selectedEnvironmentId) {
      setSelectedEnvironmentIdState(nextEnvironment.id)
    }
  }, [environmentsQuery.data, selectedEnvironmentId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (selectedEnvironmentId) {
      window.localStorage.setItem(STORAGE_KEY, selectedEnvironmentId)
    }
    else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [selectedEnvironmentId])

  const environmentStatusQuery = useQuery({
    queryKey: ['environment-status', selectedEnvironmentId],
    queryFn: () => fetchEnvironmentStatus(selectedEnvironmentId as string),
    enabled: Boolean(selectedEnvironmentId),
  })

  useEffect(() => {
    const environments = environmentsQuery.data
    if (!environmentsQuery.isSuccess || !environments || environments.length > 0) {
      return
    }

    if (!shouldGuardAppPath(location.pathname)) {
      return
    }

    const toastKey = `missing-environments:${location.pathname}`
    if (lastToastKeyRef.current !== toastKey) {
      toast.error('Environments Not Found')
      lastToastKeyRef.current = toastKey
    }

    void navigate({ to: '/settings', replace: true })
  }, [
    environmentsQuery.data,
    environmentsQuery.isSuccess,
    location.pathname,
    navigate,
  ])

  useEffect(() => {
    const status = environmentStatusQuery.data
    if (!selectedEnvironmentId || !status || !shouldGuardAppPath(location.pathname)) {
      return
    }

    if (status.canLoadConfig) {
      lastToastKeyRef.current = null
      return
    }

    const toastKey = `invalid-environment:${selectedEnvironmentId}:${status.error ?? 'unknown'}`
    if (lastToastKeyRef.current !== toastKey) {
      toast.error(status.error ?? 'Failed to load openclaw.json')
      lastToastKeyRef.current = toastKey
    }

    void navigate({ to: '/settings', replace: true })
  }, [
    environmentStatusQuery.data,
    location.pathname,
    navigate,
    selectedEnvironmentId,
  ])

  const value = useMemo<EnvironmentContextValue>(() => {
    return {
      environments: environmentsQuery.data ?? [],
      isLoadingEnvironments: environmentsQuery.isLoading,
      selectedEnvironmentId,
      selectedEnvironment,
      setSelectedEnvironmentId: setSelectedEnvironmentIdState,
      environmentStatus: environmentStatusQuery.data ?? null,
      isCheckingEnvironmentStatus: environmentStatusQuery.isFetching,
      metadata: metadataQuery.data ?? null,
      isLoadingMetadata: metadataQuery.isLoading,
    }
  }, [
    environmentStatusQuery.data,
    environmentStatusQuery.isFetching,
    environmentsQuery.data,
    environmentsQuery.isLoading,
    metadataQuery.data,
    metadataQuery.isLoading,
    selectedEnvironment,
    selectedEnvironmentId,
  ])

  return (
    <EnvironmentContext.Provider value={value}>
      {children}
    </EnvironmentContext.Provider>
  )
}

export function useEnvironmentContext() {
  const context = useContext(EnvironmentContext)
  if (!context) {
    throw new Error(
      'useEnvironmentContext must be used within an EnvironmentProvider'
    )
  }

  return context
}
