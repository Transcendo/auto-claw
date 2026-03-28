import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchEnvFile,
  updateEnvFile,
} from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'
import {
  KeyValueEditorDialog,
  KeyValueInlineEditor,
} from '@/components/config-builder'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { useAuthenticatedHeader } from '@/components/layout/authenticated-header-context'
import { asObject } from './_internal/lib/value-readers'
import {
  parseKeyValueRows,
  readKeyValueRows,
} from './_internal/lib/models-fields'
import { getOpenClawSectionDefinition } from './section-registry'
import { useOpenClawSection } from './use-openclaw-section'

export function EnvPage() {
  useAuthenticatedHeader()

  const queryClient = useQueryClient()
  const definition = getOpenClawSectionDefinition('env')
  const { metadata, isLoadingMetadata, environmentStatus } = useEnvironmentContext()
  const { selectedEnvironmentId, sectionQuery, saveMutation } = useOpenClawSection(
    'env',
    definition.queryKey,
    definition.title
  )
  const [shellEnvironmentOpen, setShellEnvironmentOpen] = useState(false)
  const [environmentRows, setEnvironmentRows] = useState<
    Array<{ key: string; value: string }>
  >([])
  const [envFileRows, setEnvFileRows] = useState<Array<{ key: string; value: string }>>(
    []
  )

  const sectionMetadata = metadata?.sections.env
  const envValue = asObject(sectionQuery.data)
  const shellEnvValue = asObject(envValue.shellEnv)

  useEffect(() => {
    const nextRows = Object.entries(envValue)
      .filter(([key]) => key !== 'shellEnv' && key !== 'vars')
      .map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }))
    setEnvironmentRows(nextRows)
  }, [sectionQuery.data])

  const envFileQuery = useQuery({
    queryKey: ['env-file', selectedEnvironmentId],
    queryFn: () => fetchEnvFile(selectedEnvironmentId as string),
    enabled:
      Boolean(selectedEnvironmentId) &&
      environmentStatus?.canLoadConfig === true,
  })

  useEffect(() => {
    setEnvFileRows(envFileQuery.data?.rows ?? [])
  }, [envFileQuery.data])

  const envFileMutation = useMutation({
    mutationFn: async () =>
      updateEnvFile(selectedEnvironmentId as string, envFileRows),
    onSuccess: async () => {
      toast.success('.env file saved')
      await queryClient.invalidateQueries({
        queryKey: ['env-file', selectedEnvironmentId],
      })
    },
    onError: () => {
      toast.error('Failed to save .env file')
    },
  })

  const shellEnvRows = useMemo(() => readKeyValueRows(shellEnvValue), [shellEnvValue])

  if (
    !selectedEnvironmentId ||
    isLoadingMetadata ||
    !sectionMetadata ||
    sectionQuery.isLoading
  ) {
    return (
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>{definition.title}</CardTitle>
            <CardDescription>Loading environment...</CardDescription>
          </CardHeader>
        </Card>
      </Main>
    )
  }

  const saveShellEnv = async (rows: Array<{ key: string; value: string }>) => {
    const nextValue = {
      ...envValue,
      shellEnv: parseKeyValueRows(rows) ?? {},
    }

    await saveMutation.mutateAsync(nextValue)
    setShellEnvironmentOpen(false)
  }

  const saveEnvironmentVariables = async () => {
    const nextEntries = parseKeyValueRows(environmentRows) ?? {}
    const nextValue: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(envValue)) {
      if (key === 'shellEnv' || key === 'vars') {
        nextValue[key] = value
      }
    }

    Object.assign(nextValue, nextEntries)
    await saveMutation.mutateAsync(nextValue)
  }

  return (
    <Main className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>{definition.title}</h1>
          <p className='text-sm text-muted-foreground'>{definition.description}</p>
        </div>
        <Button
          type='button'
          variant='outline'
          onClick={() => setShellEnvironmentOpen(true)}
        >
          Shell Environment
        </Button>
      </div>

      <KeyValueInlineEditor
        title='.env file'
        description={
          envFileQuery.data?.exists
            ? envFileQuery.data.path
            : 'No .env file exists yet. Saving will create one in the environment root.'
        }
        rows={envFileRows}
        onChange={setEnvFileRows}
        onSave={() => void envFileMutation.mutateAsync()}
        isSaving={envFileMutation.isPending}
      />

      <KeyValueInlineEditor
        title='Environment Variables'
        description='Edit the variables stored in openclaw.json.'
        rows={environmentRows}
        onChange={setEnvironmentRows}
        onSave={() => void saveEnvironmentVariables()}
        isSaving={saveMutation.isPending}
      />

      <KeyValueEditorDialog
        open={shellEnvironmentOpen}
        onOpenChange={setShellEnvironmentOpen}
        title='Shell Environment'
        description='Configure shell-level environment variables loaded before runtime.'
        rows={shellEnvRows}
        onApply={(rows) => void saveShellEnv(rows)}
        isSaving={saveMutation.isPending}
      />
    </Main>
  )
}
