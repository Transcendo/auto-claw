import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { useAuthenticatedHeader } from '@/components/layout/authenticated-header-context'
import { getOpenClawSectionDefinition } from './section-registry'

export function createSettingsShellPage(
  sectionKey: 'gateway' | 'hooks' | 'cron'
) {
  const definition = getOpenClawSectionDefinition(sectionKey)

  return function SettingsShellPage() {
    useAuthenticatedHeader()

    const navigate = useNavigate()

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
            onClick={() =>
              void navigate({
                to: `${definition.route}/settings`,
              })}
          >
            Global Settings
          </Button>
        </div>

        <div className='rounded-2xl border border-dashed border-border/70 px-6 py-16 text-center text-sm text-muted-foreground'>
          This page intentionally stays empty. Open Global Settings to configure
          this section.
        </div>
      </Main>
    )
  }
}
