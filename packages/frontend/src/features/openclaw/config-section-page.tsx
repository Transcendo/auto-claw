import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  OpenClawJsonSchemaNode,
  OpenClawValidationIssue,
} from '@/types/openclaw'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useEnvironmentContext } from '@/context/environment-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthenticatedHeader } from '@/components/layout/authenticated-header-context'
import { Main } from '@/components/layout/main'
import { MonacoJsonEditor } from './monaco-json-editor'
import { prettyJson } from './utils'

type ConfigSectionPageProps<T> = {
  title: string
  description: string
  queryKey: string
  fetcher: (environmentId: string) => Promise<T>
  saver: (environmentId: string, value: T) => Promise<T>
  schema: OpenClawJsonSchemaNode
  rawPath: string
  builder: (props: {
    value: T
    onChange: (value: T) => void
    onSave: (value?: T) => Promise<boolean>
    isSaving: boolean
    savedValue: T | null
    saveVersion: number
  }) => React.ReactNode
  validate?: (value: T) => OpenClawValidationIssue[]
}

export function ConfigSectionPage<T>({
  title,
  description,
  queryKey,
  fetcher,
  saver,
  schema,
  rawPath,
  builder,
  validate,
}: ConfigSectionPageProps<T>) {
  useAuthenticatedHeader()

  const queryClient = useQueryClient()
  const {
    selectedEnvironmentId,
    environmentStatus,
    isCheckingEnvironmentStatus,
  } = useEnvironmentContext()
  const [draft, setDraft] = useState<T | null>(null)
  const [rawValue, setRawValue] = useState('')
  const [activeTab, setActiveTab] = useState('builder')
  const [validationIssues, setValidationIssues] = useState<
    OpenClawValidationIssue[]
  >([])
  const [saveVersion, setSaveVersion] = useState(0)

  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const sectionQuery = useQuery({
    queryKey: [queryKey, selectedEnvironmentId],
    queryFn: () => fetcher(selectedEnvironmentId as string),
    enabled:
      Boolean(selectedEnvironmentId) &&
      environmentStatus?.canLoadConfig === true,
  })

  useEffect(() => {
    const nextData = sectionQuery.data
    if (!nextData) {
      return
    }

    queueMicrotask(() => {
      setDraft(nextData)
      setRawValue(prettyJson(nextData))
      setValidationIssues([])
      setSaveVersion((version) => version + 1)
    })
  }, [sectionQuery.data, selectedEnvironmentId])

  const saveMutation = useMutation({
    mutationFn: async (nextValue: T) => {
      return saver(selectedEnvironmentId as string, nextValue)
    },
    onSuccess: async (nextValue) => {
      setDraft(nextValue)
      setRawValue(prettyJson(nextValue))
      setValidationIssues([])
      setSaveVersion((version) => version + 1)
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
  })

  const serverValueText = useMemo(() => {
    return sectionQuery.data ? prettyJson(sectionQuery.data) : ''
  }, [sectionQuery.data])

  const persistValue = async (nextValue: T) => {
    const issues = validate?.(nextValue) ?? []
    if (issues.length > 0) {
      setValidationIssues(issues)
      toast.error(issues[0]?.message ?? 'Please fix validation issues first')
      return false
    }

    setValidationIssues([])

    try {
      await saveMutation.mutateAsync(nextValue)
      return true
    } catch {
      toast.error(`Failed to save ${title.toLowerCase()}`)
      return false
    }
  }

  const handleRawSave = async () => {
    let nextValue: T

    try {
      nextValue = JSON.parse(rawValue) as T
    } catch {
      toast.error('Raw JSON is invalid')
      return
    }

    await persistValue(nextValue)
  }

  if (!selectedEnvironmentId || isCheckingEnvironmentStatus) {
    return (
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Loading environment...</CardDescription>
          </CardHeader>
        </Card>
      </Main>
    )
  }

  return (
    <Main className='space-y-6'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </div>

      {validationIssues.length > 0 && (
        <Card className='border-destructive/40 bg-destructive/5'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base'>
              <AlertCircle className='size-4 text-destructive' />
              Validation Issues
            </CardTitle>
            <CardDescription>
              Fix the following fields before saving.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2 text-sm text-muted-foreground'>
            {validationIssues.slice(0, 12).map((issue) => (
              <div key={`${issue.path}-${issue.message}`}>
                <span className='font-medium text-foreground'>
                  {issue.path}
                </span>{' '}
                {issue.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='space-y-4'
      >
        <TabsList>
          <TabsTrigger value='builder'>Builder</TabsTrigger>
          <TabsTrigger value='raw'>Raw JSON</TabsTrigger>
        </TabsList>
        <TabsContent value='builder' className='space-y-4'>
          {draft !== null &&
            builder({
              value: draft,
              onChange: setDraft,
              onSave: (nextValue) => persistValue(nextValue ?? draft),
              isSaving: saveMutation.isPending,
              savedValue: sectionQuery.data ?? null,
              saveVersion,
            })}
        </TabsContent>
        <TabsContent value='raw' className='space-y-4'>
          <Card>
            <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div className='space-y-1'>
                <CardTitle>Raw JSON</CardTitle>
                <CardDescription>
                  Advanced editing mode with Monaco JSON validation.
                </CardDescription>
              </div>
              <Button
                type='button'
                onClick={() => void handleRawSave()}
                disabled={
                  saveMutation.isPending || rawValue === serverValueText
                }
              >
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </CardHeader>
            <CardContent>
              <MonacoJsonEditor
                path={rawPath}
                value={rawValue}
                schema={schema}
                onChange={setRawValue}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Main>
  )
}
