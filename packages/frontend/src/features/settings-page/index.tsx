import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Folder, RotateCcw, Trash2 } from 'lucide-react'
import {
  createEnvironmentRequest,
  deleteEnvironmentRequest,
  fetchBackupContent,
  fetchBackups,
  restoreBackup,
} from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { MonacoJsonEditor } from '@/features/openclaw/monaco-json-editor'
import { formatBytes } from '@/features/openclaw/utils'

function getEnvironmentLabels(openclawPath: string) {
  const normalized = openclawPath.replace(/\/+$/, '')
  const parts = normalized.split('/').filter(Boolean)

  return {
    name: parts[parts.length - 1] ?? normalized,
    parent: parts[parts.length - 2] ?? 'Environment',
  }
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const {
    environments,
    isLoadingEnvironments,
    selectedEnvironment,
    selectedEnvironmentId,
    setSelectedEnvironmentId,
    environmentStatus,
  } = useEnvironmentContext()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [openclawPath, setOpenclawPath] = useState('/Users/gjssss/Documents/openclaw')
  const [previewVersion, setPreviewVersion] = useState<number | null>(null)

  const backupsQuery = useQuery({
    queryKey: ['backups', selectedEnvironmentId],
    queryFn: () => fetchBackups(selectedEnvironmentId as string),
    enabled: Boolean(selectedEnvironmentId),
  })

  const backupPreviewQuery = useQuery({
    queryKey: ['backup-preview', selectedEnvironmentId, previewVersion],
    queryFn: () =>
      fetchBackupContent(selectedEnvironmentId as string, previewVersion as number),
    enabled: Boolean(selectedEnvironmentId) && previewVersion !== null,
  })

  const createEnvironmentMutation = useMutation({
    mutationFn: createEnvironmentRequest,
    onSuccess: async (environment) => {
      toast.success('Environment added')
      setIsCreateDialogOpen(false)
      setOpenclawPath('/Users/gjssss/Documents/openclaw')
      setSelectedEnvironmentId(environment.id)
      await queryClient.invalidateQueries({ queryKey: ['environments'] })
      await queryClient.invalidateQueries({
        queryKey: ['environment-status', environment.id],
      })
    },
  })

  const deleteEnvironmentMutation = useMutation({
    mutationFn: deleteEnvironmentRequest,
    onSuccess: async (_, environmentId) => {
      toast.success('Environment removed')
      if (selectedEnvironmentId === environmentId) {
        setPreviewVersion(null)
      }
      await queryClient.invalidateQueries({ queryKey: ['environments'] })
      await queryClient.invalidateQueries({
        queryKey: ['environment-status', environmentId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['backups', environmentId],
      })
    },
  })

  const restoreBackupMutation = useMutation({
    mutationFn: async (version: number) => {
      return restoreBackup(selectedEnvironmentId as string, version)
    },
    onSuccess: async () => {
      toast.success('Backup restored')
      await queryClient.invalidateQueries({
        queryKey: ['environment-status', selectedEnvironmentId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['backups', selectedEnvironmentId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['config-models', selectedEnvironmentId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['config-channels', selectedEnvironmentId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['config-agents', selectedEnvironmentId],
      })
    },
  })

  const selectedEnvironmentLabels = selectedEnvironment
    ? getEnvironmentLabels(selectedEnvironment.openclawPath)
    : null

  const backupPreviewValue = useMemo(() => {
    if (!backupPreviewQuery.data) {
      return ''
    }

    return backupPreviewQuery.data.raw
  }, [backupPreviewQuery.data])

  return (
    <div className='container max-w-none px-6 py-8'>
      <main className='mx-auto flex max-w-7xl flex-col gap-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
          <div className='space-y-1'>
            <h1 className='text-3xl font-semibold tracking-tight'>Environments</h1>
            <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
              Local environments point the app at a specific
              {' '}
              <code>openclaw.json</code>
              {' '}
              directory. Switching environments changes which OpenClaw config is loaded in
              Models, Channels, and Agents.
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add environment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add environment</DialogTitle>
                <DialogDescription>
                  Enter the directory that contains
                  {' '}
                  <code>openclaw.json</code>
                  .
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-3'>
                <Input
                  value={openclawPath}
                  onChange={event => setOpenclawPath(event.target.value)}
                  placeholder='/Users/gjssss/Documents/openclaw'
                />
                <p className='text-xs text-muted-foreground'>
                  The sample environment used for testing is
                  {' '}
                  <code>/Users/gjssss/Documents/openclaw</code>
                  .
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant='outline'
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    createEnvironmentMutation.mutate(openclawPath.trim())}
                  disabled={
                    createEnvironmentMutation.isPending || openclawPath.trim().length === 0
                  }
                >
                  {createEnvironmentMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className='grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]'>
          <Card className='border-border/60'>
            <CardHeader>
              <CardTitle>Select an environment</CardTitle>
              <CardDescription>
                Choose which OpenClaw project path should be active.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {isLoadingEnvironments && (
                <div className='text-sm text-muted-foreground'>
                  Loading environments...
                </div>
              )}

              {!isLoadingEnvironments && environments.length === 0 && (
                <div className='rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground'>
                  No environments configured yet. Add one to begin editing
                  OpenClaw settings.
                </div>
              )}

              {environments.map((environment) => {
                const labels = getEnvironmentLabels(environment.openclawPath)
                const isSelected = selectedEnvironmentId === environment.id

                return (
                  <div
                    key={environment.id}
                    className={`rounded-2xl border p-5 transition ${
                      isSelected
                        ? 'border-primary/40 bg-primary/5 shadow-sm'
                        : 'border-border/70 bg-card hover:border-border'
                    }`}
                  >
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                      <button
                        type='button'
                        className='flex min-w-0 flex-1 items-center gap-4 text-left'
                        onClick={() => setSelectedEnvironmentId(environment.id)}
                      >
                        <div className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
                          <Folder className='size-5' />
                        </div>
                        <div className='min-w-0 space-y-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='truncate text-lg font-semibold'>
                              {labels.name}
                            </span>
                            {isSelected && <Badge>Active</Badge>}
                          </div>
                          <p className='truncate text-sm text-muted-foreground'>
                            {labels.parent}
                          </p>
                          <p className='truncate text-xs text-muted-foreground'>
                            {environment.openclawPath}
                          </p>
                        </div>
                      </button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='text-muted-foreground'
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete environment?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This only removes the environment record from the database.
                              It will not delete files from
                              {' '}
                              <code>{environment.openclawPath}</code>
                              .
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() =>
                                deleteEnvironmentMutation.mutate(environment.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className='space-y-6'>
            <Card className='border-border/60'>
              <CardHeader>
                <CardTitle>Selected environment</CardTitle>
                <CardDescription>
                  Current status for the active
                  {' '}
                  <code>openclaw.json</code>
                  {' '}
                  file.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 text-sm'>
                {!selectedEnvironment && (
                  <div className='rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-muted-foreground'>
                    Select an environment to inspect its status and backups.
                  </div>
                )}

                {selectedEnvironment && (
                  <>
                    <div className='space-y-1'>
                      <div className='font-medium'>{selectedEnvironmentLabels?.name}</div>
                      <div className='text-muted-foreground'>
                        {selectedEnvironment.openclawPath}
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Badge variant={environmentStatus?.canLoadConfig ? 'default' : 'destructive'}>
                        {environmentStatus?.canLoadConfig ? 'Config ready' : 'Config issue'}
                      </Badge>
                      {environmentStatus?.directoryExists === false && (
                        <Badge variant='secondary'>Path missing</Badge>
                      )}
                      {environmentStatus?.configExists === false && (
                        <Badge variant='secondary'>openclaw.json missing</Badge>
                      )}
                    </div>
                    <div className='rounded-xl border border-border/60 bg-muted/20 p-4 text-muted-foreground'>
                      {environmentStatus?.error
                        ? environmentStatus.error
                        : environmentStatus?.configPath
                            ?? 'Status will appear after the environment is selected.'}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className='border-border/60'>
              <CardHeader>
                <CardTitle>Backups</CardTitle>
                <CardDescription>
                  Every save renames the previous config to
                  {' '}
                  <code>openclaw.&lt;version&gt;.json</code>
                  .
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {!selectedEnvironmentId && (
                  <div className='text-sm text-muted-foreground'>
                    No environment selected.
                  </div>
                )}

                {selectedEnvironmentId && backupsQuery.data?.length === 0 && (
                  <div className='rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground'>
                    No backups created yet. Save a config change to generate the
                    first backup.
                  </div>
                )}

                {backupsQuery.data?.map(backup => (
                  <div
                    key={backup.version}
                    className='rounded-xl border border-border/60 bg-background/80 p-4'
                  >
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                      <div className='space-y-1'>
                        <div className='font-medium'>
                          Version
                          {' '}
                          {backup.version}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {format(new Date(backup.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                          {' '}
                          ·
                          {' '}
                          {formatBytes(backup.size)}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {backup.filename}
                        </div>
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          variant='outline'
                          onClick={() => setPreviewVersion(backup.version)}
                        >
                          View
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant='outline' className='gap-2'>
                              <RotateCcw className='size-4' />
                              Restore
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore backup?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will overwrite the current
                                {' '}
                                <code>openclaw.json</code>
                                {' '}
                                with
                                {' '}
                                <code>{backup.filename}</code>
                                . A restore does not create another recovery point.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  restoreBackupMutation.mutate(backup.version)}
                              >
                                Restore
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog
        open={previewVersion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewVersion(null)
          }
        }}
      >
        <DialogContent className='max-w-5xl'>
          <DialogHeader>
            <DialogTitle>
              Backup preview
              {previewVersion !== null ? ` · version ${previewVersion}` : ''}
            </DialogTitle>
            <DialogDescription>
              Read-only preview of the selected backup.
            </DialogDescription>
          </DialogHeader>
          <MonacoJsonEditor
            path={`inmemory://openclaw/backup-${previewVersion ?? 'preview'}.json`}
            value={backupPreviewValue}
            readOnly
            height='65vh'
          />
          <DialogFooter>
            <Button variant='outline' onClick={() => setPreviewVersion(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
