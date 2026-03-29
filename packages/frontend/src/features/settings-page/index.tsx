import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Folder,
  Hammer,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  Square,
  Terminal,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  checkOpenClawVersionRequest,
  createEnvironmentRequest,
  deleteEnvironmentRequest,
  fetchBackupContent,
  fetchBackups,
  fetchOpenClawServiceStatus,
  fetchSettings,
  restoreBackup,
  runOpenClawServiceAction,
  setupEnvironmentRequest,
  updateEnvironmentRequest,
  updateEnvironmentSettingsRequest,
  updateGlobalSettingsRequest,
} from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
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
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MonacoJsonEditor } from '@/features/openclaw/monaco-json-editor'
import { formatBytes } from '@/features/openclaw/utils'
import type {
  EnvironmentRecord,
  GlobalSettings,
  OpenClawLaunchMode,
  OpenClawRunMode,
  OpenClawServiceAction,
} from '@/types/openclaw'

function getEnvironmentLabels(openclawPath: string) {
  const normalized = openclawPath.replace(/\/+$/, '')
  const parts = normalized.split('/').filter(Boolean)

  return {
    name: parts[parts.length - 1] ?? normalized,
    parent: parts[parts.length - 2] ?? 'Environment',
  }
}

function getServiceActionLabel(
  launchMode: OpenClawLaunchMode,
  action: OpenClawServiceAction
) {
  if (action === 'install') {
    return 'Install'
  }

  if (action === 'restart') {
    return 'Restart'
  }

  if (action === 'stop') {
    return 'Stop'
  }

  return launchMode === 'runtime' ? 'Start runtime' : 'Start service'
}

