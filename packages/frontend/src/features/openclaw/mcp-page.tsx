import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  EntityCard,
  EntityGrid,
} from '@/components/config-builder'
import { Main } from '@/components/layout/main'
import { useAuthenticatedHeader } from '@/components/layout/authenticated-header-context'
import { asArray, asObject } from './_internal/lib/value-readers'
import { getOpenClawSectionDefinition } from './section-registry'
import { useOpenClawSection } from './use-openclaw-section'

function getNextServerId(servers: Record<string, unknown>) {
  let index = Object.keys(servers).length + 1
  while (`server-${index}` in servers) {
    index += 1
  }

  return `server-${index}`
}

export function McpPage() {
  useAuthenticatedHeader()

  const navigate = useNavigate()
  const definition = getOpenClawSectionDefinition('mcp')
  const { selectedEnvironmentId, sectionQuery, saveMutation } = useOpenClawSection(
    'mcp',
    definition.queryKey,
    definition.title
  )
  const mcpValue = asObject(sectionQuery.data)
  const servers = asObject(mcpValue.servers)

  if (!selectedEnvironmentId || sectionQuery.isLoading) {
    return (
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>{definition.title}</CardTitle>
            <CardDescription>Loading MCP servers...</CardDescription>
          </CardHeader>
        </Card>
      </Main>
    )
  }

  const addServer = async () => {
    const serverId = getNextServerId(servers)
    await saveMutation.mutateAsync({
      ...mcpValue,
      servers: {
        ...servers,
        [serverId]: {
          command: '',
          args: [],
          env: {},
        },
      },
    })

    void navigate({
      to: '/mcp/server/$serverId',
      params: {
        serverId,
      },
    })
  }

  const removeServer = async (serverId: string) => {
    const nextServers = { ...servers }
    delete nextServers[serverId]

    await saveMutation.mutateAsync({
      ...mcpValue,
      servers: nextServers,
    })
  }

  return (
    <Main className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>{definition.title}</h1>
          <p className='text-sm text-muted-foreground'>{definition.description}</p>
        </div>
        <Button type='button' onClick={() => void addServer()} disabled={saveMutation.isPending}>
          Add Server
        </Button>
      </div>

      <EntityGrid
        emptyTitle='No MCP servers'
        emptyDescription='Add a server to start configuring MCP integrations.'
      >
        {Object.entries(servers).map(([serverId, serverValue]) => {
          const server = asObject(serverValue)
          const badges = [
            asArray(server.args).length > 0 ? { label: 'args' } : null,
            Object.keys(asObject(server.env)).length > 0 ? { label: 'env' } : null,
            typeof server.cwd === 'string' && server.cwd ? { label: 'cwd' } : null,
          ].filter(Boolean) as Array<{ label: string }>

          return (
            <EntityCard
              key={serverId}
              title={serverId}
              subtitle={
                typeof server.command === 'string' && server.command
                  ? server.command
                  : typeof server.url === 'string'
                    ? server.url
                    : 'No command or URL'
              }
              badges={badges}
              meta={[
                typeof server.workingDirectory === 'string' && server.workingDirectory
                  ? `workingDirectory: ${server.workingDirectory}`
                  : '',
              ].filter(Boolean)}
              onClick={() =>
                navigate({
                  to: '/mcp/server/$serverId',
                  params: { serverId },
                })}
              actions={
                <Button
                  type='button'
                  variant='ghost'
                  onClick={(event) => {
                    event.stopPropagation()
                    void removeServer(serverId)
                  }}
                  disabled={saveMutation.isPending}
                >
                  Remove
                </Button>
              }
            />
          )
        })}
      </EntityGrid>
    </Main>
  )
}
