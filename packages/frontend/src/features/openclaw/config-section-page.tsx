import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertCircle, Save } from 'lucide-react'
import { useAuthenticatedHeader } from '@/components/layout/authenticated-header-context'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEnvironmentContext } from '@/context/environment-provider'
import type {
  OpenClawJsonSchemaNode,
  OpenClawValidationIssue,
} from '@/types/openclaw'
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
  builder: (props: { value: T; onChange: (value: T) => void }) => React.ReactNode
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
    selectedEnvironment,
    environmentStatus,
    isCheckingEnvironmentStatus,
  } = useEnvironmentContext()
  const [draft, setDraft] = useState<T | null>(null)
  const [rawValue, setRawValue] = useState('')
  const [activeTab, setActiveTab] = useState('builder')
  const [validationIssues, setValidationIssues] = useState<OpenClawValidationIssue[]>([])

  const sectionQuery = useQuery({
    queryKey: [queryKey, selectedEnvironmentId],
    queryFn: () => fetcher(selectedEnvironmentId as string),
    enabled:
      Boolean(selectedEnvironmentId)
      && environmentStatus?.canLoadConfig === true,
  })

  useEffect(() => {
    if (!sectionQuery.data) {
      return
    }

    setDraft(sectionQuery.data)
    setRawValue(prettyJson(sectionQuery.data))
    setValidationIssues([])
  }, [sectionQuery.data, selectedEnvironmentId])

  const saveMutation = useMutation({
    mutationFn: async (nextValue: T) => {
      return saver(selectedEnvironmentId as string, nextValue)
    },
    onSuccess: async (nextValue) => {
      setDraft(nextValue)
      setRawValue(prettyJson(nextValue))
      setValidationIssues([])
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

  const isDirty
    = activeTab === 'raw'
      ? rawValue !== serverValueText
      : draft !== null && prettyJson(draft) !== serverValueText

  const handleSave = async () => {
    let nextValue: T

    if (activeTab === 'raw') {
      try {
        nextValue = JSON.parse(rawValue) as T
      }
      catch {
        toast.error('Raw JSON is invalid')
        return
      }
    }
    else {
      if (draft === null) {
        return
      }
      nextValue = draft
    }

    const issues = validate?.(nextValue) ?? []
    if (issues.length > 0) {
      setValidationIssues(issues)
      toast.error(issues[0]?.message ?? 'Please fix validation issues first')
      return
    }

    await saveMutation.mutateAsync(nextValue)
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
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
          <p className='text-sm text-muted-foreground'>{description}</p>
          <p className='text-sm text-muted-foreground'>
            Environment:{' '}
            <span className='font-medium text-foreground'>
              {selectedEnvironment?.openclawPath ?? 'Unknown'}
            </span>
          </p>
        </div>
        <Button
          onClick={() => void handleSave()}
          disabled={!isDirty || saveMutation.isPending || sectionQuery.isLoading}
          className='gap-2'
        >
          <Save className='size-4' />
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
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
            {validationIssues.slice(0, 12).map(issue => (
              <div key={`${issue.path}-${issue.message}`}>
                <span className='font-medium text-foreground'>{issue.path}</span>
                {' '}
                {issue.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
        <TabsList>
          <TabsTrigger value='builder'>Builder</TabsTrigger>
          <TabsTrigger value='raw'>Raw JSON</TabsTrigger>
        </TabsList>
        <TabsContent value='builder' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>{title} Builder</CardTitle>
              <CardDescription>
                Adjust the structured config and save it back to
                {' '}
                <code>openclaw.json</code>
                .
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {draft !== null && builder({ value: draft, onChange: setDraft })}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value='raw' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Raw JSON</CardTitle>
              <CardDescription>
                Advanced editing mode with Monaco JSON validation.
              </CardDescription>
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
