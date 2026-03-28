import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  OpenClawSkillCatalogGroup,
} from '@/types/openclaw'
import { fetchSkillContent } from '@/lib/api'
import {
  EditorDialog,
  EntityCard,
  EntityGrid,
} from '@/components/config-builder'
import { Button } from '@/components/ui/button'

type SkillCatalogBrowserProps = {
  environmentId: string
  groups: OpenClawSkillCatalogGroup[]
  skillEntries?: Record<string, unknown>
  flattenSingleGroup?: boolean
  emptyTitle: string
  emptyDescription: string
}

export function SkillCatalogBrowser({
  environmentId,
  groups,
  skillEntries = {},
  flattenSingleGroup = false,
  emptyTitle,
  emptyDescription,
}: SkillCatalogBrowserProps) {
  const [selectedSkillPath, setSelectedSkillPath] = useState<string | null>(null)

  const selectedSkill = useMemo(
    () =>
      groups.flatMap((group) => group.items).find((item) => item.path === selectedSkillPath)
      ?? null,
    [groups, selectedSkillPath]
  )

  const skillContentQuery = useQuery({
    queryKey: ['skill-content', environmentId, selectedSkillPath],
    queryFn: () => fetchSkillContent(environmentId, selectedSkillPath as string),
    enabled: Boolean(environmentId && selectedSkillPath),
  })

  const renderGrid = (items: OpenClawSkillCatalogGroup['items']) => (
    <EntityGrid emptyTitle={emptyTitle} emptyDescription={emptyDescription}>
      {items.map((item) => (
        <EntityCard
          key={item.path}
          title={item.name}
          subtitle={item.sourceLabel}
          description={item.summary}
          meta={[item.path]}
          onClick={() => setSelectedSkillPath(item.path)}
        />
      ))}
    </EntityGrid>
  )

  return (
    <>
      {flattenSingleGroup
        ? renderGrid(groups[0]?.items ?? [])
        : groups.map((group) => (
            <div key={group.id} className='space-y-4'>
              <div className='space-y-1'>
                <h2 className='text-lg font-semibold tracking-tight'>{group.title}</h2>
                <p className='text-sm text-muted-foreground'>{group.path}</p>
              </div>
              {renderGrid(group.items)}
            </div>
          ))}

      <EditorDialog
        open={Boolean(selectedSkillPath)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSkillPath(null)
          }
        }}
        title={selectedSkill?.name ?? 'Skill'}
        description={selectedSkill?.path}
        size='full'
        footer={
          <Button type='button' variant='outline' onClick={() => setSelectedSkillPath(null)}>
            Close
          </Button>
        }
      >
        <div className='space-y-5'>
          <div className='space-y-1'>
            <div className='text-sm font-medium'>Source</div>
            <div className='text-sm text-muted-foreground'>
              {selectedSkill?.sourceLabel ?? '-'}
            </div>
          </div>

          {selectedSkill && Boolean(skillEntries[selectedSkill.name]) && (
            <div className='space-y-2'>
              <div className='text-sm font-medium'>Configured Entry</div>
              <pre className='overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-6'>
                {JSON.stringify(skillEntries[selectedSkill.name], null, 2)}
              </pre>
            </div>
          )}

          <div className='space-y-2'>
            <div className='text-sm font-medium'>SKILL.md</div>
            <pre className='overflow-x-auto rounded-xl border border-border/60 bg-muted/20 p-4 text-xs leading-6 whitespace-pre-wrap'>
              {skillContentQuery.data?.content ?? 'Loading skill content...'}
            </pre>
          </div>
        </div>
      </EditorDialog>
    </>
  )
}