function EnvironmentDialog({
  mode,
  open,
  onOpenChange,
  onSubmit,
  initialEnvironment,
  isPending,
}: {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { openclawPath: string, port: number }) => void
  initialEnvironment?: EnvironmentRecord | null
  isPending: boolean
}) {
  const [openclawPath, setOpenclawPath] = useState('')
  const [port, setPort] = useState('18789')

  useEffect(() => {
    if (!open) {
      return
    }

    setOpenclawPath(initialEnvironment?.openclawPath ?? '')
    setPort(String(initialEnvironment?.port ?? 18789))
  }, [initialEnvironment, open])

  const parsedPort = Number(port)
  const isValid = openclawPath.trim().length > 0 && Number.isInteger(parsedPort) && parsedPort > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create environment' : 'Edit environment'}
          </DialogTitle>
          <DialogDescription>
            Configure the OpenClaw config directory and gateway port for this environment.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <div className='text-sm font-medium'>Path</div>
            <Input
              value={openclawPath}
              onChange={event => setOpenclawPath(event.target.value)}
              placeholder='/Users/javis/code/openclaw-instance'
            />
          </div>

          <div className='space-y-2'>
            <div className='text-sm font-medium'>Port</div>
            <Input
              type='number'
              min={1}
              value={port}
              onChange={event => setPort(event.target.value)}
              placeholder='18789'
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!isValid || isPending}
            onClick={() =>
              onSubmit({
                openclawPath: openclawPath.trim(),
                port: parsedPort,
              })}
          >
            {isPending
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : mode === 'create'
                ? 'Create'
                : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
  const [runMode, setRunMode] = useState<OpenClawRunMode>('global')
  const [launchMode, setLaunchMode] = useState<OpenClawLaunchMode>('daemon')
  const [sourcePath, setSourcePath] = useState('')
  const [previewVersion, setPreviewVersion] = useState<number | null>(null)
  const [restoreVersion, setRestoreVersion] = useState<string>('')
  const [versionOutput, setVersionOutput] = useState<string>('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const activeEnvironmentId = selectedEnvironment?.id ?? null

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  })

  const backupsQuery = useQuery({
    queryKey: ['backups', activeEnvironmentId],
    queryFn: () => fetchBackups(activeEnvironmentId as string),
    enabled: Boolean(activeEnvironmentId),
  })

  const backupPreviewQuery = useQuery({
    queryKey: ['backup-preview', activeEnvironmentId, previewVersion],
    queryFn: () =>
      fetchBackupContent(activeEnvironmentId as string, previewVersion as number),
    enabled: Boolean(activeEnvironmentId) && previewVersion !== null,
  })

  useEffect(() => {
    if (!settingsQuery.data) {
      return
    }

    setRunMode(settingsQuery.data.global.runMode)
    setSourcePath(settingsQuery.data.global.sourcePath ?? '')
  }, [settingsQuery.data])

  useEffect(() => {
    setLaunchMode(selectedEnvironment?.launchMode ?? 'daemon')
  }, [selectedEnvironment?.id, selectedEnvironment?.launchMode])

  useEffect(() => {
    if (!backupsQuery.data?.length) {
      setRestoreVersion('')
      return
    }

    setRestoreVersion(current => current || String(backupsQuery.data[0]?.version ?? ''))
  }, [backupsQuery.data])

  const sourcePathRequired = runMode === 'source'
  const sourcePathValue = sourcePath.trim()
  const sourcePathReady = !sourcePathRequired || sourcePathValue.length > 0
  const selectedEnvironmentLabels = selectedEnvironment
    ? getEnvironmentLabels(selectedEnvironment.openclawPath)
    : null

  const globalDraftChanged
    = settingsQuery.data !== undefined
      && (
        runMode !== settingsQuery.data.global.runMode
        || sourcePathValue !== (settingsQuery.data.global.sourcePath ?? '')
      )

  const environmentDraftChanged
    = selectedEnvironment !== null && launchMode !== selectedEnvironment.launchMode
  const hasPendingCommandDraft = globalDraftChanged || environmentDraftChanged
  const commandReady
    = Boolean(selectedEnvironment)
      && sourcePathReady
      && !hasPendingCommandDraft

  const serviceStatusQuery = useQuery({
    queryKey: [
      'service-status',
      activeEnvironmentId,
      selectedEnvironment?.launchMode,
      settingsQuery.data?.global.runMode,
      settingsQuery.data?.global.sourcePath,
    ],
    queryFn: () => fetchOpenClawServiceStatus(activeEnvironmentId as string),
    enabled: Boolean(activeEnvironmentId) && settingsQuery.isSuccess && sourcePathReady,
    refetchInterval: query =>
      query.state.data?.launchMode === 'runtime' && query.state.data?.running
        ? 3000
        : false,
  })

  const saveGlobalSettingsMutation = useMutation({
    mutationFn: (payload: {
      runMode: GlobalSettings['runMode']
      sourcePath: string | null
    }) => updateGlobalSettingsRequest(payload),
    onSuccess: async () => {
      toast.success('Global settings saved')
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      await queryClient.invalidateQueries({ queryKey: ['service-status'] })
    },
  })

  const saveEnvironmentSettingsMutation = useMutation({
    mutationFn: ({
      environmentId,
      launchMode,
    }: {
      environmentId: string
      launchMode: OpenClawLaunchMode
    }) => updateEnvironmentSettingsRequest(environmentId, { launchMode }),
    onSuccess: async (environment) => {
      toast.success('Environment configuration saved')
      setLaunchMode(environment.launchMode)
      await queryClient.invalidateQueries({ queryKey: ['environments'] })
      await queryClient.invalidateQueries({ queryKey: ['service-status'] })
    },
  })

  const createEnvironmentMutation = useMutation({
    mutationFn: createEnvironmentRequest,
    onSuccess: async (environment) => {
      toast.success('Environment created')
      setIsCreateDialogOpen(false)
      setSelectedEnvironmentId(environment.id)
      await queryClient.invalidateQueries({ queryKey: ['environments'] })
      await queryClient.invalidateQueries({
        queryKey: ['environment-status', environment.id],
      })
    },
  })

  const updateEnvironmentMutation = useMutation({
    mutationFn: ({
      environmentId,
      payload,
    }: {
      environmentId: string
      payload: { openclawPath: string, port: number }
    }) => updateEnvironmentRequest(environmentId, payload),
    onSuccess: async (environment) => {
      toast.success('Environment updated')
      setIsEditDialogOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['environments'] })
      await queryClient.invalidateQueries({
        queryKey: ['environment-status', environment.id],
      })
      await queryClient.invalidateQueries({ queryKey: ['service-status'] })
      await queryClient.invalidateQueries({
        queryKey: ['backups', environment.id],
      })
    },
  })

  const deleteEnvironmentMutation = useMutation({
    mutationFn: deleteEnvironmentRequest,
    onSuccess: async (_, environmentId) => {
      toast.success('Environment removed')
      if (selectedEnvironmentId === environmentId) {
        setPreviewVersion(null)
        setRestoreVersion('')
      }
      await queryClient.invalidateQueries({ queryKey: ['environments'] })
      await queryClient.invalidateQueries({
        queryKey: ['environment-status', environmentId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['backups', environmentId],
      })
      await queryClient.invalidateQueries({ queryKey: ['service-status'] })
    },
  })

  const restoreBackupMutation = useMutation({
    mutationFn: async (version: number) =>
      restoreBackup(activeEnvironmentId as string, version),
    onSuccess: async () => {
      toast.success('Backup restored')
      await queryClient.invalidateQueries({
        queryKey: ['environment-status', activeEnvironmentId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['backups', activeEnvironmentId],
      })
    },
  })

  const checkVersionMutation = useMutation({
    mutationFn: (environmentId: string) => checkOpenClawVersionRequest(environmentId),
    onSuccess: (result) => {
      const output = result.version ?? result.stdout.trim() ?? result.stderr.trim()
      setVersionOutput(output || 'No version output returned')
      if (result.ok) {
        toast.success('Version check completed')
      }
      else {
        toast.error((result.error ?? result.stderr.trim()) || 'Version check failed')
      }
    },
    onError: (error) => {
      setVersionOutput(error instanceof Error ? error.message : 'Version check failed')
      toast.error(error instanceof Error ? error.message : 'Version check failed')
    },
  })

  const setupEnvironmentMutation = useMutation({
    mutationFn: (environmentId: string) => setupEnvironmentRequest(environmentId),
    onSuccess: async (result: {
      ok: boolean
      stdout: string
      stderr: string
      error?: string
    }) => {
      if (result.ok) {
        toast.success('Setup complete')
      }
      else {
        toast.error((result.error ?? result.stderr.trim()) || 'Setup failed')
      }

      await queryClient.invalidateQueries({
        queryKey: ['environment-status', selectedEnvironment?.id ?? null],
      })
      await queryClient.invalidateQueries({ queryKey: ['service-status'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Setup failed')
    },
  })

  const serviceActionMutation = useMutation({
    mutationFn: ({
      action,
      environmentId,
    }: {
      action: OpenClawServiceAction
      environmentId: string
    }) => runOpenClawServiceAction(action, environmentId),
    onSuccess: async (result) => {
      if (result.error) {
        toast.error(result.error)
      }
      else {
        toast.success(`${getServiceActionLabel(result.launchMode, result.action)} complete`)
      }

      await queryClient.invalidateQueries({ queryKey: ['service-status'] })
      await queryClient.invalidateQueries({ queryKey: ['environments'] })
    },
  })

  const backupPreviewValue = useMemo(() => {
    if (!backupPreviewQuery.data) {
      return ''
    }

    return backupPreviewQuery.data.raw
  }, [backupPreviewQuery.data])

  const selectedBackup = useMemo(
    () =>
      backupsQuery.data?.find(backup => String(backup.version) === restoreVersion) ?? null,
    [backupsQuery.data, restoreVersion]
  )

  const effectiveStatus = serviceStatusQuery.data
  const showSaveEnvironment = Boolean(selectedEnvironment)

  return (
    <div className='container max-w-none px-6 py-8'>
      <main className='mx-auto flex max-w-7xl flex-col gap-6'>
        <div className='space-y-2'>
          <h1 className='text-3xl font-semibold tracking-tight'>Settings</h1>
        </div>

        <div className='grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.9fr)]'>
          <div className='order-last space-y-6 xl:order-none'>
            <Card className='border-border/60'>
              <CardHeader>
                <div className='flex items-center gap-3'>
                  <div className='flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
                    <Settings2 className='size-5' />
                  </div>
                  <CardTitle>Global Configuration</CardTitle>
                </div>
              </CardHeader>
              <CardContent className='space-y-5'>
                <div className='space-y-2'>
                  <div className='text-sm font-medium'>Run environment</div>
                  <Select
                    value={runMode}
                    onValueChange={value => setRunMode(value as OpenClawRunMode)}
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='global'>Global install</SelectItem>
                      <SelectItem value='source'>Source run</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {runMode === 'source' && (
                  <div className='space-y-2'>
                    <div className='text-sm font-medium'>Source path</div>
                    <Input
                      value={sourcePath}
                      onChange={event => setSourcePath(event.target.value)}
                      placeholder='/Users/javis/code/openclaw'
                    />
                  </div>
                )}

                <div className='flex flex-wrap gap-3'>
                  <Button
                    onClick={() =>
                      saveGlobalSettingsMutation.mutate({
                        runMode,
                        sourcePath: runMode === 'source' ? sourcePathValue || null : null,
                      })}
                    disabled={
                      !globalDraftChanged
                      || !sourcePathReady
                      || saveGlobalSettingsMutation.isPending
                    }
                  >
                    {saveGlobalSettingsMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className='border-border/60'>
              <CardHeader>
                <div className='flex items-center gap-3'>
                  <div className='flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
                    {launchMode === 'daemon' ? (
                      <Hammer className='size-5' />
                    ) : (
                      <Terminal className='size-5' />
                    )}
                  </div>
                  <CardTitle>Environment Configuration</CardTitle>
                </div>
              </CardHeader>
              <CardContent className='space-y-5'>
                {!selectedEnvironment && (
                  <div className='rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground'>
                    No environment selected.
                  </div>
                )}

                {selectedEnvironment && (
                  <>
                    <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]'>
                      <div className='space-y-2'>
                        <div className='text-sm font-medium'>Launch mode</div>
                        <Select
                          value={launchMode}
                          onValueChange={value => setLaunchMode(value as OpenClawLaunchMode)}
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='daemon'>Daemon</SelectItem>
                            <SelectItem value='runtime'>Runtime</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {showSaveEnvironment && (
                        <div className='flex items-end gap-3'>
                          <Button
                            disabled={
                              !environmentDraftChanged
                              || saveEnvironmentSettingsMutation.isPending
                            }
                            onClick={() =>
                              saveEnvironmentSettingsMutation.mutate({
                                environmentId: selectedEnvironment.id,
                                launchMode,
                              })}
                          >
                            {saveEnvironmentSettingsMutation.isPending
                              ? 'Saving...'
                              : 'Save'}
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className='flex flex-wrap gap-3'>
                      {!environmentStatus?.configExists && (
                        <Button
                          variant='outline'
                          className='gap-2'
                          disabled={!commandReady || setupEnvironmentMutation.isPending}
                          onClick={() =>
                            setupEnvironmentMutation.mutate(selectedEnvironment.id)}
                        >
                          <Hammer className='size-4' />
                          {setupEnvironmentMutation.isPending ? 'Setting up...' : 'Setup'}
                        </Button>
                      )}

                      <Button
                        variant='outline'
                        className='gap-2'
                        disabled={!commandReady || checkVersionMutation.isPending}
                        onClick={() =>
                          checkVersionMutation.mutate(selectedEnvironment.id)}
                      >
                        <Terminal className='size-4' />
                        {checkVersionMutation.isPending ? 'Checking...' : 'Check'}
                      </Button>
                    </div>

                    {hasPendingCommandDraft && (
                      <div className='rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground'>
                        Save changes first.
                      </div>
                    )}

                    {versionOutput && (
                      <div className='rounded-xl border border-border/60 bg-muted/20 px-4 py-3'>
                        <pre className='overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground'>
                          {versionOutput}
                        </pre>
                      </div>
                    )}

                    {launchMode === 'daemon' ? (
                      <div className='space-y-4'>
                        <div className='text-sm font-medium'>Daemon</div>

                        <div className='flex flex-wrap items-center gap-2'>
                          <Badge variant={effectiveStatus?.running ? 'default' : 'secondary'}>
                            {effectiveStatus?.running ? 'Running' : 'Stopped'}
                          </Badge>
                          <Badge
                            variant={effectiveStatus?.installed ? 'default' : 'secondary'}
                          >
                            {effectiveStatus?.installed ? 'Installed' : 'Not installed'}
                          </Badge>
                          <Badge variant='outline'>Port {selectedEnvironment.port}</Badge>
                        </div>

                        {effectiveStatus?.error && (
                          <div className='text-xs text-destructive'>
                            {effectiveStatus.error}
                          </div>
                        )}

                        <div className='flex flex-wrap gap-3'>
                          <Button
                            variant='outline'
                            className='gap-2'
                            disabled={
                              !commandReady
                              || environmentDraftChanged
                              || serviceActionMutation.isPending
                            }
                            onClick={() =>
                              serviceActionMutation.mutate({
                                action: 'install',
                                environmentId: selectedEnvironment.id,
                              })}
                          >
                            <Hammer className='size-4' />
                            {serviceActionMutation.isPending
                              ? 'Working...'
                              : getServiceActionLabel(launchMode, 'install')}
                          </Button>

                          <Button
                            className='gap-2'
                            disabled={
                              !commandReady
                              || environmentDraftChanged
                              || serviceActionMutation.isPending
                            }
                            onClick={() =>
                              serviceActionMutation.mutate({
                                action: 'start',
                                environmentId: selectedEnvironment.id,
                              })}
                          >
                            <Play className='size-4' />
                            {serviceActionMutation.isPending
                              ? 'Working...'
                              : getServiceActionLabel(launchMode, 'start')}
                          </Button>

                          <Button
                            variant='outline'
                            className='gap-2'
                            disabled={
                              !commandReady
                              || environmentDraftChanged
                              || serviceActionMutation.isPending
                            }
                            onClick={() =>
                              serviceActionMutation.mutate({
                                action: 'restart',
                                environmentId: selectedEnvironment.id,
                              })}
                          >
                            <RefreshCw className='size-4' />
                            {serviceActionMutation.isPending
                              ? 'Working...'
                              : getServiceActionLabel(launchMode, 'restart')}
                          </Button>

                          <Button
                            variant='outline'
                            className='gap-2'
                            disabled={
                              !commandReady
                              || environmentDraftChanged
                              || serviceActionMutation.isPending
                            }
                            onClick={() =>
                              serviceActionMutation.mutate({
                                action: 'stop',
                                environmentId: selectedEnvironment.id,
                              })}
                          >
                            <Square className='size-4' />
                            {serviceActionMutation.isPending
                              ? 'Working...'
                              : getServiceActionLabel(launchMode, 'stop')}
                          </Button>
                        </div>

                        {(effectiveStatus?.stdout || effectiveStatus?.stderr) && (
                          <div className='rounded-xl border border-border/60 bg-muted/20 p-4'>
                            <div className='mb-2 text-xs font-medium'>Latest output</div>
                            <pre className='max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground'>
                              {effectiveStatus.stdout || effectiveStatus.stderr}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className='space-y-4'>
                        <div className='text-sm font-medium'>Runtime</div>

                        <div className='flex flex-wrap items-center gap-2'>
                          <Badge variant={effectiveStatus?.running ? 'default' : 'secondary'}>
                            {effectiveStatus?.running ? 'Healthy' : 'Stopped'}
                          </Badge>
                          <Badge variant='outline'>Port {selectedEnvironment.port}</Badge>
                        </div>

                        <div className='grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground'>
                          <span>pid</span>
                          <span>{effectiveStatus?.pid ?? 'Not running'}</span>
                          <span>started</span>
                          <span>
                            {effectiveStatus?.startedAt
                              ? format(
                                  new Date(effectiveStatus.startedAt),
                                  'yyyy-MM-dd HH:mm:ss'
                                )
                              : 'Not running'}
                          </span>
                          <span>log</span>
                          <span className='break-all'>
                            {effectiveStatus?.logPath ?? 'No runtime log yet'}
                          </span>
                        </div>

                        {effectiveStatus?.error && (
                          <div className='text-xs text-destructive'>
                            {effectiveStatus.error}
                          </div>
                        )}

                        <div className='flex flex-wrap gap-3'>
                          <Button
                            className='gap-2'
                            disabled={
                              !commandReady
                              || environmentDraftChanged
                              || serviceActionMutation.isPending
                            }
                            onClick={() =>
                              serviceActionMutation.mutate({
                                action: 'start',
                                environmentId: selectedEnvironment.id,
                              })}
                          >
                            <Play className='size-4' />
                            {serviceActionMutation.isPending
                              ? 'Working...'
                              : getServiceActionLabel(launchMode, 'start')}
                          </Button>

                          <Button
                            variant='outline'
                            className='gap-2'
                            disabled={
                              !commandReady
                              || environmentDraftChanged
                              || serviceActionMutation.isPending
                            }
                            onClick={() =>
                              serviceActionMutation.mutate({
                                action: 'stop',
                                environmentId: selectedEnvironment.id,
                              })}
                          >
                            <Square className='size-4' />
                            {serviceActionMutation.isPending
                              ? 'Working...'
                              : getServiceActionLabel(launchMode, 'stop')}
                          </Button>
                        </div>

                        {(effectiveStatus?.stdout || effectiveStatus?.stderr) && (
                          <div className='rounded-xl border border-border/60 bg-muted/20 p-4'>
                            <div className='mb-2 text-xs font-medium'>Latest output</div>
                            <pre className='max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-muted-foreground'>
                              {effectiveStatus.stdout || effectiveStatus.stderr}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className='order-first space-y-6 xl:order-none'>
            <Card className='border-border/60'>
              <CardHeader>
                <div className='flex items-center gap-3'>
                  <div className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
                    <Folder className='size-5' />
                  </div>
                  <CardTitle>Environment</CardTitle>
                </div>
              </CardHeader>
              <CardContent className='space-y-5'>
                {isLoadingEnvironments && (
                  <div className='text-sm text-muted-foreground'>
                    Loading environments...
                  </div>
                )}

                {!isLoadingEnvironments && environments.length === 0 && (
                  <div className='rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8'>
                    <div className='text-sm text-muted-foreground'>No environments.</div>
                    <div className='mt-4'>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>Create</Button>
                    </div>
                  </div>
                )}

                {environments.length > 0 && (
                  <>
                    <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]'>
                      <div className='space-y-2'>
                        <div className='text-sm font-medium'>Active environment</div>
                        <Select
                          value={selectedEnvironmentId ?? undefined}
                          onValueChange={value => setSelectedEnvironmentId(value)}
                        >
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Select environment' />
                          </SelectTrigger>
                          <SelectContent>
                            {environments.map(environment => {
                              const labels = getEnvironmentLabels(environment.openclawPath)
                              return (
                                <SelectItem key={environment.id} value={environment.id}>
                                  {labels.name}
                                  {' '}
                                  ·
                                  {' '}
                                  {environment.port}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className='flex flex-wrap items-end gap-2'>
                        <Button
                          variant='outline'
                          className='gap-2'
                          onClick={() => setIsEditDialogOpen(true)}
                          disabled={!selectedEnvironment}
                        >
                          <Pencil className='size-4' />
                          Edit
                        </Button>

                        <Button onClick={() => setIsCreateDialogOpen(true)}>Create</Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant='ghost'
                              className='gap-2 text-muted-foreground'
                              disabled={!selectedEnvironment}
                            >
                              <Trash2 className='size-4' />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete environment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This only removes the environment record from Auto Claw. It does
                                not delete files under
                                {' '}
                                <code>{selectedEnvironment?.openclawPath}</code>
                                .
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  selectedEnvironment
                                    && deleteEnvironmentMutation.mutate(
                                      selectedEnvironment.id
                                    )}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className='rounded-2xl border border-border/60 bg-muted/20 p-5'>
                      {!selectedEnvironment && (
                        <div className='text-sm text-muted-foreground'>
                          No environment selected.
                        </div>
                      )}

                      {selectedEnvironment && (
                        <div className='space-y-4'>
                          <div className='space-y-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <div className='text-lg font-semibold'>
                                {selectedEnvironmentLabels?.name}
                              </div>
                              <Badge variant='outline'>Port {selectedEnvironment.port}</Badge>
                              <Badge variant='outline'>
                                {selectedEnvironment.launchMode === 'runtime'
                                  ? 'Runtime'
                                  : 'Daemon'}
                              </Badge>
                              <Badge
                                variant={
                                  environmentStatus?.canLoadConfig ? 'default' : 'secondary'
                                }
                              >
                                {environmentStatus?.canLoadConfig
                                  ? 'Config ready'
                                  : 'Config issue'}
                              </Badge>
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {selectedEnvironmentLabels?.parent}
                            </div>
                            <div className='break-all text-xs text-muted-foreground'>
                              {selectedEnvironment.openclawPath}
                            </div>
                          </div>

                          <div className='rounded-xl border border-border/60 bg-background/80 p-4 text-sm text-muted-foreground'>
                            {environmentStatus?.error
                              ? environmentStatus.error
                              : environmentStatus?.configPath
                                  ?? 'Status will appear after the environment is selected.'}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className='space-y-3'>
                      <div className='text-sm font-medium'>Restore backup</div>

                      {activeEnvironmentId && backupsQuery.data?.length === 0 && (
                        <div className='rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground'>
                          No backups created yet.
                        </div>
                      )}

                      {activeEnvironmentId && (backupsQuery.data?.length ?? 0) > 0 && (
                        <>
                          <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]'>
                            <Select
                              value={restoreVersion}
                              onValueChange={setRestoreVersion}
                            >
                              <SelectTrigger className='w-full'>
                                <SelectValue placeholder='Select backup version' />
                              </SelectTrigger>
                              <SelectContent>
                                {backupsQuery.data?.map(backup => (
                                  <SelectItem
                                    key={backup.version}
                                    value={String(backup.version)}
                                  >
                                    Version
                                    {' '}
                                    {backup.version}
                                    {' '}
                                    ·
                                    {' '}
                                    {format(
                                      new Date(backup.createdAt),
                                      'yyyy-MM-dd HH:mm:ss'
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button
                              variant='outline'
                              disabled={!selectedBackup}
                              onClick={() =>
                                selectedBackup
                                  && setPreviewVersion(selectedBackup.version)}
                            >
                              View
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant='outline'
                                  className='gap-2'
                                  disabled={!selectedBackup}
                                >
                                  <RotateCcw className='size-4' />
                                  Restore
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Restore backup?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This overwrites the current
                                    {' '}
                                    <code>openclaw.json</code>
                                    {' '}
                                    with
                                    {' '}
                                    <code>{selectedBackup?.filename}</code>
                                    .
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      selectedBackup
                                        && restoreBackupMutation.mutate(
                                          selectedBackup.version
                                        )}
                                  >
                                    Restore
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          {selectedBackup && (
                            <div className='rounded-xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground'>
                              <div>File: {selectedBackup.filename}</div>
                              <div>
                                Created:
                                {' '}
                                {format(
                                  new Date(selectedBackup.createdAt),
                                  'yyyy-MM-dd HH:mm:ss'
                                )}
                              </div>
                              <div>Size: {formatBytes(selectedBackup.size)}</div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <EnvironmentDialog
        mode='create'
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        isPending={createEnvironmentMutation.isPending}
        onSubmit={payload => createEnvironmentMutation.mutate(payload)}
      />

      <EnvironmentDialog
        mode='edit'
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialEnvironment={selectedEnvironment}
        isPending={updateEnvironmentMutation.isPending}
        onSubmit={payload =>
          selectedEnvironment
            && updateEnvironmentMutation.mutate({
              environmentId: selectedEnvironment.id,
              payload,
            })}
      />

      <Dialog
        open={previewVersion !== null}
        onOpenChange={open => {
          if (!open) {
            setPreviewVersion(null)
          }
        }}
      >
        <DialogContent className='max-h-[85vh] max-w-4xl overflow-hidden'>
          <DialogHeader>
            <DialogTitle>
              Backup preview
              {backupPreviewQuery.data
                ? ` · Version ${backupPreviewQuery.data.version}`
                : ''}
            </DialogTitle>
            <DialogDescription>
              Review the stored OpenClaw configuration before restoring it.
            </DialogDescription>
          </DialogHeader>

          <div className='min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background/80'>
            <MonacoJsonEditor
              value={backupPreviewValue}
              height='60vh'
              path={`backup-preview-${previewVersion ?? 'unknown'}.json`}
              readOnly
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
