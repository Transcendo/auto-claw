import { Folder, Plus, Settings2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useEnvironmentContext } from '@/context/environment-provider'

function getEnvironmentLabels(openclawPath: string) {
  const normalized = openclawPath.replace(/\/+$/, '')
  const segments = normalized.split('/').filter(Boolean)
  const name = segments[segments.length - 1] ?? normalized
  const parent = segments[segments.length - 2] ?? 'Environment'

  return { name, parent }
}

export function EnvironmentSwitcher() {
  const navigate = useNavigate()
  const { isMobile } = useSidebar()
  const {
    environments,
    selectedEnvironment,
    setSelectedEnvironmentId,
    isLoadingEnvironments,
  } = useEnvironmentContext()

  const selectedLabels = selectedEnvironment
    ? getEnvironmentLabels(selectedEnvironment.openclawPath)
    : { name: 'No Environment', parent: 'Open settings to add one' }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size='lg'
              className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
            >
              <div className='flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                <Folder className='size-4' />
              </div>
              <div className='grid flex-1 text-start text-sm leading-tight'>
                <span className='truncate font-semibold'>
                  {isLoadingEnvironments ? 'Loading...' : selectedLabels.name}
                </span>
                <span className='truncate text-xs'>{selectedLabels.parent}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className='w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg'
            align='start'
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className='text-xs text-muted-foreground'>
              Environments
            </DropdownMenuLabel>
            {environments.length === 0 && (
              <DropdownMenuItem
                className='text-muted-foreground'
                onClick={() => void navigate({ to: '/settings' })}
              >
                No environments configured
              </DropdownMenuItem>
            )}
            {environments.map((environment) => {
              const labels = getEnvironmentLabels(environment.openclawPath)
              const isActive = environment.id === selectedEnvironment?.id

              return (
                <DropdownMenuItem
                  key={environment.id}
                  onClick={() => setSelectedEnvironmentId(environment.id)}
                  className='gap-2 p-2'
                >
                  <div className='flex size-6 items-center justify-center rounded-sm border'>
                    <Folder className='size-4 shrink-0' />
                  </div>
                  <div className='grid flex-1 text-left leading-tight'>
                    <span className='truncate font-medium'>
                      {labels.name}
                    </span>
                    <span className='truncate text-xs text-muted-foreground'>
                      {labels.parent}
                    </span>
                  </div>
                  {isActive && (
                    <span className='text-xs text-muted-foreground'>Active</span>
                  )}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='gap-2 p-2'
              onClick={() => void navigate({ to: '/settings' })}
            >
              <div className='flex size-6 items-center justify-center rounded-md border bg-background'>
                <Plus className='size-4' />
              </div>
              <div className='font-medium text-muted-foreground'>
                Add environment
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              className='gap-2 p-2'
              onClick={() => void navigate({ to: '/settings' })}
            >
              <div className='flex size-6 items-center justify-center rounded-md border bg-background'>
                <Settings2 className='size-4' />
              </div>
              <div className='font-medium text-muted-foreground'>Open settings</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
