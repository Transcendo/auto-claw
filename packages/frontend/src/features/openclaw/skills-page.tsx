import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pickSchemaProperties } from '@/lib/json-schema'
import { fetchSkillsCatalog } from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'
import {
  EditorDialog,
} from '@/components/config-builder'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Main } from '@/components/layout/main'
import { useAuthenticatedHeader } from '@/components/layout/authenticated-header-context'
import { asObject } from './_internal/lib/value-readers'
import { SkillCatalogBrowser } from './skill-catalog-browser'
import { getOpenClawSectionDefinition } from './section-registry'
import { SchemaFormEditor } from './schema-form-editor'
import { useOpenClawSection } from './use-openclaw-section'

function filterGlobalSkillValue(value: Record<string, unknown>) {
  const nextValue = { ...value }
  delete nextValue.entries
  return nextValue
}

export function SkillsPage() {
  useAuthenticatedHeader()

  const definition = getOpenClawSectionDefinition('skills')
  const { metadata, isLoadingMetadata, environmentStatus } = useEnvironmentContext()
  const { selectedEnvironmentId, sectionQuery, saveMutation } = useOpenClawSection(
    'skills',
    definition.queryKey,
    definition.title
  )
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false)
  const [skillTab, setSkillTab] = useState('openclaw')
  const [globalDraft, setGlobalDraft] = useState<Record<string, unknown>>({})

  const sectionMetadata = metadata?.sections.skills
  const skillsValue = asObject(sectionQuery.data)
  const skillEntries = asObject(skillsValue.entries)
  const globalSchema = useMemo(() => {
    if (!sectionMetadata) {
      return undefined
    }

    return pickSchemaProperties(
      sectionMetadata.schema,
      Object.keys(sectionMetadata.schema.properties ?? {}).filter(
        (key) => key !== 'entries'
      )
    )
  }, [sectionMetadata])

  useEffect(() => {
    setGlobalDraft(filterGlobalSkillValue(skillsValue))
  }, [sectionQuery.data])

  const catalogQuery = useQuery({
    queryKey: ['skills-catalog', selectedEnvironmentId],
    queryFn: () => fetchSkillsCatalog(selectedEnvironmentId as string),
    enabled:
      Boolean(selectedEnvironmentId) &&
      environmentStatus?.canLoadConfig === true,
  })

  if (
    !selectedEnvironmentId ||
    isLoadingMetadata ||
    !sectionMetadata ||
    sectionQuery.isLoading ||
    catalogQuery.isLoading
  ) {
    return (
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>{definition.title}</CardTitle>
            <CardDescription>Loading skills...</CardDescription>
          </CardHeader>
        </Card>
      </Main>
    )
  }

  const openclawGroups = (catalogQuery.data?.groups ?? []).filter(
    (group) => group.sourceType === 'environment'
  )
  const userGroups = (catalogQuery.data?.groups ?? []).filter(
    (group) => group.sourceType === 'user'
  )

  const saveGlobalSettings = async () => {
    await saveMutation.mutateAsync({
      ...globalDraft,
      entries: skillEntries,
    })
    setGlobalSettingsOpen(false)
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

      <Tabs value={skillTab} onValueChange={setSkillTab} className='space-y-5'>
        <TabsList>
          <TabsTrigger value='openclaw'>OpenClaw Skill</TabsTrigger>
          <TabsTrigger value='user'>User Skill</TabsTrigger>
        </TabsList>

        <TabsContent value='openclaw' className='space-y-6'>
          <SkillCatalogBrowser
            environmentId={selectedEnvironmentId}
            groups={openclawGroups}
            skillEntries={skillEntries}
            flattenSingleGroup
            emptyTitle='No skills found'
            emptyDescription='No SKILL.md files were discovered in the environment skills directory.'
          />
        </TabsContent>

        <TabsContent value='user' className='space-y-6'>
          <SkillCatalogBrowser
            environmentId={selectedEnvironmentId}
            groups={userGroups}
            skillEntries={skillEntries}
            emptyTitle='No user skills found'
            emptyDescription='No skills are installed in ~/.agents/skills.'
          />
        </TabsContent>
      </Tabs>

      <EditorDialog
        open={globalSettingsOpen}
        onOpenChange={setGlobalSettingsOpen}
        title='Global Settings'
        description='Configure global skill loading behavior for the selected environment.'
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
        {globalSchema && (
          <SchemaFormEditor
            path='skills'
            schema={globalSchema}
            value={globalDraft}
            onChange={(nextValue) =>
              setGlobalDraft(asObject(nextValue))
            }
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
