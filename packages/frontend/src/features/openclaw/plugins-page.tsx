import { useEffect, useMemo, useState } from 'react'
import { getObjectPropertySchema, pickSchemaProperties } from '@/lib/json-schema'
import { useEnvironmentContext } from '@/context/environment-provider'
import {
  EditorDialog,
  EntityCard,
  EntityGrid,
  MultiSelectField,
} from '@/components/config-builder'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Main } from '@/components/layout/main'
import { useAuthenticatedHeader } from '@/components/layout/authenticated-header-context'
import { asArray, asObject } from './_internal/lib/value-readers'
import { getOpenClawSectionDefinition } from './section-registry'
import { SchemaFormEditor } from './schema-form-editor'
import { useOpenClawSection } from './use-openclaw-section'

function omitPluginGlobals(value: Record<string, unknown>) {
  const nextValue = { ...value }
  delete nextValue.entries
  delete nextValue.allowlist
  delete nextValue.denylist
  return nextValue
}

export function PluginsPage() {
  useAuthenticatedHeader()

  const definition = getOpenClawSectionDefinition('plugins')
  const { metadata, isLoadingMetadata } = useEnvironmentContext()
  const { selectedEnvironmentId, sectionQuery, saveMutation } = useOpenClawSection(
    'plugins',
    definition.queryKey,
    definition.title
  )
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false)
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null)
  const [pluginDraft, setPluginDraft] = useState<Record<string, unknown>>({})
  const [globalDraft, setGlobalDraft] = useState<Record<string, unknown>>({})
  const [allowlist, setAllowlist] = useState<string[]>([])
  const [denylist, setDenylist] = useState<string[]>([])

  const sectionMetadata = metadata?.sections.plugins
  const pluginsValue = asObject(sectionQuery.data)
  const pluginEntries = asObject(pluginsValue.entries)
  const pluginIds = Object.keys(pluginEntries).sort()

  const globalSchema = useMemo(() => {
    if (!sectionMetadata) {
      return undefined
    }

    return pickSchemaProperties(
      sectionMetadata.schema,
      Object.keys(sectionMetadata.schema.properties ?? {}).filter(
        (key) => !['entries', 'allowlist', 'denylist'].includes(key)
      )
    )
  }, [sectionMetadata])

  const entrySchema = useMemo(() => {
    const entriesSchema = getObjectPropertySchema(sectionMetadata?.schema, 'entries')
    return entriesSchema &&
      typeof entriesSchema.additionalProperties === 'object'
      ? entriesSchema.additionalProperties
      : undefined
  }, [sectionMetadata])

  useEffect(() => {
    setGlobalDraft(omitPluginGlobals(pluginsValue))
    setAllowlist(asArray(pluginsValue.allowlist).filter((value): value is string => typeof value === 'string'))
    setDenylist(asArray(pluginsValue.denylist).filter((value): value is string => typeof value === 'string'))
  }, [sectionQuery.data])

  useEffect(() => {
    if (!selectedPluginId) {
      setPluginDraft({})
      return
    }

    setPluginDraft(asObject(pluginEntries[selectedPluginId]))
  }, [pluginEntries, selectedPluginId])

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
            <CardDescription>Loading plugins...</CardDescription>
          </CardHeader>
        </Card>
      </Main>
    )
  }

  const savePluginEntry = async () => {
    if (!selectedPluginId) {
      return
    }

    await saveMutation.mutateAsync({
      ...pluginsValue,
      entries: {
        ...pluginEntries,
        [selectedPluginId]: pluginDraft,
      },
    })
    setSelectedPluginId(null)
  }

  const saveGlobalSettings = async () => {
    await saveMutation.mutateAsync({
      ...globalDraft,
      allowlist,
      denylist,
      entries: pluginEntries,
    })
    setGlobalSettingsOpen(false)
  }

  const togglePluginEnabled = async (pluginId: string, enabled: boolean) => {
    const currentEntry = asObject(pluginEntries[pluginId])
    await saveMutation.mutateAsync({
      ...pluginsValue,
      entries: {
        ...pluginEntries,
        [pluginId]: {
          ...currentEntry,
          enabled,
        },
      },
    })
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
          onClick={() => setGlobalSettingsOpen(true)}
        >
          Global Settings
        </Button>
      </div>

      <EntityGrid
        emptyTitle='No plugin entries'
        emptyDescription='No plugins are defined in plugins.entries.'
      >
        {pluginIds.map((pluginId) => {
          const pluginValue = asObject(pluginEntries[pluginId])
          const badges = [
            pluginValue.config ? { label: 'config' } : null,
            pluginValue.hooks ? { label: 'hooks' } : null,
            pluginValue.subagent ? { label: 'subagent' } : null,
          ].filter(Boolean) as Array<{ label: string }>

          return (
            <EntityCard
              key={pluginId}
              title={pluginId}
              subtitle={
                typeof pluginValue.enabled === 'boolean'
                  ? pluginValue.enabled
                    ? 'Enabled'
                    : 'Disabled'
                  : 'Not set'
              }
              badges={badges}
              onClick={() => setSelectedPluginId(pluginId)}
              actions={
                <div className='flex w-full items-center justify-between gap-3'>
                  <Label htmlFor={`plugin-enabled-${pluginId}`} className='text-xs text-muted-foreground'>
                    Enabled
                  </Label>
                  <Switch
                    id={`plugin-enabled-${pluginId}`}
                    checked={pluginValue.enabled === true}
                    onCheckedChange={(checked) => void togglePluginEnabled(pluginId, checked)}
                    disabled={saveMutation.isPending}
                  />
                </div>
              }
            />
          )
        })}
      </EntityGrid>

      <EditorDialog
        open={globalSettingsOpen}
        onOpenChange={setGlobalSettingsOpen}
        title='Global Settings'
        description='Configure global plugin behavior, including allow and deny lists.'
        footer={
          <>
            <Button
              type='button'
              variant='outline'
              onClick={() => setGlobalSettingsOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => void saveGlobalSettings()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div className='space-y-5'>
          <div className='space-y-2'>
            <Label>Allowlist</Label>
            <MultiSelectField
              options={pluginIds.map((pluginId) => ({
                label: pluginId,
                value: pluginId,
              }))}
              value={allowlist}
              onChange={setAllowlist}
              placeholder='Select allowed plugins'
            />
          </div>

          <div className='space-y-2'>
            <Label>Denylist</Label>
            <MultiSelectField
              options={pluginIds.map((pluginId) => ({
                label: pluginId,
                value: pluginId,
              }))}
              value={denylist}
              onChange={setDenylist}
              placeholder='Select denied plugins'
            />
          </div>

          {globalSchema && (
            <SchemaFormEditor
              path='plugins'
              schema={globalSchema}
              value={globalDraft}
              onChange={(nextValue) => setGlobalDraft(asObject(nextValue))}
              layout='compact'
              descriptionMode='tooltip'
              showAllFields
              compactFieldLayout='inline'
              compactBooleanColumns
            />
          )}
        </div>
      </EditorDialog>

      <EditorDialog
        open={Boolean(selectedPluginId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPluginId(null)
          }
        }}
        title={selectedPluginId ?? 'Plugin'}
        description='Configure the selected plugin entry.'
        footer={
          <>
            <Button
              type='button'
              variant='outline'
              onClick={() => setSelectedPluginId(null)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => void savePluginEntry()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        {entrySchema && (
          <SchemaFormEditor
            path={`plugins.entries.${selectedPluginId ?? 'plugin'}`}
            schema={entrySchema}
            value={pluginDraft}
            onChange={(nextValue) => setPluginDraft(asObject(nextValue))}
            layout='compact'
            descriptionMode='tooltip'
            showAllFields
            compactFieldLayout='inline'
            compactBooleanColumns
          />
        )}
      </EditorDialog>
    </Main>
  )
}
