import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDown,
  FileText,
  Pause,
  Play,
  Trash2,
} from 'lucide-react'
import { fetchLogFile, fetchLogFiles } from '@/lib/api'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LogFileType, RuntimeLogLine } from '@/types/openclaw'

const MAX_LOG_LINES = 1000
const POLL_INTERVAL = 2000
const TAIL_SIZE = 500

const LOG_TYPE_LABELS: Record<LogFileType, string> = {
  'gateway': 'Gateway',
  'gateway-error': 'Gateway Errors',
  'config-audit': 'Config Audit',
  'commands': 'Commands',
}

function getLevelColor(level?: string) {
  switch (level) {
    case 'error':
    case 'fatal':
      return 'text-red-500'
    case 'warn':
      return 'text-yellow-500'
    case 'debug':
    case 'trace':
      return 'text-muted-foreground/60'
    default:
      return 'text-foreground'
  }
}

function formatTime(time?: string) {
  if (!time) return ''
  try {
    const date = new Date(time)
    const hms = date.toLocaleTimeString('en-US', { hour12: false })
    const ms = String(date.getMilliseconds()).padStart(3, '0')
    return `${hms}.${ms}`
  }
  catch {
    return time
  }
}

function LogLine({ line }: { line: RuntimeLogLine }) {
  const levelColor = getLevelColor(line.level)

  return (
    <div className='flex gap-2 border-b border-border/30 px-4 py-1.5 font-mono text-xs leading-relaxed hover:bg-muted/30'>
      {line.time && (
        <span className='shrink-0 text-muted-foreground/70'>
          {formatTime(line.time)}
        </span>
      )}
      {line.level && (
        <span className={`w-12 shrink-0 text-right font-semibold uppercase ${levelColor}`}>
          {line.level}
        </span>
      )}
      {line.subsystem && (
        <span className='shrink-0 text-blue-400/80'>
          [{line.subsystem}]
        </span>
      )}
      <span className={levelColor}>
        {line.message}
      </span>
    </div>
  )
}

export function LogsPage() {
  const { selectedEnvironment, selectedEnvironmentId } = useEnvironmentContext()
  const [logType, setLogType] = useState<LogFileType>('gateway')
  const [lines, setLines] = useState<RuntimeLogLine[]>([])
  const [offset, setOffset] = useState(0)
  const [logPath, setLogPath] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)

  const environmentId = selectedEnvironmentId ?? ''

  const logFilesQuery = useQuery({
    queryKey: ['log-files', environmentId],
    queryFn: () => fetchLogFiles(environmentId),
    enabled: Boolean(environmentId),
  })

  const availableTypes = logFilesQuery.data ?? []

  const logsQuery = useQuery({
    queryKey: ['openclaw-logs', environmentId, logType, offset],
    queryFn: () => fetchLogFile(
      environmentId,
      logType,
      isInitialLoad.current ? TAIL_SIZE : TAIL_SIZE,
      isInitialLoad.current ? 0 : offset
    ),
    enabled: Boolean(environmentId) && !isPaused,
    refetchInterval: isPaused ? false : POLL_INTERVAL,
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    if (!logsQuery.data) return

    const { lines: newLines, offset: newOffset, logPath: newLogPath } = logsQuery.data

    if (newLines.length === 0 && !isInitialLoad.current) {
      setOffset(newOffset)
      return
    }

    if (isInitialLoad.current) {
      setLines(newLines.slice(-MAX_LOG_LINES))
      isInitialLoad.current = false
    }
    else {
      setLines(prev => {
        const combined = [...prev, ...newLines]
        return combined.length > MAX_LOG_LINES
          ? combined.slice(-MAX_LOG_LINES)
          : combined
      })
    }

    setOffset(newOffset)
    setLogPath(newLogPath)
  }, [logsQuery.data])

  useEffect(() => {
    isInitialLoad.current = true
    setLines([])
    setOffset(0)
    setLogPath('')
  }, [environmentId, logType])

  useEffect(() => {
    if (!autoScroll) return
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [lines, autoScroll])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 60

    setAutoScroll(isNearBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
      setAutoScroll(true)
    }
  }, [])

  const clearLogs = useCallback(() => {
    setLines([])
  }, [])

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev)
  }, [])

  if (!selectedEnvironment) {
    return (
      <div className='container max-w-none px-6 py-8'>
        <main className='mx-auto flex max-w-7xl flex-col gap-6'>
          <div className='space-y-2'>
            <h1 className='text-3xl font-semibold tracking-tight'>Logs</h1>
          </div>
          <Card className='border-border/60'>
            <CardContent className='py-12'>
              <div className='text-center text-sm text-muted-foreground'>
                No environment selected. Please select an environment from the sidebar.
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className='container max-w-none px-6 py-8'>
      <main className='mx-auto flex max-w-7xl flex-col gap-6'>
        <div className='space-y-2'>
          <h1 className='text-3xl font-semibold tracking-tight'>Logs</h1>
        </div>

        <Card className='border-border/60'>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                <div className='flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
                  <FileText className='size-5' />
                </div>
                <div>
                  <CardTitle className='text-base'>
                    {selectedEnvironment.openclawPath.split('/').filter(Boolean).pop() ?? 'Environment'} · Port {selectedEnvironment.port}
                  </CardTitle>
                  {logPath && (
                    <p className='mt-0.5 max-w-xl truncate text-xs text-muted-foreground'>
                      {logPath}
                    </p>
                  )}
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <Select
                  value={logType}
                  onValueChange={value => setLogType(value as LogFileType)}
                >
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.length > 0
                      ? availableTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {LOG_TYPE_LABELS[type]}
                          </SelectItem>
                        ))
                      : (['gateway', 'gateway-error', 'config-audit', 'commands'] as LogFileType[]).map(type => (
                          <SelectItem key={type} value={type}>
                            {LOG_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>

                <Badge variant={isPaused ? 'secondary' : 'default'} className='gap-1'>
                  {isPaused ? 'Paused' : 'Live'}
                </Badge>
                <Badge variant='outline'>
                  {lines.length} lines
                </Badge>

                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1.5'
                  onClick={togglePause}
                >
                  {isPaused ? <Play className='size-3.5' /> : <Pause className='size-3.5' />}
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>

                <Button
                  variant='outline'
                  size='sm'
                  className='gap-1.5'
                  onClick={clearLogs}
                >
                  <Trash2 className='size-3.5' />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className='px-0 pb-0'>
            <div className='relative'>
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className='h-[calc(100vh-320px)] min-h-[400px] overflow-auto rounded-b-xl bg-background/80'
              >
                {lines.length === 0 && (
                  <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
                    {logsQuery.isLoading
                      ? 'Loading logs...'
                      : 'No log entries. The service may not be running or no logs have been written yet.'}
                  </div>
                )}

                {lines.map((line, index) => (
                  <LogLine key={`${index}-${line.time ?? ''}`} line={line} />
                ))}
              </div>

              {!autoScroll && (
                <Button
                  size='sm'
                  className='absolute bottom-4 right-4 gap-1.5 shadow-lg'
                  onClick={scrollToBottom}
                >
                  <ArrowDown className='size-3.5' />
                  Scroll to bottom
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
