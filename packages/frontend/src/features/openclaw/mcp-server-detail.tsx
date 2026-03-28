import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getObjectPropertySchema } from '@/lib/json-schema'
import { useEnvironmentContext } from '@/context/environment-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DetailPageShell } from '@/components/config-builder'
import { Main } from '@/components/layout/main'
import { useAuthenticatedHeader } from '@/components/layout/authenticated-header-context'
import { asObject } from './_internal/lib/value-readers'
import { getOpenClawSectionDefinition } from './section-registry'
import { SchemaFormEditor } from './schema-form-editor'
import { useOpenClawSection } from './use-openclaw-section'

type McpServerDetailProps = {
  routeServerId: string
}

export function McpServerDetail({ routeServerId }: McpServerDetailProps) {
  useAuthenticatedHeader()

  const navigate = useNavigate()
  const definition = getOpenClawSectionDefinition('mcp')
  const { metadata } = useEnvironmentContext()
  const { selectedEnvironmentId, sectionQuery, saveMutation } = useOpenClawSection(
    'mcp',
    definition.queryKey,
    definition.title
  )
  const [draft, setDraft] = useState<Record<string, unknown>>({})

  const sectionMetadata = metadata?.sections.mcp
  const mcpValue = asObject(sectionQuery.data)
  const servers = asObject(mcpValue.servers)
  const currentServer = asObject(servers[routeServerId])
  const serverSchema = useMemo(() => {
    const serversSchema = getObjectPropertySchema(sectionMetadata?.schema, 'servers')
    return serversSchema &&
      typeof serversSchema.additionalProperties === 'object'
      ? serversSchema.additionalProperties
      : undefined
  }, [sectionMetadata])

  useEffect(() => {
    setDraft(currentServer)
  }, [sectionQuery.data, routeServerId])

  if (!selectedEnvironmentId || sectionQuery.isLoading) {
    return (
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>MCP Server</CardTitle>
            <CardDescription>Loading server details...</CardDescription>
          </CardHeader>
        </Card>
      </Main>
    )
  }

  if (!(routeServerId in servers)) {
    return (
      <Main>
        <DetailPageShell
          title='Server not found'
          description='The selected MCP server no longer exists.'
          backLabel='Back to MCP'
          onBack={() => void navigate({ to: '/mcp' })}
        >
          <div className='rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground'>
            Return to the MCP overview and select another server card.
          </div>
        </DetailPageShell>
      </Main>
    )
  }

  const saveServer = async () => {
    await saveMutation.mutateAsync({
      ...mcpValue,
      servers: {
        ...servers,
        [routeServerId]: draft,
      },
    })
  }

  const removeServer = async () => {
    const nextServers = { ...servers }
    delete nextServers[routeServerId]

    await saveMutation.mutateAsync({
      ...mcpValue,
      servers: nextServers,
    })
    void navigate({ to: '/mcp' })
  }

  return (
    <Main>
      <DetailPageShell
        title={routeServerId}
        description='Configure a single MCP server entry.'
        backLabel='Back to MCP'
        onBack={() => void navigate({ to: '/mcp' })}
        actions={
          <>
            <Button
              type='button'
              variant='ghost'
              onClick={() => void removeServer()}
              disabled={saveMutation.isPending}
            >
              Remove
            </Button>
            <Button
              type='button'
              onClick={() => void saveServer()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        {serverSchema && (
          <SchemaFormEditor
            path={`mcp.servers.${routeServerId}`}
            schema={serverSchema}
            value={draft}
            onChange={(nextValue) => setDraft(asObject(nextValue))}
            layout='compact'
            descriptionMode='tooltip'
            showAllFields
            compactFieldLayout='inline'
            compactBooleanColumns
          />
        )}
      </DetailPageShell>
    </Main>
  )
}
